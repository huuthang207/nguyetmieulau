## Context

Hệ thống hiện lưu member profile theo `(guild_id, user_id)` với `ingame_name`, `mon_phai`, và `updated_at`. `ingame_name` đã unique trong guild, `mon_phai` dùng danh sách cố định, member tự cập nhật qua member management panel, còn admin quản lý/import/export qua `/profile`.

Change này bổ sung hai nhóm dữ liệu mới:

- `game_id`: định danh bắt buộc của nhân vật/account trong game, do member tự nhập và unique trong từng guild.
- `bank_qr_url`: ảnh QR ngân hàng optional, do member tự upload và chỉ chính member hoặc admin bot được xem.

Ràng buộc chính từ Discord UI là modal chỉ hỗ trợ text input, không hỗ trợ file upload. Vì vậy nhập `game_id` có thể nằm trong modal cập nhật profile, còn upload QR cần đi qua slash command attachment hoặc một flow hướng dẫn riêng.

## Goals / Non-Goals

**Goals:**

- Lưu `game_id` bắt buộc cho mọi member profile mới/cập nhật.
- Enforce uniqueness của `game_id` trong phạm vi guild, tương tự `ingame_name`.
- Cho phép member upload, thay thế, và xóa QR ngân hàng của chính mình bằng attachment ảnh.
- Đảm bảo QR chỉ chính chủ profile và admin bot xem được.
- Cho phép admin xem profile member khác kèm QR, và set `game_id` khi quản lý profile cho member khác.
- Cập nhật import/export để hỗ trợ `game_id` mà không export QR mặc định.
- Hỗ trợ SQLite và MySQL bằng migration tương ứng.

**Non-Goals:**

- Không thêm storage riêng như S3/R2/Cloudinary; QR sẽ lưu bằng Discord attachment URL.
- Không public QR cho toàn bộ member trong guild.
- Không hỗ trợ nhiều QR hoặc nhiều tài khoản ngân hàng cho một member trong change này.
- Không snapshot `game_id` hoặc QR vào attendance response; attendance export vẫn tập trung vào dữ liệu điểm danh hiện tại.

## Decisions

### 1. Lưu QR bằng Discord attachment URL

Member upload ảnh qua slash command attachment, bot validate attachment là ảnh rồi lưu `attachment.url` vào `member_profiles.bank_qr_url`.

Alternatives considered:

- **Nhập URL trong modal**: đơn giản hơn nhưng UX kém, dễ nhập sai link và không đúng yêu cầu member tự upload ảnh.
- **Storage riêng**: bền vững hơn nhưng tăng dependency, secret, config, chi phí vận hành và complexity không cần thiết cho bot guild hiện tại.

Rationale: attachment URL là lựa chọn nhẹ nhất đáp ứng đúng requirement upload ảnh, phù hợp codebase hiện chưa có external storage.

### 2. Tách text profile update và QR upload

Panel update hiện dùng select menu chọn `mon_phai` rồi mở modal nhập text. Modal sẽ thêm `game_id` cạnh `ingame_name`. QR upload sẽ dùng subcommand member-accessible, ví dụ `/profile set-qr file:<ảnh>`, vì modal không thể upload file.

Panel có thể thêm option `Cập nhật QR ngân hàng` để trả ephemeral guidance dẫn user dùng command upload.

### 3. Quyền `/profile` phải check theo từng subcommand

Hiện `/profile` chặn admin ở đầu `execute`, phù hợp khi mọi subcommand đều admin-only. Sau change, `/profile set-qr` và `/profile remove-qr` là self-service cho member/admin, nên `execute` cần phân nhánh quyền:

- Admin-only: `set-member`, `view-member`, `import-members`, `export-members`, `export-attendance`.
- Member/admin self-service: `set-qr`, `remove-qr`.

Self-service QR command cần dùng cùng logic quyền với member panel (`canViewAttendance`) để user phải có member role hoặc quyền admin.

### 4. `game_id` là required và unique theo guild

Database thêm `game_id` `NOT NULL` và unique index `(guild_id, game_id)`. Service validation trim `game_id`, reject rỗng, reject trùng với user khác trong cùng guild, và cho phép user giữ `game_id` hiện tại của mình.

Migration cần xử lý dữ liệu hiện có. Vì existing profiles chưa có `game_id`, không thể thêm `NOT NULL` một cách an toàn nếu bảng đã có rows. Phương án triển khai an toàn:

- Thêm cột nullable trước.
- Backfill deterministic placeholder cho profile hiện có, ví dụ `legacy-${user_id}` hoặc `legacy-${guild_id}-${user_id}`.
- Với SQLite, nếu cần enforce `NOT NULL` nghiêm ngặt thì có thể rebuild table; nếu tránh rebuild, application-level validation vẫn đảm bảo profile mới/cập nhật có `game_id`.
- Với MySQL, sau backfill có thể alter cột thành `NOT NULL`.

Trong implementation thực tế nên ưu tiên migration ít rủi ro, đồng thời service layer enforce required để tránh dữ liệu mới thiếu `game_id`.

### 5. Export không bao gồm QR mặc định

`export-members` sẽ include `game_id` nhưng không include `bank_qr_url` mặc định. QR là dữ liệu nhạy cảm hơn profile game và file export dễ bị chia sẻ nhầm. Admin vẫn có thể xem QR từng member qua `view-member`.

Nếu sau này cần backup đầy đủ, có thể thêm option riêng như `include_qr`, nhưng không nằm trong scope hiện tại.

## Risks / Trade-offs

- [Discord attachment URL không phải storage được kiểm soát hoàn toàn] → Chấp nhận cho giai đoạn này; nếu cần độ bền cao hơn sẽ migrate sang storage riêng trong change khác.
- [Existing profiles chưa có `game_id`] → Migration backfill placeholder và yêu cầu member/admin cập nhật lại Game ID thật khi chỉnh profile.
- [Unique index có thể fail nếu backfill không unique] → Dùng placeholder dựa trên `user_id` trong từng guild để đảm bảo uniqueness.
- [QR là dữ liệu nhạy cảm] → Chỉ trả QR trong ephemeral/self view hoặc admin-only command; không đưa QR vào export mặc định.
- [Slash command `/profile` đổi quyền theo subcommand dễ regression] → Cần tests cho admin-only commands, member QR commands, non-member denial, và command definition.

## Migration Plan

1. Thêm migration `003` cho SQLite/MySQL:
   - thêm `game_id`, `bank_qr_url` vào `member_profiles`;
   - backfill `game_id` cho rows hiện có;
   - thêm unique index `(guild_id, game_id)`.
2. Cập nhật repositories để đọc/lưu `game_id` và `bank_qr_url`.
3. Cập nhật profile service validation và import validation.
4. Cập nhật member panel modal/view content.
5. Cập nhật `/profile` command và permission branching.
6. Cập nhật tests.

Rollback nếu chưa deploy dữ liệu thật có thể revert code và migration trong môi trường dev. Sau khi migration chạy production, rollback code cần giữ khả năng ignore cột mới; không nên drop cột QR/Game ID nếu chưa backup.

## Open Questions

- Có cần giới hạn format `game_id` chỉ số hay cho phép text bất kỳ? Mặc định implementation nên trim và giới hạn độ dài, chưa ép chỉ số để tránh sai giả định.
- Giới hạn file QR nên là bao nhiêu MB? Mặc định nên dùng giới hạn nhỏ hợp lý, ví dụ `5MB`, và chỉ chấp nhận `image/*`.
