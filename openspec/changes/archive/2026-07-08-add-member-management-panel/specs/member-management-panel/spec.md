## ADDED Requirements

### Requirement: Admin can post a member management panel
Hệ thống SHALL cho phép admin post một member management panel vào channel hiện tại bằng slash command, và panel SHALL chứa select menu để member chọn chức năng quản lý hồ sơ.

#### Scenario: Admin posts panel successfully
- **WHEN** user có quyền `Administrator` hoặc có `admin role` dùng command post member panel trong một guild
- **THEN** hệ thống SHALL gửi một public panel message vào channel hiện tại
- **AND** panel SHALL có select menu với lựa chọn `Cập nhật hồ sơ` và `Xem hồ sơ hiện tại`
- **AND** phản hồi command SHALL xác nhận panel đã được tạo

#### Scenario: Unauthorized user attempts to post panel
- **WHEN** user không có quyền `Administrator` và không có `admin role` dùng command post member panel
- **THEN** hệ thống SHALL không gửi panel message
- **AND** phản hồi SHALL cho biết user không có quyền quản trị bot

### Requirement: Members can view their profile from the panel
Hệ thống SHALL cho phép member xem hồ sơ hiện tại của chính mình thông qua select menu trên member management panel.

#### Scenario: Member views existing profile
- **WHEN** user có `member role` hoặc quyền admin chọn `Xem hồ sơ hiện tại` trên member management panel và đã có profile trong guild hiện tại
- **THEN** hệ thống SHALL trả về ephemeral message hiển thị `ingame_name` và `mon_phai` hiện tại của user

#### Scenario: Member views profile before creating one
- **WHEN** user có `member role` hoặc quyền admin chọn `Xem hồ sơ hiện tại` trên member management panel nhưng chưa có profile trong guild hiện tại
- **THEN** hệ thống SHALL trả về ephemeral message cho biết user chưa có hồ sơ
- **AND** phản hồi SHALL hướng dẫn user chọn `Cập nhật hồ sơ` trên panel để tạo hồ sơ

#### Scenario: User without member access attempts to use panel
- **WHEN** user không có `member role`, không có quyền `Administrator`, và không có `admin role` chọn một chức năng trên member management panel
- **THEN** hệ thống SHALL từ chối thao tác
- **AND** phản hồi SHALL là ephemeral cho biết user không có quyền sử dụng panel này

### Requirement: Members can update their profile from the panel
Hệ thống SHALL cho phép member cập nhật hồ sơ qua flow panel gồm hiển thị hồ sơ cũ, chọn `mon_phai` từ danh sách cố định, rồi nhập `ingame_name` bằng modal.

#### Scenario: Member starts profile update with existing profile
- **WHEN** user có `member role` hoặc quyền admin chọn `Cập nhật hồ sơ` trên member management panel và đã có profile trong guild hiện tại
- **THEN** hệ thống SHALL trả về ephemeral message hiển thị `ingame_name` và `mon_phai` hiện tại
- **AND** message SHALL kèm select menu chọn `mon_phai` mới từ danh sách cố định

#### Scenario: Member starts profile update without existing profile
- **WHEN** user có `member role` hoặc quyền admin chọn `Cập nhật hồ sơ` trên member management panel nhưng chưa có profile trong guild hiện tại
- **THEN** hệ thống SHALL trả về ephemeral message cho biết user chưa có hồ sơ
- **AND** message SHALL kèm select menu chọn `mon_phai` để tạo hồ sơ

#### Scenario: Member selects mon phai before entering name
- **WHEN** user chọn một `mon_phai` hợp lệ từ select menu cập nhật hồ sơ
- **THEN** hệ thống SHALL mở modal nhập `ingame_name`
- **AND** nếu user đã có profile thì modal SHALL prefill `ingame_name` hiện tại khi Discord component hỗ trợ

#### Scenario: Member submits valid profile modal
- **WHEN** user submit modal cập nhật hồ sơ với `ingame_name` không rỗng và `mon_phai` đã chọn hợp lệ
- **THEN** hệ thống SHALL tạo mới hoặc cập nhật `member profile` cho cặp `(guild_id, user_id)` hiện tại
- **AND** phản hồi SHALL là ephemeral xác nhận profile đã được lưu thành công
- **AND** phản hồi SHALL hiển thị `ingame_name` và `mon_phai` vừa lưu

#### Scenario: Member submits duplicate ingame name
- **WHEN** user submit modal cập nhật hồ sơ với `ingame_name` đang được `user_id` khác sử dụng trong cùng guild
- **THEN** hệ thống SHALL từ chối lưu profile
- **AND** phản hồi SHALL là ephemeral cho biết `ingame_name` đã tồn tại trong guild

#### Scenario: Modal contains invalid or stale mon phai key
- **WHEN** user submit modal có custom id chứa `monPhaiKey` không map được về một `mon_phai` hợp lệ
- **THEN** hệ thống SHALL từ chối lưu profile
- **AND** phản hồi SHALL là ephemeral cho biết môn phái không hợp lệ và yêu cầu user thử lại từ panel
