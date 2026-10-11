import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../services/backend_api_service.dart';
import '../../widgets/sparkline_widget.dart';
import '../../widgets/ios_switch.dart';
import '../../theme/app_colors.dart';

class BotStrategiesTab extends StatelessWidget {
  const BotStrategiesTab({super.key});

  @override
  Widget build(BuildContext context) {
    final backend = context.watch<BackendApiService>();
    final currencyFmt = NumberFormat('#,##0.00');

    final isRunning = backend.isBotRunning;
    final totalPnl = backend.totalRealizedPnl;
    final winRate = backend.winRate;
    final totalTrades = backend.totalTradesCount;

    final strategyDisplayName = backend.strategyName == 'bb_mean_reversion'
        ? 'Bollinger Bands Mean Reversion'
        : backend.strategyName == 'trend_following'
            ? 'EMA Momentum Trend Follower'
            : backend.strategyName;

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Real Engine Performance Overview Banner
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surfaceContainerHigh,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.surfaceContainerHighest),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.smart_toy, color: AppColors.primaryContainer, size: 18),
                        const SizedBox(width: 8),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Đội Hình Bot Thuật Toán', style: TextStyle(color: AppColors.onSurface, fontSize: 14, fontWeight: FontWeight.bold)),
                            Text('HỆ THỐNG ĐỊNH LƯỢNG (${backend.tradingMode.toUpperCase()})', style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 8, letterSpacing: 0.6)),
                          ],
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: AppColors.surfaceContainerLowest, borderRadius: BorderRadius.circular(10)),
                      child: Row(
                        children: [
                          Icon(Icons.circle, color: isRunning ? AppColors.bullish : AppColors.primaryContainer, size: 6),
                          const SizedBox(width: 4),
                          Text(
                            isRunning ? 'Đang Chạy' : 'Tạm Dừng',
                            style: TextStyle(color: isRunning ? AppColors.bullish : AppColors.primaryContainer, fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                // Real Metrics 3-Strip
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: AppColors.surfaceContainerLowest, borderRadius: BorderRadius.circular(10)),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('LÃI RÒNG THẬT', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 8, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 2),
                            Text(
                              '${totalPnl >= 0 ? '+' : ''}${currencyFmt.format(totalPnl)}',
                              style: TextStyle(
                                color: totalPnl >= 0 ? AppColors.bullish : AppColors.bearish,
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                fontFamily: 'monospace',
                              ),
                            ),
                            const Text('USDT Ròng', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 8)),
                          ],
                        ),
                      ),
                      Container(width: 1, height: 28, color: AppColors.surfaceContainerHigh),
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(left: 8),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('WIN RATE THẬT', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 8, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 2),
                              Text('${winRate.toStringAsFixed(1)}%', style: const TextStyle(color: AppColors.onSurface, fontSize: 13, fontWeight: FontWeight.bold, fontFamily: 'monospace')),
                              Text('$totalTrades Vòng Lệnh', style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 8)),
                            ],
                          ),
                        ),
                      ),
                      Container(width: 1, height: 28, color: AppColors.surfaceContainerHigh),
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(left: 8),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('VỊ THẾ MỞ', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 8, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 2),
                              Text('${backend.positions.length}', style: const TextStyle(color: AppColors.primaryContainer, fontSize: 13, fontWeight: FontWeight.bold, fontFamily: 'monospace')),
                              const Text('Tối đa 3 lệnh', style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 8)),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 12),

                // AI Market Regime Card
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceContainer,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.primaryContainer.withValues(alpha: 0.2)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.psychology, color: AppColors.primaryContainer, size: 14),
                          const SizedBox(width: 6),
                          Text('AI Market Regime: ${backend.regimeVn}', style: const TextStyle(color: AppColors.onSurface, fontSize: 11, fontWeight: FontWeight.bold)),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(backend.regimeRationale, style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 9, height: 1.3)),
                    ],
                  ),
                ),

                const SizedBox(height: 10),

                // Mini Sparkline
                const SparklineWidget(height: 32),

                const SizedBox(height: 12),

                // Toggle Bot Button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isRunning ? AppColors.surfaceContainerHighest : AppColors.primaryContainer,
                      foregroundColor: isRunning ? AppColors.onSurface : Colors.black,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: () => backend.toggleBot(!isRunning),
                    icon: Icon(isRunning ? Icons.pause_circle : Icons.play_circle, size: 18),
                    label: Text(
                      isRunning ? 'Tạm Dừng Thuật Toán' : 'Khởi Động Bot Giao Dịch',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 14),

          // 2. Real Active Strategy Card
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.surfaceContainerLow,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.surfaceContainerHigh),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(color: AppColors.surfaceContainer, borderRadius: BorderRadius.circular(8)),
                          alignment: Alignment.center,
                          child: const Text('⚡', style: TextStyle(fontSize: 16)),
                        ),
                        const SizedBox(width: 8),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(strategyDisplayName, style: const TextStyle(color: AppColors.onSurface, fontSize: 13, fontWeight: FontWeight.bold)),
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                  decoration: BoxDecoration(color: AppColors.surfaceContainer, borderRadius: BorderRadius.circular(3)),
                                  child: const Text('10x LEVERAGE', style: TextStyle(color: AppColors.primaryContainer, fontSize: 8, fontWeight: FontWeight.bold)),
                                ),
                              ],
                            ),
                            Text('Timeframe: ${backend.timeframe} • Scanner 200 Cặp', style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 9)),
                          ],
                        ),
                      ],
                    ),

                    // iOS Switch
                    IosSwitch(
                      value: isRunning,
                      onChanged: (val) => backend.toggleBot(val),
                    ),
                  ],
                ),

                const SizedBox(height: 10),

                // Real Parameter Chips
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: AppColors.surfaceContainerLowest, borderRadius: BorderRadius.circular(8)),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Chế Độ Quét:', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 9)),
                            const SizedBox(height: 2),
                            Text(
                              backend.autoScanAll ? 'Tự Động 200 Cặp' : 'Cố Định ${backend.symbol}',
                              style: const TextStyle(color: AppColors.onSurface, fontSize: 10, fontWeight: FontWeight.w600, fontFamily: 'monospace'),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Phiên Giao Dịch:', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 9)),
                            const SizedBox(height: 2),
                            Text(
                              backend.tradingMode.toUpperCase(),
                              style: const TextStyle(color: AppColors.primaryContainer, fontSize: 10, fontWeight: FontWeight.w600, fontFamily: 'monospace'),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 10),

                // Real PnL Bar
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(color: AppColors.surfaceContainerHigh, borderRadius: BorderRadius.circular(8)),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('LÃI PHIÊN HÔM NAY', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 8, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 2),
                          Text(
                            '${backend.realizedPnlToday >= 0 ? '+' : ''}${currencyFmt.format(backend.realizedPnlToday)} USDT',
                            style: TextStyle(
                              color: backend.realizedPnlToday >= 0 ? AppColors.bullish : AppColors.bearish,
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              fontFamily: 'monospace',
                            ),
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(color: AppColors.surfaceContainerLowest, borderRadius: BorderRadius.circular(4)),
                            child: Text('Win ${winRate.toStringAsFixed(0)}%', style: const TextStyle(color: AppColors.bullish, fontSize: 10, fontWeight: FontWeight.bold)),
                          ),
                          const SizedBox(height: 2),
                          Text('$totalTrades lệnh đã chốt', style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 9)),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
