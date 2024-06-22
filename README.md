Smart-Lab - 스마트랩 프로젝트 통합 레포지터리
===

<div>
<img src="preview1.png" width="216" height="384">
<img src="preview2.png" width="216" height="384">
</div>

📌 구성요소 소개
---
스마트랩 시스템은 크게 다음 요소로 구성됩니다.

1. 월패드
> 연구실 외부에 설치되는 모니터로, 부원 재실 현황과 연구실 소식 등의 간단한 정보를 표시합니다. 또한 PN532 모듈을 통하여 비접촉식 스마트카드와 통신하는 기능을 구현합니다. 
2. 스마트카드
> 이름, 학번 등의 고유 정보가 저장되며, 월패드와 Challenge-Response 방식의 인증을 수행합니다.<br>
> 월패드는 인식된 스마트카드에 대하여 이러한 인증 절차를 수행한 뒤 출퇴근 상태를 변경합니다.
3. 서버
> 월패드가 전송하는 각종 로그를 전달받아 저장하고, IoT 허브로 기능하여 월패드가 전송하는 장치(도어락, 조명)제어 요청이 실제로 실행되는 주체입니다.<br>
<br>

📌 기타
---

1. 스마트카드 전용 앱
> 사용 중인 스마트폰에 스마트카드를 접촉하여 저장된 출퇴근 기록을 확인할 수 있습니다.<br>
> 부가기능으로 첫 출근 시 도어락 해제, 마지막 퇴근 시 조명 끄기와 같은 추가 설정값을 변경할 수 있는 기능을 제공합니다.<br>
> 또한, 앱을 실행한 상태에서 ID 카드를 태깅하여 웹 서비스에서 2FA 인증을 실시할 수 있는 기능을 제공합니다.
<br>

📌 사용 예정(중인) 기술
---

|구성요소|사용 기술(언어)|비고|
|------|------|-----|
|월패드(프론트)|Next.js(JS)|
|월패드(백엔드)|Flask(Python)|
|Database|SQLite(예정)|
|스마트카드|JavaCard 3.0.5(Java)|
|서버|미정|
|전용 앱|Flutter(Dart)|

