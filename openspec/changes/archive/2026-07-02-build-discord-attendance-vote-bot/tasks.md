## 1. Project setup

- [x] 1.1 Khởi tạo cấu trúc source cho Discord bot JavaScript, entrypoint chạy bot, và các thư mục `commands`, `interactions`, `services`, `db`, `config`, `utils`
- [x] 1.2 Thêm dependencies cần thiết cho `discord.js`, SQLite driver, và script đăng ký slash commands hoặc bootstrap tương ứng
- [x] 1.3 Tạo cấu hình environment cơ bản cho bot token, application/client metadata, và đường dẫn database

## 2. Database and persistence

- [x] 2.1 Tạo module database kết nối SQLite và bootstrap migration runner
- [x] 2.2 Tạo schema cho `guild_settings`, `votes`, và `vote_responses` gồm ràng buộc `UNIQUE(vote_id, user_id)`
- [x] 2.3 Triển khai repository hoặc helper function để đọc/ghi cấu hình guild, vote hiện tại, vote lịch sử, và response của member

## 3. Guild configuration commands

- [x] 3.1 Triển khai slash command `/vote-config` với các subcommand `channel`, `member-role`, và `admin-role`
- [x] 3.2 Thêm kiểm tra quyền `Administrator` hoặc `admin role` cho toàn bộ flow cấu hình
- [x] 3.3 Thêm logic validate và phản hồi xác nhận khi cấu hình guild được cập nhật hoặc không hợp lệ

## 4. Attendance vote lifecycle

- [x] 4.1 Triển khai service kiểm tra cấu hình guild đầy đủ và báo rõ từng mục cấu hình còn thiếu hoặc không hợp lệ
- [x] 4.2 Triển khai slash command `/vote-tao` để chặn vote `open` trùng, tạo record vote mới, và gửi public Embed vào `attendance channel`
- [x] 4.3 Triển khai button interaction handler để ghi nhận hoặc cập nhật lựa chọn `join`, `reserve`, `absent` và trả phản hồi ephemeral phù hợp
- [x] 4.4 Triển khai service tính lại count, tổng phản hồi, `updated_at`, và render Embed có hiển thị absolute + relative update time
- [x] 4.5 Triển khai slash command `/vote-dong` để chuyển vote sang `closed`, cập nhật Embed, và disable toàn bộ button

## 5. Vote viewing and history

- [x] 5.1 Triển khai slash command `/vote-xem` để xem vote `open`, vote gần nhất, hoặc vote theo `vote_id` dưới dạng ephemeral
- [x] 5.2 Triển khai slash command `/vote-lich-su` với mặc định 5 kết quả, giới hạn tối đa 20, và kiểm tra quyền `member role` hoặc admin
- [x] 5.3 Đảm bảo luồng xem lịch sử render từ SQLite ngay cả khi message gốc của vote lịch sử không còn tồn tại

## 6. Validation and verification

- [x] 6.1 Kiểm thử các case quyền truy cập: config command, tạo vote, vote khi không có role, và xem lịch sử khi không đủ quyền
- [x] 6.2 Kiểm thử các case nghiệp vụ chính: tạo vote không ping, tạo vote có ping, đổi lựa chọn, đóng vote, và chặn tạo vote mới khi đã có vote `open`
- [x] 6.3 Kiểm thử các case edge: cấu hình bị thiếu, role/channel đã bị xóa, không có vote `open`, và vote lịch sử khi message công khai đã bị xóa
