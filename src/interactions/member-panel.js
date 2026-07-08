const { canViewAttendance } = require('../utils/permissions');
const { getMonPhaiFromKey } = require('../constants/mon-phai');
const {
  MEMBER_PANEL_MENU_ID,
  MEMBER_PROFILE_MON_PHAI_SELECT_ID,
  MEMBER_PROFILE_MODAL_PREFIX,
  MEMBER_PROFILE_INGAME_NAME_INPUT_ID,
  MEMBER_PROFILE_GAME_ID_INPUT_ID,
  buildProfileUpdatePrompt,
  buildProfileModal,
  buildBankQrGuidanceContent,
  buildProfileSavedContent,
} = require('../services/member-panel-service');
const { buildProfileContent, buildMissingProfileContent } = require('../services/profile-view-service');

function parseMemberPanelSelect(interaction) {
  if (interaction.customId === MEMBER_PANEL_MENU_ID) {
    const value = interaction.values?.[0];
    if (value === 'member-profile:view' || value === 'member-profile:update' || value === 'member-profile:update-bank-qr') {
      const actions = {
        'member-profile:view': 'view-profile',
        'member-profile:update': 'update-profile',
        'member-profile:update-bank-qr': 'update-bank-qr',
      };
      return { action: actions[value] };
    }
  }

  if (interaction.customId === MEMBER_PROFILE_MON_PHAI_SELECT_ID) {
    const value = interaction.values?.[0];
    if (value?.startsWith(MEMBER_PROFILE_MODAL_PREFIX)) {
      return {
        action: 'select-mon-phai',
        monPhaiKey: value.slice(MEMBER_PROFILE_MODAL_PREFIX.length),
      };
    }
  }

  return null;
}

function parseMemberProfileModal(customId) {
  if (!customId?.startsWith(MEMBER_PROFILE_MODAL_PREFIX)) {
    return null;
  }

  return {
    monPhaiKey: customId.slice(MEMBER_PROFILE_MODAL_PREFIX.length),
  };
}

async function ensureCanUseMemberPanel(interaction, context) {
  const settings = await context.services.settingsService.getSettings(interaction.guildId);
  if (canViewAttendance(interaction.member, settings)) {
    return true;
  }

  await interaction.reply({
    content: 'Bạn không có quyền sử dụng panel này.',
    ephemeral: true,
  });
  return false;
}

async function handleViewProfile(interaction, context) {
  const profile = await context.services.profileService.getProfile(interaction.guildId, interaction.user.id);
  await interaction.reply({
    content: profile ? buildProfileContent(profile, { includeBankQr: true }) : buildMissingProfileContent(),
    ephemeral: true,
  });
  return true;
}

async function handleStartProfileUpdate(interaction, context) {
  const profile = await context.services.profileService.getProfile(interaction.guildId, interaction.user.id);
  await interaction.reply(buildProfileUpdatePrompt(profile));
  return true;
}

async function handleBankQrGuidance(interaction, context) {
  const profile = await context.services.profileService.getProfile(interaction.guildId, interaction.user.id);
  await interaction.reply({
    content: buildBankQrGuidanceContent(profile),
    ephemeral: true,
  });
  return true;
}

async function handleMonPhaiSelect(interaction, context, payload) {
  const monPhai = getMonPhaiFromKey(payload.monPhaiKey);
  if (!monPhai) {
    await interaction.reply({
      content: 'Môn phái không hợp lệ. Hãy thử lại từ panel thành viên.',
      ephemeral: true,
    });
    return true;
  }

  const profile = await context.services.profileService.getProfile(interaction.guildId, interaction.user.id);
  await interaction.showModal(buildProfileModal(payload.monPhaiKey, profile));
  return true;
}

async function handleMemberPanelSelect(interaction, context) {
  const payload = parseMemberPanelSelect(interaction);
  if (!payload) {
    return false;
  }

  if (!(await ensureCanUseMemberPanel(interaction, context))) {
    return true;
  }

  if (payload.action === 'view-profile') {
    return handleViewProfile(interaction, context);
  }

  if (payload.action === 'update-profile') {
    return handleStartProfileUpdate(interaction, context);
  }

  if (payload.action === 'update-bank-qr') {
    return handleBankQrGuidance(interaction, context);
  }

  if (payload.action === 'select-mon-phai') {
    return handleMonPhaiSelect(interaction, context, payload);
  }

  return false;
}

async function handleMemberProfileModal(interaction, context) {
  const payload = parseMemberProfileModal(interaction.customId);
  if (!payload) {
    return false;
  }

  if (!(await ensureCanUseMemberPanel(interaction, context))) {
    return true;
  }

  const monPhai = getMonPhaiFromKey(payload.monPhaiKey);
  if (!monPhai) {
    await interaction.reply({
      content: 'Môn phái không hợp lệ. Hãy thử lại từ panel thành viên.',
      ephemeral: true,
    });
    return true;
  }

  const result = await context.services.profileService.saveProfile({
    guildId: interaction.guildId,
    userId: interaction.user.id,
    ingameName: interaction.fields.getTextInputValue(MEMBER_PROFILE_INGAME_NAME_INPUT_ID),
    gameId: interaction.fields.getTextInputValue(MEMBER_PROFILE_GAME_ID_INPUT_ID),
    monPhai,
  });

  await interaction.reply({
    content: result.ok ? buildProfileSavedContent(result.profile) : result.message,
    ephemeral: true,
  });
  return true;
}

module.exports = {
  parseMemberPanelSelect,
  parseMemberProfileModal,
  handleMemberPanelSelect,
  handleMemberProfileModal,
};
