#include <Wire.h>
#include <SPI.h>
#include <AES.h>
#include <CBC.h>
#include <Adafruit_PN532.h>
#include <CryptoAES_CBC.h>
#include "const.h"

#define PN532_SCK (2)
#define PN532_MOSI (3)
#define PN532_SS (4)
#define PN532_MISO (5)

#define LEN_CLIENT_AUTH_RESPONSE (48)
#define LEN_SERVER_AUTH_PAYLOAD (32)
#define RECOGNIZE_THRESHOLD (1100)

// #define DEBUG

Adafruit_PN532 nfc(PN532_SCK, PN532_MISO, PN532_MOSI, PN532_SS);  // Initialize adafruit PN532.
CBC<AES128> cbcaes128;

extern const uint8_t key[];    // Referenced from const.h
const uint8_t iv[16] = { 0 };  // disable IV by leaving it as zero-fill.
unsigned long before_millis = 0;

const char SELECT_ID[] = { 0x00, 0xA4, 0x04, 0x00, 0x07, 0x55, 0x44, 0x33, 0x22, 0x11, 0xCC, 0xBB };        // select id applet.
const char SELECT_TM[] = { 0x00, 0xA4, 0x04, 0x00, 0x07, 0xD4, 0x10, 0x00, 0x00, 0x03, 0x00, 0x01, 0x00 };  // select t-money applet.
const char GET_BALANCE_TM[] = { 0x90, 0x4C, 0x00, 0x00, 0x04 };                                             // (t-money card) get balance.
const char SW1SW2_OK[2] = { 0x90, 0x00 };
const char GET_CHALLENGE[4] = { 0x54, 0xA1, 0x00, 0x00 };  // (for id applet) get challenge
char CLIENT_AUTH[21] = { 0x54, 0xAA, 0x00, 0x00, 0x10 };   // (for id applet) The client authentication message should be used by appending a 16-byte nonce at the end.
char ADD_LOG[37] = { 0x54, 0xA2, 0xCC, 0x00, 0x20 };       // (for id applet) add a new log to id card. you have to append response

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(1000);
#ifdef DEBUG
  Serial.setTimeout(5000);
#endif
  nfc.begin();
  nfc.SAMConfig();
  randomSeed(analogRead(1));  // Use the input noise from analog pin 1 as a random seed.
  cbcaes128.setIV(iv, 16);    // Set the IV (zero-fill)
  cbcaes128.setKey(key, 16);  // Set the key.
}

void update_challenge() {
  for (uint8_t i = 5; i < sizeof(CLIENT_AUTH); i++) {  // Append 16 random bytes to CLIENT_AUTH (C-APDU).
    uint8_t randomByte = random(256) ^ (analogRead(3) & 0xFF);
    CLIENT_AUTH[i] = (char)randomByte;
  }
}

void (*rst)(void) = 0;  // declare reset function @ address 0 (defined on AVR IVT table)

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

void loop(void) {
  bool detected = nfc.inListPassiveTarget();
  int offset = (millis() - before_millis);
  bool same_card = (offset >= 0) && (offset < RECOGNIZE_THRESHOLD);

  if (detected && same_card) {
    before_millis = millis();
    return;
  }

  if (!detected) {  // when no card detected.
    return;
  }

  if (!processDetectedCard()) {
    delay(2);
    rst();
  }

  before_millis = millis();
}

bool processDetectedCard() {
  uint8_t select_buf_id[2] = { 0 };   // r-apdu buffer for id card.
  uint8_t select_buf_tm[64] = { 0 };  // r-apdu buffer for t-money card.
  uint8_t len_select_buf_id = sizeof(select_buf_id);
  uint8_t len_select_buf_tm = sizeof(select_buf_tm);
  int8_t card_type = -2;

  nfc.inDataExchange(SELECT_ID, sizeof(SELECT_ID), select_buf_id, &len_select_buf_id);  // Trying to select ID applet.
  delay(2);
  nfc.inDataExchange(SELECT_TM, sizeof(SELECT_TM), select_buf_tm, &len_select_buf_tm);  // Trying to select T-money applet.
  delay(2);

  // 1. Determine card type based on the index of the bytes '0x9000': id, t-money, not_supported
  if (strequal(select_buf_id, SW1SW2_OK, 0, 0, 2))
    card_type = 1;  // 1: lab id card
  else if (strequal(select_buf_tm, SW1SW2_OK, 51, 0, 2))
    card_type = 2;  // 2: t-money
  else
    card_type = -1;  // -1: card not supported
  // ---------- 1 ----------

  // 2. Execute proper task according to card_type.
  if (card_type == -1) {
    Serial.println("NOT_SUPPORTED");
    return false;

  } else if (card_type == 2) {
    uint8_t balance[8] = { 0 };  // index 0-3: 32-bit big-endian integer, 4-5: sw1 & sw2 (status code)
    uint8_t len_balance = 4;

    nfc.inDataExchange(GET_BALANCE_TM, sizeof(GET_BALANCE_TM), balance, &len_balance);
    delay(2);

    Serial.print("TM_B_");
    printHex(balance, len_balance);
    return false;  // soft reset

  } else {
    ;
    // Continue to auth process when the ID card scanned.
  }
  // ---------- 2 ----------

  if (!sendClientAuth()) {  // if the card_type is 1. (id card)
    return false;
  }

  return true;
}

