# HƯỚNG DẪN BUILD VÀ CÀI ĐẶT APP IOS (UNSIGNED IPA)

Tài liệu này hướng dẫn cách kết nối GitHub, tự động build file **`BinanceFuturesBot-unsigned.ipa`** thông qua **GitHub Actions** và cài đặt lên iPhone / iPad mà không cần tài khoản Apple Developer trả phí (\$99/năm).

---

## 1. Cấu Trúc Ứng Dụng Mobile iOS

Giao diện mobile được thiết kế chuẩn theo bộ mẫu **Obsidian Algorithmic Terminal** (`stitch_binance_futures_trading_dashboard mobile/`):

- **Tab 1: Vị Thế (`tong-quan-vi-the`)**:
  - Thẻ Master Account: Tổng tài sản ký quỹ USDT, uPnL thời gian thực, Lãi đã chốt hôm nay, Đệm thanh lý (Margin Buffer 78%).
  - 3 nút thao tác nhanh: **Đóng Hết**, **Nạp Ký Quỹ**, **Kill Switch**.
  - Thanh telemetry cụm bot (4/4 Bots ổn định, 240/1200 API req/m).
  - Danh sách thẻ vị thế (BTC, ETH, SOL, BNB) hiển thị ROE%, Đòn bẩy, Giá vào / Mark, Giá thanh lý, Thanh tiến trình TP/SL và các nút hành động (Đóng 50%, Đóng 100%, Sửa TP/SL).
  - Modal xác nhận dừng khẩn cấp P0.

- **Tab 2: Sổ Lệnh (`so-lenh-bieu-do`)**:
  - Chọn cặp giao dịch (BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT Perp).
  - Ticker Mark Price live beacon, Funding rate (+0.0100%), 24h High/Low.
  - Biểu đồ nến SVG tương tác: Khung thời gian (1s, 1m, 5m, 15m, 1H), dải nến, volume histogram, đường EMA(7/25) và các đường giới hạn lưới của bot.
  - Sổ lệnh L2: BBO Spread, đồng hồ đo áp lực Bid/Ask (54.2% vs 45.8%), độ sâu orderbook và cảnh báo tường cá mập (**WALL**).
  - Quản lý lệnh chờ bot (Grid Buy, Grid Sell, Take Profit) kèm nút hủy lệnh.

- **Tab 3: Chiến Lược (`chien-luoc-bots`)**:
  - Bảng tổng quan hiệu suất đội hình bot: Lợi nhuận ròng 30 ngày (+$14,890.50), Win Rate 78.4%, Max Drawdown 4.2%.
  - Mini Sparkline trực quan hóa PnL Net (+412.3% APY).
  - Các thẻ bot thuật toán: BTC Ultra Grid, ETH Multi-DCA Martingale, SOL Momentum Trend Scalper, BNB Rate Arbitrage.
  - Công tắc bật/tắt bot phong cách iOS, thông số lưới/DCA và các nút thao tác (Cấu hình, Chốt lãi, Tạm dừng).

- **Tab 4: Rủi Ro & Webhook (`rui-ro-webhook`)**:
  - Khu vực khẩn cấp P0: Thanh trượt cảm ứng **Trượt để hủy toàn bộ vị thế (Kill Switch Slider)**.
  - Chỉ số kiểm soát: Hạn mức lỗ hôm nay (-$1,840 / -$6.2k), Tỷ lệ ký quỹ (28.4% / max 50%).
  - Động cơ bảo vệ rủi ro v4.2 (Daily Max Loss Breaker, Auto Hedge, Flash Crash Exit, Max Consecutive Losses).
  - Trạng thái kết nối Binance API (AES-256 GCM, phân quyền Read/Futures, cấm rút tiền an toàn tuyệt đối).
  - Trung tâm cảnh báo đa kênh: Webhook TradingView (SSL 443), Telegram Bot Alert (<250ms), Discord Webhook, iOS Push Notification.

---

## 2. Các Bước Đưa Lên GitHub & Build IPA Tự Động

