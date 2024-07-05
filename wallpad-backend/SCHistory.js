/* 카드 태그 타입(출근태그, 퇴근태그)에 따른 사용내역 버퍼를 생성하는 클래스 */
class SCHisory {
    constructor(date, type) {
        if (!(date instanceof Date)) throw new Error(
            '`date` must be a instance of Date.'
        );

        if (!(type >= 0 && type <= 9)) throw new Error(
            '`type` must be in range of 0-9.'
        );

        // get unix time from given date object.
        const uTime = parseInt(date.getTime() / 1000).toString(16); // as ascii hex format.

        // convert ascii hex to buffer.
        const uTimeBuf = Buffer.from(uTime, 'hex');
        const pTypeBuf = Buffer.from((type + '').padStart(2, '0'), 'hex');

        // usage history(5-byte): time(4-byte) + usage type(1-byte)
        return Buffer.concat([uTimeBuf, pTypeBuf]);
    }
}

module.exports = SCHisory;