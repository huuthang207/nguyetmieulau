const {
  ActionRowBuilder,
  EmbedBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { MON_PHAI_VALUES, getMonPhaiKey, formatMonPhaiWithEmoji } = require('../constants/mon-phai');
const { buildProfileContent, buildMissingProfileContent } = require('./profile-view-service');

const MEMBER_PANEL_MENU_ID = 'member-panel:menu';
const MEMBER_PROFILE_MON_PHAI_SELECT_ID = 'member-profile:mon-phai-select';
const MEMBER_PROFILE_MODAL_PREFIX = 'member-profile:update-modal:';
const MEMBER_PROFILE_INGAME_NAME_INPUT_ID = 'member-profile:ingame-name';
const MEMBER_PROFILE_GAME_ID_INPUT_ID = 'member-profile:game-id';

function buildMemberPanelPayload() {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🧾 Quản lý thông tin thành viên')
    .setDescription([
      'Dùng menu bên dưới để cập nhật hoặc xem thông tin nhân vật của bạn.',
      'Thông tin này sẽ được dùng khi điểm danh Bang Chiến.',
    ].join('\n'));

  const select = new StringSelectMenuBuilder()
    .setCustomId(MEMBER_PANEL_MENU_ID)
    .setPlaceholder('Chọn chức năng')
    .addOptions(
      {
        label: 'Cập nhật hồ sơ',
        value: 'member-profile:update',
        description: 'Cập nhật tên nhân vật, Game ID và môn phái',
        emoji: '📝',
      },
      {
        label: 'Cập nhật QR ngân hàng',
        value: 'member-profile:update-bank-qr',
        description: 'Xem hướng dẫn upload hoặc xóa QR ngân hàng',
        emoji: '🏦',
      },
      {
        label: 'Xem hồ sơ hiện tại',
        value: 'member-profile:view',
        description: 'Xem thông tin nhân vật hiện tại của bạn',
        emoji: '👀',
      },
    );

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(select)],
  };
}

function buildMonPhaiSelect(profile) {
  const select = new StringSelectMenuBuilder()
    .setCustomId(MEMBER_PROFILE_MON_PHAI_SELECT_ID)
    .setPlaceholder('Chọn môn phái');

  for (const monPhai of MON_PHAI_VALUES) {
    const key = getMonPhaiKey(monPhai);
    if (!key) {
      continue;
    }

    select.addOptions({
      label: monPhai,
      value: `${MEMBER_PROFILE_MODAL_PREFIX}${key}`,
      default: profile?.mon_phai === monPhai,
    });
  }

  return new ActionRowBuilder().addComponents(select);
}

function buildProfileUpdatePrompt(profile) {
  const title = profile ? 'Hồ sơ hiện tại của bạn' : 'Bạn chưa có hồ sơ';
  const currentProfileText = profile
    ? buildProfileContent(profile, { includeBankQr: true })
    : buildMissingProfileContent();

  return {
    content: [
      `**${title}**`,
      currentProfileText,
      '',
      'Chọn môn phái để tiếp tục cập nhật hồ sơ.',
    ].join('\n'),
    components: [buildMonPhaiSelect(profile)],
    ephemeral: true,
  };
}

function buildProfileModal(monPhaiKey, profile) {
  const ingameNameInput = new TextInputBuilder()
    .setCustomId(MEMBER_PROFILE_INGAME_NAME_INPUT_ID)
    .setLabel('Tên nhân vật ingame')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  const gameIdInput = new TextInputBuilder()
    .setCustomId(MEMBER_PROFILE_GAME_ID_INPUT_ID)
    .setLabel('Game ID')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  if (profile?.ingame_name) {
    ingameNameInput.setValue(profile.ingame_name);
  }

  if (profile?.game_id) {
    gameIdInput.setValue(profile.game_id);
  }

  return new ModalBuilder()
    .setCustomId(`${MEMBER_PROFILE_MODAL_PREFIX}${monPhaiKey}`)
    .setTitle('Cập nhật hồ sơ nhân vật')
    .addComponents(
      new ActionRowBuilder().addComponents(ingameNameInput),
      new ActionRowBuilder().addComponents(gameIdInput),
    );
}

function buildBankQrGuidanceContent(profile) {
  if (!profile) {
    return 'Bạn cần chọn `Cập nhật hồ sơ` để tạo hồ sơ trước khi upload QR ngân hàng.';
  }

  return [
    'Dùng `/member set-qr file:<ảnh>` để upload hoặc thay QR ngân hàng của bạn.',
    'Dùng `/member remove-qr` để xóa QR đã upload.',
    '',
    profile.bank_qr_url ? `QR hiện tại: ${profile.bank_qr_url}` : 'QR hiện tại: Chưa upload',
  ].join('\n');
}

function buildProfileSavedContent(profile) {
  return `Đã lưu profile của bạn.\n${buildProfileContent(profile, { includeBankQr: true })}`;
}

function buildMonPhaiLabel(monPhai) {
  return formatMonPhaiWithEmoji(monPhai);
}

module.exports = {
  MEMBER_PANEL_MENU_ID,
  MEMBER_PROFILE_MON_PHAI_SELECT_ID,
  MEMBER_PROFILE_MODAL_PREFIX,
  MEMBER_PROFILE_INGAME_NAME_INPUT_ID,
  MEMBER_PROFILE_GAME_ID_INPUT_ID,
  buildMemberPanelPayload,
  buildProfileUpdatePrompt,
  buildProfileModal,
  buildBankQrGuidanceContent,
  buildProfileSavedContent,
  buildMonPhaiLabel,
};
