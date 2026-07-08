## 1. Database và repository

- [x] 1.1 Thêm migration `003` cho SQLite để bổ sung `game_id`, `bank_qr_url`, backfill `game_id` cho profiles hiện có, và tạo unique index `(guild_id, game_id)`.
- [x] 1.2 Thêm migration `003` cho MySQL với cùng schema change và backfill an toàn cho dữ liệu hiện có.
- [x] 1.3 Cập nhật repository methods để đọc/lưu `game_id` trong `upsertMemberProfile`, `upsertMemberProfiles`, `findMemberProfileByIngameName` tương đương cho Game ID, và list/get profile.
- [x] 1.4 Thêm repository methods để cập nhật/xóa `bank_qr_url` cho profile của một user trong guild.

## 2. Profile service và data exchange

- [x] 2.1 Cập nhật `profile-service` validation để require/trim `game_id`, kiểm tra duplicate `game_id` trong guild, và cho phép user giữ Game ID hiện tại.
- [x] 2.2 Cập nhật `saveProfile` và `importProfiles` để nhận/lưu `game_id`.
- [x] 2.3 Thêm service logic cho `setBankQr` và `removeBankQr`, bao gồm yêu cầu profile đã tồn tại trước khi lưu QR.
- [x] 2.4 Validate QR attachment là ảnh hợp lệ và giới hạn kích thước file theo design.
- [x] 2.5 Cập nhật member profile export để include `game_id` và không include `bank_qr_url` mặc định.
- [x] 2.6 Cập nhật import validation để require `game_id`, reject duplicate `game_id` trong file, và reject conflict với profile khác trong guild.

## 3. Member panel và profile display

- [x] 3.1 Cập nhật profile view content/embed để hiển thị `ingame_name`, `game_id`, `mon_phai`, và QR khi caller được phép xem.
- [x] 3.2 Cập nhật member panel menu để thêm lựa chọn `Cập nhật QR ngân hàng`.
- [x] 3.3 Cập nhật update profile prompt/modal để nhập và prefill `game_id` cùng `ingame_name`.
- [x] 3.4 Cập nhật modal submit handler để đọc `game_id`, lưu profile, và trả lỗi duplicate/missing Game ID đúng yêu cầu.
- [x] 3.5 Thêm handler cho lựa chọn panel `Cập nhật QR ngân hàng` để hướng dẫn upload QR hoặc yêu cầu tạo profile trước.

## 4. Slash commands và permissions

- [x] 4.1 Cập nhật `/profile set-member` để admin nhập và lưu `game_id` cho member khác.
- [x] 4.2 Thêm `/profile set-qr file:<ảnh>` cho member/admin upload hoặc thay QR của chính mình.
- [x] 4.3 Thêm `/profile remove-qr` cho member/admin xóa QR của chính mình.
- [x] 4.4 Thêm `/profile view-member member:<user>` admin-only để xem profile member khác kèm QR nếu có.
- [x] 4.5 Refactor `/profile` execute để check quyền theo từng subcommand: admin-only cho quản trị/export/import, member/admin cho QR self-service.

## 5. Tests và verification

- [x] 5.1 Cập nhật database tests cho migration mới, `game_id`, `bank_qr_url`, và unique index `(guild_id, game_id)`.
- [x] 5.2 Cập nhật profile service tests cho required/unique `game_id`, duplicate import, export có `game_id` và không export QR mặc định.
- [x] 5.3 Cập nhật command definition/permission tests cho `set-qr`, `remove-qr`, `view-member`, và quyền theo từng subcommand.
- [x] 5.4 Cập nhật member panel interaction tests cho modal `game_id`, view profile, duplicate Game ID, và QR guidance.
- [x] 5.5 Chạy test suite hiện có và sửa regression nếu có.
