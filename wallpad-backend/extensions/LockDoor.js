const Extension = require("../Extension");

module.exports = new Extension({
    enabled: true,
    activatedStatus: 0,
    activatedIndex: 1
},
    (userInfo, changedTo, memberList) => {
        const url = 'http://api.oslab:8080/doorlock/lock';
        const headers = { 'Authorization': 'password osa94l3l' };

        const peopleLeft = memberList.reduce((acc, curr) => {
            return (curr.status > 0) ?
                ++acc : acc;
        }, 0);

        if (peopleLeft === 0) {
            fetch(url, {
                method: 'POST',
                headers
            })
                .then(resp => resp.json())
                .then(body =>
                    console.log(`[LockDoor] 잠금 요청 완료. 응답=${body.status}`)
                );
            return;

        } else {
            console.log('[LockDoor] 재실 인원이 있어 잠그지 않았습니다.');
            return;
        }

    }
);