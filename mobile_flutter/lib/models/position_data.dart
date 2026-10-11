class PositionData {
  final String symbol;
  final String side; // "LONG" or "SHORT"
  final double size;
  final int leverage;
  final double entryPrice;
  final double markPrice;
  final double liquidationPrice;
  final double unrealizedPnl;
  final double roePercent;
  final double margin;
  final double takeProfit;
  final double stopLoss;
  final double tpProgress; // 0.0 to 1.0

  PositionData({
    required this.symbol,
    required this.side,
    required this.size,
    required this.leverage,
    required this.entryPrice,
    required this.markPrice,
    required this.liquidationPrice,
    required this.unrealizedPnl,
    required this.roePercent,
    required this.margin,
    required this.takeProfit,
    required this.stopLoss,
    required this.tpProgress,
  });

  bool get isLong => side.toUpperCase() == 'LONG';

  factory PositionData.fromJson(Map<String, dynamic> json) {
    final entry = double.tryParse(json['entry_price']?.toString() ?? json['entryPrice']?.toString() ?? '') ?? 0.0;
    final mark = double.tryParse(json['mark_price']?.toString() ?? json['markPrice']?.toString() ?? '') ?? entry;
    final pnl = double.tryParse(json['unrealized_pnl']?.toString() ?? json['unRealizedProfit']?.toString() ?? '') ?? 0.0;
    final lev = int.tryParse(json['leverage']?.toString() ?? '') ?? 20;
    final sizeVal = double.tryParse(json['size']?.toString() ?? json['positionAmt']?.toString() ?? '') ?? 0.0;
    final marginVal = double.tryParse(json['initial_margin']?.toString() ?? json['initialMargin']?.toString() ?? '') ?? (entry * sizeVal.abs() / (lev > 0 ? lev : 1));
    final roe = marginVal > 0 ? (pnl / marginVal) * 100 : (double.tryParse(json['roe']?.toString() ?? '') ?? 0.0);

    final rawSide = json['side']?.toString() ?? (sizeVal >= 0 ? 'LONG' : 'SHORT');
    final tp = double.tryParse(json['take_profit']?.toString() ?? '') ?? (rawSide == 'LONG' ? entry * 1.025 : entry * 0.975);
    final sl = double.tryParse(json['stop_loss']?.toString() ?? '') ?? (rawSide == 'LONG' ? entry * 0.985 : entry * 1.015);
    final liq = double.tryParse(json['liquidation_price']?.toString() ?? json['liquidationPrice']?.toString() ?? '') ?? (rawSide == 'LONG' ? entry * (1 - 0.9 / lev) : entry * (1 + 0.9 / lev));

    double progress = 0.5;
    if (tp != entry) {
      progress = ((mark - entry) / (tp - entry)).clamp(0.0, 1.0);
    }

    return PositionData(
      symbol: json['symbol'] ?? 'BTCUSDT',
      side: rawSide.toUpperCase(),
      size: sizeVal.abs(),
      leverage: lev,
      entryPrice: entry,
      markPrice: mark,
      liquidationPrice: liq,
      unrealizedPnl: pnl,
      roePercent: roe,
      margin: marginVal,
      takeProfit: tp,
      stopLoss: sl,
      tpProgress: progress,
    );
  }
}
