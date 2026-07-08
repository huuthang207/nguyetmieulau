## Why

Member profile hiện chỉ lưu `ingame_name` và `mon_phai`, chưa đủ để định danh nhân vật bằng Game ID và chưa hỗ trợ thành viên tự lưu QR ngân hàng phục vụ giao dịch nội bộ. Change này bổ sung dữ liệu định danh bắt buộc và kênh lưu QR có kiểm soát quyền xem để tăng tính chính xác và riêng tư khi quản lý thành viên.

## What Changes

- Thêm `game_id` bắt buộc vào member profile, do member tự nhập khi cập nhật hồ sơ.
- Đảm bảo `game_id` là duy nhất trong phạm vi từng guild.
- Thêm QR ngân hàng optional cho member profile, do chính member tự upload ảnh.
- Cập nhật member panel để member nhập/xem `game_id` và nhận hướng dẫn upload QR.
- Thêm hoặc điều chỉnh slash command để member có quyền upload/xóa QR của chính mình.
- Cho phép admin xem profile của member khác kèm QR nếu member đã upload.
- Cập nhật admin profile management và import/export để hỗ trợ `game_id`.
- Giữ QR ngân hàng không public cho toàn bộ member; chỉ chính chủ profile và admin bot được xem.

## Capabilities

### New Capabilities

### Modified Capabilities
- `member-profiles`: Bổ sung `game_id` bắt buộc, unique trong guild; bổ sung QR ngân hàng optional với quyền xem giới hạn cho chính member và admin; cập nhật admin management/import/export liên quan.
- `member-management-panel`: Cập nhật flow panel để member nhập `game_id`, xem thông tin mới, và truy cập hướng dẫn/quy trình upload QR ngân hàng.

## Impact

- Database migration cho SQLite và MySQL: thêm cột `game_id`, `bank_qr_url`, và unique index `(guild_id, game_id)`.
- Repository/profile service validation: validate required/unique `game_id`, lưu/xóa QR URL, kiểm tra attachment ảnh.
- Discord interactions: modal cập nhật profile cần thêm input `game_id`; panel cần hiển thị trạng thái QR/hướng dẫn upload.
- Slash command `/profile`: cần check quyền theo từng subcommand vì một số subcommand mới là member self-service, trong khi các subcommand hiện có vẫn admin-only.
- Export/import JSON member profiles: thêm `game_id`; QR không export mặc định để tránh chia sẻ nhầm dữ liệu nhạy cảm.
- Tests: cập nhật database, profile validation, command definitions, member panel flow, và permission checks.
