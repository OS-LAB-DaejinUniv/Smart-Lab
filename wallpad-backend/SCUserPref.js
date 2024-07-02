// 스마트카드의 부가정보 데이터를 받아 설정값 해석
class SCUserPref {
    constructor(userSettings) {
        this.lightOnAtFirst = null;     // 첫 출근시 전등 켬
        this.lightOffWhenLeave = null;  // 마지막 퇴근시 전등 끔
        this.unlockDoorAtFirst = null;  // 첫 출근시 도어락 해제
        this.lockDoorWhenLeave = null;  // 마지막 퇴근시 도어락 잠금

        Object.keys(this).forEach((key, idx) => {
            this[key] = (userSettings[idx] == '1') ? true : false;
        });
    }
};

module.exports = SCUserPref;