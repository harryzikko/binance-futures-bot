import 'dart:math';
import 'package:flutter/material.dart';
import '../models/kline_data.dart';
import '../theme/app_colors.dart';

class CandlestickChart extends StatelessWidget {
  final List<KlineData> klines;
  final double currentPrice;
  final bool showEma;
  final bool showGridBands;

  const CandlestickChart({
    super.key,
    required this.klines,
    required this.currentPrice,
    this.showEma = true,
    this.showGridBands = true,
  });

  @override
  Widget build(BuildContext context) {
    if (klines.isEmpty) {
      return Container(
        height: 220,
        decoration: BoxDecoration(
          color: AppColors.surfaceContainerLowest,
          borderRadius: BorderRadius.circular(10),
        ),
        child: const Center(
          child: CircularProgressIndicator(color: AppColors.primaryContainer),
        ),
      );
    }

    return Container(
      height: 220,
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.surfaceContainerHigh),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: CustomPaint(
          painter: _CandlePainter(
            klines: klines,
            currentPrice: currentPrice,
            showEma: showEma,
            showGridBands: showGridBands,
          ),
        ),
      ),
    );
  }
}

class _CandlePainter extends CustomPainter {
  final List<KlineData> klines;
  final double currentPrice;
  final bool showEma;
  final bool showGridBands;

  _CandlePainter({
    required this.klines,
    required this.currentPrice,
    required this.showEma,
    required this.showGridBands,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (klines.isEmpty) return;

    double minPrice = double.infinity;
    double maxPrice = -double.infinity;
    double maxVol = 0.0;

    for (var k in klines) {
      if (k.low < minPrice) minPrice = k.low;
      if (k.high > maxPrice) maxPrice = k.high;
      if (k.volume > maxVol) maxVol = k.volume;
    }

    if (minPrice >= maxPrice) {
      minPrice -= 10;
      maxPrice += 10;
    }

    // Add 5% padding to price bounds
    final pricePadding = (maxPrice - minPrice) * 0.08;
    minPrice -= pricePadding;
    maxPrice += pricePadding;

    final chartHeight = size.height * 0.76;
    final volHeight = size.height * 0.22;
    final volTop = size.height * 0.78;

    // 1. Draw Grid Lines
    final gridPaint = Paint()
      ..color = AppColors.surfaceContainerHigh.withValues(alpha: 0.5)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    for (int i = 1; i <= 3; i++) {
      final y = chartHeight * (i / 4);
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    final candleCount = klines.length;
    final candleWidth = (size.width / candleCount).clamp(3.0, 16.0);
    final spacing = (size.width - (candleWidth * candleCount)) / (candleCount + 1);

    final List<Offset> ema7Points = [];
    final List<Offset> ema25Points = [];

    double ema7 = klines.first.close;
    double ema25 = klines.first.close;
    const k7 = 2.0 / (7 + 1);
    const k25 = 2.0 / (25 + 1);

    for (int i = 0; i < candleCount; i++) {
      final k = klines[i];
      final x = spacing + i * (candleWidth + spacing) + candleWidth / 2;

      // Calculate EMAs
      ema7 = (k.close * k7) + (ema7 * (1 - k7));
      ema25 = (k.close * k25) + (ema25 * (1 - k25));

      final ema7Y = chartHeight - ((ema7 - minPrice) / (maxPrice - minPrice) * chartHeight);
      final ema25Y = chartHeight - ((ema25 - minPrice) / (maxPrice - minPrice) * chartHeight);
      ema7Points.add(Offset(x, ema7Y));
      ema25Points.add(Offset(x, ema25Y));

      // 2. Volume Bar
      final volBarH = maxVol > 0 ? (k.volume / maxVol * volHeight).clamp(2.0, volHeight) : 2.0;
      final volRect = Rect.fromLTWH(
        x - candleWidth / 2,
        size.height - volBarH,
        candleWidth,
        volBarH,
      );
      final volColor = k.isBullish ? AppColors.bullish.withValues(alpha: 0.35) : AppColors.bearish.withValues(alpha: 0.35);
      canvas.drawRect(volRect, Paint()..color = volColor);

      // 3. Candlestick Wick
      final highY = chartHeight - ((k.high - minPrice) / (maxPrice - minPrice) * chartHeight);
      final lowY = chartHeight - ((k.low - minPrice) / (maxPrice - minPrice) * chartHeight);
      final candleColor = k.isBullish ? AppColors.bullish : AppColors.bearish;

      final wickPaint = Paint()
        ..color = candleColor
        ..strokeWidth = 1.2;
      canvas.drawLine(Offset(x, highY), Offset(x, lowY), wickPaint);

      // 4. Candlestick Body
      final openY = chartHeight - ((k.open - minPrice) / (maxPrice - minPrice) * chartHeight);
      final closeY = chartHeight - ((k.close - minPrice) / (maxPrice - minPrice) * chartHeight);
      final topY = min(openY, closeY);
      final bodyHeight = max((openY - closeY).abs(), 1.5);

      final bodyRect = Rect.fromLTWH(
        x - candleWidth / 2,
        topY,
        candleWidth,
        bodyHeight,
      );
      canvas.drawRect(bodyRect, Paint()..color = candleColor);
    }

    // 5. Draw EMA lines
    if (showEma && ema7Points.length > 1) {
      final ema7Path = Path()..moveTo(ema7Points.first.dx, ema7Points.first.dy);
      for (var pt in ema7Points.skip(1)) {
        ema7Path.lineTo(pt.dx, pt.dy);
      }
      canvas.drawPath(
        ema7Path,
        Paint()
          ..color = AppColors.primaryContainer
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1.4,
      );

      final ema25Path = Path()..moveTo(ema25Points.first.dx, ema25Points.first.dy);
      for (var pt in ema25Points.skip(1)) {
        ema25Path.lineTo(pt.dx, pt.dy);
      }
      canvas.drawPath(
        ema25Path,
        Paint()
          ..color = AppColors.secondary
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1.4,
      );
    }

    // 6. Draw Grid Bands Overlays
    if (showGridBands) {
      final gridUpperY = chartHeight * 0.22;
      final gridLowerY = chartHeight * 0.78;

      final bandPaint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.0;

      // Sell grid line (red)
      bandPaint.color = AppColors.bearish.withValues(alpha: 0.6);
      canvas.drawLine(Offset(0, gridUpperY), Offset(size.width, gridUpperY), bandPaint);

      // Buy grid line (green)
      bandPaint.color = AppColors.bullish.withValues(alpha: 0.6);
      canvas.drawLine(Offset(0, gridLowerY), Offset(size.width, gridLowerY), bandPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _CandlePainter oldDelegate) => true;
}
