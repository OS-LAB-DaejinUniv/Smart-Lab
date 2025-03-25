import 'dart:async';
import 'dart:ui';

import 'package:flutter/cupertino.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_background_service_android/flutter_background_service_android.dart';
import 'package:flutter_client_sse/constants/sse_request_type_enum.dart';
// import 'package:flutter_client_sse/flutter_client_sse.dart';
import 'utils/my_sse_client.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import 'Constant.dart';

// Platform specific configurations
IosConfiguration iosConf = IosConfiguration( // iOS
  autoStart: true,
  onForeground: onStart,
// onBackground: onIosBackground, // Ensure this is handled if needed
);

// Android Configuration
AndroidConfiguration androidConf = AndroidConfiguration(
  onStart: onStart,
  autoStart: true,
  isForegroundMode: false,
  autoStartOnBoot: true,

  notificationChannelId: 'my_foreground',
  initialNotificationTitle: 'AWESOME SERVICE',
  initialNotificationContent: 'Initializing',
  foregroundServiceNotificationId: 54,
  foregroundServiceTypes: [AndroidForegroundType.dataSync],
);
// ===== END CONFIGURATION =====

// UNTESTED CODES
void startBackgroundService() {
  final service = FlutterBackgroundService();
  service.startService();
}

void stopBackgroundService() {
  final service = FlutterBackgroundService();
  service.invoke("stop");
}
// ===== END UNTESTED =====

Future<void> ListenSSE() async {
  final service = FlutterBackgroundService();

  await service.configure(
    iosConfiguration: iosConf,
    androidConfiguration: androidConf
  );

  // 1. Start background service
  service.startService();
}

// ===== ENTRY POINT =====
// iOS
// @pragma('vm:entry-point')
// Future<bool> onIosBackground(ServiceInstance service) async {
//   WidgetsFlutterBinding.ensureInitialized();
//   DartPluginRegistrant.ensureInitialized();
//
//   return true;
// }

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
  for (;;) {
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
      debugPrint("1. Trying to connect to sse");
      Stream<SSEModel>? SSEConnection = null;
      SSEConnection = SSEClient.subscribeToSSE(
        url: SSE_BROADCAST,
        header: {"Accept": "text/event-stream"},
        method: SSERequestType.GET,
      );

      if (SSEConnection.runtimeType == Stream<SSEModel>) {
        debugPrint("2-OK. SSE session initiated.");
      } else {
        debugPrint("2-FAILED. Failed to get SSE session.");
        await Future.delayed(Duration(seconds: 5));
      }

      await for (final event in SSEConnection) {
        debugPrint('4. Received SSE event -> ${event.data}');
        _local.show(
          0,
          'Title',
          event.data,
          notificationDetails,
          payload: 'test_payload',
        );
      }
      // ** end untested
    } catch (e) {
      debugPrint('5. Caught SSE Error: $e\nTrying to reconnect.');
      await Future.delayed(Duration(seconds: 5));
    } finally {
      ;
    }

  }
}
// ===== ENTRY POINT =====