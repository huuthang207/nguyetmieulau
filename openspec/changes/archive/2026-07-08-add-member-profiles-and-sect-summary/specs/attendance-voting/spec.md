## MODIFIED Requirements

### Requirement: Members can submit and update attendance choice
Hệ thống SHALL cho phép user có `member role` chọn đúng một trạng thái trong `Tham Gia`, `Dự Bị`, hoặc `Không Tham Gia` cho vote đang mở; trước khi ghi nhận vote hệ thống MUST kiểm tra user đã có `member profile` hợp lệ trong guild hiện tại, và nếu user bấm lại lựa chọn khác thì hệ thống MUST cập nhật lựa chọn hiện tại thay vì tạo response mới.

#### Scenario: Eligible member votes for the first time
- **WHEN** user có `member role`, đã có `member profile` hợp lệ, bấm một button hợp lệ trên vote đang `open`, và trước đó chưa có response cho vote này
- **THEN** hệ thống SHALL lưu response với lựa chọn tương ứng cho user đó
- **AND** hệ thống SHALL lưu snapshot `ingame_name` và `mon_phai` hiện tại của user vào response đó
- **AND** phản hồi SHALL là ephemeral xác nhận lựa chọn vừa được ghi nhận
- **AND** hệ thống SHALL cập nhật lại Embed tổng hợp của vote hiện tại

#### Scenario: Eligible member changes vote choice
- **WHEN** user có `member role`, đã có `member profile` hợp lệ, đã có response trước đó, và bấm một button với lựa chọn khác trên cùng vote đang `open`
- **THEN** hệ thống SHALL cập nhật response hiện tại của user
- **AND** hệ thống SHALL cập nhật snapshot `ingame_name` và `mon_phai` trong response theo profile hiện tại tại thời điểm đổi lựa chọn
- **AND** phản hồi SHALL là ephemeral xác nhận lựa chọn đã được cập nhật
- **AND** hệ thống SHALL cập nhật lại Embed tổng hợp của vote hiện tại

#### Scenario: User without member role attempts to vote
- **WHEN** user không có `member role` bấm một button vote
- **THEN** hệ thống SHALL không ghi nhận response
- **AND** phản hồi SHALL là ephemeral với nội dung cho biết user không có quyền tham gia điểm danh này

#### Scenario: User without profile attempts to vote
- **WHEN** user có `member role` nhưng chưa có `member profile` hợp lệ trong guild hiện tại và bấm một button vote
- **THEN** hệ thống SHALL không ghi nhận response
- **AND** phản hồi SHALL là ephemeral hướng dẫn user dùng `/profile set` để cập nhật `ingame_name` và `mon_phai` trước khi vote

### Requirement: Vote summary embed reflects current counts and update time
Hệ thống SHALL dùng Embed công khai của vote hiện tại làm bảng tổng hợp chính, và MUST hiển thị số lượng cho từng lựa chọn, tổng số phản hồi, trạng thái vote, cùng thời gian cập nhật gần nhất theo dạng absolute + relative time; ngoài ra phần `Tham Gia` MUST hiển thị breakdown theo `mon_phai` dựa trên profile hiện tại của member bằng hardcoded emoji và số lượng từng phái có ít nhất một người tham gia.

#### Scenario: Summary starts at zero counts when vote is created
- **WHEN** một vote mới vừa được tạo
- **THEN** Embed tổng hợp SHALL hiển thị count `0` cho `Tham Gia`, `Dự Bị`, và `Không Tham Gia`
- **AND** tổng phản hồi SHALL là `0`
- **AND** breakdown `Tham Gia` theo `mon_phai` SHALL chưa hiển thị phái nào khi chưa có ai tham gia
- **AND** thời gian cập nhật gần nhất SHALL phản ánh thời điểm tạo vote

#### Scenario: Summary updates after each response change
- **WHEN** có response mới hoặc response hiện tại được đổi trên vote đang `open`
- **THEN** hệ thống SHALL tính lại count từ dữ liệu lưu trữ hiện tại
- **AND** hệ thống SHALL tính breakdown `Tham Gia` theo `mon_phai` từ profile hiện tại của các member đã chọn `Tham Gia`
- **AND** edit lại cùng message Embed công khai của vote
- **AND** cập nhật thời gian cập nhật gần nhất để phản ánh lần thay đổi vừa xảy ra

#### Scenario: Current profile is used for historical rendering
- **WHEN** member đã từng vote, sau đó đổi `ingame_name` hoặc `mon_phai`, và một user hợp lệ xem lại vote đó
- **THEN** hệ thống SHALL render summary của vote theo `member profile` hiện tại của member đó
- **AND** snapshot lưu trong response SHALL không phải là source of truth mặc định cho phần hiển thị
