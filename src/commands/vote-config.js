const { ChannelType, SlashCommandBuilder } = require('discord.js');
const { isBotAdmin } = require('../utils/permissions');

const data = new SlashCommandBuilder()
  .setName('vote-config')
  .setDescription('Cấu hình bot điểm danh Bang Chiến')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('channel')
      .setDescription('Đặt channel điểm danh')
      .addChannelOption((option) =>
        option
          .setName('channel')
          .setDescription('Channel dùng để đăng vote điểm danh')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('member-role')
      .setDescription('Đặt role được phép vote')
      .addRoleOption((option) =>
        option
          .setName('role')
          .setDescription('Role thành viên được phép vote')
          .setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('admin-role')
      .setDescription('Đặt role quản trị bot')
      .addRoleOption((option) =>
        option
          .setName('role')
          .setDescription('Role quản trị bot')
          .setRequired(true),
      ),
  );

async function execute(interaction, context) {
  const { settingsService } = context.services;
  const settings = settingsService.getSettings(interaction.guildId);

  if (!isBotAdmin(interaction.member, settings)) {
    await interaction.reply({
      content: 'Bạn không có quyền quản trị bot.',
      ephemeral: true,
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'channel') {
    const channel = interaction.options.getChannel('channel', true);
    settingsService.setAttendanceChannel(interaction.guildId, channel.id);

    await interaction.reply({
      content: `Đã cập nhật channel điểm danh thành ${channel}.`,
      ephemeral: true,
    });
    return;
  }

  if (subcommand === 'member-role') {
    const role = interaction.options.getRole('role', true);
    settingsService.setMemberRole(interaction.guildId, role.id);

    await interaction.reply({
      content: `Đã cập nhật role thành viên thành ${role}.`,
      ephemeral: true,
    });
    return;
  }

  if (subcommand === 'admin-role') {
    const role = interaction.options.getRole('role', true);
    settingsService.setAdminRole(interaction.guildId, role.id);

    await interaction.reply({
      content: `Đã cập nhật role admin thành ${role}.`,
      ephemeral: true,
    });
  }
}

module.exports = {
  data,
  execute,
};
