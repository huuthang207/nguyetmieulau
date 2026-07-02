const { SlashCommandBuilder } = require('discord.js');
const { canViewAttendance } = require('../utils/permissions');
const { buildVoteMessagePayload } = require('../services/vote-embed-service');

const data = new SlashCommandBuilder()
  .setName('vote-xem')
  .setDescription('Xem vote hiện tại hoặc vote theo ID')
  .addIntegerOption((option) =>
    option
      .setName('vote_id')
      .setDescription('ID của vote cần xem')
      .setRequired(false),
  );

async function execute(interaction, context) {
  const { settingsService, voteService } = context.services;
  const settings = settingsService.getSettings(interaction.guildId);

  if (!canViewAttendance(interaction.member, settings)) {
    await interaction.reply({
      content: 'Bạn không có quyền xem dữ liệu điểm danh.',
      ephemeral: true,
    });
    return;
  }

  const voteId = interaction.options.getInteger('vote_id');
  const result = voteService.resolveVoteForView(interaction.guildId, voteId);

  if (!result) {
    await interaction.reply({
      content: 'Chưa có vote nào để hiển thị.',
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    ...buildVoteMessagePayload(result.vote, result.summary, { includeComponents: false }),
    ephemeral: true,
  });
}

module.exports = {
  data,
  execute,
};
