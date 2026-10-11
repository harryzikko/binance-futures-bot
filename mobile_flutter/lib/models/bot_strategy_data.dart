class BotStrategyData {
  final String id;
  final String name;
  final String symbol;
  final String type; // Futures Grid, DCA Martingale, Trend Scalper, Arbitrage
  final String leverageStr; // "20x CROSS"
  final String runtime; // "14 ngày 6 giờ"
  final String param1Label;
  final String param1Value;
  final String param2Label;
  final String param2Value;
  final double todayPnl;
  final double pnlPercent;
  final int apyPercent;
  final String progressLabel;
  final double progress; // 0.0 to 1.0
  bool isEnabled;

  BotStrategyData({
    required this.id,
    required this.name,
    required this.symbol,
    required this.type,
    required this.leverageStr,
    required this.runtime,
    required this.param1Label,
    required this.param1Value,
    required this.param2Label,
    required this.param2Value,
    required this.todayPnl,
    required this.pnlPercent,
    required this.apyPercent,
    required this.progressLabel,
    required this.progress,
    this.isEnabled = true,
  });
}
