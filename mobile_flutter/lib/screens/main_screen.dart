import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/backend_api_service.dart';
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

  void _showServerConfigDialog(BuildContext context, BackendApiService backend) {
    final textController = TextEditingController(text: backend.serverUrl);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surfaceContainerLow,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 18,
          right: 18,
          top: 18,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.dns, color: AppColors.primaryContainer, size: 20),
                    SizedBox(width: 8),
                    Text(
                      'Cấu Hình Server Backend',
                      style: TextStyle(color: AppColors.onSurface, fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: AppColors.onSurfaceVariant),
                  onPressed: () => Navigator.pop(ctx),
                ),
              ],
            ),
            const SizedBox(height: 8),
            const Text(
              'Đồng bộ dữ liệu thời gian thực giữa App iOS & Bot Server:',
              style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 12),
            ),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.surfaceContainer,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text(
                '• Cùng mạng Wi-Fi: Dùng IP máy tính (VD: http://192.168.1.15:8000)\n• Trên Simulator: Dùng http://localhost:8000\n• Từ xa: Dùng Ngrok / Cloudflare Tunnel URL',
                style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 11, height: 1.4),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: textController,
              style: const TextStyle(color: AppColors.onSurface, fontFamily: 'monospace', fontSize: 13),
              decoration: InputDecoration(
                filled: true,
                fillColor: AppColors.surfaceContainerLowest,
                hintText: 'http://192.168.1.xxx:8000',
                hintStyle: const TextStyle(color: AppColors.onSurfaceMuted),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              ),
            ),
            const SizedBox(height: 14),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryContainer,
                foregroundColor: Colors.black,
                minimumSize: const Size.fromHeight(44),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () {
                backend.updateServerUrl(textController.text);
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    backgroundColor: AppColors.surfaceContainerHigh,
                    content: Text('Đang kết nối: ${textController.text}'),
                  ),
                );
              },
              child: const Text('Lưu & Kết Nối Đồng Bộ Ngay', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final backend = context.watch<BackendApiService>();

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

                // Server Sync Badge & Latency
                Row(
                  children: [
                    // Backend Sync status chip
                    GestureDetector(
                      onTap: () => _showServerConfigDialog(context, backend),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
                        decoration: BoxDecoration(
                          color: backend.isConnected ? AppColors.bullishBg : AppColors.errorContainer.withValues(alpha: 0.3),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: backend.isConnected ? AppColors.bullish.withValues(alpha: 0.4) : AppColors.bearish.withValues(alpha: 0.4),
                            width: 0.8,
                          ),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: backend.isConnected ? AppColors.bullish : AppColors.bearish,
                              ),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              backend.isConnected ? backend.tradingMode.toUpperCase() : 'IP SERVER',
                              style: TextStyle(
                                color: backend.isConnected ? AppColors.bullish : AppColors.bearish,
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    // Latency Badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceContainerHigh,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.bolt, color: AppColors.primaryContainer, size: 11),
                          const SizedBox(width: 2),
                          Text(
                            '${_binanceService.lastPingMs}ms',
                            style: const TextStyle(color: AppColors.primaryContainer, fontSize: 9, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 6),
                    // Settings icon to configure backend IP
                    GestureDetector(
                      onTap: () => _showServerConfigDialog(context, backend),
                      child: Container(
                        width: 28,
                        height: 28,
                        decoration: const BoxDecoration(
                          color: AppColors.surfaceContainerHigh,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.settings, color: AppColors.onSurface, size: 15),
                      ),
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
