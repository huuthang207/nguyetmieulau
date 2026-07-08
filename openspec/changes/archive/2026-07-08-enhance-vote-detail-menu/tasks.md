## 1. Detail routing và interaction flow

- [x] 1.1 Cập nhật route parser trong `src/interactions/vote-buttons.js` để nhận route detail mới cho list type (`join`, `reserve`, `absent`) và page number.
- [x] 1.2 Đổi handler của button `Xem chi tiết` để trả về detail view mặc định `Tham Gia` page đầu tiên thay vì overview count.
- [x] 1.3 Cập nhật select menu handler để chuyển list type trong cùng ephemeral message và reset về page đầu của list được chọn.
- [x] 1.4 Cập nhật pagination button handler để điều hướng `Trước`/`Sau` trong list type hiện tại.

## 2. Detail payload rendering

- [x] 2.1 Thêm helper build page model cho `Tham Gia`, flatten `joinGroups` thành các page theo môn phái với tối đa 25 người/page.
- [x] 2.2 Thêm helper build page model cho `Dự Bị` và `Không Tham Gia` với tối đa 25 người/page.
- [x] 2.3 Thêm payload builder cho detail view mới trong `src/services/vote-embed-service.js`, gồm embed, select menu, và pagination buttons.
- [x] 2.4 Render empty state rõ ràng cho từng list type khi không có thành viên.
- [x] 2.5 Clamp page number về page hợp lệ khi dữ liệu thay đổi hoặc route truyền page ngoài phạm vi.

## 3. Tests

- [x] 3.1 Bổ sung unit test cho `Tham Gia` mặc định khi bấm `Xem chi tiết`.
- [x] 3.2 Bổ sung test `Tham Gia` phân trang theo môn phái, mỗi page không trộn môn phái và tối đa 25 người.
- [x] 3.3 Bổ sung test trường hợp một môn phái có hơn 25 người được chia thành nhiều page liên tiếp.
- [x] 3.4 Bổ sung test select menu chuyển sang `Dự Bị` và `Không Tham Gia`, mỗi page tối đa 25 người.
- [x] 3.5 Bổ sung test empty state cho `Tham Gia`, `Dự Bị`, và `Không Tham Gia`.

## 4. Verification

- [x] 4.1 Chạy test suite liên quan đến vote detail và interaction flow.
- [x] 4.2 Chạy toàn bộ test suite để đảm bảo không regression.
- [x] 4.3 Kiểm tra OpenSpec status/validation cho change `enhance-vote-detail-menu`.
