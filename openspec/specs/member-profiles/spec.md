# Capability: member-profiles

## Purpose

Định nghĩa hồ sơ nhân vật theo từng guild, bao gồm `ingame_name`, `game_id`, `mon_phai`, QR ngân hàng optional, quy tắc uniqueness, danh sách môn phái hợp lệ, quyền tự quản lý của member, và quyền quản trị profile.

## Requirements

### Requirement: Members can manage their in-game profile per guild
Hệ thống SHALL lưu `member profile` theo từng guild với các trường bắt buộc là `ingame_name`, `game_id`, và `mon_phai`, đồng thời cho phép member tự xem profile của chính mình thông qua `/member view` hoặc member management panel, và cập nhật các trường text profile thông qua member management panel.

#### Scenario: Member creates or updates own profile from panel
- **WHEN** user hoàn tất flow cập nhật hồ sơ trên member management panel với `ingame_name` hợp lệ, `game_id` hợp lệ, và `mon_phai` thuộc danh sách lựa chọn cố định
- **THEN** hệ thống SHALL tạo mới hoặc cập nhật `member profile` cho cặp `(guild_id, user_id)` hiện tại
- **AND** phản hồi SHALL xác nhận profile đã được lưu thành công
- **AND** profile đã lưu SHALL chứa đúng `ingame_name`, `game_id`, và `mon_phai`

#### Scenario: Member views own profile from panel
- **WHEN** user chọn `Xem hồ sơ hiện tại` trên member management panel và đã có profile trong guild hiện tại
- **THEN** hệ thống SHALL trả về thông tin `ingame_name`, `game_id`, và `mon_phai` hiện tại của chính user đó dưới dạng ephemeral
- **AND** nếu user đã upload QR ngân hàng thì phản hồi SHALL hiển thị QR đó cho chính user

#### Scenario: Member views own profile from slash command
- **WHEN** user có `member role` hoặc quyền admin dùng `/member view` và đã có profile trong guild hiện tại
- **THEN** hệ thống SHALL trả về thông tin profile hiện tại của chính user đó dưới dạng ephemeral
- **AND** nếu user đã upload QR ngân hàng thì phản hồi SHALL hiển thị QR đó cho chính user

#### Scenario: Profile self-service slash commands are not available for text profile
- **WHEN** slash commands được deploy cho guild
- **THEN** command `/member` SHALL không có subcommand self-service để member cập nhật `ingame_name`, `game_id`, hoặc `mon_phai` bằng text options trực tiếp
- **AND** member SHALL cập nhật các trường text profile thông qua member management panel

### Requirement: In-game name must be unique within a guild
Hệ thống SHALL đảm bảo `ingame_name` là duy nhất trong phạm vi một guild cho mọi thao tác tạo hoặc cập nhật `member profile`.

#### Scenario: Reject duplicate in-game name on self update
- **WHEN** user submit modal cập nhật hồ sơ từ member management panel với `ingame_name` đang được một `user_id` khác sử dụng trong cùng guild
- **THEN** hệ thống SHALL từ chối lưu profile
- **AND** phản hồi SHALL cho biết `ingame_name` đã tồn tại trong guild

#### Scenario: Allow member to keep current in-game name
- **WHEN** user submit modal cập nhật hồ sơ từ member management panel với chính `ingame_name` hiện tại của mình trong cùng guild và thay đổi hoặc giữ nguyên thông tin khác
- **THEN** hệ thống SHALL cho phép cập nhật profile mà không coi đó là xung đột uniqueness

### Requirement: Game ID must be required and unique within a guild
Hệ thống SHALL yêu cầu `game_id` không rỗng cho mọi member profile và SHALL đảm bảo `game_id` là duy nhất trong phạm vi một guild.

#### Scenario: Member submits profile without game ID
- **WHEN** user submit modal cập nhật hồ sơ từ member management panel với `game_id` rỗng hoặc chỉ gồm whitespace
- **THEN** hệ thống SHALL từ chối lưu profile
- **AND** phản hồi SHALL cho biết `game_id` không được để trống

