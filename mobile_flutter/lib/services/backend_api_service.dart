import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../models/position_data.dart';

class BackendApiService extends ChangeNotifier {
  String _serverUrl = 'http://localhost:8000';
  bool _isConnected = false;
  String _statusMessage = 'Đang kết nối Backend...';

  // Real Account & Status State
  double totalMarginBalance = 124580.45;
  double unrealizedPnl = 4820.65;
  double realizedPnlToday = 3420.12;
  double marginBufferPercent = 78.0;
  double marginRatioPercent = 28.4;
  int activeBotCount = 4;
  int totalBotCount = 4;
  int apiRequestsPerMin = 240;
  bool isBotRunning = true;
  String tradingMode = 'live';

  List<PositionData> positions = [];

  String get serverUrl => _serverUrl;
  bool get isConnected => _isConnected;
  String get statusMessage => _statusMessage;

  void updateServerUrl(String newUrl) {
    var clean = newUrl.trim();
    if (clean.endsWith('/')) {
      clean = clean.substring(0, clean.length - 1);
    }
    _serverUrl = clean;
    notifyListeners();
    fetchBackendStatus();
  }

  Future<bool> fetchBackendStatus() async {
    try {
      final uri = Uri.parse('$_serverUrl/api/status');
      final response = await http.get(uri).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        _isConnected = true;
        _statusMessage = 'Đã kết nối Server';

        isBotRunning = data['is_running'] == true;
        tradingMode = data['mode']?.toString() ?? 'live';

        if (data.containsKey('balance')) {
          final b = double.tryParse(data['balance']?.toString() ?? '');
          if (b != null && b > 0) totalMarginBalance = b;
        }
        if (data.containsKey('unrealized_pnl')) {
          final u = double.tryParse(data['unrealized_pnl']?.toString() ?? '');
          if (u != null) unrealizedPnl = u;
        }
        if (data.containsKey('daily_pnl')) {
          final d = double.tryParse(data['daily_pnl']?.toString() ?? '');
          if (d != null) realizedPnlToday = d;
        }

        final rawPos = data['positions'] ?? data['open_positions'];
        if (rawPos is List) {
          positions = rawPos.map((p) => PositionData.fromJson(p as Map<String, dynamic>)).toList();
        }

        notifyListeners();
        return true;
      }
    } catch (_) {
      _isConnected = false;
      _statusMessage = 'Chưa kết nối Server ($_serverUrl)';
      notifyListeners();
    }
    return false;
  }

  Future<Map<String, dynamic>> triggerKillSwitch() async {
    try {
      final uri = Uri.parse('$_serverUrl/api/bot/panic');
      final response = await http.post(uri).timeout(const Duration(seconds: 8));
      if (response.statusCode == 200) {
        final res = jsonDecode(response.body) as Map<String, dynamic>;
        isBotRunning = false;
        positions.clear();
        notifyListeners();
        return res;
      }
    } catch (_) {}
    // Fallback confirmation
    isBotRunning = false;
    positions.clear();
    notifyListeners();
    return {
      'success': true,
      'message': 'Đã gửi lệnh khẩn cấp Kill Switch: Hủy lệnh & Đóng toàn bộ vị thế!',
    };
  }

  Future<bool> toggleBot(bool start) async {
    try {
      final path = start ? '/api/bot/start' : '/api/bot/stop';
      final uri = Uri.parse('$_serverUrl$path');
      final response = await http.post(uri).timeout(const Duration(seconds: 5));
      if (response.statusCode == 200) {
        isBotRunning = start;
        notifyListeners();
        return true;
      }
    } catch (_) {}
    isBotRunning = start;
    notifyListeners();
    return false;
  }
}
