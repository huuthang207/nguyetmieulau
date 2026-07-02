## Context

Repo hiện chưa có application code, nên thay đổi này là một greenfield Discord bot được xây dựng mới trong phạm vi project hiện tại. Bot cần phục vụ quy trình điểm danh Bang Chiến theo từng guild, với dữ liệu bền vững bằng SQLite, quyền theo Discord role và `Administrator`, và UI chính là một public Embed message được cập nhật qua button interaction.

Các ràng buộc đã chốt từ nghiệp vụ:
- Mỗi guild có cấu hình riêng cho `admin role`, `member role`, và `attendance channel`.
- Mỗi guild chỉ có tối đa một vote `open` tại một thời điểm.
- `event_time` là free-text để tối ưu thao tác cho admin, không parse thành datetime ở v1.
- Vote hiện tại phải hiển thị count tổng hợp và `updated_at` theo kiểu absolute + relative time.
- Vote lịch sử được xem qua slash command dưới dạng ephemeral, không phụ thuộc message gốc còn tồn tại.

## Goals / Non-Goals

**Goals:**
- Xây dựng Discord bot bằng JavaScript với `discord.js` và SQLite để quản lý điểm danh Bang Chiến.
- Tạo service layer rõ ràng cho cấu hình guild, vòng đời vote, tổng hợp count, và render Embed.
- Thiết kế schema dữ liệu đủ để hỗ trợ vote hiện tại, lịch sử vote, và việc đổi lựa chọn của member.
- Thiết kế slash commands và button interaction sao cho nhất quán với quyền theo guild và dễ mở rộng về sau.
- Đảm bảo vote hiện tại được cập nhật tại chỗ trên message công khai, còn lịch sử được render lại từ DB khi cần.

**Non-Goals:**
- Không triển khai auto-close theo thời gian `event_time` ở v1.
- Không hiển thị danh sách member trên Embed tổng hợp ở v1.
- Không hỗ trợ reopen vote đã đóng ở v1.
- Không xây dựng recovery workflow tự động khi message vote hiện tại bị xóa.
- Không thêm analytics hoặc export chi tiết ở v1.

## Decisions

### 1. Tách hệ thống thành các lớp `commands`, `interactions`, `services`, và `db`
- **Quyết định:** Dùng cấu trúc module tách biệt giữa slash command handlers, button interaction handlers, business services, và database access.
- **Lý do:** Thay đổi này có nhiều luồng nhập liệu khác nhau (`slash command`, `button interaction`) nhưng cùng dùng chung nghiệp vụ vote. Tách lớp giúp tái sử dụng logic, giảm duplicate, và dễ test hơn.
- **Alternative đã cân nhắc:** Gom logic vào từng command file. Cách này nhanh cho prototype nhưng sẽ làm khó việc tái sử dụng logic update summary và quyền khi bot mở rộng.

### 2. Dùng SQLite với ba bảng chính: `guild_settings`, `votes`, `vote_responses`
- **Quyết định:** Lưu cấu hình guild, metadata của vote, và response của từng member trong ba bảng riêng.
- **Lý do:** Mô hình này phản ánh đúng domain: cấu hình độc lập với từng đợt vote, và response là quan hệ nhiều user trên một vote. `vote_responses` có thể đặt `UNIQUE(vote_id, user_id)` để hỗ trợ update lựa chọn thay vì tạo bản ghi trùng.
- **Alternative đã cân nhắc:** Lưu toàn bộ vote vào JSON file. Cách này đơn giản ban đầu nhưng kém bền vững cho truy vấn lịch sử, count, và cập nhật đồng thời.

### 3. Giới hạn một vote `open` mỗi guild bằng logic service và query chuyên biệt
- **Quyết định:** Mỗi lần tạo vote mới, service sẽ truy vấn vote `open` hiện tại theo `guild_id`; nếu có thì từ chối tạo.
- **Lý do:** Constraint này là quy tắc nghiệp vụ trung tâm. Đặt ở service layer giúp mọi command dùng chung và tránh phụ thuộc vào UI command.
- **Alternative đã cân nhắc:** Cho nhiều vote mở đồng thời rồi lọc theo channel hoặc latest. Điều này trái với yêu cầu và làm UX phức tạp hơn.

### 4. Render vote hiện tại bằng Embed công khai, còn vote lịch sử render theo yêu cầu từ DB
- **Quyết định:** Khi tạo vote, bot gửi một public Embed vào `attendance channel` và luôn edit lại chính message đó cho tới khi vote đóng. Với lịch sử, `/vote-xem` và `/vote-lich-su` chỉ render dữ liệu từ SQLite dưới dạng ephemeral, không cố tương tác với message cũ.
- **Lý do:** Cách này tách rõ hai nhu cầu: vote hiện tại là dashboard hoạt động; vote cũ là dữ liệu lịch sử. Nó cũng giảm độ phụ thuộc vào việc Discord message có còn tồn tại không.
- **Alternative đã cân nhắc:** Luôn fetch message gốc để hiển thị lịch sử. Cách này dễ lỗi nếu message bị xóa hoặc channel đổi cấu hình.

