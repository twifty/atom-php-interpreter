/** @babel */
/* global __dirname */

import ChildProcess from 'child_process'
import PhpProcess from './php-process'

export default class PhpClient
{
    static spawn (command, args, options) {
        if (PhpClient.isRemote()) {
            return PhpClient.spawnClient(command, args, options)
        }

        return PhpClient.spawnProcess(command, args, options)
    }

    static spawnClient (command, args, options) {
        if (!Array.isArray(args)) {
            options = args
            args = undefined
        }

        if (null == options) {
            options = {}
        }

        options.host = options.host || PhpClient.getServerHost()
        options.port = options.port || PhpClient.getServerPort()

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

        const server = ChildProcess.spawn('php', ['server.php'], options)
        let connected = false

        server.on('error', () => {
            server.kill('SIGKILL')
        })

        const connectionHandler = () => {
            if (!connected) {
                connected = true
                server.emit('connected')
            }

            server.stdout.removeListener('data', connectionHandler)
        }

        server.stdout.on('data', connectionHandler)

        return server
    }
}
