## Context

Bot hiện có `member_profiles` theo guild và service `profileService.saveProfile()` / `getProfile()` đã xử lý validation, uniqueness, và persistence. Self-service profile hiện nằm trong `/profile set` và `/profile xem`, còn interaction routing trong `src/index.js` đã hỗ trợ `Button` và `StringSelectMenu` cho vote nhưng chưa hỗ trợ `ModalSubmit`.

Thay đổi này chuyển self-service profile sang một panel cố định trong kênh member chung. Admin sẽ post panel bằng command mới; member dùng select menu để xem hoặc cập nhật hồ sơ. Cập nhật profile dùng `StringSelectMenu` để chọn `mon_phai` trước, rồi `Modal` để nhập `ingame_name`.

## Goals / Non-Goals

**Goals:**
- Tạo command admin để post member management panel vào channel hiện tại.
- Cho member xem profile hiện tại qua panel bằng ephemeral response.
- Cho member cập nhật profile qua flow: panel menu → hiển thị hồ sơ cũ + chọn môn phái → modal nhập tên → save profile.
- Bỏ `/profile set` và `/profile xem` khỏi self-service slash command.
- Tái dùng `profileService` và bảng `member_profiles` hiện có, không thêm migration DB.
- Cập nhật nội dung hướng dẫn khi vote thiếu profile để trỏ tới panel.

**Non-Goals:**
- Không tự động tạo private channel hoặc permission overwrite cho từng member.
- Không lưu `panel_message_id` vào DB trong MVP.
- Không đổi schema `member_profiles`.
- Không đổi các admin/data subcommands hiện có của `/profile` ngoài việc loại self-service subcommands.
- Không thêm thông tin profile mới ngoài `ingame_name` và `mon_phai`.

## Decisions

### 1. Dùng một panel message cố định thay vì đọc tin nhắn member

Panel message dùng Discord components (`StringSelectMenuBuilder`, `ActionRowBuilder`) và mọi phản hồi cá nhân là ephemeral.

Alternatives considered:
- Để bot hỏi member nhập tin nhắn trong kênh: bị loại vì cần thêm message intents, dễ spam channel, và khó xử lý nhiều user đồng thời.
- Tạo private channel/thread cho từng member: bị loại khỏi MVP vì tăng scope permission lifecycle.

### 2. Chọn `mon_phai` trước, nhập `ingame_name` bằng modal sau

Discord modal không chứa select menu, nên chọn môn phái trước bằng select menu giúp tránh lỗi gõ sai dấu hoặc sai chính tả. Modal submit custom id sẽ encode `monPhaiKey`, ví dụ `member-profile:update-modal:to-van`, sau đó map lại bằng `getMonPhaiFromKey()`.

Alternatives considered:
- Nhập cả tên và môn phái trong modal: bị loại vì `mon_phai` sẽ là free text, trái với danh sách cố định.
- Nhập tên trước rồi chọn môn phái: dùng được, nhưng modal phải mở trước khi có chọn phái; flow đã chốt là chọn phái trước.

### 3. Tách interaction handler cho member panel

Thêm handler riêng, ví dụ `src/interactions/member-panel.js`, để tránh trộn logic panel vào `vote-buttons.js`. `src/index.js` sẽ route:
- `isStringSelectMenu()` → thử member panel handler, sau đó vote detail handler nếu chưa handled.
- `isModalSubmit()` → member panel modal handler.
- `isButton()` giữ vote handler hiện có.

Handler member panel sẽ nhận `context.services.profileService` và `settingsService` để kiểm tra quyền khi cần.

### 4. Không thêm DB migration hoặc persisted wizard state

State cần thiết cho modal submit chỉ gồm `monPhaiKey`, có thể đặt trong modal `customId`. `ingame_name` lấy từ modal field. Profile cũ được load lại khi cần prefill modal hoặc render thông tin hiện tại.

### 5. Quyền dùng panel dựa trên member role hiện có

Panel nằm trong kênh member chung, nhưng handler vẫn nên kiểm tra user có `member_role_id` nếu guild đã cấu hình. Admin cũng có thể dùng panel nếu có quyền admin. Điều này giúp panel không ghi profile cho user ngoài role nếu message bị lộ hoặc permission channel bị sai.

## Risks / Trade-offs

- [Risk] Discord interaction phải được acknowledge đúng thời hạn, nhất là khi mở modal sau select. → Mitigation: với select môn phái, gọi `showModal()` trực tiếp thay vì reply trước; các bước hiển thị profile cũ dùng ephemeral message riêng trước đó.
- [Risk] Removing `/profile set` và `/profile xem` là breaking với member đã quen slash command. → Mitigation: panel copy rõ ràng, vote missing-profile message trỏ tới member panel, và giữ admin/data subcommands.
- [Risk] Nếu admin post nhiều panel, tất cả đều hoạt động. → Mitigation: MVP chấp nhận; panel không có persisted singleton. Có thể thêm hướng dẫn admin chỉ pin một panel.
- [Risk] `TextInputBuilder#setValue()` có giới hạn length/value. → Mitigation: chỉ prefill khi có tên cũ hợp lệ và vẫn dùng validation từ `profileService` khi submit.
- [Risk] Route select menu mới có thể va chạm với vote select. → Mitigation: prefix custom id rõ ràng (`member-panel:` / `member-profile:`) và handler chỉ handle đúng prefix.

## Migration Plan

1. Deploy command mới để admin post panel.
2. Cập nhật slash command registration để `/profile` không còn `set` và `xem`.
3. Cập nhật message thiếu profile khi vote để hướng dẫn dùng member panel.
4. Admin post panel vào kênh member và pin/hướng dẫn member sử dụng.
5. Rollback nếu cần: khôi phục `/profile set` / `/profile xem` trong command builder và redeploy slash commands; DB không cần rollback vì không có migration.

## Open Questions

- Có cần đổi tên `/profile` admin command thành command mới như `/member-admin` ở phase sau không? MVP giữ nguyên để giảm scope.