### 5. `event_time` là text hiển thị, không phải source of truth cho scheduling
- **Quyết định:** Lưu `event_time` nguyên văn do admin nhập và hiển thị lại trên Embed.
- **Lý do:** Nghiệp vụ chỉ cần hiển thị thời điểm Bang Chiến, không cần so sánh hoặc auto-close. Việc không parse datetime giúp tránh lỗi timezone và giữ UX tạo vote nhanh.
- **Alternative đã cân nhắc:** Parse sang ISO datetime. Cách này chỉ hữu ích khi có auto-close hoặc reminder, là out of scope ở v1.

### 6. Dùng `updated_at` của vote làm nguồn cho “Cập nhật gần nhất”
- **Quyết định:** Bảng `votes` có `updated_at` và được cập nhật mỗi khi vote được tạo, response thay đổi, hoặc vote bị đóng. Embed hiển thị cả absolute time và relative time từ giá trị này.
- **Lý do:** Requirement là hiển thị thời gian cập nhật summary gần nhất. Gắn nó với record vote giúp render nhanh, không cần recompute từ `vote_responses`.
- **Alternative đã cân nhắc:** Tính `MAX(updated_at)` từ `vote_responses`. Cách này bỏ sót trường hợp tạo vote chưa có response hoặc đóng vote không có response mới.

### 7. Quyền được kiểm tra theo guild config + Discord permission tại runtime
- **Quyết định:**
  - Command cấu hình, tạo vote, đóng vote: cho phép nếu user có `Administrator` hoặc `admin_role_id`.
  - Vote và xem lịch sử: cho phép với `member_role_id` hoặc `admin`.
- **Lý do:** Điều này phản ánh đúng quy tắc đã chốt và cho phép admin luôn nhìn được dữ liệu để điều hành.
- **Alternative đã cân nhắc:** Chỉ kiểm tra role. Cách này không tận dụng `Administrator` như fallback quản trị.

### 8. Gom cấu hình vào `/vote-config` với subcommand
- **Quyết định:** Dùng một slash command `vote-config` với các subcommand `channel`, `member-role`, `admin-role`.
- **Lý do:** Cách này gọn hơn nhiều command rời, dễ discover trong Discord UI, và có một nơi thống nhất cho logic kiểm tra quyền config.
- **Alternative đã cân nhắc:** Tách thành ba command riêng. Cách này đơn giản về code nhưng làm surface area của command lớn hơn cần thiết.

## Risks / Trade-offs

- **[Message vote bị xóa thủ công]** → Bot vẫn còn dữ liệu `open` trong DB nhưng không edit được Embed. Mitigation: `/vote-xem` vẫn đọc từ DB; `/vote-dong` nên xử lý được cả khi edit message thất bại và phản hồi rõ cho admin.
- **[Cấu hình guild thiếu hoặc role/channel bị xóa]** → Command vận hành có thể fail ở runtime. Mitigation: kiểm tra config đầy đủ trước khi tạo vote và báo rõ mục còn thiếu; khi dùng role/channel đã mất, coi như cấu hình thiếu.
- **[Race condition khi nhiều member bấm nút gần cùng lúc]** → Count có thể bị cập nhật chồng nếu flow không tuần tự. Mitigation: lưu response trước, sau đó truy vấn lại count từ DB làm source of truth rồi mới render Embed.
- **[History output quá dài]** → `/vote-lich-su` có thể khó đọc nếu không giới hạn. Mitigation: default 5, max 20 như đã chốt.
- **[Không lưu tên member trong DB]** → Không thể hiển thị danh sách chi tiết nhanh trong v1. Mitigation: chấp nhận trade-off vì scope hiện tại chỉ cần count; schema vẫn đủ để bổ sung lookup theo `user_id` sau này.

## Migration Plan

1. Khởi tạo project bot mới trong repo với cấu trúc source phù hợp cho `discord.js`.
2. Cài đặt dependencies runtime và khởi tạo SQLite database/migrations.
3. Tạo schema cho `guild_settings`, `votes`, `vote_responses`.
4. Đăng ký slash commands và triển khai config commands trước để bot có thể được cấu hình theo guild.
5. Triển khai vote creation, button interaction, summary rendering, và close vote workflow.
6. Triển khai `/vote-xem` và `/vote-lich-su` đọc từ DB.
7. Kiểm thử manual trên một guild thật với các case: chưa cấu hình, tạo vote, đổi vote, đóng vote, xem lịch sử.

## Open Questions

- Không còn open question nghiệp vụ nào đáng kể cho v1; scope và quyền đã được chốt đủ để bắt đầu implementation.
