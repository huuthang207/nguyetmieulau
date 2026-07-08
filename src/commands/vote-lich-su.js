const { SlashCommandBuilder } = require('discord.js');
const { canViewAttendance } = require('../utils/permissions');
const { buildHistoryEmbed } = require('../services/vote-embed-service');
const { HISTORY_DEFAULT_LIMIT, HISTORY_MAX_LIMIT } = require('../services/vote-service');

const data = new SlashCommandBuilder()
  .setName('vote-lich-su')
  .setDescription('Xem lịch sử vote gần đây')
  .addIntegerOption((option) =>
    option
      .setName('limit')
      .setDescription(`Số lượng vote muốn xem (mặc định ${HISTORY_DEFAULT_LIMIT}, tối đa ${HISTORY_MAX_LIMIT})`)
      .setMinValue(1)
      .setRequired(false),
  );

async function execute(interaction, context) {
  const { settingsService, voteService } = context.services;
  const settings = await settingsService.getSettings(interaction.guildId);

  if (!canViewAttendance(interaction.member, settings)) {
    await interaction.reply({
      content: 'Bạn không có quyền xem dữ liệu điểm danh.',
      ephemeral: true,
    });
    return;
  }

  const requestedLimit = interaction.options.getInteger('limit') || HISTORY_DEFAULT_LIMIT;
  const votes = await voteService.listVoteHistory(interaction.guildId, requestedLimit);

  if (votes.length === 0) {
    await interaction.reply({
      content: 'Chưa có lịch sử vote nào.',
      ephemeral: true,
    });
    return;
  }

  const capped = Math.min(requestedLimit, HISTORY_MAX_LIMIT);

  await interaction.reply({
    embeds: [buildHistoryEmbed(votes)],
    content: requestedLimit > HISTORY_MAX_LIMIT ? `Chỉ hiển thị tối đa ${HISTORY_MAX_LIMIT} vote gần nhất.` : `Đang hiển thị ${capped} vote gần nhất.`,
    ephemeral: true,
  });
}

module.exports = {
  data,
  execute,
};
