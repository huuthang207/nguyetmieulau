## Why

Bot điểm danh Bang Chiến hiện mới quản lý lựa chọn vote theo `Discord user`, nên chưa thể hiển thị tổng hợp theo thông tin ingame như `ingame_name` và `môn phái`, cũng như chưa hỗ trợ quản lý hồ sơ member cho vận hành thực tế của bang. Thay đổi này cần được bổ sung ngay để bảng tổng hợp phản ánh đúng quân số theo phái, chặn member vote khi chưa khai báo thông tin bắt buộc, và cho phép admin nhập/xuất dữ liệu phục vụ quản trị.

## What Changes

- Thêm quản lý `member profile` theo từng guild với hai trường nghiệp vụ bắt buộc: `ingame_name` và `mon_phai`.
- Thêm slash command `/profile` để member tự cập nhật/xem profile và để admin cập nhật profile cho member khác.
- Ràng buộc `ingame_name` phải unique trong phạm vi một guild và `mon_phai` phải thuộc danh sách cố định gồm 7 phái đã chốt.
- Thay đổi luồng vote để member không có profile hợp lệ sẽ bị chặn vote và nhận hướng dẫn dùng `/profile set` trước khi bỏ phiếu.
- Mở rộng lưu trữ `vote_responses` để lưu snapshot `ingame_name` và `mon_phai` tại thời điểm vote, nhưng bảng tổng hợp và vote history mặc định sẽ hiển thị theo profile hiện tại của member.
- Mở rộng Embed tổng hợp công khai để phần `Tham Gia` hiển thị breakdown theo môn phái bằng hardcoded Discord emoji và số lượng từng phái, chỉ hiển thị các phái có ít nhất một người tham gia.
- Thêm import/export dữ liệu JSON cho `member profile` và `attendance` để admin có thể quản lý danh sách và trích xuất kết quả điểm danh.

## Capabilities

### New Capabilities
- `member-profiles`: Quản lý hồ sơ member theo guild, gồm tự cập nhật profile, admin cập nhật hộ, validate uniqueness của `ingame_name`, và danh sách `mon_phai` cố định.
- `attendance-data-exchange`: Nhập/xuất dữ liệu JSON cho `member profile` và `attendance` để phục vụ quản trị và đối soát.

### Modified Capabilities
- `attendance-voting`: Thay đổi requirement của luồng vote để bắt buộc có profile trước khi vote, lưu snapshot profile vào response, và hiển thị breakdown `Tham Gia` theo môn phái trên bảng tổng hợp công khai.

## Impact

- Ảnh hưởng schema SQLite trong `src/db/migrations.js` và tầng truy cập dữ liệu trong `src/db/repositories.js` để bổ sung `member_profiles`, snapshot trên `vote_responses`, cùng các query tổng hợp theo môn phái.
- Ảnh hưởng slash command registry và command handlers để thêm nhóm lệnh `/profile` cùng các thao tác import/export bằng file JSON.
- Ảnh hưởng luồng button interaction tại `src/interactions/vote-buttons.js` để chặn vote khi thiếu profile và lưu snapshot khi vote thành công.
- Ảnh hưởng service render Embed tại `src/services/vote-embed-service.js` và vote service để tính breakdown `Tham Gia` theo môn phái bằng emoji hardcoded.
- Bổ sung kiểm thử cho profile management, uniqueness validation, vote gating, sect summary rendering, và import/export JSON.