/** @babel */

import installPackage from 'atom-package-deps'

export default class PhpInterpreter
{
    /**
     * Constructor
     *
     * @constructor
     */
    constructor () {

    }

    /**
     * Activates the package with the previous state
     *
     * @param  {Object} state - The previous result of @see {@link serialize}
     */
    activate () {
        return installPackage('php-interpreter', true).then(() => {
            
        })
    }

    /**
     * Deactivates the project before destroying
     *
     * @return {Promise}
     */
    async deactivate () {
    }
}
