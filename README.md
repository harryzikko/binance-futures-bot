# ⚡ BINANCE FUTURES SCALPER PRO - BOT LƯỚT SÓNG & DASHBOARD CHUYÊN NGHIỆP

Hệ thống Bot tự động giao dịch Binance USDT-M Futures chuyên biệt cho chiến thuật **Lướt Sóng (Scalping)** với giao diện Quản Lý Dashboard thời gian thực hiện đại, chuyên nghiệp, bảo mật cao.

---

## 🌟 TÍNH NĂNG NỔI BẬT

### 1. Chiến Thuật Lướt Sóng (Scalping Strategies)
- **Trend Pullback Scalper (EMA Ribbon + RSI)**:
  - Lọc xu hướng vĩ mô qua EMA 50 / EMA 200.
  - Bắt các nhịp hồi kỹ thuật (pullback) về dải EMA 9 và EMA 21 khi RSI thoát vùng quá bán/quá mua để vào lệnh theo xu hướng chính.
- **Bollinger Bands Mean Reversion**:
  - Đánh lướt sóng đảo chiều khi giá đâm thủng dải trên/dưới của Bollinger Bands kết hợp RSI chạm ngưỡng cực đại (RSI > 65 hoặc RSI < 35).
- **Breakout Momentum Scalper**:
  - Bắt các cú phá vỡ (Breakout) biên độ dao động 15-20 nến gần nhất với khối lượng đột biến (Volume Spike > 1.5x trung bình 20 phiên).

### 2. Quản Trị Vốn & Rủi Ro Chặt Chẽ (Risk Management)
- **Tùy chỉnh Đòn Bẩy (Leverage)**: Hỗ trợ từ 1x đến 50x (Chế độ Isolated & Cross).
- **Take Profit (TP) & Stop Loss (SL)**: Thiết lập % chốt lời và cắt lỗ cứng cho từng lệnh.
- **Dynamic Trailing Stop (Dời Lỗ Tự Động)**: Tự động kéo Stop Loss tịnh tiến theo sóng giá để khóa lợi nhuận khi giá chạy đúng hướng.
- **Giới Hạn Lỗ Trong Ngày (Daily Max Loss Limit)**: Bot tự động dừng giao dịch và phát tín hiệu cảnh báo nếu tổng lỗ trong ngày vượt mức giới hạn quy định.
- **Thời Gian Nghỉ (Cooldown)**: Tránh vào lệnh liên tục (overtrading) khi thị trường biến động giật nến (whipsaw).
- **Nút Khẩn Cấp (Panic Close All)**: Đóng toàn bộ các vị thế đang mở và ngắt bot tức thì chỉ với 1 click.

### 3. Hỗ Trợ 3 Chế Độ Giao Dịch
1. **Paper Trading (Giả Lập 100%)**:
   - Sử dụng vốn ảo (mặc định $10,000 USDT).
   - Đọc dữ liệu giá thị trường thời gian thực (Live Price Tick) trực tiếp từ Binance.
   - Thử nghiệm chiến thuật, kiểm chứng Win Rate và PnL hoàn toàn miễn phí, không rủi ro mất tiền thật.
2. **Binance Futures Testnet**: môi trường Futures Testnet tại `testnet.binancefuture.com`; dùng API Key tạo trên Binance Futures Testnet.
3. **Binance Futures Demo**: môi trường Demo tại `demo-fapi.binance.com`; dùng API Key riêng tạo trên `demo.binance.com`.
4. **Binance Futures Live**: giao dịch tài khoản thật qua API Key & Secret.

### 4. Giao Diện Quản Trị (Dashboard UI Đẳng Cấp)
- **Dark Theme Cyberpunk**: Phong cách Crypto hiện đại, tối ưu hiển thị trên cả máy tính và điện thoại.
- **Biểu đồ TradingView tương tác cao (Lightweight Charts)**: Xem nến thời gian thực, dải EMA 9, EMA 21, EMA 50, dải Bollinger Bands, khối lượng giao dịch.
- **Bảng Vị Thế Mở (Live Positions)**: Theo dõi lãi/lỗ thời gian thực (uPnL $ và %), giá thanh lý, giá vào, giá mark, nút đóng từng vị thế tức thì.
- **Bảng Thống Kê Hiệu Suất**: Tỷ lệ thắng (Win Rate %), Số lệnh thắng/thua, Lợi nhuận ròng (Net PnL), Profit Factor.
- **Live Logs Terminal**: Nhật ký thực thi trực tiếp qua WebSocket với mã màu phân loại tín hiệu, lệnh, lỗi, cảnh báo.

