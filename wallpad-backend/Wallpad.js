/**
 * @brief A component class of wallpad-backend.
 * @details Processes all kinds of data triggered from serialport event.
 * @author Jay Kang
 * @date July 7, 2024
 * @version 0.1
 */

const WallpadStatus = require('./WallpadStatus')
const regexps = require('./regexps')
const SCData = require('./SCData')

class Wallpad {
    constructor(dbConn) {
        this.db = dbConn;

        this.buffer = '';
        this.status = WallpadStatus.IDLE;

        this.DEBUG = true;
    }

    serialEventHandler(data) {
        if (this.status !== WallpadStatus.IDLE)
            throw new Error('Wallpad is busy now.');

        this.buffer += data.toString();
        
        this.#parseResponse();
    }

    #authedUserHandler(data) {
        try {
            if (this.DEBUG) console.log(`[Wallpad.authedUser] called with given parameter: ${data}`);

            const parsed = new SCData(this.db, data);
            
            parsed.selectFromDB();

            console.log(`[authedUser] uuid: ${parsed.uuid} name: ${parsed.name}, position: ${parsed.position}, status: ${parsed.status}`);

        } catch (err) {
            if (this.DEBUG) console.log(`[Wallpad.authedUser] error: ${err}`);

        } finally {
            this.status = WallpadStatus.IDLE;
        }


    }

    #invalidCardHandler(eventName) {
        try {
            if (this.DEBUG) console.log(`[Wallpad.invalidCardHandler] called with given parameter: ${eventName}`);

        } catch (err) {


        } finally {
            this.status = WallpadStatus.IDLE;
        }

    }

    #parseResponse() {
        let matchedType = null;
        let matchedValue = null;

        Object.keys(regexps).some(patternName => {
            const matched = regexps[patternName].exec(this.buffer);

            if (matched) {
                this.status = WallpadStatus.GOT_AUTHED_RESPONSE;
                matchedType = patternName;
                matchedValue = matched;

                this.buffer = '';

                if (this.DEBUG) console.log(`[Wallpad.parseResponse] data parsed: ${matched}`);
                
                return true;
            }

        });

        if (matchedType == 'authedUser') {
            this.#authedUserHandler(matchedValue.toString().substring('AUTHED_'.length));

        } else if (matchedType !== null) {
            this.#invalidCardHandler(matchedType);
        }
    }
};

module.exports = Wallpad;