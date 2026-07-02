## Why

Guild cần một Discord bot để điểm danh tham gia Bang Chiến theo quy trình thống nhất, thay cho việc nhắn tin thủ công khó tổng hợp và khó kiểm soát quyền. Việc bổ sung bot này bây giờ giúp chuẩn hóa luồng điểm danh, lưu lịch sử bằng SQLite, và cho phép admin theo dõi quân số ngay trên một Embed message được cập nhật theo thời gian thực.

## What Changes

- Thêm Discord bot viết bằng JavaScript sử dụng `discord.js` và lưu dữ liệu bằng SQLite.
- Thêm nhóm slash command để cấu hình theo từng guild: `attendance channel`, `member role`, và `admin role`.
- Thêm luồng tạo vote Bang Chiến với các trường `title`, `event_time`, `description` tùy chọn, và `ping_member` tùy chọn mặc định `false`.
- Giới hạn mỗi guild chỉ có tối đa một vote đang mở tại một thời điểm; chặn tạo vote mới khi chưa đóng vote hiện tại.
- Cho phép thành viên có đúng `member role` bỏ phiếu bằng button với ba lựa chọn: `Tham Gia`, `Dự Bị`, `Không Tham Gia`.
- Tự động cập nhật Embed tổng hợp công khai của vote hiện tại để hiển thị trạng thái, số lượng theo từng lựa chọn, tổng phản hồi, và thời gian cập nhật gần nhất theo dạng absolute + relative time.
- Thêm lệnh đóng vote thủ công; khi đóng vote bot sẽ cập nhật trạng thái và disable toàn bộ button.
- Thêm khả năng xem vote hiện tại và lịch sử vote gần đây qua slash command dưới dạng phản hồi ephemeral cho member và admin được phép xem.
- Báo lỗi cấu hình thiếu theo từng mục cụ thể thay vì báo lỗi chung chung.

## Capabilities

### New Capabilities
- `attendance-vote-configuration`: Quản lý cấu hình theo từng guild cho `admin role`, `member role`, và `attendance channel` dùng cho bot điểm danh.
- `attendance-voting`: Quản lý vòng đời vote Bang Chiến gồm tạo vote, bỏ phiếu bằng button, cập nhật Embed tổng hợp, đóng vote, và xem lịch sử vote.

### Modified Capabilities

## Impact

- Thêm mã nguồn bot Discord mới trong repo hiện đang chưa có application code.
- Thêm phụ thuộc runtime cho Discord bot và SQLite.
- Thêm schema lưu trữ cho `guild_settings`, `votes`, và `vote_responses`.
- Thêm slash commands, button interaction handlers, và service layer để kiểm tra quyền, render Embed, tổng hợp count, và truy xuất lịch sử.
- Thêm logic hiển thị thời gian cập nhật gần nhất trên vote hiện tại theo định dạng phù hợp với Discord.
