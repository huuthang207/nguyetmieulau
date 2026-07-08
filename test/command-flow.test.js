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
const helpCommand = require('../src/commands/help');
const memberCommand = require('../src/commands/member');
const voteCommand = require('../src/commands/vote');
const { handleVoteButton, handleVoteDetailSelect } = require('../src/interactions/vote-buttons');
const { handleMemberPanelSelect, handleMemberProfileModal } = require('../src/interactions/member-panel');
const {
  MEMBER_PANEL_MENU_ID,
  MEMBER_PROFILE_MON_PHAI_SELECT_ID,
  MEMBER_PROFILE_MODAL_PREFIX,
  MEMBER_PROFILE_INGAME_NAME_INPUT_ID,
  MEMBER_PROFILE_GAME_ID_INPUT_ID,
} = require('../src/services/member-panel-service');

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

function createChatInputInteraction({ guild, member, userId = 'user-1', options = {}, channel = null }) {
  const replies = [];

  return {
    guildId: guild.id,
    guild,
    member,
    user: { id: userId },
    channel,
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

function createSelectInteraction({ guild, member, value, userId = 'member-1', customId = null }) {
  const replies = [];
  const updates = [];
  const modals = [];

  return {
    guildId: guild.id,
    guild,
    member,
    user: { id: userId },
    customId,
    values: [value],
    replies,
    updates,
    modals,
    async reply(payload) {
      replies.push(payload);
    },
    async update(payload) {
      updates.push(payload);
    },
    async showModal(modal) {
      modals.push(modal);
    },
  };
}

function createModalInteraction({ guild, member, customId, ingameName, gameId = 'game-id-1', userId = 'member-1' }) {
  const replies = [];

  return {
    guildId: guild.id,
    guild,
    member,
    user: { id: userId },
    customId,
    replies,
    fields: {
      getTextInputValue(inputId) {
        if (inputId === MEMBER_PROFILE_INGAME_NAME_INPUT_ID) {
          return ingameName;
        }
        assert.equal(inputId, MEMBER_PROFILE_GAME_ID_INPUT_ID);
        return gameId;
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

test('member-panel post sends panel message for admin and rejects unauthorized users', async () => {
  const context = await createContext();
  const adminRole = createRole('admin-role');
  const memberChannel = createTextChannel('member-channel');
  const guild = createGuild({ roles: { 'admin-role': adminRole }, channels: { 'member-channel': memberChannel } });

  await context.services.settingsService.setAdminRole(guild.id, adminRole.id);

  const unauthorizedInteraction = createChatInputInteraction({
    guild,
    member: createMember(),
    channel: memberChannel,
    options: { subcommand: 'panel' },
  });

  await memberCommand.execute(unauthorizedInteraction, context);
  assert.match(unauthorizedInteraction.replies[0].content, /không có quyền quản trị bot/);
  assert.equal(memberChannel.sentMessages.size, 0);

  const adminInteraction = createChatInputInteraction({
    guild,
    member: createMember({ roleIds: ['admin-role'] }),
    channel: memberChannel,
    options: { subcommand: 'panel' },
  });

  await memberCommand.execute(adminInteraction, context);

  assert.match(adminInteraction.replies[0].content, /Đã tạo member management panel/);
  assert.equal(memberChannel.sentMessages.size, 1);
  const sentMessage = memberChannel.sentMessages.get('msg-1');
  assert.match(sentMessage.payloads[0].embeds[0].data.title, /Quản lý thông tin thành viên/);
  const select = sentMessage.payloads[0].components[0].components[0];
  assert.equal(select.data.custom_id, MEMBER_PANEL_MENU_ID);
  assert.deepEqual(select.options.map((option) => option.data.value), [
    'member-profile:update',
    'member-profile:update-bank-qr',
    'member-profile:view',
  ]);

  await context.db.close();
});

test('member panel can view existing and missing profiles', async () => {
  const context = await createContext();
  const guild = createGuild({ roles: { 'member-role': createRole('member-role') }, channels: {} });

  await context.services.settingsService.setMemberRole(guild.id, 'member-role');
  await context.services.profileService.saveProfile({
    guildId: guild.id,
    userId: 'member-1',
    ingameName: 'Aki',
    gameId: 'gid-Aki',
    monPhai: 'Thiết Y',
  });

  const existingInteraction = createSelectInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    customId: MEMBER_PANEL_MENU_ID,
    value: 'member-profile:view',
  });

  assert.equal(await handleMemberPanelSelect(existingInteraction, context), true);
  assert.match(existingInteraction.replies[0].content, /Aki/);
  assert.match(existingInteraction.replies[0].content, /gid-Aki/);
  assert.match(existingInteraction.replies[0].content, /Thiết Y/);
  assert.equal(existingInteraction.replies[0].ephemeral, true);

  const missingInteraction = createSelectInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    customId: MEMBER_PANEL_MENU_ID,
    value: 'member-profile:view',
    userId: 'member-2',
  });

  assert.equal(await handleMemberPanelSelect(missingInteraction, context), true);
  assert.match(missingInteraction.replies[0].content, /Bạn chưa có hồ sơ/);
  assert.match(missingInteraction.replies[0].content, /Cập nhật hồ sơ/);

  await context.db.close();
});

test('member panel update flow shows current profile, opens modal, and saves profile', async () => {
  const context = await createContext();
  const guild = createGuild({ roles: { 'member-role': createRole('member-role') }, channels: {} });

  await context.services.settingsService.setMemberRole(guild.id, 'member-role');
  await context.services.profileService.saveProfile({
    guildId: guild.id,
    userId: 'member-1',
    ingameName: 'TenCu',
    gameId: 'gid-TenCu',
    monPhai: 'Tố Vấn',
  });

  const startInteraction = createSelectInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    customId: MEMBER_PANEL_MENU_ID,
    value: 'member-profile:update',
  });

  assert.equal(await handleMemberPanelSelect(startInteraction, context), true);
  assert.match(startInteraction.replies[0].content, /TenCu/);
  assert.equal(startInteraction.replies[0].components[0].components[0].data.custom_id, MEMBER_PROFILE_MON_PHAI_SELECT_ID);

  const selectMonPhaiInteraction = createSelectInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    customId: MEMBER_PROFILE_MON_PHAI_SELECT_ID,
    value: `${MEMBER_PROFILE_MODAL_PREFIX}long-ngam`,
  });

  assert.equal(await handleMemberPanelSelect(selectMonPhaiInteraction, context), true);
  assert.equal(selectMonPhaiInteraction.modals.length, 1);
  assert.equal(selectMonPhaiInteraction.modals[0].data.custom_id, `${MEMBER_PROFILE_MODAL_PREFIX}long-ngam`);
  assert.equal(selectMonPhaiInteraction.modals[0].components[0].components[0].data.value, 'TenCu');
  assert.equal(selectMonPhaiInteraction.modals[0].components[1].components[0].data.value, 'gid-TenCu');

  const modalInteraction = createModalInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    customId: `${MEMBER_PROFILE_MODAL_PREFIX}long-ngam`,
    ingameName: 'TenMoi',
    gameId: 'gid-TenMoi',
  });

  assert.equal(await handleMemberProfileModal(modalInteraction, context), true);
  assert.match(modalInteraction.replies[0].content, /Đã lưu profile/);
  assert.match(modalInteraction.replies[0].content, /TenMoi/);
  assert.match(modalInteraction.replies[0].content, /Long Ngâm/);

  const profile = await context.services.profileService.getProfile(guild.id, 'member-1');
  assert.equal(profile.ingame_name, 'TenMoi');
  assert.equal(profile.game_id, 'gid-TenMoi');
  assert.equal(profile.mon_phai, 'Long Ngâm');

  await context.db.close();
});

