const { nowIso } = require('../utils/time');

function createSettingsService(repositories) {
  async function resolveRole(guild, roleId) {
    if (!roleId) {
      return null;
    }

    return guild.roles.cache.get(roleId) || guild.roles.fetch(roleId).catch(() => null);
  }

  async function resolveChannel(guild, channelId) {
    if (!channelId) {
      return null;
    }

    return guild.channels.cache.get(channelId) || guild.channels.fetch(channelId).catch(() => null);
  }

  async function validateGuildConfiguration(guild) {
    const settings = await repositories.getGuildSettings(guild.id) || {};
    const issues = [];

    const adminRole = await resolveRole(guild, settings.admin_role_id);
    if (!settings.admin_role_id) {
      issues.push('chưa có role admin');
    } else if (!adminRole) {
      issues.push('role admin đã cấu hình không còn hợp lệ');
    }

    const memberRole = await resolveRole(guild, settings.member_role_id);
    if (!settings.member_role_id) {
      issues.push('chưa có role thành viên');
    } else if (!memberRole) {
      issues.push('role thành viên đã cấu hình không còn hợp lệ');
    }

    const attendanceChannel = await resolveChannel(guild, settings.attendance_channel_id);
    if (!settings.attendance_channel_id) {
      issues.push('chưa có channel điểm danh');
    } else if (!attendanceChannel || !attendanceChannel.isTextBased()) {
      issues.push('channel điểm danh đã cấu hình không còn hợp lệ');
    }

    return {
      settings,
      adminRole,
      memberRole,
      attendanceChannel,
      issues,
      isValid: issues.length === 0,
    };
  }

  function formatConfigurationIssues(issues) {
    return `Bot chưa được cấu hình đầy đủ:\n- ${issues.join('\n- ')}`;
  }

  return {
    async getSettings(guildId) {
      return repositories.getGuildSettings(guildId);
    },

    async setAttendanceChannel(guildId, channelId) {
      return repositories.setGuildAttendanceChannel(guildId, channelId, nowIso());
    },

    async setMemberRole(guildId, roleId) {
      return repositories.setGuildMemberRole(guildId, roleId, nowIso());
    },

    async setAdminRole(guildId, roleId) {
      return repositories.setGuildAdminRole(guildId, roleId, nowIso());
    },

    validateGuildConfiguration,
    formatConfigurationIssues,
  };
}

module.exports = {
  createSettingsService,
};
