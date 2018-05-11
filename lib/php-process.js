/** @babel */
/* global console process */

import EventEmitter from 'events'
import { Buffer } from 'buffer'
import net from 'net'
import { Readable, Writable } from 'stream'

import {COMMANDS, COMMAND_NAMES, Commands} from './commands'

const EXPECT_ESCAPE = 0;
const EXPECT_COMMAND = 1;
const EXPECT_MULTIBYTE = 2;
const EXPECT_MULTIBYTE_COMMAND = 3;
const EXPECT_END_OF_RANGE = 4;

const escapecodes = {
    '\f': '\\f',
    '\t': '\\t',
    '\n': '\\n',
    '\r': '\\n'
}

const { signals } = process.binding('constants').os

function bin2hex (s) {
    const n = s.charCodeAt(0).toString(16)
    return n.length < 2 ? '0' + n : n
}

function parseArguments (command, args, options) {
    if (typeof command !== 'string' || command.length === 0) {
        throw new Error(`Argument 'command' expects a non empty string, got (${command})`)
    }

    if (Array.isArray(args)) {
        args = args.slice(0)
    } else if (args !== undefined && (args === null || typeof args !== 'object')) {
        throw new Error(`Argument 'args' expects an array or undefined, got (${args})`)
    } else if (2 === arguments.length) {
        options = args
        args = []
    } else {
        args = []
    }

    if (options === undefined) {
        options = {}
    } else if (options === null || typeof options !== 'object') {
        throw new Error(`Argument 'options' expects an object or undefined, got (${options})`)
    } else {
        options = Object.assign({}, options)
    }

    if (typeof options.host !== 'string') {
        throw new Error(`Argument 'options.cwd' expects a string, got (${options.host})`)
    }

    if (typeof options.port === 'string') {
        options.port = parseInt(options.port, 10)
    } else if (typeof options.port !== 'number') {
        throw new Error(`Argument 'options.cwd' expects a number, got (${options.port})`)
    }

    if (options.cwd != null && typeof options.cwd !== 'string') {
        throw new Error(`Argument 'options.cwd' expects a string, got (${options.cwd})`)
    }

    if (options.detached != null && typeof options.detached !== 'boolean') {
        throw new Error(`Argument 'options.detached' expects a boolean, got (${options.detached})`)
    }

    return Object.assign({}, options, {
        command,
        args,
        host: options.host,
        port: options.port,
    })
}

/**
 * This class should exactly mimic ChildProcess
 */
export default class PhpProcess extends EventEmitter
{
    static spawn (command, args, options) {
        const opts = parseArguments(command, args, options)
        const client = new PhpProcess(opts)

        return client
    }

    constructor (options) {
        super()

        this.channel = undefined
        this.pid = null

        this.connected = true
        this.signalCode = null
        this.exitCode = null
        this.killed = false

        this.stdin = new Writable({
            write(chunk, encoding, next) {
                this._send('CMD_PROCESS_WRITE', chunk)
                next()
            }
        })

        this.stdout = new Readable({
            read() {}
        })

        this.stderr = new Readable({
            read() {}
        })

        this.stdio = [
            this.stdin,
            this.stdout,
            this.stderr
        ]

        this._debugEnabled = !!options.debug

        this._socket = net.createConnection({
            host: options.host,
            port: options.port,
        }, () => {
            this._send('CMD_PROCESS_EXECUTE', [options.command].concat(options.args).join(' '))
        });

        this._socket.on('data', this._read.bind(this))
        this._socket.on('error', this.emit.bind(this, 'error'))

        this._parser = {
            expects: EXPECT_ESCAPE,
            command: null,
            data: '',
            read: '',
        }
    }

    kill (signal = 'SIGTERM') {
        const num = signals[signal.toUpperCase()]

        if (num === undefined) {
            throw new Error(`Unknown signal (${signal})`)
        }

        this._send('CMD_PROCESS_SIGNAL', String.fromcodeCode(num))

        this.killed = true
        this.signalCode = signal
    }

    disconnect () {
        if (this.connected) {
            this.connected = false

            this._send('CMD_ABORT_OUTPUT')
            this.emit('disconnect')
        }
    }