test('member panel update flow rejects invalid inputs and unauthorized users', async () => {
  const context = await createContext();
  const guild = createGuild({ roles: { 'member-role': createRole('member-role') }, channels: {} });

  await context.services.settingsService.setMemberRole(guild.id, 'member-role');
  await context.services.profileService.saveProfile({
    guildId: guild.id,
    userId: 'member-1',
    ingameName: 'TrungLap',
    gameId: 'gid-TrungLap',
    monPhai: 'Tố Vấn',
  });

  const unauthorizedInteraction = createSelectInteraction({
    guild,
    member: createMember(),
    customId: MEMBER_PANEL_MENU_ID,
    value: 'member-profile:view',
  });

  assert.equal(await handleMemberPanelSelect(unauthorizedInteraction, context), true);
  assert.match(unauthorizedInteraction.replies[0].content, /không có quyền sử dụng panel/);

  const invalidMonPhaiSelect = createSelectInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    customId: MEMBER_PROFILE_MON_PHAI_SELECT_ID,
    value: `${MEMBER_PROFILE_MODAL_PREFIX}sai-phai`,
    userId: 'member-2',
  });

  assert.equal(await handleMemberPanelSelect(invalidMonPhaiSelect, context), true);
  assert.match(invalidMonPhaiSelect.replies[0].content, /Môn phái không hợp lệ/);

  const invalidModal = createModalInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    customId: `${MEMBER_PROFILE_MODAL_PREFIX}sai-phai`,
    ingameName: 'NameMoi',
    gameId: 'gid-NameMoi',
    userId: 'member-2',
  });

  assert.equal(await handleMemberProfileModal(invalidModal, context), true);
  assert.match(invalidModal.replies[0].content, /Môn phái không hợp lệ/);

  const duplicateModal = createModalInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    customId: `${MEMBER_PROFILE_MODAL_PREFIX}thiet-y`,
    ingameName: 'TrungLap',
    gameId: 'gid-Other',
    userId: 'member-2',
  });

  assert.equal(await handleMemberProfileModal(duplicateModal, context), true);
  assert.match(duplicateModal.replies[0].content, /ingame_name.*đã tồn tại/);

  const duplicateGameIdModal = createModalInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    customId: `${MEMBER_PROFILE_MODAL_PREFIX}thiet-y`,
    ingameName: 'TenKhac',
    gameId: 'gid-TrungLap',
    userId: 'member-2',
  });

  assert.equal(await handleMemberProfileModal(duplicateGameIdModal, context), true);
  assert.match(duplicateGameIdModal.replies[0].content, /game_id.*đã tồn tại/);

  const qrGuidanceInteraction = createSelectInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    customId: MEMBER_PANEL_MENU_ID,
    value: 'member-profile:update-bank-qr',
  });

  assert.equal(await handleMemberPanelSelect(qrGuidanceInteraction, context), true);
  assert.match(qrGuidanceInteraction.replies[0].content, /set-qr/);

  await context.db.close();
});

