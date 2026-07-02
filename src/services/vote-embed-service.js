const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const { toDiscordTimestamp } = require('../utils/time');

const CHOICE_LABELS = {
  join: 'Tham Gia',
  reserve: 'Dự Bị',
  absent: 'Không Tham Gia',
};

function getStatusLabel(status) {
  return status === 'closed' ? 'Đã đóng' : 'Đang mở';
}

function getStatusColor(status) {
  return status === 'closed' ? 0xed4245 : 0x57f287;
}

function buildVoteEmbed(vote, summary) {
  const embed = new EmbedBuilder()
    .setColor(getStatusColor(vote.status))
    .setTitle('📢 Điểm danh Bang Chiến')
    .addFields(
      { name: 'Tiêu đề', value: vote.title, inline: false },
      { name: 'Thời gian', value: vote.event_time, inline: true },
      { name: 'Trạng thái', value: getStatusLabel(vote.status), inline: true },
      { name: 'Cập nhật gần nhất', value: toDiscordTimestamp(vote.updated_at), inline: false },
      { name: '✅ Tham Gia', value: String(summary.joinCount), inline: true },
      { name: '🟡 Dự Bị', value: String(summary.reserveCount), inline: true },
      { name: '❌ Không Tham Gia', value: String(summary.absentCount), inline: true },
      { name: '📊 Tổng đã phản hồi', value: String(summary.totalCount), inline: false },
    );

  if (vote.description) {
    embed.spliceFields(2, 0, { name: 'Mô tả', value: vote.description, inline: false });
  }

  return embed;
}

function buildVoteButtons(voteId, disabled) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`vote:${voteId}:join`)
      .setLabel(CHOICE_LABELS.join)
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`vote:${voteId}:reserve`)
      .setLabel(CHOICE_LABELS.reserve)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`vote:${voteId}:absent`)
      .setLabel(CHOICE_LABELS.absent)
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
  );
}

function buildVoteMessagePayload(vote, summary, options = {}) {
  const { includeComponents = true } = options;
  const payload = {
    embeds: [buildVoteEmbed(vote, summary)],
  };

  if (includeComponents) {
    payload.components = [buildVoteButtons(vote.id, vote.status === 'closed')];
  }

  return payload;
}

function buildHistoryEmbed(votes) {
  const lines = votes.map((vote) => {
    const status = vote.status === 'closed' ? 'closed' : 'open';
    return `#${vote.id} - ${vote.title} - ${status} - ${vote.event_time}`;
  });

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🕘 Lịch sử vote gần đây')
    .setDescription(lines.join('\n'));
}

module.exports = {
  CHOICE_LABELS,
  buildVoteEmbed,
  buildVoteButtons,
  buildVoteMessagePayload,
  buildHistoryEmbed,
};
