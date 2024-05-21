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

loginURL='https://www.daejin.ac.kr/daejin/1045/subview.do' # 로그인창 URL
linkPortalURL='https://dreams2.daejin.ac.kr/sugang/LinkPortal.jsp' # JSESSIONID 변환 URL
timeTableURL='https://dreams2.daejin.ac.kr/sugang/center/BlsnTotalTimeTableLst.jsp' #포털대진 시간표 URL

# 포털대진 cookies
JSESSIONID='' # 접속자 세션 유지용 쿠키
SSOCookie='' # 로그인 성공할 경우 받아온 SSO 로그인 세션 쿠키 보관

dreamsCookie={} # 포털대진 전용 세션 쿠키 보관
creds={'userId':sys.argv[0],'userPwd':sys.argv[1]} # 터미널 입력 인자 로그인 정보 가져오기

session = requests.Session() # 쿠키 유지 위해 세션 객체 설정
JSESSIONID = session.get(loginURL) # 로그인 전 JSESSIONID 쿠키 얻음
print(JSESSIONID.headers)

def login():
    if (session.headers["Location"].find("sso")) == True:
        print("로그인 성공")
        return redirect(session.get(session.headers["Location"]))
    else:
        return exit()
    

