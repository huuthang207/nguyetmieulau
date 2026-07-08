## MODIFIED Requirements

### Requirement: Members can manage their in-game profile per guild
Hệ thống SHALL lưu `member profile` theo từng guild với các trường bắt buộc của profile, đồng thời cho phép member tự xem profile của chính mình thông qua `/member view` hoặc member management panel, và cập nhật các trường text profile thông qua member management panel.

#### Scenario: Member creates or updates own profile from panel
- **WHEN** user hoàn tất flow cập nhật hồ sơ trên member management panel với dữ liệu profile hợp lệ
- **THEN** hệ thống SHALL tạo mới hoặc cập nhật `member profile` cho cặp `(guild_id, user_id)` hiện tại
- **AND** phản hồi SHALL xác nhận profile đã được lưu thành công

#### Scenario: Member views own profile from panel
- **WHEN** user chọn `Xem hồ sơ hiện tại` trên member management panel và đã có profile trong guild hiện tại
- **THEN** hệ thống SHALL trả về thông tin profile hiện tại của chính user đó dưới dạng ephemeral

#### Scenario: Member views own profile from slash command
- **WHEN** user có `member role` hoặc quyền admin dùng `/member view` và đã có profile trong guild hiện tại
- **THEN** hệ thống SHALL trả về thông tin profile hiện tại của chính user đó dưới dạng ephemeral

#### Scenario: Profile self-service slash commands are not available for text profile
- **WHEN** slash commands được deploy cho guild
- **THEN** command `/member` SHALL không có subcommand self-service để member cập nhật các trường text profile trực tiếp
- **AND** member SHALL cập nhật các trường text profile thông qua member management panel

### Requirement: Admin can manage member profiles for the guild
Hệ thống SHALL cho phép admin cập nhật và xem profile cho member khác trong cùng guild thông qua slash command `/member`.

#### Scenario: Admin sets profile for another member
- **WHEN** user có quyền `Administrator` hoặc có `admin role` dùng `/member set-other` với một `member` và dữ liệu profile hợp lệ
- **THEN** hệ thống SHALL tạo mới hoặc cập nhật `member profile` cho `member` được chỉ định trong guild hiện tại
- **AND** phản hồi SHALL xác nhận admin đã cập nhật profile thành công

#### Scenario: Admin views profile for another member
- **WHEN** user có quyền `Administrator` hoặc có `admin role` dùng `/member view-other` với một `member`
- **THEN** hệ thống SHALL trả về profile của member đó dưới dạng ephemeral nếu profile tồn tại
- **AND** nếu profile có QR ngân hàng thì phản hồi SHALL hiển thị QR đó cho admin

#### Scenario: Non-admin attempts to manage another member profile
- **WHEN** user không có quyền `Administrator` và không có `admin role` dùng `/member set-other` hoặc `/member view-other`
- **THEN** hệ thống SHALL từ chối thao tác
- **AND** phản hồi SHALL cho biết user không có quyền quản trị bot

## ADDED Requirements

### Requirement: Member profile data import and export use member command
Hệ thống SHALL cho phép admin import/export member profiles bằng `/member import` và `/member export`, thay cho vị trí cũ trong `/profile`.

#### Scenario: Admin imports member profiles
- **WHEN** user có quyền `Administrator` hoặc có `admin role` dùng `/member import` với file JSON member profiles hợp lệ
- **THEN** hệ thống SHALL import danh sách member profiles vào guild hiện tại
- **AND** phản hồi SHALL là ephemeral xác nhận số lượng profile đã import

#### Scenario: Admin exports member profiles
- **WHEN** user có quyền `Administrator` hoặc có `admin role` dùng `/member export`
- **THEN** hệ thống SHALL trả về JSON attachment chứa danh sách member profiles của guild hiện tại
- **AND** phản hồi SHALL là ephemeral

#### Scenario: Non-admin attempts member data exchange
- **WHEN** user không có quyền `Administrator` và không có `admin role` dùng `/member import` hoặc `/member export`
- **THEN** hệ thống SHALL từ chối thao tác
- **AND** phản hồi SHALL cho biết user không có quyền quản trị bot

### Requirement: Bank QR self-service uses member command
Hệ thống SHALL cho phép member upload và xóa QR ngân hàng của chính mình bằng `/member set-qr` và `/member remove-qr`.

#### Scenario: Member uploads own QR from member command
- **WHEN** user có `member role` hoặc quyền admin dùng `/member set-qr` với attachment ảnh hợp lệ
- **THEN** hệ thống SHALL lưu QR ngân hàng vào profile của chính user đó
- **AND** phản hồi SHALL là ephemeral xác nhận QR đã được lưu

#### Scenario: Member removes own QR from member command
- **WHEN** user có `member role` hoặc quyền admin dùng `/member remove-qr`
- **THEN** hệ thống SHALL xóa QR ngân hàng khỏi profile của chính user đó
- **AND** phản hồi SHALL là ephemeral xác nhận QR đã được xóa
