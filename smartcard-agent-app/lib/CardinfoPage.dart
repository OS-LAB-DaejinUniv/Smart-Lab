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
        body: SafeArea(child:
        ListView(
          shrinkWrap: true,
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
                        content: Text('UUID를 복사했어요.', style: TextStyle(color: Colors.white)),
                        backgroundColor: Colors.black));
                  }
                },
                child: cardInfoEntry(
                  '부원증 UUID',
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
                      // HISTORY ITEM GENERATION START
                      if (cardInfo['history'].length == 0) {
                        return [
                          Text('아직 사용 내역이 없어요.',
                              style: TextStyle(
                                  fontSize: 18,
                                  color: HexColor('6B7684'),
                                  fontWeight: FontWeight.w500))
                        ];
                      }

                      List<Widget> history = [];
                      for (int i = cardInfo['history'].length - 1;
                          i >= 0;
                          i--) {
                        print('idx=$i');
                        history = [
                          ...history,
                          Container(
                              child: Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
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
                                          switch (cardInfo['history'][i]
                                              ['type']) {
                                            case 0:
                                              return Icon(
                                                  CupertinoIcons
                                                      .arrow_left_circle_fill,
                                                  color: HexColor('3182F6'),
                                                  size: 22);
                                            case 1:
                                              return Icon(
                                                  CupertinoIcons
                                                      .arrow_right_circle_fill,
                                                  color: HexColor('F04452'),
                                                  size: 22);

                                            default:
                                              return Icon(Icons.help_rounded,
                                                  color: Colors.black54,
                                                  size: 22);
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
                                    )
                                  ],
                                ),
                              ])),
                          if (i > 0) Divider(color: HexColor('F9FAFB'))
                        ];
                      }
                      return history;
                    }
                    // HISTORY ITEM GENERATION END
                    )()
                  ])),
        ])));
  }
}
