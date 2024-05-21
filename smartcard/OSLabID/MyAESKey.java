package OSLabID;

public class MyAESKey implements AESKey {
    private byte[] key;
    public MyAESKey(byte[] key) {
        Util.arrayCopy(key, (short) 0, this.key, key.length);
    }
}