---

## 🚀 HƯỚNG DẪN KHỞI CHẠY (1-CLICK)

### Cách 1: Chạy bằng file `start.bat` (Khuyên dùng trên Windows)
1. Nhấp đúp vào file `start.bat`.
2. Trình duyệt web sẽ tự động mở trang Dashboard tại địa chỉ: `http://localhost:8000`.

### Cách 2: Chạy bằng lệnh Python
Mở Terminal hoặc PowerShell tại thư mục này và chạy:
```bash
python start.py
```

Dashboard quản lý sẽ tự động mở trên trình duyệt tại: `http://127.0.0.1:8000`

---

## ⚙️ CẤU TRÚC THƯ MỤC DỰ ÁN

```
f:\Tài\New folder\
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI Server, REST APIs & WebSocket
│   │   ├── scalper_engine.py    # Vòng lặp giao dịch lướt sóng & quản lý rủi ro
│   │   ├── binance_client.py    # Kết nối Binance Futures qua CCXT
│   │   ├── paper_trader.py      # Bộ giả lập giao dịch Futures thực tế
│   │   ├── database.py          # SQLite lưu trữ lịch sử lệnh, cấu hình, logs
│   │   ├── models.py            # Pydantic schemas
│   │   ├── websocket_manager.py # Bộ phát trực tiếp WebSocket
│   │   └── strategies/          # Các chiến thuật lướt sóng
│   │       ├── base.py
│   │       ├── trend_scalper.py
│   │       ├── bb_scalper.py
│   │       └── breakout_scalper.py
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/                     # React + TypeScript + Tailwind CSS UI
│   │   ├── components/          # Navbar, Chart, Positions, Config, Logs, Stats
│   │   ├── services/            # Axios API client
│   │   ├── hooks/               # WebSocket hook
│   │   └── App.tsx
│   ├── dist/                    # Bản build hoàn chỉnh được FastAPI phục vụ trực tiếp
│   └── vite.config.ts
├── start.bat                    # File khởi chạy nhanh 1 click
├── start.py                     # Python launcher
├── trading_bot.db               # Cơ sở dữ liệu SQLite
└── README.md
```

---

## 🔒 HƯỚNG DẪN BẢO MẬT KHI KẾT NỐI API BINANCE

Khi tạo API Key trên Binance để chạy thật (Live):
1. **Chỉ cấp quyền**: `Enable Reading` (Đọc thông tin) và `Enable Futures` (Giao dịch Futures).
2. **Tuyệt đối KHÔNG cấp quyền**: `Enable Withdrawals` (Rút tiền).
3. **Giới hạn IP**: Nên giới hạn IP cố định của máy tính bạn để bảo mật tối đa.
4. **Kiểm tra trước**: Hãy luôn chạy ở chế độ **Paper Trading** ít nhất vài chục lệnh để hiểu rõ phản ứng của chiến thuật trước khi kích hoạt tài khoản thật!

## Kiểm thử và vận hành an toàn

