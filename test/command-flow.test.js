const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createDatabase } = require('../src/db/database');
const { createRepositories } = require('../src/db/repositories');
const { createSettingsService } = require('../src/services/settings-service');
const { createVoteService } = require('../src/services/vote-service');
const voteCreateCommand = require('../src/commands/vote-tao');
const voteCloseCommand = require('../src/commands/vote-dong');
const { handleVoteButton } = require('../src/interactions/vote-buttons');

function createTempDatabasePath() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'attendance-bot-command-test-'));
  return path.join(directory, 'test.sqlite');
}

function createRole(id) {
  return {
    id,
    toString() {
      return `<@&${id}>`;
    },
  };
}

function createTextChannel(id = 'attendance-channel') {
  const sentMessages = new Map();
  let sequence = 1;

  return {
    id,
    sentMessages,
    toString() {
      return `<#${id}>`;
    },
    isTextBased() {
      return true;
    },
    async send(payload) {
      const message = {
        id: `msg-${sequence++}`,
        payloads: [payload],
        async edit(nextPayload) {
          this.payloads.push(nextPayload);
          this.lastPayload = nextPayload;
        },
      };

      sentMessages.set(message.id, message);
      return message;
    },
    messages: {
      async fetch(messageId) {
        return sentMessages.get(messageId) || null;
      },
    },
  };
}

function createGuild({ roles, channels }) {
  return {
    id: 'guild-command-test',
    roles: {
      cache: {
        get(roleId) {
          return roles[roleId] || null;
        },
      },
      fetch(roleId) {
        return Promise.resolve(roles[roleId] || null);
      },
    },
    channels: {
      cache: {
        get(channelId) {
          return channels[channelId] || null;
        },
      },
      fetch(channelId) {
        return Promise.resolve(channels[channelId] || null);
      },
    },
  };
}

function createMember({ isAdministrator = false, roleIds = [] } = {}) {
  const roles = new Map(roleIds.map((roleId) => [roleId, { id: roleId }]));

  return {
    permissions: {
      has() {
        return isAdministrator;
      },
    },
    roles: {
      cache: roles,
    },
  };
}

function createChatInputInteraction({ guild, member, userId = 'user-1', options = {} }) {
  const replies = [];

  return {
    guildId: guild.id,
    guild,
    member,
    user: { id: userId },
    replies,
    options: {
      getString(name) {
        return options[name] ?? null;
      },
      getBoolean(name) {
        return options[name] ?? null;
      },
      getInteger(name) {
        return options[name] ?? null;
      },
      getSubcommand() {
        return options.subcommand;
      },
      getChannel(name) {
        return options[name] ?? null;
      },
      getRole(name) {
        return options[name] ?? null;
      },
    },
    async reply(payload) {
      replies.push(payload);
    },
  };
}

function createButtonInteraction({ guild, member, voteId, choice, message, userId = 'member-1' }) {
  const replies = [];

  return {
    guildId: guild.id,
    guild,
    member,
    message,
    customId: `vote:${voteId}:${choice}`,
    user: { id: userId },
    replies,
    async reply(payload) {
      replies.push(payload);
    },
  };
}

function createContext() {
  const db = createDatabase(createTempDatabasePath());
  const repositories = createRepositories(db);
  const services = {
    settingsService: createSettingsService(repositories),
    voteService: createVoteService(repositories),
  };

  return { db, repositories, services };
}

test('vote-tao creates a public vote message and stores message id', async () => {
  const context = createContext();
  const memberRole = createRole('member-role');
  const adminRole = createRole('admin-role');
  const attendanceChannel = createTextChannel();
  const guild = createGuild({
    roles: {
      'member-role': memberRole,
      'admin-role': adminRole,
    },
    channels: {
      'attendance-channel': attendanceChannel,
    },
  });

  context.services.settingsService.setMemberRole(guild.id, memberRole.id);
  context.services.settingsService.setAdminRole(guild.id, adminRole.id);
  context.services.settingsService.setAttendanceChannel(guild.id, attendanceChannel.id);

  const interaction = createChatInputInteraction({
    guild,
    member: createMember({ isAdministrator: true }),
    userId: 'admin-user',
    options: {
      title: 'Bang Chiến tối nay',
      event_time: '20:00 05/07/2026',
      description: null,
      ping_member: false,
    },
  });

  await voteCreateCommand.execute(interaction, context);

  assert.equal(interaction.replies.length, 1);
  assert.match(interaction.replies[0].content, /Đã tạo vote mới/);

  const openVote = context.services.voteService.getOpenVote(guild.id);
  assert.ok(openVote);
  assert.equal(openVote.message_id, 'msg-1');
  assert.equal(attendanceChannel.sentMessages.size, 1);

  const sentMessage = attendanceChannel.sentMessages.get('msg-1');
  assert.equal(sentMessage.payloads[0].content, undefined);

  context.db.close();
});

