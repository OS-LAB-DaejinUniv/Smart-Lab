/**
 * @brief A class which abstracts database related tasks.
 * @details Provides methods to query to database.
 * @author Jay Kang
 * @date March 8, 2026
 * @version 0.2
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
            console.error(`[DB.selectMembers] SelectError`, err);

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

    insertMember(uuid, name, position, emoji, github) {
        try {
            const result = (this.db)
                .prepare(query.insertMember)
                .run(uuid, name, position, emoji, github);

            if (result.changes === 1) {
                console.log(`[DB.insertMember] Inserted member: ${name} (${uuid})`);
                return true;
            }
            throw new Error('InsertFailed');

        } catch (err) {
            console.error('[DB.insertMember]', err);
            if (err.message && err.message.includes('UNIQUE')) {
                throw new DBException('', 'DuplicateEntry');
            }
            throw new DBException('', 'InsertFailed');
        }
    }

    updateMemberField(uuid, field, value) {
        const allowedFields = ['name', 'position', 'emoji', 'github', 'uuid', 'status'];
        if (!allowedFields.includes(field)) {
            throw new DBException('', 'InvalidField');
        }

        try {
            if (field === 'uuid') {
                // UUID change: update members table and history table
                const updateMember = this.db.prepare('UPDATE members SET uuid = (?) WHERE uuid = (?)');
                const updateHistory = this.db.prepare('UPDATE history SET uuid = (?) WHERE uuid = (?)');

                const txn = this.db.transaction(() => {
                    updateMember.run(value, uuid);
                    updateHistory.run(value, uuid);
                });
                txn();

                console.log(`[DB.updateMemberField] UUID changed: ${uuid} -> ${value}`);
                return true;
            }

            const result = (this.db)
                .prepare(query.updateMemberField(field))
                .run(value, uuid);

            if (result.changes === 1) {
                console.log(`[DB.updateMemberField] Updated ${field} of ${uuid} to ${value}`);
                return true;
            }
            throw new Error('NoRowsAffected');

        } catch (err) {
            console.error('[DB.updateMemberField]', err);
            if (err.message && err.message.includes('UNIQUE')) {
                throw new DBException('', 'DuplicateEntry');
            }
            throw new DBException('', 'UpdateFailed');
        }
    }

    deleteMember(uuid) {
        try {
            const deleteMemberStmt = this.db.prepare(query.deleteMember);
            const deleteHistoryStmt = this.db.prepare(query.deleteHistoryByUUID);

            const txn = this.db.transaction(() => {
                deleteHistoryStmt.run(uuid);
                deleteMemberStmt.run(uuid);
            });
            txn();

            console.log(`[DB.deleteMember] Deleted member: ${uuid}`);
            return true;

        } catch (err) {
            console.error('[DB.deleteMember]', err);
            throw new DBException('', 'DeleteFailed');
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

    getHistory(filter, limit = 10, offset = 0) {
        try {
            const selectedUUID = Object.keys(filter.uuid).reduce((acc, uuid) => {
                if (filter.uuid[uuid]) {
                    acc.push(uuid);
                }
                return acc;
            }, []);

            const { clause, params } = query.buildUUIDFilter(selectedUUID);

            const rows = (this.db)
                .prepare(query.getHistoryBase + clause + query.historyOrderAndLimit)
                .all(...params, limit, offset);

            const countRow = (this.db)
                .prepare(query.getHistoryCount + clause)
                .get(...params);

            return {
                rows,
                total: countRow.total
            };

        } catch (err) {
            console.error('[DB.getHistory]', err);
            return { rows: [], total: 0 };
        }
    }

    selectLastEventByUUID(uuid) {
        try {
            const member = (this.db)
                .prepare(query.selectMember)
                .get(uuid);

            if (!member)
                throw new DBException('', 'NotFoundUser');

            if (member.status >= 2)
                throw new DBException('', 'UnsupportedStatus');

            const lastEventQuery = (this.db)
                .prepare(
                    (member.status == 1) ? query.getLastIn :
                        (member.status == 0) ? query.getLastOut : null
                );

            return {
                type: member.status,
                at: lastEventQuery
                    .get(uuid).at
            }

        } catch (err) {
            console.error('[DB.selectLastEventByUUID]', err);
        }
    }

    getHistoryLatest() {
        try {
            const rows = this.db.prepare('SELECT * FROM history ORDER BY at DESC LIMIT 10').all();
            rows.map((log, index) => {
                rows[index].name = this.selectMemberByUUID(log.uuid).name;
                delete rows[index].uuid;
            });
            return rows;
        } catch (err) {
            console.error('[DB.getHistoryLatest] Failed to fetch recent history', err);
            throw new DBException('', 'SelectionError');
        }
    }
};

module.exports = DB;