- Khi mở ứng dụng, bot **tạm dừng vào lệnh**. Bấm **Start** để cho phép giao dịch.
- **Stop** chặn lệnh mới nhưng vẫn theo dõi TP/SL/trailing của vị thế đang mở khi ứng dụng còn chạy. **Panic** yêu cầu đóng các vị thế; nếu sàn từ chối lệnh, giao diện sẽ báo thất bại, không coi là đã đóng.
- Trước khi đổi Paper/Testnet/Demo/Live hoặc API Key, hãy dừng bot và đóng vị thế. Testnet, Demo và Live dùng API Key riêng; chọn đúng môi trường trong cả **Chế độ giao dịch** và **Cấu hình API**. Khóa đã lưu trước bản sửa môi trường cần nhập lại khi chuyển từ Demo cũ sang Futures Testnet.
- Trạng thái Paper và thông tin vị thế Live do bot mở được lưu trong `backend/trading_bot.db`. Vị thế Paper đã mất trước bản sửa này không thể khôi phục từ RAM cũ.
- Giới hạn lỗ trong ngày dùng PnL đã thực hiện. Với Live/Testnet/Demo, lấy tổng realized PnL, commission và funding USDT của **toàn tài khoản** từ Binance theo ngày địa phương. Nạp/rút không tính là lợi nhuận. Không đọc được dữ liệu rủi ro/vị thế sẽ chặn vào lệnh mới.
- Lịch sử Live/Testnet/Demo được ghi sau khi vị thế do bot quản lý đã đóng hoàn toàn và đối chiếu khớp lệnh. PnL lịch sử gồm phí giao dịch, không phân bổ funding cho từng vị thế. Không giao dịch thủ công đồng thời trên cùng cặp bot đang quản lý.
- Trailing stop do ứng dụng theo dõi, vì vậy cần giữ ứng dụng chạy. SL/TP Live là lệnh bảo vệ trên sàn; nếu đặt không thành công, bot dừng và thử đóng vị thế, đồng thời ghi cảnh báo.
- **Sizing tự động (mặc định bật):** ngân sách lỗ mỗi lệnh mặc định 0,5% vốn, không vượt giới hạn lỗ ngày còn lại sau khi dự phòng rủi ro các vị thế đang mở. Khối lượng danh nghĩa = ngân sách / (SL% + 0,2% dự phòng phí/trượt giá); ký quỹ tối đa theo `position_size_usd` (hoặc `% số dư`), đòn bẩy chọn mức thấp nhất đủ ký quỹ và không vượt trần `leverage`. Nếu vốn/ký quỹ không đủ thì bỏ qua lệnh. Đây là ước tính, gap/trượt giá có thể gây lỗ lớn hơn ngân sách.
- **Lọc đa khung (mặc định bật):** tín hiệu nến vào lệnh chỉ được giao dịch khi nến 15m và 1h **đã đóng** cùng hướng EMA50/EMA200 và giá. Nếu thiếu dữ liệu/không cùng hướng thì không mở lệnh.
- **Quét nhiều coin:** lấy toàn bộ ticker USDT-M perpetual **cùng môi trường bot**, lọc volume 24h (mặc định >= 15 triệu USDT), xếp hạng rồi quét tối đa `scan_top_n` (giới hạn 200 cặp, mỗi batch 5 cặp). Đo tại thời điểm kiểm tra: Testnet 558 cặp hoạt động, 483 đạt ngưỡng; Live 741 cặp hoạt động, 117 đạt ngưỡng. Số lượng thực tế thay đổi liên tục. Mở rộng 200 cặp có thể quét chậm và chịu giới hạn API.
- **Kết quả Testnet cần hiểu đúng:** PnL âm của lệnh vẫn là lỗ thật trên Testnet dù không phải tiền thật. Một số lệnh được đóng theo trailing có thể có `EXCHANGE_CLOSE`; PnL phải đối chiếu với fill và `realizedPnl` của Binance, không chỉ giá ticker/log cũ.
- Bot không tự chứng minh chiến lược có edge. Backtest/forward-test phải tính phí, trượt giá, funding và đánh giá đủ mẫu; không chuyển Live chỉ vì một vài lệnh thắng.
- Các kiểm thử dưới đây dùng mock Binance và SQLite riêng; không gửi lệnh thật hoặc sửa database đang sử dụng:

```powershell
python -m unittest discover -s backend\tests -v
cd frontend
npm run build
npm run lint
```

Hãy kiểm chứng tiếp trên Paper rồi Binance Futures Testnet hoặc Demo trước khi bật Live. Kiểm thử logic không chứng minh chiến lược có lợi nhuận, cũng không thay thế kiểm tra khớp lệnh trên sàn thực tế.

## Thông báo Telegram

