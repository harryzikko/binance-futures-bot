class OrderBookLevel {
  final double price;
  final double quantity;
  final double totalQuantity;
  final bool isWall;

  OrderBookLevel({
    required this.price,
    required this.quantity,
    required this.totalQuantity,
    this.isWall = false,
  });
}

class OrderBookData {
  final List<OrderBookLevel> bids;
  final List<OrderBookLevel> asks;
  final double bestBid;
  final double bestAsk;
  final double spread;
  final double spreadPercent;
  final double bidPressurePercent;

  OrderBookData({
    required this.bids,
    required this.asks,
    required this.bestBid,
    required this.bestAsk,
    required this.spread,
    required this.spreadPercent,
    required this.bidPressurePercent,
  });

  factory OrderBookData.fromDepthJson(Map<String, dynamic> json) {
    final rawBids = (json['bids'] as List<dynamic>? ?? []);
    final rawAsks = (json['asks'] as List<dynamic>? ?? []);

    double bidAccum = 0.0;
    double askAccum = 0.0;

    double maxBidQty = 0.0;
    double maxAskQty = 0.0;

    for (var b in rawBids) {
      final q = double.tryParse(b[1]?.toString() ?? '') ?? 0.0;
      if (q > maxBidQty) maxBidQty = q;
    }
    for (var a in rawAsks) {
      final q = double.tryParse(a[1]?.toString() ?? '') ?? 0.0;
      if (q > maxAskQty) maxAskQty = q;
    }

    final List<OrderBookLevel> parsedBids = [];
    for (var b in rawBids.take(10)) {
      final p = double.tryParse(b[0]?.toString() ?? '') ?? 0.0;
      final q = double.tryParse(b[1]?.toString() ?? '') ?? 0.0;
      bidAccum += q;
      final isWall = maxBidQty > 0 && q >= maxBidQty * 0.75;
      parsedBids.add(OrderBookLevel(price: p, quantity: q, totalQuantity: bidAccum, isWall: isWall));
    }

    final List<OrderBookLevel> parsedAsks = [];
    for (var a in rawAsks.take(10)) {
      final p = double.tryParse(a[0]?.toString() ?? '') ?? 0.0;
      final q = double.tryParse(a[1]?.toString() ?? '') ?? 0.0;
      askAccum += q;
      final isWall = maxAskQty > 0 && q >= maxAskQty * 0.75;
      parsedAsks.add(OrderBookLevel(price: p, quantity: q, totalQuantity: askAccum, isWall: isWall));
    }

    final bestBid = parsedBids.isNotEmpty ? parsedBids.first.price : 0.0;
    final bestAsk = parsedAsks.isNotEmpty ? parsedAsks.first.price : 0.0;
    final spread = (bestAsk > 0 && bestBid > 0) ? (bestAsk - bestBid) : 0.0;
    final spreadPercent = bestBid > 0 ? (spread / bestBid) * 100 : 0.0;

    final totalVolume = bidAccum + askAccum;
    final bidPressure = totalVolume > 0 ? (bidAccum / totalVolume) * 100 : 50.0;

    return OrderBookData(
      bids: parsedBids,
      asks: parsedAsks,
      bestBid: bestBid,
      bestAsk: bestAsk,
      spread: spread,
      spreadPercent: spreadPercent,
      bidPressurePercent: bidPressure,
    );
  }

  factory OrderBookData.initial() {
    return OrderBookData(
      bids: [],
      asks: [],
      bestBid: 95680.0,
      bestAsk: 95680.5,
      spread: 0.5,
      spreadPercent: 0.0005,
      bidPressurePercent: 54.2,
    );
  }
}
