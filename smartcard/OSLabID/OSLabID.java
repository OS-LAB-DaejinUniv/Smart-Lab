package OSLabID;

import javacard.framework.*;
import javacard.security.CryptoException;
import javacardx.crypto.Cipher;
import javacard.security.AESKey;
import javacard.security.KeyBuilder;
import javacard.security.RandomData;

/**
 ┌────────────────────────────────────────┐
 │                                        │
 │  ┌===┐                                 │
 │  │─┼─│   OS Lab. Smart ID Card Applet  │
 │  └===┘                                 │
 │                                        │
 │       OS Lab., Daejin University.      │
 │                          June 4, 2024  │
 └────────────────────────────────────────┘
 */

public class OSLabID extends Applet {
    /* 명령 정의 */
    private static final byte CLA_OSLABID           = (byte) 0x54; // 공통 CLA 바이트
    private static final byte INS_AUTH_FROM_WALLPAD = (byte) 0xAA; // 월패드 -> 카드 인증 시도(Client Authentication)
    private static final byte INS_GET_CHG_OF_CARD   = (byte) 0xA1; // 카드 -> 월패드 인증 시드(Server Authentication)
    private static final byte INS_APPEND_LOG        = (byte) 0xCC; // 카드에 로그 기록
    private static final byte INS_READ_LOG          = (byte) 0xC1; // 로그 읽기
    private static final byte INS_GET_CARD_INFO     = (byte) 0xDD; // 카드 정보 요청
    private static final byte INS_GET_EXTRA_INFO    = (byte) 0xEE; // 부가정보 요청
    private static final byte INS_UPDATE_EXTRA_INFO = (byte) 0xE1; // 부가정보 쓰기

    /* 변수 */
    private static byte[] secret = new byte[16]; // AES-128 키 원본
    private static byte[] name   = new byte[16]; // 이름 문자열(UTF-8)
    private static byte[] stdNo  = new byte[16]; // 학번 문자열(UTF-8)
    private static byte[] uuid   = new byte[16]; // 카드 고유번호, 카드에서 자체 생성됨

    private static byte[]  extra = new byte[16];      // 부가정보(도어락 자동 개폐, 조명 등)
    private static short[] logs  = new short[5 * 500]; // 카드 사용내역(Unix time 4바이트, 타입 1바이트 * 최대 1024건)
    private static byte[]  tmp; // 임시 버퍼

    /* 상수 */
    private static final short LEN_INSTALL_PARAM = (byte) 48; // 설치 파라미터의 길이
    private static final short CHALLENGE_LEN = (byte) 16; // 카드 및 서버의 challenge 길이

    /* 객체 변수 */
    private AESKey     aesKey;  // AES-128 키 객체
    private RandomData rand;    // 난수 생성 객체
    private Cipher     encrypt; // chiper 객체, 암호화 모드
    private Cipher     decrypt; // chiper 객체, 복호화 모드

    private OSLabID(byte[] bArray, short bOffset, byte bLength) {
        // 설치 파라미터 처리
        Util.arrayCopy(bArray, bOffset, secret, (short) 0, (short) secret.length); // 비밀키 복사(16바이트)
        bOffset += secret.length; // 이름 바이트 시작 위치로 이동
        Util.arrayCopy(bArray, bOffset, name, (short) 0, (short) name.length); // 이름 복사(8바이트)
        bOffset += name.length; // 학번 바이트 시작 위치로 이동
        Util.arrayCopy(bArray, bOffset, stdNo, (short) 0, (short) stdNo.length); // 학번 복사(8바이트)

        // 객체변수 초기화
        aesKey = (AESKey) KeyBuilder.buildKey(KeyBuilder.TYPE_AES, KeyBuilder.LENGTH_AES_128, false);
        aesKey.setKey(secret, (short) 0);
        encrypt = Cipher.getInstance(Cipher.ALG_AES_BLOCK_128_CBC_NOPAD, false); // 암호화 인스턴스 생성
        decrypt = Cipher.getInstance(Cipher.ALG_AES_BLOCK_128_CBC_NOPAD, false); // 복호화 인스턴스 생성
        rand = RandomData.getInstance(RandomData.ALG_SECURE_RANDOM); // RandomData 인스턴스 생성

        // 기타
        rand.nextBytes(uuid, (short) 0, (short) 16); // 카드 식별번호 생성(16바이트)

        // 변수 초기화
        tmp = JCSystem.makeTransientByteArray((short) 64, JCSystem.CLEAR_ON_DESELECT);
    }

