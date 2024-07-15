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
#define LEN_SERVER_AUTH_PAYLOAD  (32)
#define RECOGNIZE_THRESHOLD      (1100)

// #define DEBUG

Adafruit_PN532 nfc(PN532_SCK, PN532_MISO, PN532_MOSI, PN532_SS); // pn532 드라이버 초기화
CBC<AES128> cbcaes128;

extern uint8_t key[]; // secret.ino에서 참조하도록 지정
extern volatile unsigned long timer0_millis;
int beforeMillis = 0;
uint8_t iv[16] = {0,};

char SELECT[] = {0x00, 0xA4, 0x04, 0x00, 0x07, 0x55, 0x44, 0x33, 0x22, 0x11, 0xCC, 0xBB};
char CLIENT_AUTH[21] = {0x54, 0xAA, 0x00, 0x00, 0x10}; // 클라이언트 인증 메시지, 16바이트 nonce를 뒤에 붙여 사용하여야 함
char SERVER_AUTH[4] = {0x54, 0xA1, 0x00, 0x00}; // 서버 인증을 위해 카드에서 챌린지를 생성하도록 함
char ADD_LOG[37] = {0x54, 0xA2, 0xCC, 0x00, 0x20}; // 서버 인증 response 검증과 동시에 명령 실행(카드 내 로그 기록)을 요청함
char SW1SW2_OK[2] = {0x90, 0x00};

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
    CLIENT_AUTH[i] = (char) (random(256)) * analogRead(3); // 8비트 난수 생성하여 저장
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

bool strempty(uint8_t *str, uint8_t len) {
  for (uint8_t i = 0; i < len; i++) {
    if (str[i] != 0) return false;
  }
  return true;
}

void flushBuf() {
  for (uint8_t i = 0; i < 64; i++) {
    Serial.read();
  }
}

void loop(void) {
  bool detected = nfc.inListPassiveTarget();
  int offset = (millis() - beforeMillis);
  bool sameCard = (offset >= 0) && (offset < RECOGNIZE_THRESHOLD);

  // NFC 피어가 검색되면
  if (detected && !sameCard) {
    uint8_t select_buf[128] = {0}; // Ensure buffer is initialized to zero
    uint8_t len_select_buf = 128;

    // 1. ID 카드 애플릿 SELECT, 응답은 select_buf에 저장
    bool selected = nfc.inDataExchange(SELECT, sizeof(SELECT), select_buf, &len_select_buf);

    // SELECT 명령의 응답이 돌아오면
    if (selected) { // 연구실 ID 애플릿이 설치되어 있음이 확인됨
      if (select_buf[0] == 0x90 && select_buf[1] == 0x00) { // 응답이 90 00(OK)인지 확인
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
            uint8_t card_challenge[128] = {0,}; // 수신 버퍼를 0으로 초기화
            uint8_t len_cchg_buf = sizeof(resp_buf);
            uint8_t payload[32] = {0,}; // 암호화 될 카드의 challenge + 5바이트 로그의 원본
            uint8_t payload_enc[32] = {0,}; // payload의 암호문
            char new_log[5] = {0,};
            
            Serial.print("AUTHED_");
            printHex(decrypted, 48);

            // 인증이 성공하면 카드에 기록할 로그의 내용(5바이트, 시간4 + 타입1)을 호스트로부터 수신받음.
            Serial.readBytes(new_log, 5);
            bool is_empty = strempty(new_log, 5);
            if (is_empty) goto cliauth_error;

            #ifdef DEBUG
              Serial.println("\n5. new record will be saved on current card :");
              printHex((uint8_t *)new_log, sizeof(new_log));
            #endif

            // 호스트로부터 데이터를 전달받았으면 스마트카드에 서버 인증을 위한 챌린지 생성 요청
            bool svrauth_response = nfc.inDataExchange(SERVER_AUTH, sizeof(SERVER_AUTH), card_challenge, &len_cchg_buf);

            // 카드가 응답하면..
            if (svrauth_response) {
              uint8_t addlog_result[8] = {0,};
              uint8_t len_addlog_result = sizeof(addlog_result);

              #ifdef DEBUG
                Serial.println("\n6. 스마트카드가 로그 기록을 위한 challenge를 생성했습니다 :");
                printHex(card_challenge, len_cchg_buf);
              #endif

              // 원본 payload 생성
              strncpy(payload, card_challenge, 16);
              strncpy(payload + 16, new_log, 5);
              
              #ifdef DEBUG
                Serial.println("\n7. payload :");
                printHex(payload, 32);
              #endif
              
              // 발급된 challenge와 new_log를 암호화
              cbcaes128.setIV(iv, 16); // IV 지정
              cbcaes128.encrypt(payload_enc, payload, LEN_SERVER_AUTH_PAYLOAD);

              #ifdef DEBUG
                Serial.println("\n8. payload_enc :");
                printHex(payload_enc, 32);
              #endif

              // 암호화된 서버 인증 및 로그 저장 명령 생성
              strncpy(ADD_LOG + 5, payload_enc, sizeof(payload_enc));

              #ifdef DEBUG
                Serial.println("\n9. final cmd :");
                printHex(ADD_LOG, sizeof(ADD_LOG));
              #endif

              // 로그 저장 명령 전송
              bool res_svr_auth = nfc.inDataExchange(ADD_LOG, sizeof(ADD_LOG), addlog_result, &len_cchg_buf);
              
              res_svr_auth ? Serial.println("OK") : Serial.println("SVRAUTH_ERROR");
            } else Serial.println("DIDN_GOT_CHALLENGE");

            delay(8);
            rst();
          
          } else Serial.println("MISMATCHED_CRYPTOGRAM");
        } else {
          cliauth_error:
          Serial.println("CLIENT_AUTH_ERROR");
          delay(5);
          rst();
        }
      } else Serial.println("NOT_OSID");
    } else Serial.println("RF_LOST");
    beforeMillis = millis();

  } else if(detected && sameCard) {
    beforeMillis = millis();

  } else {
    // Serial.print(".");
    // timer0_millis = 0;
  }
}