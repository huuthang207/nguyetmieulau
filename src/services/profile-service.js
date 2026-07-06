const { nowIso } = require('../utils/time');
const { isValidMonPhai } = require('../constants/mon-phai');

function createProfileService(repositories) {
  function validateProfileInput({ guildId, userId, ingameName, monPhai }) {
    const trimmedIngameName = ingameName?.trim();

    if (!trimmedIngameName) {
      return {
        ok: false,
        message: '`ingame_name` không được để trống.',
      };
    }

    if (!isValidMonPhai(monPhai)) {
      return {
        ok: false,
        message: '`mon_phai` không hợp lệ.',
      };
    }

    const existingByName = repositories.findMemberProfileByIngameName(guildId, trimmedIngameName);
    if (existingByName && existingByName.user_id !== userId) {
      return {
        ok: false,
        message: '`ingame_name` đã tồn tại trong guild này.',
      };
    }

    return {
      ok: true,
      ingameName: trimmedIngameName,
      monPhai,
    };
  }

  function saveProfile({ guildId, userId, ingameName, monPhai }) {
    const validation = validateProfileInput({ guildId, userId, ingameName, monPhai });
    if (!validation.ok) {
      return validation;
    }

    const profile = repositories.upsertMemberProfile(
      guildId,
      userId,
      validation.ingameName,
      validation.monPhai,
      nowIso(),
    );

    return {
      ok: true,
      profile,
    };
  }

  function getProfile(guildId, userId) {
    return repositories.getMemberProfile(guildId, userId);
  }

  function listProfiles(guildId) {
    return repositories.listMemberProfiles(guildId);
  }

  function validateImportDataset(guildId, payload) {
    if (!payload || typeof payload !== 'object') {
      return {
        ok: false,
        message: 'File JSON không hợp lệ.',
      };
    }

    if (payload.type !== 'member_profiles') {
      return {
        ok: false,
        message: 'File import không đúng loại `member_profiles`.',
      };
    }

    if (payload.guild_id && payload.guild_id !== guildId) {
      return {
        ok: false,
        message: 'File import không thuộc guild hiện tại.',
      };
    }

    if (!Array.isArray(payload.items)) {
      return {
        ok: false,
        message: 'File import phải chứa mảng `items`.',
      };
    }

    const seenNames = new Map();

    for (let index = 0; index < payload.items.length; index += 1) {
      const item = payload.items[index];
      if (!item || typeof item !== 'object') {
        return {
          ok: false,
          message: `Item #${index + 1} không hợp lệ.`,
        };
      }

      const userId = String(item.discord_user_id || '').trim();
      const ingameName = String(item.ingame_name || '').trim();
      const monPhai = item.mon_phai;

      if (!userId) {
        return {
          ok: false,
          message: `Item #${index + 1} thiếu discord_user_id.`,
        };
      }

      const validation = validateProfileInput({
        guildId,
        userId,
        ingameName,
        monPhai,
      });

      if (!validation.ok) {
        return {
          ok: false,
          message: `Item #${index + 1}: ${validation.message}`,
        };
      }

      const nameKey = validation.ingameName.toLocaleLowerCase('vi-VN');
      const previousIndex = seenNames.get(nameKey);
      if (previousIndex) {
        return {
          ok: false,
          message: `Item #${index + 1} trùng ingame_name với item #${previousIndex}.`,
        };
      }

      seenNames.set(nameKey, index + 1);
    }

    return {
      ok: true,
      items: payload.items.map((item) => ({
        userId: String(item.discord_user_id).trim(),
        ingameName: String(item.ingame_name).trim(),
        monPhai: item.mon_phai,
      })),
    };
  }

  function importProfiles(guildId, payload) {
    const validation = validateImportDataset(guildId, payload);
    if (!validation.ok) {
      return validation;
    }

    const profiles = repositories.upsertMemberProfiles(guildId, validation.items, nowIso());
    return {
      ok: true,
      profiles,
      importedCount: validation.items.length,
    };
  }

  return {
    getProfile,
    listProfiles,
    saveProfile,
    importProfiles,
    validateImportDataset,
  };
}

module.exports = {
  createProfileService,
};
