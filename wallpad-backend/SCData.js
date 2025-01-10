/**
 * @brief A data class which parses authenticated smartcard response as object.
 * @author Jay Kang
 * @date July 15, 2024
 * @version 0.1
 */

const DBException = require('./DBException');

class SCData {
    constructor(dbConn, authedResp) {
        // decrypted challenge(16-byte) + UUID of smartcard(16-byte) + personal preferences(16-byte)
        if (authedResp.length != (16 * 2) * 3) throw new Error(
            '`authedResp`: invalid length.'
        );

        this.db = dbConn;

        this.response = authedResp.substring(0  * 2, 16 * 2);
        this.uuid     = authedResp.substring(16 * 2, 32 * 2);
        this.extra    = authedResp.substring(32 * 2, 48 * 2);

        // will be filled after query executed.
        this.name = null;
        this.position = null;
        this.status = null;

        this.selectFromDB();

        return this;
    }

    selectFromDB() {
        try {
            const row = this.db.selectMemberByUUID(this.uuid);

            Object.keys(row).forEach(key => 
                this[key] = row[key]
            );

            return this;
        
        } catch (err) {
            throw new DBException('', 'NotFoundUser');
        }
    }
}

module.exports = SCData;