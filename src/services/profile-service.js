const { nowIso } = require('../utils/time');
const { isValidMonPhai } = require('../constants/mon-phai');

const BANK_QR_MAX_SIZE_BYTES = 5 * 1024 * 1024;

function createProfileService(repositories) {
  async function validateProfileInput({ guildId, userId, ingameName, gameId, monPhai }) {
    const trimmedIngameName = ingameName?.trim();
    const trimmedGameId = gameId?.trim();

    if (!trimmedIngameName) {
      return {
        ok: false,
        message: '`ingame_name` không được để trống.',
      };
    }

    if (!trimmedGameId) {
      return {
        ok: false,
        message: '`game_id` không được để trống.',
      };
    }

    if (!isValidMonPhai(monPhai)) {
      return {
        ok: false,
        message: '`mon_phai` không hợp lệ.',
      };
    }

    const existingByName = await repositories.findMemberProfileByIngameName(guildId, trimmedIngameName);
    if (existingByName && existingByName.user_id !== userId) {
      return {
        ok: false,
        message: '`ingame_name` đã tồn tại trong guild này.',
      };
    }

    const existingByGameId = await repositories.findMemberProfileByGameId(guildId, trimmedGameId);
    if (existingByGameId && existingByGameId.user_id !== userId) {
      return {
        ok: false,
        message: '`game_id` đã tồn tại trong guild này.',
      };
    }

    return {
      ok: true,
      ingameName: trimmedIngameName,
      gameId: trimmedGameId,
      monPhai,
    };
  }

  async function saveProfile({ guildId, userId, ingameName, gameId, monPhai }) {
    const validation = await validateProfileInput({ guildId, userId, ingameName, gameId, monPhai });
    if (!validation.ok) {
      return validation;
    }

    const profile = await repositories.upsertMemberProfile(
      guildId,
      userId,
      validation.ingameName,
      validation.gameId,
      validation.monPhai,
      nowIso(),
    );

    return {
      ok: true,
      profile,
    };
  }

  async function getProfile(guildId, userId) {
    return repositories.getMemberProfile(guildId, userId);
  }

  async function listProfiles(guildId) {
    return repositories.listMemberProfiles(guildId);
  }

  function validateBankQrAttachment(attachment) {
    if (!attachment?.url) {
      return {
        ok: false,
        message: 'Bạn cần đính kèm ảnh QR ngân hàng hợp lệ.',
      };
    }

    const contentType = attachment.contentType || attachment.content_type || '';
    if (!contentType.startsWith('image/')) {
      return {
        ok: false,
        message: 'File QR phải là ảnh hợp lệ.',
      };
    }

    if (attachment.size && attachment.size > BANK_QR_MAX_SIZE_BYTES) {
      return {
        ok: false,
        message: 'Ảnh QR không được vượt quá 5MB.',
      };
    }

    return {
      ok: true,
      url: attachment.url,
    };
  }

  async function setBankQr({ guildId, userId, attachment }) {
    const profile = await getProfile(guildId, userId);
    if (!profile) {
      return {
        ok: false,
        message: 'Bạn cần cập nhật hồ sơ trên member management panel trước khi upload QR ngân hàng.',
      };
    }

    const validation = validateBankQrAttachment(attachment);
    if (!validation.ok) {
      return validation;
    }

    return {
      ok: true,
      profile: await repositories.setMemberProfileBankQr(guildId, userId, validation.url, nowIso()),
    };
  }

  async function removeBankQr({ guildId, userId }) {
    const profile = await getProfile(guildId, userId);
    if (!profile) {
      return {
        ok: false,
        message: 'Bạn cần cập nhật hồ sơ trên member management panel trước khi xóa QR ngân hàng.',
      };
    }

    return {
      ok: true,
      profile: await repositories.removeMemberProfileBankQr(guildId, userId, nowIso()),
    };
  }

  async function validateImportDataset(guildId, payload) {
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
    const seenGameIds = new Map();

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
      const gameId = String(item.game_id || '').trim();
      const monPhai = item.mon_phai;

      if (!userId) {
        return {
          ok: false,
          message: `Item #${index + 1} thiếu discord_user_id.`,
        };
      }

      const validation = await validateProfileInput({
        guildId,
        userId,
        ingameName,
        gameId,
        monPhai,
      });

      if (!validation.ok) {
        return {
          ok: false,
          message: `Item #${index + 1}: ${validation.message}`,
        };
      }

      const nameKey = validation.ingameName.toLocaleLowerCase('vi-VN');
      const previousNameIndex = seenNames.get(nameKey);
      if (previousNameIndex) {
        return {
          ok: false,
          message: `Item #${index + 1} trùng ingame_name với item #${previousNameIndex}.`,
        };
      }

      const gameIdKey = validation.gameId.toLocaleLowerCase('vi-VN');
      const previousGameIdIndex = seenGameIds.get(gameIdKey);
      if (previousGameIdIndex) {
        return {
          ok: false,
          message: `Item #${index + 1} trùng game_id với item #${previousGameIdIndex}.`,
        };
      }

      seenNames.set(nameKey, index + 1);
      seenGameIds.set(gameIdKey, index + 1);
    }

    return {
      ok: true,
      items: payload.items.map((item) => ({
        userId: String(item.discord_user_id).trim(),
        ingameName: String(item.ingame_name).trim(),
        gameId: String(item.game_id).trim(),
        monPhai: item.mon_phai,
      })),
    };
  }

  async function importProfiles(guildId, payload) {
    const validation = await validateImportDataset(guildId, payload);
    if (!validation.ok) {
      return validation;
    }

    const profiles = await repositories.upsertMemberProfiles(guildId, validation.items, nowIso());
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
    setBankQr,
    removeBankQr,
    importProfiles,
    validateImportDataset,
    validateBankQrAttachment,
  };
}

module.exports = {
  BANK_QR_MAX_SIZE_BYTES,
  createProfileService,
};