test('vote-tao can mention member role when ping_member is enabled', async () => {
  const context = createContext();
  const memberRole = createRole('member-role');
  const adminRole = createRole('admin-role');
  const attendanceChannel = createTextChannel();
  const guild = createGuild({
    roles: {
      'member-role': memberRole,
      'admin-role': adminRole,
    },
    channels: {
      'attendance-channel': attendanceChannel,
    },
  });

  context.services.settingsService.setMemberRole(guild.id, memberRole.id);
  context.services.settingsService.setAdminRole(guild.id, adminRole.id);
  context.services.settingsService.setAttendanceChannel(guild.id, attendanceChannel.id);

  const interaction = createChatInputInteraction({
    guild,
    member: createMember({ isAdministrator: true }),
    options: {
      title: 'Bang Chiến cuối tuần',
      event_time: '21:00 12/07/2026',
      description: 'Ping toàn bộ thành viên',
      ping_member: true,
    },
  });

  await voteCreateCommand.execute(interaction, context);

  const sentMessage = attendanceChannel.sentMessages.get('msg-1');
  assert.equal(sentMessage.payloads[0].content, `<@&${memberRole.id}>`);
  assert.deepEqual(sentMessage.payloads[0].allowedMentions, { roles: [memberRole.id] });

  context.db.close();
});

test('vote-tao blocks creating a second open vote', async () => {
  const context = createContext();
  const guild = createGuild({ roles: {}, channels: {} });

  context.repositories.createVote({
    guildId: guild.id,
    channelId: 'attendance-channel',
    title: 'Vote đang mở',
    eventTime: 'slot-1',
    description: null,
    createdBy: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const interaction = createChatInputInteraction({
    guild,
    member: createMember({ isAdministrator: true }),
    options: {
      title: 'Vote mới',
      event_time: 'slot-2',
      description: null,
      ping_member: false,
    },
  });

  const originalValidate = context.services.settingsService.validateGuildConfiguration;
  context.services.settingsService.validateGuildConfiguration = async () => ({
    isValid: true,
    attendanceChannel: createTextChannel(),
    memberRole: createRole('member-role'),
    issues: [],
  });

  await voteCreateCommand.execute(interaction, context);

  assert.equal(interaction.replies.length, 1);
  assert.match(interaction.replies[0].content, /đã có một vote đang mở/);

  context.services.settingsService.validateGuildConfiguration = originalValidate;
  context.db.close();
});

test('vote-dong reports when there is no active vote', async () => {
  const context = createContext();
  const interaction = createChatInputInteraction({
    guild: createGuild({ roles: {}, channels: {} }),
    member: createMember({ isAdministrator: true }),
  });

  await voteCloseCommand.execute(interaction, context);

  assert.equal(interaction.replies.length, 1);
  assert.match(interaction.replies[0].content, /Hiện không có vote nào đang mở/);

  context.db.close();
});

test('vote button records member choice and updates current message payload', async () => {
  const context = createContext();
  const guild = createGuild({ roles: {}, channels: {} });

  context.services.settingsService.setMemberRole(guild.id, 'member-role');
  const vote = context.services.voteService.createVote({
    guildId: guild.id,
    channelId: 'attendance-channel',
    title: 'Vote button',
    eventTime: 'slot-button',
    description: null,
    createdBy: 'admin',
  });

  const message = {
    edits: [],
    async edit(payload) {
      this.edits.push(payload);
    },
  };

  const interaction = createButtonInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    voteId: vote.id,
    choice: 'join',
    message,
  });

  const handled = await handleVoteButton(interaction, context);

  assert.equal(handled, true);
  assert.equal(interaction.replies.length, 1);
  assert.match(interaction.replies[0].content, /Bạn đã chọn: Tham Gia/);
  assert.equal(message.edits.length, 1);
  assert.equal(context.repositories.getVoteSummary(vote.id).joinCount, 1);

  context.db.close();
});

test('vote button rejects users without member role and closed votes', async () => {
  const context = createContext();
  const guild = createGuild({ roles: {}, channels: {} });

  context.services.settingsService.setMemberRole(guild.id, 'member-role');
  const vote = context.services.voteService.createVote({
    guildId: guild.id,
    channelId: 'attendance-channel',
    title: 'Vote button',
    eventTime: 'slot-button',
    description: null,
    createdBy: 'admin',
  });
  context.services.voteService.closeVote(vote.id);

  const unauthorizedInteraction = createButtonInteraction({
    guild,
    member: createMember(),
    voteId: vote.id,
    choice: 'join',
    message: { async edit() {} },
  });

  const unauthorizedHandled = await handleVoteButton(unauthorizedInteraction, context);
  assert.equal(unauthorizedHandled, true);
  assert.match(unauthorizedInteraction.replies[0].content, /không có quyền tham gia điểm danh này/);

  const closedInteraction = createButtonInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    voteId: vote.id,
    choice: 'join',
    message: { async edit() {} },
  });

  const closedHandled = await handleVoteButton(closedInteraction, context);
  assert.equal(closedHandled, true);
  assert.match(closedInteraction.replies[0].content, /Vote này đã đóng/);

  context.db.close();
});
