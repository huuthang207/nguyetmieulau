const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');
const {
  formatMonPhaiWithEmoji,
  getMonPhaiKey,
} = require('../constants/mon-phai');

const CHOICE_LABELS = {
  join: 'Tham Gia',
  reserve: 'Dự Bị',
  absent: 'Không Tham Gia',
};

const EMPTY_FIELD = '​';
const WHITE_BULLET_EMOJI = '<a:whitebullet:1522802826395521124>';
const GREEN_ARROW_EMOJI = '<a:greenarrow:1522797903838449754>';
const VOTE_ITEM_EMOJI = GREEN_ARROW_EMOJI;
const DETAIL_PAGE_SIZE_JOIN = 10;
const DETAIL_PAGE_SIZE_OTHER = 15;

function getStatusLabel(status) {
  return status === 'closed' ? 'Đã đóng' : 'Đang mở';
}

function getStatusColor(status) {
  return status === 'closed' ? 0xed4245 : 0x57f287;
}

function formatFooterTimestamp(isoString) {
  const milliseconds = Date.parse(isoString);
  if (Number.isNaN(milliseconds)) {
    return 'Không xác định';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(milliseconds));
}

function buildLabelColumn() {
  return [
    `${WHITE_BULLET_EMOJI} **Thời gian**`,
    `${GREEN_ARROW_EMOJI} **Trạng thái**`,
    '',
    `${WHITE_BULLET_EMOJI} **Tổng đã phản hồi**`,
    `${VOTE_ITEM_EMOJI} **Tham Gia**`,
    `${VOTE_ITEM_EMOJI} **Dự Bị**`,
    `${VOTE_ITEM_EMOJI} **Không Tham Gia**`,
  ].join('\n');
}

function buildValueColumn(vote, summary) {
  return [
    vote.event_time,
    getStatusLabel(vote.status),
    '',
    String(summary.totalCount),
    String(summary.joinCount),
    String(summary.reserveCount),
    String(summary.absentCount),
  ].join('\n');
}

function buildEmbedFields(vote, summary) {
  const fields = [];

  if (vote.description) {
    fields.push({
      name: 'Mô tả',
      value: vote.description,
      inline: false,
    });
  }

  fields.push(
    {
      name: EMPTY_FIELD,
      value: buildLabelColumn(),
      inline: true,
    },
    {
      name: EMPTY_FIELD,
      value: buildValueColumn(vote, summary),
      inline: true,
    },
  );

  return fields;
}

function buildVoteEmbed(vote, summary) {
  return new EmbedBuilder()
    .setColor(getStatusColor(vote.status))
    .setTitle('📢 Điểm danh Bang Chiến')
    .addFields(...buildEmbedFields(vote, summary))
    .setFooter({ text: `Cập nhật gần nhất: ${formatFooterTimestamp(vote.updated_at)}` });
}

function buildChoiceButton(voteId, choice, disabled) {
  const styleMap = {
    join: ButtonStyle.Success,
    reserve: ButtonStyle.Secondary,
    absent: ButtonStyle.Danger,
  };

  return new ButtonBuilder()
    .setCustomId(`vote:${voteId}:${choice}`)
    .setLabel(CHOICE_LABELS[choice])
    .setStyle(styleMap[choice])
    .setDisabled(disabled);
}

function buildDetailsButton(voteId) {
  return new ButtonBuilder()
    .setCustomId(`vote:${voteId}:details`)
    .setLabel('Xem chi tiết')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(false);
}

function buildVoteButtons(voteId, disabled) {
  return new ActionRowBuilder().addComponents(
    buildChoiceButton(voteId, 'join', disabled),
    buildChoiceButton(voteId, 'reserve', disabled),
    buildChoiceButton(voteId, 'absent', disabled),
    buildDetailsButton(voteId),
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

function buildOverviewEmbed(vote, summary) {
  return new EmbedBuilder()
    .setColor(getStatusColor(vote.status))
    .setTitle(`📋 Chi tiết vote #${vote.id}`)
    .addFields(
      { name: 'Đối thủ', value: vote.title, inline: false },
      { name: 'Thời gian', value: vote.event_time, inline: true },
      { name: 'Trạng thái', value: getStatusLabel(vote.status), inline: true },
      { name: 'Tổng đã phản hồi', value: String(summary.totalCount), inline: true },
      { name: 'Tham Gia', value: String(summary.joinCount), inline: true },
      { name: 'Dự Bị', value: String(summary.reserveCount), inline: true },
      { name: 'Không Tham Gia', value: String(summary.absentCount), inline: true },
    )
    .setFooter({ text: `Cập nhật gần nhất: ${formatFooterTimestamp(vote.updated_at)}` });
}

function buildOverviewComponents(voteId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`vote-detail:${voteId}:join-overview`)
        .setLabel('Xem Tham Gia')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`vote-detail:${voteId}:reserve:1`)
        .setLabel('Xem Dự Bị')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`vote-detail:${voteId}:absent:1`)
        .setLabel('Xem Không TG')
        .setStyle(ButtonStyle.Danger),
    ),
  ];
}

