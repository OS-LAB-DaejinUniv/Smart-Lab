import 'package:djce_oslab_screader/widgets/myTextButton.dart';
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
              'ID 카드 정보',
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
              statusBarColor: Colors.transparent,
              statusBarIconBrightness: Brightness.dark,
              statusBarBrightness: Brightness.light,
            )),
        backgroundColor: HexColor('FAFAFA'),
        body: SafeArea(
            child: ListView(
              physics: BouncingScrollPhysics(),
              children: [
                cardInfoEntry('이름', cardInfo['name']),
                Gap(8),
                cardInfoEntry('학번', cardInfo['studentId']),
                Gap(8),
                Row(
                  children: [
                    Expanded(
                        child: InkWell(
                          onTap: () {
                            if (cardInfo['uuid'] != null) {
                              Clipboard.setData(ClipboardData(text: cardInfo['uuid']));
                              ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                                  content:
                                  Text('UUID를 클립보드에 복사했어요.', style: TextStyle(color: Colors.white)),
                                  backgroundColor: Colors.black));
                            }
                          },
                          child: cardInfoEntry(
                            'UUID',
                                () {
                              String s = cardInfo['uuid'];
                              return '${s.substring(0, 8)}-${s.substring(8, 12)}-${s.substring(12, 16)}-${s.substring(16, 20)}-${s.substring(20, 32)}';
                            }(),
                            monospaced: true,
                          ),
                        ))
                  ],
                ),
                Gap(8),
                cardInfoEntry('개인 설정 영역', cardInfo['extra'], monospaced: true),
                Gap(8),
                Container(
                    margin: const EdgeInsets.fromLTRB(16, 0, 16, 0),
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
                            if (cardInfo['history'].isEmpty) {
                              return [
                                Text('아직 사용 내역이 없어요.',
                                    style: TextStyle(
                                        fontSize: 18,
                                        color: HexColor('6B7684'),
                                        fontWeight: FontWeight.w500))
                              ];
                            }

                            List<Widget> history = [];
                            for (int i = cardInfo['history'].length - 1; i >= 0; i--) {
                              history.add(
                                Container(
                                    child: Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text('${cardInfo['history'][i]['at']}',
                                              style: TextStyle(
                                                  fontSize: 18,
                                                  color: HexColor('333D4B'),
                                                  fontWeight: FontWeight.w500)),
                                          Wrap(
                                            children: [
                                              Column(
                                                mainAxisAlignment: MainAxisAlignment.end,
                                                children: [
                                                      () {
                                                    switch (cardInfo['history'][i]['type']) {
                                                      case 0:
                                                        return Icon(
                                                            CupertinoIcons.arrow_left_circle_fill,
                                                            color: HexColor('3182F6'),
                                                            size: 22);
                                                      case 1:
                                                        return Icon(
                                                            CupertinoIcons.arrow_right_circle_fill,
                                                            color: HexColor('F04452'),
                                                            size: 22);
                                                      default:
                                                        return Icon(Icons.help_rounded,
                                                            color: Colors.black54, size: 22);
                                                    }
                                                  }(),
                                                  Gap(3),
                                                  Text(
                                                      '${historyTypeCaption.length - 1 >= cardInfo['history'][i]['type'] ? historyTypeCaption[cardInfo['history'][i]['type']] : cardInfo['history'][i]['type']}',
                                                      style: TextStyle(
                                                          fontSize: 14,
                                                          color: HexColor('333D4B'),
                                                          fontWeight: FontWeight.w500,
                                                          fontFeatures: [
                                                            FontFeature.tabularFigures()
                                                          ])),
                                                ],
                                              ),
                                              Gap(5)
                                            ],
                                          ),
                                        ])),
                              );
                              if (i > 0) history.add(Divider(color: HexColor('F9FAFB')));
                            }
                            return history;
                          })()
                        ])),
              ],
            )));
  }
}