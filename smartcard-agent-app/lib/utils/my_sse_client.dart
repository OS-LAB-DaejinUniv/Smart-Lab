library flutter_client_sse;

import 'dart:async';
import 'dart:convert';
import 'package:flutter_client_sse/constants/sse_request_type_enum.dart';
import 'package:flutter_client_sse/flutter_client_sse.dart';
import 'package:http/http.dart' as http;

class SSEModel {
  /// ID of the event.
  String? id = '';

  /// Event name.
  String? event = '';

  /// Event data.
  String? data = '';

  /// Constructor for [SSEModel].
  SSEModel({this.data, this.id, this.event});

  /// Constructs an [SSEModel] from a data string.
  SSEModel.fromData(String data) {
    id = data.split("\n")[0].split('id:')[1];
    event = data.split("\n")[1].split('event:')[1];
    this.data = data.split("\n")[2].split('data:')[1];
  }
}

/// A client for subscribing to Server-Sent Events (SSE).
class SSEClient {
  static http.Client _client = new http.Client();

  /// Retry the SSE connection after a delay.
  ///
  /// [method] is the request method (GET or POST).
  /// [url] is the URL of the SSE endpoint.
  /// [header] is a map of request headers.
  /// [body] is an optional request body for POST requests.
  /// [streamController] is required to persist the stream from the old connection
  static void _retryConnection(
      {required SSERequestType method,
        required String url,
        required Map<String, String> header,
        required StreamController<SSEModel> streamController,
        Map<String, dynamic>? body}) {
    print('---RETRY CONNECTION---');
    Future.delayed(Duration(seconds: 5), () {
      subscribeToSSE(
        method: method,
        url: url,
        header: header,
        body: body,
        oldStreamController: streamController,
      );
    });
  }

  /// Subscribe to Server-Sent Events.
  ///
  /// [method] is the request method (GET or POST).
  /// [url] is the URL of the SSE endpoint.
  /// [header] is a map of request headers.
  /// [body] is an optional request body for POST requests.
  ///
  /// Returns a [Stream] of [SSEModel] representing the SSE events.
  static Stream<SSEModel> subscribeToSSE(
      {required SSERequestType method,
        required String url,
        required Map<String, String> header,
        StreamController<SSEModel>? oldStreamController,
        Map<String, dynamic>? body}) {
    StreamController<SSEModel> streamController = StreamController();
    if (oldStreamController != null) {
      streamController = oldStreamController;
    }
    var lineRegex = RegExp(r'^([^:]*)(?::)?(?: )?(.*)?$');
    var currentSSEModel = SSEModel(data: '', id: '', event: '');
    print("--SUBSCRIBING TO SSE---");
    while (true) {
      try {
        _client = http.Client();
        var request = new http.Request(
          method == SSERequestType.GET ? "GET" : "POST",
          Uri.parse(url),
        );

        /// Adding headers to the request
        header.forEach((key, value) {
          request.headers[key] = value;
        });

        /// Adding body to the request if exists
        if (body != null) {
          request.body = jsonEncode(body);
        }

        Future<http.StreamedResponse> response = _client.send(request);

        /// Listening to the response as a stream
        response.asStream().listen((data) {
          /// Applying transforms and listening to it
          data.stream
            .transform(Utf8Decoder()).transform(LineSplitter()).listen(
                  (dataLine) {
                if (dataLine.isEmpty) {
                  /// This means that the complete event set has been read.
                  /// We then add the event to the stream
                  streamController.add(currentSSEModel);
                  currentSSEModel = SSEModel(data: '', id: '', event: '');
                  return;
                }

                /// Get the match of each line through the regex
                Match match = lineRegex.firstMatch(dataLine)!;
                var field = match.group(1);
                if (field!.isEmpty) {
                  return;
                }
                var value = '';
                if (field == 'data') {
                  // If the field is data, we get the data through the substring
                  value = dataLine.substring(
                    5,
                  );
                } else {
                  value = match.group(2) ?? '';
                }
                switch (field) {
                  case 'event':
                    currentSSEModel.event = value;
                    break;
                  case 'data':
                    currentSSEModel.data =
                        (currentSSEModel.data ?? '') + value + '\n';
                    break;
                  case 'id':
                    currentSSEModel.id = value;
                    break;
                  case 'retry':
                    break;
                  default:
                    print('---ERROR1---');
                    print(dataLine);
                    // _retryConnection(
                    //   method: method,
                    //   url: url,
                    //   header: header,
                    //   streamController: streamController,
                    // );
                  throw Error();
                }
              },
              onError: (e, s) {
                print('---ERROR2---');
                print(e);
                // _retryConnection(
                //   method: method,
                //   url: url,
                //   header: header,
                //   body: body,
                //   streamController: streamController,
                // );
                throw e; // Throw error to upper scope as is
              },
            );
        }, onError: (e, s) {
          print('---ERROR3---');
          print(e);
          // _retryConnection(
          //   method: method,
          //   url: url,
          //   header: header,
          //   body: body,
          //   streamController: streamController,
          // );
          throw e; // Throw error to upper scope as is
        });
      } catch (e) {
        print('---ERROR4---');
        print(e);
        // _retryConnection(
        //   method: method,
        //   url: url,
        //   header: header,
        //   body: body,
        //   streamController: streamController,
        // );

        throw e; // Throw error to upper scope as is
      }
      return streamController.stream;
    }
  }

  /// Unsubscribe from the SSE.
  static void unsubscribeFromSSE() {
    _client.close();
  }
}
