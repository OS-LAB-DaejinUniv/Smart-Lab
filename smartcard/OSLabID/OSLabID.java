package OSLabID;

import javacard.framework.*;
import javacardx.apdu.ExtendedLength;
import javacard.security.CryptoException;
import javacardx.crypto.Cipher;
import javacard.security.AESKey;
import javacard.security.KeyBuilder;
import javacard.security.RandomData;

/**
 * ┌────────────────────────────────────────┐
 * │                                        │
 * │  ┌───┐                                 │
 * │  ├─┼─┤   OS Lab. Smart ID Card Applet  │
 * │  └───┘                                 │
 * │                                        │
 * │       OS Lab., Daejin University.      │
 * │                          June 4, 2024  │
 * └────────────────────────────────────────┘
 */

public class OSLabID extends Applet implements ExtendedLength {
    /* 명령 정의 */
    private static final byte CLA_OSLABID = (byte) 0x54; // 공통 CLA 바이트

    private static final byte INS_AUTH_FROM_SERVER = (byte) 0xAA; // 서버 -> 카드 인증 시도(Client Authentication)
    private static final byte INS_GET_CHG_OF_CARD = (byte) 0xA1; // 카드 -> 서버 챌린지 생성 및 전송
    private static final byte INS_AUTH_SERVER = (byte) 0xA2; // 카드 -> 서버 인증(Server Authentication)

    private static final byte INS_GET_LOG = (byte) 0xC1; // 사용내역 읽기
    private static final byte INS_GET_CARD_INFO = (byte) 0xDD; // 카드 정보 요청
    private static final byte INS_UPDATE_EXTRA = (byte) 0xEE; // 부가정보 갱신

    private static final byte P1_ADD_LOG = (byte) 0xCC; // 카드에 사용내역 기록

    /* 변수 */
    private static byte[] secret = new byte[16]; // AES-128 키 원본
    private static byte[] name = new byte[16]; // 이름 문자열(UTF-8)
    private static byte[] stdNo = new byte[16]; // 학번 문자열(UTF-8)
    private static byte[] uuid = new byte[16]; // 카드 고유번호, 카드에서 자체 생성됨

    private static byte[] extra = new byte[16]; // 부가정보(도어락 자동 개폐, 조명 등)
    private static byte[] logs = new byte[(5 * 40) + 1]; // 카드 사용내역(Unix time 4바이트, 타입 1바이트, 최대 40건)
    private static short nextLogPos = 1; // 서용내역이 기록될 logs 배열의 인덱스, 별도 인덱스 계산 없이 바로 사용
    private static byte[] generatedChallenge; // 서버 인증을 위해 생성된 챌린지를 임시 저장
    private static byte[] decryptedResponse; // 복호화한 서버의 리스폰스를 임시 저장
    private static byte[] isChallengeGenerated;

    /* 상수 */
    private static final short LEN_INSTALL_PARAM = 48; // 설치 파라미터의 길이
    private static final short CHALLENGE_LEN = 0x10; // 카드 및 서버의 challenge 길이
    private static final short CHALLENGE_ONLINE_LEN = 0x20; // 웹 2FA 인증시 challenge 길이
    private static final short LOG_SIZE = 5;

    /* 객체 변수 */
    private AESKey aesKey;  // AES-128 키 객체
    private RandomData rand;    // 난수 생성 객체
    private Cipher encrypt; // chiper 객체, 암호화 모드
    private Cipher decrypt; // chiper 객체, 복호화 모드

    private OSLabID(byte[] bArray, short bOffset, byte bLength) {
        // 애플릿 설치 파라미터를 전달받아 인스턴스 멤버 변수를 초기화.
        Util.arrayCopy(bArray, bOffset, secret, (short) 0, (short) secret.length); // 비밀키 복사(16바이트)
        bOffset += secret.length; // 이름 바이트 시작 위치로 이동
        Util.arrayCopy(bArray, bOffset, name, (short) 0, (short) name.length); // 이름 복사(16바이트)
        bOffset += name.length; // 학번 바이트 시작 위치로 이동
        Util.arrayCopy(bArray, bOffset, stdNo, (short) 0, (short) stdNo.length); // 학번 복사(16바이트)

        // 객체변수 초기화
        aesKey = (AESKey) KeyBuilder.buildKey(KeyBuilder.TYPE_AES, KeyBuilder.LENGTH_AES_128, false);
        aesKey.setKey(secret, (short) 0);
        encrypt = Cipher.getInstance(Cipher.ALG_AES_BLOCK_128_CBC_NOPAD, false); // 암호화 인스턴스 생성
        decrypt = Cipher.getInstance(Cipher.ALG_AES_BLOCK_128_CBC_NOPAD, false); // 복호화 인스턴스 생성
        rand = RandomData.getInstance(RandomData.ALG_SECURE_RANDOM); // RandomData 인스턴스 생성

        // 카드 식별번호 생성(16바이트)
        rand.nextBytes(uuid, (short) 0, (short) 16);

        /**
         * 전원이 꺼져도 저장할 필요가 없는 변수는 transient로 선언
         * generatedChallenge: 서버에게 보낼 challenge를 보관할 배열
         * decryptedResponse: 서버의 response 뒤에 덧붙여진 암호화된 제어 명령어(사용내역 추가 등)가 복호화되어 할당될 배열
         */
        generatedChallenge = JCSystem.makeTransientByteArray((short) 16, JCSystem.CLEAR_ON_DESELECT);
        decryptedResponse = JCSystem.makeTransientByteArray((short) 32, JCSystem.CLEAR_ON_DESELECT);
        isChallengeGenerated = JCSystem.makeTransientByteArray((short) 1, JCSystem.CLEAR_ON_DESELECT);
    }

