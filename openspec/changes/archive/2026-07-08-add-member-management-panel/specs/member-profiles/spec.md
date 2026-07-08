## MODIFIED Requirements

### Requirement: Members can manage their in-game profile per guild
Hệ thống SHALL lưu `member profile` theo từng guild với hai trường bắt buộc là `ingame_name` và `mon_phai`, đồng thời cho phép member tự xem và cập nhật profile của chính mình thông qua member management panel thay vì slash command self-service.

#### Scenario: Member creates or updates own profile from panel
- **WHEN** user hoàn tất flow cập nhật hồ sơ trên member management panel với `ingame_name` hợp lệ và `mon_phai` thuộc danh sách lựa chọn cố định
- **THEN** hệ thống SHALL tạo mới hoặc cập nhật `member profile` cho cặp `(guild_id, user_id)` hiện tại
- **AND** phản hồi SHALL xác nhận profile đã được lưu thành công

#### Scenario: Member views own profile from panel
- **WHEN** user chọn `Xem hồ sơ hiện tại` trên member management panel và đã có profile trong guild hiện tại
- **THEN** hệ thống SHALL trả về thông tin `ingame_name` và `mon_phai` hiện tại của chính user đó dưới dạng ephemeral

#### Scenario: Profile self-service slash commands are not available
- **WHEN** slash commands được deploy cho guild
- **THEN** command `/profile` SHALL không còn subcommand self-service `set`
- **AND** command `/profile` SHALL không còn subcommand self-service `xem`

### Requirement: In-game name must be unique within a guild
Hệ thống SHALL đảm bảo `ingame_name` là duy nhất trong phạm vi một guild cho mọi thao tác tạo hoặc cập nhật `member profile`.

#### Scenario: Reject duplicate in-game name on self update
- **WHEN** user submit modal cập nhật hồ sơ từ member management panel với `ingame_name` đang được một `user_id` khác sử dụng trong cùng guild
- **THEN** hệ thống SHALL từ chối lưu profile
- **AND** phản hồi SHALL cho biết `ingame_name` đã tồn tại trong guild

#### Scenario: Allow member to keep current in-game name
- **WHEN** user submit modal cập nhật hồ sơ từ member management panel với chính `ingame_name` hiện tại của mình trong cùng guild và thay đổi hoặc giữ nguyên `mon_phai`
- **THEN** hệ thống SHALL cho phép cập nhật profile mà không coi đó là xung đột uniqueness

### Requirement: Mon phai uses a fixed selectable list
Hệ thống SHALL giới hạn `mon_phai` trong `member profile` vào đúng một giá trị thuộc danh sách cố định gồm `Toái Mộng`, `Huyết Hà`, `Thiết Y`, `Thần Tương`, `Tố Vấn`, `Long Ngâm`, và `Cửu Linh`.

#### Scenario: Member selects a valid mon phai choice
- **WHEN** user chọn một `mon_phai` từ select menu cập nhật hồ sơ trên member management panel
- **THEN** hệ thống SHALL lưu đúng giá trị `mon_phai` đã chọn vào profile của user

#### Scenario: Admin imports an invalid mon phai value
- **WHEN** admin import file JSON member profiles có item chứa `mon_phai` không thuộc danh sách cố định
- **THEN** hệ thống SHALL từ chối import file đó
- **AND** phản hồi SHALL nêu rõ item không hợp lệ
