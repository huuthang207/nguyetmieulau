# Capability: attendance-voting

## Purpose

Định nghĩa vòng đời vote điểm danh Bang Chiến, bao gồm tạo vote, member bỏ phiếu bằng button, cập nhật Embed tổng hợp công khai, đóng vote, và xem lịch sử vote từ SQLite.

## Requirements

### Requirement: Create one active attendance vote per guild
Hệ thống SHALL cho phép admin tạo vote điểm danh Bang Chiến bằng slash command với `title`, `event_time`, `description` tùy chọn, và `ping_member` tùy chọn mặc định `false`, đồng thời MUST giới hạn mỗi guild chỉ có tối đa một vote `open` tại một thời điểm.

#### Scenario: Admin creates a new vote without ping
- **WHEN** user có quyền `Administrator` hoặc có `admin role`, guild đã được cấu hình đầy đủ, không có vote `open`, và user dùng `/vote-tao` với `title` và `event_time`
- **THEN** hệ thống SHALL tạo một vote mới với trạng thái `open`
- **AND** gửi một public Embed message vào `attendance channel`
- **AND** Embed SHALL hiển thị `title`, `event_time`, trạng thái hiện tại, count của ba lựa chọn, tổng phản hồi, và thời gian cập nhật gần nhất
- **AND** `description` SHALL không xuất hiện nếu admin không cung cấp giá trị
- **AND** hệ thống SHALL gắn ba button cho `Tham Gia`, `Dự Bị`, và `Không Tham Gia`

#### Scenario: Admin creates a new vote with ping enabled
- **WHEN** admin tạo vote với `ping_member = true`
- **THEN** hệ thống SHALL mention `member role` trong message vote được gửi vào `attendance channel`

#### Scenario: Creating a vote is blocked when one is already open
- **WHEN** admin dùng `/vote-tao` trong lúc guild đã có một vote trạng thái `open`
- **THEN** hệ thống SHALL từ chối tạo vote mới
- **AND** phản hồi SHALL yêu cầu đóng vote hiện tại trước

### Requirement: Members can submit and update attendance choice
Hệ thống SHALL cho phép user có `member role` chọn đúng một trạng thái trong `Tham Gia`, `Dự Bị`, hoặc `Không Tham Gia` cho vote đang mở; nếu user bấm lại lựa chọn khác thì hệ thống MUST cập nhật lựa chọn hiện tại thay vì tạo response mới.

#### Scenario: Eligible member votes for the first time
- **WHEN** user có `member role` bấm một button hợp lệ trên vote đang `open` và trước đó chưa có response cho vote này
- **THEN** hệ thống SHALL lưu response với lựa chọn tương ứng cho user đó
- **AND** phản hồi SHALL là ephemeral xác nhận lựa chọn vừa được ghi nhận
- **AND** hệ thống SHALL cập nhật lại Embed tổng hợp của vote hiện tại

#### Scenario: Eligible member changes vote choice
- **WHEN** user có `member role` đã có response trước đó và bấm một button với lựa chọn khác trên cùng vote đang `open`
- **THEN** hệ thống SHALL cập nhật response hiện tại của user
- **AND** phản hồi SHALL là ephemeral xác nhận lựa chọn đã được cập nhật
- **AND** hệ thống SHALL cập nhật lại Embed tổng hợp của vote hiện tại

#### Scenario: User without member role attempts to vote
- **WHEN** user không có `member role` bấm một button vote
- **THEN** hệ thống SHALL không ghi nhận response
- **AND** phản hồi SHALL là ephemeral với nội dung cho biết user không có quyền tham gia điểm danh này

### Requirement: Vote summary embed reflects current counts and update time
Hệ thống SHALL dùng Embed công khai của vote hiện tại làm bảng tổng hợp chính, và MUST hiển thị số lượng cho từng lựa chọn, tổng số phản hồi, trạng thái vote, cùng thời gian cập nhật gần nhất theo dạng absolute + relative time.

