## Why

Màn `Xem chi tiết` hiện tại yêu cầu người dùng đi qua nhiều button/màn con để xem danh sách `Tham Gia`, `Dự Bị`, và `Không Tham Gia`. Cần làm lại trải nghiệm này để khi bấm `Xem chi tiết` người dùng thấy ngay danh sách `Tham Gia` theo môn phái, đồng thời có thể chuyển nhanh giữa các danh sách bằng select menu.

## What Changes

- Thay màn chi tiết ban đầu từ overview dạng count sang detail view có select menu.
- Khi bấm `Xem chi tiết`, mặc định hiển thị danh sách `Tham Gia`.
- Danh sách `Tham Gia` được chia theo môn phái; mỗi trang chỉ hiển thị thành viên của một môn phái và tối đa 25 người.
- Nếu một môn phái có hơn 25 người, môn phái đó được chia thành nhiều trang liên tiếp.
- Người dùng chuyển trang bằng button `Trước`/`Sau` và chuyển danh sách bằng select menu gồm `Tham Gia`, `Dự Bị`, `Không Tham Gia`.
- Danh sách `Dự Bị` và `Không Tham Gia` cũng hiển thị tối đa 25 người mỗi trang.
- Giữ phản hồi chi tiết ở dạng ephemeral và giữ kiểm tra quyền xem dữ liệu điểm danh.

## Capabilities

### New Capabilities

- Không có.

### Modified Capabilities

- `attendance-voting`: Thay đổi requirement của luồng xem chi tiết vote để dùng select menu, mặc định hiển thị `Tham Gia`, phân trang danh sách theo giới hạn 25 người/trang, và lọc `Tham Gia` theo môn phái.

## Impact

- Ảnh hưởng render detail payload trong `src/services/vote-embed-service.js`.
- Ảnh hưởng route/interaction handling trong `src/interactions/vote-buttons.js` cho button pagination và select menu.
- Có thể tái sử dụng dữ liệu chi tiết từ `src/services/vote-service.js` (`joinGroups`, `reserveNames`, `absentNames`).
- Cần cập nhật/bổ sung tests cho màn `Xem chi tiết`, pagination, select menu, và giới hạn 25 người/trang.
