/** @babel */

export const COMMANDS = {
    /**
     * Block command to configure the sub process' working directory.
     *
     * The directory persists amongst CMD_EXECUTE calls.
     *
     * @var integer
     */
    CMD_SET_CWD: 240, // 0xF0

    /**
     * Block command to configure the sub process' environment variables.
     *
     * Variables persist amongst CMD_EXECUTE calls.
     *
     * The variables can be passed as either a json encoded object or singly
     * with a name=value format. To unset a previously set value use null.
     *
     * @var integer
     */
    CMD_SET_ENV: 241, // 0xF1

    /**
     * Returns all the configured environment variables as a json encoded object.
     *
     * @var integer
     */
    CMD_GET_ENV: 242, // 0xF2

    /**
     * Sends a SIGKILL to the sub process.
     *
     * @var integer
     */
    CMD_PROCESS_KILL: 243, // 0xF3

    /**
     * Sends a SIGINT to the sub process.
     *
     * @var integer
     */
    CMD_PROCESS_INTERUPT: 244, // 0xF4

    /**
     * Block command to send a signal to the sub process.
     *
     * The block should contain a bytes with an ordinal matching the signal.
     *
     * @var integer
     */
    CMD_PROCESS_SIGNAL: 245, // 0xF5

    /**
     * Configures the current sub process to run in the background.
     *
     * Output and the exit code will not be sent to client.
     *
     * @var integer
     */
    CMD_ABORT_OUTPUT: 246, // 0xF6

    /**
     * Pokes the server.
     *
     * The server will respond with CMD_PROCESS_STDOUT.
     *
     * @var integer
     */
    CMD_ARE_YOU_THERE: 247, // 0xF7

    /**
     * Block command Indicating that the following bytes are to be interpreted as a PHP command.
     *
     * @var integer
     */
    CMD_PROCESS_EXECUTE: 248, // 0xF8

    /**
     * Block command for writing to the stdin of the sub process.
     *
     * @var integer
     */
    CMD_PROCESS_WRITE: 249, // 0xF9

    /**
     * Block command used to send the sub process' stdout back to the client.
     *
     * @var integer
     */
    CMD_PROCESS_STDOUT: 250, // 0xFA

    /**
     * Block command used to send the sub process' stderr back to the client.
     *
     * @var integer
     */
    CMD_PROCESS_STDERR: 251, // 0xFB

    /**
     * Block command used to send the sub process' exit code back to the client.
     *
     * @var integer
     */
    CMD_PROCESS_EXITCODE: 252, // 0xFC

    /**
     * Block command
     *
     * The first byte of a block command is always a CMD_ constant, the block
     * ends with CMD_ESCAPE followed by BLOCK_END. Any double CMD_ESCAPE bytes
     * in the data are to be interpreted as a single (escaped) byte.
     *
     * @var integer
     */
    BLOCK_BEGIN: 253, // 0xFD

    /**
     * Ends the block command.
     *
     * @var integer
     */
    BLOCK_END: 254, // 0xFE

    /**
     * Once encountered within a string, indicated the next character is a command.
     *
     * If the next character is also 255, It should be interpreted as a single
     * quoted character.
     *
     * The next character can be either a single byte command, or a block
     * command BLOCK_BEGIN . CMD_* . bytes . CMD_ESCAPE . BLOCK_END
     *
     * @var integer
     */
    CMD_ESCAPE: 255, // 0xFF
}

export const COMMAND_NAMES = {
    [COMMANDS.CMD_SET_CWD]:          "CMD_SET_CWD",
    [COMMANDS.CMD_SET_ENV]:          "CMD_SET_ENV",
    [COMMANDS.CMD_GET_ENV]:          "CMD_GET_ENV",
    [COMMANDS.CMD_PROCESS_KILL]:     "CMD_PROCESS_KILL",
    [COMMANDS.CMD_PROCESS_INTERUPT]: "CMD_PROCESS_INTERUPT",
    [COMMANDS.CMD_PROCESS_SIGNAL]:   "CMD_PROCESS_SIGNAL",
    [COMMANDS.CMD_ABORT_OUTPUT]:     "CMD_ABORT_OUTPUT",
    [COMMANDS.CMD_ARE_YOU_THERE]:    "CMD_ARE_YOU_THERE",
    [COMMANDS.CMD_PROCESS_EXECUTE]:  "CMD_PROCESS_EXECUTE",
    [COMMANDS.CMD_PROCESS_WRITE]:    "CMD_PROCESS_WRITE",
    [COMMANDS.CMD_PROCESS_STDOUT]:   "CMD_PROCESS_STDOUT",
    [COMMANDS.CMD_PROCESS_STDERR]:   "CMD_PROCESS_STDERR",
    [COMMANDS.CMD_PROCESS_EXITCODE]: "CMD_PROCESS_EXITCODE",
    [COMMANDS.BLOCK_BEGIN]:          "BLOCK_BEGIN",
    [COMMANDS.BLOCK_END]:            "BLOCK_END",
    [COMMANDS.CMD_ESCAPE]:           "CMD_ESCAPE",
}

