# Wallpad-Backend - Socket.IO 서버

### 개요
출근부 카드 태그 이벤트를 처리하는 백엔드 시스템입니다.

### 주요 기능
- **출퇴근 처리**: serialPort와 Socket.IO 라이브러리를 사용하여 카드 태그 이벤트(출근/퇴근)를 처리하고 FE로 결과 전송
- **데이터 관리**: SQLite를 통한 부원 정보 및 출퇴근 내역 관리
- **API 제공**: 내부망에서 부원 관리, 로그 조회 등의 제어 기능 제공
- **웹훅 연동**: 이벤트 발생 시 내부 서버로 이벤트 전파 가능
- **이벤트 핸들러 확장**: 출퇴근 이벤트가 발생하면 지정한 작업을 수행하도록 하는 모듈을 개발할 수 있습니다.

### 기술 스택
- Socket.IO
- serialPort
- SQLite
- RESTful API
- Webhook

### 이벤트 핸들러 확장
월패드에서 발생하는 출퇴근 이벤트에 반응하여 실행되는 확장 모듈을 직접 작성하여 추가할 수 있습니다.

본 프로젝트에서 제공하는 ```Extension``` 클래스를 불러와 아래와 같은 형식으로 작성한 뒤 ```extension``` 디렉터리에 저장합니다.
```
// 파일: extensions/MyExtension.js

import { Extension } from "../Extension";

export default new Extension({
    enabled: true, // 활성화 여부 지정
    activatedStatus: 0, // 확장 실행을 원하는 이벤트(0: 퇴근, 1: 출근, *: 모두)
    activatedByIndex: 2 // ID카드에서 이 확장 모듈의 실행 여부를 결정하는 니블의 인덱스를 지정합니다.
                        // ID카드상에서 해당 인덱스의 니블이 1인 경우 실행됩니다.
                        // 이 속성을 '*'로 지정하면 ID카드의 값과 무관하게 항상 실행됩니다.
},
    (userInfo, changedTo, memberList) => {
        const url = 'http://example.api/light/off';
        const isEmpty = memberList.reduce((acc, curr) => {
            return (!curr.status) ?
                ++acc :
                acc;
        }, 0);

        if (!isEmpty) {
            const result = fetch(url, { method: 'POST' })
                .then(resp => resp.json())
                .then(body => body.status);
            return result;
        }

        return false;
    }
);
```
위 예제는

1. **퇴근 이벤트가 감지되었고**,
1. **ID 카드의 부가데이터 영역에서 2번째 니블의 값이 1로 설정되어 있는 경우**

실행되며,

memberList 배열에서 status가 0이 아닌(재실 상태인) 인원의 수를 구한 뒤, 0인 경우 실내 조명을 끄는 동작을 수행하도록 작성된 확장 모듈의 예입니다.

코드에서 확인하신 것과 같이, ```Extension``` 객체의 생성자에게 전달되는 두 번째 매개변수는 이벤트에 대한 구체적인 동작을 정의한 핸들러 함수입니다.

핸들러 함수는 상위 클래스 ```Wallpad```에 의하여 선행 조건이 충족된 경우 호출되며, 보다 정교한 동작을 수행할 수 있도록 차례대로 다음 세 가지의 매개변수를 전달받습니다.

1. **userInfo**: 이벤트를 발생시킨 사용자의 정보 객체
```
{
    name: '홍길동', // 사용자의 이름
    position: 0 // 사용자의 직책 코드
    uuid: 'BCF33D7471B54B42922913E41D35BF42' // 사용자의 고유번호
}
```
2. **changedTo**: 이벤트를 발생시킨 사용자의 변동된 상태(0: 퇴근, 1: 출근)
3. **memberList**: 등록된 모든 구성원의 객체 배열
```
[
    {
        name: '홍길동', // 구성원의 이름
        uuid: 'BCF33D7471B54B42922913E41D35BF42', // 구성원의 고유번호
        position: 0, // 구성원의 직책코드
        github: 'github', // 구성원의 GitHub 이름
        emoji: 'nerd' // GitHub 프로필 이미지 fallback으로 표시될 이모지의 이름(wallpad-frontend/public/emoji 참조)
    }
]
```

### 상태
개발 중

### 예정사항
- 추가 문서화
- 테스트 케이스 작성