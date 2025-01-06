const Extension = require("../Extension");

module.exports = new Extension({
    enabled: true,
    activatedStatus: 1,
    activatedIndex: 0
},
    (userInfo, changedTo, memberList) => {
        const url = 'http://api.oslab:8080/doorlock/unlock';
        const headers = { 'Authorization': 'password osa94l3l' };

        fetch(url, {
            method: 'POST',
            headers
        })
            .then(resp => resp.json())
            .then(body => 
                console.log(`[UnlockDoor] 잠금해제 요청 완료. 응답=${body.status}`)
            );
    }
);