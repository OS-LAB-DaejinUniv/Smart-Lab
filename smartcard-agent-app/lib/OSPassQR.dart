import 'package:djce_oslab_screader/utils/ParseLoginQR.dart';
import 'package:djce_oslab_screader/utils/nfcOperation.dart';
import 'package:djce_oslab_screader/widgets/nfcHelper.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:gap/gap.dart';
import 'package:hexcolor/hexcolor.dart';
import 'package:qr_code_dart_scan/qr_code_dart_scan.dart';
import 'package:hex/hex.dart';

Widget cardInfoEntry(String title, String content, {bool monospaced = false}) {
  return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 0),
      height: 48,
      width: double.infinity,
      alignment: Alignment.centerLeft,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title,
            style: TextStyle(
                fontSize: 18,
                color: HexColor('333D4B'),
                fontWeight: FontWeight.w600)),
        Text(content,
            style: TextStyle(
                fontSize: 18,
                color: HexColor('333D4B'),
                fontFamily: monospaced ? 'RobotoMono' : null,
                fontWeight: FontWeight.w500))
      ]));
}

class OSPassQRScanner extends StatefulWidget {
  @override
  _OSPassQRScannerState createState() => _OSPassQRScannerState();
}

class _OSPassQRScannerState extends State<OSPassQRScanner> {
  var scanned;
  bool recognized = false;
  String message = '[1단계] QR 스캔 대기..';

  void externalAuthWithCard(String challengeHex) async {
    bool isDialogShowing = true;

    showDialog(
        context: context,
        barrierDismissible: true,
        builder: (BuildContext context) => NFCHelper(message: '인증을 위해 카드를 스캔해 주세요.')
    ).then((value) => {
      print('[NFCHelper] Dialog closed'),
      nfcOperation('FINISH_SESSION'),
      isDialogShowing = false,
    });

    try {
      // External authentication with the scanned card.
      dynamic cardResponse = await nfcOperation('EXTERNAL_AUTH', HEX.decode(challengeHex) as Uint8List);
      if (cardResponse == null) {
        throw Error();
      }

      // close nfc dialog
      Navigator.pop(context);

      debugPrint('카드의 응답 $cardResponse');

      setState(() {
        this.message = '[3단계] ID 카드에서 응답 수신함\n$cardResponse\n\n서버에 요청 -> http://api.oslab:9413/ㅁ';
      });

    } catch (e) { // if any error occurs
      if (isDialogShowing) {
        Navigator.pop(context); // close nfc dialog
        showDialog( // and show error message
            context: context,
            barrierDismissible: true,
            builder: (BuildContext context) => NFCHelper(
              message: '카드를 확인하고 다시 시도해 주세요.',
              isError: true,
            )
        );
      } else {
        debugPrint('ignore error -> $e');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
            title: Text(
              'DBG_OSPASS',
              style: TextStyle(
                  fontFamily: 'Pretendard',
                  fontWeight: FontWeight.w600,
                  color: HexColor('333D4B')),
            ),
            leading: BackButton(
              color: HexColor('333D4B'),
            ),
            backgroundColor: Colors.transparent,
            systemOverlayStyle: const SystemUiOverlayStyle(
              statusBarColor: Colors.transparent, // 상태바 배경 투명하게 설정
              statusBarIconBrightness: Brightness.dark, // 상태바 아이콘 어둡게 설정
              statusBarBrightness: Brightness.light, // iOS 상태바 밝게 설정
            )),
        backgroundColor: HexColor('FAFAFA'),
        body: SafeArea(child:
        ListView(
            shrinkWrap: true,
            physics: BouncingScrollPhysics(),
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  !this.recognized ? QRCodeDartScanView(
                    scanInvertedQRCode: true,
                    // enable scan invert qr code ( default = false)

                    typeScan: TypeScan.live,
                    // if TypeScan.takePicture will try decode when click to take a picture(default TypeScan.live)
                    // intervalScan: const Duration(seconds:1)
                    // onResultInterceptor: (old,new){
                    //  do any rule to controll onCapture.
                    // }
                    // takePictureButtonBuilder: (context,controller,isLoading){ // if typeScan == TypeScan.takePicture you can customize the button.
                    //    if(loading) return CircularProgressIndicator();
                    //    return ElevatedButton(
                    //       onPressed:controller.takePictureAndDecode,
                    //       child:Text('Take a picture'),
                    //    );
                    // }
                    formats: [BarcodeFormat.qrCode],
                    onCapture: (Result result) {
                      try {
                        var scanned = ParseLoginQR(result.text);

                        if (scanned.challenge.isEmpty || scanned.session.isEmpty) {
                          setState(() {
                            this.recognized = false;
                            this.message = "QR 코드 형식이 올바르지 않습니다.";
                          });
                          return;
                        }

                        setState(() {
                          this.recognized = true;
                          this.message = "[2단계] JSON 파싱 성공\nCHG: ${scanned.challenge}\nSID: ${scanned.session}\nNFC로 APDU 전송 대기..";
                        });

                        externalAuthWithCard(scanned.challenge);
                      } catch (e) {
                        setState(() {
                          this.recognized = false;
                          this.message = "QR 코드 처리 중 오류가 발생했습니다.";
                        });
                        print('Error in onCapture: $e');
                      }
                    },
                  ) : const Text(''),
                  Gap(16),
                  Text(
                    this.message,
                      style: TextStyle(fontSize: 20, fontFamily: 'Pretendard', color: HexColor('3182F6'), fontWeight: FontWeight.w600)
                  )
                ],
              )
            ],
        )));
  }

}