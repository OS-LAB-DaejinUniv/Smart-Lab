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

getJSESSION = 'https://www.daejin.ac.kr/daejin/1045/subview.do' # 로그인창 URL
loginEndpoint = 'https://daejin.ac.kr/subLogin/daejin/login.do' 
linkPortalURL = 'https://dreams2.daejin.ac.kr/sugang/LinkPortal.jsp' # JSESSIONID 변환 URL
timeTableURL = 'https://dreams2.daejin.ac.kr/sugang/center/BlsnTotalTimeTableLst.jsp' #포털대진 시간표 URL

# 포털대진 cookies
JSESSIONID='' # 접속자 세션 유지용 쿠키
SSOCookie='' # 로그인 성공할 경우 받아온 SSO 로그인 세션 쿠키 보관

dreamsCookie={} # 포털대진 전용 세션 쿠키 보관
creds={'userId':sys.argv[1],'userPwd':sys.argv[2]} # 터미널 입력 인자 로그인 정보 가져오기

session = requests.Session() # 쿠키 유지 위해 세션 객체 설정
JSESSIONID = session.get(getJSESSION)                                        # 1. 로그인 전 JSESSIONID 쿠키 얻음
JSESSIONID = session.post(loginEndpoint, data=creds, allow_redirects=False)  # 2. 로그인 양식 전송
cookies = session.cookies.get_dict()
print(cookies)



if "sso" in JSESSIONID.headers['Location']:
    print("로그인 성공")
    loginResult = session.get(JSESSIONID.headers['Location'])  # sso 타기
    print("sso 활성화: ", JSESSIONID.headers['Location']) # 세션 활성화
else:
    print("로그인 실패")

link_res = session.get(linkPortalURL,allow_redirects=True)
if link_res.status_code != 200:
    print("실패")
else:
    print(link_res.cookies)

titmetable_res = session.get(timeTableURL,allow_redirects=True)
if titmetable_res.status_code == 200:
    print("성공")
    print(titmetable_res.text)
else:
    print("실패")