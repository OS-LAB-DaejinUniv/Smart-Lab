const Extension = require("../Extension");

// 기능: 마지막 퇴근인 경우 도어락 잠그기

module.exports = new Extension({
    enabled: true,
    activatedStatus: 0,
    activatedIndex: 0
},
    (userInfo, changedTo, memberList) => {
        const url = 'http://api.oslab:8080/doorlock/lock';
        const headers = { 'Authorization': 'password osa94l3l' };

        const peopleLeft = memberList.reduce((acc, curr) =>
            (curr.status > 0) ? ++acc : acc
            , 0);

        if (peopleLeft == 0) {
            return fetch(url, {
                method: 'POST',
                headers
            })
                .then(resp => resp.json())
                .then(body => console.log('[LockDoor]', body.message))
                .catch(err => console.error(`[LockDoor] 문 잠그기 실패\n${err}`));

        } else {
            console.log('[LockDoor] 남은 인원이 있어 문을 잠그지 않았습니다.');
            return;
        }
    }
);