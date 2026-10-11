import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/bot_strategy_data.dart';
import '../../widgets/sparkline_widget.dart';
import '../../widgets/ios_switch.dart';
import '../../theme/app_colors.dart';

class BotStrategiesTab extends StatefulWidget {
  const BotStrategiesTab({super.key});

  @override
  State<BotStrategiesTab> createState() => _BotStrategiesTabState();
}

class _BotStrategiesTabState extends State<BotStrategiesTab> {
  String _selectedFilter = 'ALL';
  final currencyFmt = NumberFormat('#,##0.00');

  final List<BotStrategyData> _bots = [
    BotStrategyData(
      id: 'btc_grid',
      name: 'BTC Ultra Grid',
      symbol: 'BTCUSDT',
      type: 'Futures Grid',
      leverageStr: '20x CROSS',
      runtime: '14 ngày 6 giờ',
      param1Label: 'Khung Giá Lưới:',
      param1Value: '\$92,000 - \$98,000',
      param2Label: 'Số Tầng Lưới:',
      param2Value: '40 Grids (Cân Bằng)',
      todayPnl: 1003.42,
      pnlPercent: 24.98,
      apyPercent: 184,
      progressLabel: 'Lưới đã khớp: 26/40',
      progress: 0.65,
      isEnabled: true,
    ),
    BotStrategyData(
      id: 'eth_dca',
      name: 'ETH Multi-DCA Martingale',
      symbol: 'ETHUSDT',
      type: 'Multi-DCA',
      leverageStr: '15x ISOLATED',
      runtime: '8 ngày 12 giờ',
      param1Label: 'Tầng DCA Hiện Tại:',
      param1Value: 'Level 3 / 5 (An Toàn)',
      param2Label: 'Bước Giá Lệnh Kế:',
      param2Value: '-1.2% (\$3,340.00)',
      todayPnl: 542.10,
      pnlPercent: 18.25,
      apyPercent: 215,
      progressLabel: 'Độ sâu DCA: 3/5 tầng',
      progress: 0.60,
      isEnabled: true,
    ),
    BotStrategyData(
      id: 'sol_scalp',
      name: 'SOL Momentum Trend Scalper',
      symbol: 'SOLUSDT',
      type: 'Trend Scalper',
      leverageStr: '25x CROSS',
      runtime: '5 ngày 4 giờ',
      param1Label: 'Tín Hiệu Vào Lệnh:',
      param1Value: 'EMA Breakout + OFI Bull',
      param2Label: 'Lệnh Đã Khớp Hôm Nay:',
      param2Value: '18 Vòng Lệnh (Win 83%)',
      todayPnl: 890.25,
      pnlPercent: 32.10,
      apyPercent: 340,
      progressLabel: 'Momentum Trend: 85%',
      progress: 0.85,
      isEnabled: true,
    ),
    BotStrategyData(
      id: 'bnb_arb',
      name: 'BNB Rate Arbitrage',
      symbol: 'BNBUSDT',
      type: 'Arbitrage',
      leverageStr: '10x CROSS',
      runtime: '22 ngày 18 giờ',
      param1Label: 'Chiến Thuật:',
      param1Value: 'Funding Rate Delta Neutral',
      param2Label: 'Spread Thu Phí:',
      param2Value: '+0.024% / 8 giờ',
      todayPnl: 210.80,
      pnlPercent: 9.45,
      apyPercent: 78,
      progressLabel: 'Tỷ lệ Hedge: 100% Khớp',
      progress: 1.0,
      isEnabled: true,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final filteredBots = _bots.where((b) {
      if (_selectedFilter == 'GRID') return b.type.contains('Grid');
      if (_selectedFilter == 'DCA') return b.type.contains('DCA');
      return true;
    }).toList();

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Performance Overview Banner
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
                    const Row(
                      children: [
                        Icon(Icons.smart_toy, color: AppColors.primaryContainer, size: 18),
                        SizedBox(width: 8),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Đội Hình Bot', style: TextStyle(color: AppColors.onSurface, fontSize: 14, fontWeight: FontWeight.bold)),
                            Text('HỆ THỐNG THỰC THI ĐỊNH LƯỢNG', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 8, letterSpacing: 0.6)),
                          ],
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: AppColors.surfaceContainerLowest, borderRadius: BorderRadius.circular(10)),
                      child: const Row(
                        children: [
                          Icon(Icons.circle, color: AppColors.bullish, size: 6),
                          SizedBox(width: 4),
                          Text('4/4 Đang Chạy', style: TextStyle(color: AppColors.bullish, fontSize: 10, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                // Metrics 3-Strip
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: AppColors.surfaceContainerLowest, borderRadius: BorderRadius.circular(10)),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('LỢI NHUẬN (30D)', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 8, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 2),
                            const Text('+\$14,890.50', style: TextStyle(color: AppColors.bullish, fontSize: 13, fontWeight: FontWeight.bold, fontFamily: 'monospace')),
                            Text('USDT Ròng', style: TextStyle(color: AppColors.bullish.withValues(alpha: 0.8), fontSize: 8)),
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
                              const Text('WIN RATE 30D', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 8, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 2),
                              const Text('78.4%', style: TextStyle(color: AppColors.onSurface, fontSize: 13, fontWeight: FontWeight.bold, fontFamily: 'monospace')),
                              const Text('312 Vòng Lệnh', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 8)),
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
                              const Text('MAX DRAWDOWN', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 8, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 2),
                              const Text('4.2%', style: TextStyle(color: AppColors.bearish, fontSize: 13, fontWeight: FontWeight.bold, fontFamily: 'monospace')),
                              const Text('Rủi ro thấp', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 8)),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 12),

                // Sparkline
                const Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Hiệu suất 30 ngày (PnL Net)', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 10)),
                    Text('+412.3% APY', style: TextStyle(color: AppColors.bullish, fontSize: 11, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 4),
                const SparklineWidget(height: 38),

                const SizedBox(height: 12),

                // Create Bot Button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primaryContainer,
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: () {},
                    icon: const Icon(Icons.add_circle, size: 18),
                    label: const Text('+ Tạo Bot Thuật Toán Mới', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 14),

          // 2. Filter Pills
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Text('Chiến Lược Hoạt Động', style: TextStyle(color: AppColors.onSurface, fontSize: 13, fontWeight: FontWeight.bold)),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                    decoration: BoxDecoration(color: AppColors.surfaceContainerHigh, borderRadius: BorderRadius.circular(10)),
                    child: Text('${_bots.length} bots', style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 9)),
                  ),
                ],
              ),
              Row(
                children: [
                  _buildFilterBtn('Tất Cả', 'ALL'),
                  const SizedBox(width: 4),
                  _buildFilterBtn('Grid', 'GRID'),
                  const SizedBox(width: 4),
                  _buildFilterBtn('DCA', 'DCA'),
                ],
              ),
            ],
          ),

          const SizedBox(height: 10),

          // 3. Bot Cards
          ...filteredBots.map((bot) => _buildBotCard(bot)),
        ],
      ),
    );
  }

  Widget _buildFilterBtn(String title, String val) {
    final isSel = _selectedFilter == val;
    return GestureDetector(
      onTap: () => setState(() => _selectedFilter = val),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: isSel ? AppColors.primaryContainer : AppColors.surfaceContainerLow,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          title,
          style: TextStyle(
            color: isSel ? Colors.black : AppColors.onSurfaceVariant,
            fontSize: 10,
            fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  Widget _buildBotCard(BotStrategyData bot) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
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
                    child: Text(
                      bot.symbol.startsWith('BTC') ? '₿' : bot.symbol.startsWith('ETH') ? 'Ξ' : '◆',
                      style: const TextStyle(color: AppColors.primaryContainer, fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(bot.name, style: const TextStyle(color: AppColors.onSurface, fontSize: 13, fontWeight: FontWeight.bold)),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                            decoration: BoxDecoration(color: AppColors.surfaceContainer, borderRadius: BorderRadius.circular(3)),
                            child: Text(bot.leverageStr, style: const TextStyle(color: AppColors.primaryContainer, fontSize: 8, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                      Text('${bot.runtime} • ${bot.type}', style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 9)),
                    ],
                  ),
                ],
              ),

              // iOS Switch Toggle
              IosSwitch(
                value: bot.isEnabled,
                onChanged: (val) {
                  setState(() => bot.isEnabled = val);
                },
              ),
            ],
          ),

          const SizedBox(height: 10),

          // Parameter Chips
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: AppColors.surfaceContainerLowest, borderRadius: BorderRadius.circular(8)),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(bot.param1Label, style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 9)),
                      const SizedBox(height: 2),
                      Text(bot.param1Value, style: const TextStyle(color: AppColors.onSurface, fontSize: 10, fontWeight: FontWeight.w600, fontFamily: 'monospace')),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(bot.param2Label, style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 9)),
                      const SizedBox(height: 2),
                      Text(bot.param2Value, style: const TextStyle(color: AppColors.onSurface, fontSize: 10, fontWeight: FontWeight.w600, fontFamily: 'monospace')),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 10),

          // Real-time PnL & Yield Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(color: AppColors.surfaceContainerHigh, borderRadius: BorderRadius.circular(8)),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('LÃI HÔM NAY', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 8, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 2),
                    Text(
                      '+\$${currencyFmt.format(bot.todayPnl)} USDT',
                      style: const TextStyle(color: AppColors.bullish, fontSize: 13, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: AppColors.surfaceContainerLowest, borderRadius: BorderRadius.circular(4)),
                      child: Text('+${bot.pnlPercent.toStringAsFixed(2)}%', style: const TextStyle(color: AppColors.bullish, fontSize: 10, fontWeight: FontWeight.bold)),
                    ),
                    const SizedBox(height: 2),
                    Text('APY: ${bot.apyPercent}%', style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 9)),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 8),

          // Visual Progress Bar
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(bot.progressLabel, style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 9)),
              Text('${(bot.progress * 100).toInt()}%', style: const TextStyle(color: AppColors.onSurface, fontSize: 9, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 3),
          ClipRRect(
            borderRadius: BorderRadius.circular(2),
            child: LinearProgressIndicator(
              value: bot.progress,
              backgroundColor: AppColors.surfaceContainerLowest,
              valueColor: const AlwaysStoppedAnimation(AppColors.primaryContainer),
              minHeight: 4,
            ),
          ),

          const SizedBox(height: 10),

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
                  child: const Text('Cấu Hình', style: TextStyle(fontSize: 10)),
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.bullish,
                    side: const BorderSide(color: AppColors.bullish),
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                  ),
                  onPressed: () {},
                  child: const Text('Chốt Lãi', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.onSurfaceVariant,
                    side: const BorderSide(color: AppColors.surfaceContainerHighest),
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                  ),
                  onPressed: () {},
                  child: const Text('Tạm Dừng', style: TextStyle(fontSize: 10)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