test('vote-tao creates a public vote message and stores message id', async () => {
  const context = await createContext();
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

  await context.services.settingsService.setMemberRole(guild.id, memberRole.id);
  await context.services.settingsService.setAdminRole(guild.id, adminRole.id);
  await context.services.settingsService.setAttendanceChannel(guild.id, attendanceChannel.id);

  const interaction = createChatInputInteraction({
    guild,
    member: createMember({ isAdministrator: true }),
    userId: 'admin-user',
    options: {
      subcommand: 'create',
      title: 'Bang Chiến tối nay',
      event_time: '20:00 05/07/2026',
      description: null,
      ping_member: false,
    },
  });

  await voteCommand.execute(interaction, context);

  assert.equal(interaction.replies.length, 1);
  assert.match(interaction.replies[0].content, /Đã tạo vote mới/);

  const openVote = await context.services.voteService.getOpenVote(guild.id);
  assert.ok(openVote);
  assert.equal(openVote.message_id, 'msg-1');
  assert.equal(attendanceChannel.sentMessages.size, 1);

  const sentMessage = attendanceChannel.sentMessages.get('msg-1');
  assert.equal(sentMessage.payloads[0].content, undefined);

  await context.db.close();
});

test('vote-tao can mention member role when ping_member is enabled', async () => {
  const context = await createContext();
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

  await context.services.settingsService.setMemberRole(guild.id, memberRole.id);
  await context.services.settingsService.setAdminRole(guild.id, adminRole.id);
  await context.services.settingsService.setAttendanceChannel(guild.id, attendanceChannel.id);

  const interaction = createChatInputInteraction({
    guild,
    member: createMember({ isAdministrator: true }),
    options: {
      subcommand: 'create',
      title: 'Bang Chiến cuối tuần',
      event_time: '21:00 12/07/2026',
      description: 'Ping toàn bộ thành viên',
      ping_member: true,
    },
  });

  await voteCommand.execute(interaction, context);

  const sentMessage = attendanceChannel.sentMessages.get('msg-1');
  assert.equal(sentMessage.payloads[0].content, `<@&${memberRole.id}>`);
  assert.deepEqual(sentMessage.payloads[0].allowedMentions, { roles: [memberRole.id] });

  await context.db.close();
});

