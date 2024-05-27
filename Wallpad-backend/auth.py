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
from Crypto.Random import get_random_bytes
import base64

SECRET_KEY=(b'asdasdasdasdasda') # 아직 안 정함

assert len(SECRET_KEY) == 16, "Key must be 16 bytes long"

def pad(data):
    """AES 블록 크기(16바이트)에 맞추어 데이터를 패딩합니다."""
    pad_len = 16 - (len(data) % 16)
    return data + bytes([pad_len] * pad_len)

def unpad(data):
    """패딩을 제거합니다."""
    pad_len = data[-1]
    return data[:-pad_len]

def generate_challenge():
    """무작위 챌린지를 생성합니다."""
    return os.urandom(16)  # 16 바이트의 무작위 데이터

def generate_response(challenge, secret_key):
    """챌린지와 비밀 키를 사용하여 응답을 생성합니다 (AES 암호화)."""
    cipher = AES.new(secret_key, AES.MODE_ECB)
    padded_challenge = pad(challenge)
    encrypted_challenge = cipher.encrypt(padded_challenge)
    return encrypted_challenge

def verify_response(challenge, response, secret_key):
    """응답을 검증합니다 (AES 복호화)."""
    cipher = AES.new(secret_key, AES.MODE_ECB)
    decrypted_response = unpad(cipher.decrypt(response))
    return decrypted_response == challenge

# 서버: 챌린지 생성
server_challenge = generate_challenge()
print(f"Server generated challenge: {server_challenge.hex()}")

# 클라이언트: 응답 생성
client_response = generate_response(server_challenge, SECRET_KEY)
print(f"Client generated response: {client_response.hex()}")

# 서버: 응답 검증
if verify_response(server_challenge, client_response, SECRET_KEY):
    print("Client is authenticated successfully.")
else:
    print("Client authentication failed.")





