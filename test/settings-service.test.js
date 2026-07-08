const test = require('node:test');
const assert = require('node:assert/strict');
const { createSettingsService } = require('../src/services/settings-service');

function createGuild({ roles = {}, channels = {} } = {}) {
  return {
    id: 'guild-1',
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

test('settings service reports missing guild configuration items clearly', async () => {
  const service = createSettingsService({
    async getGuildSettings() {
      return null;
    },
  });

  const result = await service.validateGuildConfiguration(createGuild());

  assert.equal(result.isValid, false);
  assert.deepEqual(result.issues, [
    'chưa có role admin',
    'chưa có role thành viên',
    'chưa có channel điểm danh',
  ]);
  assert.match(service.formatConfigurationIssues(result.issues), /Bot chưa được cấu hình đầy đủ:/);
});

test('settings service treats deleted or invalid config targets as invalid', async () => {
  const service = createSettingsService({
    async getGuildSettings() {
      return {
        admin_role_id: 'admin-role',
        member_role_id: 'member-role',
        attendance_channel_id: 'attendance-channel',
      };
    },
  });

  const result = await service.validateGuildConfiguration(createGuild());

  assert.equal(result.isValid, false);
  assert.deepEqual(result.issues, [
    'role admin đã cấu hình không còn hợp lệ',
    'role thành viên đã cấu hình không còn hợp lệ',
    'channel điểm danh đã cấu hình không còn hợp lệ',
  ]);
});

test('settings service accepts valid guild configuration', async () => {
  const service = createSettingsService({
    async getGuildSettings() {
      return {
        admin_role_id: 'admin-role',
        member_role_id: 'member-role',
        attendance_channel_id: 'attendance-channel',
      };
    },
  });

  const result = await service.validateGuildConfiguration(createGuild({
    roles: {
      'admin-role': { id: 'admin-role' },
      'member-role': { id: 'member-role' },
    },
    channels: {
      'attendance-channel': {
        id: 'attendance-channel',
        isTextBased() {
          return true;
        },
      },
    },
  }));

  assert.equal(result.isValid, true);
  assert.equal(result.issues.length, 0);
  assert.equal(result.attendanceChannel.id, 'attendance-channel');
});
