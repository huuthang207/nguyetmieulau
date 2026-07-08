const { formatMonPhaiWithEmoji } = require('../constants/mon-phai');

function buildProfileContent(profile) {
  return [
    `Ingame name: **${profile.ingame_name}**`,
    `Môn phái: **${formatMonPhaiWithEmoji(profile.mon_phai)}**`,
  ].join('\n');
}

function buildMissingProfileContent() {
  return 'Bạn chưa có hồ sơ. Hãy chọn `Cập nhật hồ sơ` trong panel thành viên để tạo thông tin nhân vật.';
}

module.exports = {
  buildProfileContent,
  buildMissingProfileContent,
};
