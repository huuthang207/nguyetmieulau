## Context

Bot hiện đã có luồng điểm danh Bang Chiến cơ bản với cấu hình guild, tạo vote, button interaction, và render summary count theo lựa chọn. Thay đổi mới là một cross-cutting change vì nó chạm đồng thời vào schema SQLite, slash command surface, button interaction flow, summary rendering, và import/export dữ liệu JSON.

Các ràng buộc nghiệp vụ đã chốt:
- `member profile` theo guild chỉ gồm `ingame_name` và `mon_phai`.
- `ingame_name` phải unique trong phạm vi một guild.
- `mon_phai` là choice cố định gồm 7 giá trị: `Toái Mộng`, `Huyết Hà`, `Thiết Y`, `Thần Tương`, `Tố Vấn`, `Long Ngâm`, `Cửu Linh`.
- Member tự cập nhật profile qua slash command; admin có thể cập nhật profile hộ.
- Khi member chưa có profile và bấm vote, bot phải chặn vote và hướng dẫn dùng `/profile set`.
- Khi vote thành công, hệ thống lưu snapshot profile vào `vote_responses`, nhưng summary và vote history mặc định hiển thị theo profile hiện tại.
- Breakdown theo môn phái chỉ áp dụng cho nhóm `Tham Gia`, chỉ hiển thị các phái có ít nhất một người tham gia, và dùng hardcoded custom emoji theo format Discord đầy đủ.
- Admin cần import/export JSON cho `member profile`; export JSON cho `attendance`.

## Goals / Non-Goals

**Goals:**
- Thêm data model rõ ràng cho `member profile` theo guild với ràng buộc uniqueness và enum-like validation cho `mon_phai`.
- Bổ sung nhóm slash command `/profile` để self-service profile, admin set profile hộ, import JSON member list, và export JSON cho member/attendance.
- Chặn vote khi member chưa có profile hợp lệ và lưu snapshot profile khi vote thành công.
- Mở rộng summary của vote hiện tại để hiển thị breakdown `Tham Gia` theo môn phái bằng emoji hardcoded.
- Giữ lịch sử vote và bảng tổng hợp mặc định bám theo profile hiện tại nhưng vẫn lưu snapshot để đối soát và fallback.

**Non-Goals:**
- Không bổ sung modal profile update từ button interaction trong thay đổi này.
- Không mở rộng breakdown môn phái cho `Dự Bị` hoặc `Không Tham Gia`.
- Không hiển thị danh sách đầy đủ từng member trong public summary embed.
- Không làm configurable emoji mapping theo guild; mapping được hardcode trong code cho v1 của tính năng này.
- Không hỗ trợ import attendance trong phase này; chỉ export attendance.

## Decisions

### 1. Thêm bảng `member_profiles` riêng thay vì nhồi dữ liệu vào `guild_settings` hoặc `vote_responses`
- **Quyết định:** Tạo bảng `member_profiles` với khóa logic theo `(guild_id, user_id)` và unique key `(guild_id, ingame_name)`.
- **Lý do:** Profile là dữ liệu sống lâu, dùng lại ở nhiều vote, và có lifecycle riêng với vote response. Tách bảng giúp command `/profile`, import/export, uniqueness validation, và join dữ liệu rõ ràng hơn.
- **Alternative đã cân nhắc:** Lưu `ingame_name`/`mon_phai` trực tiếp trong `vote_responses` và coi đó là source of truth. Cách này không hỗ trợ quản lý profile trước khi vote và khó sửa profile về sau.

### 2. Lưu snapshot profile trên `vote_responses` nhưng summary/history mặc định đọc profile hiện tại
- **Quyết định:** Thêm `snapshot_ingame_name` và `snapshot_mon_phai` vào `vote_responses`; khi render summary và vote history, ưu tiên join `member_profiles`, chỉ fallback snapshot khi profile hiện tại bị thiếu.
- **Lý do:** Yêu cầu đã chốt là vote cũ phải cập nhật theo profile mới, nhưng vẫn muốn lưu snapshot để audit và chống mất dữ liệu nếu profile bị xóa hoặc bị lỗi.
- **Alternative đã cân nhắc:** Chỉ dùng snapshot. Điều này đi ngược requirement hiển thị theo profile hiện tại.

### 3. Gom toàn bộ profile management vào command `/profile`
- **Quyết định:** Dùng một slash command `profile` với các subcommand như `set`, `xem`, `set-member`, `import-members`, `export-members`, `export-attendance`.
- **Lý do:** Cách này giữ command surface gọn, dễ discover, và cho phép tái sử dụng validation / permission check trong một module command.
- **Alternative đã cân nhắc:** Tách `profile-admin` hoặc nhiều command rời. Cách này đơn giản hơn một chút ở registry nhưng làm UX kém liền mạch.

### 4. `mon_phai` được model hóa như fixed constant list và slash command choices
- **Quyết định:** Tạo một module constant trung tâm cho danh sách 7 phái, label tiếng Việt chuẩn, và emoji mapping; slash command sẽ dùng choices từ cùng source này.
- **Lý do:** Điều này tránh mismatch giữa validation, render summary, import/export, và command definition.
- **Alternative đã cân nhắc:** Cho nhập free text rồi normalize. Cách này tăng lỗi nhập liệu và phá yêu cầu domain cố định.

