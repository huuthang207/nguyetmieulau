const { SlashCommandBuilder } = require('discord.js');
const { isBotAdmin } = require('../utils/permissions');
const { buildVoteMessagePayload } = require('../services/vote-embed-service');

const data = new SlashCommandBuilder()
  .setName('vote-tao')
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
  );

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

module.exports = {
  data,
  execute,
};
