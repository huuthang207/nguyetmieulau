# Discord Attendance Vote Bot

Bot Discord viết bằng JavaScript để điểm danh tham gia **Bang Chiến** bằng **slash commands**, **button interactions**, và lưu dữ liệu bằng **SQLite** hoặc **MySQL**.

## Tính năng

- Cấu hình theo từng guild/server:
  - `admin role`
  - `member role`
  - `attendance channel`
- Chỉ cho phép **1 vote đang mở** tại một thời điểm trong mỗi guild
- Tạo vote bằng slash command với:
  - `title`
  - `event_time` (text tự do)
  - `description` (optional)
  - `ping_member` (optional, mặc định `false`)
- Member có role hợp lệ có thể chọn:
  - `Tham Gia`
  - `Dự Bị`
  - `Không Tham Gia`
- Embed tổng hợp công khai hiển thị:
  - trạng thái vote
  - số lượng theo từng lựa chọn
  - tổng số đã phản hồi
  - thời gian cập nhật gần nhất theo dạng **absolute + relative time**
- Admin có thể đóng vote thủ công, khi đóng bot sẽ disable toàn bộ button
- Xem vote hiện tại và lịch sử vote gần đây dưới dạng phản hồi **ephemeral**

## Yêu cầu môi trường

- **Node.js >= 22.5.0**
- npm

> Local development dùng **built-in `node:sqlite`** của Node; hosting có thể dùng MySQL qua `mysql2`.

## Cài đặt

### 1. Clone repo và cài dependencies

```bash
npm install
```

### 2. Tạo file `.env`

Copy từ `.env.example`:

```bash
cp .env.example .env
```

Nếu bạn đang ở Windows PowerShell và không có lệnh `cp`, có thể tạo thủ công file `.env` với nội dung như sau:

```env
BOT_TOKEN=your-discord-bot-token
CLIENT_ID=your-discord-application-client-id
TEST_GUILD_ID=your-test-guild-id

# Local SQLite (default)
DATABASE_CLIENT=sqlite
DATABASE_PATH=./data/attendance-bot.sqlite

# Hosted MySQL
# DATABASE_CLIENT=mysql
# DATABASE_URL=jdbc:mysql://host:3306/database?user=username&password=password
```

### 3. Cấu hình Discord Developer Portal

Tạo bot tại:

- https://discord.com/developers/applications

Bạn cần lấy các giá trị sau:

- `BOT_TOKEN`: Bot Token trong tab **Bot**
- `CLIENT_ID`: Application ID / Client ID
- `TEST_GUILD_ID`: ID của server test để deploy slash commands nhanh theo guild

## Mời bot vào server

Trong Discord Developer Portal:

- vào **OAuth2** → **URL Generator**
- chọn scopes:
  - `bot`
  - `applications.commands`

### Bot permissions khuyến nghị

- View Channels
- Send Messages
- Embed Links
- Read Message History
- Use Slash Commands

Nếu muốn dùng `ping_member = true`, nên đảm bảo bot có thể mention role trong server/channel tương ứng.

## Chạy local

### Deploy slash commands

```bash
npm run deploy:commands
```

Lệnh này sẽ đăng ký các slash command vào guild test nếu có `TEST_GUILD_ID`, hoặc đăng ký global nếu không có.

### Start bot

```bash
npm start
```

Khi bot chạy thành công, console sẽ hiện kiểu:

```text
Logged in as YourBotName#1234
```

## Scripts

```bash
npm start
npm run deploy:commands
npm test
```

## Slash Commands

### Cấu hình

```text
/vote-config channel
/vote-config member-role
/vote-config admin-role
```

### Vận hành

```text
/vote-tao
/vote-dong
/vote-xem
/vote-lich-su
```

## Luồng sử dụng cơ bản

### 1. Cấu hình bot

Thiết lập lần lượt:

- `/vote-config admin-role`
- `/vote-config member-role`
- `/vote-config channel`

### 2. Tạo vote mới

Dùng:

```text
/vote-tao
```

Nhập các trường:

- `title`
- `event_time`
- `description` *(optional)*
- `ping_member` *(optional, mặc định `false`)*

Bot sẽ gửi một **Embed công khai** vào channel điểm danh với 3 button:

- `Tham Gia`
- `Dự Bị`
- `Không Tham Gia`

### 3. Member vote

Member có role hợp lệ bấm một trong ba button. Bot sẽ:

- lưu lựa chọn vào SQLite
- cập nhật lại Embed tổng hợp
- trả phản hồi **ephemeral**

### 4. Đóng vote

Admin dùng:

```text
/vote-dong
```

Bot sẽ:

- đổi trạng thái vote thành `closed`
- cập nhật lại Embed
- disable toàn bộ button

### 5. Xem vote và lịch sử

Xem vote hiện tại hoặc vote theo ID:

```text
/vote-xem
/vote-xem vote_id:<id>
```

Xem lịch sử vote gần đây:

```text
/vote-lich-su
/vote-lich-su limit:5
```

