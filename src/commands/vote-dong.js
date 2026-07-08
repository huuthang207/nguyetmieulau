const { SlashCommandBuilder } = require('discord.js');
const { isBotAdmin } = require('../utils/permissions');
const { buildVoteMessagePayload } = require('../services/vote-embed-service');

const data = new SlashCommandBuilder()
  .setName('vote-dong')
  .setDescription('Đóng vote điểm danh hiện tại');

async function execute(interaction, context) {
  const { settingsService, voteService } = context.services;
  const settings = await settingsService.getSettings(interaction.guildId);

  if (!isBotAdmin(interaction.member, settings)) {
    await interaction.reply({
      content: 'Bạn không có quyền quản trị bot.',
      ephemeral: true,
    });
    return;
  }

  const openVote = await voteService.getOpenVote(interaction.guildId);
  if (!openVote) {
    await interaction.reply({
      content: 'Hiện không có vote nào đang mở.',
      ephemeral: true,
    });
    return;
  }

  const { vote, summary } = await voteService.closeVote(openVote.id);
  let warning = '';

  try {
    const channel = await interaction.guild.channels.fetch(vote.channel_id).catch(() => null);
    const message = channel?.isTextBased() && vote.message_id
      ? await channel.messages.fetch(vote.message_id).catch(() => null)
      : null;

    if (message) {
      await message.edit(buildVoteMessagePayload(vote, summary));
    } else {
      warning = ' Vote đã được đóng trong dữ liệu, nhưng không tìm thấy message công khai để cập nhật.';
    }
  } catch (error) {
    warning = ' Vote đã được đóng trong dữ liệu, nhưng không thể cập nhật message công khai.';
  }

  await interaction.reply({
    content: `Đã đóng vote hiện tại.${warning}`,
    ephemeral: true,
  });
}

module.exports = {
  data,
  execute,
};
