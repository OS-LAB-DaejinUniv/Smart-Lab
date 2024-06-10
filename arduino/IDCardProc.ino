#include <Wire.h>
#include <SPI.h>
#include <Adafruit_PN532.h>
#include <string.h>
#include <AESLib.h>

#define PN532_IRQ   (9)
#define PN532_RESET (3)

Adafruit_PN532 nfc(PN532_IRQ, PN532_RESET);

uint8_t key[16] = {0x9A, 0x53, 0x7F, 0x1C, 0x7A, 0x46, 0x10, 0x6F, 0xBF, 0x7F, 0xE3, 0xD4, 0x1B, 0xD9, 0xD7, 0x63};
uint8_t iv[16] = {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};

char CMD_SELECT[] = {0x00, 0xA4, 0x04, 0x00, 0x07, 0x55, 0x44, 0x33, 0x22, 0x11, 0xCC, 0xBB};
char CMD_CLIENT_AUTH[21] = {0x54, 0xAA, 0x00, 0x00, 0x10}; // 클라이언트 인증을 위해 16바이트 남김

uint8_t recv_buf[255];
uint8_t len_recv_buf = 0;

void setup() {
  Serial.begin(115200);
  nfc.begin();
  srand(analogRead(1));
}

void update_challenge() {
  uint8_t offset = 5;
  for (uint8_t i = 5; i < sizeof(CMD_CLIENT_AUTH); i++) {
    CMD_CLIENT_AUTH[i] = (char) (rand() % 256);
  }
}

void(* resetFunc) (void) = 0; //declare reset function @ address 0

void printHex(uint8_t num) {
  char hexCar[2];

  sprintf(hexCar, "%02X", num);
  Serial.print(hexCar);
}

void loop(void) {
  memset(recv_buf, 0, sizeof(recv_buf));
  bool bool_is_detected = nfc.inListPassiveTarget();

  // 카드가 인식되면
  if (bool_is_detected) {
    Serial.print("!");

    // ID 카드 애플릿 SELECT
    len_recv_buf = 2;
    bool bool_select_response = nfc.inDataExchange(CMD_SELECT, sizeof(CMD_SELECT), recv_buf, &len_recv_buf);

    // SELECT 명령의 응답이 돌아오면
    if (bool_select_response) {

      // 응답이 90 00(OK)인지 확인
      if (recv_buf[0] == 0x90 && recv_buf[1] == 0x00) {
        // ID 카드 애플릿이 정상적으로 선택되면, 카드에게 보낼 챌린지 생성
        update_challenge();

        // 카드에 챌린지 전송
        len_recv_buf = 48;
        bool bool_cliauth_response = nfc.inDataExchange(CMD_CLIENT_AUTH, sizeof(CMD_CLIENT_AUTH), recv_buf, &len_recv_buf);

        // 클라이언트 인증 명령의 응답이 돌아오면
        if (bool_cliauth_response) {
          Serial.println("\n1. Generated client auth command:");
          for (uint8_t i = 0; i < sizeof(CMD_CLIENT_AUTH); i++) printHex(CMD_CLIENT_AUTH[i]);

          Serial.println("\n2. Response of the card:");
          len_recv_buf = 48;
          for (uint8_t i = 0; i < len_recv_buf; i++) printHex(recv_buf[i]);

          // 카드의 응답을 복호화
          // char plain[48];
          // memset(plain, 0, sizeof(plain));
          // AES128_CBC_encrypt_buffer(key, iv, recv_buf, 48, plain, key, 128, iv);

          // // 출력
          // Serial.println("3. Decrypted response:");
          // for (char i = 0; i < sizeof(plain); i++) {
          //   Serial.print(plain[i] & 0xFF, HEX);
          // }
        
        } else {
          Serial.println("CLIENT_AUTH_ERROR");
          resetFunc();
        }
      } else Serial.println("NOT_OSID");
    } else Serial.println("RF_LOST"); 
  } else Serial.print(".");
}