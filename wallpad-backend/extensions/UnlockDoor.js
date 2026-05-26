const Extension = require("../Extension");

// 기능: 출근 태그시 도어락 잠금 해제

module.exports = new Extension({
    enabled: true,
    activatedStatus: 1,
    activatedIndex: '*'
},
    (userInfo, changedTo, memberList, ctx) => {
        const url = 'http://api.oslab:8080/doorlock/unlock';
        const headers = { 'Authorization': 'password osa94l3l' };

        return fetch(url, {
            method: 'POST',
            headers
        })
            .then(resp => resp.json())
            .then(body => {
                console.log('[UnlockDoor]', body.message);
                ctx.notify('출입문 잠금을 해제했어요!');
            })
            .catch(err => {
                console.error(`[UnlockDoor] 문 열기 실패\n${err}`);
                ctx.notify('도어락을 여는 중 문제가 발생했어요.');
            });
    }
);