bool sendClientAuth() {
  uint8_t resp_buf[128] = { 0 };
  uint8_t len_resp_buf = sizeof(resp_buf);

  update_challenge();

#ifdef DEBUG
  Serial.println("\n1. Client auth. command generated: ");
  printHex((uint8_t *)CLIENT_AUTH, sizeof(CLIENT_AUTH));
#endif

  // 2. Send the challenge to the card; the response is stored in resp_buf.
  bool cliauth_response = nfc.inDataExchange(CLIENT_AUTH, sizeof(CLIENT_AUTH), resp_buf, &len_resp_buf);
  delay(2);

  if (!cliauth_response) {
    Serial.println("CLIENT_AUTH_ERROR");
    delay(5);
    rst();
    return false;
  }

  return processClientAuthResponse(resp_buf, len_resp_buf);
}

bool processClientAuthResponse(uint8_t *resp_buf, uint8_t len_resp_buf) {
  uint8_t decrypted[48] = { 0 };  // decrypted response buffer.
  bool is_authed = false;         // a flag represents the equality of response and challenge.

#ifdef DEBUG
  Serial.println("\n2. Card responded:");
  printHex(resp_buf, len_resp_buf);
#endif

  cbcaes128.setIV(iv, 16);
  cbcaes128.decrypt(decrypted, resp_buf, LEN_CLIENT_AUTH_RESPONSE);

  // Compare the decrypted response with the challenge sent
  is_authed = strequal(decrypted, (uint8_t *)CLIENT_AUTH, 0, 5, 16);

#ifdef DEBUG
  Serial.println("\n3. Response decrypted:");
  printHex(decrypted, LEN_CLIENT_AUTH_RESPONSE);

  Serial.print("\n4. Authenticated: ");
  Serial.println(is_authed ? "True" : "False");
#endif

  if (!is_authed) {
    Serial.println("MISMATCHED_CRYPTOGRAM");
    // printHex(decrypted, 48);
    return false;
  }

  return processAuthenticatedCard(decrypted);
}

bool processAuthenticatedCard(uint8_t *decrypted) {
  uint8_t card_challenge[128] = { 0 };
  uint8_t len_cchg_buf = sizeof(card_challenge);
  uint8_t payload[32] = { 0 };
  uint8_t payload_enc[32] = { 0 };
  char new_log[5] = { 0 };

  Serial.print("AUTHED_");
  printHex(decrypted, 48);

  //  If authentication is successful, receive from the host the log content to be recorded on the card (5 bytes: 4 bytes for timestamp + 1 byte for type).
  Serial.readBytes(new_log, 5);
  bool is_empty = strempty((uint8_t *)new_log, 5);

  if (is_empty) {
    Serial.println("CLIENT_AUTH_ERROR");
    delay(5);
    rst();
    return false;
  }

#ifdef DEBUG
  Serial.println("\n5. new record will be saved on current card :");
  printHex((uint8_t *)new_log, sizeof(new_log));
#endif

  // If data has been received from the host, request the smart card to generate a challenge for server authentication.
  bool svrauth_response = nfc.inDataExchange(GET_CHALLENGE, sizeof(GET_CHALLENGE), card_challenge, &len_cchg_buf);
  delay(2);

  if (!svrauth_response) {
    Serial.println("DIDN_GOT_CHALLENGE");
    delay(8);
    rst();
    return false;
  }

  return processServerAuth(card_challenge, len_cchg_buf, new_log);
}

bool processServerAuth(uint8_t *card_challenge, uint8_t len_cchg_buf, char *new_log) {
  uint8_t addlog_result[8] = { 0 };
  uint8_t len_addlog_result = sizeof(addlog_result);
  uint8_t payload[32] = { 0 };
  uint8_t payload_enc[32] = { 0 };

#ifdef DEBUG
  Serial.println("\n6. Received challenge from card: ");
  printHex(card_challenge, len_cchg_buf);
#endif

  // 원본 payload 생성
  memcpy(payload, card_challenge, 16);
  memcpy(payload + 16, new_log, 5);

#ifdef DEBUG
  Serial.println("\n7. payload :");
  printHex(payload, 32);
#endif

  // Encrypt the issued challenge and new_log.
  cbcaes128.setIV(iv, 16);
  cbcaes128.encrypt(payload_enc, payload, LEN_SERVER_AUTH_PAYLOAD);

#ifdef DEBUG
  Serial.println("\n8. payload_enc :");
  printHex(payload_enc, 32);
#endif

  // Append the encrypted payload to the ADD_LOG APDU command.
  memcpy(ADD_LOG + 5, payload_enc, sizeof(payload_enc));

#ifdef DEBUG
  Serial.println("\n9. final cmd :");
  printHex((uint8_t *)ADD_LOG, sizeof(ADD_LOG));
#endif

  // Send ADD_LOG command to the card.
  bool res_svr_auth = nfc.inDataExchange(ADD_LOG, sizeof(ADD_LOG), addlog_result, &len_cchg_buf);
  delay(2);

  Serial.println(res_svr_auth ? "OK" : "SVRAUTH_ERROR");

  delay(8);
  rst();

  return true;
}