## Quyền truy cập

### Admin bot

Một user được xem là admin nếu:

- có quyền Discord `Administrator`, hoặc
- có `admin role` đã cấu hình

### Member được vote

Một user được phép vote nếu:

- có đúng `member role` đã cấu hình

### Xem lịch sử

- `member role` và admin đều có thể xem
- phản hồi được gửi dưới dạng **ephemeral**

## Database

Bot hỗ trợ 2 chế độ database:

### SQLite local

Mặc định file database nằm tại:

```text
data/attendance-bot.sqlite
```

Cấu hình:

```env
DATABASE_CLIENT=sqlite
DATABASE_PATH=./data/attendance-bot.sqlite
```

### MySQL trên hosting

Nếu hosting cung cấp connection string MySQL/JDBC, cấu hình bằng environment variables trên hosting:

```env
DATABASE_CLIENT=mysql
DATABASE_URL=jdbc:mysql://host:3306/database?user=username&password=password
```

Bot cũng hỗ trợ dạng có username/password trong URL authority:

```env
DATABASE_URL=jdbc:mysql://username:password@host:3306/database
```

Nếu provider yêu cầu SSL, bật:

```env
MYSQL_SSL=true
MYSQL_SSL_REJECT_UNAUTHORIZED=true
```

Không nên hardcode connection string thật vào source code hoặc README.

## Hosting

Thông thường cấu hình trên hosting như sau:

```text
Install command: npm install
Start command: npm start
```

Lệnh start hiện tại là:

```bash
npm start
```

Tương đương:

```bash
node src/index.js
```

Slash commands nên deploy riêng một lần khi mới setup hoặc khi có thay đổi command:

```bash
npm run deploy:commands
```

Nếu hosting chỉ cho một startup command và slash commands chưa được deploy, có thể dùng tạm:

```bash
npm run deploy:commands && npm start
```

Nhưng không khuyến nghị dùng lâu dài vì sẽ redeploy slash commands mỗi lần restart.

Lưu ý hosting:

- Nên chạy bot như background worker/long-running process, không cần HTTP server.
- Nên chạy 1 instance bot duy nhất để tránh xử lý trùng Discord interactions.
- Runtime cần `BOT_TOKEN`; `CLIENT_ID` chỉ cần khi chạy `npm run deploy:commands`.

## Kiểm thử

Chạy toàn bộ test:

```bash
npm test
```

Hiện project có test cho:

- registry slash commands
- render Embed / history
- migrations và vote lifecycle
- permission helpers
- config validation
- create / close / vote button flow
- history fallback khi không còn vote `open`
- authorization của commands

## Cấu trúc project

```text
src/
├─ index.js
├─ commands/
├─ interactions/
├─ services/
├─ db/
├─ config/
└─ utils/

scripts/
└─ deploy-commands.js

test/
└─ *.test.js
```

## Test thủ công gợi ý

- User thường thử `/vote-config` → phải bị từ chối
- Admin cấu hình đủ 3 mục → phải thành công
- Tạo vote mới với `ping_member = false`
- Tạo vote mới với `ping_member = true`
- Member vote lần đầu → count tăng đúng
- Member đổi lựa chọn → count cập nhật đúng
- User không có role member bấm nút → bị từ chối
- Tạo vote thứ hai khi đang có vote `open` → bị chặn
- Đóng vote → button bị disable
- Xem lịch sử bằng `/vote-lich-su`
- Xem vote cũ bằng `/vote-xem vote_id:<id>`

## Lưu ý

- `event_time` là **text tự do**, không parse thành datetime ở v1
- Chỉ hỗ trợ **1 vote open mỗi guild**
- Embed tổng hợp **không hiển thị danh sách member**, chỉ hiển thị count
- Nếu message công khai của vote lịch sử bị xóa, dữ liệu vẫn xem lại được từ SQLite

## Troubleshooting

### Slash command không xuất hiện

Kiểm tra:

- đã chạy `npm run deploy:commands`
- `CLIENT_ID` đúng
- `TEST_GUILD_ID` đúng
- bot được mời với scope `applications.commands`

### Bot online nhưng không gửi được vote

Kiểm tra:

- đã cấu hình `attendance channel`
- bot có quyền gửi tin nhắn ở channel đó
- bot có quyền `Embed Links`

### `ping_member = true` nhưng không ping được

Kiểm tra:

- bot có quyền mention role
- role member có thể mention
- channel permissions không chặn bot

### Start bot bị lỗi thiếu biến môi trường

Kiểm tra file `.env` đã có:

- `BOT_TOKEN`
- `CLIENT_ID` *(để deploy commands)*
- `TEST_GUILD_ID` *(nếu deploy theo guild)*

## OpenSpec

Change đã được implement theo OpenSpec:

- `openspec/changes/build-discord-attendance-vote-bot/`

Nếu cần archive change sau khi review xong, dùng:

```text
/opsx:archive build-discord-attendance-vote-bot
```
