import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/ticker_data.dart';
import '../models/kline_data.dart';
import '../models/orderbook_data.dart';

class BinanceApiService {
  static const String baseUrl = 'https://fapi.binance.com';
  int lastPingMs = 18;

  Future<TickerData> getTicker(String symbol) async {
    final sw = Stopwatch()..start();
    try {
      final tickerUri = Uri.parse('$baseUrl/fapi/v1/ticker/24hr?symbol=$symbol');
      final premiumUri = Uri.parse('$baseUrl/fapi/v1/premiumIndex?symbol=$symbol');

      final responses = await Future.wait([
        http.get(tickerUri).timeout(const Duration(seconds: 5)),
        http.get(premiumUri).timeout(const Duration(seconds: 5)),
      ]);

      sw.stop();
      lastPingMs = sw.elapsedMilliseconds;

      if (responses[0].statusCode == 200) {
        final tickerJson = jsonDecode(responses[0].body) as Map<String, dynamic>;
        Map<String, dynamic>? premiumJson;
        if (responses[1].statusCode == 200) {
          premiumJson = jsonDecode(responses[1].body) as Map<String, dynamic>;
        }
        return TickerData.from24HrJson(tickerJson, premiumJson: premiumJson);
      }
    } catch (_) {}
    return TickerData.initial(symbol);
  }

  Future<List<KlineData>> getKlines(String symbol, {String interval = '15m', int limit = 40}) async {
    try {
      final uri = Uri.parse('$baseUrl/fapi/v1/klines?symbol=$symbol&interval=$interval&limit=$limit');
      final response = await http.get(uri).timeout(const Duration(seconds: 6));
      if (response.statusCode == 200) {
        final list = jsonDecode(response.body) as List<dynamic>;
        return list.map((item) => KlineData.fromBinanceList(item as List<dynamic>)).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<OrderBookData> getOrderBook(String symbol, {int limit = 20}) async {
    try {
      final uri = Uri.parse('$baseUrl/fapi/v1/depth?symbol=$symbol&limit=$limit');
      final response = await http.get(uri).timeout(const Duration(seconds: 5));
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        return OrderBookData.fromDepthJson(json);
      }
    } catch (_) {}
    return OrderBookData.initial();
  }
}
