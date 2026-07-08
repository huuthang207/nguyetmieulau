const { AttachmentBuilder, SlashCommandBuilder } = require('discord.js');
const { MON_PHAI_CHOICES } = require('../constants/mon-phai');
const { canViewAttendance, isBotAdmin } = require('../utils/permissions');
const { buildMemberPanelPayload } = require('../services/member-panel-service');
const { buildMissingProfileContent, buildProfileContent } = require('../services/profile-view-service');

const ADMIN_SUBCOMMANDS = new Set(['panel', 'view-other', 'set-other', 'import', 'export']);
const MEMBER_SUBCOMMANDS = new Set(['view', 'set-qr', 'remove-qr']);

const data = new SlashCommandBuilder()
  .setName('member')
  .setDescription('Quản lý hồ sơ thành viên và QR ngân hàng')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('panel')
      .setDescription('Đăng panel quản lý thông tin thành viên vào channel hiện tại'),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('view')
      .setDescription('Xem hồ sơ hiện tại của bạn'),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('set-qr')
      .setDescription('Upload hoặc thay QR ngân hàng của bạn')
      .addAttachmentOption((option) =>
        option
          .setName('file')
          .setDescription('Ảnh QR ngân hàng')
          .setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('remove-qr')
      .setDescription('Xóa QR ngân hàng của bạn'),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('view-other')
      .setDescription('Admin xem profile và QR ngân hàng của member')
      .addUserOption((option) =>
        option
          .setName('member')
          .setDescription('Member cần xem profile')
          .setRequired(true),
      ),
  )
  .addSubcommand((subcommand) => {
    const builder = subcommand
      .setName('set-other')
      .setDescription('Admin cập nhật profile cho member khác')
      .addUserOption((option) =>
        option
          .setName('member')
          .setDescription('Member cần cập nhật profile')
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName('ingame_name')
          .setDescription('Tên nhân vật ingame')
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName('game_id')
          .setDescription('Game ID của nhân vật')
          .setRequired(true),
      )
      .addStringOption((option) => {
        option
          .setName('mon_phai')
          .setDescription('Môn phái của nhân vật')
          .setRequired(true);

        for (const choice of MON_PHAI_CHOICES) {
          option.addChoices(choice);
        }

        return option;
      });

    return builder;
  })
  .addSubcommand((subcommand) =>
    subcommand
      .setName('import')
      .setDescription('Admin import danh sách member profiles từ JSON')
      .addAttachmentOption((option) =>
        option
          .setName('file')
          .setDescription('File JSON chứa member profiles')
          .setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('export')
      .setDescription('Admin export danh sách member profiles ra JSON'),
  );

async function ensureAdmin(interaction, settings) {
  if (isBotAdmin(interaction.member, settings)) {
    return true;
  }

  await interaction.reply({
    content: 'Bạn không có quyền quản trị bot.',
    ephemeral: true,
  });
  return false;
}

async function ensureMemberAccess(interaction, settings) {
  if (canViewAttendance(interaction.member, settings)) {
    return true;
  }

  await interaction.reply({
    content: 'Bạn không có quyền sử dụng chức năng này.',
    ephemeral: true,
  });
  return false;
}

async function handlePanel(interaction) {
  await interaction.channel.send(buildMemberPanelPayload());
  await interaction.reply({
    content: 'Đã tạo member management panel trong channel hiện tại.',
    ephemeral: true,
  });
}

async function handleView(interaction, context) {
  const profile = await context.services.profileService.getProfile(interaction.guildId, interaction.user.id);
  await interaction.reply({
    content: profile ? buildProfileContent(profile, { includeBankQr: true }) : buildMissingProfileContent(),
    ephemeral: true,
  });
}

async function handleSetQr(interaction, context) {
  const result = await context.services.profileService.setBankQr({
    guildId: interaction.guildId,
    userId: interaction.user.id,
    attachment: interaction.options.getAttachment('file', true),
  });

  await interaction.reply({
    content: result.ok ? 'Đã lưu QR ngân hàng của bạn.' : result.message,
    ephemeral: true,
  });
}

async function handleRemoveQr(interaction, context) {
  const result = await context.services.profileService.removeBankQr({
    guildId: interaction.guildId,
    userId: interaction.user.id,
  });

  await interaction.reply({
    content: result.ok ? 'Đã xóa QR ngân hàng của bạn.' : result.message,
    ephemeral: true,
  });
}

async function handleViewOther(interaction, context) {
  const member = interaction.options.getUser('member', true);
  const profile = await context.services.profileService.getProfile(interaction.guildId, member.id);
  await interaction.reply({
    content: profile
      ? `Profile của <@${member.id}>:\n${buildProfileContent(profile, { includeBankQr: true })}`
      : buildMissingProfileContent(),
    ephemeral: true,
  });
}

async function handleSetOther(interaction, context) {
  const member = interaction.options.getUser('member', true);
  const result = await context.services.profileService.saveProfile({
    guildId: interaction.guildId,
    userId: member.id,
    ingameName: interaction.options.getString('ingame_name', true),
    gameId: interaction.options.getString('game_id', true),
    monPhai: interaction.options.getString('mon_phai', true),
  });

  await interaction.reply({
    content: result.ok
      ? `Đã cập nhật profile cho <@${member.id}>.\n${buildProfileContent(result.profile, { includeBankQr: true })}`
      : result.message,
    ephemeral: true,
  });
}

async function handleImport(interaction, context) {
  try {
    const attachment = interaction.options.getAttachment('file', true);
    const payload = await context.services.dataExchangeService.parseJsonAttachment(attachment);
    const result = await context.services.profileService.importProfiles(interaction.guildId, payload);

    await interaction.reply({
      content: result.ok
        ? `Đã import thành công ${result.importedCount} member profile.`
        : result.message,
      ephemeral: true,
    });
  } catch (error) {
    await interaction.reply({
      content: error.message || 'Không thể import file JSON.',
      ephemeral: true,
    });
  }
}

async function handleExport(interaction, context) {
  const { dataExchangeService } = context.services;
  const payload = await dataExchangeService.buildMemberProfilesExport(interaction.guildId);
  await interaction.reply({
    content: `Đang export ${payload.items.length} member profile.`,
    files: [new AttachmentBuilder(
      dataExchangeService.toJsonAttachment('member-profiles.json', payload).attachment,
      { name: 'member-profiles.json' },
    )],
    ephemeral: true,
  });
}

async function execute(interaction, context) {
  const subcommand = interaction.options.getSubcommand();
  const settings = await context.services.settingsService.getSettings(interaction.guildId);

  if (ADMIN_SUBCOMMANDS.has(subcommand) && !(await ensureAdmin(interaction, settings))) {
    return;
  }

  if (MEMBER_SUBCOMMANDS.has(subcommand) && !(await ensureMemberAccess(interaction, settings))) {
    return;
  }

  if (subcommand === 'panel') {
    await handlePanel(interaction);
    return;
  }

  if (subcommand === 'view') {
    await handleView(interaction, context);
    return;
  }

  if (subcommand === 'set-qr') {
    await handleSetQr(interaction, context);
    return;
  }

  if (subcommand === 'remove-qr') {
    await handleRemoveQr(interaction, context);
    return;
  }

  if (subcommand === 'view-other') {
    await handleViewOther(interaction, context);
    return;
  }

  if (subcommand === 'set-other') {
    await handleSetOther(interaction, context);
    return;
  }

  if (subcommand === 'import') {
    await handleImport(interaction, context);
    return;
  }

  if (subcommand === 'export') {
    await handleExport(interaction, context);
  }
}

module.exports = {
  data,
  execute,
};
