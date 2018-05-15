/** @babel */
/* global global console jasmine beforeEach WeakMap Promise */

// import { COMMANDS } from '../lib/commands'
import PhpService from '../lib/php-service'


beforeEach(() => {
    addCustomMatchers()
})

function addCustomMatchers () {
    jasmine.addMatchers({
        // toMatchResponse() {
        //     return {
        //         compare(actual, expected) {
        //             const result = {}
        //
        //             result.pass = (new RegExp(expected)).test(actual.toString('binary'))
        //
        //             if (result.pass) {
        //                 result.message = `Expected Buffer to not match expression`
        //             } else {
        //                 result.message = `Expected Buffer to match expression`
        //             }
        //
        //             return result
        //         }
        //     }
        // },
        toEqualJson(util, customEqualityTesters) {
            return {
                compare(actual, expected) {
                    const diffBuilder = jasmine.DiffBuilder()
                    const result = {
                        pass: false
                    }

                    try {
                        const value = typeof actual === 'string' ? JSON.parse(actual) : value

                        result.pass = util.equals(value, expected, customEqualityTesters || [], diffBuilder);
                        result.message = diffBuilder.getMessage()
                    } catch (err) {
                        result.message = `Expected ${actual} to be a valid JSON string`
                    }

                    return result
                }
            }
        }
    })
}

// const QUOTE_EXP = /[.\\+*?[^\]$(){}=!<>|:\\/-]/g
// const ESCAPE = String.fromCharCode(COMMANDS.CMD_ESCAPE)

// function quote (str) {
//     return str.replace(QUOTE_EXP, '\\$&')
// }

// export function responseExp (code, expression = null, q = false) {
//     if (null == expression) {
//         return new RegExp('^' + ESCAPE + String.fromCharCode(code) + '$')
//     }
//
//     const builder = [
//         '^',
//         ESCAPE,
//         String.fromCharCode(COMMANDS.BLOCK_BEGIN),
//         String.fromCharCode(code),
//         q ? quote(expression) : expression,
//         ESCAPE,
//         String.fromCharCode(COMMANDS.BLOCK_END),
//         '$'
//     ]
//
//     return new RegExp(builder.join(''))
// }

function createDeferredPromise (resolveArgs = []) {
    const deferred = {}

    deferred.resolveArgs = [].concat(resolveArgs)

    deferred._promise = new Promise((resolve, reject) => {
        deferred._resolve = resolve
        deferred._reject = reject
    })

    deferred._callCount = 0
    deferred._expectedCallCount = undefined

    const tryToResolve = () => {
        if (deferred._callCount === deferred._expectedCallCount) {
            deferred._resolve(...deferred.resolveArgs)
        }

        return deferred._promise
    }

    deferred.resolve = () => {
        deferred._callCount++
        tryToResolve()
    }

    deferred.fetch = (expectedCallCount = 1) => {
        if (deferred._expectedCallCount === undefined) {
            deferred._expectedCallCount = expectedCallCount

            return tryToResolve()
        }

        throw new Error('A call count for a deferred Promise can only be configured once!')
    }

    return deferred
}

const waitableMethods = new WeakMap()

export function Decorate (Entity, method, callback) {
    const Decorated = class extends Entity {
        constructor (...args) {
            super(...args)

            for (const name of [].concat(method)) {
                const deferred = createDeferredPromise(jasmine.createSpy(name))

                waitableMethods.set(this[name], deferred)
            }
        }
    }

    for (const name of [].concat(method)) {
        Object.defineProperty(Decorated.prototype, name, {
            writable: true,
            value: function (...args) {
                callback.call(this, name, Entity.prototype[name].bind(this), ...args)
            }
        })
    }

    return Decorated
}

export function makeMethodWaitable (obj, method) {
    const Wrapper = Decorate(obj, method, function (methdName, original, ...args) {
        const deferred = waitableMethods.get(this[methdName])

        deferred.resolveArgs[0](...args)
        original(...args)

        // NOTE The resolve function is also deferred
        deferred.resolve()
    })

    return Wrapper
}

export function forMethodCall (obj, method, callCount = 1) {
    if (waitableMethods.has(obj[method])) {
        const deferred = waitableMethods.get(obj[method])

        return deferred.fetch(callCount)
    }

    return Promise.reject(new Error(`Method ${obj.constructor.name}.${method} is not waitable!`))
}

export function startServer (host, port, debug = false) {
    return PhpService.startServer(host, port, true).then((server) => {
        if (debug) {
            server.stdout.on('data', (data) => {
                console.log(data.toString())
            })
        }
    }, () => {
        throw 'Failed to start server'
    })
}

export function stopServer () {
    return PhpService.stopServer()
}

Object.assign(global, {
    makeMethodWaitable,
    forMethodCall
})
