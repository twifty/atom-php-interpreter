/** @babel */
/* global console describe beforeEach afterEach it expect forMethodCall __dirname */

import PhpClient from '../lib/php-client'
import { COMMANDS } from '../lib/commands'
import { signalCode } from '../lib/util'
import * as Helper from './spec-helpers'

const SERVER_HOST = '127.0.0.1'
const SERVER_PORT = 1024

const Decorated = Helper.makeMethodWaitable(PhpClient, '_handleResponse')

let client

describe('PhpInterpreter', () => {
    describe('::_send', () => {
        beforeEach(async () => {
            await Helper.startServer(SERVER_HOST, SERVER_PORT).then(() => {
                client = new Decorated({
                    host: SERVER_HOST,
                    port: SERVER_PORT,
                    debug: false
                })

                client.on('error', (err) => {
                    console.log('Caught error');
                    console.log(err);
                })
            })
        })

        afterEach(async () => {
            await Helper.stopServer()
        })

        it('can set the working directory', async () => {
            client.setCwd(__dirname)

            const responseSpy = await forMethodCall(client, '_handleResponse')

            expect(responseSpy.calls.argsFor(0)).toEqual([COMMANDS.CMD_SET_CWD, __dirname])
        })

        it('can set and get env vars', async () => {
            client.setEnv('TEMP_ENV_VAR', 'Hello World!')
            client._send('CMD_GET_ENV')

            const responseSpy = await forMethodCall(client, '_handleResponse', 2)

            expect(responseSpy.calls.argsFor(0)[0]).toEqual(COMMANDS.CMD_SET_ENV)
            expect(responseSpy.calls.argsFor(0)[1]).toEqualJson({
                TEMP_ENV_VAR: "Hello World!"
            })

            expect(client.stdout.read().toString()).toEqualJson({
                TEMP_ENV_VAR: "Hello World!"
            })
        })

        it('can unset a single env var', async () => {
            client.setEnv({
                TEMP_ENV_VAR: "Hello World!"
            })
            client.setEnv('TEMP_ENV_VAR', null)

            const responseSpy = await forMethodCall(client, '_handleResponse', 2)

            expect(responseSpy.calls.argsFor(0)[0]).toEqual(COMMANDS.CMD_SET_ENV)
            expect(responseSpy.calls.argsFor(0)[1]).toEqualJson({
                TEMP_ENV_VAR: "Hello World!"
            })

            expect(responseSpy.calls.argsFor(1)[0]).toEqual(COMMANDS.CMD_SET_ENV)
            expect(responseSpy.calls.argsFor(1)[1]).toEqualJson({})
        })

        it('can poke the server', async () => {
            client._send('CMD_ARE_YOU_THERE')

            await forMethodCall(client, '_handleResponse')

            expect(client.stdout.read().toString()).toEqual('Poke me again! I dare you!!!\n')
        })

        it('can run a command', async () => {
            client.execute('php -r "echo \'hello world!\';"')

            const responseSpy = await forMethodCall(client, '_handleResponse', 3)

            expect(responseSpy.calls.argsFor(0)[0]).toEqual(COMMANDS.CMD_PROCESS_EXECUTE)
            expect(responseSpy.calls.argsFor(0)[1]).toMatch(/^\d+$/)

            expect(client.stdout.read().toString()).toEqual('hello world!')

            expect(responseSpy.calls.argsFor(2)[0]).toEqual(COMMANDS.CMD_PROCESS_EXITCODE)
            expect(responseSpy.calls.argsFor(2)[1]).toEqual('0')
        })

        it('can write to stdin before running a command', async () => {
            client.stdin.write('hello world!\n')
            client.execute("php -r \"echo trim(fgets(STDIN));\"")

            const responseSpy = await forMethodCall(client, '_handleResponse', 2)

            expect(responseSpy.calls.argsFor(0)[0]).toEqual(COMMANDS.CMD_PROCESS_EXECUTE)
            expect(responseSpy.calls.argsFor(0)[1]).toMatch(/^\d+$/)

            expect(client.stdout.read().toString()).toEqual('hello world!')
        })

        it('can write to stdin of a running process', async () => {
            client.execute("php -r \"echo trim(fgets(STDIN));\"")
            client.stdin.write('hello world!\n')

            const responseSpy = await forMethodCall(client, '_handleResponse', 2)

            expect(responseSpy.calls.argsFor(0)[0]).toEqual(COMMANDS.CMD_PROCESS_EXECUTE)
            expect(responseSpy.calls.argsFor(0)[1]).toMatch(/^\d+$/)

            expect(client.stdout.read().toString()).toEqual('hello world!')
        })

        it('can signal a running process', async () => {
            client.execute("php -r \"echo trim(fgets(STDIN));\"")
            client.kill('SIGKILL')

            const responseSpy = await forMethodCall(client, '_handleResponse', 2)

            expect(responseSpy.calls.argsFor(0)[0]).toEqual(COMMANDS.CMD_PROCESS_EXECUTE)
            expect(responseSpy.calls.argsFor(0)[1]).toMatch(/^\d+$/)

            expect(responseSpy.calls.argsFor(1)[0]).toEqual(COMMANDS.CMD_PROCESS_SIGNAL)
            expect(responseSpy.calls.argsFor(1)[1]).toEqual(signalCode('SIGKILL').toString())
        })
    })
});
