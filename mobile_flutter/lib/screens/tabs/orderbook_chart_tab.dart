import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../services/binance_api_service.dart';
import '../../models/ticker_data.dart';
import '../../models/kline_data.dart';
import '../../models/orderbook_data.dart';
import '../../widgets/candlestick_chart.dart';
import '../../widgets/orderbook_widget.dart';
import '../../theme/app_colors.dart';

class OrderBookChartTab extends StatefulWidget {
  final BinanceApiService binanceService;

  const OrderBookChartTab({super.key, required this.binanceService});

  @override
  State<OrderBookChartTab> createState() => _OrderBookChartTabState();
}

class _OrderBookChartTabState extends State<OrderBookChartTab> {
  String _selectedSymbol = 'BTCUSDT';
  String _selectedInterval = '15m';

  TickerData? _ticker;
  List<KlineData> _klines = [];
  OrderBookData? _orderBook;

  bool _showEma = true;
  bool _showGridBands = true;
  Timer? _pollingTimer;

  final currencyFmt = NumberFormat('#,##0.00');

  final List<String> _symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'];
  final List<String> _intervals = ['1m', '5m', '15m', '1h', '4h'];

  @override
  void initState() {
    super.initState();
    _loadRealMarketData();
    _pollingTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      _loadRealMarketData(refreshChart: false);
    });
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadRealMarketData({bool refreshChart = true}) async {
    try {
      final tickerFuture = widget.binanceService.getTicker(_selectedSymbol);
      final depthFuture = widget.binanceService.getOrderBook(_selectedSymbol);

      Future<List<KlineData>>? klinesFuture;
      if (refreshChart || _klines.isEmpty) {
        klinesFuture = widget.binanceService.getKlines(_selectedSymbol, interval: _selectedInterval);
      }

      final results = await Future.wait([
        tickerFuture,
        depthFuture,
        if (klinesFuture != null) klinesFuture,
      ]);

      if (mounted) {
        setState(() {
          _ticker = results[0] as TickerData;
          _orderBook = results[1] as OrderBookData;
          if (klinesFuture != null && results.length > 2) {
            _klines = results[2] as List<KlineData>;
          }
        });
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final ticker = _ticker ?? TickerData.initial(_selectedSymbol);
    final orderBook = _orderBook ?? OrderBookData.initial();
    final isBullish = ticker.priceChangePercent >= 0;

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Ticker Selector & Real-Time Stats Card
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.surfaceContainerLow,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.surfaceContainerHigh),
            ),
            child: Column(
              children: [
                // Pair Selector & Funding Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Pair Dropdown Selector
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceContainer,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _selectedSymbol,
                          dropdownColor: AppColors.surfaceContainerLow,
                          icon: const Icon(Icons.expand_more, color: AppColors.onSurfaceVariant, size: 18),
                          isDense: true,
                          items: _symbols.map((s) {
                            return DropdownMenuItem<String>(
                              value: s,
                              child: Row(
                                children: [
                                  Container(
                                    width: 8,
                                    height: 8,
                                    decoration: const BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: AppColors.primaryContainer,
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(s, style: const TextStyle(color: AppColors.onSurface, fontWeight: FontWeight.bold, fontSize: 13)),
                                  const SizedBox(width: 4),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                    decoration: BoxDecoration(
                                      color: AppColors.primaryContainer.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(3),
                                    ),
                                    child: const Text('PERP', style: TextStyle(color: AppColors.primaryContainer, fontSize: 8, fontWeight: FontWeight.bold)),
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                          onChanged: (newSymbol) {
                            if (newSymbol != null) {
                              setState(() {
                                _selectedSymbol = newSymbol;
                                _klines.clear();
                              });
                              _loadRealMarketData(refreshChart: true);
                            }
                          },
                        ),
                      ),
                    ),

                    // Funding Rate
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceContainer,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        children: [
                          const Text('FUNDING: ', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 9, fontWeight: FontWeight.bold)),
                          Text(
                            '${ticker.fundingRate >= 0 ? '+' : ''}${(ticker.fundingRate * 100).toStringAsFixed(4)}%',
                            style: const TextStyle(color: AppColors.bullish, fontSize: 10, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 10),

                // Mark Price & 24h Stats
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(width: 6, height: 6, decoration: const BoxDecoration(shape: BoxShape.circle, color: AppColors.bullish)),
                            const SizedBox(width: 6),
                            Text(
                              '\$${currencyFmt.format(ticker.lastPrice)}',
                              style: TextStyle(
                                color: isBullish ? AppColors.bullish : AppColors.bearish,
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                fontFamily: 'monospace',
                              ),
                            ),
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                              decoration: BoxDecoration(
                                color: isBullish ? AppColors.bullishBg : AppColors.bearishBg,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                '${isBullish ? '+' : ''}${ticker.priceChangePercent.toStringAsFixed(2)}%',
                                style: TextStyle(color: isBullish ? AppColors.bullish : AppColors.bearish, fontSize: 10, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                        Text(
                          'Index \$${currencyFmt.format(ticker.indexPrice)} • 24h Vol ${ticker.volume.toInt()} ${_selectedSymbol.replaceAll('USDT', '')}',
                          style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 9),
                        ),
                      ],
                    ),

                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text('24H HIGH: \$${currencyFmt.format(ticker.highPrice)}', style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 9, fontFamily: 'monospace')),
                        const SizedBox(height: 2),
                        Text('24H LOW: \$${currencyFmt.format(ticker.lowPrice)}', style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 9, fontFamily: 'monospace')),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 10),

          // 2. Chart Controls Toolbar
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Interval selector
              Container(
                padding: const EdgeInsets.all(2),
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainerLow,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: _intervals.map((itv) {
                    final isSel = itv == _selectedInterval;
                    return GestureDetector(
                      onTap: () {
                        setState(() => _selectedInterval = itv);
                        _loadRealMarketData(refreshChart: true);
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: isSel ? AppColors.primaryContainer : Colors.transparent,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          itv,
                          style: TextStyle(
                            color: isSel ? Colors.black : AppColors.onSurfaceVariant,
                            fontSize: 10,
                            fontWeight: isSel ? FontWeight.bold : FontWeight.w500,
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),

              // Overlay Toggles
              Row(
                children: [
                  GestureDetector(
                    onTap: () => setState(() => _showEma = !_showEma),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                      decoration: BoxDecoration(
                        color: _showEma ? AppColors.surfaceContainerHigh : AppColors.surfaceContainerLow,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.show_chart, color: AppColors.primaryContainer, size: 12),
                          SizedBox(width: 4),
                          Text('EMA(7/25)', style: TextStyle(color: AppColors.onSurface, fontSize: 9, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  GestureDetector(
                    onTap: () => setState(() => _showGridBands = !_showGridBands),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                      decoration: BoxDecoration(
                        color: _showGridBands ? AppColors.secondaryContainer.withValues(alpha: 0.3) : AppColors.surfaceContainerLow,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.grid_4x4, color: AppColors.secondary, size: 12),
                          SizedBox(width: 4),
                          Text('GRID BANDS', style: TextStyle(color: AppColors.secondary, fontSize: 9, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 8),

          // 3. Precision Candlestick Chart (CustomPainter)
          CandlestickChart(
            klines: _klines,
            currentPrice: ticker.lastPrice,
            showEma: _showEma,
            showGridBands: _showGridBands,
          ),

          const SizedBox(height: 10),

          // 4. Real L2 Order Book & Spread
          OrderBookWidget(
            data: orderBook,
            currentPrice: ticker.lastPrice,
          ),

          const SizedBox(height: 12),

          // 5. Bot Pending Orders Strip
          Container(
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
                    Row(
                      children: [
                        Icon(Icons.pending_actions, color: AppColors.primaryContainer, size: 16),
                        SizedBox(width: 6),
                        Text('LỆNH CHỜ THUẬT TOÁN', style: TextStyle(color: AppColors.onSurface, fontSize: 11, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    Text('3 lệnh active', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 9)),
                  ],
                ),
                const SizedBox(height: 8),
                _buildPendingOrderRow('Grid Buy Limit', '\$94,200.00', '0.150 BTC', AppColors.bullish),
                _buildPendingOrderRow('Grid Sell Limit', '\$96,800.00', '0.150 BTC', AppColors.bearish),
                _buildPendingOrderRow('Take Profit Market', '\$98,500.00', '0.500 BTC', AppColors.primaryContainer),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPendingOrderRow(String type, String price, String amount, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(width: 6, height: 6, decoration: BoxDecoration(shape: BoxShape.circle, color: color)),
              const SizedBox(width: 6),
              Text(type, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
            ],
          ),
          Row(
            children: [
              Text(price, style: const TextStyle(color: AppColors.onSurface, fontSize: 11, fontFamily: 'monospace')),
              const SizedBox(width: 10),
              Text(amount, style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 10, fontFamily: 'monospace')),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: () {},
                child: const Icon(Icons.close, color: AppColors.onSurfaceVariant, size: 14),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
