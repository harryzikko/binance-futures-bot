import 'package:flutter/material.dart';
import '../../services/binance_api_service.dart';
import 'tabs/positions_overview_tab.dart';
import 'tabs/orderbook_chart_tab.dart';
import 'tabs/bot_strategies_tab.dart';
import 'tabs/risk_webhook_tab.dart';
import '../../theme/app_colors.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 0;
  final BinanceApiService _binanceService = BinanceApiService();

  final List<String> _tabSubtitles = [
    'Tong Quan Vi The',
    'So Lenh Bieu Do',
    'Chien Luoc Bots',
    'Rui Ro Webhook',
  ];

  @override
  Widget build(BuildContext context) {
    final List<Widget> pages = [
      PositionsOverviewTab(binanceService: _binanceService),
      OrderBookChartTab(binanceService: _binanceService),
      const BotStrategiesTab(),
      const RiskWebhookTab(),
    ];

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(60),
        child: SafeArea(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.surfaceContainerLowest.withValues(alpha: 0.95),
              border: const Border(
                bottom: BorderSide(color: AppColors.surfaceContainerHigh, width: 0.8),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Brand Title & Subtitle
                Row(
                  children: [
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: AppColors.surfaceContainerHigh,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      alignment: Alignment.center,
                      child: const Text('⚡', style: TextStyle(fontSize: 18)),
                    ),
                    const SizedBox(width: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        RichText(
                          text: const TextSpan(
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: -0.2),
                            children: [
                              TextSpan(text: 'BINANCE ', style: TextStyle(color: AppColors.onSurface)),
                              TextSpan(text: 'PRO', style: TextStyle(color: AppColors.primaryContainer)),
                            ],
                          ),
                        ),
                        Text(
                          _tabSubtitles[_currentIndex],
                          style: const TextStyle(
                            color: AppColors.onSurfaceVariant,
                            fontSize: 9,
                            letterSpacing: 0.8,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),

                // Latency Badge & Profile
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceContainerHigh,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: const BoxDecoration(shape: BoxShape.circle, color: AppColors.bullish),
                          ),
                          const SizedBox(width: 5),
                          Text(
                            '${_binanceService.lastPingMs}ms',
                            style: const TextStyle(color: AppColors.bullish, fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      width: 30,
                      height: 30,
                      decoration: const BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.person, color: AppColors.onPrimary, size: 18),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),

      body: IndexedStack(
        index: _currentIndex,
        children: pages,
      ),

      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppColors.surfaceContainerLowest,
          border: Border(top: BorderSide(color: AppColors.surfaceContainerHigh, width: 0.8)),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildNavItem(0, Icons.account_balance_wallet, 'Vị Thế'),
                _buildNavItem(1, Icons.candlestick_chart, 'Sổ Lệnh'),
                _buildNavItem(2, Icons.smart_toy, 'Chiến Lược'),
                _buildNavItem(3, Icons.security, 'Rủi Ro'),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, String label) {
    final isSelected = _currentIndex == index;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => setState(() => _currentIndex = index),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 22,
              color: isSelected ? AppColors.primaryContainer : AppColors.onSurfaceVariant,
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? AppColors.primaryContainer : AppColors.onSurfaceVariant,
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
