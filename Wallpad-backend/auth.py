"""
-자바 카드 인증 확인 로직-
- response challenge 인증 사용
1. 난수 생성
2. 난수를 자바카드에 보냄
3. 자바카드에서 오는 응답을 받음
4. 응답을 해독
5. 해독한 응답이 난수와 같은지 비교
6. 맞다면 DB 기록
7. 아니면 에러 
"""
import os
from Crypto.Cipher import AES
import base64

SECRET_KEY=(bytes[]) # 아직 안 정함

# challenge 생성 => 난수 생성
def generate_challenge():

    return os.urandom(16)






