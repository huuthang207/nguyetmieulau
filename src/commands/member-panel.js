const { SlashCommandBuilder } = require('discord.js');
const { isBotAdmin } = require('../utils/permissions');
const { buildMemberPanelPayload } = require('../services/member-panel-service');

const data = new SlashCommandBuilder()
  .setName('member-panel')
  .setDescription('Quản lý panel thông tin thành viên')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('post')
      .setDescription('Đăng panel quản lý thông tin thành viên vào channel hiện tại'),
  );

async function execute(interaction, context) {
  const { settingsService } = context.services;
  const settings = await settingsService.getSettings(interaction.guildId);

  if (!isBotAdmin(interaction.member, settings)) {
    await interaction.reply({
      content: 'Bạn không có quyền quản trị bot.',
      ephemeral: true,
    });
    return;
  }

  await interaction.channel.send(buildMemberPanelPayload());
  await interaction.reply({
    content: 'Đã tạo member management panel trong channel hiện tại.',
    ephemeral: true,
  });
}

module.exports = {
  data,
  execute,
};
