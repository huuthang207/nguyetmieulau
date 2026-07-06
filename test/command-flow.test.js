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
const voteCreateCommand = require('../src/commands/vote-tao');
const voteCloseCommand = require('../src/commands/vote-dong');
const profileCommand = require('../src/commands/profile');
const { handleVoteButton, handleVoteDetailSelect } = require('../src/interactions/vote-buttons');

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

function createButtonInteraction({ guild, member, voteId, choice, message, userId = 'member-1' }) {
  const replies = [];
  const updates = [];

  return {
    guildId: guild.id,
    guild,
    member,
    message,
    customId: `vote:${voteId}:${choice}`,
    user: { id: userId },
    replies,
    updates,
    async reply(payload) {
      replies.push(payload);
    },
    async update(payload) {
      updates.push(payload);
    },
  };
}

function createSelectInteraction({ guild, member, value, userId = 'member-1' }) {
  const replies = [];
  const updates = [];

  return {
    guildId: guild.id,
    guild,
    member,
    user: { id: userId },
    values: [value],
    replies,
    updates,
    async reply(payload) {
      replies.push(payload);
    },
    async update(payload) {
      updates.push(payload);
    },
  };
}

function createContext() {
  const db = createDatabase(createTempDatabasePath());
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
  context.services.profileService.saveProfile({
    guildId: guild.id,
    userId: 'member-1',
    ingameName: 'Thang207',
    monPhai: 'Tố Vấn',
  });

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
  assert.equal(context.repositories.getVoteResponse(vote.id, 'member-1').snapshot_ingame_name, 'Thang207');
  assert.equal(context.repositories.getVoteResponse(vote.id, 'member-1').snapshot_mon_phai, 'Tố Vấn');

  context.db.close();
});

test('vote button blocks members who do not have a profile yet', async () => {
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

  const interaction = createButtonInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    voteId: vote.id,
    choice: 'join',
    message: { async edit() {} },
  });

  const handled = await handleVoteButton(interaction, context);

  assert.equal(handled, true);
  assert.match(interaction.replies[0].content, /\/profile set/);
  assert.equal(context.repositories.getVoteSummary(vote.id).joinCount, 0);

  context.db.close();
});

test('profile command can save and show the current member profile', async () => {
  const context = createContext();
  const guild = createGuild({ roles: {}, channels: {} });

  const setInteraction = createChatInputInteraction({
    guild,
    member: createMember(),
    userId: 'member-1',
    options: {
      subcommand: 'set',
      ingame_name: 'Aki',
      mon_phai: 'Thiết Y',
    },
  });

  await profileCommand.execute(setInteraction, context);
  assert.match(setInteraction.replies[0].content, /Đã lưu profile của bạn/);

  const viewInteraction = createChatInputInteraction({
    guild,
    member: createMember(),
    userId: 'member-1',
    options: {
      subcommand: 'xem',
    },
  });

  await profileCommand.execute(viewInteraction, context);
  assert.match(viewInteraction.replies[0].content, /Aki/);
  assert.match(viewInteraction.replies[0].content, /Thiết Y/);

  context.db.close();
});

test('profile command rejects duplicate ingame_name and allows admin set-member', async () => {
  const context = createContext();
  const guild = createGuild({ roles: { 'admin-role': createRole('admin-role') }, channels: {} });

  context.services.settingsService.setAdminRole(guild.id, 'admin-role');
  context.services.profileService.saveProfile({
    guildId: guild.id,
    userId: 'member-1',
    ingameName: 'TrungLap',
    monPhai: 'Tố Vấn',
  });

  const duplicateInteraction = createChatInputInteraction({
    guild,
    member: createMember(),
    userId: 'member-2',
    options: {
      subcommand: 'set',
      ingame_name: 'TrungLap',
      mon_phai: 'Thiết Y',
    },
  });

  await profileCommand.execute(duplicateInteraction, context);
  assert.match(duplicateInteraction.replies[0].content, /đã tồn tại/);

  const adminSetMemberInteraction = createChatInputInteraction({
    guild,
    member: createMember({ roleIds: ['admin-role'] }),
    userId: 'admin-user',
    options: {
      subcommand: 'set-member',
      member: { id: 'member-3' },
      ingame_name: 'NewName',
      mon_phai: 'Long Ngâm',
    },
  });

  await profileCommand.execute(adminSetMemberInteraction, context);
  assert.match(adminSetMemberInteraction.replies[0].content, /Đã cập nhật profile/);
  assert.equal(context.services.profileService.getProfile(guild.id, 'member-3').ingame_name, 'NewName');

  context.db.close();
});

