#include <Wire.h>
#include <SPI.h>
#include <AES.h>
#include <CBC.h>
#include <Adafruit_PN532.h>
#include <CryptoAES_CBC.h>

#define PN532_SCK  (2)
#define PN532_MOSI (3)
#define PN532_SS   (4)
#define PN532_MISO (5)

#define LEN_CLIENT_AUTH_RESPONSE (48)

#define DEBUG

Adafruit_PN532 nfc(PN532_SCK, PN532_MISO, PN532_MOSI, PN532_SS); // pn532 드라이버 초기화
CBC<AES128> cbcaes128;

extern uint8_t key[]; // secret.ino에서 참조하도록 지정
uint8_t iv[16] = {0,};

char SELECT[] = {0x00, 0xA4, 0x04, 0x00, 0x07, 0x55, 0x44, 0x33, 0x22, 0x11, 0xCC, 0xBB};
char CLIENT_AUTH[21] = {0x54, 0xAA, 0x00, 0x00, 0x10}; // 클라이언트 인증 메시지, 16바이트 nonce를 뒤에 붙여 사용하여야 함

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(1000);
  #ifdef DEBUG
    Serial.setTimeout(5000);
  #endif
  nfc.begin(); // pn532 시작
  nfc.SAMConfig(); 
  randomSeed(analogRead(1)); // 아날로드 1번 핀의 ADC 값을 랜덤시드로 사용
  cbcaes128.setIV(iv, 16); // IV 지정
  cbcaes128.setKey(key, 16); // AES-128 CBC 키 지정
}

void update_challenge() {
  for (uint8_t i = 5; i < sizeof(CLIENT_AUTH); i++) { // 인덱스 5 ~ 20까지 각 인덱스마다
    CLIENT_AUTH[i] = (char) (random(256)); // 8비트 난수 생성하여 저장
  }
}

void(* rst) (void) = 0; //declare reset function @ address 0

void printHex(uint8_t *data, uint32_t length, bool rm_newline = false) {
  for (uint32_t i = 0; i < length; i++) {
    Serial.print(data[i] < 0x10 ? "0" : "");
    Serial.print(data[i], HEX);
  }

  if (rm_newline) return;
  Serial.println("");
}

bool strequal(uint8_t *str1, uint8_t *str2, uint8_t off1, uint8_t off2, uint8_t len) {
  for (uint8_t i = 0; i < len; i++) {
    if (str1[off1 + i] != str2[off2 + i]) return false;
  }
  return true;
}

void flushBuf() {
  while (Serial.available()) Serial.read();
}

void loop(void) {
  bool detected = nfc.inListPassiveTarget();

  // NFC 피어가 검색되면
  if (detected) {
    uint8_t select_buf[128] = {0}; // Ensure buffer is initialized to zero
    uint8_t len_select_buf = 128;

    // 1.  ID 카드 애플릿 SELECT, 응답은 select_buf에 저장
    bool selected = nfc.inDataExchange(SELECT, sizeof(SELECT), select_buf, &len_select_buf);

    // SELECT 명령의 응답이 돌아오면
    if (selected) {      
      if (select_buf[0] == 0x90 && select_buf[1] == 0x00) { // 응답이 90 00(OK)인지 확인
        Serial.print("!"); // 연구실 ID 애플릿이 설치되어 있음이 확인됨
        uint8_t resp_buf[128] = {0}; // 수신 버퍼를 0으로 초기화
        uint8_t len_resp_buf = sizeof(resp_buf);

        update_challenge(); // 연구실 ID 카드인 경우 클라이언트 인증 메시지 생성

        #ifdef DEBUG
          Serial.println("\n1. Client auth. command generated (클라이언트 인증 메시지 생성됨): ");
          printHex(CLIENT_AUTH, sizeof(CLIENT_AUTH));
        #endif

        // 2. 카드에 챌린지 전송, 응답은 resp_buf에 저장
        bool cliauth_response = nfc.inDataExchange(CLIENT_AUTH, sizeof(CLIENT_AUTH), resp_buf, &len_resp_buf);

        // 클라이언트 인증 메시지를 보내고 응답을 정상 수신한 경우
        if (cliauth_response) {
          uint8_t decrypted[48]; // resp_buf 복호화 결과가 저장될 배열
          bool is_authed = false;

          #ifdef DEBUG
            Serial.println("\n2. Card responded (피어가 응답함):");
            printHex(resp_buf, len_resp_buf);
          #endif
        
          // ID 카드의 응답을 복호화
          cbcaes128.setIV(iv, 16); // IV 지정
          cbcaes128.decrypt(decrypted, resp_buf, LEN_CLIENT_AUTH_RESPONSE);
          is_authed = strequal(decrypted, CLIENT_AUTH, 0, 5, 16); // challenge와 복호화된 response의 일치 여부

          #ifdef DEBUG
            Serial.println("\n3. Response decrypted (응답 복호화함):");
            printHex(decrypted, LEN_CLIENT_AUTH_RESPONSE);

            Serial.print("\n4. Authenticated: ");
            Serial.println(is_authed ? "True" : "False");
          #endif

          // client authentication이 완료된 경우
          if (is_authed) {
            char new_log[5] = {0,};
            

            Serial.print("AUTHED_");
            printHex(decrypted, 48);
            Serial.readBytes(new_log, 5);
            flushBuf();
            
            Serial.print("데이터 받음: ");
            printHex((uint8_t *)new_log, sizeof(new_log));
          
          } else Serial.println("INCONSIST_CRYPTOGRAM");
        } else {
          Serial.println("CLIENT_AUTH_ERROR");
          delay(5);
          rst();
        }
      } else Serial.println("NOT_OSID");
    } else Serial.println("RF_LOST"); 
  } else Serial.print(".");
}