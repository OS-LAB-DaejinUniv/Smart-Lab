import 'dart:ffi';

import 'package:flutter/material.dart';
import 'package:flutter_nfc_kit/flutter_nfc_kit.dart';
import 'dart:typed_data';
import 'dart:convert';

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
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blueAccent),
        useMaterial3: true,
      ),
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

  late final Uint8List command_select = Uint8List.fromList([0x00, 0xA4, 0x04, 0x00, 0x07, 0x55, 0x44, 0x33, 0x22, 0x11, 0xCC, 0xBB]);
  late final Uint8List command_readInfo = Uint8List.fromList([0x54, 0xDD, 0x00, 0x00]);
  late final Uint8List command_readHistory = Uint8List.fromList([0x54, 0xC1, 0x00, 0x00]);

  void _readCard() async {
    try {
      // show message
      setState(() {
        result = "지금 카드를 휴대폰 뒷면에 대주세요!";
      });

      NFCTag tag = await FlutterNfcKit.poll();
      Uint8List cardInfo;

      await FlutterNfcKit.transceive(command_select); // select OSLabID applet.
      cardInfo = await FlutterNfcKit.transceive(command_readInfo); // read user info from card.
      debugPrint('통신 결과: $cardInfo');

      // split response array and parse info appropriately.
      late final Uint8List resp_uuid = cardInfo.sublist(0, 15);
      late final Uint8List resp_name = cardInfo.sublist(16, 31);
      late final Uint8List resp_stdNo = cardInfo.sublist(32, 47);
      late final Uint8List resp_extra = cardInfo.sublist(48, 63);
      
      setState(() {
        result = '''
        [카드를 읽었습니다]\n
        카드 UUID:${new String.fromCharCodes(resp_uuid)}\n
        소유자 이름: ${utf8.decode(resp_name)}\n
        소유자 학번: ${new String.fromCharCodes(resp_stdNo)}\n
        부가정보: ${new String.fromCharCodes(resp_extra)}
        ''';
      });
    } catch (e) {
      setState(() {
        result = '카드와 통신중 오류발생 $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: Text(widget.title),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Text(
              "$result",
              style: TextStyle(fontSize: 28)
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _readCard,
        tooltip: '카드를 읽습니다',
        child: const Icon(Icons.add),
      ), // This trailing comma makes auto-formatting nicer for build methods.
    );
  }
}
