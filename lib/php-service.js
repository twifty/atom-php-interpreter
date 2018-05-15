/** @babel */
/* global __dirname Promise */

import ChildProcess from 'child_process'
import PhpProcess from './php-client'

import { signalName } from './util'

export default class PhpService
{
    static spawn (command, args, options) {
        if (PhpService.isRemote()) {
            return PhpService.spawnClient(command, args, options)
        }

        return PhpService.spawnProcess(command, args, options)
    }

    static spawnClient (command, args, options) {
        if (!Array.isArray(args)) {
            options = args
            args = undefined
        }

        if (null == options) {
            options = {}
        }

        options.host = options.host || PhpService.getServerHost()
        options.port = options.port || PhpService.getServerPort()

        return PhpProcess.spawn(command, args, options)
    }

    static spawnProcess (command, args, options) {
        return ChildProcess.spawn(command, args, options)
    }

    static isRemote () {
        return true
    }

    static getServerHost () {
        return '127.0.0.1'
    }

    static getServerPort () {
        return 1337
    }

    static startServer (host, port, debug = false) {
        const options = {
            cwd: __dirname + '/../server',
            env: {}
        }

        if (host != null) {
            options.env.PHP_INTERPRETER_HOST = host
        }
        if (port != null) {
            options.env.PHP_INTERPRETER_PORT = port
        }
        if (debug) {
            options.env.PHP_INTERPRETER_DEBUG = 1
        }

        // TODO php needs to be resolved
        const server = ChildProcess.spawn('php', ['server.php'], options)
        let connected = false

        const deferred = {
            isResolved: false
        }

        deferred.promise = new Promise((resolve, reject) => {
            deferred.resolve = resolve
            deferred.reject = reject
        })

        const connectionHandler = () => {
            if (!connected) {
                const data = server.stdout.read()

                if (data) {
                    connected = true
                    
                    server.stdout.unshift(data)
                    server.stdout.push('')

                    if (!deferred.isResolved) {
                        deferred.isResolved = true
                        deferred.resolve(server)
                    }

                    server.emit('connected')
                }
            }

            server.stdout.removeListener('readable', connectionHandler)
        }

        // The server should send 'Listening... '. Any errors will be written to stderr.
        // This event is fired when data is available to be read AND when the stream is about to end.
        server.stdout.on('readable', connectionHandler)

        server.on('error', (err) => {
            if (!deferred.isResolved) {
                deferred.isResolved = true
                deferred.reject(err)
            }

            server.kill('SIGKILL')
        })

        server.on('exit', (code, signal) => {
            if (code || signal) {
                if (!deferred.isResolved) {
                    deferred.isResolved = true

                    const output = server.stderr.read();
                    let message

                    if (output) {
                        message = output.toString()
                    } else if (signal) {
                        const name = signalName(signal)
                        message = `Server process exited with signal (${name || signal})`
                    } else {
                        message = `Server process exited with code (${code})`
                    }

                    const error = new Error(message)
                    error.exitCode = code || 0

                    deferred.reject(error)
                }
            } else {
                connected = false
            }
        })

        return deferred.promise
    }

    /**
     * Stops any running server
     *
     * @return {Promise<Object>}
     */
    static stopServer () {
        const server = ChildProcess.spawn('php', ['server.php', 'stop'], {
            cwd: __dirname + '/../server'
        })
        const deferred = {}

        deferred.promise = new Promise((resolve, reject) => {
            deferred.resolve = resolve
            deferred.reject = reject
        })

        server.on('exit', (code, signal) => {
            if (code || signal) {
                const output = server.stderr.read() || server.stdout.read();
                let message

                if (output) {
                    message = output.toString()
                } else if (signal) {
                    const name = signalName(signal)
                    message = `Server process exited with signal (${name || signal})`
                } else {
                    message = `Server process exited with code (${code})`
                }

                deferred.resolve({
                    code,
                    signal,
                    message
                })
            } else {
                deferred.resolve({code})
            }
        })

        return deferred.promise
    }
}
