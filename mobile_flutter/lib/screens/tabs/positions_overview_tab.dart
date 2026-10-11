import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../services/backend_api_service.dart';
import '../../services/binance_api_service.dart';
import '../../models/position_data.dart';
import '../../theme/app_colors.dart';

class PositionsOverviewTab extends StatefulWidget {
  final BinanceApiService binanceService;

  const PositionsOverviewTab({super.key, required this.binanceService});

  @override
  State<PositionsOverviewTab> createState() => _PositionsOverviewTabState();
}

class _PositionsOverviewTabState extends State<PositionsOverviewTab> {
  final currencyFmt = NumberFormat('#,##0.00');

  void _showEmergencyDialog(BuildContext context, BackendApiService backend) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surfaceContainerLow,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.warning, color: AppColors.bearish, size: 24),
            SizedBox(width: 8),
            Text('XÁC NHẬN ĐÓNG HẾT', style: TextStyle(color: AppColors.onSurface, fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Text(
          'Hành động này sẽ gửi lệnh đóng ngay toàn bộ ${backend.positions.length} vị thế thật theo giá thị trường (Market) và tạm dừng bot. Bạn có chắc chắn không?',
          style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Hủy', style: TextStyle(color: AppColors.onSurfaceVariant)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.bearish),
            onPressed: () {
              Navigator.pop(ctx);
              backend.triggerKillSwitch();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  backgroundColor: AppColors.bearish,
                  content: Text('Đã kích hoạt đóng khẩn cấp toàn bộ vị thế trên Binance!'),
                ),
              );
            },
            child: const Text('Đồng Ý Đóng', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final backend = context.watch<BackendApiService>();
    final positions = backend.positions;

    final totalBalance = backend.totalMarginBalance;
    final uPnl = backend.unrealizedPnl;
    final realizedToday = backend.realizedPnlToday;
    final marginUsed = backend.marginUsed;
    final marginBuffer = backend.marginBufferPercent;

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Master Account Overview Card (100% Real Data)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surfaceContainerLow,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.surfaceContainerHigh),
              boxShadow: const [
                BoxShadow(color: Colors.black45, blurRadius: 10, offset: Offset(0, 4)),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header Meta
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.account_balance_wallet, color: AppColors.primaryContainer, size: 16),
                        const SizedBox(width: 6),
                        Text(
                          'TỔNG TÀI SẢN KÝ QUỸ (${backend.tradingMode.toUpperCase()})',
                          style: const TextStyle(
                            color: AppColors.onSurfaceVariant,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.8,
                          ),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceContainerHigh,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: backend.isConnected ? AppColors.bullish : AppColors.primaryContainer,
                            ),
                          ),
                          const SizedBox(width: 5),
                          Text(
                            backend.isConnected ? 'Live ${widget.binanceService.lastPingMs}ms' : 'Offline',
                            style: TextStyle(
                              color: backend.isConnected ? AppColors.bullish : AppColors.primaryContainer,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 10),

                // Main Real Balance
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      currencyFmt.format(totalBalance),
                      style: const TextStyle(
                        color: AppColors.onSurface,
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        fontFamily: 'monospace',
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(width: 6),
                    const Text(
                      'USDT',
                      style: TextStyle(
                        color: AppColors.primaryContainer,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                // PnL 2-Grid (100% Real from Backend Engine)
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceContainer,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Lãi Chưa Chốt (uPnL)', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 10)),
                                Icon(
                                  uPnl >= 0 ? Icons.trending_up : Icons.trending_down,
                                  color: uPnl >= 0 ? AppColors.bullish : AppColors.bearish,
                                  size: 14,
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${uPnl >= 0 ? '+' : ''}${currencyFmt.format(uPnl)} USDT',
                              style: TextStyle(
                                color: uPnl >= 0 ? AppColors.bullish : AppColors.bearish,
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                fontFamily: 'monospace',
                              ),
                            ),
                            const SizedBox(height: 2),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                              decoration: BoxDecoration(
                                color: uPnl >= 0 ? AppColors.bullishBg : AppColors.bearishBg,
                                borderRadius: BorderRadius.circular(3),
                              ),
                              child: Text(
                                '${totalBalance > 0 ? ((uPnl / totalBalance) * 100).toStringAsFixed(2) : '0.00'}% ROE',
                                style: TextStyle(
                                  color: uPnl >= 0 ? AppColors.bullish : AppColors.bearish,
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceContainer,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('Đã Chốt Hôm Nay', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 10)),
                                Icon(Icons.done_all, color: AppColors.primaryContainer, size: 14),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${realizedToday >= 0 ? '+' : ''}${currencyFmt.format(realizedToday)} USDT',
                              style: TextStyle(
                                color: realizedToday >= 0 ? AppColors.bullish : AppColors.bearish,
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                fontFamily: 'monospace',
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Phiên ${backend.tradingMode}',
                              style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 9),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                // Margin Buffer Progress
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceContainer,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.verified_user, color: AppColors.bullish, size: 14),
                              SizedBox(width: 5),
                              Text('Đệm Thanh Lý (Margin Buffer)', style: TextStyle(color: AppColors.onSurface, fontSize: 11, fontWeight: FontWeight.bold)),
                            ],
                          ),
                          Text(
                            '${marginBuffer > 70 ? 'RẤT AN TOÀN' : 'CẢNH BÁO'} (${marginBuffer.toStringAsFixed(1)}%)',
                            style: TextStyle(
                              color: marginBuffer > 70 ? AppColors.bullish : AppColors.primaryContainer,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(3),
                        child: LinearProgressIndicator(
                          value: (marginBuffer / 100).clamp(0.0, 1.0),
                          backgroundColor: AppColors.surfaceContainerHighest,
                          valueColor: AlwaysStoppedAnimation(marginBuffer > 70 ? AppColors.bullish : AppColors.primaryContainer),
                          minHeight: 5,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Ký Quỹ Đang Dùng: ${currencyFmt.format(marginUsed)} USDT', style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 9, fontFamily: 'monospace')),
                          Text('Khả Dụng: ${currencyFmt.format(backend.availableMargin)} USDT', style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 9, fontFamily: 'monospace')),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 12),

                // 3 Action Buttons
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.errorContainer,
                          foregroundColor: AppColors.onErrorContainer,
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        onPressed: positions.isEmpty ? null : () => _showEmergencyDialog(context, backend),
                        icon: const Icon(Icons.cancel, size: 14),
                        label: const Text('Đóng Hết', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.surfaceContainerHigh,
                          foregroundColor: AppColors.onSurface,
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        onPressed: () {
                          backend.fetchBackendStatus();
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Đang làm mới dữ liệu từ server backend...'), duration: Duration(seconds: 1)),
                          );
                        },
                        icon: const Icon(Icons.refresh, color: AppColors.primaryContainer, size: 14),
                        label: const Text('Làm Mới', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.bearish,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        onPressed: () => _showEmergencyDialog(context, backend),
                        icon: const Icon(Icons.power_settings_new, size: 14),
                        label: const Text('Kill Switch', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // 2. Real Telemetry Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.surfaceContainerLow,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.surfaceContainerHigh),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(color: AppColors.surfaceContainerHigh, borderRadius: BorderRadius.circular(6)),
                      child: const Icon(Icons.smart_toy, color: AppColors.primaryContainer, size: 16),
                    ),
                    const SizedBox(width: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              backend.isBotRunning ? 'Bot Đang Hoạt Động' : 'Bot Đang Tạm Dừng',
                              style: const TextStyle(color: AppColors.onSurface, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                              decoration: BoxDecoration(
                                color: backend.isBotRunning ? AppColors.bullishBg : AppColors.primaryContainer.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(3),
                              ),
                              child: Text(
                                backend.isBotRunning ? 'RUNNING' : 'STANDBY',
                                style: TextStyle(
                                  color: backend.isBotRunning ? AppColors.bullish : AppColors.primaryContainer,
                                  fontSize: 8,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                        Text(
                          'Chiến lược: ${backend.strategyName} • Mode ${backend.tradingMode}',
                          style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 9),
                        ),
                      ],
                    ),
                  ],
                ),
                Text(
                  '${positions.length} vị thế\nWin ${backend.winRate.toStringAsFixed(0)}%',
                  textAlign: TextAlign.right,
                  style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 9, fontFamily: 'monospace'),
                ),
              ],
            ),
          ),

          const SizedBox(height: 14),

          // 3. Section Header: Real Active Positions
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.stacked_line_chart, color: AppColors.primaryContainer, size: 16),
                  const SizedBox(width: 6),
                  const Text('Vị Thế Đang Mở', style: TextStyle(color: AppColors.onSurface, fontSize: 14, fontWeight: FontWeight.bold)),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                    decoration: BoxDecoration(color: AppColors.surfaceContainerHigh, borderRadius: BorderRadius.circular(10)),
                    child: Text('${positions.length}', style: const TextStyle(color: AppColors.primaryContainer, fontSize: 10, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
              Text(
                backend.regimeVn,
                style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 10),
              ),
            ],
          ),

          const SizedBox(height: 8),

          // 4. Real Position Cards or Clean Empty State
          if (positions.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.surfaceContainerLow,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.surfaceContainerHigh),
              ),
              child: Column(
                children: [
                  const Icon(Icons.verified_user, color: AppColors.bullish, size: 36),
                  const SizedBox(height: 8),
                  const Text('Không Có Vị Thế Nào Đang Mở', style: TextStyle(color: AppColors.onSurface, fontSize: 14, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text(
                    backend.isBotRunning
                        ? 'Bot thuật toán đang quét 200 cặp Binance Futures và tự động mở vị thế khi phát hiện tín hiệu an toàn.'
                        : 'Tất cả vốn đang an toàn 100%. Bật bot để bắt đầu quét và giao dịch tự động.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 11, height: 1.4),
                  ),
                ],
              ),
            )
          else
            ...positions.map((pos) => _buildPositionCard(pos)),
        ],
      ),
    );
  }

  Widget _buildPositionCard(PositionData pos) {
    final isLong = pos.isLong;
    final sideColor = isLong ? AppColors.bullish : AppColors.bearish;
    final cleanSymbol = pos.symbol.split('/')[0].split(':')[0].replaceAll('USDT', '');

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.surfaceContainerHigh),
      ),
      child: Column(
        children: [
          // Header Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 26,
                    height: 26,
                    decoration: BoxDecoration(color: AppColors.surfaceContainer, borderRadius: BorderRadius.circular(6)),
                    alignment: Alignment.center,
                    child: Text(
                      cleanSymbol.startsWith('BTC') ? '₿' : cleanSymbol.startsWith('ETH') ? 'Ξ' : '◆',
                      style: const TextStyle(color: AppColors.primaryContainer, fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(pos.symbol, style: const TextStyle(color: AppColors.onSurface, fontSize: 13, fontWeight: FontWeight.bold)),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                            decoration: BoxDecoration(color: sideColor.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(3)),
                            child: Text(
                              '${pos.side} ${pos.leverage}x',
                              style: TextStyle(color: sideColor, fontSize: 9, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                      Text('Khối lượng: ${pos.size} $cleanSymbol', style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 9)),
                    ],
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${pos.unrealizedPnl >= 0 ? '+' : ''}${currencyFmt.format(pos.unrealizedPnl)} USDT',
                    style: TextStyle(color: sideColor, fontSize: 12, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                  ),
                  Text(
                    '${pos.roePercent >= 0 ? '+' : ''}${pos.roePercent.toStringAsFixed(2)}% ROE',
                    style: TextStyle(color: sideColor, fontSize: 10, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 8),

          // Price Matrix Row
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: AppColors.surfaceContainer, borderRadius: BorderRadius.circular(8)),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildPriceCol('GIÁ VÀO', currencyFmt.format(pos.entryPrice)),
                _buildPriceCol('MARK PRICE', currencyFmt.format(pos.markPrice), color: sideColor),
                _buildPriceCol('GIÁ THANH LÝ', pos.liquidationPrice > 0 ? currencyFmt.format(pos.liquidationPrice) : 'N/A', color: AppColors.bearish),
              ],
            ),
          ),

          const SizedBox(height: 8),

          // TP / SL Progress
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('SL: \$${currencyFmt.format(pos.stopLoss)}', style: const TextStyle(color: AppColors.bearish, fontSize: 9, fontFamily: 'monospace')),
                  Text('TP: \$${currencyFmt.format(pos.takeProfit)}', style: const TextStyle(color: AppColors.bullish, fontSize: 9, fontFamily: 'monospace')),
                ],
              ),
              const SizedBox(height: 3),
              ClipRRect(
                borderRadius: BorderRadius.circular(2),
                child: LinearProgressIndicator(
                  value: pos.tpProgress,
                  backgroundColor: AppColors.surfaceContainerHighest,
                  valueColor: AlwaysStoppedAnimation(sideColor),
                  minHeight: 4,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPriceCol(String label, String value, {Color? color}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 8, fontWeight: FontWeight.bold)),
        const SizedBox(height: 2),
        Text(value, style: TextStyle(color: color ?? AppColors.onSurface, fontSize: 10, fontWeight: FontWeight.w600, fontFamily: 'monospace')),
      ],
    );
  }
}
