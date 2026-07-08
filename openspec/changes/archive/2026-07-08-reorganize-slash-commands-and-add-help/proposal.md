## Why

Danh sách slash command hiện đang tách theo lịch sử phát triển (`/vote-tao`, `/vote-dong`, `/vote-config`, `/profile`, `/member-panel`) nên khó nhớ, khó khám phá, và `/profile` đang chứa lẫn quản lý member với export attendance. Change này gom command theo nhóm nghiệp vụ rõ ràng và thêm `/help` để user/admin tự xem danh sách lệnh phù hợp quyền của mình.

## What Changes

- **BREAKING**: Thay hẳn các top-level command cũ bằng 4 command mới: `/help`, `/config`, `/vote`, `/member`.
- **BREAKING**: Không còn register các command cũ: `/vote-tao`, `/vote-dong`, `/vote-xem`, `/vote-lich-su`, `/vote-config`, `/profile`, `/member-panel`.
- Gom cấu hình bot vào `/config channel`, `/config member-role`, `/config admin-role`.
- Gom điểm danh vào `/vote create`, `/vote close`, `/vote view`, `/vote history`, `/vote export`.
- Gom quản lý member vào `/member panel`, `/member view`, `/member set-qr`, `/member remove-qr`, `/member view-other`, `/member set-other`, `/member import`, `/member export`.
- Thêm `/help` với topic optional để xem overview hoặc từng nhóm lệnh.
- `/help` SHALL hiển thị danh sách lệnh theo quyền hiện tại của user, đồng thời cung cấp mapping lệnh cũ sang lệnh mới trong giai đoạn chuyển đổi.
- Cập nhật docs/tests để phản ánh command tree mới.

## Capabilities

### New Capabilities
- `command-organization`: Định nghĩa command tree mới, mapping từ lệnh cũ sang lệnh mới, quyền sử dụng từng nhóm lệnh, và hành vi `/help`.

### Modified Capabilities
- `attendance-vote-configuration`: Cấu hình guild chuyển từ `/vote-config ...` sang `/config ...`.
- `attendance-voting`: Các thao tác vote chuyển từ top-level `/vote-*` sang `/vote ...`, và export attendance chuyển từ `/profile export-attendance` sang `/vote export`.
- `member-profiles`: Các thao tác quản lý member profile/QR/import/export chuyển từ `/profile ...` sang `/member ...`; thêm direct self-view bằng `/member view`.
- `member-management-panel`: Post member panel chuyển từ `/member-panel post` sang `/member panel`.

## Impact

- Command registry `src/commands/index.js` thay đổi từ 7 command cũ sang 4 command mới.
- Thêm command modules mới cho `/help`, `/config`, `/vote`, `/member`; logic cũ được move hoặc reuse trong command mới.
- Deploy slash commands sẽ remove các command cũ khỏi Discord command list.
- Permission checks cần giữ nguyên theo hành vi cũ: admin-only cho cấu hình/tạo/đóng/export/admin member operations; member/admin cho view/history/self profile/QR.
- README và test suite cần cập nhật command names, subcommands, và help output.