#### Scenario: Reject duplicate game ID on self update
- **WHEN** user submit modal cập nhật hồ sơ từ member management panel với `game_id` đang được một `user_id` khác sử dụng trong cùng guild
- **THEN** hệ thống SHALL từ chối lưu profile
- **AND** phản hồi SHALL cho biết `game_id` đã tồn tại trong guild

#### Scenario: Allow member to keep current game ID
- **WHEN** user submit modal cập nhật hồ sơ từ member management panel với chính `game_id` hiện tại của mình trong cùng guild và thay đổi hoặc giữ nguyên thông tin khác
- **THEN** hệ thống SHALL cho phép cập nhật profile mà không coi đó là xung đột uniqueness

#### Scenario: Admin submits duplicate game ID for another member
- **WHEN** admin dùng `/member set-other` với `game_id` đang được member khác sử dụng trong cùng guild
- **THEN** hệ thống SHALL từ chối lưu profile
- **AND** phản hồi SHALL cho biết `game_id` đã tồn tại trong guild

### Requirement: Mon phai uses a fixed selectable list
Hệ thống SHALL giới hạn `mon_phai` trong `member profile` vào đúng một giá trị thuộc danh sách cố định gồm `Toái Mộng`, `Huyết Hà`, `Thiết Y`, `Thần Tương`, `Tố Vấn`, `Long Ngâm`, và `Cửu Linh`.

#### Scenario: Member selects a valid mon phai choice
- **WHEN** user chọn một `mon_phai` từ select menu cập nhật hồ sơ trên member management panel
- **THEN** hệ thống SHALL lưu đúng giá trị `mon_phai` đã chọn vào profile của user

#### Scenario: Admin imports an invalid mon phai value
- **WHEN** admin import file JSON member profiles có item chứa `mon_phai` không thuộc danh sách cố định
- **THEN** hệ thống SHALL từ chối import file đó
- **AND** phản hồi SHALL nêu rõ item không hợp lệ

### Requirement: Admin can manage member profiles for the guild
Hệ thống SHALL cho phép admin cập nhật và xem profile cho member khác trong cùng guild thông qua slash command `/member`.

#### Scenario: Admin sets profile for another member
- **WHEN** user có quyền `Administrator` hoặc có `admin role` dùng `/member set-other` với một `member`, `ingame_name`, `game_id`, và `mon_phai` hợp lệ
- **THEN** hệ thống SHALL tạo mới hoặc cập nhật `member profile` cho `member` được chỉ định trong guild hiện tại
- **AND** phản hồi SHALL xác nhận admin đã cập nhật profile thành công
- **AND** phản hồi SHALL hiển thị `ingame_name`, `game_id`, và `mon_phai` vừa lưu

#### Scenario: Admin views profile for another member
- **WHEN** user có quyền `Administrator` hoặc có `admin role` dùng `/member view-other` với một `member`
- **THEN** hệ thống SHALL trả về profile của member đó dưới dạng ephemeral nếu profile tồn tại
- **AND** nếu profile có QR ngân hàng thì phản hồi SHALL hiển thị QR đó cho admin

#### Scenario: Non-admin attempts to manage another member profile
- **WHEN** user không có quyền `Administrator` và không có `admin role` dùng `/member set-other` hoặc `/member view-other`
- **THEN** hệ thống SHALL từ chối thao tác
- **AND** phản hồi SHALL cho biết user không có quyền quản trị bot

### Requirement: Members can upload and remove their own bank QR
Hệ thống SHALL cho phép member có quyền dùng member panel upload, thay thế, và xóa QR ngân hàng optional của chính mình bằng slash command attachment `/member set-qr` và `/member remove-qr`.

#### Scenario: Member uploads valid bank QR image
- **WHEN** user có `member role` hoặc quyền admin dùng `/member set-qr` với attachment ảnh hợp lệ trong một guild
- **THEN** hệ thống SHALL lưu URL ảnh QR vào profile của chính user đó
- **AND** phản hồi SHALL là ephemeral xác nhận QR đã được lưu

