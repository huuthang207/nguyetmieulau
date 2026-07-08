## MODIFIED Requirements

### Requirement: Create one active attendance vote per guild
Hệ thống SHALL cho phép admin tạo vote điểm danh Bang Chiến bằng slash command `/vote create` với `title`, `event_time`, `description` tùy chọn, và `ping_member` tùy chọn mặc định `false`, đồng thời MUST giới hạn mỗi guild chỉ có tối đa một vote `open` tại một thời điểm.

#### Scenario: Admin creates a new vote without ping
- **WHEN** user có quyền `Administrator` hoặc có `admin role`, guild đã được cấu hình đầy đủ, không có vote `open`, và user dùng `/vote create` với `title` và `event_time`
- **THEN** hệ thống SHALL tạo một vote mới với trạng thái `open`
- **AND** gửi một public Embed message vào `attendance channel`
- **AND** Embed SHALL hiển thị `title`, `event_time`, trạng thái hiện tại, count của ba lựa chọn, tổng phản hồi, và thời gian cập nhật gần nhất
- **AND** `description` SHALL không xuất hiện nếu admin không cung cấp giá trị
- **AND** hệ thống SHALL gắn ba button cho `Tham Gia`, `Dự Bị`, và `Không Tham Gia`

#### Scenario: Admin creates a new vote with ping enabled
- **WHEN** admin tạo vote với `ping_member = true`
- **THEN** hệ thống SHALL mention `member role` trong message vote được gửi vào `attendance channel`

#### Scenario: Creating a vote is blocked when one is already open
- **WHEN** admin dùng `/vote create` trong lúc guild đã có một vote trạng thái `open`
- **THEN** hệ thống SHALL từ chối tạo vote mới
- **AND** phản hồi SHALL yêu cầu đóng vote hiện tại trước

### Requirement: Admin can close the current vote
Hệ thống SHALL cho phép admin đóng vote đang mở bằng slash command `/vote close`, sau đó MUST chuyển vote sang `closed`, disable toàn bộ button, và không cho phép thay đổi response nữa.

#### Scenario: Admin closes an open vote
- **WHEN** user có quyền `Administrator` hoặc có `admin role` dùng `/vote close` trong khi guild có vote `open`
- **THEN** hệ thống SHALL cập nhật trạng thái vote thành `closed`
- **AND** edit Embed công khai để hiển thị trạng thái đã đóng
- **AND** disable toàn bộ button trên message vote
- **AND** cập nhật thời gian cập nhật gần nhất theo thời điểm đóng vote

#### Scenario: Closing vote fails because no active vote exists
- **WHEN** admin dùng `/vote close` nhưng guild không có vote `open`
- **THEN** hệ thống SHALL từ chối thao tác
- **AND** phản hồi SHALL cho biết hiện không có vote nào đang mở

#### Scenario: Member tries to vote after vote is closed
- **WHEN** user bấm button của một vote đã `closed`
- **THEN** hệ thống SHALL không thay đổi response hiện có
- **AND** phản hồi SHALL là ephemeral cho biết vote đã đóng và không thể thay đổi lựa chọn

### Requirement: Eligible users can view current and historical votes
Hệ thống SHALL cho phép user có `member role` hoặc quyền admin xem vote hiện tại và lịch sử vote qua slash command `/vote view` và `/vote history` dưới dạng ephemeral, kể cả khi message gốc của vote lịch sử không còn tồn tại. Public vote message SHALL có button `Xem chi tiết`; khi user hợp lệ bấm button này, hệ thống SHALL trả về detail view dạng ephemeral, mặc định hiển thị danh sách `Tham Gia` được lọc theo môn phái và có select menu để chuyển giữa `Tham Gia`, `Dự Bị`, và `Không Tham Gia`.

#### Scenario: View active vote without specifying vote id
- **WHEN** user hợp lệ dùng `/vote view` và guild đang có vote `open`
- **THEN** hệ thống SHALL trả về Embed của vote hiện tại dưới dạng ephemeral

#### Scenario: View most recent vote when no active vote exists
- **WHEN** user hợp lệ dùng `/vote view` mà không truyền `vote_id` và guild không có vote `open` nhưng có vote trong lịch sử
- **THEN** hệ thống SHALL trả về vote gần nhất dưới dạng ephemeral

