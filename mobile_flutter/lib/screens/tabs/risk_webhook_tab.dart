import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/backend_api_service.dart';
import '../../widgets/kill_switch_slider.dart';
import '../../widgets/ios_switch.dart';
import '../../theme/app_colors.dart';

class RiskWebhookTab extends StatefulWidget {
  const RiskWebhookTab({super.key});

  @override
  State<RiskWebhookTab> createState() => _RiskWebhookTabState();
}

class _RiskWebhookTabState extends State<RiskWebhookTab> {
  bool _rule1 = true;
  bool _rule2 = true;
  bool _rule3 = true;
  bool _rule4 = true;

  bool _alertTradingView = true;
  bool _alertTelegram = true;
  bool _alertDiscord = true;
  bool _alertIosPush = true;

  void _showServerSettingsModal(BuildContext context, BackendApiService backend) {
    final textController = TextEditingController(text: backend.serverUrl);

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surfaceContainerLow,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
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
                    Text('CẤU HÌNH SERVER BACKEND', style: TextStyle(color: AppColors.onSurface, fontSize: 15, fontWeight: FontWeight.bold)),
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
              'Nhập IP máy tính chạy backend (Ví dụ khi iPhone dùng Wi-Fi chung: http://192.168.1.15:8000):',
              style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 11),
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
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primaryContainer,
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(vertical: 12),
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
                    child: const Text('Lưu & Kết Nối Ngay', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final backend = context.watch<BackendApiService>();
    final activePositions = backend.positions.length;
    final dailyPnl = backend.realizedPnlToday;
    final dailyLossHit = backend.dailyLossHit;
    final marginRatio = backend.marginRatioPercent;

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. P0 Emergency Kill Switch Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surfaceContainerLow,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.bearish.withValues(alpha: 0.4)),
              boxShadow: [
                BoxShadow(color: AppColors.bearish.withValues(alpha: 0.15), blurRadius: 20, offset: const Offset(0, 4)),
              ],
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
                        Container(width: 8, height: 8, decoration: const BoxDecoration(shape: BoxShape.circle, color: AppColors.bearish)),
                        const SizedBox(width: 6),
                        const Text('KHU VỰC KHẨN CẤP P0', style: TextStyle(color: AppColors.bearish, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 0.6)),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: AppColors.errorContainer.withValues(alpha: 0.4), borderRadius: BorderRadius.circular(4)),
                      child: Text('ARMED · $activePositions VỊ THẾ', style: const TextStyle(color: AppColors.onErrorContainer, fontSize: 9, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),

                const SizedBox(height: 10),

                const Row(
                  children: [
                    Icon(Icons.warning, color: AppColors.bearish, size: 20),
                    SizedBox(width: 6),
                    Text('KILL SWITCH AN TOÀN', style: TextStyle(color: AppColors.onSurface, fontSize: 15, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'Hủy toàn bộ lệnh chờ & Đóng ngay $activePositions vị thế đang mở theo giá thị trường (Market) khi phát hiện biến động cực đoan!',
                  style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 11, height: 1.4),
                ),

                const SizedBox(height: 14),

                // Interactive Tactile Slider
                KillSwitchSlider(
                  onTrigger: () async {
                    await backend.triggerKillSwitch();
                  },
                ),

                const SizedBox(height: 8),

                const Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.lock, color: AppColors.primaryContainer, size: 12),
                        SizedBox(width: 4),
                        Text('Xác thực 2 lớp: Soft-Arm', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 9)),
                      ],
                    ),
                    Text('Ước tính phí: ~0.5 - 2 USDT', style: TextStyle(color: AppColors.bearish, fontSize: 9, fontFamily: 'monospace')),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // 2. Operational Guard Metrics (Real Data)
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceContainerLow,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.surfaceContainerHigh),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('HẠN MỨC LỖ HÔM NAY', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 8, fontWeight: FontWeight.bold)),
                          Icon(
                            dailyLossHit ? Icons.error : Icons.verified_user,
                            color: dailyLossHit ? AppColors.bearish : AppColors.bullish,
                            size: 12,
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.baseline,
                        textBaseline: TextBaseline.alphabetic,
                        children: [
                          Text(
                            '${dailyPnl >= 0 ? '+' : ''}${dailyPnl.toStringAsFixed(2)}',
                            style: TextStyle(
                              color: dailyPnl >= 0 ? AppColors.bullish : AppColors.bearish,
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              fontFamily: 'monospace',
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Text('USDT', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 10, fontFamily: 'monospace')),
                        ],
                      ),
                      const SizedBox(height: 6),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(2),
                        child: LinearProgressIndicator(
                          value: dailyLossHit ? 1.0 : 0.15,
                          backgroundColor: AppColors.surfaceContainerHighest,
                          valueColor: AlwaysStoppedAnimation(dailyLossHit ? AppColors.bearish : AppColors.bullish),
                          minHeight: 4,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        dailyLossHit ? 'Đã chạm ngưỡng cắt lỗ' : 'An toàn: Phiên ${backend.tradingMode}',
                        style: TextStyle(color: dailyLossHit ? AppColors.bearish : AppColors.bullish, fontSize: 9),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceContainerLow,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.surfaceContainerHigh),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('TỶ LỆ KÝ QUỸ', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 8, fontWeight: FontWeight.bold)),
                          Icon(Icons.shield_outlined, color: AppColors.primaryContainer, size: 12),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.baseline,
                        textBaseline: TextBaseline.alphabetic,
                        children: [
                          Text('${marginRatio.toStringAsFixed(1)}%', style: const TextStyle(color: AppColors.primaryContainer, fontSize: 15, fontWeight: FontWeight.bold, fontFamily: 'monospace')),
                          const SizedBox(width: 4),
                          const Text('/ max 50%', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 10, fontFamily: 'monospace')),
                        ],
                      ),
                      const SizedBox(height: 6),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(2),
                        child: LinearProgressIndicator(
                          value: (marginRatio / 50).clamp(0.0, 1.0),
                          backgroundColor: AppColors.surfaceContainerHighest,
                          valueColor: const AlwaysStoppedAnimation(AppColors.primaryContainer),
                          minHeight: 4,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text('Đệm an toàn còn +${(50 - marginRatio).clamp(0.0, 50.0).toStringAsFixed(1)}%', style: const TextStyle(color: AppColors.primaryContainer, fontSize: 9)),
                    ],
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // 3. Risk Guard Engine Rules v4.2
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
                const Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.security, color: AppColors.secondary, size: 16),
                        SizedBox(width: 6),
                        Text('Risk Guard Engine', style: TextStyle(color: AppColors.onSurface, fontSize: 13, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    Text('4/4 ACTIVE', style: TextStyle(color: AppColors.bullish, fontSize: 9, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 10),

                _buildRuleItem('Daily Max Loss Breaker', '-5.0% giới hạn lỗ 24h', _rule1, (v) => setState(() => _rule1 = v), Icons.trending_down, AppColors.bearish),
                const SizedBox(height: 8),
                _buildRuleItem('Margin Ratio > 50% Auto Hedge', 'Mở vị thế đối ứng cân bằng delta', _rule2, (v) => setState(() => _rule2 = v), Icons.balance, AppColors.primaryContainer),
                const SizedBox(height: 8),
                _buildRuleItem('Flash Crash Exit (<10 BTC)', 'Hủy lệnh chờ & bảo vệ vốn thanh khoản', _rule3, (v) => setState(() => _rule3 = v), Icons.flash_on, AppColors.secondary),
                const SizedBox(height: 8),
                _buildRuleItem('Max Consecutive Losses Cooldown', 'Dừng 30 phút sau 3 vòng lệnh lỗ', _rule4, (v) => setState(() => _rule4 = v), Icons.timer, AppColors.bullish),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // 4. Webhook & Alert Notification Hub
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
                const Row(
                  children: [
                    Icon(Icons.notifications_active, color: AppColors.primaryContainer, size: 16),
                    SizedBox(width: 6),
                    Text('TRUNG TÂM CẢNH BÁO WEBHOOK', style: TextStyle(color: AppColors.onSurface, fontSize: 12, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 10),

                _buildWebhookItem('TradingView Alert Webhook (SSL 443)', 'Tín hiệu PineScript tự động khớp', _alertTradingView, (v) => setState(() => _alertTradingView = v)),
                const SizedBox(height: 8),
                _buildWebhookItem('Telegram Bot Notification (<250ms)', 'Báo lãi chốt, báo khớp & cảnh báo cháy', _alertTelegram, (v) => setState(() => _alertTelegram = v)),
                const SizedBox(height: 8),
                _buildWebhookItem('Discord Webhook Channel', 'Nhật ký lệnh định dạng Rich Embeds', _alertDiscord, (v) => setState(() => _alertDiscord = v)),
                const SizedBox(height: 8),
                _buildWebhookItem('iOS Push Notifications (P0 Sound)', 'Rung & phát chuông khi Kill Switch bật', _alertIosPush, (v) => setState(() => _alertIosPush = v)),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // 5. Backend Server Connection Card
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.surfaceContainerLow,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: backend.isConnected ? AppColors.bullish.withValues(alpha: 0.3) : AppColors.primaryContainer.withValues(alpha: 0.3)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.dns, color: backend.isConnected ? AppColors.bullish : AppColors.primaryContainer, size: 18),
                    const SizedBox(width: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(backend.statusMessage, style: TextStyle(color: backend.isConnected ? AppColors.bullish : AppColors.onSurface, fontSize: 11, fontWeight: FontWeight.bold)),
                        Text(backend.serverUrl, style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 9, fontFamily: 'monospace')),
                      ],
                    ),
                  ],
                ),
                TextButton(
                  style: TextButton.styleFrom(
                    backgroundColor: AppColors.surfaceContainerHigh,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  ),
                  onPressed: () => _showServerSettingsModal(context, backend),
                  child: const Text('Đổi IP', style: TextStyle(color: AppColors.primaryContainer, fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRuleItem(String title, String desc, bool val, ValueChanged<bool> onChange, IconData icon, Color iconColor) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: AppColors.surfaceContainer, borderRadius: BorderRadius.circular(8)),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(color: AppColors.surfaceContainerHigh, borderRadius: BorderRadius.circular(6)),
                child: Icon(icon, color: iconColor, size: 16),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(color: AppColors.onSurface, fontSize: 11, fontWeight: FontWeight.w600)),
                  Text(desc, style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 8)),
                ],
              ),
            ],
          ),
          IosSwitch(value: val, onChanged: onChange),
        ],
      ),
    );
  }

  Widget _buildWebhookItem(String title, String desc, bool val, ValueChanged<bool> onChange) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(color: AppColors.surfaceContainer, borderRadius: BorderRadius.circular(8)),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(color: AppColors.onSurface, fontSize: 10, fontWeight: FontWeight.w600)),
              Text(desc, style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 8)),
            ],
          ),
          IosSwitch(value: val, onChanged: onChange),
        ],
      ),
    );
  }
}