test('vote-tao blocks creating a second open vote', async () => {
  const context = await createContext();
  const guild = createGuild({ roles: {}, channels: {} });

  await context.repositories.createVote({
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
      subcommand: 'create',
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

  await voteCommand.execute(interaction, context);

  assert.equal(interaction.replies.length, 1);
  assert.match(interaction.replies[0].content, /đã có một vote đang mở/);

  context.services.settingsService.validateGuildConfiguration = originalValidate;
  await context.db.close();
});

test('vote-dong reports when there is no active vote', async () => {
  const context = await createContext();
  const interaction = createChatInputInteraction({
    guild: createGuild({ roles: {}, channels: {} }),
    member: createMember({ isAdministrator: true }),
    options: { subcommand: 'close' },
  });

  await voteCommand.execute(interaction, context);

  assert.equal(interaction.replies.length, 1);
  assert.match(interaction.replies[0].content, /Hiện không có vote nào đang mở/);

  await context.db.close();
});

test('vote button records member choice and updates current message payload', async () => {
  const context = await createContext();
  const guild = createGuild({ roles: {}, channels: {} });

  await context.services.settingsService.setMemberRole(guild.id, 'member-role');
  await context.services.profileService.saveProfile({
    guildId: guild.id,
    userId: 'member-1',
    ingameName: 'Thang207',
    gameId: 'gid-Thang207',
    monPhai: 'Tố Vấn',
  });

  const vote = await context.services.voteService.createVote({
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
  assert.equal((await context.repositories.getVoteSummary(vote.id)).joinCount, 1);
  assert.equal((await context.repositories.getVoteResponse(vote.id, 'member-1')).snapshot_ingame_name, 'Thang207');
  assert.equal((await context.repositories.getVoteResponse(vote.id, 'member-1')).snapshot_mon_phai, 'Tố Vấn');

  await context.db.close();
});

test('vote button blocks members who do not have a profile yet', async () => {
  const context = await createContext();
  const guild = createGuild({ roles: {}, channels: {} });

  await context.services.settingsService.setMemberRole(guild.id, 'member-role');
  const vote = await context.services.voteService.createVote({
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
  assert.match(interaction.replies[0].content, /member management panel/);
  assert.equal((await context.repositories.getVoteSummary(vote.id)).joinCount, 0);

  await context.db.close();
});

test('profile command allows admin set-member', async () => {
  const context = await createContext();
  const guild = createGuild({ roles: { 'admin-role': createRole('admin-role') }, channels: {} });

  await context.services.settingsService.setAdminRole(guild.id, 'admin-role');

  const adminSetMemberInteraction = createChatInputInteraction({
    guild,
    member: createMember({ roleIds: ['admin-role'] }),
    userId: 'admin-user',
    options: {
      subcommand: 'set-other',
      member: { id: 'member-3' },
      ingame_name: 'NewName',
      game_id: 'game-new-name',
      mon_phai: 'Long Ngâm',
    },
  });

  await memberCommand.execute(adminSetMemberInteraction, context);
  assert.match(adminSetMemberInteraction.replies[0].content, /Đã cập nhật profile/);
  const savedAdminProfile = await context.services.profileService.getProfile(guild.id, 'member-3');
  assert.equal(savedAdminProfile.ingame_name, 'NewName');
  assert.equal(savedAdminProfile.game_id, 'game-new-name');

  await context.db.close();
});

test('profile export-attendance uses open vote by default', async () => {
  const context = await createContext();
  const guild = createGuild({ roles: { 'admin-role': createRole('admin-role') }, channels: {} });

  await context.services.settingsService.setAdminRole(guild.id, 'admin-role');
  await context.services.profileService.saveProfile({
    guildId: guild.id,
    userId: 'member-1',
    ingameName: 'Exporter',
    gameId: 'gid-Exporter',
    monPhai: 'Thần Tương',
  });

  const vote = await context.services.voteService.createVote({
    guildId: guild.id,
    channelId: 'attendance-channel',
    title: 'Export vote',
    eventTime: 'slot-export',
    description: null,
    createdBy: 'admin',
  });
  await context.services.voteService.saveMemberChoice(vote.id, 'member-1', 'join', await context.services.profileService.getProfile(guild.id, 'member-1'));

  const exportInteraction = createChatInputInteraction({
    guild,
    member: createMember({ roleIds: ['admin-role'] }),
    userId: 'admin-user',
    options: {
      subcommand: 'export',
    },
  });

  await voteCommand.execute(exportInteraction, context);
  assert.match(exportInteraction.replies[0].content, /export attendance cho vote/);
  assert.equal(exportInteraction.replies[0].files.length, 1);

  await context.db.close();
});

test('profile import-members rejects invalid payload type', async () => {
  const context = await createContext();
  const guild = createGuild({ roles: { 'admin-role': createRole('admin-role') }, channels: {} });

  await context.services.settingsService.setAdminRole(guild.id, 'admin-role');
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
      subcommand: 'import',
      file: { url: 'https://example.invalid/file.json' },
    },
  });

  await memberCommand.execute(importInteraction, context);
  assert.match(importInteraction.replies[0].content, /member_profiles/);

  await context.db.close();
});

test('profile import-members imports valid JSON payload', async () => {
  const context = await createContext();
  const guild = createGuild({ roles: { 'admin-role': createRole('admin-role') }, channels: {} });

  await context.services.settingsService.setAdminRole(guild.id, 'admin-role');
  context.services.dataExchangeService.parseJsonAttachment = async () => ({
    type: 'member_profiles',
    guild_id: guild.id,
    items: [
      {
        discord_user_id: 'member-9',
        ingame_name: 'Importer',
        game_id: 'game-importer',
        mon_phai: 'Cửu Linh',
      },
    ],
  });

  const importInteraction = createChatInputInteraction({
    guild,
    member: createMember({ roleIds: ['admin-role'] }),
    userId: 'admin-user',
    options: {
      subcommand: 'import',
      file: { url: 'https://example.invalid/file.json' },
    },
  });

  await memberCommand.execute(importInteraction, context);
  assert.match(importInteraction.replies[0].content, /import thành công 1 member profile/);
  assert.equal((await context.services.profileService.getProfile(guild.id, 'member-9')).ingame_name, 'Importer');

  await context.db.close();
});

test('member view shows the current user profile', async () => {
  const context = await createContext();
  const guild = createGuild({ roles: { 'member-role': createRole('member-role') }, channels: {} });

  await context.services.settingsService.setMemberRole(guild.id, 'member-role');
  await context.services.profileService.saveProfile({
    guildId: guild.id,
    userId: 'member-1',
    ingameName: 'SelfViewer',
    gameId: 'game-self-viewer',
    monPhai: 'Tố Vấn',
  });

  const viewInteraction = createChatInputInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    userId: 'member-1',
    options: { subcommand: 'view' },
  });

  await memberCommand.execute(viewInteraction, context);
  assert.match(viewInteraction.replies[0].content, /SelfViewer/);
  assert.match(viewInteraction.replies[0].content, /game-self-viewer/);
  assert.equal(viewInteraction.replies[0].ephemeral, true);

  await context.db.close();
});

test('profile set-qr and remove-qr are available to members with profile', async () => {
  const context = await createContext();
  const guild = createGuild({ roles: { 'member-role': createRole('member-role') }, channels: {} });

  await context.services.settingsService.setMemberRole(guild.id, 'member-role');
  await context.services.profileService.saveProfile({
    guildId: guild.id,
    userId: 'member-1',
    ingameName: 'QrMember',
    gameId: 'game-qr-member',
    monPhai: 'Huyết Hà',
  });

  const setQrInteraction = createChatInputInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    userId: 'member-1',
    options: {
      subcommand: 'set-qr',
      file: {
        url: 'https://cdn.example/qr.png',
        contentType: 'image/png',
        size: 1024,
      },
    },
  });

  await memberCommand.execute(setQrInteraction, context);
  assert.match(setQrInteraction.replies[0].content, /Đã lưu QR/);
  assert.equal((await context.services.profileService.getProfile(guild.id, 'member-1')).bank_qr_url, 'https://cdn.example/qr.png');

  const removeQrInteraction = createChatInputInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    userId: 'member-1',
    options: {
      subcommand: 'remove-qr',
    },
  });

  await memberCommand.execute(removeQrInteraction, context);
  assert.match(removeQrInteraction.replies[0].content, /Đã xóa QR/);
  assert.equal((await context.services.profileService.getProfile(guild.id, 'member-1')).bank_qr_url, null);

  await context.db.close();
});