test('profile export-attendance uses open vote by default', async () => {
  const context = createContext();
  const guild = createGuild({ roles: { 'admin-role': createRole('admin-role') }, channels: {} });

  context.services.settingsService.setAdminRole(guild.id, 'admin-role');
  context.services.profileService.saveProfile({
    guildId: guild.id,
    userId: 'member-1',
    ingameName: 'Exporter',
    monPhai: 'Thần Tương',
  });

  const vote = context.services.voteService.createVote({
    guildId: guild.id,
    channelId: 'attendance-channel',
    title: 'Export vote',
    eventTime: 'slot-export',
    description: null,
    createdBy: 'admin',
  });
  context.services.voteService.saveMemberChoice(vote.id, 'member-1', 'join', context.services.profileService.getProfile(guild.id, 'member-1'));

  const exportInteraction = createChatInputInteraction({
    guild,
    member: createMember({ roleIds: ['admin-role'] }),
    userId: 'admin-user',
    options: {
      subcommand: 'export-attendance',
    },
  });

  await profileCommand.execute(exportInteraction, context);
  assert.match(exportInteraction.replies[0].content, /export attendance cho vote/);
  assert.equal(exportInteraction.replies[0].files.length, 1);

  context.db.close();
});

test('profile import-members rejects invalid payload type', async () => {
  const context = createContext();
  const guild = createGuild({ roles: { 'admin-role': createRole('admin-role') }, channels: {} });

  context.services.settingsService.setAdminRole(guild.id, 'admin-role');
  context.services.dataExchangeService.parseJsonAttachment = async () => ({
    type: 'attendance',
    guild_id: guild.id,
    items: [],
  });

  const importInteraction = createChatInputInteraction({
    guild,
    member: createMember({ roleIds: ['admin-role'] }),
    userId: 'admin-user',
    options: {
      subcommand: 'import-members',
      file: { url: 'https://example.invalid/file.json' },
    },
  });

  await profileCommand.execute(importInteraction, context);
  assert.match(importInteraction.replies[0].content, /member_profiles/);

  context.db.close();
});

test('profile import-members imports valid JSON payload', async () => {
  const context = createContext();
  const guild = createGuild({ roles: { 'admin-role': createRole('admin-role') }, channels: {} });

  context.services.settingsService.setAdminRole(guild.id, 'admin-role');
  context.services.dataExchangeService.parseJsonAttachment = async () => ({
    type: 'member_profiles',
    guild_id: guild.id,
    items: [
      {
        discord_user_id: 'member-9',
        ingame_name: 'Importer',
        mon_phai: 'Cửu Linh',
      },
    ],
  });

  const importInteraction = createChatInputInteraction({
    guild,
    member: createMember({ roleIds: ['admin-role'] }),
    userId: 'admin-user',
    options: {
      subcommand: 'import-members',
      file: { url: 'https://example.invalid/file.json' },
    },
  });

  await profileCommand.execute(importInteraction, context);
  assert.match(importInteraction.replies[0].content, /import thành công 1 member profile/);
  assert.equal(context.services.profileService.getProfile(guild.id, 'member-9').ingame_name, 'Importer');

  context.db.close();
});

test('profile export-members returns a JSON attachment', async () => {
  const context = createContext();
  const guild = createGuild({ roles: { 'admin-role': createRole('admin-role') }, channels: {} });

  context.services.settingsService.setAdminRole(guild.id, 'admin-role');
  context.services.profileService.saveProfile({
    guildId: guild.id,
    userId: 'member-1',
    ingameName: 'ExportProfile',
    monPhai: 'Huyết Hà',
  });

  const exportInteraction = createChatInputInteraction({
    guild,
    member: createMember({ roleIds: ['admin-role'] }),
    userId: 'admin-user',
    options: {
      subcommand: 'export-members',
    },
  });

  await profileCommand.execute(exportInteraction, context);
  assert.match(exportInteraction.replies[0].content, /Đang export 1 member profile/);
  assert.equal(exportInteraction.replies[0].files.length, 1);

  context.db.close();
});

test('non-admin cannot use profile admin subcommands', async () => {
  const context = createContext();
  const guild = createGuild({ roles: {}, channels: {} });

  const interaction = createChatInputInteraction({
    guild,
    member: createMember(),
    userId: 'member-1',
    options: {
      subcommand: 'export-members',
    },
  });

  await profileCommand.execute(interaction, context);
  assert.match(interaction.replies[0].content, /không có quyền quản trị bot/);

  context.db.close();
});

