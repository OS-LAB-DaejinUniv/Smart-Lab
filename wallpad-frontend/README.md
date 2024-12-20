## 🖼️ wallpad-frontend – React 기반 메인 UI
React 기반의 메인 UI입니다.<br>
핵심 기능은 부원의 재부재 상태와 간단한 광고 이미지를 슬라이드 쇼로 표시하는 것입니다.<br>
이와 함께 ID 카드 인식을 위한 가이드 애니메이션을 표시합니다.<br><br>
<img src="https://raw.githubusercontent.com/OS-LAB-DaejinUniv/Smart-Lab/refs/heads/main/wallpad-frontend/demo1.gif" />
<br>

### 📝 To-Do
- [ ] 장시간(대략 1주일 이상) 구동하는 경우 속도가 현저히 저하되는 문제 해결(Raspberry Pi 4, RAM 4GB 기준)
- [ ] 자이로 센서 활용하여 스크린 노크 감지 및 초인종 기능 구현
- [ ] 마지막 출근태그 이후 1일 이상 재실 상태를 유지하는 경우 프로필 이미지에 버닝 효과 적용
- [ ] 생일인 경우 프로필 사진에 고깔모자, 프로필 사진 좌측에 케이크 아이콘 표시
- [ ] 프로필 표시 순서를 변경할 수 있도록 구성
- [ ] Back-end와 도중에 연결이 끊기는 경우 상태 감지, 오류 화면 구성
- [ ] 광고 이미지가 캐시되지 않고 매번 새롭게 다운로드하는 문제 해결
- [ ] 지정한 시간동안 임의 메시지박스를 띄울 수 있도록 구성
- [ ] 관리자 UI 버그 수정
- [ ] Vite+React로 전환
