/**
 * @brief Backend component for wallpad system
 * @details Handles serial port communication and data processing
 * @author Jay Kang
 * @date July 7, 2024
 * @version 0.1
 */

const config = require('./config');
const WallpadStatus = require('./WallpadStatus');
const UserStatus = require('./WallpadStatus');
const regexps = require('./regexps');
const SCData = require('./SCData');
const SCHisory = require('./SCHistory');
const SCEvent = require('./SCEvent');
const sfx = require('./sfx');
const fs = require('fs');
const path = require('path');

class Wallpad {
    static isCreated = false;

    constructor(dbConn, serialConn, io) {
        if (Wallpad.isCreated)
            throw new Error('Wallpad instance has already created.');

        Wallpad.isCreated = true;

        this.db = dbConn;
        this.io = io;
        this.arduino = serialConn;

        this.buffer = '';
        this.status = WallpadStatus.IDLE;
        this.pending = null; // Stores authenticated user data temporarily until processing completes
        this.extension = ((dir = config.taskScriptDir) => {
            return fs.readdirSync(dir)
                .filter(file => file.match(/\.js$/))
                .reduce((list, moduleName) => {
                    try {
                        const module = require(path.resolve(path.join(dir, moduleName)));
                        if (module.enabled)
                            list[moduleName.replace('.js', '')] = module;

                    } catch (err) {
                        console.error(`[Wallpad.constructor] Failed to load extension ${moduleName}:`, err);
                    }
                    return list;
                }, {});
        })();

        this.DEBUG = true;
    }

    serialEventHandler(data) {
        if (this.status !== WallpadStatus.IDLE)
            throw new Error('Wallpad is busy now.');

        this.buffer += data.toString();

        this.#parseResponse();
    }

    #authedHandler(data) {
        try {
            // Parses smartcard data (response, uuid, extra data)
            // and retrieves personal details from DB using card UUID
            this.pending = new SCData(this.db, data);

            if (this.DEBUG)
                console.log('[Wallpad.authedHandler] Contents parsed:\n'
                    + `Response: ${this.pending.response}\nUUID: ${this.pending.uuid}\nExtra: ${this.pending.extra}`
                );

            // Creates new history entry to be written to the card
            const hist = new SCHisory(new Date(), +!this.pending.status);

            // Writes changes to the card
            this.arduino.write(hist);

            if (this.DEBUG) {
                console.log('[Wallpad.authedHandler] Trying to write a new log:', hist);
                console.log('[Wallpad.authedHandler] Waiting response from NFC module..');
            }

        } catch (err) {
            console.log('[Wallpad.authedHandler]', err);

            this.#errorHandler(err.name);

            return;

        } finally {
            this.status = WallpadStatus.IDLE;
        }
    }

    async #triggerRunTasks(userInfo, changedTo, memberList) {
        try {
            if (Object.keys(this.extension).length == 0) {
                console.log('[Wallpad.triggerRunTasks] No enabled extensions were found.');
                return;
            }
    
            await Promise.all(Object.keys(this.extension)
                .map(async moduleName => {
                    try {
                        const module = this.extension[moduleName];
    
                        if (!((module.activatedStatus == changedTo) || (module.activatedStatus == '*')))
                            return;
                        if (!((userInfo.extra[module.activatedIndex] == 1) || (module.activatedIndex == '*')))
                            return;
    
                        console.log(`[Wallpad.triggerRunTasks] Execute ${moduleName}`);
    
                        const result = await module.handler(userInfo, changedTo, memberList);
                        console.log(`[Wallpad.triggerRunTasks] ${moduleName} finished`);
                        
                    } catch (err) {
                        console.error(`[Wallpad.triggerRunTasks] Error in module ${moduleName}:\n`, err);
                    }
                })
            );
    
        } catch (err) {
            console.error('[Wallpad.triggerRunTasks]', err);
        }
    }
    

    #done() {
        try {
            if (this.pending) {
                // Convert status between 1 and 0 using '+!' operator
                const changedStat = +!this.pending.status;

                // [DB Task 1/2] Update user's work status in database
                this.db.updateUserStatus(this.pending.uuid, changedStat, new Date());

                // [DB Task 2/2] Calculate time duration based on status
                const timesTaken = (() => {
                    if (changedStat == 1) {
                        return this.db.getHoursToReturn(this.pending.uuid);

                    } else if (changedStat == 0) {
                        return this.db.getTodayWorkingHours(this.pending.uuid);
                    }
                })();

                // Emit status change event to frontend with user info and time data
                this.io.emit('success',
                    new SCEvent({
                        status: (changedStat === 0) ?
                            UserStatus.LEAVE :
                            UserStatus.ARRIVAL,
                        name: this.pending.name,
                        timesTaken
                    }));

                // Asynchronously launch tasks based on user's card preferences
                setTimeout((user, memberList) => {
                    this.#triggerRunTasks({
                        name: user.name,
                        position: user.position,
                        uuid: user.uuid,
                        extra: user.extra
                    },
                        changedStat,
                        memberList
                    );
                }, 0, Object.assign({}, this.pending), this.db.selectMembers());

                console.log(`[Wallpad.done] ${this.pending.name} ${this.pending.uuid} `
                    + `pos.: ${this.pending.position}, `
                    + `stat.: ${this.pending.status} → ${changedStat}`);

                sfx.play(true);

            } else {
                throw new Error('[Wallpad.done] Called illegally.');
            }

        } catch (err) {
            console.error('[Wallpad.done]', err);

        } finally {
            this.pending = null;
            this.status = WallpadStatus.IDLE;
        }
    }

    #errorHandler(eventName) {
        try {
            if (this.DEBUG)
                console.log(`[Wallpad.errorHandler] Due to ${eventName}`);

            this.status = WallpadStatus.BUSY;

            this.io.emit('error', new SCEvent({ status: eventName }));

            sfx.play(false);

        } catch (err) {
            console.error('[Wallpad.errorHandler]', err);

        } finally {
            this.pending = null;
            this.status = WallpadStatus.IDLE;
        }
    }

    #tmoneyBalanceHandler(parsed) {
        try {
            const uint32 = /([0-9A-F]{8})/;
            const balance = parseInt('0x' + `${parsed}`.match(uint32)[0]);
            this.io.emit('success', Object.assign({},
                new SCEvent({ status: 'tmoneyBalance' }),
                { balance } // balance
            ));
            console.log(`[Wallpad.tmoneyBalanceHandler] T-money card has scanned. balance is ₩${balance.toLocaleString('ko-KR')}`);

        } catch (err) {
            console.error(`[Wallpad.tmoneyBalanceHandler] Failed to process t-money card: ${err}`);

        } finally {
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

                if (this.DEBUG)
                    console.log(`[Wallpad.parseResponse] Packet parsed:\n${matched}`);

                return true;
            }
        });

        switch (matchedType) {
            case 'authedUser':
                this.#authedHandler(
                    matchedValue.toString().substring('AUTHED_'.length)
                );
                break;

            case 'processed':
                this.#done();
                break;

            case 'tmoneyBalance':
                this.#tmoneyBalanceHandler(matchedValue);
                break;

            default:
                if (matchedType != null) {
                    // Indicates an error condition when matchedType is not null
                    this.#errorHandler(matchedType);
                }
        }
    }
};

module.exports = Wallpad;