test('profile set rejects invalid mon phai', async () => {
  const context = createContext();
  const guild = createGuild({ roles: {}, channels: {} });

  const interaction = createChatInputInteraction({
    guild,
    member: createMember(),
    userId: 'member-1',
    options: {
      subcommand: 'set',
      ingame_name: 'BadClass',
      mon_phai: 'Sai Môn Phái',
    },
  });

  await profileCommand.execute(interaction, context);
  assert.match(interaction.replies[0].content, /mon_phai/);

  context.db.close();
});

test('profile export-attendance reports when no target vote exists', async () => {
  const context = createContext();
  const guild = createGuild({ roles: { 'admin-role': createRole('admin-role') }, channels: {} });

  context.services.settingsService.setAdminRole(guild.id, 'admin-role');

  const interaction = createChatInputInteraction({
    guild,
    member: createMember({ roleIds: ['admin-role'] }),
    userId: 'admin-user',
    options: {
      subcommand: 'export-attendance',
    },
  });

  await profileCommand.execute(interaction, context);
  assert.match(interaction.replies[0].content, /Không tìm thấy vote mục tiêu/);

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

test('details button shows overview first and does not edit the public message', async () => {
  const context = createContext();
  const guild = createGuild({ roles: { 'member-role': createRole('member-role') }, channels: {} });

  context.services.settingsService.setMemberRole(guild.id, 'member-role');
  context.services.profileService.saveProfile({ guildId: guild.id, userId: 'member-1', ingameName: 'Aki', monPhai: 'Tố Vấn' });
  context.services.profileService.saveProfile({ guildId: guild.id, userId: 'member-2', ingameName: 'Binh', monPhai: 'Tố Vấn' });
  context.services.profileService.saveProfile({ guildId: guild.id, userId: 'member-3', ingameName: 'Cuong', monPhai: 'Thiết Y' });
  context.services.profileService.saveProfile({ guildId: guild.id, userId: 'member-4', ingameName: 'Dung', monPhai: 'Long Ngâm' });
  context.services.profileService.saveProfile({ guildId: guild.id, userId: 'member-5', ingameName: 'Hieu', monPhai: 'Huyết Hà' });

  const vote = context.services.voteService.createVote({
    guildId: guild.id,
    channelId: 'attendance-channel',
    title: 'Vote details',
    eventTime: 'slot-details',
    description: null,
    createdBy: 'admin',
  });

  context.services.voteService.saveMemberChoice(vote.id, 'member-1', 'join', context.services.profileService.getProfile(guild.id, 'member-1'));
  context.services.voteService.saveMemberChoice(vote.id, 'member-2', 'join', context.services.profileService.getProfile(guild.id, 'member-2'));
  context.services.voteService.saveMemberChoice(vote.id, 'member-3', 'join', context.services.profileService.getProfile(guild.id, 'member-3'));
  context.services.voteService.saveMemberChoice(vote.id, 'member-4', 'reserve', context.services.profileService.getProfile(guild.id, 'member-4'));
  context.services.voteService.saveMemberChoice(vote.id, 'member-5', 'absent', context.services.profileService.getProfile(guild.id, 'member-5'));

  const message = { edits: [], async edit(payload) { this.edits.push(payload); } };
  const interaction = createButtonInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    voteId: vote.id,
    choice: 'details',
    message,
  });

  const handled = await handleVoteButton(interaction, context);

  assert.equal(handled, true);
  assert.equal(message.edits.length, 0);
  assert.equal(interaction.replies.length, 1);
  assert.equal(interaction.replies[0].ephemeral, true);
  assert.match(interaction.replies[0].embeds[0].data.title, /Chi tiết vote/);
  assert.equal(interaction.replies[0].components[0].components.length, 3);

  const overviewFields = interaction.replies[0].embeds[0].data.fields;
  const joinField = overviewFields.find((field) => field.name === 'Tham Gia');
  const reserveField = overviewFields.find((field) => field.name === 'Dự Bị');
  const absentField = overviewFields.find((field) => field.name === 'Không Tham Gia');

  assert.equal(joinField?.value, '3');
  assert.equal(reserveField?.value, '1');
  assert.equal(absentField?.value, '1');

  context.db.close();
});

