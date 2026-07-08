const { canVote, canViewAttendance } = require('../utils/permissions');
const { getMonPhaiFromKey } = require('../constants/mon-phai');
const {
  CHOICE_LABELS,
  buildVoteMessagePayload,
  buildVoteDetailsPayload,
  buildVoteDetailListPayload,
  buildJoinOverviewPayload,
  buildJoinSectPayload,
  buildChoiceListPayload,
} = require('../services/vote-embed-service');

function parseVoteChoiceButton(customId) {
  const match = /^vote:(\d+):(join|reserve|absent|details)$/.exec(customId);
  if (!match) {
    return null;
  }

  return {
    voteId: Number(match[1]),
    action: match[2],
  };
}

function parseVoteDetailRoute(route) {
  let match = /^vote-detail:(\d+):overview$/.exec(route);
  if (match) {
    return {
      voteId: Number(match[1]),
      action: 'overview',
    };
  }

  match = /^vote-detail:(\d+):join-overview$/.exec(route);
  if (match) {
    return {
      voteId: Number(match[1]),
      action: 'join-overview',
    };
  }

  match = /^vote-detail:(\d+):(join|reserve|absent):(\d+)(?::(prev|next))?$/.exec(route);
  if (match) {
    return {
      voteId: Number(match[1]),
      action: 'detail-list',
      listType: match[2],
      page: Number(match[3]),
    };
  }

  match = /^vote-detail:(\d+):join-sect:([a-z-]+):(\d+)(?::(prev|next))?$/.exec(route);
  if (match) {
    return {
      voteId: Number(match[1]),
      action: 'join-sect',
      sectKey: match[2],
      page: Number(match[3]),
    };
  }

  return null;
}

async function getVoteDetailResult(context, guildId, voteId) {
  return context.services.voteService.getVoteDetailsForView(guildId, voteId);
}

async function ensureCanViewAttendance(interaction, context) {
  const settings = await context.services.settingsService.getSettings(interaction.guildId);

  if (!canViewAttendance(interaction.member, settings)) {
    const payload = {
      content: 'Bạn không có quyền xem dữ liệu điểm danh.',
      ephemeral: true,
    };

    if (typeof interaction.reply === 'function') {
      await interaction.reply(payload);
    } else if (typeof interaction.update === 'function') {
      await interaction.update({ content: payload.content, embeds: [], components: [] });
    }

    return false;
  }

  return true;
}

function buildJoinSectView(result, sectKey, page) {
  const monPhai = getMonPhaiFromKey(sectKey);
  if (!monPhai) {
    return null;
  }

  const group = result.details.joinGroups.find((item) => item.monPhai === monPhai);
  if (!group) {
    return null;
  }

  return buildJoinSectPayload(result.vote, group, page);
}

function buildChoiceDetailView(result, action, page) {
  if (action === 'reserve') {
    return buildChoiceListPayload(result.vote, '🟡 Dự Bị', 'reserve', result.details.reserveNames, page);
  }

  if (action === 'absent') {
    return buildChoiceListPayload(result.vote, '❌ Không Tham Gia', 'absent', result.details.absentNames, page);
  }

  return null;
}

async function respondWithDetailView(interaction, payload, isUpdate = false) {
  if (isUpdate && typeof interaction.update === 'function') {
    const { ephemeral, ...updatePayload } = payload;
    await interaction.update(updatePayload);
    return true;
  }

  if (typeof interaction.reply === 'function') {
    await interaction.reply({ ...payload, ephemeral: true });
    return true;
  }

  return false;
}

async function handleVoteDetailsButton(interaction, context, payload) {
  if (!(await ensureCanViewAttendance(interaction, context))) {
    return true;
  }

  const result = await getVoteDetailResult(context, interaction.guildId, payload.voteId);
  if (!result) {
    await interaction.reply({
      content: 'Không tìm thấy vote tương ứng.',
      ephemeral: true,
    });
    return true;
  }

  await interaction.reply(buildVoteDetailListPayload(result.vote, result.details, 'join', 1));
  return true;
}

