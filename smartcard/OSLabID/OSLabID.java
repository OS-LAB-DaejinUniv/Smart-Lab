package OSLabID;

import javacard.framework.*;
import javacardx.crypto.Cipher;
import javacard.security.AESKey;
import javacard.security.KeyBuilder;
import javacard.security.RandomData;

import static javacard.security.KeyBuilder.TYPE_AES_TRANSIENT_DESELECT;

public class OSLabID extends Applet {
    // 상수
    private static final byte CLA_OSLABID = (byte) 0x54; // 공통 CLA 바이트
    private static final byte INS_REQ_NONCE_FROM_WALLPAD = (byte) 0x01; // 월패드 -> 카드 인증 시도
    private static final byte INS_REQ_NONCE_FROM_CARD = (byte) 0x02; // 카드 -> 월패드 인증 시드
    private static final byte INS_WRITE_LOG = (byte) 0x03; // 카드에 로그 기록

    // 변수
    private static byte secret[] = new byte[16]; // AES-128 키 원본
    private static byte name[] = new byte[8];     // 이름 문자열
    private static byte stdNo[] = new byte[8];    // 학번 문자열
    private static byte uuid[] = new byte[16];    // 카드 고유번호
    private static byte extra[] = new byte[8];    // 추가 설정정보(도어락 자동 개폐, 조명 등)
//    private static short authLogs[][] = new short[5][1024]; // 카드 사용내역(시간 4바이트, 타입 1바이트)

    // 객체 변수
    private static AESKey aesKey; // AES-128 키 객체
    private static RandomData rand; // 난수 생성 객체

    private OSLabID(byte[] bArray, short bOffset, byte bLength) {
        // 설치 파라미터 처리
        Util.arrayCopy(bArray, bOffset, this.secret, (short) 0, (short) bLength);

        // 객체변수 초기화
        aesKey = (AESKey) KeyBuilder.buildKey(TYPE_AES_TRANSIENT_DESELECT, KeyBuilder.LENGTH_AES_128, false);
        aesKey.setKey(this.secret, (short) 16);
        rand = RandomData.getInstance(RandomData.ALG_SECURE_RANDOM); // RandomData 인스턴스 생성
    }

    public static void install(byte[] bArray, short bOffset, byte bLength) {
        byte aidLen = bArray[bOffset];
        bOffset = (short) (bOffset + aidLen + 1); // info Length-Value 쌍의 length 바이트로 이동
        byte infoLen = bArray[bOffset]; // info Length-Value 쌍의 length
        bOffset = (short) (bOffset + infoLen + 1); // 애플릿 데이터의 length 바이트로 이동
        byte dataLen = bArray[bOffset]; // 애플릿 데이터의 길이

        OSLabID applet = new OSLabID(bArray, (short) (bOffset + 1), dataLen);
        applet.register();
    }

    private void encrypt(APDU apdu, byte[] data, byte[] nonce) {
        byte buffer[] = apdu.getBuffer();
        byte result[] = JCSystem.makeTransientByteArray((short) 32, JCSystem.CLEAR_ON_DESELECT); // 임시 버퍼 생성, 32바이트, 선택 해제시 초기화
        Cipher cipher = Cipher.getInstance(Cipher.ALG_AES_BLOCK_128_CBC_NOPAD, false); // Cipher 인스턴스 생성
        cipher.init(aesKey, Cipher.MODE_ENCRYPT); // 암호화 모드로 설정
        cipher.doFinal(data, (short) 0, (short) data.length, result, (short) 0); // 암호화 수행


        Util.arrayCopy(result, (short) 0, buffer, (short) 0, (short) result.length); // 결과 복사
        apdu.setOutgoingAndSend((short) 0, (short) result.length);
    }

    private void getRandom(APDU apdu, short rand_len) {
        byte buffer[] = apdu.getBuffer();
        rand.nextBytes(buffer, (short) 0, rand_len); // 난수 생성

        apdu.setOutgoingAndSend((short) 0, rand_len); // 처리 결과 지정 후 전송
    }

    public void process(APDU apdu) throws ISOException {
        try {
            byte[] buffer = apdu.getBuffer();

            if (selectingApplet()) return; // 애플릿 선택시 OS에 응답

            if (buffer[ISO7816.OFFSET_CLA] != CLA_OSLABID) { // CLA 바이트 확인
                ISOException.throwIt(ISO7816.SW_CLA_NOT_SUPPORTED); // 지원하지 않는 명령
            }

            switch (buffer[ISO7816.OFFSET_INS]) { // INS 바이트로 분기
                case (byte) 0x0A:
                    Util.arrayCopy(this.secret, (short) 0, buffer, (short) 0, (short) this.secret.length);
                    apdu.setOutgoingAndSend((short) 0, (short) this.secret.length); // 처리 결과 지정 후 전송
                    break;

                case (byte) 0x0B:
                    encrypt(apdu, this.stdNo, this.uuid); // 암호화 수행
                    break;

                case (byte) 0x0C:
                    getRandom(apdu, (short) buffer[ISO7816.OFFSET_P1]); // 난수 생성
                    break;

                default:
                    ISOException.throwIt(ISO7816.SW_CLA_NOT_SUPPORTED); // 지원하지 않는 명령
            }

        } catch (Exception e) {
            JCSystem.requestObjectDeletion();
            ISOException.throwIt(ISO7816.SW_UNKNOWN);
        }

    }
}