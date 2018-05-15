/** @babel */
/* global process */

const { signals } = process.binding('constants').os

export function signalName (num) {
    return Object.keys(signals).find(key => signals[key] == num)
}

export function signalCode (name) {
    return signals[name && name.toUpperCase()]
}
