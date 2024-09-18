import 'package:flutter/cupertino.dart';
import 'package:flutter_nfc_kit/flutter_nfc_kit.dart';
import '../assets/CardCommand.dart' as CardCommand;
import 'dart:typed_data';
import 'dart:convert';

NFCAvailability _availability = NFCAvailability.not_supported;
NFCTag? _tag;
String? _result, _writeResult, _mifareResult;

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

    // processes selected operation.
    switch (operation) {
      case 'READ_INFO':
        // read user info from the card.
        Uint8List cardInfo = await FlutterNfcKit.transceive(CardCommand.READ_CARDINFO);

        // split response array and parse info appropriately.
        late final Uint8List resp_uuid = cardInfo.sublist(0, 15);
        late final Uint8List resp_name = cardInfo.sublist(16, 31);
        late final Uint8List resp_stdNo = cardInfo.sublist(32, 47);
        late final Uint8List resp_extra = cardInfo.sublist(48, 63);
        return {
          'uuid': resp_uuid.map((c) => c.toRadixString(16).padLeft(2, '0')).join().toUpperCase(),
          'name': utf8.decode(resp_name).replaceAll(RegExp(r'[^가-힣A-Za-z ]'), ''),
          'studentId': utf8.decode(resp_stdNo).replaceAll(RegExp(r'[^0-9]'), ''),
          'extra': resp_extra.map((c) => c.toRadixString(16).padLeft(2, '0')).join().toUpperCase()
        };

      case 'READ_HISTORY':
        // read usage history from the card.
        Uint8List history = await FlutterNfcKit.transceive(CardCommand.READ_HISTORY);


    }

  } catch (e) {
    debugPrint('[utils/nfcOperation.dart] $e');
    return e;
  }
}