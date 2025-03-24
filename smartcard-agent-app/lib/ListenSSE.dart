import 'dart:async';
import 'dart:ui';

import 'package:flutter/cupertino.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_background_service_android/flutter_background_service_android.dart';
import 'package:flutter_client_sse/constants/sse_request_type_enum.dart';
import 'package:flutter_client_sse/flutter_client_sse.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import 'Constant.dart';

// iOS Configuration
IosConfiguration iosConf = IosConfiguration(
  autoStart: true,
  onForeground: onStart,
// onBackground: onIosBackground, // Ensure this is handled if needed
);

// Android Configuration
AndroidConfiguration androidConf = AndroidConfiguration(
// this will be executed when app is in foreground or background in separated isolate
  onStart: onStart,

// auto start service
  autoStart: true,
  isForegroundMode: true,

  notificationChannelId: 'my_foreground',
  initialNotificationTitle: 'AWESOME SERVICE',
  initialNotificationContent: 'Initializing',
  foregroundServiceNotificationId: 54,
  foregroundServiceTypes: [AndroidForegroundType.dataSync],
);

// 1. Handle background service to start
Future<void> ListenSSE() async {
  final service = FlutterBackgroundService();
  await service.configure(
    iosConfiguration: iosConf,
    androidConfiguration: androidConf,
  );

// 2. Start background service!!
  service.startService();
}

// Entry Point
@pragma('vm:entry-point')
void onStart(ServiceInstance service) async {
  DartPluginRegistrant.ensureInitialized();

  if (service is AndroidServiceInstance) {
    service.setForegroundNotificationInfo(
      title: "Background Service",
      content: "Running...",
    );
  }

  // Use a loop to keep the service alive
  while (true) {
    print('Background Service is running...');

    final FlutterLocalNotificationsPlugin _local =
        FlutterLocalNotificationsPlugin();
    const AndroidNotificationDetails androidNotificationDetails =
        AndroidNotificationDetails(
      'push_common',
      '모든 알림',
      channelDescription: 'OSTools',
      importance: Importance.max,
      priority: Priority.high
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
        onError: (error) async {
          debugPrint('SSE Error: $error');
          await Future.delayed(Duration(seconds: 10));
          throw Error();
        },
        onDone: () {
          debugPrint('SSE Done');
        },
        cancelOnError: false,
      );
    } catch (e) {
      debugPrint('SSE Error: $e\nTrying to reconnect.');
    } finally {
      await Future.delayed(Duration(seconds: 10));
    }
  }
}
