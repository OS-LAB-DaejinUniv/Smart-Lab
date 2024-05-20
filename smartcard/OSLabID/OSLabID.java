// OS랩 ID 카드 애플릿
package OSLabID;

import javacard.framework.*;
import javacardx.crypto.Cipher;

public class OSLabID extends Applet {
    private static byte secret[] = new byte[16]; // AES-128키
    private static byte name[] = new byte[8]; // 이름(utf-8, 최대 4자)
    private static byte stdNo[] = new byte[8]; // 학번(utf-8)
    private static byte uuid[] = new byte[16]; // UUID

    public OSLabID(byte[] bArray, short bOffset, byte bLength) {
        byte iLen = bArray[bOffset]; // aid length
        bOffset = (short) (bOffset + iLen + 1);

        byte cLen = bArray[bOffset]; // info length
        bOffset = (short) (bOffset + cLen + 1);

        byte aLen = bArray[bOffset]; // applet data length

        Util.arrayCopy(tmp, (short) 0, this.stdNo, (short) 0, (short) 1); // 학번

        register(); // OS에 생성된 인스턴스 등록
    }

    public static void install(byte[] bArray, short bOffset, byte bLength) {
        new OSLabID(bArray, bOffset, bLength); // 애플릿 생성
    }

    private void encrypt(APDU apdu, byte[] data, byte[] nonce) {
        byte buffer[] = apdu.getBuffer(); // 버퍼 객체 얻기
        byte result[] = JCSystem.makeTransientByteArray((short) 32, JCSystem.CLEAR_ON_DESELECT); // 임시 버퍼 생성, 32바이트, 선택 해제시 초기화
        Cipher c = Cipher.getInstance(Cipher.ALG_AES_BLOCK_128_CBC_NOPAD, false); // Cipher 인스턴스 생성
        c.init(this.secret, Cipher.MODE_ENCRYPT); // 암호화 모드로 설정
        c.doFinal(data, (short) 0, (short) data.length, result, (short) 0); // 암호화 수행

        Util.arrayCopy(result, (short) 0, buffer, (short) 0, (short) result.length); // 결과 복사
    }

    private void getRandom(APDU apdu) {
        byte buffer[] = apdu.getBuffer(); // 버퍼 객체 얻기
        byte result[] = JCSystem.makeTransientByteArray((short) 16, JCSystem.CLEAR_ON_DESELECT); // 임시 버퍼 생성, 16바이트, 선택 해제시 초기화
        RandomData r = RandomData.getInstance(RandomData.ALG_TRNG); // RandomData 인스턴스 생성
        r.generateData(result, (short) 0, (short) result.length); // 난수 생성

        Util.arrayCopy(result, (short) 0, buffer, (short) 0, (short) result.length); // 결과 복사
    }

    public void process(APDU apdu) throws ISOException {
        byte[] buffer = apdu.getBuffer(); // 버퍼 객체 얻기

        if (selectingApplet()) return; // 애플릿 선택시 OS에 응답

        switch (buffer[ISO7816.OFFSET_CLA]) { // CLA 바이트 기준으로 분기
            case (byte) 0x0A:
                Util.arrayCopy(this.stdNo, (short) 0, buffer, (short) 0, (short) this.stdNo.length);
                apdu.setOutgoingAndSend((short) 0, (short) this.stdNo.length); // 처리 결과 지정 후 전송
                break;

            case (byte) 0x0B:
                encrypt(apdu, this.stdNo, this.uuid); // 암호화 수행
                break;

            case (byte) 0x0C:
                getRandom(apdu); // 난수 생성
                break;

            default:
                ISOException.throwIt(ISO7816.SW_CLA_NOT_SUPPORTED); // 지원하지 않는 명령
        }
    }
}