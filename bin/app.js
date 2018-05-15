/** @babel */
/* global process console Promise */

import cli from 'commander'
import util from 'util'
import chalk from 'chalk'
import PhpService from '../lib/php-service'

function print (format, ...args) {
    process.stdout.write(util.format(format, ...args));
}

function startServer (host, port, useExisting) {
    return PhpService.startServer(host, port, cli.debugServer).then((server) => {
        server.on('error', (error) => {
            console.error(error)
            server.kill()
        })

        server.on('exit', () => {
            if (cli.debugServer) {
                print('Stopped server.\n')
            }
        })

        if (cli.debugServer) {
            server.stdout.on('data', (data) => {
                print(chalk.gray(data.toString()))
            })

            server.stderr.on('data', (data) => {
                print(chalk.bgCyanBright.gray(data.toString()))
            })
        }
    }, (err) => {
        if (1 === err.exitCode) {
            if (useExisting) {
                if (cli.debugServer) {
                    print('Using existing server instance.\n')
                }
            } else {
                print(chalk.red('An instance of the server is already running.\n'))
                print(chalk.cyan('    Invoke `cli stop` to terminate the running instance.\n'))
                print(chalk.cyan('    Invoke `cli run <script>` to use the running instance.\n'))
                process.exit(err.exitCode)
            }
        } else if (!useExisting) {
            print(chalk.bgCyan(err))
            process.exit(err.exitCode)
        }

        // Note, output of the server will not be available
        return Promise.resolve()
    })
}

function runCommand (command, args, host, port) {
    if ('stop' === command) {
        return PhpService.stopServer().then(({message}) => {
            if (message) {
                console.log(message);
            }
        })
    }

    let match = null
    if (!command || (match = command.match(/^(start|run|php)/))) {
        let useExisting = false

        if ('run' === match[0]) {
            useExisting = true
            command = command.substr(3).trim()
        }

        startServer(host, port, useExisting).then((server) => {
            if (match && match[0] !== 'start') {
                const client = PhpService.spawnClient(command, args, {
                    cwd: '.',
                    debug: cli.debugClient,
                    host,
                    port
                })

                client.on('close', (code, signal) => {
                    if (cli.debugClient) {
                        print(chalk.green(`Closed: code %s, signal %s\n`), code, signal)
                    }

                    // Server is designed to always run
                    if (server) {
                        server.kill()
                    }

                    process.exit(code || 0)
                })

                client.on('error', (error) => {
                    console.error(error)
                    if (server) {
                        server.kill()
                    }
                })

                client.stdout.on('data', (data) => {
                    print(data.toString())
                })

                client.stderr.on('data', (data) => {
                    print(chalk.bgCyan(data.toString()))
                })
            }
        })
    }
}

cli
    .arguments('<command> [args...]')
    .usage('[options] <command> [args...]\n\n' +
           '         For complicated arguments, pass the whole command within quotes:\n\n' +
           '         cli [options] "<command> [args...]"')
    .option('-h, --host <host>', 'The host on which the server should listen')
    .option('-p, --port <port>', 'The port number on which the server should listen')
    .option('-d, --debug', 'Start both server and client in debug mode')
    .option('-s, --debug-server', 'Start server in debug mode')
    .option('-c, --debug-client', 'Start client in debug mode')
    .action((command) => {
        const idx = cli.rawArgs.indexOf(command)
        const args = -1 !== idx ? cli.rawArgs.slice(idx + 1) : []

        cli.debugServer = cli.debugServer || cli.debug
        cli.debugClient = cli.debugClient || cli.debug

        runCommand(command, args, cli.host, cli.port)
    })
    .parse(process.argv);
