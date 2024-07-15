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
const SCHisory = require('./SCHistory')
const SCUserPref = require('./SCUserPref')
const SCEvent = require('./SCEvent')
const sfx = require('./sfx')

class Wallpad {
    static isCreated = false;

    constructor(dbConn, serialConn, io) {
        if (Wallpad.isCreated) throw new Error(
            'Wallpad instance has already been created.')
        else Wallpad.isCreated = true;

        this.db = dbConn;
        this.io = io;
        this.arduino = serialConn;

        this.buffer = '';
        this.status = WallpadStatus.IDLE;
        this.pending = null; // temporary SCData object. matched to the user who 'OK' response from arduino.

        this.DEBUG = true;
    }

    serialEventHandler(data) {
        if (this.status !== WallpadStatus.IDLE) {
            throw new Error('Wallpad is busy now.');
        }

        this.buffer += data.toString();

        this.#parseResponse();
    }

    #authedHandler(data) {
        try {
            if (this.DEBUG) console.log(`[Wallpad.authedHandler] called with data below:\n${data}`);

            // parse smartcard data(response, uuid, extra data)
            // and trying to retrieve further data from db using parsed uuid.
            this.pending = new SCData(this.db, data);

            // new history data which will be added onto the current card.
            const hist = new SCHisory(new Date(), +!this.pending.status);

            // write changes onto the card.
            this.arduino.write(hist);

        } catch (err) {
            console.log(`[Wallpad.authedHandler] ${err} `);

            this.#errorHandler(err.name);
            return;

        } finally {
            this.status = WallpadStatus.IDLE;
        }
    }

    #runTasks(pref) {
        try {
            if (!pref instanceof SCUserPref) {
                throw new Error('`pref` must be a instance of SCUserPref.');
            }

            const prefs = Object.create(pref);

            for (const [taskName, isSetted] of Object.entries(prefs)) {
                console.log(`${taskName} 설정 여부: ${isSetted ? '예' : '아니오'}`)
            }

        } catch (err) {
            console.log(`[Wallpad.runTasks] ${err} `);
        }
    }

    #done() {
        try {
            if (this.pending) {
                const changedStat = +!this.pending.status; // '+!' reverses status between 1 and 0. 

                // update db.
                this.db.updateUserStatus(this.pending.uuid, changedStat, new Date());

                // send event to frontend.
                this.io.emit('success',
                    new SCEvent(changedStat ? 'goHome' : 'arrival', this.pending.name));

                // run tasks according to user preference settings on card.
                setTimeout(() => {
                    this.#runTasks(this.pending.extra);
                }, 0);

                console.log(`[Wallpad.done] ${this.pending.name} ${this.pending.uuid} `
                    + `pos.: ${this.pending.position}, `
                    + `stat.: ${this.pending.status} → ${changedStat}`);

                sfx.play(true);

            } else {
                throw new Error('[Wallpad.done] called illegally.');
            }

        } catch (err) {
            console.error('[Wallpad.done] error.', err);

        } finally {
            this.pending = null;
            this.status = WallpadStatus.IDLE;
        }
    }

    #errorHandler(eventName) {
        try {
            if (this.DEBUG) console.log(`[Wallpad.errorHandler] due to ${eventName}`);

            this.status = WallpadStatus.BUSY;

            this.io.emit('error', new SCEvent(eventName));

            sfx.play(false);

        } catch (err) {
            console.error('[Wallpad.errorHandler] error.', err);

        } finally {
            this.pending = null;
            this.status = WallpadStatus.IDLE;
        }

    }

    #parseResponse() {
        let [matchedType, matchedValue] = [null, null];

        Object.keys(regexps).some(patternName => {
            const matched = regexps[patternName].exec(this.buffer);

            if (matched) {
                this.status = WallpadStatus.BUSY;

                [matchedType, matchedValue] = [patternName, matched];

                this.buffer = '';

                if (this.DEBUG) console.log(`[Wallpad.parseResponse] parsed content:\n${matched} `);

                return true;
            }
        });

        switch (matchedType) {
            case 'authedUser':
                this.#authedHandler(matchedValue.toString().substring('AUTHED_'.length));
                break;

            case 'processed':
                this.#done();
                break;

            case matchedType !== null:
                console.log('ive called')
                this.#errorHandler(matchedType);
        }
    }
};

module.exports = Wallpad;