#### Scenario: View a specific historical vote by id
- **WHEN** user hợp lệ dùng `/vote view` với `vote_id` của một vote tồn tại trong cùng guild
- **THEN** hệ thống SHALL render summary của vote đó từ dữ liệu trong SQLite dưới dạng ephemeral

#### Scenario: List recent vote history
- **WHEN** user hợp lệ dùng `/vote history` mà không truyền `limit`
- **THEN** hệ thống SHALL trả về danh sách 5 vote gần nhất của guild dưới dạng ephemeral
- **AND** mỗi mục SHALL gồm ít nhất `vote_id`, `title`, `status`, và `event_time`

#### Scenario: Limit historical list size
- **WHEN** user hợp lệ dùng `/vote history` với `limit` lớn hơn 20
- **THEN** hệ thống SHALL không trả quá 20 vote trong kết quả

#### Scenario: Unauthorized user attempts to view vote history
- **WHEN** user không có `member role`, không có `Administrator`, và không có `admin role` dùng `/vote view` hoặc `/vote history`
- **THEN** hệ thống SHALL từ chối truy cập
- **AND** phản hồi SHALL cho biết user không có quyền xem dữ liệu điểm danh

#### Scenario: User opens vote details from public vote message
- **WHEN** user hợp lệ bấm button `Xem chi tiết` trên public vote message
- **THEN** hệ thống SHALL trả về một ephemeral detail view
- **AND** detail view SHALL mặc định hiển thị danh sách `Tham Gia`
- **AND** danh sách `Tham Gia` SHALL hiển thị thành viên theo từng môn phái
- **AND** mỗi page SHALL chỉ chứa thành viên của một môn phái và tối đa 25 người
- **AND** detail view SHALL có select menu để chọn `Tham Gia`, `Dự Bị`, hoặc `Không Tham Gia`

#### Scenario: Join detail pages split large sects
- **WHEN** danh sách `Tham Gia` của một môn phái có hơn 25 người
- **THEN** hệ thống SHALL chia môn phái đó thành nhiều page liên tiếp
- **AND** mỗi page SHALL hiển thị tối đa 25 người
- **AND** mỗi page SHALL hiển thị tên môn phái, số trang hiện tại của môn phái, và tổng số người của môn phái

#### Scenario: User navigates join sect pages
- **WHEN** user đang xem detail view ở danh sách `Tham Gia` và bấm button `Trước` hoặc `Sau`
- **THEN** hệ thống SHALL cập nhật cùng ephemeral message sang page trước hoặc page sau trong chuỗi page `Tham Gia`
- **AND** page mới SHALL vẫn chỉ chứa thành viên của một môn phái và tối đa 25 người

#### Scenario: User switches detail list with select menu
- **WHEN** user chọn `Dự Bị` hoặc `Không Tham Gia` trong select menu của detail view
- **THEN** hệ thống SHALL cập nhật cùng ephemeral message sang danh sách được chọn
- **AND** danh sách được chọn SHALL hiển thị tối đa 25 người mỗi page
- **AND** button `Trước` và `Sau` SHALL điều hướng page trong danh sách đang chọn

#### Scenario: Empty detail list is shown clearly
- **WHEN** danh sách đang chọn không có thành viên
- **THEN** hệ thống SHALL hiển thị thông báo rỗng phù hợp với danh sách đó
- **AND** hệ thống SHALL không hiển thị tên thành viên giả hoặc dữ liệu từ danh sách khác

## ADDED Requirements

### Requirement: Admin can export attendance from vote command
Hệ thống SHALL cho phép admin export dữ liệu attendance bằng `/vote export`, thay cho vị trí cũ trong `/profile export-attendance`.

#### Scenario: Admin exports attendance for target vote
- **WHEN** user có quyền `Administrator` hoặc có `admin role` dùng `/vote export` với `vote_id` của một vote trong guild hiện tại
- **THEN** hệ thống SHALL trả về JSON attachment chứa dữ liệu attendance của vote đó
- **AND** phản hồi SHALL là ephemeral

#### Scenario: Admin exports current open vote attendance by default
- **WHEN** admin dùng `/vote export` không truyền `vote_id` và guild đang có vote `open`
- **THEN** hệ thống SHALL export attendance cho vote đang mở

#### Scenario: Non-admin attempts to export attendance
- **WHEN** user không có quyền `Administrator` và không có `admin role` dùng `/vote export`
- **THEN** hệ thống SHALL từ chối thao tác
- **AND** phản hồi SHALL cho biết user không có quyền quản trị bot
