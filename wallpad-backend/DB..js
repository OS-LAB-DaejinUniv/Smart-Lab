const Database = require('better-sqlite3')
const sqls = require('./sqls')

class DB {
    constructor(dbPath, dbConf) {
        this.conn = new Database(dbPath, dbConf);
    }

    getUserNameByUUID(uuid) {
        try {
            return this.conn.prepare(sqls.getName)
                .get(now.uuid).name;

        } catch (err) {
            console.error(`[DB.getUserNameByUUID] error: ${err}`);

        } finally {
            return null;
        }
    }
}