test('profile view-member shows QR to admins', async () => {
  const context = await createContext();
  const guild = createGuild({ roles: { 'admin-role': createRole('admin-role') }, channels: {} });

  await context.services.settingsService.setAdminRole(guild.id, 'admin-role');
  await context.services.profileService.saveProfile({
    guildId: guild.id,
    userId: 'member-1',
    ingameName: 'ViewedMember',
    gameId: 'game-viewed-member',
    monPhai: 'Long Ngâm',
  });
  await context.services.profileService.setBankQr({
    guildId: guild.id,
    userId: 'member-1',
    attachment: { url: 'https://cdn.example/view-qr.png', contentType: 'image/png', size: 1024 },
  });

  const viewInteraction = createChatInputInteraction({
    guild,
    member: createMember({ roleIds: ['admin-role'] }),
    userId: 'admin-user',
    options: {
      subcommand: 'view-other',
      member: { id: 'member-1' },
    },
  });

  await memberCommand.execute(viewInteraction, context);
  assert.match(viewInteraction.replies[0].content, /ViewedMember/);
  assert.match(viewInteraction.replies[0].content, /game-viewed-member/);
  assert.match(viewInteraction.replies[0].content, /view-qr\.png/);

  await context.db.close();
});

test('profile export-members returns a JSON attachment', async () => {
  const context = await createContext();
  const guild = createGuild({ roles: { 'admin-role': createRole('admin-role') }, channels: {} });

  await context.services.settingsService.setAdminRole(guild.id, 'admin-role');
  await context.services.profileService.saveProfile({
    guildId: guild.id,
    userId: 'member-1',
    ingameName: 'ExportProfile',
    gameId: 'gid-ExportProfile',
    monPhai: 'Huyết Hà',
  });

  const exportInteraction = createChatInputInteraction({
    guild,
    member: createMember({ roleIds: ['admin-role'] }),
    userId: 'admin-user',
    options: {
      subcommand: 'export',
    },
  });

  await memberCommand.execute(exportInteraction, context);
  assert.match(exportInteraction.replies[0].content, /Đang export 1 member profile/);
  assert.equal(exportInteraction.replies[0].files.length, 1);

  await context.db.close();
});

test('non-admin cannot use profile admin subcommands', async () => {
  const context = await createContext();
  const guild = createGuild({ roles: {}, channels: {} });

  const interaction = createChatInputInteraction({
    guild,
    member: createMember(),
    userId: 'member-1',
    options: {
      subcommand: 'export',
    },
  });

  await memberCommand.execute(interaction, context);
  assert.match(interaction.replies[0].content, /không có quyền quản trị bot/);

  await context.db.close();
});

test('profile export-attendance reports when no target vote exists', async () => {
  const context = await createContext();
  const guild = createGuild({ roles: { 'admin-role': createRole('admin-role') }, channels: {} });

  await context.services.settingsService.setAdminRole(guild.id, 'admin-role');

  const interaction = createChatInputInteraction({
    guild,
    member: createMember({ roleIds: ['admin-role'] }),
    userId: 'admin-user',
    options: {
      subcommand: 'export',
    },
  });

  await voteCommand.execute(interaction, context);
  assert.match(interaction.replies[0].content, /Không tìm thấy vote mục tiêu/);

  await context.db.close();
});

test('help command returns permission-aware overview and legacy mapping', async () => {
  const context = await createContext();
  const guild = createGuild({ roles: { 'member-role': createRole('member-role'), 'admin-role': createRole('admin-role') }, channels: {} });

  await context.services.settingsService.setMemberRole(guild.id, 'member-role');
  await context.services.settingsService.setAdminRole(guild.id, 'admin-role');

  const memberHelp = createChatInputInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    options: {},
  });
  await helpCommand.execute(memberHelp, context);
  assert.match(memberHelp.replies[0].content, /\/vote view/);
  assert.doesNotMatch(memberHelp.replies[0].content, /\/vote create/);
  assert.equal(memberHelp.replies[0].ephemeral, true);

  const adminHelp = createChatInputInteraction({
    guild,
    member: createMember({ roleIds: ['admin-role'] }),
    options: {},
  });
  await helpCommand.execute(adminHelp, context);
  assert.match(adminHelp.replies[0].content, /\/vote create/);
  assert.match(adminHelp.replies[0].content, /\[Admin\]/);

  const legacyHelp = createChatInputInteraction({
    guild,
    member: createMember(),
    options: { topic: 'legacy' },
  });
  await helpCommand.execute(legacyHelp, context);
  assert.match(legacyHelp.replies[0].content, /\/vote-tao.*\/vote create/);
  assert.match(legacyHelp.replies[0].content, /\/profile.*\/member/);

  await context.db.close();
});

test('vote button rejects users without member role and closed votes', async () => {
  const context = await createContext();
  const guild = createGuild({ roles: {}, channels: {} });

  await context.services.settingsService.setMemberRole(guild.id, 'member-role');
  const vote = await context.services.voteService.createVote({
    guildId: guild.id,
    channelId: 'attendance-channel',
    title: 'Vote button',
    eventTime: 'slot-button',
    description: null,
    createdBy: 'admin',
  });
  await context.services.voteService.closeVote(vote.id);

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

  await context.db.close();
});

