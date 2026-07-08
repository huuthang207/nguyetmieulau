## ADDED Requirements

### Requirement: Admin can export member profiles as JSON
Hệ thống SHALL cho phép admin xuất toàn bộ `member profile` của guild hiện tại dưới dạng file JSON qua slash command `/profile`.

#### Scenario: Admin exports member profiles
- **WHEN** user có quyền `Administrator` hoặc có `admin role` dùng `/profile export-members`
- **THEN** hệ thống SHALL tạo file JSON chứa `type`, `guild_id`, `exported_at`, và danh sách `member profile` của guild hiện tại
- **AND** phản hồi SHALL đính kèm file JSON đó dưới dạng ephemeral hoặc attachment phù hợp trong Discord

#### Scenario: Non-admin attempts to export member profiles
- **WHEN** user không có quyền `Administrator` và không có `admin role` dùng `/profile export-members`
- **THEN** hệ thống SHALL từ chối thao tác
- **AND** phản hồi SHALL cho biết user không có quyền quản trị bot

### Requirement: Admin can import member profiles from JSON
Hệ thống SHALL cho phép admin nhập danh sách `member profile` của guild hiện tại từ file JSON, sau khi validate đầy đủ định dạng file, uniqueness của `ingame_name`, và danh sách `mon_phai` hợp lệ.

#### Scenario: Admin imports a valid member profile file
- **WHEN** user có quyền `Administrator` hoặc có `admin role` dùng `/profile import-members` với file JSON hợp lệ cho guild hiện tại
- **THEN** hệ thống SHALL tạo mới hoặc cập nhật các `member profile` tương ứng trong guild
- **AND** phản hồi SHALL nêu số lượng item được import thành công

#### Scenario: Import file has duplicate in-game names
- **WHEN** admin import file JSON có hai hoặc nhiều item dùng cùng một `ingame_name` trong cùng file hoặc xung đột với profile của user khác trong guild
- **THEN** hệ thống SHALL từ chối import file đó
- **AND** phản hồi SHALL liệt kê lỗi uniqueness để admin sửa dữ liệu trước khi import lại

#### Scenario: Import file has wrong type or guild scope
- **WHEN** admin import file không có `type` phù hợp cho `member_profiles` hoặc `guild_id` không khớp guild hiện tại
- **THEN** hệ thống SHALL từ chối import file đó
- **AND** phản hồi SHALL cho biết file import không đúng loại hoặc không đúng guild

### Requirement: Admin can export attendance results as JSON
Hệ thống SHALL cho phép admin xuất dữ liệu điểm danh của một vote dưới dạng file JSON, bao gồm lựa chọn vote và thông tin profile hiện tại dùng để hiển thị kết quả.

#### Scenario: Admin exports attendance for a specific vote
- **WHEN** user có quyền `Administrator` hoặc có `admin role` dùng `/profile export-attendance` với `vote_id` của một vote tồn tại trong guild hiện tại
- **THEN** hệ thống SHALL tạo file JSON chứa `type`, `guild_id`, `vote_id`, metadata của vote, và danh sách attendance items gồm ít nhất `discord_user_id`, `ingame_name`, `mon_phai`, và `choice`
- **AND** phản hồi SHALL đính kèm file JSON xuất dữ liệu đó

#### Scenario: Admin exports attendance without vote id and open vote exists
- **WHEN** admin dùng `/profile export-attendance` mà không truyền `vote_id` và guild hiện có vote `open`
- **THEN** hệ thống SHALL xuất dữ liệu attendance của vote `open` hiện tại

#### Scenario: Export attendance fails because no target vote exists
- **WHEN** admin dùng `/profile export-attendance` mà không truyền `vote_id`, guild không có vote `open`, và không có rule fallback nào khác được áp dụng
- **THEN** hệ thống SHALL từ chối export
- **AND** phản hồi SHALL cho biết không tìm thấy vote mục tiêu để xuất dữ liệu
