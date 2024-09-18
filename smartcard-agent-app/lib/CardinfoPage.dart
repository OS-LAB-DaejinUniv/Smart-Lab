import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:hexcolor/hexcolor.dart';

class CardinfoPage extends StatelessWidget {
  dynamic cardInfo;

  CardinfoPage(dynamic cardInfo, {super.key}) {
    this.cardInfo = cardInfo;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
          title: Text(
            '부원증 정보',
            style: TextStyle(fontFamily: 'Pretendard', fontWeight: FontWeight.w600, color: HexColor('333D4B')),
          ),
          leading: BackButton(
            color: HexColor('333D4B'),
          ),
          backgroundColor: Colors.transparent,
            systemOverlayStyle: SystemUiOverlayStyle(
              statusBarColor: Colors.transparent, // 상태바 배경 투명하게 설정
              statusBarIconBrightness: Brightness.dark, // 상태바 아이콘 어둡게 설정
              statusBarBrightness: Brightness.light, // iOS 상태바 밝게 설정
            )
        ),
        backgroundColor: HexColor('FAFAFA'),
        body: SafeArea(child: Center(
          child: Padding(
            padding: EdgeInsets.all(8),
            child: ListView(
              children: [
                Text('''
                UUID: ${cardInfo['uuid']}\n
                이름: ${cardInfo['name']}\n
                학번: ${cardInfo['studentId']}\n
                설정값: ${cardInfo['extra']}
                ''', style: TextStyle(fontSize: 22, color: HexColor('333D4B'), fontWeight: FontWeight.w600))
              ]
            )
          )
        ))
    );
  }
}