test('details button shows join detail first and does not edit the public message', async () => {
  const context = await createContext();
  const guild = createGuild({ roles: { 'member-role': createRole('member-role') }, channels: {} });

  await context.services.settingsService.setMemberRole(guild.id, 'member-role');
  await context.services.profileService.saveProfile({ guildId: guild.id, userId: 'member-1', ingameName: 'Aki', gameId: 'gid-Aki', monPhai: 'Tố Vấn' });
  await context.services.profileService.saveProfile({ guildId: guild.id, userId: 'member-2', ingameName: 'Binh', gameId: 'gid-Binh', monPhai: 'Tố Vấn' });
  await context.services.profileService.saveProfile({ guildId: guild.id, userId: 'member-3', ingameName: 'Cuong', gameId: 'gid-Cuong', monPhai: 'Thiết Y' });
  await context.services.profileService.saveProfile({ guildId: guild.id, userId: 'member-4', ingameName: 'Dung', gameId: 'gid-Dung', monPhai: 'Long Ngâm' });
  await context.services.profileService.saveProfile({ guildId: guild.id, userId: 'member-5', ingameName: 'Hieu', gameId: 'gid-Hieu', monPhai: 'Huyết Hà' });

  const vote = await context.services.voteService.createVote({
    guildId: guild.id,
    channelId: 'attendance-channel',
    title: 'Vote details',
    eventTime: 'slot-details',
    description: null,
    createdBy: 'admin',
  });

  await context.services.voteService.saveMemberChoice(vote.id, 'member-1', 'join', await context.services.profileService.getProfile(guild.id, 'member-1'));
  await context.services.voteService.saveMemberChoice(vote.id, 'member-2', 'join', await context.services.profileService.getProfile(guild.id, 'member-2'));
  await context.services.voteService.saveMemberChoice(vote.id, 'member-3', 'join', await context.services.profileService.getProfile(guild.id, 'member-3'));
  await context.services.voteService.saveMemberChoice(vote.id, 'member-4', 'reserve', await context.services.profileService.getProfile(guild.id, 'member-4'));
  await context.services.voteService.saveMemberChoice(vote.id, 'member-5', 'absent', await context.services.profileService.getProfile(guild.id, 'member-5'));

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
  assert.match(interaction.replies[0].embeds[0].data.title, /Tham Gia - .*Tố Vấn/);
  assert.match(interaction.replies[0].embeds[0].data.description, /1\. Aki/);
  assert.match(interaction.replies[0].embeds[0].data.description, /2\. Binh/);
  assert.doesNotMatch(interaction.replies[0].embeds[0].data.description, /Cuong/);
  assert.equal(interaction.replies[0].components.length, 2);

  const select = interaction.replies[0].components[0].components[0];
  assert.equal(select.data.custom_id, `vote-detail:${vote.id}:list-select`);
  assert.deepEqual(select.options.map((option) => option.data.value), [
    `vote-detail:${vote.id}:join:1`,
    `vote-detail:${vote.id}:reserve:1`,
    `vote-detail:${vote.id}:absent:1`,
  ]);
  assert.equal(select.options[0].data.default, true);

  await context.db.close();
});

test('details button allows viewing a closed vote and does not require profile', async () => {
  const context = await createContext();
  const guild = createGuild({ roles: { 'member-role': createRole('member-role') }, channels: {} });

  await context.services.settingsService.setMemberRole(guild.id, 'member-role');
  await context.services.profileService.saveProfile({ guildId: guild.id, userId: 'member-2', ingameName: 'Joiner', gameId: 'gid-Joiner', monPhai: 'Tố Vấn' });

  const vote = await context.services.voteService.createVote({
    guildId: guild.id,
    channelId: 'attendance-channel',
    title: 'Closed details',
    eventTime: 'slot-closed',
    description: null,
    createdBy: 'admin',
  });
  await context.services.voteService.saveMemberChoice(vote.id, 'member-2', 'join', await context.services.profileService.getProfile(guild.id, 'member-2'));
  await context.services.voteService.closeVote(vote.id);

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
  assert.match(interaction.replies[0].embeds[0].data.title, /Tham Gia/);
  assert.match(interaction.replies[0].embeds[0].data.description, /Joiner/);

  await context.db.close();
});

test('details button rejects users without attendance view permission', async () => {
  const context = await createContext();
  const guild = createGuild({ roles: {}, channels: {} });
  const vote = await context.services.voteService.createVote({
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

  await context.db.close();
});

test('join detail pages keep one sect per page and cap each page at 25 members', async () => {
  const context = await createContext();
  const guild = createGuild({ roles: { 'member-role': createRole('member-role') }, channels: {} });
  await context.services.settingsService.setMemberRole(guild.id, 'member-role');

  for (let index = 1; index <= 25; index += 1) {
    await context.services.profileService.saveProfile({
      guildId: guild.id,
      userId: `to-van-${index}`,
      ingameName: `ToVan${String(index).padStart(2, '0')}`,
      gameId: `gid-tovan-${index}`,
      monPhai: 'Tố Vấn',
    });
  }

  for (let index = 1; index <= 2; index += 1) {
    await context.services.profileService.saveProfile({
      guildId: guild.id,
      userId: `thiet-y-${index}`,
      ingameName: `ThietY${String(index).padStart(2, '0')}`,
      gameId: `gid-thiety-${index}`,
      monPhai: 'Thiết Y',
    });
  }

  const vote = await context.services.voteService.createVote({
    guildId: guild.id,
    channelId: 'attendance-channel',
    title: 'Join detail pages',
    eventTime: 'slot-join-pages',
    description: null,
    createdBy: 'admin',
  });

  for (let index = 1; index <= 25; index += 1) {
    await context.services.voteService.saveMemberChoice(vote.id, `to-van-${index}`, 'join', await context.services.profileService.getProfile(guild.id, `to-van-${index}`));
  }
  for (let index = 1; index <= 2; index += 1) {
    await context.services.voteService.saveMemberChoice(vote.id, `thiet-y-${index}`, 'join', await context.services.profileService.getProfile(guild.id, `thiet-y-${index}`));
  }

  const interaction = createButtonInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    voteId: vote.id,
    choice: 'details',
    message: { async edit() {} },
  });

  const handled = await handleVoteButton(interaction, context);
  assert.equal(handled, true);

  const firstPageDescription = interaction.replies[0].embeds[0].data.description;
  assert.match(interaction.replies[0].embeds[0].data.title, /Tố Vấn/);
  assert.equal(firstPageDescription.split('\n').length, 25);
  assert.match(firstPageDescription, /25\. ToVan25/);
  assert.doesNotMatch(firstPageDescription, /ThietY/);
  assert.match(interaction.replies[0].embeds[0].data.footer.text, /Môn phái 1\/2/);

  const nextInteraction = createButtonInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    voteId: vote.id,
    choice: 'noop',
    message: { async edit() {} },
  });
  nextInteraction.customId = `vote-detail:${vote.id}:join:2:next`;

  const nextHandled = await handleVoteButton(nextInteraction, context);
  assert.equal(nextHandled, true);
  assert.match(nextInteraction.updates[0].embeds[0].data.title, /Thiết Y/);
  assert.match(nextInteraction.updates[0].embeds[0].data.description, /1\. ThietY01/);
  assert.doesNotMatch(nextInteraction.updates[0].embeds[0].data.description, /ToVan/);

  await context.db.close();
});

