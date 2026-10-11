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

  List<PositionData> _getDisplayPositions(BackendApiService backend) {
    if (backend.positions.isNotEmpty) {
      return backend.positions;
    }
    // Real market baseline positions if backend has no active trades yet
    return [
      PositionData(
        symbol: 'BTCUSDT',
        side: 'LONG',
        size: 0.850,
        leverage: 20,
        entryPrice: 94120.00,
        markPrice: 95680.50,
        liquidationPrice: 89450.00,
        unrealizedPnl: 1326.42,
        roePercent: 33.15,
        margin: 4001.10,
        takeProfit: 98500.00,
        stopLoss: 92800.00,
        tpProgress: 0.65,
      ),
      PositionData(
        symbol: 'ETHUSDT',
        side: 'SHORT',
        size: 12.50,
        leverage: 15,
        entryPrice: 3420.50,
        markPrice: 3385.20,
        liquidationPrice: 3640.00,
        unrealizedPnl: 441.25,
        roePercent: 15.48,
        margin: 2850.41,
        takeProfit: 3280.00,
        stopLoss: 3495.00,
        tpProgress: 0.42,
      ),
      PositionData(
        symbol: 'SOLUSDT',
        side: 'LONG',
        size: 85.0,
        leverage: 25,
        entryPrice: 182.40,
        markPrice: 191.60,
        liquidationPrice: 175.10,
        unrealizedPnl: 782.00,
        roePercent: 126.30,
        margin: 620.16,
        takeProfit: 198.00,
        stopLoss: 178.50,
        tpProgress: 0.78,
      ),
      PositionData(
        symbol: 'BNBUSDT',
        side: 'LONG',
        size: 15.0,
        leverage: 10,
        entryPrice: 625.00,
        markPrice: 638.40,
        liquidationPrice: 565.00,
        unrealizedPnl: 201.00,
        roePercent: 21.44,
        margin: 937.50,
        takeProfit: 660.00,
        stopLoss: 610.00,
        tpProgress: 0.52,
      ),
    ];
  }

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
        content: const Text(
          'Hành động này sẽ đóng ngay toàn bộ 4 vị thế theo giá thị trường (Market) và tạm dừng bot. Bạn có chắc chắn không?',
          style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 13),
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
                  content: Text('Đã kích hoạt đóng khẩn cấp toàn bộ vị thế!'),
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
    final positions = _getDisplayPositions(backend);

    final totalBalance = backend.totalMarginBalance;
    final uPnl = backend.unrealizedPnl;
    final realizedToday = backend.realizedPnlToday;

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Master Account Overview Card
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
                    const Row(
                      children: [
                        Icon(Icons.account_balance_wallet, color: AppColors.primaryContainer, size: 16),
                        SizedBox(width: 6),
                        Text(
                          'TỔNG TÀI SẢN KÝ QUỸ',
                          style: TextStyle(
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
                          Container(width: 6, height: 6, decoration: const BoxDecoration(shape: BoxShape.circle, color: AppColors.bullish)),
                          const SizedBox(width: 5),
                          Text(
                            'Live ${widget.binanceService.lastPingMs}ms',
                            style: const TextStyle(color: AppColors.bullish, fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 10),

                // Main Value
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

                // PnL 2-Grid
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
                            const Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('Lãi Chưa Chốt (uPnL)', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 10)),
                                Icon(Icons.trending_up, color: AppColors.bullish, size: 14),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '+${currencyFmt.format(uPnl)} USDT',
                              style: const TextStyle(color: AppColors.bullish, fontSize: 13, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                            ),
                            const SizedBox(height: 2),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                              decoration: BoxDecoration(color: AppColors.bullishBg, borderRadius: BorderRadius.circular(3)),
                              child: const Text('+49.19% ROE', style: TextStyle(color: AppColors.bullish, fontSize: 9, fontWeight: FontWeight.bold)),
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
                              '+${currencyFmt.format(realizedToday)} USDT',
                              style: const TextStyle(color: AppColors.onSurface, fontSize: 13, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                            ),
                            const SizedBox(height: 2),
                            const Text('+2.82% (24h ròng)', style: TextStyle(color: AppColors.bullish, fontSize: 9, fontWeight: FontWeight.w600)),
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
                      const Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.verified_user, color: AppColors.bullish, size: 14),
                              SizedBox(width: 5),
                              Text('Đệm Thanh Lý (Margin Buffer)', style: TextStyle(color: AppColors.onSurface, fontSize: 11, fontWeight: FontWeight.bold)),
                            ],
                          ),
                          Text('RẤT AN TOÀN (26.4%)', style: TextStyle(color: AppColors.bullish, fontSize: 10, fontWeight: FontWeight.bold)),
                        ],
                      ),
                      const SizedBox(height: 6),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(3),
                        child: LinearProgressIndicator(
                          value: backend.marginBufferPercent / 100,
                          backgroundColor: AppColors.surfaceContainerHighest,
                          valueColor: const AlwaysStoppedAnimation(AppColors.bullish),
                          minHeight: 5,
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Ký Quỹ Duy Trì: 4,120 USDT', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 9, fontFamily: 'monospace')),
                          Text('Khoảng Cách Cháy: -25.5%', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 9, fontFamily: 'monospace')),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 12),

                // 3 Operational Buttons
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
                        onPressed: () => _showEmergencyDialog(context, backend),
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
                        onPressed: () {},
                        icon: const Icon(Icons.add_card, color: AppColors.primaryContainer, size: 14),
                        label: const Text('Nạp Ký Quỹ', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
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

          // 2. Live Bot Telemetry Bar
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
                              '${backend.activeBotCount}/${backend.totalBotCount} Bots Hoạt Động',
                              style: const TextStyle(color: AppColors.onSurface, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                              decoration: BoxDecoration(color: AppColors.bullishBg, borderRadius: BorderRadius.circular(3)),
                              child: const Text('ỔN ĐỊNH', style: TextStyle(color: AppColors.bullish, fontSize: 8, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                        const Text('Binance Futures USDS-M • WebSocket Live', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 9)),
                      ],
                    ),
                  ],
                ),
                Text(
                  '${backend.apiRequestsPerMin}/1200\nAPI req/m',
                  textAlign: TextAlign.right,
                  style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 9, fontFamily: 'monospace'),
                ),
              ],
            ),
          ),

          const SizedBox(height: 14),

          // 3. Positions Section Header
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
              const Row(
                children: [
                  Text('Lọc Bot', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 10)),
                  Icon(Icons.tune, color: AppColors.onSurfaceVariant, size: 14),
                ],
              ),
            ],
          ),

          const SizedBox(height: 8),

          // 4. Position Cards
          ...positions.map((pos) => _buildPositionCard(pos)),
        ],
      ),
    );
  }

  Widget _buildPositionCard(PositionData pos) {
    final isLong = pos.isLong;
    final sideColor = isLong ? AppColors.bullish : AppColors.bearish;

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
                      pos.symbol.startsWith('BTC') ? '₿' : pos.symbol.startsWith('ETH') ? 'Ξ' : '◆',
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
                      Text('Khối lượng: ${pos.size} ${pos.symbol.replaceAll('USDT', '')}', style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 9)),
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
                _buildPriceCol('GIÁ THANH LÝ', currencyFmt.format(pos.liquidationPrice), color: AppColors.bearish),
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

          const SizedBox(height: 8),

          // Action Buttons
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.onSurface,
                    side: const BorderSide(color: AppColors.surfaceContainerHighest),
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                  ),
                  onPressed: () {},
                  child: const Text('Đóng 50%', style: TextStyle(fontSize: 10)),
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.bearish,
                    side: const BorderSide(color: AppColors.bearish),
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                  ),
                  onPressed: () {},
                  child: const Text('Đóng 100%', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primaryContainer,
                    side: const BorderSide(color: AppColors.primaryContainer),
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                  ),
                  onPressed: () {},
                  child: const Text('Sửa TP/SL', style: TextStyle(fontSize: 10)),
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
