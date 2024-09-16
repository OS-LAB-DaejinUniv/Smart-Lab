import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_nfc_kit/flutter_nfc_kit.dart';
import 'dart:typed_data';
import 'dart:convert';
import './assets/CardCommand.dart' as CardCommand;
import 'package:flutter/services.dart';
import 'package:gap/gap.dart';
import 'package:hexcolor/hexcolor.dart';
import './widgets/mainManuEntry.dart';

void main() async {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      theme: ThemeData(
          brightness: Brightness.dark,
          useMaterial3: true,
          fontFamily: 'Pretendard'),
      debugShowCheckedModeBanner: false,
      home: const MyHomePage(title: 'Smart Card Agent for OSLab.'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});

  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  String? result = "우측 하단의 버튼을 누르고 카드를 스캔하세요.";
  NFCAvailability _availability = NFCAvailability.not_supported;
  NFCTag? _tag;
  String? _result, _writeResult, _mifareResult;

  void _readCard() async {
    try {
      debugPrint('##### _readCard 실행됨 #####');
      // show message
      setState(() {
        result = "지금 카드를 휴대폰 뒷면에 대주세요!";
      });

      NFCTag tag = await FlutterNfcKit.poll();
      Uint8List cardInfo;

      await FlutterNfcKit.transceive(
          CardCommand.SELECT_OSLABID); // select OSLabID applet.
      cardInfo = await FlutterNfcKit.transceive(
          CardCommand.READ_CARDINFO); // read user info from card.

      // split response array and parse info appropriately.
      late final Uint8List resp_uuid = cardInfo.sublist(0, 15);
      late final Uint8List resp_name = cardInfo.sublist(16, 31);
      late final Uint8List resp_stdNo = cardInfo.sublist(32, 47);
      late final Uint8List resp_extra = cardInfo.sublist(48, 63);

      debugPrint('''
      [카드를 읽었습니다]\n
          UUID:${resp_uuid.map((c) => c.toRadixString(16).padLeft(2, '0')).join().toUpperCase()}\n
          이름: ${utf8.decode(resp_name)}\n
          학번: ${new String.fromCharCodes(resp_stdNo)}\n
          부가정보: ${new String.fromCharCodes(resp_extra)}
      ''');

      setState(() {
        result = '''
        [카드를 읽었습니다]\n
        UUID:${resp_uuid.map((c) => c.toRadixString(16).padLeft(2, '0')).join().toUpperCase()}\n
        이름: ${utf8.decode(resp_name)}\n
        학번: ${new String.fromCharCodes(resp_stdNo)}\n
        부가정보: ${new String.fromCharCodes(resp_extra)}
        ''';
      });
    } catch (e) {
      setState(() {
        result = '통신 오류\n$e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        extendBodyBehindAppBar: true,
        backgroundColor: HexColor('FAFAFA'),
        appBar: AppBar(
          elevation: 0,
          toolbarHeight: 64,
          backgroundColor: Colors.transparent,
          systemOverlayStyle: SystemUiOverlayStyle(
            statusBarColor: Colors.transparent, // 상태바 배경 투명하게 설정
            statusBarIconBrightness: Brightness.dark, // 상태바 아이콘 어둡게 설정
            statusBarBrightness: Brightness.light, // iOS 상태바 밝게 설정
          ),
          flexibleSpace: ClipRect(
              child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 10, sigmaY: 8),
                  child: Container(color: Colors.transparent))),
          title: Padding(
              padding: EdgeInsets.fromLTRB(5, 6, 5, 6),
              child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Image.asset(
                      'assets/images/oslab_logo.png',
                      height: 30,
                    )
                  ])),
        ),
        body: SafeArea(
            child: Center(
                child: Padding(
                    padding: EdgeInsets.fromLTRB(15, 0, 15, 12),
                    child: ListView(
                        padding: const EdgeInsets.fromLTRB(8, 6, 8, 0),
                        children: [
                          Text('OS랩 모바일 유틸리티',
                              style: TextStyle(
                                  color: Colors.black87,
                                  fontSize: 24,
                                  fontWeight: FontWeight.w700)),
                          Gap(12),
                          mainMenuEntry(
                              '🪪', '부원증 관리', '부원증을 조회하거나 개인 설정을 변경할 수 있어요.',
                              () {
                            print('부원증 관리');
                          }),
                          Gap(15),
                          mainMenuEntry(
                              '📂', 'SecureVault', '중요한 파일을 부원증에 안전하게 보관하세요.',
                                  () {
                                print('시큐어볼트');
                              }),
                          Gap(15),
                          mainMenuEntry('🔑', 'OSAuth.',
                              '공용 PC에서 비밀번호 입력 없이 안전하게 로그인하세요.',
                                  () {
                                print('OSAuth.');
                              }),
                          Gap(15),
                          mainMenuEntry(
                              '👥', '재실 현황', '현재 재실 상태인 부원을 확인할 수 있어요.',
                                  () {
                                print('재실현황');
                              }),
                          Gap(15),
                          mainMenuEntry(
                              '💾', 'ColioCloud', '부원 전용 클라우드 드라이브 서비스로 연결돼요.',
                                  () {
                                print('ColioCloud');
                              }),
                          Gap(15),
                          mainMenuEntry('🐱', 'Github',
                              '연구실 Github 페이지로 연결돼요.',
                                  () {
                                print('Github');
                              }),
                        ]))) // This trailing comma makes auto-formatting nicer for build methods.
            ));
  }
}
