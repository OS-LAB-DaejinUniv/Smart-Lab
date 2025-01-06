/**
 * @brief A class which abstracts database related tasks.
 * @details Provides methods to query to database.
 * @author Jay Kang
 * @date July 15, 2024
 * @version 0.1
 */

const query = require('./query');
const DBException = require('./DBException');
const TimeDiff = require('./utils/TimeDiff');

class DB {
    static isCreated = false;

    constructor(dbConn) {
        if (DB.isCreated) throw new Error(
            'DB instance has already been created.'
        );

        if (dbConn.open) {
            this.db = dbConn;

        } else {
            throw new DBException('', 'DBNotOpened');
        }
    }

    selectMembers() {
        try {
            const row = (this.db)
                .prepare(query.memberList)
                .all();

            if (row)
                return row;

            else
                throw new Error();

        } catch (err) {
            console.error(`[DB.selectMemberByUUID] SelectError`, err);

            throw new DBException('', 'SelectError');
        }
    }

    selectMemberByUUID(uuid) {
        try {
            const row = (this.db)
                .prepare(query.selectMember)
                .get(uuid);

            if (row)
                return row;

            else
                throw new Error();

        } catch (err) {
            console.error(`[DB.selectMemberByUUID] NotFoundUser`);

            throw new DBException('', 'NotFoundUser');
        }
    }

    updateUserStatus(uuid, status, at) {
        try {
            if (!at instanceof Date) {
                throw new Error('`at` must be a instance of Date.');
            }

            const updateStatusRes = (this.db)
                .prepare(query.updateStatus)
                .run(status, uuid);

            const insHistoryRes = (this.db)
                .prepare(query.addHistory)
                .run(uuid, status, at.getTime());

            if (updateStatusRes.changes == 1 == insHistoryRes.changes) {
                console.log(`[DB.updateUserStatus] Updated. \'status\' of ${uuid} to ${status} at ${at}`);
                return true;

            } else {
                throw new Error();
            }

        } catch (err) {
            console.error('[DB.updateUserStatus]', err);

            throw new DBException('', 'QueryFailed');
        }
    }

    getHoursToReturn(uuid) {
        try {
            const row = (this.db)
                .prepare(query.getLastOut)
                .get(uuid);

            if (!row) {
                return {
                    isFirst: true
                };
            }

            const lastCheckoutAt = row.at;

            return {
                ...new TimeDiff(lastCheckoutAt),
                isFirst: false
            };

        } catch (err) {
            console.error('[DB.getHoursToReturn]', err);
        }
    }

    getTodayWorkingHours(uuid) {
        try {
            const row = (this.db)
                .prepare(query.getLastIn)
                .get(uuid);

            if (!row) {
                return {
                    isFirst: true
                };
            }

            const lastCheckinAt = row.at;

            return {
                ...new TimeDiff(lastCheckinAt),
                isFirst: false
            };

        } catch (err) {
            console.error('[DB.getTodayWorkingHours]', err);
        }
    }

    getHistory(filter) {
        try {
            const selectedUUID = Object.keys(filter.uuid).reduce((acc, uuid) => {
                if (filter.uuid[uuid]) {
                    acc.push(uuid);
                }
                return acc;
            }, []);

            console.log('QUERY:',query.getHistory + query.withCondition.UUIDArray(selectedUUID));

            const rows = (this.db)
                .prepare(query.getHistory + query.withCondition.UUIDArray(selectedUUID))
                .all();

            return rows;

        } catch (err) {
            console.error('[DB.getHistory]', err);
        }
    }
};

module.exports = DB;