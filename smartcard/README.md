## 🪪 OSLabID.java – OS랩 스마트 ID 카드
출입 및 출퇴근 상태 전환시 월패드에 태그하여 **본인 인증 수단**으로서 사용합니다.<br>

현존 출입통제 시스템의 절대 다수가 채용중인 Mifare Classic 칩셋의 UID bytes를 비교하는 방식은 그 복제가 매우 용이하고 보편화되어,<br>
사실상 보안성이 없을 것이라는 판단 하에 대안 기술을 적용해 보기로 결정하였습니다.<br>
이에 Java Card 플랫폼 기반의 스마트카드를 활용하여 카드 복제 문제를 차단할 수 있었을 뿐만 아니라,<br>
아이폰 NFC 호환성 확보 및 전용 앱을 통한 웹 2FA 서비스도 문제 없이 구현할 수 있었습니다.
<br><br>
### 💻 Build
```
$JDK11_HOME/bin/javac \
-g \
-cp $JCDK_HOME/lib/api_classic-3.0.5.jar \
-source 1.6 \
-target 1.6 \
-Xlint:deprecation \
-Xlint: -options \
OSLabID.java
```
* ```$JCDK_HOME```: The path where your Javacard SDK located on. e.g. ```/opt/jcdk```
* ```$JDK11_HOME```: The path where your JDK11 located on. e.g. ```/usr/lib/jvm/jdk-11```

[-> Download latest JCDK](https://www.oracle.com/java/technologies/javacard-downloads.html)
<br>
[-> Download JDK11](https://www.oracle.com/kr/java/technologies/javase/jdk11-archive-downloads.html)
<br><br>
### 🔄 Convert .class to .cap
```
$JCDK_HOME/bin/converter.sh \
-debug \
-verbose \
-target 3.0.5 \
-out CAP \
-classdir .. \
-applet 0x55:0x44:0x33:0x22:0x11:0xCC:0xBB OSLabID \
OSLabID 0x55:0x44:0x33:0x22:0x11:0xCC:0xBB:0x11 1.0
```
* ```$JCDK_HOME```: The path where your Javacard SDK located on. e.g. ```/opt/jcdk```
<br><br>
### ⚡ Flashing onto real smart card!
```java -jar gp.jar --install OSLabID.cap --params <YOUR_PARAMS>```<br>
* ```YOUR_PARAMS```: A 48-byte of personalization data represented in hex string.<br>
```AES-128 key (16-byte)``` + ```Name string (16-byte, UTF-8, fill remain bytes as 0)``` + ```Student ID string (16-byte, UTF-8, fill remain bytes as 0)```<br>

* You can generate install parameter easily using ```generate_parameter.py``` on current directory.

[-> Get gp.jar](https://github.com/martinpaljak/GlobalPlatformPro)
<br><br>
### ⚙️ APDU Command definition
**CLA**<br>
Use ```0x54``` on every command.

**INS**
|no.|command|description|parameter|response|
|:-:|:-:|:-|-|-|
|1|```0xAA```|Client Authentication|Pass 16-byte challenge value through APDU data field.|Encrypted response +<br>Card ID +<br>Extra bytes
|2|```0xA1```|Server Authentication|Host gets 16-byte challenge as the response.|16-byte challenge
|3|```0xA2```|Response value verify request about the challenge issued using CLA ```0xA1```|Pass 16-byte response via APDU data field.<br>And include the command you want to execute on the card after authentication via P1 field.|```90 00``` if success.
|4|```0xC1```|Read card usage history|None|20 recent card usage history records. (not sorted)|
|5|```0xDD```|Read personal info.|None|```card UUID (16-byte)``` + ```name (16-byte)``` + ```student id (16-byte)``` + ```user conf. bytes (16-byte)```|
|6|```0xEE```|Update user configuration bytes.|Pass 16-byte data via APDU data field.|```90 00``` if success.

**P1**
1. ```0xCC```: Write a new card usage history record. Must be used as a paremeter of CLA ```0xA2```.<br>
fill data with 16-byte response + 5-byte new record* (32-bit UNIX time + 1-byte record type) + (11-byte padding 0)<br>
e.g. ```54 A2 CC 00 <16-byte of response> 12 34 56 78 01 <11-byte of padding 0>```<br>

\* Contents of the 5-byte record could be set as an arbitrary value if you want! it doesnt't matter.
<br><br>
### References
[https://tool.hiofd.com/en/aes-decrypt-online/](https://tool.hiofd.com/en/aes-decrypt-online/), AES encryption & decryption test tool. (set as CBC, NoPadding mode)<br>
[https://docs.oracle.com/javacard/3.0.5/api/javacardx/crypto/Cipher.html](https://docs.oracle.com/javacard/3.0.5/api/javacardx/crypto/Cipher.html), Reference of javacardx.crypto.Cipher<br>
[https://dencode.com/string/hex](https://dencode.com/string/hex), Convert HEX to UTF-8 string
