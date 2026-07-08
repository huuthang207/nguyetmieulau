## Why

Member hiện phải nhớ và dùng slash command `/profile set` / `/profile xem` để quản lý hồ sơ nhân vật, trong khi luồng vận hành mong muốn là một kênh member riêng có menu thao tác sẵn. Việc chuyển self-service profile sang panel cố định giúp trải nghiệm rõ ràng hơn, giảm lỗi nhập `mon_phai`, và gom các thao tác member vào một nơi dễ hướng dẫn.

## What Changes

- Thêm member management panel được admin post vào kênh member bằng command mới.
- Panel có select menu cho member chọn chức năng:
  - Xem hồ sơ hiện tại.
  - Cập nhật hồ sơ nhân vật.
- Luồng cập nhật profile SHALL hiển thị hồ sơ cũ trước, sau đó cho member chọn `mon_phai` bằng select menu, rồi mở modal để nhập `ingame_name`.
- Lưu profile bằng validation hiện có: `ingame_name` không rỗng, unique trong guild, và `mon_phai` thuộc danh sách cố định.
- **BREAKING**: Bỏ self-service `/profile set` và `/profile xem`; member tự xem/cập nhật profile qua panel thay vì slash command.
- Giữ các subcommand admin/data hiện có của `/profile` như `set-member`, `import-members`, `export-members`, và `export-attendance`.
- Cập nhật hướng dẫn khi member vote nhưng chưa có profile để trỏ tới member panel thay vì `/profile set`.

## Capabilities

### New Capabilities
- `member-management-panel`: Định nghĩa panel trong kênh member, menu xem/cập nhật profile, select môn phái, modal nhập tên, và quyền sử dụng panel.

### Modified Capabilities
- `member-profiles`: Thay đổi yêu cầu self-service từ slash command `/profile set` / `/profile xem` sang member management panel, đồng thời giữ admin profile management.
- `attendance-voting`: Cập nhật yêu cầu thông báo khi member chưa có profile để hướng dẫn dùng member panel thay vì `/profile set`.

## Impact

- Affected code:
  - `src/commands/index.js`
  - `src/commands/profile.js`
  - command mới cho việc post member panel, ví dụ `src/commands/member-panel.js`
  - interaction handler mới, ví dụ `src/interactions/member-panel.js`
  - `src/index.js` để route `StringSelectMenu` và `ModalSubmit` cho member panel
  - UI builder/helper mới hoặc mở rộng service hiện có cho panel payload
  - `src/interactions/vote-buttons.js` hoặc nội dung phản hồi vote khi thiếu profile
  - tests cho command registration, panel interactions, modal submit, và removal của `/profile set` / `/profile xem`
- APIs/dependencies:
  - Không cần dependency mới.
  - Sử dụng Discord components hiện có trong `discord.js` v14: `StringSelectMenuBuilder`, `ActionRowBuilder`, `ModalBuilder`, `TextInputBuilder`.
- Data/storage:
  - Không cần migration DB mới; dùng bảng `member_profiles` hiện có.
