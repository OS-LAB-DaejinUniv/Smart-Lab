// 인증된 스마트카드의 데이터를 전달받아 파싱하는 데이터 객체
// decrypted challenge(16-byte) + UUID of smartcard(16-byte) + personal preferences(16-byte)

const SCUserPref = require('./SCUserPref')

class SCData {
    constructor(authedResp) {
        if (authedResp.length != (16 * 2) * 3) throw new Error(
            '`authedResp`: invalid length.'
        );

        this.response = authedResp.substring(0  * 2, 16 * 2);
        this.uuid     = authedResp.substring(16 * 2, 32 * 2);
        this.extra    = authedResp.substring(32 * 2, 48 * 2);
        this.extra = new SCUserPref(this.extra);
    }
}

module.exports = SCData;