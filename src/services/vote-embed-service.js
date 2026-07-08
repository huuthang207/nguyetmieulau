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

const DETAIL_LIST_LABELS = {
  join: '✅ Tham Gia',
  reserve: '🟡 Dự Bị',
  absent: '❌ Không Tham Gia',
};

const EMPTY_FIELD = '​';
const WHITE_BULLET_EMOJI = '<a:whitebullet:1522802826395521124>';
const GREEN_ARROW_EMOJI = '<a:greenarrow:1522797903838449754>';
const VOTE_ITEM_EMOJI = GREEN_ARROW_EMOJI;
const DETAIL_PAGE_SIZE = 25;
const DETAIL_PAGE_SIZE_JOIN = DETAIL_PAGE_SIZE;
const DETAIL_PAGE_SIZE_OTHER = DETAIL_PAGE_SIZE;

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

function buildJoinMonPhaiBreakdownText(summary) {
  const breakdown = summary.joinMonPhaiBreakdown || [];
  if (breakdown.length === 0) {
    return null;
  }

  return breakdown
    .map((item) => `${formatMonPhaiWithEmoji(item.monPhai)}: ${item.count}`)
    .join('\n');
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

  const joinMonPhaiBreakdownText = buildJoinMonPhaiBreakdownText(summary);
  if (joinMonPhaiBreakdownText) {
    fields.push({
      name: 'Tham Gia theo môn phái',
      value: joinMonPhaiBreakdownText,
      inline: false,
    });
  }

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
        .setCustomId(`vote-detail:${voteId}:join:1`)
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
        .setCustomId(`vote-detail:${voteId}:join:1`)
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
    startIndex: start,
  };
}

function buildPagedListText(items, startIndex = 0) {
  if (items.length === 0) {
    return 'Chưa có';
  }

  return items.map((item, index) => `${startIndex + index + 1}. ${item}`).join('\n');
}

function buildPaginationButton(customId, label, disabled) {
  return new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disabled);
}

function buildJoinDetailPages(details) {
  const pages = [];
  const sectCount = details.joinGroups.length;

  details.joinGroups.forEach((group, groupIndex) => {
    const totalPages = Math.max(1, Math.ceil(group.names.length / DETAIL_PAGE_SIZE));

    for (let page = 1; page <= totalPages; page += 1) {
      const start = (page - 1) * DETAIL_PAGE_SIZE;
      pages.push({
        type: 'join',
        monPhai: group.monPhai,
        names: group.names.slice(start, start + DETAIL_PAGE_SIZE),
        startIndex: start,
        sectPage: page,
        sectTotalPages: totalPages,
        sectIndex: groupIndex + 1,
        sectCount,
        totalCount: group.names.length,
      });
    }
  });

  if (pages.length === 0) {
    pages.push({
      type: 'join',
      monPhai: null,
      names: [],
      startIndex: 0,
      sectPage: 1,
      sectTotalPages: 1,
      sectIndex: 0,
      sectCount: 0,
      totalCount: 0,
    });
  }

  return pages;
}

function buildChoiceDetailPages(names, type) {
  const totalPages = Math.max(1, Math.ceil(names.length / DETAIL_PAGE_SIZE));
  const pages = [];

  for (let page = 1; page <= totalPages; page += 1) {
    const start = (page - 1) * DETAIL_PAGE_SIZE;
    pages.push({
      type,
      names: names.slice(start, start + DETAIL_PAGE_SIZE),
      startIndex: start,
      page,
      totalPages,
      totalCount: names.length,
    });
  }

  return pages;
}

function getDetailPages(details, listType) {
  if (listType === 'join') {
    return buildJoinDetailPages(details);
  }

  if (listType === 'reserve') {
    return buildChoiceDetailPages(details.reserveNames, 'reserve');
  }

  return buildChoiceDetailPages(details.absentNames, 'absent');
}

function getSafeDetailPage(details, listType, page) {
  const pages = getDetailPages(details, listType);
  const safePage = Math.min(Math.max(page || 1, 1), pages.length);

  return {
    page: safePage,
    totalPages: pages.length,
    detailPage: pages[safePage - 1],
  };
}

function getListCount(details, listType) {
  if (listType === 'join') {
    return details.joinGroups.reduce((total, group) => total + group.count, 0);
  }

  if (listType === 'reserve') {
    return details.reserveNames.length;
  }

  return details.absentNames.length;
}

