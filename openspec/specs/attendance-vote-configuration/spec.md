# Capability: attendance-vote-configuration

## Purpose

Định nghĩa cấu hình theo từng guild cho bot điểm danh Bang Chiến, bao gồm `attendance channel`, `member role`, `admin role`, và các quy tắc kiểm tra cấu hình trước khi vận hành vote.

## Requirements

### Requirement: Guild configuration for attendance voting
Hệ thống SHALL cho phép cấu hình theo từng guild cho `attendance channel`, `member role`, và `admin role` thông qua slash command `vote-config` với các subcommand tương ứng.

#### Scenario: Admin sets attendance channel
- **WHEN** user có quyền `Administrator` hoặc có `admin role` dùng `/vote-config channel` với một channel hợp lệ
- **THEN** hệ thống SHALL lưu `attendance_channel_id` cho guild hiện tại
- **AND** phản hồi SHALL xác nhận channel điểm danh đã được cập nhật

#### Scenario: Admin sets member role
- **WHEN** user có quyền `Administrator` hoặc có `admin role` dùng `/vote-config member-role` với một role hợp lệ
- **THEN** hệ thống SHALL lưu `member_role_id` cho guild hiện tại
- **AND** phản hồi SHALL xác nhận role thành viên đã được cập nhật

#### Scenario: Admin sets admin role
- **WHEN** user có quyền `Administrator` hoặc có `admin role` dùng `/vote-config admin-role` với một role hợp lệ
- **THEN** hệ thống SHALL lưu `admin_role_id` cho guild hiện tại
- **AND** phản hồi SHALL xác nhận role admin đã được cập nhật

#### Scenario: Unauthorized user attempts to change configuration
- **WHEN** user không có quyền `Administrator` và không có `admin role` dùng một subcommand của `vote-config`
- **THEN** hệ thống SHALL từ chối thay đổi cấu hình
- **AND** phản hồi SHALL cho biết user không có quyền quản trị bot

### Requirement: Configuration validation before vote operations
Hệ thống SHALL kiểm tra cấu hình guild trước khi cho phép tạo vote và MUST báo rõ từng mục cấu hình còn thiếu hoặc không còn hợp lệ.

#### Scenario: Missing configuration blocks vote creation
- **WHEN** admin dùng `/vote-tao` nhưng guild chưa có một hoặc nhiều cấu hình cần thiết trong `attendance channel`, `member role`, `admin role`
- **THEN** hệ thống SHALL từ chối tạo vote
- **AND** phản hồi SHALL liệt kê cụ thể từng cấu hình còn thiếu hoặc không hợp lệ

#### Scenario: Deleted configured role is treated as missing
- **WHEN** guild đã lưu `member role` hoặc `admin role` nhưng role đó không còn tồn tại tại thời điểm kiểm tra
- **THEN** hệ thống SHALL coi cấu hình đó là không hợp lệ
- **AND** phản hồi SHALL yêu cầu admin cấu hình lại

#### Scenario: Deleted configured channel is treated as missing
- **WHEN** guild đã lưu `attendance channel` nhưng channel đó không còn tồn tại tại thời điểm kiểm tra
- **THEN** hệ thống SHALL coi cấu hình đó là không hợp lệ
- **AND** phản hồi SHALL yêu cầu admin cấu hình lại
