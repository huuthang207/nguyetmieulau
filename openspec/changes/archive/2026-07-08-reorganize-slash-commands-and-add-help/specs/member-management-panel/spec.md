## MODIFIED Requirements

### Requirement: Admin can post a member management panel
Hệ thống SHALL cho phép admin post một member management panel vào channel hiện tại bằng slash command `/member panel`, và panel SHALL chứa select menu để member chọn chức năng quản lý hồ sơ.

#### Scenario: Admin posts panel successfully
- **WHEN** user có quyền `Administrator` hoặc có `admin role` dùng `/member panel` trong một guild
- **THEN** hệ thống SHALL gửi một public panel message vào channel hiện tại
- **AND** panel SHALL có select menu với các lựa chọn quản lý hồ sơ member
- **AND** phản hồi command SHALL xác nhận panel đã được tạo

#### Scenario: Unauthorized user attempts to post panel
- **WHEN** user không có quyền `Administrator` và không có `admin role` dùng `/member panel`
- **THEN** hệ thống SHALL không gửi panel message
- **AND** phản hồi SHALL cho biết user không có quyền quản trị bot
