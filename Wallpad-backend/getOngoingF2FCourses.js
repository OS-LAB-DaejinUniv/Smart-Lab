const login = 'https://djattend.daejin.ac.kr/eams/loginProc';
const titmeTable = 'https://djattend.daejin.ac.kr/eams/student/timetbl/studTimeTable'; // 전자출결 시간표

const arg = process.argv;
const [userId, userPwd, schYear, semester] = [arg[2], arg[3], arg[4], arg[5]];

function getCookie(content, name) {
    const value = `; ${content}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

(async () => {

    const result = await fetch(login, {  // 2. 로그인 요청
        method: 'POST',
        body: `login_id=${userId}&login_pw=${userPwd}`,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        
    })
        .then(async (res) => {
            const cookies = res.headers.get('set-cookie');
            const body = await res.text();
            console.log(body);
        });
        
})();