const { AttachmentBuilder, SlashCommandBuilder } = require('discord.js');
const { MON_PHAI_CHOICES } = require('../constants/mon-phai');
const { isBotAdmin } = require('../utils/permissions');
const { buildProfileContent } = require('../services/profile-view-service');

const data = new SlashCommandBuilder()
  .setName('profile')
  .setDescription('Quản lý hồ sơ ingame và dữ liệu điểm danh')
  .addSubcommand((subcommand) => {
    let builder = subcommand
      .setName('set-member')
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
      .setName('import-members')
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
      .setName('export-members')
      .setDescription('Admin export danh sách member profiles ra JSON'),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('export-attendance')
      .setDescription('Admin export dữ liệu attendance ra JSON')
      .addIntegerOption((option) =>
        option
          .setName('vote_id')
          .setDescription('ID của vote cần export, để trống sẽ dùng vote đang mở')
          .setRequired(false),
      ),
  );

async function execute(interaction, context) {
  const subcommand = interaction.options.getSubcommand();
  const { settingsService, profileService, dataExchangeService } = context.services;
  const settings = await settingsService.getSettings(interaction.guildId);

  if (!isBotAdmin(interaction.member, settings)) {
    await interaction.reply({
      content: 'Bạn không có quyền quản trị bot.',
      ephemeral: true,
    });
    return;
  }

  if (subcommand === 'set-member') {
    const member = interaction.options.getUser('member', true);
    const result = await profileService.saveProfile({
      guildId: interaction.guildId,
      userId: member.id,
      ingameName: interaction.options.getString('ingame_name', true),
      monPhai: interaction.options.getString('mon_phai', true),
    });

    await interaction.reply({
      content: result.ok
        ? `Đã cập nhật profile cho <@${member.id}>.\n${buildProfileContent(result.profile)}`
        : result.message,
      ephemeral: true,
    });
    return;
  }

  if (subcommand === 'import-members') {
    try {
      const attachment = interaction.options.getAttachment('file', true);
      const payload = await dataExchangeService.parseJsonAttachment(attachment);
      const result = await profileService.importProfiles(interaction.guildId, payload);

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
    return;
  }

  if (subcommand === 'export-members') {
    const payload = await dataExchangeService.buildMemberProfilesExport(interaction.guildId);
    await interaction.reply({
      content: `Đang export ${payload.items.length} member profile.`,
      files: [new AttachmentBuilder(
        dataExchangeService.toJsonAttachment('member-profiles.json', payload).attachment,
        { name: 'member-profiles.json' },
      )],
      ephemeral: true,
    });
    return;
  }

  if (subcommand === 'export-attendance') {
    const voteId = interaction.options.getInteger('vote_id');
    const payload = await dataExchangeService.buildAttendanceExport(interaction.guildId, voteId);

    if (!payload) {
      await interaction.reply({
        content: 'Không tìm thấy vote mục tiêu để xuất dữ liệu.',
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      content: `Đang export attendance cho vote #${payload.vote_id}.`,
      files: [new AttachmentBuilder(
        dataExchangeService.toJsonAttachment(`attendance-vote-${payload.vote_id}.json`, payload).attachment,
        { name: `attendance-vote-${payload.vote_id}.json` },
      )],
      ephemeral: true,
    });
  }
}

module.exports = {
  data,
  execute,
};
