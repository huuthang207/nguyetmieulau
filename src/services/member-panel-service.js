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
        description: 'Cập nhật tên nhân vật và môn phái của bạn',
        emoji: '📝',
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
    ? buildProfileContent(profile)
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
  const input = new TextInputBuilder()
    .setCustomId(MEMBER_PROFILE_INGAME_NAME_INPUT_ID)
    .setLabel('Tên nhân vật ingame')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  if (profile?.ingame_name) {
    input.setValue(profile.ingame_name);
  }

  return new ModalBuilder()
    .setCustomId(`${MEMBER_PROFILE_MODAL_PREFIX}${monPhaiKey}`)
    .setTitle('Cập nhật hồ sơ nhân vật')
    .addComponents(new ActionRowBuilder().addComponents(input));
}

function buildProfileSavedContent(profile) {
  return `Đã lưu profile của bạn.\n${buildProfileContent(profile)}`;
}

function buildMonPhaiLabel(monPhai) {
  return formatMonPhaiWithEmoji(monPhai);
}

module.exports = {
  MEMBER_PANEL_MENU_ID,
  MEMBER_PROFILE_MON_PHAI_SELECT_ID,
  MEMBER_PROFILE_MODAL_PREFIX,
  MEMBER_PROFILE_INGAME_NAME_INPUT_ID,
  buildMemberPanelPayload,
  buildProfileUpdatePrompt,
  buildProfileModal,
  buildProfileSavedContent,
  buildMonPhaiLabel,
};