### Bước 2.1: Tạo repository mới trên GitHub
1. Truy cập [github.com/new](https://github.com/new).
2. Đặt tên repository (ví dụ: `binance-futures-bot`).
3. Chọn chế độ **Private** (khuyến nghị để bảo vệ mã nguồn cá nhân) hoặc **Public**.
4. Không tích chọn "Add a README file" hay ".gitignore" (vì dự án đã có sẵn).
5. Nhấn **Create repository**.

### Bước 2.2: Liên kết và Push mã nguồn từ máy tính
Mở PowerShell tại thư mục dự án và chạy 2 lệnh sau:

```powershell
# Thay URL bên dưới bằng link repository vừa tạo trên GitHub của bạn
git remote add origin https://github.com/<tai-khoan-cua-ban>/<ten-repo>.git

# Push mã nguồn lên nhánh main
git push -u origin main
```

---

## 3. Quá Trình Build IPA Bằng GitHub Actions

Sau khi chạy lệnh `git push`, GitHub Actions sẽ tự động kích hoạt workflow:

1. Vào repository trên GitHub > Chọn thẻ **Actions**.
2. Bạn sẽ thấy workflow **"Build Unsigned iOS IPA"** đang chạy.
3. Workflow sẽ sử dụng máy chủ đám mây macOS 14 (Apple Silicon M1/M2):
   - Cài đặt Node.js 20 & các gói phụ thuộc.
   - Biên dịch ứng dụng React Vite (`npm run build`).
   - Cài đặt CocoaPods & đồng bộ mã Capacitor iOS (`npx cap sync ios`).
   - Biên dịch mã nguồn qua `xcodebuild` không yêu cầu chứng chỉ ký (`CODE_SIGNING_ALLOWED=NO`).
   - Đóng gói file `.app` vào thư mục `Payload` và nén thành **`BinanceFuturesBot-unsigned.ipa`**.
   - Tải file IPA lên mục **Artifacts**.
4. Thời gian hoàn thành: khoảng 3 – 5 phút.
5. Sau khi hoàn thành (dấu tích xanh), nhấn vào lượt chạy workflow > cuộn xuống mục **Artifacts** > nhấn vào **`BinanceFuturesBot-unsigned.ipa`** để tải về máy tính hoặc iPhone.
   - **Link lượt chạy thành công mới nhất**: [GitHub Actions Run #38154463581](https://github.com/harryzikko/binance-futures-bot/actions/runs/38154463581) (Chứa file artifact `BinanceFuturesBot-unsigned.ipa` sẵn sàng tải).

---

## 4. Cách Cài Đặt File `.ipa` Lên iPhone

File `.ipa` unsigned có thể được cài đặt dễ dàng bằng các công cụ phổ biến sau:

| Công Cụ | Thiết Bị Hỗ Trợ | Yêu Cầu Máy Tính? | Đánh Giá |
| :--- | :--- | :--- | :--- |
| **TrollStore** | iOS 14.0 – 17.0 (tùy chip) | Không (cài trực tiếp) | **Tốt nhất**: Không bao giờ hết hạn 7 ngày, cài vĩnh viễn. |
| **AltStore** | Tất cả iOS / iPadOS | Cần lúc đầu (Mac/PC) | Dùng Apple ID cá nhân miễn phí, tự động gia hạn qua Wi-Fi. |
| **Sideloadly** | Tất cả iOS / iPadOS | Cần máy tính (Windows/Mac) | Cắm cáp iPhone vào PC, kéo thả file `.ipa` vào là xong ngay. |
| **Scarlet / Esign** | Tất cả iOS | Không (cài trực tiếp trên web) | Cài qua chứng chỉ doanh nghiệp trực tiếp trên iPhone. |
| **LiveContainer** | iOS 14.0+ | Không (sau khi setup) | Chạy app không cần giới hạn 3 app của Apple. |

### Cách cài nhanh bằng Sideloadly (Khuyến nghị trên Windows):
1. Tải [Sideloadly](https://sideloadly.io/) về máy tính Windows.
2. Cắm cáp Lightning / Type-C kết nối iPhone với máy tính.
3. Mở Sideloadly > Kéo thả file `BinanceFuturesBot-unsigned.ipa` vào ô IPA.
4. Nhập Apple ID cá nhân của bạn (miễn phí) > Bấm **Start**.
5. Sau khoảng 30 giây, app **Binance Bot Pro** sẽ xuất hiện trên màn hình chính iPhone.
6. Vào **Cài đặt (Settings)** trên iPhone > **Cài đặt chung (General)** > **Quản lý VPN & Thiết bị** > Tin cậy chứng chỉ của Apple ID là mở app được ngay.

---

## 5. Xem Thử Giao Diện Mobile Trực Tiếp Trên Trình Duyệt Web

Bạn có thể chạy dự án ngay trên máy tính để trải nghiệm giao diện:
- Nhấn vào nút **"Xem Giao Diện iOS App"** ở góc dưới bên phải màn hình để chuyển qua lại giữa chế độ Máy tính và Mobile App.
- Hoặc mở DevTools trình duyệt (F12) > Chọn biểu tượng Responsive Mode (iPhone 14 Pro / 15 Pro).
