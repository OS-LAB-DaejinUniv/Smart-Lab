const Extension = require("../Extension");

// 기능: 출근 태그시 카드에 저장된 MAC 주소를 읽고 WOL 패킷 보내기 
// 출입카드의 개인 설정 영역 10-15번째 바이트에 희망하는 MAC 주소를 미리 저장해야 합니다.

module.exports = new Extension({
    enabled: true,
    activatedStatus: 1,
    activatedIndex: '*'
},
    (userInfo, changedTo, memberList) => {
        const HWAddr = (() => {
            const addr = userInfo.extra.slice(2 * 10, 2 * 16);
            let format = '';
            for (i = 0; i < addr.length; i++)
                ((i !== 0) && (i % 2 == 0)) ?
                    format += ':' + addr[i] :
                    format += addr[i];
            return format;
        })();
        const url = 'http://api.oslab:8080/wol/' + HWAddr;
        const headers = { 'Authorization': 'password osa94l3l' };

        return fetch(url, {
            method: 'POST',
            headers
        })
            .then(resp => resp.json())
            .then(body => console.log(`[TurnOnPC] ${HWAddr} -> ${body.message}`))
            .catch(err => console.error(`[TurnOnPC] ${HWAddr} -> ${err}`));
    }
);
