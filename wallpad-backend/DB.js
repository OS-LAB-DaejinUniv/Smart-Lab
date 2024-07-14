const Database = require('better-sqlite3')
const query = require('./query')
const DBException = require('./DBException')

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

            if (updateStatusRes.changes == 1 == insHistoryRes.changes)
                return true;

            else
                throw new Error();

        } catch (err) {
            console.error(`[DB.updateUserStatus] error(s) occured. details: ${err}`);

            throw new DBException('', 'QueryFailed');
        }
    }
};

module.exports = DB;