    public static void install(byte[] bArray, short bOffset, byte bLength) throws ISOException {
        if (bLength < LEN_INSTALL_PARAM) {
            // 설치 파라미터의 길이는 비밀키(16) + 이름(16) + 학번(16) = 48 바이트.
            ISOException.throwIt(ISO7816.SW_WRONG_DATA);
        }

        byte aidLen = bArray[bOffset];
        bOffset = (short) (bOffset + aidLen + 1); // info Length-Value 쌍의 length 바이트로 이동
        byte infoLen = bArray[bOffset]; // info Length-Value 쌍의 length
        bOffset = (short) (bOffset + infoLen + 1); // 애플릿 데이터의 length 바이트로 이동
        byte dataLen = bArray[bOffset]; // 애플릿 데이터의 길이

        OSLabID applet = new OSLabID(bArray, (short) (bOffset + 1), dataLen);
        applet.register();
    }

    private void authReqFromServer(APDU apdu) throws ISOException {
        byte[] buf = apdu.getBuffer();
        byte pos = (byte) 0;

        // 16바이트(일반 인증) 또는 32바이트(온라인 인증) 모두 아닌 경우 예외 발생
        if ((buf[ISO7816.OFFSET_LC] != CHALLENGE_LEN) &&
                (buf[ISO7816.OFFSET_LC] != CHALLENGE_ONLINE_LEN)) {
            ISOException.throwIt(ISO7816.SW_WRONG_LENGTH);
        }

        // 온라인 인증 시도인 경우 사용내역 기록
        if (buf[ISO7816.OFFSET_LC] == CHALLENGE_ONLINE_LEN) {
            Util.arrayCopy(buf, (short) (buf[ISO7816.OFFSET_LC] + CHALLENGE_LEN), decryptedResponse, CHALLENGE_LEN, LOG_SIZE);
            addCardLog();
        }

        // 응답 메시지 생성
        encrypt.init(aesKey, Cipher.MODE_ENCRYPT); // 암호화 모드

        encrypt.update(buf, ISO7816.OFFSET_CDATA, (short) 16, buf, pos); // 서버의 nonce에 대한 response
        pos += 16;

        encrypt.update(this.uuid, (short) 0, (short) 16, buf, pos); // uuid 암호화
        pos += 16;

        encrypt.update(this.extra, (short) 0, (short) 16, buf, pos); // 부가정보 암호화
        pos += 16;

        encrypt.doFinal(this.name, (short) 0, (short) 16, buf, pos); // 이름 문자열 암호화
        pos += 16;

        // 응답 메시지 전송
        apdu.setOutgoingAndSend((short) 0, pos);
    }

    private void issueChallenge(APDU apdu) throws ISOException {
        byte[] buf = apdu.getBuffer();

        rand.nextBytes(generatedChallenge, (short) 0, CHALLENGE_LEN); // 카드에서 챌린지 생성
        Util.arrayCopy(generatedChallenge, (short) 0, buf, (short) 0, (short) CHALLENGE_LEN); // 챌린지를 apdu 버퍼에 복사

        isChallengeGenerated[0] = (byte) 0x01;

        apdu.setOutgoingAndSend((short) 0, (short) 16); // 전송
    }

