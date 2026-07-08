## Context

Màn vote public hiện có button `Xem chi tiết`, nhưng detail flow hiện tại ưu tiên overview/count rồi mới điều hướng sâu bằng button và select menu phụ. Dữ liệu cần hiển thị đã có trong service layer: `joinGroups` cho danh sách `Tham Gia` theo môn phái, `reserveNames` cho `Dự Bị`, và `absentNames` cho `Không Tham Gia`.

Thay đổi này tập trung vào presentation/interaction layer của Discord: detail message vẫn là ephemeral, vẫn kiểm tra quyền xem attendance, và không thay đổi schema SQLite hay dữ liệu đã lưu.

## Goals / Non-Goals

**Goals:**

- Khi bấm `Xem chi tiết`, hiển thị ngay danh sách `Tham Gia` thay vì overview count.
- Dùng select menu để chuyển giữa `Tham Gia`, `Dự Bị`, và `Không Tham Gia`.
- Với `Tham Gia`, mỗi page chỉ chứa một môn phái; nếu môn phái có hơn 25 người thì chia thành nhiều page liên tiếp.
- Với `Dự Bị` và `Không Tham Gia`, phân trang theo danh sách tên với tối đa 25 người/page.
- Giữ UX trong cùng một ephemeral message bằng interaction update.

**Non-Goals:**

- Không thay đổi database schema hoặc cách lưu vote response.
- Không thay đổi quyền vote/quyền xem attendance.
- Không thêm export/import mới.
- Không thay đổi summary embed công khai ngoài hành vi detail button.

## Decisions

### 1. Select menu dùng để chọn loại danh sách, button dùng để chuyển page

**Quyết định:** Detail message luôn có select menu với 3 option: `Tham Gia`, `Dự Bị`, `Không Tham Gia`. Button `Trước`/`Sau` điều hướng page trong danh sách đang chọn.

**Lý do:** Tách rõ hai khái niệm: select menu là tab chọn dữ liệu, button là pagination. Cách này gọn hơn so với menu chứa cả từng môn phái và tránh trùng chức năng với pagination.

**Alternatives considered:** Menu chứa từng môn phái để nhảy thẳng tới phái. Cách này tiện cho bang đông nhưng làm menu dài hơn và làm select menu vừa là tab vừa là page navigator.

### 2. `Tham Gia` được flatten thành chuỗi page theo môn phái

**Quyết định:** Render layer chuyển `joinGroups` thành các page liên tiếp, mỗi page có dạng `{ choice: 'join', monPhai, memberPage }`; mỗi page chứa tối đa 25 tên và không trộn nhiều môn phái.

Ví dụ:

```text
Toái Mộng: 31 người -> page 1, page 2
Huyết Hà: 12 người  -> page 3
Thiết Y: 8 người    -> page 4
```

**Lý do:** Giữ đúng yêu cầu “mỗi môn phái nằm ở một trang” trong trường hợp bình thường, đồng thời vẫn đảm bảo hard limit 25 người/page nếu một môn phái quá đông.

**Alternatives considered:** Mỗi môn phái đúng một page và cắt bớt sau 25 người. Cách này đơn giản hơn nhưng làm mất dữ liệu hiển thị.

### 3. Reuse dữ liệu chi tiết hiện có thay vì thêm query mới

**Quyết định:** Tiếp tục dùng `getVoteDetailsForView()` và `buildVoteDetails()` hiện có để lấy `joinGroups`, `reserveNames`, `absentNames`.

**Lý do:** Dữ liệu đã được query và sort ổn định. Thay đổi này chỉ cần đổi cách build payload/route, không cần can thiệp persistence layer.

**Alternatives considered:** Thêm repository query theo choice/page. Cách này có thể tối ưu hơn nếu dữ liệu rất lớn, nhưng hiện scope và quy mô Discord embed không cần phức tạp hóa.

### 4. Route custom id encode choice và page index

**Quyết định:** Button pagination dùng custom id có vote id, list type, và page number để rebuild view từ dữ liệu hiện tại khi user bấm `Trước`/`Sau`. Select menu value cũng encode list type và reset về page đầu của list được chọn.

**Lý do:** Discord interactions là stateless giữa các lần bấm, nên route phải đủ thông tin để dựng lại view mà không cần session memory.

## Risks / Trade-offs

- **[Embed vẫn có thể dài nếu tên member quá dài]** → Mitigation: giới hạn 25 người/page và render dạng numbered list ngắn gọn; nếu cần có thể giảm page size sau này.
- **[Danh sách thay đổi giữa các lần bấm page]** → Mitigation: mỗi interaction rebuild từ SQLite hiện tại; nếu page hiện tại vượt quá tổng page mới thì clamp về page hợp lệ.
- **[Không nhảy trực tiếp tới một môn phái bất kỳ]** → Mitigation: pagination đơn giản trước; nếu user cần, có thể mở rộng select menu thêm option môn phái sau.
- **[Custom id Discord có giới hạn độ dài]** → Mitigation: dùng key ngắn (`join`, `reserve`, `absent`, page number) và tái dùng `getMonPhaiKey` nếu cần encode môn phái.