    _read (data) {
        this._debug(data, 'client received')

        const parser = this._parser

        for (let i=0; i<data.length; ++i) {
            const code = data[i]

            switch (parser.expects) {
                case EXPECT_ESCAPE:
                    if (Commands.isEscape(code)) {
                        if ('' !== parser.read) {
                            this._debug(parser.read, 'skipped')
                            parser.read = ''
                        }

                        parser.expects = EXPECT_COMMAND
                    }
                    break

                case EXPECT_COMMAND:
                    if (!Commands.isCommand(code)) {
                        parser.expects = EXPECT_ESCAPE
                    } else if (COMMANDS.BLOCK_BEGIN === code) {
                        parser.expects = EXPECT_MULTIBYTE_COMMAND
                    } else {
                        this._handleCommand(code)
                        parser.expects = EXPECT_ESCAPE

                        // Prevent a skipped char from being appended
                        continue
                    }
                    break

                case EXPECT_MULTIBYTE:
                    if (Commands.isEscape(code)) {
                        parser.expects = EXPECT_END_OF_RANGE
                    } else {
                        parser.data += String.fromCharCode(code)
                    }
                    break

                case EXPECT_MULTIBYTE_COMMAND:
                    if (Commands.isCommand(code)) {
                        parser.command = code
                        parser.data = ''
                        parser.expects = EXPECT_MULTIBYTE
                    } else {
                        parser.expects = EXPECT_ESCAPE
                    }
                    break

                case EXPECT_END_OF_RANGE:
                    if (Commands.isEscape(code)) {
                        parser.data += String.fromCharCode(code)
                        parser.expects = EXPECT_MULTIBYTE
                    } else if (COMMANDS.BLOCK_END === code) {
                        this._handleCommand(parser.command, parser.data)

                        parser.command = null
                        parser.data = ''
                        parser.read = ''

                        parser.expects = EXPECT_ESCAPE

                        // Prevent a skipped char from being appended
                        continue
                    } else {
                        parser.expects = EXPECT_ESCAPE
                    }
                    break;

                default:
                    throw new Error(`Invalid expectation (${parser.expects})`)
            }

            parser.read += String.fromCharCode(code)

            // console.log(COMMAND_NAMES[code] || code, parser, '\n');
        }

    }

    _handleCommand (cmdCode, data) {
        switch (cmdCode) {
            case (COMMANDS.CMD_PROCESS_STDOUT):
                this.stdout.push(data)
                break

            case (COMMANDS.CMD_PROCESS_STDERR):
                this.stderr.push(data)
                break

            case (COMMANDS.CMD_PROCESS_EXITCODE):
                this.stdout.push(null)
                this.stderr.push(null)
                this.exitCode = parseInt(data)
                this._close()
                break

            default:
                this._debug(`Invalid Command (${COMMAND_NAMES[cmdCode] || cmdCode})`, 'error')
        }
    }

    _send (command, data = null) {
        let rawData

        if (data) {
            if (typeof data === 'string') {
                // NOTE This converts the string to utf8, so any codepoints higher than
                // 0x7F will become multibyte. Since the range 0xF5 to 0xFF are invlalid
                // utf8 codepoints, they will never be in the resulting array.
                data = Buffer.from(data, 'utf8')
            } else if (Buffer.isBuffer(data)) {
                // NOTE this.stdin.write will forward a Buffer. Though it's highly unlikely
                // to contain the escape code, we should treat it as an edge case.
                if (data.includes(COMMANDS.CMD_ESCAPE)) {
                    let escaped = []

                    for (let i=0; i<data.length; ++i) {
                        const code = data[i]
                        if (COMMANDS.CMD_ESCAPE === code) {
                            escaped.push(COMMANDS.CMD_ESCAPE)
                        }
                        escaped.push(code)
                    }

                    data = Buffer.from(escaped)
                }
            }

            rawData = [
                COMMANDS.CMD_ESCAPE,
                COMMANDS.BLOCK_BEGIN,
                COMMANDS[command],
                ...data,
                COMMANDS.CMD_ESCAPE,
                COMMANDS.BLOCK_END,
            ]
        } else {
            rawData = [
                COMMANDS.CMD_ESCAPE,
                COMMANDS[command]
            ]
        }

        rawData = Buffer.from(rawData)

        this._debug(rawData, 'client sending')
        this._socket.write(rawData)
    }

    _close () {
        if (!this._sentClose) {
            this._sentClose = true

            const signal = this.signalCode
            const code = signal ? null : this.exitCode

            this._socket.end()

            this.emit('close', code, signal)
        }
    }

    _debug (data, prefix = 'debug') {
        if (!this._debugEnabled) {
            return
        }

        if (Array.isArray(data)) {
            data = data.join('')
        } else if (Buffer.isBuffer(data)) {
            data = data.toString('binary')
        }

        console.log(`[${prefix}] ` + data.replace(/[\x00-\x1F\x7F-\xFF]/g, (match) => { // eslint-disable-line no-control-regex
            const code = match.charCodeAt(0)

            if (COMMAND_NAMES[code]) {
                return '[' + COMMAND_NAMES[code] + ']'
            }

            return escapecodes[match] || '\\x' + bin2hex(match);
        }))
    }
}
