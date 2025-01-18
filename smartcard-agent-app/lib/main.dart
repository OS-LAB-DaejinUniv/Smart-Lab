import 'dart:ui';

// Import page widgets
import 'package:djce_oslab_screader/CardinfoPage.dart';
import 'package:djce_oslab_screader/OSPassQR.dart';

import 'package:djce_oslab_screader/utils/nfcOperation.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher_string.dart';
import 'package:flutter/services.dart';
import 'package:gap/gap.dart';
import 'package:hexcolor/hexcolor.dart';
import './widgets/mainManuEntry.dart';
import 'package:url_launcher/url_launcher.dart';
import './widgets/nfcHelper.dart';

void main() async {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
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
  void processReadCard() async {
    bool isDialogShowing = true;

    showDialog(
        context: context,
        barrierDismissible: true,
        builder: (BuildContext context) => NFCHelper()
    ).then((value) => {
      nfcOperation('FINISH_SESSION'),
      isDialogShowing = false,
    });

    try {
      // scan id card
      var cardInfo = await nfcOperation('READ_INFO');

      if (cardInfo == null) {
        throw Error();
      }

      // close nfc dialog
      Navigator.pop(context);

      // initialize card info page with readings.
      Navigator.of(context)
          .push(MaterialPageRoute(builder: (context) => CardinfoPage(
        cardInfo: cardInfo
      )));

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
                                  color: HexColor('333D4B'),
                                  fontSize: 24,
                                  fontWeight: FontWeight.w700)),
                          Gap(12),
                          mainMenuEntry(
                              '🪪', '부원증 관리', 'ID 카드를 조회하고 개인 설정값을 변경할 수 있어요.',
                              () async { processReadCard(); }
                          ),
                          Gap(16),
                          mainMenuEntry(
                              '📂', 'SecureVault', '중요한 파일을 부원증에 안전하게 보관하세요.',
                              () {
                            // 미구현
                          }),
                          Gap(16),
                          mainMenuEntry('🔑', 'OSPass.',
                              '공용 PC에서 비밀번호 없이 안전하게 로그인하세요.', () {
                            print('OSAuth.');
                          }),
                          Gap(16),
                          mainMenuEntry(
                              '👥', '재실 현황', '현재 재실 상태인 부원을 확인할 수 있어요.', () {
                            print('재실현황');
                          }),
                          Gap(16),
                          mainMenuEntry(
                              '💾', 'ColioCloud', '부원 전용 클라우드 드라이브 서비스로 연결돼요.',
                              () {
                            launchUrlString('https://cloud.colio.net/',
                                mode: LaunchMode.externalApplication);
                          }),
                          Gap(16),
                          mainMenuEntry('💻', 'Github', '연구실 Github 페이지가 열려요.',
                              () {
                            launchUrlString(
                                'https://github.com/OS-LAB-DaejinUniv',
                                mode: LaunchMode.externalApplication);
                          }),
                          Gap(16),
                          mainMenuEntry('🛜', 'OSPortal',
                              '연구실 인트라넷 홈페이지가 열려요. VPN 접속이 필요해요.', () {
                            launchUrlString('http://portal.oslab/',
                                mode: LaunchMode.externalApplication);
                          }),
                          Gap(16),
                          mainMenuEntry('🧑‍💻️', 'OSPASS TEST1',
                              '검증 요청 테스트(/api/v1/card-response)', () {
                                // open a qr scanner
                                Navigator.of(context)
                                    .push(MaterialPageRoute(builder: (context) => OSPassQRScanner()));
                              })
                        ]))) // This trailing comma makes auto-formatting nicer for build methods.
            ));
  }
}