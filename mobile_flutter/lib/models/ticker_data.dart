class TickerData {
  final String symbol;
  final double lastPrice;
  final double priceChangePercent;
  final double highPrice;
  final double lowPrice;
  final double volume;
  final double quoteVolume;
  final double markPrice;
  final double indexPrice;
  final double fundingRate;
  final DateTime nextFundingTime;

  TickerData({
    required this.symbol,
    required this.lastPrice,
    required this.priceChangePercent,
    required this.highPrice,
    required this.lowPrice,
    required this.volume,
    required this.quoteVolume,
    required this.markPrice,
    required this.indexPrice,
    required this.fundingRate,
    required this.nextFundingTime,
  });

  factory TickerData.from24HrJson(Map<String, dynamic> json, {Map<String, dynamic>? premiumJson}) {
    final mark = premiumJson != null ? double.tryParse(premiumJson['markPrice']?.toString() ?? '') ?? 0.0 : 0.0;
    final index = premiumJson != null ? double.tryParse(premiumJson['indexPrice']?.toString() ?? '') ?? 0.0 : 0.0;
    final funding = premiumJson != null ? double.tryParse(premiumJson['lastFundingRate']?.toString() ?? '') ?? 0.0 : 0.0;
    final nextFundingMs = premiumJson != null ? int.tryParse(premiumJson['nextFundingTime']?.toString() ?? '') ?? 0 : 0;

    final price = double.tryParse(json['lastPrice']?.toString() ?? '') ?? 0.0;

    return TickerData(
      symbol: json['symbol'] ?? 'BTCUSDT',
      lastPrice: price,
      priceChangePercent: double.tryParse(json['priceChangePercent']?.toString() ?? '') ?? 0.0,
      highPrice: double.tryParse(json['highPrice']?.toString() ?? '') ?? 0.0,
      lowPrice: double.tryParse(json['lowPrice']?.toString() ?? '') ?? 0.0,
      volume: double.tryParse(json['volume']?.toString() ?? '') ?? 0.0,
      quoteVolume: double.tryParse(json['quoteVolume']?.toString() ?? '') ?? 0.0,
      markPrice: mark > 0 ? mark : price,
      indexPrice: index > 0 ? index : price,
      fundingRate: funding,
      nextFundingTime: nextFundingMs > 0 ? DateTime.fromMillisecondsSinceEpoch(nextFundingMs) : DateTime.now().add(const Duration(hours: 4)),
    );
  }

  factory TickerData.initial(String symbol) {
    return TickerData(
      symbol: symbol,
      lastPrice: 95680.50,
      priceChangePercent: 2.45,
      highPrice: 96240.00,
      lowPrice: 93820.00,
      volume: 42912.0,
      quoteVolume: 4105000000.0,
      markPrice: 95680.50,
      indexPrice: 95678.92,
      fundingRate: 0.0001,
      nextFundingTime: DateTime.now().add(const Duration(hours: 3, minutes: 12)),
    );
  }
}