async function handleVoteChoiceButton(interaction, context, payload) {
  const { settingsService, voteService, profileService } = context.services;
  const settings = await settingsService.getSettings(interaction.guildId);

  if (!canVote(interaction.member, settings)) {
    await interaction.reply({
      content: 'Bạn không có quyền tham gia điểm danh này.',
      ephemeral: true,
    });
    return true;
  }

  const vote = await voteService.getVoteByIdForGuild(interaction.guildId, payload.voteId);
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

  const profile = await profileService.getProfile(interaction.guildId, interaction.user.id);
  if (!profile) {
    await interaction.reply({
      content: 'Bạn chưa có thông tin nhân vật. Hãy dùng `/profile set` để cập nhật `ingame_name` và `mon_phai` trước khi vote.',
      ephemeral: true,
    });
    return true;
  }

  const result = await voteService.saveMemberChoice(vote.id, interaction.user.id, payload.action, profile);
  await interaction.message.edit(buildVoteMessagePayload(result.vote, result.summary));

  let content = `Bạn đã chọn: ${CHOICE_LABELS[payload.action]}`;
  if (!result.created && result.changed) {
    content = `Đã cập nhật lựa chọn của bạn thành: ${CHOICE_LABELS[payload.action]}`;
  } else if (!result.changed) {
    content = `Bạn đã chọn trạng thái này rồi: ${CHOICE_LABELS[payload.action]}`;
  }

  await interaction.reply({
    content,
    ephemeral: true,
  });

  return true;
}

async function handleVoteDetailInteraction(interaction, context, route, isUpdate = false) {
  const payload = parseVoteDetailRoute(route);
  if (!payload) {
    return false;
  }

  if (!(await ensureCanViewAttendance(interaction, context))) {
    return true;
  }

  const result = await getVoteDetailResult(context, interaction.guildId, payload.voteId);
  if (!result) {
    const errorPayload = {
      content: 'Không tìm thấy vote tương ứng.',
      embeds: [],
      components: [],
      ephemeral: true,
    };
    await respondWithDetailView(interaction, errorPayload, isUpdate);
    return true;
  }

  if (payload.action === 'overview') {
    await respondWithDetailView(interaction, buildVoteDetailsPayload(result.vote, result.summary), isUpdate);
    return true;
  }

  if (payload.action === 'detail-list') {
    await respondWithDetailView(
      interaction,
      buildVoteDetailListPayload(result.vote, result.details, payload.listType, payload.page),
      isUpdate,
    );
    return true;
  }

  if (payload.action === 'join-overview') {
    await respondWithDetailView(interaction, buildJoinOverviewPayload(result.vote, result.details), isUpdate);
    return true;
  }

  if (payload.action === 'join-sect') {
    const detailPayload = buildJoinSectView(result, payload.sectKey, payload.page);
    if (!detailPayload) {
      await respondWithDetailView(interaction, {
        content: 'Không tìm thấy môn phái tương ứng trong danh sách Tham Gia.',
        embeds: [],
        components: [],
        ephemeral: true,
      }, isUpdate);
      return true;
    }

    await respondWithDetailView(interaction, detailPayload, isUpdate);
    return true;
  }

  if (payload.action === 'reserve' || payload.action === 'absent') {
    await respondWithDetailView(interaction, buildChoiceDetailView(result, payload.action, payload.page), isUpdate);
    return true;
  }

  return false;
}

async function handleVoteButton(interaction, context) {
  const payload = parseVoteChoiceButton(interaction.customId);
  if (!payload) {
    return handleVoteDetailInteraction(interaction, context, interaction.customId, true);
  }

  if (payload.action === 'details') {
    return handleVoteDetailsButton(interaction, context, payload);
  }

  return handleVoteChoiceButton(interaction, context, payload);
}

async function handleVoteDetailSelect(interaction, context) {
  const route = interaction.values?.[0];
  if (!route) {
    return false;
  }

  return handleVoteDetailInteraction(interaction, context, route, true);
}

module.exports = {
  handleVoteButton,
  handleVoteDetailSelect,
};
