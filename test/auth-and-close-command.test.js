const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createDatabase } = require('../src/db/database');
const { createRepositories } = require('../src/db/repositories');
const { createSettingsService } = require('../src/services/settings-service');
const { createVoteService } = require('../src/services/vote-service');
const { createProfileService } = require('../src/services/profile-service');
const { createDataExchangeService } = require('../src/services/data-exchange-service');
const configCommand = require('../src/commands/config');
const voteCommand = require('../src/commands/vote');

function createTempDatabasePath() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'attendance-bot-auth-test-'));
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

function createGuild({ roles = {}, channels = {} } = {}) {
  return {
    id: 'guild-auth-test',
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
  return {
    permissions: {
      has() {
        return isAdministrator;
      },
    },
    roles: {
      cache: new Map(roleIds.map((roleId) => [roleId, { id: roleId }])),
    },
  };
}

function createInteraction({ guild, member, options = {}, userId = 'user-1' }) {
  const replies = [];

  return {
    guildId: guild.id,
    guild,
    member,
    user: { id: userId },
    replies,
    options: {
      getSubcommand() {
        return options.subcommand;
      },
      getChannel(name) {
        return options[name] ?? null;
      },
      getRole(name) {
        return options[name] ?? null;
      },
      getInteger(name) {
        return options[name] ?? null;
      },
      getString(name) {
        return options[name] ?? null;
      },
      getUser(name) {
        return options[name] ?? null;
      },
      getAttachment(name) {
        return options[name] ?? null;
      },
    },
    async reply(payload) {
      replies.push(payload);
    },
  };
}

async function createContext() {
  const db = await createDatabase({ databaseClient: 'sqlite', databasePath: createTempDatabasePath() });
  const repositories = createRepositories(db);
  const profileService = createProfileService(repositories);
  const voteService = createVoteService(repositories);
  const services = {
    settingsService: createSettingsService(repositories),
    profileService,
    voteService,
    dataExchangeService: createDataExchangeService({
      repositories,
      profileService,
      voteService,
    }),
  };

  return { db, repositories, services };
}

test('config rejects unauthorized users', async () => {
  const context = await createContext();
  const guild = createGuild({ channels: { 'attendance-channel': createTextChannel() } });
  const interaction = createInteraction({
    guild,
    member: createMember(),
    options: {
      subcommand: 'channel',
      channel: guild.channels.cache.get('attendance-channel'),
    },
  });

  await configCommand.execute(interaction, context);

  assert.equal(interaction.replies.length, 1);
  assert.match(interaction.replies[0].content, /không có quyền quản trị bot/);
  await context.db.close();
});

test('vote view and vote history reject unauthorized users', async () => {
  const context = await createContext();
  const guild = createGuild();

  const viewInteraction = createInteraction({ guild, member: createMember(), options: { subcommand: 'view' } });
  await voteCommand.execute(viewInteraction, context);
  assert.match(viewInteraction.replies[0].content, /không có quyền xem dữ liệu điểm danh/);

  const historyInteraction = createInteraction({ guild, member: createMember(), options: { subcommand: 'history' } });
  await voteCommand.execute(historyInteraction, context);
  assert.match(historyInteraction.replies[0].content, /không có quyền xem dữ liệu điểm danh/);

  await context.db.close();
});

test('vote close disables vote buttons but keeps details button enabled for the closed vote', async () => {
  const context = await createContext();
  const adminRole = createRole('admin-role');
  const attendanceChannel = createTextChannel();
  const guild = createGuild({
    roles: { 'admin-role': adminRole },
    channels: { 'attendance-channel': attendanceChannel },
  });

  await context.services.settingsService.setAdminRole(guild.id, adminRole.id);
  const vote = await context.repositories.createVote({
    guildId: guild.id,
    channelId: attendanceChannel.id,
    title: 'Vote cần đóng',
    eventTime: 'slot-close',
    description: null,
    createdBy: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const message = await attendanceChannel.send({ content: 'vote' });
  await context.repositories.updateVoteMessageId(vote.id, message.id);

  const interaction = createInteraction({
    guild,
    member: createMember({ roleIds: ['admin-role'] }),
    options: { subcommand: 'close' },
  });

  await voteCommand.execute(interaction, context);

  assert.equal(interaction.replies.length, 1);
  assert.match(interaction.replies[0].content, /Đã đóng vote hiện tại/);
  assert.ok(message.lastPayload);
  assert.equal(message.lastPayload.components[0].components.length, 4);

  const [joinButton, reserveButton, absentButton, detailsButton] = message.lastPayload.components[0].components;
  assert.equal(joinButton.data.disabled, true);
  assert.equal(reserveButton.data.disabled, true);
  assert.equal(absentButton.data.disabled, true);
  assert.equal(detailsButton.data.disabled, false);
  assert.equal(await context.services.voteService.getOpenVote(guild.id), null);

  await context.db.close();
});
