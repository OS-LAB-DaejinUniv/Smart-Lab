const Extension = require("../Extension");

// 기능: 마지막 퇴근인 경우 도어락 잠그기

module.exports = new Extension({
    enabled: true,
    activatedStatus: 0,
    activatedIndex: '*'
},
    (userInfo, changedTo, memberList, ctx) => {
        const url = 'http://api.oslab:8080/doorlock/lock';
        const headers = { 'Authorization': 'password osa94l3l' };

        const peopleLeft = memberList.reduce((acc, curr) =>
            (curr.status == 1) ? ++acc : acc
            , 0);

        if (peopleLeft == 0) {
            return fetch(url, {
                method: 'POST',
                headers
            })
                .then(resp => resp.json())
                .then(body => {
                    console.log('[LockDoor]', body.message);
                    ctx.notify('마지막 퇴실이셔서 문을 잠갔어요!');
                })
                .catch(err => {
                    console.error(`[LockDoor] 문 잠그기 실패\n${err}`);
                    ctx.notify('문제가 발생하여 문을 잠그지 못했어요.');
                });

        } else {
            console.log('[LockDoor] 남은 인원이 있어 문을 잠그지 않았습니다.');
            ctx.notify('남은 부원이 있어 문을 잠그지 않았어요.');
            return;
        }
    }
);