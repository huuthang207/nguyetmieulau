## Context

Command registry hiện có 7 top-level commands: `/vote-config`, `/vote-tao`, `/vote-dong`, `/vote-xem`, `/vote-lich-su`, `/profile`, và `/member-panel`. Cách đặt tên này phản ánh lịch sử phát triển hơn là nhóm nghiệp vụ, dẫn tới danh sách command dài, khó nhớ, và một số command nằm sai nhóm như `/profile export-attendance`.

Change này thay hẳn command tree cũ bằng 4 command top-level:

```text
/help
/config
/vote
/member
```

Mục tiêu là giảm số top-level command, gom hành vi theo domain, và thêm `/help` để user/admin tự khám phá lệnh phù hợp quyền.

## Goals / Non-Goals

**Goals:**

- Chỉ register 4 top-level commands mới: `/help`, `/config`, `/vote`, `/member`.
- Remove các command cũ khỏi registry để deploy slash commands sẽ thay hẳn danh sách cũ.
- Preserve toàn bộ behavior hiện có dưới subcommands mới.
- Thêm `/member view` để member xem profile của mình bằng slash command, ngoài panel.
- Thêm `/help` có topic optional và permission-aware output.
- Cập nhật tests và README theo command tree mới.

**Non-Goals:**

- Không thay đổi database schema.
- Không đổi business logic của vote/profile/settings ngoài tên command và vị trí subcommand.
- Không giữ alias/compatibility command cũ trong registry.
- Không tạo command redirect cho lệnh cũ, vì command cũ sẽ không còn được Discord dispatch sau deploy.

## Decisions

### 1. Dùng flat subcommands thay vì subcommand groups

Command tree mới dùng subcommands trực tiếp:

```text
/vote create
/vote close
/vote view
/vote history
/vote export

/member panel
/member view
/member set-qr
/member remove-qr
/member view-other
/member set-other
/member import
/member export
```

Alternatives considered:

- Subcommand groups như `/member self set-qr` và `/member admin set`: rõ quyền hơn nhưng dài và formal hơn cho Discord UX.
- Giữ top-level command cũ song song: giảm breaking change nhưng làm danh sách command rối hơn, trái mục tiêu gom nhóm.

Rationale: flat subcommands ngắn, dễ gõ, phù hợp bot nội bộ, trong khi permission vẫn có thể thể hiện qua `/help` và subcommand descriptions.

### 2. Thay hẳn command cũ trong registry

`src/commands/index.js` sẽ chỉ export command modules mới. Khi chạy `npm run deploy:commands`, REST registration sẽ replace command list theo registry hiện tại.

Mapping behavior:

```text
/vote-tao                  -> /vote create
/vote-dong                 -> /vote close
/vote-xem                  -> /vote view
/vote-lich-su              -> /vote history
/profile export-attendance -> /vote export
/vote-config *             -> /config *
/member-panel post         -> /member panel
/profile set-qr            -> /member set-qr
/profile remove-qr         -> /member remove-qr
/profile view-member       -> /member view-other
/profile set-member        -> /member set-other
/profile import-members    -> /member import
/profile export-members    -> /member export
```

### 3. Command modules mới giữ logic gần nơi khai báo command

Tạo modules mới:

```text
src/commands/help.js
src/commands/config.js
src/commands/vote.js
src/commands/member.js
```

Mỗi module tự define `SlashCommandBuilder` và `execute`. Codebase hiện còn nhỏ nên chưa cần folder hóa sâu. Có thể copy/move logic từ modules cũ vào modules mới, sau đó không include modules cũ trong registry. Nếu muốn giảm file chết, implementation có thể xóa modules cũ sau khi tests đã chuyển.

### 4. `/help` dùng metadata tĩnh

`/help` nên render từ metadata tĩnh thay vì introspect phức tạp từ `SlashCommandBuilder`, vì cần group theo domain, permission labels, topic filtering, và mapping lệnh cũ sang lệnh mới.

Đề xuất topic choices:

```text
all
vote
member
config
admin
legacy
```

Default `/help` hiển thị overview. `/help topic:legacy` hiển thị mapping lệnh cũ sang lệnh mới. Output là ephemeral để không spam channel.

### 5. Permission-aware help

`/help` cần lấy settings và phân loại user:

- admin: `isBotAdmin(interaction.member, settings)`
- member/admin: `canViewAttendance(interaction.member, settings)`

Default behavior:

- Admin thấy đầy đủ lệnh.
- Member thấy lệnh member dùng được và ghi chú dùng `/help topic:admin` nếu cần xem lệnh admin.
- User chưa có quyền member vẫn thấy `/help`, nhưng chỉ có lệnh help và ghi chú liên hệ admin/cấu hình role.

Topic `admin` có thể hiển thị lệnh admin kèm nhãn `[Admin]`; nếu caller không phải admin, output vẫn ephemeral và giải thích cần quyền admin để dùng.

## Risks / Trade-offs

- [Breaking change khiến user quen lệnh cũ không tìm thấy command] → `/help` có topic `legacy`, README có bảng mapping, admin thông báo sau deploy.
- [Tests phải đổi nhiều do command names/subcommands thay đổi] → Cập nhật command-flow tests theo mapping từng behavior.
- [File command cũ còn tồn tại nhưng không được register có thể gây nhầm] → Prefer xóa hoặc không import trong registry; tests assert old commands không exposed.
- [Permission regression khi move logic] → Reuse helper checks hiện có và thêm tests cho admin-only/member commands.
- [Help output quá dài] → Dùng topic filtering và overview ngắn.

## Migration Plan

1. Tạo modules mới `/help`, `/config`, `/vote`, `/member`.
2. Move/reuse behavior từ command cũ sang subcommands mới.
3. Cập nhật registry chỉ include 4 command mới.
4. Cập nhật tests và README.
5. Chạy `npm test`.
6. Sau khi merge/deploy code, chạy `npm run deploy:commands` để replace slash commands trong Discord.

Rollback: revert registry/modules/docs/tests về command cũ và deploy commands lại. Không có database migration liên quan.

## Open Questions

- Không còn open questions bắt buộc. User đã chốt thay hẳn command cũ.
