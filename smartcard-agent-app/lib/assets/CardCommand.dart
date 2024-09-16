import 'dart:typed_data';

final Uint8List SELECT_OSLABID = Uint8List.fromList([0x00, 0xA4, 0x04, 0x00, 0x07, 0x55, 0x44, 0x33, 0x22, 0x11, 0xCC, 0xBB]);
final Uint8List READ_CARDINFO = Uint8List.fromList([0x54, 0xDD, 0x00, 0x00]);
final Uint8List READ_HISTORY = Uint8List.fromList([0x54, 0xC1, 0x00, 0x00]);