import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:gap/gap.dart';
import 'package:hexcolor/hexcolor.dart';

List<String> historyTypeCaption = ['퇴실', '재실'];

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

class CardinfoPage extends StatelessWidget {
  dynamic cardInfo;
  late Uint8List cardHistory;

  CardinfoPage({required dynamic cardInfo, super.key}) {
    this.cardInfo = cardInfo;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
            title: Text(
              '부원증 정보',
              style: TextStyle(
                  fontFamily: 'Pretendard',
                  fontWeight: FontWeight.w600,
                  color: HexColor('333D4B')),
            ),
            leading: BackButton(
              color: HexColor('333D4B'),
            ),
            backgroundColor: Colors.transparent,
            systemOverlayStyle: SystemUiOverlayStyle(
              statusBarColor: Colors.transparent, // 상태바 배경 투명하게 설정
              statusBarIconBrightness: Brightness.dark, // 상태바 아이콘 어둡게 설정
              statusBarBrightness: Brightness.light, // iOS 상태바 밝게 설정
            )),
        backgroundColor: HexColor('FAFAFA'),
        body: SafeArea(
            child: Center(
                child: ListView(children: [
          cardInfoEntry('이름', cardInfo['name']),
          Gap(8),
          cardInfoEntry('학번', cardInfo['studentId']),
          Gap(8),
          cardInfoEntry(
            '부원증 UUID',
            () {
              String s = cardInfo['uuid'];
              return '${s.substring(0, 8)}-${s.substring(8, 12)}-${s.substring(12, 16)}-${s.substring(16, 20)}-${s.substring(20, 30)}';
            }(),
            monospaced: true,
          ),
          Gap(8),
          cardInfoEntry('개인화 설정 영역', cardInfo['extra']),
          Gap(8),
          Container(
              margin: const EdgeInsets.fromLTRB(16, 0, 16, 0),
              height: 48,
              width: double.infinity,
              alignment: Alignment.centerLeft,
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('최근 사용 내역',
                        style: TextStyle(
                            fontSize: 18,
                            color: HexColor('333D4B'),
                            fontWeight: FontWeight.w600)),
                    ...(() {
                      List<Widget> history = [];
                      for (int i = cardInfo['history'].length - 1; i != 0; i--) {
                        history = [...history,
                          Text(
                              '${cardInfo['history'][i]['at']} / ${cardInfo['history'][i]['type']}',
                              style: TextStyle(
                                  fontSize: 18,
                                  color: HexColor('333D4B'),
                                  fontWeight: FontWeight.w500)
                          )
                        ];
                      }
                      return history;
                    })()
                  ])),
        ]))));
  }
}
