import 'dart:async';
import 'dart:convert';
import 'dart:ui';

// Import page widgets
import 'package:djce_oslab_screader/CardinfoPage.dart';
import 'package:djce_oslab_screader/OSPassQR.dart';

import 'package:djce_oslab_screader/utils/nfcOperation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_client_sse/constants/sse_request_type_enum.dart';
import 'package:flutter_client_sse/flutter_client_sse.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:url_launcher/url_launcher_string.dart';
import 'package:flutter/services.dart';
import 'package:gap/gap.dart';
import 'package:hexcolor/hexcolor.dart';
import './widgets/mainManuEntry.dart';
import 'package:url_launcher/url_launcher.dart';
import './widgets/nfcHelper.dart';
import 'Constant.dart';

// untested
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_background_service/flutter_background_service.dart';

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
  final FlutterLocalNotificationsPlugin _local =
      FlutterLocalNotificationsPlugin();

  @override
  void initState() {
    super.initState();
    _permissionWithNotification();
    _initialization();
    _listenPush();
  }

  void _listenPush() async {
    final FlutterLocalNotificationsPlugin _local =
    FlutterLocalNotificationsPlugin();
    const AndroidNotificationDetails androidNotificationDetails =
    AndroidNotificationDetails(
      'push_common',
      '모든 알림',
      channelDescription: 'OSTools 알림',
      importance: Importance.max,
      priority: Priority.high,
      ticker: 'ticker',
    );

    const NotificationDetails notificationDetails =
    NotificationDetails(android: androidNotificationDetails);

    try {
      final sseStream = SSEClient.subscribeToSSE(
        url: SSE_BROADCAST,
        header: {"Accept": "text/event-stream"},
        method: SSERequestType.GET,
      );

      sseStream.listen(
            (event) {
          debugPrint('Received SSE event: ${event.data}');
          _local.show(
            0,
            '새로운 알림',
            event.data,
            notificationDetails,
            payload: 'test_payload',
          );
        },
        onError: (error) {
          debugPrint('SSE Error: $error');
        },
        onDone: () {
          debugPrint('SSE Done');
        },
        cancelOnError: false,
      );
    } catch (e) {
      debugPrint('SSE Connection Error: $e');
    }
  }

  void _initialization() async {
    const AndroidInitializationSettings android =
        AndroidInitializationSettings('ic_stat_notification');
    DarwinInitializationSettings ios = const DarwinInitializationSettings(
      requestSoundPermission: false,
      requestBadgePermission: false,
      requestAlertPermission: false,
    );
    InitializationSettings settings =
        InitializationSettings(android: android, iOS: ios);
    await _local.initialize(settings);
  }

  void _permissionWithNotification() async {
    await [Permission.notification].request();
  }

  void processReadCard() async {
    bool isDialogShowing = true;

    showDialog(
            context: context, barrierDismissible: true, builder: (BuildContext context) => NFCHelper())
        .then((value) => {
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
      Navigator.of(context).push(MaterialPageRoute(
          builder: (context) => CardinfoPage(cardInfo: cardInfo)));
    } catch (e) {
      // if any error occurs
      if (isDialogShowing) {
        Navigator.pop(context); // close nfc dialog
        showDialog(
            // and show error message
            context: context,
            barrierDismissible: true,
            builder: (BuildContext context) => NFCHelper(
                  message: '카드를 확인하고 다시 시도해 주세요.',
                  isError: true,
                ));
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
                    ),
                    Text('로그인',
                        style: TextStyle(
                            color: HexColor('333D4B'),
                            fontSize: 18,
                            fontWeight: FontWeight.w500))
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
<<<<<<< Updated upstream
                              '🪪', '부원증 관리', 'ID 카드를 조회하고 개인 설정값을 변경할 수 있어요.',
                              () async { processReadCard(); }
                          ),
=======
                              '🪪', '카드 관리', 'ID 카드를 읽거나 개인 설정을 변경할 수 있어요.',
                              () async {
                            processReadCard();
                          }),
>>>>>>> Stashed changes
                          Gap(16),
                          mainMenuEntry(
                              '📂', 'SlimVault', '중요한 파일을 부원증에 안전하게 보관하세요.',
                              () {
                            // 미구현
                          }),
                          Gap(16),
                          mainMenuEntry(
                              '🔑', 'OSPass', '공용 PC에서 비밀번호 없이 안전하게 로그인하세요.',
                              () {
                            print('OSAuth.');
                          }),
                          Gap(16),
                          mainMenuEntry(
                              '👥', '재실 현황', '현재 재실 상태인 부원을 확인할 수 있어요.', () {
                            print('재실현황');
                          }),
                          Gap(16),
                          mainMenuEntry(
                              '💾', 'ColioCloud', '부원 전용 클라우드 드라이브에요.', () {
                            launchUrlString('https://cloud.colio.net/',
                                mode: LaunchMode.externalApplication);
                          }),
                          Gap(16),
                          mainMenuEntry('💻', 'GitHub', '연구실 GitHub 페이지로 연결돼요.',
                              () {
                            launchUrlString(
                                'https://github.com/OS-LAB-DaejinUniv',
                                mode: LaunchMode.externalApplication);
                          }),
                          Gap(16),
                          mainMenuEntry('👨‍💻', 'DevPortal', '인트라넷 포털로 연결돼요.',
                              () {
                            launchUrlString('http://devportal.oslab/',
                                mode: LaunchMode.externalApplication);
                          }),
<<<<<<< Updated upstream
                          Gap(16),
                          mainMenuEntry('🧑‍💻️', 'OSPASS TEST1',
                              '검증 요청 테스트(/api/v1/card-response)', () {
                                // open a qr scanner
                                Navigator.of(context)
                                    .push(MaterialPageRoute(builder: (context) => OSPassQRScanner()));
                              })
=======
>>>>>>> Stashed changes
                        ]))) // This trailing comma makes auto-formatting nicer for build methods.
            ));
  }
}