test('details button allows viewing a closed vote and does not require profile', async () => {
  const context = createContext();
  const guild = createGuild({ roles: { 'member-role': createRole('member-role') }, channels: {} });

  context.services.settingsService.setMemberRole(guild.id, 'member-role');
  context.services.profileService.saveProfile({ guildId: guild.id, userId: 'member-2', ingameName: 'Joiner', monPhai: 'Tố Vấn' });

  const vote = context.services.voteService.createVote({
    guildId: guild.id,
    channelId: 'attendance-channel',
    title: 'Closed details',
    eventTime: 'slot-closed',
    description: null,
    createdBy: 'admin',
  });
  context.services.voteService.saveMemberChoice(vote.id, 'member-2', 'join', context.services.profileService.getProfile(guild.id, 'member-2'));
  context.services.voteService.closeVote(vote.id);

  const interaction = createButtonInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    voteId: vote.id,
    choice: 'details',
    message: { async edit() {} },
    userId: 'member-1',
  });

  const handled = await handleVoteButton(interaction, context);

  assert.equal(handled, true);
  assert.equal(interaction.replies[0].ephemeral, true);
  assert.match(interaction.replies[0].embeds[0].data.title, /Chi tiết vote/);

  context.db.close();
});

test('details button rejects users without attendance view permission', async () => {
  const context = createContext();
  const guild = createGuild({ roles: {}, channels: {} });
  const vote = context.services.voteService.createVote({
    guildId: guild.id,
    channelId: 'attendance-channel',
    title: 'Vote details',
    eventTime: 'slot-details',
    description: null,
    createdBy: 'admin',
  });

  const interaction = createButtonInteraction({
    guild,
    member: createMember(),
    voteId: vote.id,
    choice: 'details',
    message: { async edit() {} },
  });

  const handled = await handleVoteButton(interaction, context);

  assert.equal(handled, true);
  assert.match(interaction.replies[0].content, /không có quyền xem dữ liệu điểm danh/);

  context.db.close();
});

test('details join overview supports select-menu drilldown and pagination update', async () => {
  const context = createContext();
  const guild = createGuild({ roles: { 'member-role': createRole('member-role') }, channels: {} });
  context.services.settingsService.setMemberRole(guild.id, 'member-role');

  for (let index = 1; index <= 11; index += 1) {
    context.services.profileService.saveProfile({
      guildId: guild.id,
      userId: `member-${index}`,
      ingameName: `ToVan${index}`,
      monPhai: 'Tố Vấn',
    });
  }

  const vote = context.services.voteService.createVote({
    guildId: guild.id,
    channelId: 'attendance-channel',
    title: 'Join detail pagination',
    eventTime: 'slot-join-details',
    description: null,
    createdBy: 'admin',
  });

  for (let index = 1; index <= 11; index += 1) {
    context.services.voteService.saveMemberChoice(
      vote.id,
      `member-${index}`,
      'join',
      context.services.profileService.getProfile(guild.id, `member-${index}`),
    );
  }

  const joinOverviewInteraction = createButtonInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    voteId: vote.id,
    choice: 'noop',
    message: { async edit() {} },
  });
  joinOverviewInteraction.customId = `vote-detail:${vote.id}:join-overview`;

  const joinOverviewHandled = await handleVoteButton(joinOverviewInteraction, context);
  assert.equal(joinOverviewHandled, true);
  assert.equal(joinOverviewInteraction.updates.length, 1);
  assert.match(joinOverviewInteraction.updates[0].embeds[0].data.description, /Tố Vấn \(11\)/);
  assert.equal(joinOverviewInteraction.updates[0].components[0].components[0].data.custom_id, `vote-detail:${vote.id}:join-sect-select`);

  const selectInteraction = createSelectInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    value: `vote-detail:${vote.id}:join-sect:to-van:1`,
  });

  const selectHandled = await handleVoteDetailSelect(selectInteraction, context);
  assert.equal(selectHandled, true);
  assert.equal(selectInteraction.updates.length, 1);
  assert.match(selectInteraction.updates[0].embeds[0].data.title, /Tố Vấn/);
  assert.match(selectInteraction.updates[0].embeds[0].data.description, /1\. ToVan1/);
  assert.match(selectInteraction.updates[0].embeds[0].data.footer.text, /Trang 1\/2/);

  const nextPageInteraction = createButtonInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    voteId: vote.id,
    choice: 'noop',
    message: { async edit() {} },
  });
  nextPageInteraction.customId = `vote-detail:${vote.id}:join-sect:to-van:2`;

  const nextHandled = await handleVoteButton(nextPageInteraction, context);
  assert.equal(nextHandled, true);
  assert.equal(nextPageInteraction.updates.length, 1);
  assert.match(nextPageInteraction.updates[0].embeds[0].data.description, /1\. ToVan9|1\. ToVan10|1\. ToVan11/);

  context.db.close();
});

