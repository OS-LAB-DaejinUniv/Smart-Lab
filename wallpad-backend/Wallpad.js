/**
 * @brief Main class of wallpad-backend.
 * @details All kinds of data processing triggered from serialport event.
 * @author Jay Kang
 * @date July 7, 2024
 * @version 0.1
 */

const WallpadStatus = require('./WallpadStatus')
const regexps = require('./regexps')

class Wallpad {
    constructor() {
        this.buffer = '';
        this.status = WallpadStatus.IDLE;
        this.DEBUG = true;
        this.count = 0;
    }
    
    serialEventHandler(data) {
        console.log(`이벤트 발생 ${this.count++}`);
        if (this.status !== WallpadStatus.IDLE) 
            throw new Error('Wallpad is busy now.');



        this.buffer += data;
        this.#parseResponse();
    }

    authedUser() {
        console.log('나 호출됨 ㅋㅋㅋ');
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

                if (this.DEBUG) console.log(`data received: ${matched}`);

                switch (matchedType) {
                    case 'authedUser' :
                        console.log('사용자 인증됨');
                }

                return true;
            }
        });

        console.log(`matchedType: ${matchedType} / matchedValue: ${matchedValue}`);

        // this[matchedType]();
    }
}

module.exports = Wallpad;