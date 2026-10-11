import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/orderbook_data.dart';
import '../theme/app_colors.dart';

class OrderBookWidget extends StatelessWidget {
  final OrderBookData data;
  final double currentPrice;

  const OrderBookWidget({
    super.key,
    required this.data,
    required this.currentPrice,
  });

  @override
  Widget build(BuildContext context) {
    final currencyFormatter = NumberFormat('#,##0.00');
    final qtyFormatter = NumberFormat('0.000');

    double maxTotal = 1.0;
    for (var a in data.asks) {
      if (a.totalQuantity > maxTotal) maxTotal = a.totalQuantity;
    }
    for (var b in data.bids) {
      if (b.totalQuantity > maxTotal) maxTotal = b.totalQuantity;
    }

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.surfaceContainerHigh),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Orderbook Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.format_list_bulleted, color: AppColors.primaryContainer, size: 16),
                  const SizedBox(width: 6),
                  const Text(
                    'SỔ LỆNH L2 (BBO)',
                    style: TextStyle(
                      color: AppColors.onSurface,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainer,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  'Spread: \$${data.spread.toStringAsFixed(2)} (${data.spreadPercent.toStringAsFixed(4)}%)',
                  style: const TextStyle(
                    color: AppColors.onSurfaceVariant,
                    fontSize: 10,
                    fontFamily: 'monospace',
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 10),

          // Bid / Ask Pressure Gauge
          Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Bids: ${data.bidPressurePercent.toStringAsFixed(1)}%',
                    style: const TextStyle(color: AppColors.bullish, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    'Asks: ${(100 - data.bidPressurePercent).toStringAsFixed(1)}%',
                    style: const TextStyle(color: AppColors.bearish, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 3),
              ClipRRect(
                borderRadius: BorderRadius.circular(3),
                child: Row(
                  children: [
                    Expanded(
                      flex: (data.bidPressurePercent * 10).toInt().clamp(1, 999),
                      child: Container(height: 4, color: AppColors.bullish),
                    ),
                    Expanded(
                      flex: ((100 - data.bidPressurePercent) * 10).toInt().clamp(1, 999),
                      child: Container(height: 4, color: AppColors.bearish),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 10),

          // Columns Header
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('GIÁ (USDT)', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 10, fontWeight: FontWeight.bold)),
              Text('KHỐI LƯỢNG', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 10, fontWeight: FontWeight.bold)),
              Text('TÍCH LŨY', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 10, fontWeight: FontWeight.bold)),
            ],
          ),

          const SizedBox(height: 6),

          // Asks (Reverse so closest to mid-price is at bottom)
          ...data.asks.take(5).toList().reversed.map((ask) {
            final depthRatio = (ask.totalQuantity / maxTotal).clamp(0.05, 1.0);
            return Stack(
              children: [
                Positioned.fill(
                  child: Align(
                    alignment: Alignment.centerRight,
                    child: FractionallySizedBox(
                      widthFactor: depthRatio,
                      child: Container(color: AppColors.bearish.withValues(alpha: 0.12)),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2.5),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Text(
                            currencyFormatter.format(ask.price),
                            style: const TextStyle(color: AppColors.bearish, fontSize: 11, fontWeight: FontWeight.w600, fontFamily: 'monospace'),
                          ),
                          if (ask.isWall) ...[
                            const SizedBox(width: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 3, vertical: 1),
                              decoration: BoxDecoration(color: AppColors.bearish, borderRadius: BorderRadius.circular(2)),
                              child: const Text('WALL', style: TextStyle(color: Colors.white, fontSize: 7, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ],
                      ),
                      Text(qtyFormatter.format(ask.quantity), style: const TextStyle(color: AppColors.onSurface, fontSize: 11, fontFamily: 'monospace')),
                      Text(qtyFormatter.format(ask.totalQuantity), style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 11, fontFamily: 'monospace')),
                    ],
                  ),
                ),
              ],
            );
          }),

          // Middle Live Price Bar
          Container(
            margin: const EdgeInsets.symmetric(vertical: 4),
            padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
            decoration: BoxDecoration(
              color: AppColors.surfaceContainer,
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: AppColors.surfaceContainerHigh),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.arrow_upward, color: AppColors.bullish, size: 14),
                    const SizedBox(width: 4),
                    Text(
                      '\$${currencyFormatter.format(currentPrice > 0 ? currentPrice : data.bestBid)}',
                      style: const TextStyle(
                        color: AppColors.bullish,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ],
                ),
                const Text('Mark Price Live', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 10)),
              ],
            ),
          ),

          // Bids
          ...data.bids.take(5).map((bid) {
            final depthRatio = (bid.totalQuantity / maxTotal).clamp(0.05, 1.0);
            return Stack(
              children: [
                Positioned.fill(
                  child: Align(
                    alignment: Alignment.centerRight,
                    child: FractionallySizedBox(
                      widthFactor: depthRatio,
                      child: Container(color: AppColors.bullish.withValues(alpha: 0.12)),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2.5),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Text(
                            currencyFormatter.format(bid.price),
                            style: const TextStyle(color: AppColors.bullish, fontSize: 11, fontWeight: FontWeight.w600, fontFamily: 'monospace'),
                          ),
                          if (bid.isWall) ...[
                            const SizedBox(width: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 3, vertical: 1),
                              decoration: BoxDecoration(color: AppColors.bullish, borderRadius: BorderRadius.circular(2)),
                              child: const Text('WALL', style: TextStyle(color: Colors.black, fontSize: 7, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ],
                      ),
                      Text(qtyFormatter.format(bid.quantity), style: const TextStyle(color: AppColors.onSurface, fontSize: 11, fontFamily: 'monospace')),
                      Text(qtyFormatter.format(bid.totalQuantity), style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 11, fontFamily: 'monospace')),
                    ],
                  ),
                ),
              ],
            );
          }),
        ],
      ),
    );
  }
}
