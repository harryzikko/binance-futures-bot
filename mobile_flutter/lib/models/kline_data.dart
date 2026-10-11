class KlineData {
  final DateTime openTime;
  final double open;
  final double high;
  final double low;
  final double close;
  final double volume;
  final DateTime closeTime;

  KlineData({
    required this.openTime,
    required this.open,
    required this.high,
    required this.low,
    required this.close,
    required this.volume,
    required this.closeTime,
  });

  bool get isBullish => close >= open;

  factory KlineData.fromBinanceList(List<dynamic> list) {
    // [openTime, open, high, low, close, volume, closeTime, ...]
    final openTimeMs = int.tryParse(list[0]?.toString() ?? '') ?? 0;
    final closeTimeMs = int.tryParse(list[6]?.toString() ?? '') ?? 0;

    return KlineData(
      openTime: DateTime.fromMillisecondsSinceEpoch(openTimeMs),
      open: double.tryParse(list[1]?.toString() ?? '') ?? 0.0,
      high: double.tryParse(list[2]?.toString() ?? '') ?? 0.0,
      low: double.tryParse(list[3]?.toString() ?? '') ?? 0.0,
      close: double.tryParse(list[4]?.toString() ?? '') ?? 0.0,
      volume: double.tryParse(list[5]?.toString() ?? '') ?? 0.0,
      closeTime: DateTime.fromMillisecondsSinceEpoch(closeTimeMs),
    );
  }
}
