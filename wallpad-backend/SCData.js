// 인증된 스마트카드의 데이터를 전달받아 파싱하는 데이터 객체
// decrypted challenge(16-byte) + UUID of smartcard(16-byte) + personal preferences(16-byte)

const SCUserPref = require('./SCUserPref')
const DBException = require('./DBException');

class SCData {
    constructor(dbConn, authedResp) {
        if (authedResp.length != (16 * 2) * 3) throw new Error(
            '`authedResp`: invalid length.'
        );

        this.db = dbConn;

        this.response  = authedResp.substring(0  * 2, 16 * 2);
        this.uuid      = authedResp.substring(16 * 2, 32 * 2);
        this.extra     = authedResp.substring(32 * 2, 48 * 2);
        this.extra = new SCUserPref(this.extra);

        // will be filled after query executed.
        this.name = null;
        this.position = null;
        this.status = null;

        return this;
    }

    selectFromDB() {
        try {
            const row = this.db.selectMemberByUUID(this.uuid);
            console.log('선택한거' + row);

            return this;
        
        } catch (err) {
            console.error(`[SCData.selectFromDB] error: ${err}`);
            throw new DBException('NotFoundUser');
        }
    }
}

module.exports = SCData;