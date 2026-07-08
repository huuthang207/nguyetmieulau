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
- **AND** phản hồi SHALL là ephemeral hướng dẫn user dùng member management panel để cập nhật `ingame_name` và `mon_phai` trước khi vote
