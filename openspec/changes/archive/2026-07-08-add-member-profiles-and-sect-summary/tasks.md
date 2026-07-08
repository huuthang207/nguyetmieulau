## 1. Database and shared domain constants

- [x] 1.1 Thêm migration tạo bảng `member_profiles` với ràng buộc `UNIQUE(guild_id, user_id)` và `UNIQUE(guild_id, ingame_name)`
- [x] 1.2 Mở rộng bảng `vote_responses` để lưu `snapshot_ingame_name` và `snapshot_mon_phai`
- [x] 1.3 Tạo module shared constants cho danh sách 7 `mon_phai`, label chuẩn, và hardcoded emoji mapping
- [x] 1.4 Cập nhật bootstrap database và test migration để đảm bảo schema mới hoạt động với database trống và database đã có dữ liệu vote cũ

## 2. Repository and service layer

- [x] 2.1 Bổ sung repository methods cho CRUD `member_profiles` và lookup uniqueness theo `guild_id`
- [x] 2.2 Bổ sung repository methods để import/export dataset JSON cho member profiles và attendance
- [x] 2.3 Bổ sung query tổng hợp breakdown `Tham Gia` theo `mon_phai` từ profile hiện tại, có fallback snapshot khi profile bị thiếu
- [x] 2.4 Cập nhật `vote-service` để đọc profile hiện tại, lưu snapshot khi vote, và resolve vote export target theo `vote_id` hoặc vote `open`

## 3. Profile slash commands

- [x] 3.1 Tạo slash command `/profile set` cho member tự tạo/cập nhật profile với `ingame_name` và `mon_phai` choice
- [x] 3.2 Tạo slash command `/profile xem` để xem profile hiện tại của chính user dưới dạng ephemeral
- [x] 3.3 Tạo slash command `/profile set-member` cho admin cập nhật profile của member khác
- [x] 3.4 Thêm validation và phản hồi lỗi rõ ràng cho duplicate `ingame_name`, `mon_phai` không hợp lệ, và thiếu quyền admin ở các subcommand quản trị

## 4. Vote flow and summary rendering

- [x] 4.1 Cập nhật `vote-buttons` để chặn vote khi member chưa có profile hợp lệ và hướng dẫn dùng `/profile set`
- [x] 4.2 Cập nhật luồng lưu response để luôn ghi snapshot `ingame_name` và `mon_phai` tại thời điểm vote hoặc đổi lựa chọn
- [x] 4.3 Cập nhật `vote-embed-service` để hiển thị breakdown `Tham Gia` theo `mon_phai` bằng hardcoded emoji và chỉ hiện các phái có count lớn hơn 0
- [x] 4.4 Cập nhật `/vote-xem` và các luồng render vote để dùng profile hiện tại làm source of truth mặc định cho phần summary theo môn phái

## 5. JSON import/export commands

- [x] 5.1 Tạo slash command `/profile import-members` nhận JSON attachment, validate envelope `type`/`guild_id`, và import member profiles theo lô
- [x] 5.2 Tạo slash command `/profile export-members` để xuất toàn bộ member profiles của guild thành JSON attachment
- [x] 5.3 Tạo slash command `/profile export-attendance` để xuất attendance JSON theo `vote_id` chỉ định hoặc vote `open` hiện tại
- [x] 5.4 Bổ sung formatter và validator cho JSON envelope của `member_profiles` và `attendance`

## 6. Verification and regression tests

- [x] 6.1 Thêm test cho migration, uniqueness của `ingame_name`, và repository CRUD của `member_profiles`
- [x] 6.2 Thêm test cho permission của nhóm `/profile` và các case import/export JSON hợp lệ hoặc không hợp lệ
- [x] 6.3 Thêm test cho vote gating khi thiếu profile, snapshot update khi vote đổi lựa chọn, và render breakdown `Tham Gia` theo `mon_phai`
- [x] 6.4 Chạy toàn bộ test suite và rà soát manual command surface để xác nhận change không làm hỏng các flow vote hiện có