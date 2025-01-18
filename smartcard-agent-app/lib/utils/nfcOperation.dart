import 'dart:collection';
import 'package:flutter/cupertino.dart';
import 'package:flutter_nfc_kit/flutter_nfc_kit.dart';
import '../assets/CardCommand.dart' as CardCommand;
import '../Constant.dart' as Consts;
import 'dart:typed_data';
import 'dart:convert';

NFCAvailability _availability = NFCAvailability.not_supported;

nfcOperation(String operation, [Uint8List? challengeBytes]) async {
  debugPrint('[nfcOperation] Starting in $operation mode..');

  try {
    print('카드 찾는 중..');
    await FlutterNfcKit.poll(); // starts to find available tag.
    print('카드 찾음');

    var selectResult = await FlutterNfcKit.transceive(
        CardCommand.SELECT_OSLABID); // select OSLabID applet.
    print('애플릿 선택성공');

    // if not a appropriate card found.
    if ((selectResult[0] != 0x90) && (selectResult[1] != 0x00)) {
      throw Error();
    }

    // if NFC is not available
    if (_availability == false) {
      throw Error();
    }

    print('모드에 따른 처리');
    // processes selected operation.
    switch (operation) {
      case 'READ_INFO':
        // read user info from the card.
        Uint8List cardInfo = await FlutterNfcKit.transceive(CardCommand.READ_CARDINFO);
        // read usage history from the card.
        dynamic history = await () async {
          Uint8List resp = await FlutterNfcKit.transceive(CardCommand.READ_HISTORY);
          resp = resp.sublist(0, Consts.HISTORY_ARRAY_LENGTH); // trims off trailing 2 response status bytes.
          // sorts history by time in descending using SplayTreeMap.
          SplayTreeMap<int, int> sortedHist = SplayTreeMap<int, int>();
          var result = [];

          for(int i = 0; i < Consts.HISTORY_ARRAY_LENGTH; i += Consts.LOG_SIZE) {
            int at = resp.sublist(i, i + 4)
                .buffer.asByteData()
                .getUint32(0, Endian.big);

            if (at != 0) { // checks if record empty.
              sortedHist[at] = resp[i + 4];
            }
          }

          sortedHist.forEach((at, type) {
            result = [...result, {
              'at': new DateTime.fromMillisecondsSinceEpoch(at * 1000),
              'type': type
            }];
          });

          return result;
        }();

        // split response array and parse info appropriately.
        late final Uint8List resp_uuid = cardInfo.sublist(0, 16);
        late final Uint8List resp_name = cardInfo.sublist(16, 32);
        late final Uint8List resp_stdNo = cardInfo.sublist(32, 48);
        late final Uint8List resp_extra = cardInfo.sublist(48, 64);

        return {
          'uuid': resp_uuid.map((c) => c.toRadixString(16).padLeft(2, '0')).join().toUpperCase(),
          'name': utf8.decode(resp_name).replaceAll(RegExp(r'[^가-힣A-Za-z ]'), ''),
          'studentId': utf8.decode(resp_stdNo).replaceAll(RegExp(r'[^0-9]'), ''),
          'extra': resp_extra.map((c) => c.toRadixString(16).padLeft(2, '0')).join().toUpperCase(),
          'history': history
        };

      case 'EXTERNAL_AUTH':
        if (challengeBytes == null) {
            throw Error();
          }
          List<Uint8List> list = [
            CardCommand.EXTERNAL_AUTH,
            Uint8List.fromList(challengeBytes)
          ];
          final Uint8List capdu = list.reduce((x, y) => Uint8List.fromList(x + y));
          final Uint8List rapdu = await FlutterNfcKit.transceive(capdu)
              .then((resp) { return resp.sublist(0, 48); });

          return rapdu.map((c) => c.toRadixString(16).padLeft(2, '0')).join().toUpperCase();

      case 'FINISH_SESSION':
        await FlutterNfcKit.finish();
        return;

      default:
        throw new Error();
    }

  } catch (e) {
    debugPrint('[utils/nfcOperation.dart] $e');
    return null;
  }
}