function buildDetailSelect(voteId, details, selectedType) {
  const select = new StringSelectMenuBuilder()
    .setCustomId(`vote-detail:${voteId}:list-select`)
    .setPlaceholder('Chọn danh sách cần xem')
    .addOptions(
      {
        label: `Tham Gia (${getListCount(details, 'join')})`,
        value: `vote-detail:${voteId}:join:1`,
        emoji: '✅',
        default: selectedType === 'join',
      },
      {
        label: `Dự Bị (${getListCount(details, 'reserve')})`,
        value: `vote-detail:${voteId}:reserve:1`,
        emoji: '🟡',
        default: selectedType === 'reserve',
      },
      {
        label: `Không Tham Gia (${getListCount(details, 'absent')})`,
        value: `vote-detail:${voteId}:absent:1`,
        emoji: '❌',
        default: selectedType === 'absent',
      },
    );

  return new ActionRowBuilder().addComponents(select);
}

function buildDetailPagination(voteId, listType, currentPage, totalPages) {
  const prevPage = Math.max(1, currentPage - 1);
  const nextPage = Math.min(totalPages, currentPage + 1);

  return new ActionRowBuilder().addComponents(
    buildPaginationButton(
      `vote-detail:${voteId}:${listType}:${prevPage}:prev`,
      '⬅ Trước',
      currentPage <= 1,
    ),
    buildPaginationButton(
      `vote-detail:${voteId}:${listType}:${nextPage}:next`,
      'Sau ➡',
      currentPage >= totalPages,
    ),
  );
}

function buildJoinDetailEmbed(vote, detailPage) {
  const title = detailPage.monPhai
    ? `✅ Tham Gia - ${formatMonPhaiWithEmoji(detailPage.monPhai)}`
    : `✅ Tham Gia - Vote #${vote.id}`;
  const description = detailPage.names.length > 0
    ? buildPagedListText(detailPage.names, detailPage.startIndex)
    : 'Chưa có người vote Tham Gia.';
  const footer = detailPage.monPhai
    ? `Môn phái ${detailPage.sectIndex}/${detailPage.sectCount} • Trang ${detailPage.sectPage}/${detailPage.sectTotalPages} • ${detailPage.totalCount} người`
    : '0 người';

  return new EmbedBuilder()
    .setColor(getStatusColor(vote.status))
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: footer });
}

function buildOtherDetailEmbed(vote, listType, detailPage) {
  const description = detailPage.names.length > 0
    ? buildPagedListText(detailPage.names, detailPage.startIndex)
    : `Chưa có người vote ${CHOICE_LABELS[listType]}.`;

  return new EmbedBuilder()
    .setColor(getStatusColor(vote.status))
    .setTitle(`${DETAIL_LIST_LABELS[listType]} - Vote #${vote.id}`)
    .setDescription(description)
    .setFooter({ text: `Trang ${detailPage.page}/${detailPage.totalPages} • ${detailPage.totalCount} người` });
}

function buildVoteDetailListPayload(vote, details, listType = 'join', page = 1) {
  const safeListType = ['join', 'reserve', 'absent'].includes(listType) ? listType : 'join';
  const pageResult = getSafeDetailPage(details, safeListType, page);
  const embed = safeListType === 'join'
    ? buildJoinDetailEmbed(vote, pageResult.detailPage)
    : buildOtherDetailEmbed(vote, safeListType, pageResult.detailPage);

  return {
    embeds: [embed],
    components: [
      buildDetailSelect(vote.id, details, safeListType),
      buildDetailPagination(vote.id, safeListType, pageResult.page, pageResult.totalPages),
    ],
    ephemeral: true,
  };
}

function buildJoinSectPayload(vote, group, page) {
  const pagination = paginate(group.names, page, DETAIL_PAGE_SIZE_JOIN);
  const embed = new EmbedBuilder()
    .setColor(getStatusColor(vote.status))
    .setTitle(`✅ Tham Gia - ${formatMonPhaiWithEmoji(group.monPhai)}`)
    .setDescription(buildPagedListText(pagination.items, pagination.startIndex))
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
        .setCustomId(`vote-detail:${vote.id}:join:1`)
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
    .setDescription(buildPagedListText(pagination.items, pagination.startIndex))
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
        .setCustomId(`vote-detail:${vote.id}:join:1`)
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
  DETAIL_PAGE_SIZE,
  buildVoteEmbed,
  buildVoteButtons,
  buildVoteMessagePayload,
  buildVoteDetailsPayload,
  buildVoteDetailListPayload,
  buildJoinOverviewPayload,
  buildJoinSectPayload,
  buildChoiceListPayload,
  buildHistoryEmbed,
};
