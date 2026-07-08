## 1. Command và panel UI

- [x] 1.1 Thêm command admin để post member management panel vào channel hiện tại và kiểm tra quyền bằng `isBotAdmin`.
- [x] 1.2 Đăng ký command mới trong `src/commands/index.js` và đảm bảo deploy commands gồm command này.
- [x] 1.3 Tạo builder/helper cho panel public message với select menu gồm `Cập nhật hồ sơ` và `Xem hồ sơ hiện tại`.
- [x] 1.4 Cập nhật `/profile` command để bỏ subcommand self-service `set` và `xem`, nhưng giữ `set-member`, `import-members`, `export-members`, và `export-attendance`.

## 2. Member panel interaction flow

- [x] 2.1 Tạo `src/interactions/member-panel.js` với parser custom id/value cho `member-panel:` và `member-profile:` prefixes.
- [x] 2.2 Implement quyền sử dụng panel: cho phép user có `member role` hoặc quyền admin, từ chối user không đủ quyền bằng ephemeral message.
- [x] 2.3 Implement action `Xem hồ sơ hiện tại` bằng `profileService.getProfile()` và trả ephemeral profile hoặc hướng dẫn tạo hồ sơ.
- [x] 2.4 Implement action `Cập nhật hồ sơ` để hiển thị hồ sơ cũ hoặc trạng thái chưa có hồ sơ, kèm select menu chọn `mon_phai` từ danh sách cố định.
- [x] 2.5 Implement handler chọn `mon_phai` để mở modal nhập `ingame_name`, prefill tên cũ khi có profile hiện tại.
- [x] 2.6 Implement modal submit để map `monPhaiKey`, gọi `profileService.saveProfile()`, và trả kết quả thành công hoặc lỗi validation dưới dạng ephemeral.

## 3. Interaction routing và copy liên quan

- [x] 3.1 Cập nhật `src/index.js` để route `StringSelectMenu` qua member panel handler trước hoặc song song với vote detail select mà không làm hỏng vote detail flow.
- [x] 3.2 Cập nhật `src/index.js` để xử lý `interaction.isModalSubmit()` cho member profile modal.
- [x] 3.3 Cập nhật message khi member vote nhưng chưa có profile để hướng dẫn dùng member management panel thay vì `/profile set`.
- [x] 3.4 Đảm bảo custom ids mới không va chạm với các custom ids vote hiện có.

## 4. Tests và verification

- [x] 4.1 Cập nhật hoặc thêm tests cho command registration: command post panel tồn tại và `/profile set` / `/profile xem` không còn được đăng ký.
- [x] 4.2 Thêm tests cho admin post panel thành công và user không có quyền bị từ chối.
- [x] 4.3 Thêm tests cho panel `Xem hồ sơ hiện tại` với trường hợp đã có profile và chưa có profile.
- [x] 4.4 Thêm tests cho update flow: hiển thị profile cũ, chọn môn phái, mở modal, submit hợp lệ và lưu profile.
- [x] 4.5 Thêm tests cho lỗi update flow: duplicate `ingame_name`, invalid/stale `monPhaiKey`, và user không đủ quyền dùng panel.
- [x] 4.6 Chạy `npm test` và sửa mọi regression liên quan.

## 5. OpenSpec validation

- [x] 5.1 Chạy OpenSpec status/validation cho `add-member-management-panel` sau khi implement để đảm bảo tasks và specs khớp.
- [x] 5.2 Cập nhật task checklist khi từng hạng mục hoàn tất trong apply phase.
