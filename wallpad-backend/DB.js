const Database = require('better-sqlite3')
const query = require('./query')
const DBException = require('./DBException');

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
            return (this.conn)
                .prepare(query.selectMember)
                .get(uuid);
            
        } catch (err) {
            console.error(`[DB.selectMemberByUUID] no such user found.`);

            throw new DBException('NotFoundUser');
        }
    }
};

module.exports = DB;