export const COMMAND_CHARS = {
    CMD_SET_CWD:          String.fromCharCode(COMMANDS.CMD_SET_CWD),
    CMD_SET_ENV:          String.fromCharCode(COMMANDS.CMD_SET_ENV),
    CMD_GET_ENV:          String.fromCharCode(COMMANDS.CMD_GET_ENV),
    CMD_PROCESS_KILL:     String.fromCharCode(COMMANDS.CMD_PROCESS_KILL),
    CMD_PROCESS_INTERUPT: String.fromCharCode(COMMANDS.CMD_PROCESS_INTERUPT),
    CMD_PROCESS_SIGNAL:   String.fromCharCode(COMMANDS.CMD_PROCESS_SIGNAL),
    CMD_ABORT_OUTPUT:     String.fromCharCode(COMMANDS.CMD_ABORT_OUTPUT),
    CMD_ARE_YOU_THERE:    String.fromCharCode(COMMANDS.CMD_ARE_YOU_THERE),
    CMD_PROCESS_EXECUTE:  String.fromCharCode(COMMANDS.CMD_PROCESS_EXECUTE),
    CMD_PROCESS_WRITE:    String.fromCharCode(COMMANDS.CMD_PROCESS_WRITE),
    CMD_PROCESS_STDOUT:   String.fromCharCode(COMMANDS.CMD_PROCESS_STDOUT),
    CMD_PROCESS_STDERR:   String.fromCharCode(COMMANDS.CMD_PROCESS_STDERR),
    CMD_PROCESS_EXITCODE: String.fromCharCode(COMMANDS.CMD_PROCESS_EXITCODE),
    BLOCK_BEGIN:          String.fromCharCode(COMMANDS.BLOCK_BEGIN),
    BLOCK_END:            String.fromCharCode(COMMANDS.BLOCK_END),
    CMD_ESCAPE:           String.fromCharCode(COMMANDS.CMD_ESCAPE),
}

// export const COMMAND_NAMES = {
//     [COMMANDS.CMD_SET_CWD]:          'Set Current Working Directory',
//     [COMMANDS.CMD_SET_ENV]:          'Set Environment Variable',
//     [COMMANDS.CMD_GET_ENV]:          'Get Environment Variables',
//     [COMMANDS.CMD_PROCESS_KILL]:     'Kill Sub Process',
//     [COMMANDS.CMD_PROCESS_INTERUPT]: 'Interupt Sub Process',
//     [COMMANDS.CMD_PROCESS_SIGNAL]:   'Signal Sub Process',
//     [COMMANDS.CMD_ABORT_OUTPUT]:     'Abort Output',
//     [COMMANDS.CMD_ARE_YOU_THERE]:    'Are You There',
//     [COMMANDS.CMD_PROCESS_EXECUTE]:  'Execute Sub Process',
//     [COMMANDS.CMD_PROCESS_WRITE]:    'Write Sub Process STDIN',
//     [COMMANDS.CMD_PROCESS_STDOUT]:   'Read Sub Process STDOUT',
//     [COMMANDS.CMD_PROCESS_STDERR]:   'Read Sub Process STDERR',
//     [COMMANDS.CMD_PROCESS_EXITCODE]: 'Sub Process Exit Code',
//     [COMMANDS.BLOCK_BEGIN]:          'Begin Block Command',
//     [COMMANDS.BLOCK_END]:            'End Block Command',
//     [COMMANDS.CMD_ESCAPE]:           'Escape',
// }

export const Commands = {
    getChar (value) {
        if (value in COMMAND_NAMES) {
            value = COMMAND_NAMES[value]
        }

        if (value in COMMAND_CHARS) {
            return COMMAND_CHARS[value]
        }
    },

    isEscape (code) {
        // console.log(char, COMMAND_CHARS.CMD_ESCAPE, char === COMMAND_CHARS.CMD_ESCAPE);
        return code === COMMANDS.CMD_ESCAPE
    },

    isCommand (code) {
        // const code = char.length === 1 ? char.charCodeAt(0) : null

        return code in COMMAND_NAMES
    }
}