test('join detail pages split a sect larger than 25 into consecutive pages', async () => {
  const context = await createContext();
  const guild = createGuild({ roles: { 'member-role': createRole('member-role') }, channels: {} });
  await context.services.settingsService.setMemberRole(guild.id, 'member-role');

  for (let index = 1; index <= 31; index += 1) {
    await context.services.profileService.saveProfile({
      guildId: guild.id,
      userId: `toai-mong-${index}`,
      ingameName: `ToaiMong${String(index).padStart(2, '0')}`,
      gameId: `gid-toaimong-${index}`,
      monPhai: 'Toái Mộng',
    });
  }
  await context.services.profileService.saveProfile({ guildId: guild.id, userId: 'huyet-ha-1', ingameName: 'HuyetHa01', gameId: 'gid-HuyetHa01', monPhai: 'Huyết Hà' });

  const vote = await context.services.voteService.createVote({
    guildId: guild.id,
    channelId: 'attendance-channel',
    title: 'Large sect',
    eventTime: 'slot-large-sect',
    description: null,
    createdBy: 'admin',
  });

  for (let index = 1; index <= 31; index += 1) {
    await context.services.voteService.saveMemberChoice(vote.id, `toai-mong-${index}`, 'join', await context.services.profileService.getProfile(guild.id, `toai-mong-${index}`));
  }
  await context.services.voteService.saveMemberChoice(vote.id, 'huyet-ha-1', 'join', await context.services.profileService.getProfile(guild.id, 'huyet-ha-1'));

  const firstInteraction = createButtonInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    voteId: vote.id,
    choice: 'details',
    message: { async edit() {} },
  });

  await handleVoteButton(firstInteraction, context);
  assert.match(firstInteraction.replies[0].embeds[0].data.title, /Toái Mộng/);
  assert.match(firstInteraction.replies[0].embeds[0].data.footer.text, /Trang 1\/2/);
  assert.equal(firstInteraction.replies[0].embeds[0].data.description.split('\n').length, 25);

  const secondInteraction = createButtonInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    voteId: vote.id,
    choice: 'noop',
    message: { async edit() {} },
  });
  secondInteraction.customId = `vote-detail:${vote.id}:join:2:next`;

  await handleVoteButton(secondInteraction, context);
  assert.match(secondInteraction.updates[0].embeds[0].data.title, /Toái Mộng/);
  assert.match(secondInteraction.updates[0].embeds[0].data.footer.text, /Trang 2\/2/);
  assert.match(secondInteraction.updates[0].embeds[0].data.description, /26\. ToaiMong26/);
  assert.match(secondInteraction.updates[0].embeds[0].data.description, /31\. ToaiMong31/);
  assert.doesNotMatch(secondInteraction.updates[0].embeds[0].data.description, /HuyetHa/);

  const thirdInteraction = createButtonInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    voteId: vote.id,
    choice: 'noop',
    message: { async edit() {} },
  });
  thirdInteraction.customId = `vote-detail:${vote.id}:join:3:next`;

  await handleVoteButton(thirdInteraction, context);
  assert.match(thirdInteraction.updates[0].embeds[0].data.title, /Huyết Hà/);
  assert.match(thirdInteraction.updates[0].embeds[0].data.description, /1\. HuyetHa01/);

  await context.db.close();
});