    public static void install(byte[] bArray, short bOffset, byte bLength) throws ISOException {
        if (bLength < LEN_INSTALL_PARAM) {
            // 설치 파라미터의 길이는 비밀키(16) + 이름(16) + 학번(16) = 48
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

    private void authReqFromWallpad(APDU apdu) throws ISOException {
        byte[] buf = apdu.getBuffer();
        byte resPos = (byte) 0;

        if (buf[ISO7816.OFFSET_LC] != CHALLENGE_LEN) {
            ISOException.throwIt(ISO7816.SW_WRONG_LENGTH);
        }

        encrypt.init(aesKey, Cipher.MODE_ENCRYPT); // 암호화 모드, IV는 0으로 자동 설정됨
        encrypt.update(buf, ISO7816.OFFSET_CDATA, (short) 16, buf, resPos); // 월패드의 nonce에 대한 response
        resPos += 16;
        encrypt.update(this.uuid, (short) 0, (short) 16, buf, resPos); // uuid 암호화
        resPos += 16;
        encrypt.doFinal(this.extra, (short) 0, (short) 16, buf, resPos); // 부가정보 암호화

        apdu.setOutgoingAndSend((short) 0, (short) 48); // 응답
    }

    private void generateChallenge(APDU apdu) throws ISOException {
        byte[] buf = apdu.getBuffer();

        rand.generateData(tmp, (short) 0, CHALLENGE_LEN); // 카드에서 챌린지 생성하여 tmp에 보관
        Util.arrayCopy(tmp, (short) 0, buf, (short) 0, CHALLENGE_LEN); // tmp를 apdu 버퍼에 복사

        apdu.setOutgoingAndSend((short) 0, (short) 16); // 응답
    }

    private void getCardInfo(APDU apdu) {
        byte[] buffer = apdu.getBuffer();
        short totalLen = (byte) (uuid.length + name.length + stdNo.length);

        Util.arrayCopy(uuid, (short) 0, buffer, (short) 0, (short) uuid.length);
        Util.arrayCopy(name, (short) 0, buffer, (short) uuid.length, (short) name.length);
        Util.arrayCopy(stdNo, (short) 0, buffer, (short) (name.length + stdNo.length), (short) uuid.length);

        apdu.setOutgoingAndSend((short) 0, totalLen);
    }

    public void process(APDU apdu) throws ISOException {
        try {
            byte[] buffer = apdu.getBuffer();

            if (selectingApplet()) return; // 애플릿 선택시 OS에 응답

            if (buffer[ISO7816.OFFSET_CLA] != CLA_OSLABID) { // CLA 바이트 확인
                ISOException.throwIt(ISO7816.SW_CLA_NOT_SUPPORTED); // unsupported CLA
            }

            // 명령 처리
            switch (buffer[ISO7816.OFFSET_INS]) { // INS 바이트로 분기
                case INS_GET_CARD_INFO:
                    getCardInfo(apdu); // 카드정보 읽기
                    break;

                case INS_AUTH_FROM_WALLPAD:
                    authReqFromWallpad(apdu); // 월패드에서 카드 인증
                    break;

                case INS_GET_CHG_OF_CARD:
                    generateChallenge(apdu); // 카드에서 월패드 인증
                    break;

                default:
                    ISOException.throwIt(ISO7816.SW_INS_NOT_SUPPORTED); // 미지원 INS
            }

        } catch (CryptoException ce) {
            ISOException.throwIt(ce.getReason());

        } catch (Exception e) {
            ISOException.throwIt(ISO7816.SW_UNKNOWN);

        } finally {
            JCSystem.requestObjectDeletion();
        }
    }
}