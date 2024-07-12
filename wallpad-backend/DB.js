const Database = require('better-sqlite3')
const query = require('./query')
const DBException = require('./DBException')

class DB {
    constructor(dbConn) {
        if (dbConn.open) {
            this.db = dbConn;
            
        } else {
            throw new DBException('DBConnNotOpened');
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
            console.error(`[DB.selectMemberByUUID] error(s) occured. details: ${err}`);

            throw new DBException('NotFoundUser');
        }
    }

    updateUserStatus(uuid, status) {
        try {
            const result = (this.db)
                .prepare(query.updateStatus)
                .run(status, uuid);

                console.log('update result: ', result);

            if (result)
                return result;
            else
                throw new Error();

        } catch (err) {
            console.error(`[DB.updateUserStatus] error(s) occured. details: ${err}`);

            throw new DBException('QueryFailed');
        }
    }
};

module.exports = DB;