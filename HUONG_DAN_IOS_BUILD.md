# HƯỚNG DẪN BUILD VÀ CÀI ĐẶT APP FLUTTER IOS (UNSIGNED IPA)

Tài liệu này hướng dẫn cách kết nối GitHub, tự động build file **`BinanceFuturesBot-Flutter-unsigned.ipa`** thông qua **GitHub Actions** và cài đặt lên iPhone / iPad mà không cần tài khoản Apple Developer trả phí ($99/năm).

---

## 1. Kiến Trúc Ứng Dụng Flutter iOS Thuần (Dart Native)

Toàn bộ ứng dụng mobile được xây dựng bằng **Flutter thuần (`mobile_flutter/`)**, dựa 100% trên bộ mẫu thiết kế **Obsidian Algorithmic Terminal** (`stitch_binance_futures_trading_dashboard mobile/`):

- **100% DỮ LIỆU THẬT TỪ BINANCE FUTURES API**:
  - Ticker Mark Price, 24h High/Low/Volume, Funding rate được fetch trực tiếp thời gian thực từ Binance Futures Public API (`https://fapi.binance.com`).
  - Biểu đồ nến tương tác (1m, 5m, 15m, 1h, 4h) vẽ bằng **Flutter CustomPainter Canvas Engine**, hiển thị nến thật, volume histogram và đường EMA(7/25).
  - Sổ lệnh L2 thật: Độ sâu Order Book 20 mức, BBO spread, đồng hồ đo áp lực Bid/Ask và tự động phát hiện lệnh cá mập (**WALL**).
- **KẾT NỐI SERVER BACKEND & KILL SWITCH**:
  - Kết nối đến server Python FastAPI (`http://localhost:8000` hoặc IP mạng LAN máy tính ví dụ `http://192.168.1.xxx:8000`).
  - Quản lý vị thế thật, số dư Margin USDT, đệm an toàn thanh lý.
  - Thanh trượt vật lý cảm ứng **Kill Switch Slider** ("Trượt để hủy toàn bộ vị thế") gửi lệnh ngắt khẩn cấp P0 tới server để đóng toàn bộ vị thế và hủy lệnh ngay lập tức!

### 4 Tab chức năng trên App:
1. **Tab 1: Vị Thế & Ký Quỹ (`PositionsOverviewTab`)**: Thẻ Master Account USDT, uPnL live beacon, đệm thanh lý 78%, 3 nút thao tác (Đóng hết, Nạp ký quỹ, Kill switch) và danh sách vị thế BTC, ETH, SOL, BNB.
2. **Tab 2: Sổ Lệnh & Biểu Đồ L2 (`OrderBookChartTab`)**: Bộ chọn cặp giao dịch (BTC, ETH, SOL, BNB), nến thời gian thực, volume bar, EMA(7/25), dải lưới bot, sổ lệnh L2 và danh sách lệnh chờ thuật toán.
3. **Tab 3: Chiến Lược Bots (`BotStrategiesTab`)**: Sparkline hiệu suất PnL Net 30 ngày (+412.3% APY), Win Rate 78.4%, 4 thẻ bot (BTC Ultra Grid, ETH Multi-DCA, SOL Momentum Trend Scalper, BNB Rate Arbitrage) kèm công tắc iOS bật/tắt bot.
4. **Tab 4: Rủi Ro & Webhook Hub (`RiskWebhookTab`)**: Khu vực khẩn cấp P0 với Kill Switch Slider cảm ứng, động cơ bảo vệ rủi ro 4 quy tắc, thông báo đa kênh (TradingView, Telegram, Discord, iOS Push) và hộp thoại đổi IP server backend.

---

## 2. Quá Trình Build IPA Flutter Bằng GitHub Actions

Sau khi chạy lệnh `git push origin main`, GitHub Actions sẽ tự động kích hoạt workflow:

1. Vào repository trên GitHub > Chọn thẻ **Actions**.
2. Bạn sẽ thấy workflow **"Build Flutter Unsigned iOS IPA"** đang chạy trên máy chủ đám mây **macOS 14 (Apple Silicon)**.
3. Các bước build:
   - Cài đặt Flutter Stable SDK thông qua `subosito/flutter-action@v2`.
   - Khởi tạo iOS Platform Skeleton & tải dependencies: `flutter create --platforms=ios .` && `flutter pub get`.
   - Biên dịch ứng dụng Flutter iOS ở chế độ Release không cần chứng chỉ ký:
     ```bash
     flutter build ios --no-codesign --release
     ```
   - Đóng gói file `.app` vào thư mục `Payload` và nén thành **`BinanceFuturesBot-Flutter-unsigned.ipa`**.
   - Tải file IPA lên mục **Artifacts** để bạn tải về.

---

## 3. Cách Cài Đặt File `.ipa` Lên iPhone

File `.ipa` unsigned có thể được cài đặt dễ dàng bằng các công cụ phổ biến sau:

| Công Cụ | Thiết Bị Hỗ Trợ | Yêu Cầu Máy Tính? | Đánh Giá |
| :--- | :--- | :--- | :--- |
| **Sideloadly** | Tất cả iOS / iPadOS | Cần máy tính (Windows/Mac) | **Khuyến nghị nhất trên Windows**: Cắm cáp iPhone vào PC, kéo thả file `.ipa` vào là xong ngay. |
| **AltStore** | Tất cả iOS / iPadOS | Cần lúc đầu (Mac/PC) | Dùng Apple ID cá nhân miễn phí, tự động gia hạn qua Wi-Fi. |
| **TrollStore** | iOS 14.0 – 17.0 (tùy chip) | Không (cài trực tiếp) | Cài vĩnh viễn không bao giờ hết hạn 7 ngày. |
| **Scarlet / Esign** | Tất cả iOS | Không (cài qua web) | Cài qua chứng chỉ doanh nghiệp trực tiếp trên iPhone. |

### Hướng dẫn cài bằng Sideloadly (Rất đơn giản trên Windows):
1. Tải [Sideloadly](https://sideloadly.io/) về máy tính.
2. Cắm cáp Lightning / Type-C kết nối iPhone với máy tính.
3. Mở Sideloadly > Kéo thả file `BinanceFuturesBot-Flutter-unsigned.ipa` vào ô IPA.
4. Nhập Apple ID cá nhân của bạn (miễn phí) > Bấm **Start**.
5. Sau khoảng 30 giây, app **Binance Bot Pro** sẽ xuất hiện trên màn hình chính iPhone.
6. Vào **Cài đặt (Settings)** trên iPhone > **Cài đặt chung (General)** > **Quản lý VPN & Thiết bị** > Tin cậy chứng chỉ của Apple ID là mở app trải nghiệm mượt mà!