#### Scenario: Summary starts at zero counts when vote is created
- **WHEN** một vote mới vừa được tạo
- **THEN** Embed tổng hợp SHALL hiển thị count `0` cho `Tham Gia`, `Dự Bị`, và `Không Tham Gia`
- **AND** tổng phản hồi SHALL là `0`
- **AND** thời gian cập nhật gần nhất SHALL phản ánh thời điểm tạo vote

#### Scenario: Summary updates after each response change
- **WHEN** có response mới hoặc response hiện tại được đổi trên vote đang `open`
- **THEN** hệ thống SHALL tính lại count từ dữ liệu lưu trữ hiện tại
- **AND** edit lại cùng message Embed công khai của vote
- **AND** cập nhật thời gian cập nhật gần nhất để phản ánh lần thay đổi vừa xảy ra

### Requirement: Admin can close the current vote
Hệ thống SHALL cho phép admin đóng vote đang mở bằng slash command, sau đó MUST chuyển vote sang `closed`, disable toàn bộ button, và không cho phép thay đổi response nữa.

#### Scenario: Admin closes an open vote
- **WHEN** user có quyền `Administrator` hoặc có `admin role` dùng `/vote-dong` trong khi guild có vote `open`
- **THEN** hệ thống SHALL cập nhật trạng thái vote thành `closed`
- **AND** edit Embed công khai để hiển thị trạng thái đã đóng
- **AND** disable toàn bộ button trên message vote
- **AND** cập nhật thời gian cập nhật gần nhất theo thời điểm đóng vote

#### Scenario: Closing vote fails because no active vote exists
- **WHEN** admin dùng `/vote-dong` nhưng guild không có vote `open`
- **THEN** hệ thống SHALL từ chối thao tác
- **AND** phản hồi SHALL cho biết hiện không có vote nào đang mở

#### Scenario: Member tries to vote after vote is closed
- **WHEN** user bấm button của một vote đã `closed`
- **THEN** hệ thống SHALL không thay đổi response hiện có
- **AND** phản hồi SHALL là ephemeral cho biết vote đã đóng và không thể thay đổi lựa chọn

### Requirement: Eligible users can view current and historical votes
Hệ thống SHALL cho phép user có `member role` hoặc quyền admin xem vote hiện tại và lịch sử vote qua slash command dưới dạng ephemeral, kể cả khi message gốc của vote lịch sử không còn tồn tại.

#### Scenario: View active vote without specifying vote id
- **WHEN** user hợp lệ dùng `/vote-xem` và guild đang có vote `open`
- **THEN** hệ thống SHALL trả về Embed của vote hiện tại dưới dạng ephemeral

#### Scenario: View most recent vote when no active vote exists
- **WHEN** user hợp lệ dùng `/vote-xem` mà không truyền `vote_id` và guild không có vote `open` nhưng có vote trong lịch sử
- **THEN** hệ thống SHALL trả về vote gần nhất dưới dạng ephemeral

#### Scenario: View a specific historical vote by id
- **WHEN** user hợp lệ dùng `/vote-xem` với `vote_id` của một vote tồn tại trong cùng guild
- **THEN** hệ thống SHALL render summary của vote đó từ dữ liệu trong SQLite dưới dạng ephemeral

#### Scenario: List recent vote history
- **WHEN** user hợp lệ dùng `/vote-lich-su` mà không truyền `limit`
- **THEN** hệ thống SHALL trả về danh sách 5 vote gần nhất của guild dưới dạng ephemeral
- **AND** mỗi mục SHALL gồm ít nhất `vote_id`, `title`, `status`, và `event_time`

#### Scenario: Limit historical list size
- **WHEN** user hợp lệ dùng `/vote-lich-su` với `limit` lớn hơn 20
- **THEN** hệ thống SHALL không trả quá 20 vote trong kết quả

#### Scenario: Unauthorized user attempts to view vote history
- **WHEN** user không có `member role`, không có `Administrator`, và không có `admin role` dùng `/vote-xem` hoặc `/vote-lich-su`
- **THEN** hệ thống SHALL từ chối truy cập
- **AND** phản hồi SHALL cho biết user không có quyền xem dữ liệu điểm danh