test('detail select menu switches to reserve and absent lists with 25 members per page', async () => {
  const context = await createContext();
  const guild = createGuild({ roles: { 'member-role': createRole('member-role') }, channels: {} });
  await context.services.settingsService.setMemberRole(guild.id, 'member-role');

  for (let index = 1; index <= 26; index += 1) {
    await context.services.profileService.saveProfile({
      guildId: guild.id,
      userId: `reserve-${index}`,
      ingameName: `Reserve${String(index).padStart(2, '0')}`,
      gameId: `gid-reserve-${index}`,
      monPhai: 'Thiết Y',
    });
  }
  for (let index = 1; index <= 26; index += 1) {
    await context.services.profileService.saveProfile({
      guildId: guild.id,
      userId: `absent-${index}`,
      ingameName: `Absent${String(index).padStart(2, '0')}`,
      gameId: `gid-absent-${index}`,
      monPhai: 'Huyết Hà',
    });
  }

  const vote = await context.services.voteService.createVote({
    guildId: guild.id,
    channelId: 'attendance-channel',
    title: 'Reserve absent select',
    eventTime: 'slot-select',
    description: null,
    createdBy: 'admin',
  });

  for (let index = 1; index <= 26; index += 1) {
    await context.services.voteService.saveMemberChoice(vote.id, `reserve-${index}`, 'reserve', await context.services.profileService.getProfile(guild.id, `reserve-${index}`));
    await context.services.voteService.saveMemberChoice(vote.id, `absent-${index}`, 'absent', await context.services.profileService.getProfile(guild.id, `absent-${index}`));
  }

  const reserveInteraction = createSelectInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    value: `vote-detail:${vote.id}:reserve:1`,
  });

  const reserveHandled = await handleVoteDetailSelect(reserveInteraction, context);
  assert.equal(reserveHandled, true);
  assert.equal(reserveInteraction.updates[0].embeds[0].data.description.split('\n').length, 25);
  assert.match(reserveInteraction.updates[0].embeds[0].data.title, /Dự Bị/);
  assert.match(reserveInteraction.updates[0].embeds[0].data.description, /25\. Reserve25/);
  assert.doesNotMatch(reserveInteraction.updates[0].embeds[0].data.description, /Reserve26/);
  assert.equal(reserveInteraction.updates[0].components[0].components[0].options[1].data.default, true);

  const reserveNextInteraction = createButtonInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    voteId: vote.id,
    choice: 'noop',
    message: { async edit() {} },
  });
  reserveNextInteraction.customId = `vote-detail:${vote.id}:reserve:2:next`;

  await handleVoteButton(reserveNextInteraction, context);
  assert.match(reserveNextInteraction.updates[0].embeds[0].data.description, /26\. Reserve26/);

  const absentInteraction = createSelectInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    value: `vote-detail:${vote.id}:absent:1`,
  });

  const absentHandled = await handleVoteDetailSelect(absentInteraction, context);
  assert.equal(absentHandled, true);
  assert.equal(absentInteraction.updates[0].embeds[0].data.description.split('\n').length, 25);
  assert.match(absentInteraction.updates[0].embeds[0].data.title, /Không Tham Gia/);
  assert.match(absentInteraction.updates[0].embeds[0].data.description, /25\. Absent25/);

  await context.db.close();
});

test('detail views show clear empty states for all lists', async () => {
  const context = await createContext();
  const guild = createGuild({ roles: { 'member-role': createRole('member-role') }, channels: {} });
  await context.services.settingsService.setMemberRole(guild.id, 'member-role');

  const vote = await context.services.voteService.createVote({
    guildId: guild.id,
    channelId: 'attendance-channel',
    title: 'Empty details',
    eventTime: 'slot-empty',
    description: null,
    createdBy: 'admin',
  });

  const joinInteraction = createButtonInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    voteId: vote.id,
    choice: 'details',
    message: { async edit() {} },
  });

  await handleVoteButton(joinInteraction, context);
  assert.match(joinInteraction.replies[0].embeds[0].data.description, /Chưa có người vote Tham Gia/);

  const reserveInteraction = createSelectInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    value: `vote-detail:${vote.id}:reserve:1`,
  });
  await handleVoteDetailSelect(reserveInteraction, context);
  assert.match(reserveInteraction.updates[0].embeds[0].data.description, /Chưa có người vote Dự Bị/);

  const absentInteraction = createSelectInteraction({
    guild,
    member: createMember({ roleIds: ['member-role'] }),
    value: `vote-detail:${vote.id}:absent:1`,
  });
  await handleVoteDetailSelect(absentInteraction, context);
  assert.match(absentInteraction.updates[0].embeds[0].data.description, /Chưa có người vote Không Tham Gia/);

  await context.db.close();
});

test('details view prefers current profile over snapshot fallback', async () => {
  const context = await createContext();
  const guild = createGuild({ roles: { 'member-role': createRole('member-role') }, channels: {} });

  await context.services.settingsService.setMemberRole(guild.id, 'member-role');
  await context.services.profileService.saveProfile({
    guildId: guild.id,
    userId: 'member-1',
    ingameName: 'TenCu',
    gameId: 'gid-TenCu',
    monPhai: 'Tố Vấn',
  });

  const vote = await context.services.voteService.createVote({
    guildId: guild.id,
    channelId: 'attendance-channel',
    title: 'Vote details',
    eventTime: 'slot-details',
    description: null,
    createdBy: 'admin',
  });

  await context.services.voteService.saveMemberChoice(vote.id, 'member-1', 'join', await context.services.profileService.getProfile(guild.id, 'member-1'));
  await context.services.profileService.saveProfile({
    guildId: guild.id,
    userId: 'member-1',
    ingameName: 'TenMoi',
    gameId: 'gid-TenMoi',
    monPhai: 'Thiết Y',
  });

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
  assert.match(interaction.replies[0].embeds[0].data.title, /Thiết Y/);
  assert.match(interaction.replies[0].embeds[0].data.description, /TenMoi/);
  assert.doesNotMatch(interaction.replies[0].embeds[0].data.title, /Tố Vấn/);

  await context.db.close();
});
