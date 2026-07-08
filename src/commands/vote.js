const { AttachmentBuilder, SlashCommandBuilder } = require('discord.js');
const { canViewAttendance, isBotAdmin } = require('../utils/permissions');
const { buildHistoryEmbed, buildVoteMessagePayload } = require('../services/vote-embed-service');
const { HISTORY_DEFAULT_LIMIT, HISTORY_MAX_LIMIT } = require('../services/vote-service');

const ADMIN_SUBCOMMANDS = new Set(['create', 'close', 'export']);
const MEMBER_SUBCOMMANDS = new Set(['view', 'history']);

const data = new SlashCommandBuilder()
  .setName('vote')
  .setDescription('Quản lý vote điểm danh Bang Chiến')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('create')
      .setDescription('Tạo vote điểm danh Bang Chiến mới')
      .addStringOption((option) =>
        option
          .setName('title')
          .setDescription('Tiêu đề của vote')
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName('event_time')
          .setDescription('Thời gian Bang Chiến (text tự do)')
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName('description')
          .setDescription('Mô tả bổ sung cho vote')
          .setRequired(false),
      )
      .addBooleanOption((option) =>
        option
          .setName('ping_member')
          .setDescription('Có ping role thành viên hay không')
          .setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('close')
      .setDescription('Đóng vote điểm danh hiện tại'),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('view')
      .setDescription('Xem vote hiện tại hoặc vote theo ID')
      .addIntegerOption((option) =>
        option
          .setName('vote_id')
          .setDescription('ID của vote cần xem')
          .setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('history')
      .setDescription('Xem lịch sử vote gần đây')
      .addIntegerOption((option) =>
        option
          .setName('limit')
          .setDescription(`Số lượng vote muốn xem (mặc định ${HISTORY_DEFAULT_LIMIT}, tối đa ${HISTORY_MAX_LIMIT})`)
          .setMinValue(1)
          .setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('export')
      .setDescription('Admin export dữ liệu attendance ra JSON')
      .addIntegerOption((option) =>
        option
          .setName('vote_id')
          .setDescription('ID của vote cần export, để trống sẽ dùng vote đang mở')
          .setRequired(false),
      ),
  );

async function ensureAdmin(interaction, settings) {
  if (isBotAdmin(interaction.member, settings)) {
    return true;
  }

  await interaction.reply({
    content: 'Bạn không có quyền quản trị bot.',
    ephemeral: true,
  });
  return false;
}

async function ensureCanView(interaction, settings) {
  if (canViewAttendance(interaction.member, settings)) {
    return true;
  }

  await interaction.reply({
    content: 'Bạn không có quyền xem dữ liệu điểm danh.',
    ephemeral: true,
  });
  return false;
}

async function handleCreate(interaction, context) {
  const { settingsService, voteService } = context.services;
  const config = await settingsService.validateGuildConfiguration(interaction.guild);
  if (!config.isValid) {
    await interaction.reply({
      content: settingsService.formatConfigurationIssues(config.issues),
      ephemeral: true,
    });
    return;
  }

  const existingVote = await voteService.getOpenVote(interaction.guildId);
  if (existingVote) {
    await interaction.reply({
      content: 'Hiện đã có một vote đang mở. Hãy đóng vote hiện tại trước khi tạo vote mới.',
      ephemeral: true,
    });
    return;
  }

  const title = interaction.options.getString('title', true).trim();
  const eventTime = interaction.options.getString('event_time', true).trim();
  const description = interaction.options.getString('description')?.trim() || null;
  const pingMember = interaction.options.getBoolean('ping_member') ?? false;

  const vote = await voteService.createVote({
    guildId: interaction.guildId,
    channelId: config.attendanceChannel.id,
    title,
    eventTime,
    description,
    createdBy: interaction.user.id,
  });

  const summary = await voteService.getVoteSummary(vote.id);

  try {
    const sentMessage = await config.attendanceChannel.send({
      content: pingMember ? `<@&${config.memberRole.id}>` : undefined,
      ...buildVoteMessagePayload(vote, summary),
      allowedMentions: pingMember ? { roles: [config.memberRole.id] } : undefined,
    });

    await voteService.updateVoteMessageId(vote.id, sentMessage.id);
  } catch (error) {
    await voteService.deleteVote(vote.id);
    throw error;
  }

  await interaction.reply({
    content: `Đã tạo vote mới trong ${config.attendanceChannel}.`,
    ephemeral: true,
  });
}

async function handleClose(interaction, context) {
  const { voteService } = context.services;
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

async function handleView(interaction, context) {
  const { voteService } = context.services;
  const voteId = interaction.options.getInteger('vote_id');
  const result = await voteService.resolveVoteForView(interaction.guildId, voteId);

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

async function handleHistory(interaction, context) {
  const { voteService } = context.services;
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

async function handleExport(interaction, context) {
  const { dataExchangeService } = context.services;
  const voteId = interaction.options.getInteger('vote_id');
  const payload = await dataExchangeService.buildAttendanceExport(interaction.guildId, voteId);

  if (!payload) {
    await interaction.reply({
      content: 'Không tìm thấy vote mục tiêu để xuất dữ liệu.',
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    content: `Đang export attendance cho vote #${payload.vote_id}.`,
    files: [new AttachmentBuilder(
      dataExchangeService.toJsonAttachment(`attendance-vote-${payload.vote_id}.json`, payload).attachment,
      { name: `attendance-vote-${payload.vote_id}.json` },
    )],
    ephemeral: true,
  });
}

async function execute(interaction, context) {
  const subcommand = interaction.options.getSubcommand();
  const settings = await context.services.settingsService.getSettings(interaction.guildId);

  if (ADMIN_SUBCOMMANDS.has(subcommand) && !(await ensureAdmin(interaction, settings))) {
    return;
  }

  if (MEMBER_SUBCOMMANDS.has(subcommand) && !(await ensureCanView(interaction, settings))) {
    return;
  }

  if (subcommand === 'create') {
    await handleCreate(interaction, context);
    return;
  }

  if (subcommand === 'close') {
    await handleClose(interaction, context);
    return;
  }

  if (subcommand === 'view') {
    await handleView(interaction, context);
    return;
  }

  if (subcommand === 'history') {
    await handleHistory(interaction, context);
    return;
  }

  if (subcommand === 'export') {
    await handleExport(interaction, context);
  }
}

module.exports = {
  data,
  execute,
};