function buildVoteDetailsPayload(vote, summary) {
  return {
    embeds: [buildOverviewEmbed(vote, summary)],
    components: buildOverviewComponents(vote.id),
    ephemeral: true,
  };
}

function buildJoinOverviewEmbed(vote, details) {
  const lines = details.joinGroups.length > 0
    ? details.joinGroups.map((group) => `${formatMonPhaiWithEmoji(group.monPhai)} (${group.count})`).join('\n')
    : 'Chưa có người vote Tham Gia.';

  return new EmbedBuilder()
    .setColor(getStatusColor(vote.status))
    .setTitle(`✅ Tham Gia theo môn phái - Vote #${vote.id}`)
    .setDescription(lines)
    .setFooter({ text: `Đối thủ: ${vote.title}` });
}

function buildJoinOverviewComponents(voteId, details) {
  const select = new StringSelectMenuBuilder()
    .setCustomId(`vote-detail:${voteId}:join-sect-select`)
    .setPlaceholder('Chọn môn phái');

  for (const group of details.joinGroups) {
    const key = getMonPhaiKey(group.monPhai);
    if (!key) {
      continue;
    }

    select.addOptions({
      label: `${group.monPhai} (${group.count})`,
      value: `vote-detail:${voteId}:join-sect:${key}:1`,
    });
  }

  const components = [];
  if (details.joinGroups.length > 0) {
    components.push(new ActionRowBuilder().addComponents(select));
  }

  components.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`vote-detail:${voteId}:overview`)
        .setLabel('⬅ Quay lại')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return components;
}

function buildJoinOverviewPayload(vote, details) {
  return {
    embeds: [buildJoinOverviewEmbed(vote, details)],
    components: buildJoinOverviewComponents(vote.id, details),
    ephemeral: true,
  };
}

function paginate(items, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    page: safePage,
    totalPages,
    items: items.slice(start, start + pageSize),
  };
}

function buildPagedListText(items) {
  if (items.length === 0) {
    return 'Chưa có';
  }

  return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
}

function buildPaginationButton(customId, label, disabled) {
  return new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disabled);
}

function buildJoinSectPayload(vote, group, page) {
  const pagination = paginate(group.names, page, DETAIL_PAGE_SIZE_JOIN);
  const embed = new EmbedBuilder()
    .setColor(getStatusColor(vote.status))
    .setTitle(`✅ Tham Gia - ${formatMonPhaiWithEmoji(group.monPhai)}`)
    .setDescription(buildPagedListText(pagination.items))
    .setFooter({ text: `Trang ${pagination.page}/${pagination.totalPages} • ${group.count} người` });

  const sectKey = getMonPhaiKey(group.monPhai);
  const prevPage = Math.max(1, pagination.page - 1);
  const nextPage = Math.min(pagination.totalPages, pagination.page + 1);
  const components = [
    new ActionRowBuilder().addComponents(
      buildPaginationButton(
        `vote-detail:${vote.id}:join-sect:${sectKey}:${prevPage}:prev`,
        '⬅ Trước',
        pagination.page <= 1,
      ),
      buildPaginationButton(
        `vote-detail:${vote.id}:join-sect:${sectKey}:${nextPage}:next`,
        'Sau ➡',
        pagination.page >= pagination.totalPages,
      ),
      new ButtonBuilder()
        .setCustomId(`vote-detail:${vote.id}:join-overview`)
        .setLabel('⬅ Về danh sách phái')
        .setStyle(ButtonStyle.Primary),
    ),
  ];

  return {
    embeds: [embed],
    components,
    ephemeral: true,
  };
}

function buildChoiceListPayload(vote, choiceLabel, choiceKey, names, page) {
  const pagination = paginate(names, page, DETAIL_PAGE_SIZE_OTHER);
  const embed = new EmbedBuilder()
    .setColor(getStatusColor(vote.status))
    .setTitle(`${choiceLabel} - Vote #${vote.id}`)
    .setDescription(buildPagedListText(pagination.items))
    .setFooter({ text: `Trang ${pagination.page}/${pagination.totalPages} • ${names.length} người` });

  const prevPage = Math.max(1, pagination.page - 1);
  const nextPage = Math.min(pagination.totalPages, pagination.page + 1);
  const components = [
    new ActionRowBuilder().addComponents(
      buildPaginationButton(
        `vote-detail:${vote.id}:${choiceKey}:${prevPage}:prev`,
        '⬅ Trước',
        pagination.page <= 1,
      ),
      buildPaginationButton(
        `vote-detail:${vote.id}:${choiceKey}:${nextPage}:next`,
        'Sau ➡',
        pagination.page >= pagination.totalPages,
      ),
      new ButtonBuilder()
        .setCustomId(`vote-detail:${vote.id}:overview`)
        .setLabel('⬅ Quay lại')
        .setStyle(ButtonStyle.Primary),
    ),
  ];

  return {
    embeds: [embed],
    components,
    ephemeral: true,
  };
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
  buildVoteDetailsPayload,
  buildJoinOverviewPayload,
  buildJoinSectPayload,
  buildChoiceListPayload,
  buildHistoryEmbed,
};