#### Scenario: Member uploads QR before creating text profile
- **WHEN** user có `member role` hoặc quyền admin dùng `/member set-qr` nhưng chưa có member profile trong guild hiện tại
- **THEN** hệ thống SHALL từ chối lưu QR
- **AND** phản hồi SHALL hướng dẫn user cập nhật hồ sơ trên member management panel trước

#### Scenario: Member uploads non-image attachment
- **WHEN** user dùng `/member set-qr` với attachment không phải ảnh
- **THEN** hệ thống SHALL từ chối lưu QR
- **AND** phản hồi SHALL cho biết file QR phải là ảnh hợp lệ

#### Scenario: Member removes own bank QR
- **WHEN** user có `member role` hoặc quyền admin dùng `/member remove-qr` và profile của user có QR ngân hàng
- **THEN** hệ thống SHALL xóa QR ngân hàng khỏi profile của chính user đó
- **AND** phản hồi SHALL là ephemeral xác nhận QR đã được xóa

#### Scenario: User without member access attempts to upload QR
- **WHEN** user không có `member role`, không có quyền `Administrator`, và không có `admin role` dùng `/member set-qr`
- **THEN** hệ thống SHALL từ chối thao tác
- **AND** phản hồi SHALL là ephemeral cho biết user không có quyền sử dụng chức năng này

### Requirement: Bank QR visibility is limited to profile owner and admins
Hệ thống SHALL chỉ hiển thị QR ngân hàng cho chính chủ profile hoặc admin bot trong guild.

#### Scenario: Profile owner views own QR
- **WHEN** user chọn `Xem hồ sơ hiện tại` trên member management panel hoặc dùng `/member view` và profile của user có QR ngân hàng
- **THEN** hệ thống SHALL hiển thị QR ngân hàng trong phản hồi ephemeral cho user đó

#### Scenario: Admin views another member QR
- **WHEN** admin dùng `/member view-other` cho member có QR ngân hàng trong guild hiện tại
- **THEN** hệ thống SHALL hiển thị profile của member đó kèm QR ngân hàng trong phản hồi ephemeral cho admin

#### Scenario: Non-admin attempts to view another member QR
- **WHEN** user không có quyền admin cố xem profile hoặc QR của member khác
- **THEN** hệ thống SHALL từ chối thao tác
- **AND** phản hồi SHALL cho biết user không có quyền quản trị bot

### Requirement: Member profile import and export include game ID without exporting QR by default
Hệ thống SHALL hỗ trợ `game_id` trong import/export member profiles qua `/member import` và `/member export`, đồng thời SHALL không export QR ngân hàng mặc định.

#### Scenario: Admin exports member profiles
- **WHEN** admin dùng `/member export`
- **THEN** file JSON export SHALL chứa `discord_user_id`, `ingame_name`, `game_id`, và `mon_phai` cho từng profile
- **AND** file JSON export SHALL không chứa `bank_qr_url` mặc định

#### Scenario: Admin imports member profiles with valid game IDs
- **WHEN** admin import file JSON member profiles bằng `/member import` có mỗi item chứa `discord_user_id`, `ingame_name`, `game_id`, và `mon_phai` hợp lệ
- **THEN** hệ thống SHALL tạo mới hoặc cập nhật các member profile tương ứng
- **AND** mỗi profile đã import SHALL lưu đúng `game_id`

#### Scenario: Admin imports member profiles missing game ID
- **WHEN** admin import file JSON member profiles có item thiếu `game_id` hoặc `game_id` rỗng
- **THEN** hệ thống SHALL từ chối import file đó
- **AND** phản hồi SHALL nêu rõ item thiếu `game_id`

#### Scenario: Admin imports duplicate game IDs in one file
- **WHEN** admin import file JSON member profiles có nhiều item trùng `game_id` trong cùng file
- **THEN** hệ thống SHALL từ chối import file đó
- **AND** phản hồi SHALL nêu rõ item bị trùng `game_id`

#### Scenario: Non-admin attempts member data exchange
- **WHEN** user không có quyền `Administrator` và không có `admin role` dùng `/member import` hoặc `/member export`
- **THEN** hệ thống SHALL từ chối thao tác
- **AND** phản hồi SHALL cho biết user không có quyền quản trị bot
