import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:hexcolor/hexcolor.dart';

class CardinfoPage extends StatelessWidget {
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
        body: Container(
            child: Center(
              child: Column(
                children: [
                  Text('카드 고유번호\nAABBCCDD-1111-2222-3333-009988776655', style: TextStyle(
                    color: HexColor('333D4B')
                  ),)
                ],
              )
            )
        )
    );
  }
}