test('details reserve and absent views render plain names and paginate via update', async () => {
  const context = createContext();
  const guild = createGuild({ roles: { 'member-role': createRole('member-role') }, channels: {} });
  context.services.settingsService.setMemberRole(guild.id, 'member-role');

  for (let index = 1; index <= 16; index += 1) {
    context.services.profileService.saveProfile({
      guildId: guild.id,
      userId: `reserve-${index}`,
      ingameName: `Reserve${index}`,
      monPhai: 'Thiết Y',
    });
  }
  context.services.profileService.saveProfile({ guildId: guild.id, userId: 'absent-1', ingameName: 'Absent1', monPhai: 'Huyết Hà' });

  const vote = context.services.voteService.createVote({
    guildId: guild.id,
    channelId: 'attendance-channel',
    title: 'Reserve absent details',
    eventTime: 'slot-other-details',
    description: null,
    createdBy: 'admin',
  });

  for (let index = 1; index <= 16; index += 1) {
    context.services.voteService.saveMemberChoice(
      vote.id,
      `reserve-${index}`,
      'reserve',
      context.services.profileService.getProfile(guild.id, `reserve-${index}`),
    );
  }
  context.services.voteService.saveMemberChoice(vote.id, 'absent-1', 'absent', context.services.profileService.getProfile(guild.id, 'absent-1'));

  const reserveInteraction = createButtonInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    voteId: vote.id,
    choice: 'noop',
    message: { async edit() {} },
  });
  reserveInteraction.customId = `vote-detail:${vote.id}:reserve:1`;

  const reserveHandled = await handleVoteButton(reserveInteraction, context);
  assert.equal(reserveHandled, true);
  assert.equal(reserveInteraction.updates.length, 1);
  assert.match(reserveInteraction.updates[0].embeds[0].data.title, /Dự Bị/);
  assert.match(reserveInteraction.updates[0].embeds[0].data.description, /Reserve1/);
  assert.match(reserveInteraction.updates[0].embeds[0].data.footer.text, /Trang 1\/2/);

  const absentInteraction = createButtonInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    voteId: vote.id,
    choice: 'noop',
    message: { async edit() {} },
  });
  absentInteraction.customId = `vote-detail:${vote.id}:absent:1`;

  const absentHandled = await handleVoteButton(absentInteraction, context);
  assert.equal(absentHandled, true);
  assert.equal(absentInteraction.updates.length, 1);
  assert.match(absentInteraction.updates[0].embeds[0].data.title, /Không Tham Gia/);
  assert.match(absentInteraction.updates[0].embeds[0].data.description, /Absent1/);

  context.db.close();
});

test('details view prefers current profile over snapshot fallback', async () => {
  const context = createContext();
  const guild = createGuild({ roles: { 'member-role': createRole('member-role') }, channels: {} });

  context.services.settingsService.setMemberRole(guild.id, 'member-role');
  context.services.profileService.saveProfile({
    guildId: guild.id,
    userId: 'member-1',
    ingameName: 'TenCu',
    monPhai: 'Tố Vấn',
  });

  const vote = context.services.voteService.createVote({
    guildId: guild.id,
    channelId: 'attendance-channel',
    title: 'Vote details',
    eventTime: 'slot-details',
    description: null,
    createdBy: 'admin',
  });

  context.services.voteService.saveMemberChoice(vote.id, 'member-1', 'join', context.services.profileService.getProfile(guild.id, 'member-1'));
  context.services.profileService.saveProfile({
    guildId: guild.id,
    userId: 'member-1',
    ingameName: 'TenMoi',
    monPhai: 'Thiết Y',
  });

  const interaction = createButtonInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    voteId: vote.id,
    choice: 'noop',
    message: { async edit() {} },
    userId: 'member-1',
  });
  interaction.customId = `vote-detail:${vote.id}:join-overview`;

  const handled = await handleVoteButton(interaction, context);

  assert.equal(handled, true);
  assert.match(interaction.updates[0].embeds[0].data.description, /Thiết Y \(1\)/);
  assert.doesNotMatch(interaction.updates[0].embeds[0].data.description, /Tố Vấn \(1\)/);

  context.db.close();
});