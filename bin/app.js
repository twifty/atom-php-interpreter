/** @babel */
/* global process console */

import cli from 'commander'
import util from 'util'
import chalk from 'chalk'
import PhpClient from '../lib/php-client'

function print (format, ...args) {
    process.stdout.write(util.format(format, ...args));
}

function runCommand (command, args, host, port) {
    const server = PhpClient.startServer(host, port, cli.debugServer)

    server.on('error', (error) => {
        console.error(error)
        server.kill()
    })

    if (cli.debugServer) {
        server.stdout.on('data', (data) => {
            print(chalk.gray(data.toString()))
        })

        server.stderr.on('data', (data) => {
            print(chalk.bgCyanBright.gray(data.toString()))
        })
    }

    server.on('connected', () => {
        const client = PhpClient.spawnClient(command, args, {
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
            server.kill()
        })

        client.on('error', (error) => {
            console.error(error)
            server.kill()
        })

        client.stdout.on('data', (data) => {
            print(data.toString())
        })

        client.stderr.on('data', (data) => {
            print(chalk.bgCyan(data.toString()))
        })
    })

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
