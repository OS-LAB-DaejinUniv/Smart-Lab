import 'dart:collection';

import 'package:flutter/cupertino.dart';
import 'package:flutter_nfc_kit/flutter_nfc_kit.dart';
import '../assets/CardCommand.dart' as CardCommand;
import '../Constant.dart' as Consts;
import 'dart:typed_data';
import 'dart:convert';

NFCAvailability _availability = NFCAvailability.not_supported;

nfcOperation(String operation) async {
  debugPrint('called nfcOperation');

  try {
    await FlutterNfcKit.poll(); // starts to find available tag.

    var selectResult = await FlutterNfcKit.transceive(
        CardCommand.SELECT_OSLABID); // select OSLabID applet.

    // if not a appropriate card found.
    if ((selectResult[0] != 0x90) && (selectResult[1] != 0x00)) {
      throw Error();
    }

    // if NFC is not available
    if (_availability == false) {
      throw Error();
    }

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
        late final Uint8List resp_uuid = cardInfo.sublist(0, 15);
        late final Uint8List resp_name = cardInfo.sublist(16, 31);
        late final Uint8List resp_stdNo = cardInfo.sublist(32, 47);
        late final Uint8List resp_extra = cardInfo.sublist(48, 63);

        return {
          'uuid': resp_uuid.map((c) => c.toRadixString(16).padLeft(2, '0')).join().toUpperCase(),
          'name': utf8.decode(resp_name).replaceAll(RegExp(r'[^가-힣A-Za-z ]'), ''),
          'studentId': utf8.decode(resp_stdNo).replaceAll(RegExp(r'[^0-9]'), ''),
          'extra': resp_extra.map((c) => c.toRadixString(16).padLeft(2, '0')).join().toUpperCase(),
          'history': history
        };

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