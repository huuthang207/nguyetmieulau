const { canVote } = require('../utils/permissions');
const { CHOICE_LABELS, buildVoteMessagePayload } = require('../services/vote-embed-service');

function parseVoteButton(customId) {
  const match = /^vote:(\d+):(join|reserve|absent)$/.exec(customId);
  if (!match) {
    return null;
  }

  return {
    voteId: Number(match[1]),
    choice: match[2],
  };
}

async function handleVoteButton(interaction, context) {
  const payload = parseVoteButton(interaction.customId);
  if (!payload) {
    return false;
  }

  const { settingsService, voteService } = context.services;
  const settings = settingsService.getSettings(interaction.guildId);

  if (!canVote(interaction.member, settings)) {
    await interaction.reply({
      content: 'Bạn không có quyền tham gia điểm danh này.',
      ephemeral: true,
    });
    return true;
  }

  const vote = voteService.getVoteByIdForGuild(interaction.guildId, payload.voteId);
  if (!vote) {
    await interaction.reply({
      content: 'Không tìm thấy vote tương ứng.',
      ephemeral: true,
    });
    return true;
  }

  if (vote.status === 'closed') {
    await interaction.reply({
      content: 'Vote này đã đóng, bạn không thể thay đổi lựa chọn.',
      ephemeral: true,
    });
    return true;
  }

  const result = voteService.saveMemberChoice(vote.id, interaction.user.id, payload.choice);
  await interaction.message.edit(buildVoteMessagePayload(result.vote, result.summary));

  let content = `Bạn đã chọn: ${CHOICE_LABELS[payload.choice]}`;
  if (!result.created && result.changed) {
    content = `Đã cập nhật lựa chọn của bạn thành: ${CHOICE_LABELS[payload.choice]}`;
  } else if (!result.changed) {
    content = `Bạn đã chọn trạng thái này rồi: ${CHOICE_LABELS[payload.choice]}`;
  }

  await interaction.reply({
    content,
    ephemeral: true,
  });

  return true;
}

module.exports = {
  handleVoteButton,
};
