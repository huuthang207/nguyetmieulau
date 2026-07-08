## 1. Command modules và registry

- [x] 1.1 Tạo `src/commands/config.js` với subcommands `channel`, `member-role`, `admin-role` và behavior tương đương `/vote-config` cũ.
- [x] 1.2 Tạo `src/commands/vote.js` với subcommands `create`, `close`, `view`, `history`, `export` và behavior tương đương các vote commands cũ cộng export attendance.
- [x] 1.3 Tạo `src/commands/member.js` với subcommands `panel`, `view`, `set-qr`, `remove-qr`, `view-other`, `set-other`, `import`, `export`.
- [x] 1.4 Tạo `src/commands/help.js` với option `topic` và response ephemeral.
- [x] 1.5 Cập nhật `src/commands/index.js` để chỉ register `/help`, `/config`, `/vote`, `/member`.
- [x] 1.6 Xóa hoặc ngừng import các command modules cũ khỏi registry (`vote-config`, `vote-tao`, `vote-dong`, `vote-xem`, `vote-lich-su`, `profile`, `member-panel`).

## 2. Help command

- [x] 2.1 Tạo metadata tĩnh cho các nhóm command, descriptions, permission labels, và topic filtering.
- [x] 2.2 Implement `/help` default overview cho admin, member, và user chưa có quyền member.
- [x] 2.3 Implement `/help topic:vote`, `/help topic:member`, `/help topic:config`, `/help topic:admin`, và `/help topic:legacy`.
- [x] 2.4 Đảm bảo help output không public spam channel bằng cách luôn reply ephemeral.

## 3. Behavior mapping và permissions

- [x] 3.1 Map `/vote create` từ `/vote-tao` và giữ admin-only + validation cấu hình.
- [x] 3.2 Map `/vote close` từ `/vote-dong` và giữ admin-only behavior.
- [x] 3.3 Map `/vote view` và `/vote history` từ `/vote-xem` và `/vote-lich-su`, giữ member/admin permission.
- [x] 3.4 Map `/vote export` từ `/profile export-attendance`, giữ admin-only behavior.
- [x] 3.5 Map `/member panel` từ `/member-panel post`, giữ admin-only behavior.
- [x] 3.6 Map `/member set-qr`, `/member remove-qr`, `/member view-other`, `/member set-other`, `/member import`, `/member export` từ `/profile` behavior cũ.
- [x] 3.7 Thêm `/member view` để member/admin xem profile của chính mình bằng slash command.
- [x] 3.8 Kiểm tra permission errors giữ đúng nội dung phù hợp cho admin-only và member-only commands.

## 4. Documentation và cleanup

- [x] 4.1 Cập nhật README Slash Commands section với command tree mới.
- [x] 4.2 Thêm bảng mapping lệnh cũ sang lệnh mới trong README.
- [x] 4.3 Cập nhật hướng dẫn luồng sử dụng cơ bản theo `/config`, `/vote`, `/member`, `/help`.
- [x] 4.4 Dọn code dead nếu command modules cũ không còn cần thiết.

## 5. Tests và verification

- [x] 5.1 Cập nhật command registry tests để assert chỉ có `/help`, `/config`, `/vote`, `/member` và không còn command cũ.
- [x] 5.2 Cập nhật command definition tests cho subcommands mới của `/config`, `/vote`, `/member`, `/help`.
- [x] 5.3 Cập nhật command flow tests cho create/close/view/history/export vote dưới `/vote`.
- [x] 5.4 Cập nhật command flow tests cho panel/view/QR/admin/import/export member dưới `/member`.
- [x] 5.5 Thêm tests cho `/help` default, topic-specific, permission-aware output, và legacy mapping.
- [x] 5.6 Chạy `npm test` và sửa regression nếu có.