### 5. Vote button flow chỉ hướng dẫn slash command, không mở modal
- **Quyết định:** Nếu member chưa có profile hợp lệ, `vote-buttons` sẽ trả về ephemeral message hướng dẫn chạy `/profile set` thay vì cố mở modal hoặc thu thập dữ liệu tại chỗ.
- **Lý do:** Requirement đã chốt member cập nhật qua slash command. Giữ flow button đơn giản cũng tránh tăng branching trong interaction handler.
- **Alternative đã cân nhắc:** Modal profile setup ngay khi bấm vote. UX mượt hơn nhưng trái quyết định nghiệp vụ và tăng độ phức tạp kỹ thuật.

### 6. Summary `Tham Gia` dùng aggregated sect counts, không liệt kê member names
- **Quyết định:** Vote summary vẫn giữ count tổng cho `join/reserve/absent`, và thêm một field hoặc section mô tả breakdown `join` theo `mon_phai` bằng emoji + label + count, bỏ các phái có `0`.
- **Lý do:** Yêu cầu chỉ cần quân số theo phái ở phần `Tham Gia`. Không liệt kê member names giúp an toàn với giới hạn ký tự của Discord Embed.
- **Alternative đã cân nhắc:** Hiển thị danh sách full member theo từng phái. Cách này tốn ký tự, khó đọc, và chưa được yêu cầu.

### 7. Import/export dùng JSON attachment với schema rõ ràng
- **Quyết định:** Các lệnh import/export sẽ làm việc với file JSON có envelope gồm `type`, `guild_id`, `exported_at`, và `items`.
- **Lý do:** User đã chọn JSON, và attachment là cách tự nhiên nhất trong Discord để chuyển dữ liệu có cấu trúc. Envelope giúp validate loại file và scope guild rõ ràng.
- **Alternative đã cân nhắc:** Paste JSON vào text option hoặc dùng CSV. JSON attachment đáng tin cậy hơn cho dữ liệu nested và enum labels tiếng Việt.

### 8. Permission model cho `/profile` tách theo subcommand
- **Quyết định:**
  - `/profile set`, `/profile xem`: member có `member role` hoặc admin đều dùng được.
  - `/profile set-member`, `/profile import-members`, `/profile export-members`, `/profile export-attendance`: chỉ admin.
- **Lý do:** Member cần tự phục vụ profile của mình, còn thao tác ảnh hưởng người khác hoặc dữ liệu toàn guild phải bị giới hạn cho admin.
- **Alternative đã cân nhắc:** Cho mọi member export member list. Điều này không cần thiết cho vận hành và tăng rủi ro lộ dữ liệu.

## Risks / Trade-offs

- **[Profile hiện tại bị đổi làm lịch sử đổi theo]** → Hành vi này là cố ý theo requirement, nhưng có thể làm admin bất ngờ khi đối chiếu kết quả cũ. **Mitigation:** vẫn lưu snapshot trong `vote_responses` và có thể đưa snapshot vào export hoặc debug output sau này.
- **[Import JSON có dữ liệu trùng `ingame_name`]** → Có thể fail giữa chừng nếu áp uniqueness trực tiếp. **Mitigation:** validate toàn bộ file trước khi ghi và trả danh sách lỗi rõ ràng theo từng item.
- **[Hardcoded emoji mapping bị sai hoặc emoji bị xóa]** → Embed có thể hiển thị text xấu hoặc literal token. **Mitigation:** gom mapping vào một constant duy nhất và fallback sang label text nếu emoji rỗng/không hợp lệ.
- **[Join summary cần join thêm profile data]** → Query tổng hợp phức tạp hơn query count hiện tại. **Mitigation:** giữ summary API phân lớp rõ ràng: count tổng vẫn lấy từ aggregate hiện có, sect breakdown là query riêng dành cho `join`.
- **[Member không có `member role` nhưng muốn chuẩn bị profile sớm]** → Nếu giới hạn `/profile set` quá chặt, user mới phải chờ role trước. **Mitigation:** cho admin luôn dùng được; với member thường, có thể cho phép command chạy nếu guild đã cấu hình mà không nhất thiết phải có vote đang mở.

## Migration Plan

1. Thêm migration mới tạo bảng `member_profiles` và mở rộng `vote_responses` bằng snapshot columns.
2. Thêm repository methods cho CRUD profile, uniqueness lookup, import/export dataset, và sect breakdown query.
3. Thêm module constants cho `mon_phai` và emoji mapping để dùng chung giữa commands, services, và validation.
4. Triển khai nhóm command `/profile` cùng permission checks và JSON attachment handling.
5. Cập nhật `vote-buttons` và `vote-service` để enforce profile gating và lưu snapshot khi vote.
6. Cập nhật `vote-embed-service` và command xem vote để render breakdown `Tham Gia` theo môn phái.
7. Thêm test cho migration, uniqueness, command permissions, import/export validation, vote gating, snapshot save, và summary rendering.

## Open Questions

- Cần lấy chính xác chuỗi hardcoded custom emoji cho 7 phái từ user hoặc config dự án trước khi implement để tránh placeholder không render đúng trên Discord.