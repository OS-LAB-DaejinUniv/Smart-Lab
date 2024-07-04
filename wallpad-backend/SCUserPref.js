// 스마트카드의 부가정보 데이터를 받아 설정값 해석
class SCUserPref {
    constructor(userSettings) {
        this.prefs = {
            lightOnAtFirst: null,     // 첫 출근시 전등 켬
            unlockDoorAtFirst: null,  // 첫 출근시 도어락 해제
            lightOffWhenLeave: null,  // 마지막 퇴근시 전등 끔
        };

        Object.keys(this.prefs).forEach((key, idx) => {
            this.prefs[key] = (userSettings[idx] == '1') ? true : false;
        });
    }

    toString() {
        return '[SCUserPref] 설정값:\n' +
            `첫 출근시 전등 켬: ${this.prefs.lightOnAtFirst ? '예' : '아니오'}\n` +
            `첫 출근시 도어락 해제: ${this.prefs.unlockDoorAtFirst ? '예' : '아니오'}\n` +
            `마지막 퇴근시 전등 끔: ${this.prefs.lightOffWhenLeave ? '예' : '아니오'}`;
    }
}

module.exports = SCUserPref;