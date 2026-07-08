## ADDED Requirements

### Requirement: Slash commands are organized by domain
Hệ thống SHALL register đúng 4 top-level slash commands là `/help`, `/config`, `/vote`, và `/member`, đồng thời SHALL không register các top-level command cũ sau khi change này được áp dụng.

#### Scenario: New command registry is deployed
- **WHEN** slash commands được deploy cho guild hoặc global application
- **THEN** command registry SHALL chứa `/help`, `/config`, `/vote`, và `/member`
- **AND** command registry SHALL không chứa `/vote-tao`, `/vote-dong`, `/vote-xem`, `/vote-lich-su`, `/vote-config`, `/profile`, hoặc `/member-panel`

#### Scenario: Vote operations are under vote command
- **WHEN** user mở command `/vote`
- **THEN** hệ thống SHALL cung cấp các subcommand `create`, `close`, `view`, `history`, và `export`

#### Scenario: Member operations are under member command
- **WHEN** user mở command `/member`
- **THEN** hệ thống SHALL cung cấp các subcommand `panel`, `view`, `set-qr`, `remove-qr`, `view-other`, `set-other`, `import`, và `export`

#### Scenario: Configuration operations are under config command
- **WHEN** user mở command `/config`
- **THEN** hệ thống SHALL cung cấp các subcommand `channel`, `member-role`, và `admin-role`

### Requirement: Help command lists available commands
Hệ thống SHALL cung cấp `/help` để user xem danh sách lệnh bot theo nhóm nghiệp vụ và theo quyền hiện tại của user.

#### Scenario: User opens default help
- **WHEN** user dùng `/help` không truyền `topic`
- **THEN** hệ thống SHALL trả về ephemeral message hoặc embed liệt kê overview các nhóm command chính
- **AND** response SHALL hướng dẫn user dùng `topic` để xem chi tiết từng nhóm

#### Scenario: Admin opens help
- **WHEN** user có quyền `Administrator` hoặc có `admin role` dùng `/help`
- **THEN** hệ thống SHALL hiển thị các lệnh member-accessible và admin-only
- **AND** các lệnh admin SHALL được ghi rõ là cần quyền admin nếu cần phân biệt

#### Scenario: Member opens help
- **WHEN** user có `member role` nhưng không có quyền admin dùng `/help`
- **THEN** hệ thống SHALL hiển thị các lệnh member-accessible
- **AND** hệ thống SHALL không làm rối output mặc định bằng toàn bộ chi tiết admin-only commands

#### Scenario: User opens topic help
- **WHEN** user dùng `/help topic:<topic>` với topic hợp lệ trong `all`, `vote`, `member`, `config`, `admin`, hoặc `legacy`
- **THEN** hệ thống SHALL trả về ephemeral help content tương ứng với topic đó

#### Scenario: User opens legacy mapping help
- **WHEN** user dùng `/help topic:legacy`
- **THEN** hệ thống SHALL hiển thị mapping từ command cũ sang command mới
- **AND** mapping SHALL bao gồm ít nhất `/vote-tao -> /vote create`, `/vote-dong -> /vote close`, `/vote-xem -> /vote view`, `/vote-lich-su -> /vote history`, `/vote-config -> /config`, `/profile -> /member`, và `/member-panel -> /member panel`

### Requirement: Command permissions remain equivalent after reorganization
Hệ thống SHALL giữ nguyên quyền truy cập nghiệp vụ sau khi đổi tên command, chỉ thay đổi vị trí command/subcommand.

#### Scenario: Admin-only commands stay admin-only
- **WHEN** user không có quyền `Administrator` và không có `admin role` dùng `/config`, `/vote create`, `/vote close`, `/vote export`, `/member panel`, `/member view-other`, `/member set-other`, `/member import`, hoặc `/member export`
- **THEN** hệ thống SHALL từ chối thao tác
- **AND** phản hồi SHALL cho biết user không có quyền quản trị bot

#### Scenario: Member commands require member access
- **WHEN** user không có `member role`, không có quyền `Administrator`, và không có `admin role` dùng `/vote view`, `/vote history`, `/member view`, `/member set-qr`, hoặc `/member remove-qr`
- **THEN** hệ thống SHALL từ chối thao tác
- **AND** phản hồi SHALL cho biết user không có quyền phù hợp
