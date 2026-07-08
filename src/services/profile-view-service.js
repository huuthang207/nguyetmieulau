const { formatMonPhaiWithEmoji } = require('../constants/mon-phai');

function buildProfileContent(profile, { includeBankQr = false } = {}) {
  const lines = [
    `Ingame name: **${profile.ingame_name}**`,
    `Game ID: **${profile.game_id}**`,
    `Môn phái: **${formatMonPhaiWithEmoji(profile.mon_phai)}**`,
  ];

  if (includeBankQr) {
    lines.push(profile.bank_qr_url ? `QR ngân hàng: ${profile.bank_qr_url}` : 'QR ngân hàng: Chưa upload');
  }

  return lines.join('\n');
}

function buildMissingProfileContent() {
  return 'Bạn chưa có hồ sơ. Hãy chọn `Cập nhật hồ sơ` trong panel thành viên để tạo thông tin nhân vật.';
}

module.exports = {
  buildProfileContent,
  buildMissingProfileContent,
};
