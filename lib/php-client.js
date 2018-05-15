/** @babel */
/* global console */

import EventEmitter from 'events'
import { Buffer } from 'buffer'
import net from 'net'
import { Readable, Writable } from 'stream'

import { signalCode } from './util'
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

// const { signals } = process.binding('constants').os

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

    if (options.env != null) {
        if (typeof options.env !== 'object') {
            throw new Error(`Argument 'options.env' expects an object, got (${options.env})`)
        }
        const env = {}
        for (const key in options.env) {
            const val = options.env[key]
            if (undefined !== val && isNaN(key)) {
                env[key] = val
            }
        }
        options.env = JSON.stringify(env)
    }

    return Object.assign({}, options, {
        command: [command].concat(args).join(' '),
        host: options.host,
        port: options.port,
    })
}

/**
 * This class should exactly mimic ChildProcess
 */
export default class PhpClient extends EventEmitter
{
    /**
     * Creates a client which runs the given command
     *
     * @param  {String}        command            - The php command to run
     * @param  {Array<String>} [args]             - Additional arguments to append to the command string
     * @param  {Object}        [options]          - Connection configuration
     * @param  {String}        [options.host]     - The host name to which to connect
     * @param  {Number}        [options.port]     - The port number to which to connect
     * @param  {String}        [options.cwd]      - The working directory on the remote host
     * @param  {Boolean}       [options.detached] - TRUE to run the command in the background. (No events will be emitted)
     * @param  {Object}        [options.env]      - A hash of env name to env values to set on the host
     *
     * @return {PhpClient}                        - The client instance
     */
    static spawn (command, args, options) {
        const opts = parseArguments(command, args, options)
        const client = new PhpClient(opts)

        return client
    }

    /**
     * Constructor.
     *
     * Not intended to be called directly.
     *
     * @param {Object}  options            - The initial state
     * @param {String}  options.host       - The host name to which to connect
     * @param {Number}  options.port       - The port number to which to connect
     * @param {String}  [options.command]  - The php command to run
     * @param {Boolean} [options.detached] - TRUE to run the command in the background. (Only valid if command given)
     * @param {String}  [options.cwd]      - The working directory on the remote host
     * @param {Object}  [options.env]      - A hash of env name to env values to set on the host
     * @param {Boolean} [options.debug]    - If TRUE will log additional messages to the console
     */
    constructor (options) {
        super()

        this.channel = undefined
        this.pid = null

        this.connected = true
        this.signalCode = null
        this.exitCode = null
        this.killed = false

        const self = this
        this.stdin = new Writable({
            write(chunk, encoding, next) {
                self._send('CMD_PROCESS_WRITE', chunk)
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

        this._parser = {
            expects: EXPECT_ESCAPE,
            command: null,
            data: '',
            read: '',
        }

        this._debugEnabled = !!options.debug

        try {
            this._socket = net.createConnection({
                host: options.host,
                port: options.port,
            }, () => {
                if (options.cwd) {
                    this.setCwd(options.cwd)
                }

                if (options.env) {
                    this.setEnv(options.env)
                }

                if (options.command) {
                    this.execute(options.command)

                    if (options.detached) {
                        this.disconnect()
                    }
                }
            });

            this._socket.on('data', this._read.bind(this))
            this._socket.on('error', this.emit.bind(this, 'error'))
        } catch (err) {
            this.emit('error', err)
        }
    }

    /**
     * Sends a signal to the process on the remote host
     *
     * @param  {String} [signal] - The signal to send
     */
    kill (signal = 'SIGTERM') {
        const num = signalCode(signal)

        if (num === undefined) {
            throw new Error(`Unknown signal (${signal})`)
        }

        this._send('CMD_PROCESS_SIGNAL', num.toString())

        this.killed = true
        this.signalCode = signal
    }

    /**
     * Detaches the remote process.
     *
     * A detached process will continue running in the background.
     */
    disconnect () {
        if (this.connected) {
            this.connected = false

            this._send('CMD_ABORT_OUTPUT')
            this.emit('disconnect')
        }
    }

    /**
     * Runs the given command on the server.
     *
     * This method is only available if a command was not passed to the constructor.
     *
     * @param  {String} command - The command to run
     */
    execute (command) {
        this._send('CMD_PROCESS_EXECUTE', command)
    }

    /**
     * Sets the working directory of the script on the remote server.
     *
     * @param {String} dir - A path on the remote server
     */
    setCwd (dir) {
        this._send('CMD_SET_CWD', dir)
    }

    /**
     * Sets one or all environment variables on the remote server.
     *
     * @param {String|Object} name    - The name of a variable or a hash of names to values
     * @param {Mixed}         [value] - The value to set if name is a string
     */
    setEnv (name, value) {
        if (value === undefined) {
            this._send('CMD_SET_ENV', JSON.stringify(name))
        } else {
            this._send('CMD_SET_ENV', `${name}=${value}`)
        }
    }

    /**
     * Consumes and processes binary data from the socket.
     *
     * @param  {String|Buffer} data - The raw socket data
     */
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
                        this._handleResponse(code)
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
                        this._handleResponse(parser.command, parser.data)

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

    /**
     * Handles the resopnse from the server
     *
     * @private
     * @param  {Number}        code   - One of the CMD_ constants
     * @param  {String|Buffer} [data] - A valid utf8 string
     */
    _handleResponse (code, data = null) {
        // console.log(COMMAND_NAMES[code], data);
        switch (code) {
            case (COMMANDS.CMD_SET_CWD):
                break

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
                this._debug(`Invalid Command (${COMMAND_NAMES[code] || code})`, 'error')
        }
    }

    /**
     * Builds and sends a binary string to the server
     *
     * @private
     * @param  {String}        command - One of the CMD_ constants
     * @param  {String|Buffer} [data]  - A valid utf8 string
     */
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

    /**
     * Handles the closing of the client/socket.
     *
     * @private
     */
    _close () {
        if (!this._sentClose) {
            this._sentClose = true

            const signal = this.signalCode
            const code = signal ? null : this.exitCode

            this._socket.end()

            this.emit('close', code, signal)
        }
    }

    /**
     * If the debug option is enabled, prints data to the console
     *
     * @private
     * @param  {String|Buffer} data     - Any form of binary data
     * @param  {String}        [prefix] - The line prefix
     */
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