    private void authAndProcess(APDU apdu) throws ISOException {
        byte[] buf = apdu.getBuffer();
        short decryptTotal = 32;

        // 챌린지가 생성된 상태가 아닌 경우 오류 발생
        if (isChallengeGenerated[0] != (byte) 0x01) {
            ISOException.throwIt(ISO7816.SW_SECURITY_STATUS_NOT_SATISFIED);
        }

        // 데이터의 길이가 32(response + 명령데이터)가 아닌 경우 오류 발생
        if (buf[ISO7816.OFFSET_LC] != (byte) decryptTotal) {
            ISOException.throwIt(ISO7816.SW_WRONG_LENGTH);
        }

        // response 검증 시작
        decrypt.init(aesKey, Cipher.MODE_DECRYPT); // 복호화 모드

        // 서버의 response를 복호화하여 decryptedResponse에 저장
        decrypt.doFinal(buf, ISO7816.OFFSET_CDATA, decryptTotal, decryptedResponse, (short) 0);

        // challenge와 복호화된 response 비교, 인덱스 0~15
        for (byte i = 0; i < 16; i++) {
            if (decryptedResponse[i] != generatedChallenge[i]) {
                ISOException.throwIt(ISO7816.SW_SECURITY_STATUS_NOT_SATISFIED);
            }
        }

        // 명령 처리 시작
        switch (buf[ISO7816.OFFSET_P1]) { // 리스폰스 검증 완료된 경우 P1으로 분기
            case P1_ADD_LOG:
                addCardLog(); // 서버로부터 전달받은 사용내역 추가
                break;
        }

        // 명령 처리 완료 후 생성된 챌린지 폐기
        isChallengeGenerated[0] = (byte) 0x00;
    }

    private void getCardInfo(APDU apdu) {
        byte[] buffer = apdu.getBuffer();
        short pos = (byte) 0;
        short totalLen = (byte) (uuid.length + name.length + stdNo.length + extra.length);

        Util.arrayCopy(uuid, (short) 0, buffer, pos, (short) uuid.length); // 카드 UUID
        pos += (short) uuid.length;

        Util.arrayCopy(name, (short) 0, buffer, pos, (short) name.length); // 이름 문자열
        pos += (short) name.length;

        Util.arrayCopy(stdNo, (short) 0, buffer, pos, (short) uuid.length); // 학번 문자열
        pos += (short) uuid.length;

        Util.arrayCopy(extra, (short) 0, buffer, pos, (short) uuid.length); // 부가정보

        apdu.setOutgoingAndSend((short) 0, totalLen);
    }

    private void getCardLog(APDU apdu) {
        byte[] buf = apdu.getBuffer();

        Util.arrayCopy(logs, (short) 1, buf, (short) 0, (short) (logs.length - 1));
        apdu.setOutgoingAndSend((short) 0, (short) (logs.length - 1));
    }

    private void addCardLog() {
        // 사용내역 추가
        Util.arrayCopy(decryptedResponse, CHALLENGE_LEN, logs, nextLogPos, LOG_SIZE);

        // 사용내역 배열이 꽉 찬 경우 다음번부터 맨 앞부터 덮어쓰기
        if (nextLogPos == ((short) ((short) logs.length - LOG_SIZE))) {
            nextLogPos = (short) 1;

        } else {
            // 그렇지 않으면 단건 로그의 크기만큼 인덱스 증가
            nextLogPos += LOG_SIZE;
        }
    }

    private void updateExtras(APDU apdu) throws ISOException {
        byte[] buf = apdu.getBuffer();

        if (buf[ISO7816.OFFSET_LC] != (byte) 16) {
            ISOException.throwIt(ISO7816.SW_WRONG_LENGTH);
        }

        Util.arrayCopy(buf, ISO7816.OFFSET_CDATA, extra, (short) 0, (short) 16);
    }

    public void process(APDU apdu) throws ISOException {
        try {
            byte[] buffer = apdu.getBuffer();

            if (selectingApplet()) return; // 애플릿 선택시 OS에 응답

            if (buffer[ISO7816.OFFSET_CLA] != CLA_OSLABID) { // CLA 바이트 확인
                ISOException.throwIt(ISO7816.SW_CLA_NOT_SUPPORTED); // 미지원 CLA 오류
            }

            // 명령 처리
            switch (buffer[ISO7816.OFFSET_INS]) { // INS 바이트로 분기
                case INS_GET_CARD_INFO:
                    getCardInfo(apdu); // 카드정보 읽기(UUID, 이름, 학번, 부가정보)
                    break;

                case INS_AUTH_FROM_SERVER:
                    authReqFromServer(apdu); // Client Authentication
                    break;

                case INS_GET_CHG_OF_CARD:
                    issueChallenge(apdu); // Server Authentication을 위한 챌린지 생성
                    break;

                case INS_AUTH_SERVER:
                    authAndProcess(apdu); // Server Response 검증 + 포함된 명령 실행(사용내역 기록 등)
                    break;

                case INS_GET_LOG:
                    getCardLog(apdu); // 카드 사용내역 읽기
                    break;

                case INS_UPDATE_EXTRA: // 부가정보 갱신
                    updateExtras(apdu);
                    break;

                default:
                    ISOException.throwIt(ISO7816.SW_INS_NOT_SUPPORTED); // 미지원 INS 오류
            }

        } catch (CryptoException ce) {
            ISOException.throwIt(ce.getReason());

        } catch (ISOException ie) {
            ISOException.throwIt(ie.getReason());

        } catch (Exception e) {
            ISOException.throwIt(ISO7816.SW_UNKNOWN);

        } finally {
            JCSystem.requestObjectDeletion();
        }
    }
}