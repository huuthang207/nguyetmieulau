const { Buffer } = require('node:buffer');

function createDataExchangeService({ repositories, profileService, voteService }) {
  function buildMemberProfilesExport(guildId) {
    return {
      type: 'member_profiles',
      guild_id: guildId,
      exported_at: new Date().toISOString(),
      items: profileService.listProfiles(guildId).map((profile) => ({
        discord_user_id: profile.user_id,
        ingame_name: profile.ingame_name,
        mon_phai: profile.mon_phai,
      })),
    };
  }

  function buildAttendanceExport(guildId, voteId) {
    const exportData = voteService.exportAttendance(guildId, voteId);
    if (!exportData) {
      return null;
    }

    return {
      type: 'attendance',
      guild_id: guildId,
      vote_id: exportData.vote.id,
      title: exportData.vote.title,
      event_time: exportData.vote.event_time,
      status: exportData.vote.status,
      exported_at: new Date().toISOString(),
      items: exportData.items.map((item) => ({
        discord_user_id: item.discordUserId,
        ingame_name: item.ingameName,
        mon_phai: item.monPhai,
        choice: item.choice,
        snapshot_ingame_name: item.snapshotIngameName,
        snapshot_mon_phai: item.snapshotMonPhai,
      })),
    };
  }

  async function parseJsonAttachment(attachment) {
    if (!attachment?.url) {
      throw new Error('Bạn cần đính kèm file JSON hợp lệ.');
    }

    const response = await fetch(attachment.url);
    if (!response.ok) {
      throw new Error('Không thể đọc file JSON đã đính kèm.');
    }

    try {
      return await response.json();
    } catch (error) {
      throw new Error('Nội dung file đính kèm không phải JSON hợp lệ.');
    }
  }

  function toJsonAttachment(name, payload) {
    return {
      attachment: Buffer.from(JSON.stringify(payload, null, 2), 'utf8'),
      name,
    };
  }

  return {
    buildMemberProfilesExport,
    buildAttendanceExport,
    parseJsonAttachment,
    toJsonAttachment,
  };
}

module.exports = {
  createDataExchangeService,
};
