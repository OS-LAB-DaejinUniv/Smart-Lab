import 'dart:convert';

class ParseLoginQR {
  final String jsonString;
  String session = '';
  String challenge = '';

  ParseLoginQR(this.jsonString) {
    final Map<String, dynamic> parsed = jsonDecode(this.jsonString);
    this.session = parsed['session'];
    this.challenge = parsed['challenge'];
  }
}