**Cách cấu hình trực tiếp (khuyên dùng):** mở card **Telegram** trên dashboard, nhập Bot Token và Chat ID rồi bấm **Lưu & gửi tin thử**. Đây là tin thử từ chính server đang giao dịch, không phải một tiến trình CLI khác. Chỉ áp dụng cấu hình nếu gửi thử thành công. Token chỉ giữ trong RAM server, không trả qua API, không lưu localStorage/SQLite; phải nhập lại khi restart server (hoặc dùng biến môi trường bên dưới). Card hiển thị tình trạng đã cấu hình, lần gửi thành công và lỗi gần nhất. Không gửi token vào chat hỗ trợ.

**TP/SL trên dashboard:** lấy giá trigger từ lệnh Algo còn mở trên Binance, ghép đúng cặp/chiều/khối lượng bảo vệ; cache tối đa 5 giây. Nếu không đọc được sàn sẽ hiện **chưa xác minh**, không suy đoán giá từ phần trăm cấu hình. Trailing stop hiển thị riêng theo tracker của ứng dụng.

1. Tạo bot bằng **@BotFather** trong Telegram, lấy bot token. Không gửi token vào chat hỗ trợ hoặc lưu vào repository.
2. Mở chat với bot của bạn và bấm **Start** (hoặc gửi `/start`). Nếu gửi vào nhóm, thêm bot vào nhóm và cho phép gửi tin.
3. Lấy `chat_id` của cuộc trò chuyện/nhóm từ Telegram Bot API `getUpdates` sau khi gửi tin cho bot; không chia sẻ URL chứa token. Chat ID nhóm thường là số âm.
4. Mở PowerShell tại thư mục dự án. Nhập token ở dạng ẩn để tránh lưu giá trị thật vào lịch sử lệnh:

```powershell
$secret = Read-Host 'Telegram Bot Token' -AsSecureString
$env:TELEGRAM_BOT_TOKEN = [System.Net.NetworkCredential]::new('', $secret).Password
$env:TELEGRAM_CHAT_ID = Read-Host 'Telegram Chat ID'

# Chỉ gửi tin thử, không bật bot/đặt lệnh/ghi database:
python backend\app\telegram_notifier.py

# Sau khi thấy Telegram test OK, chạy ứng dụng từ cùng cửa sổ:
python start.py
```

Các biến trên chỉ áp dụng cho cửa sổ PowerShell hiện tại và tiến trình con. Nếu mở `start.bat` bằng nhấp đúp từ nơi khác, nó không kế thừa các biến của cửa sổ này. Không cần cấu hình Telegram nếu không muốn nhận tin.

Thông báo gồm Start/Stop, vào lệnh, vị thế đã đóng kèm PnL sau đối chiếu, Panic và lỗi giao dịch/rủi ro. Không gửi từng tín hiệu quét hoặc cập nhật giá. Tin gửi bằng hàng đợi nền (tối đa 64 tin), timeout 5 giây; Telegram lỗi không chặn giao dịch. Đây là thông báo best-effort: mất mạng, hàng đợi đầy hoặc tắt tiến trình có thể làm mất tin; không thay thế SL/TP trên Binance.

### Reset lượt test

Reset SQLite chỉ xóa lịch sử/tracker/log cục bộ; số dư, PnL trong ngày và lịch sử trên **Binance Testnet** vẫn do Binance lưu. Muốn bắt đầu hoàn toàn sạch: dừng vào lệnh, đóng vị thế và hủy lệnh bảo vệ trên sàn trước khi xóa tracker. Không xóa dữ liệu khi bot còn chạy.

**Reset PnL lượt Testnet:** `POST /api/testnet/pnl/reset` chỉ cho phép khi bot dừng, tracker/vị thế và lệnh chờ đều rỗng. Bot lưu mốc thời gian reset gắn với fingerprint API Key Testnet, rồi tính PnL/commission/funding từ `max(đầu ngày địa phương, mốc reset)`; dashboard, sizing và giới hạn lỗ dùng cùng khoảng này. Header/dashboard hiển thị **PnL Lượt Test** khi mốc đang có hiệu lực. Mốc lưu qua restart, không áp dụng cho khóa khác, tự trở về đầu ngày khi sang ngày mới và **không áp dụng Live/Demo**. Lịch sử thu nhập và số dư trên Binance không bị xóa; reset cho lượt test mới đồng nghĩa bắt đầu ngân sách lỗ Testnet mới, không dùng để gỡ lỗ Live.
