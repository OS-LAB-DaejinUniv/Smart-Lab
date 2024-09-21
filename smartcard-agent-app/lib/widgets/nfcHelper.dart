import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:gap/gap.dart';
import 'package:hexcolor/hexcolor.dart';

class NFCHelper extends StatefulWidget {
  String? message;
  bool isError = false;

  NFCHelper({Key? key, this.message, bool isError = false}) : super(key: key);

  @override
  State<NFCHelper> createState() => _NFCHelperState();
}

class _NFCHelperState extends State<NFCHelper> {
  String? _dialogMessage;
  bool _isError = false;

  @override
  void initState() {
    super.initState();
    _dialogMessage = widget.message ?? null;
    _isError = widget.isError;
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
            backgroundColor: HexColor('F2F4F6'),
            content: Container(
              height: 150,
              child: Row(
                children: [
                  Icon(_isError ?
                  Icons.close_rounded :
                  Icons.contactless_rounded,
                      color: HexColor('8B95A1'), size: 52),
                  const Gap(7),
                  Text(
                      "${_dialogMessage != null ? '$_dialogMessage' : '카드를 휴대폰 뒷면에 대주세요.'}",
                      style: TextStyle(
                          fontSize: 18,
                          color: HexColor('333D4B'),
                          fontFamily: 'Pretendard',
                          fontWeight: FontWeight.w600)),
                  const Gap(7)
                ],
              ),
            ),
            elevation: 0,
          );
  }
}

void showNFCDialog(BuildContext context) {
  showDialog(
      context: context,
      barrierDismissible: true,
      builder: (BuildContext context) => NFCHelper()
  );
}