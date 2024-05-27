"""
포털대진에서 개개인별 시간표 가져오기
웹크롤링 사용
1. 로그인 여부 확인
2. 대진대학교 서버에 쿠키를 보내기
3.

있어야 하는 쿠키 : JSESSIONID, userFlag, userId, 
import sys : 터미널에서 인자 받기 위한 모듈 사용

실행 방법 : python3 getTimeTeable.py 학번 비번
"""
from flask import redirect
import sys
import requests

timeTable = 'https://djattend.daejin.ac.kr/eams/student/timetbl/studTimeTable'


# 포털대진 cookies
JSESSIONID='' # 접속자 세션 유지용 쿠키
SSOCookie='' # 로그인 성공할 경우 받아온 SSO 로그인 세션 쿠키 보관

dreamsCookie={} # 포털대진 전용 세션 쿠키 보관
creds={'userId':sys.argv[1],'userPwd':sys.argv[2]} # 터미널 입력 인자 로그인 정보 가져오기

session = requests.Session() # 쿠키 유지 위해 세션 객체 설정
cookies = session.cookies.get_dict()
print(cookies)



if "sso" in JSESSIONID.headers['Location']:
    print("로그인 성공")
    loginResult = session.get(JSESSIONID.headers['Location'])  # sso 타기
    print("sso 활성화: ", JSESSIONID.headers['Location']) # 세션 활성화
    
else:
    print("로그인 실패")
