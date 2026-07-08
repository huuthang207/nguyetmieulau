function createRepositories(db) {
  const isMysql = db.dialect === 'mysql';
  const noCaseOrder = (column) => (isMysql ? `LOWER(${column}) ASC` : `${column} COLLATE NOCASE ASC`);

  async function runInTransaction(callback) {
    return db.transaction(callback);
  }

  async function getGuildSettings(guildId) {
    return db.queryOne('SELECT * FROM guild_settings WHERE guild_id = ?', [guildId]);
  }

  async function setGuildSetting(guildId, column, value, updatedAt) {
    if (isMysql) {
      await db.execute(
        `
        INSERT INTO guild_settings (guild_id, ${column}, updated_at)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
          ${column} = VALUES(${column}),
          updated_at = VALUES(updated_at)
        `,
        [guildId, value, updatedAt],
      );
    } else {
      await db.execute(
        `
        INSERT INTO guild_settings (guild_id, ${column}, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(guild_id) DO UPDATE SET
          ${column} = excluded.${column},
          updated_at = excluded.updated_at
        `,
        [guildId, value, updatedAt],
      );
    }

    return getGuildSettings(guildId);
  }

  async function setGuildAttendanceChannel(guildId, channelId, updatedAt) {
    return setGuildSetting(guildId, 'attendance_channel_id', channelId, updatedAt);
  }

  async function setGuildMemberRole(guildId, roleId, updatedAt) {
    return setGuildSetting(guildId, 'member_role_id', roleId, updatedAt);
  }

  async function setGuildAdminRole(guildId, roleId, updatedAt) {
    return setGuildSetting(guildId, 'admin_role_id', roleId, updatedAt);
  }

  async function getMemberProfile(guildId, userId) {
    return db.queryOne('SELECT * FROM member_profiles WHERE guild_id = ? AND user_id = ?', [guildId, userId]);
  }

  async function findMemberProfileByIngameName(guildId, ingameName) {
    return db.queryOne(
      'SELECT * FROM member_profiles WHERE guild_id = ? AND ingame_name = ?',
      [guildId, ingameName],
    );
  }

  async function findMemberProfileByGameId(guildId, gameId) {
    return db.queryOne(
      'SELECT * FROM member_profiles WHERE guild_id = ? AND game_id = ?',
      [guildId, gameId],
    );
  }

  async function listMemberProfiles(guildId) {
    return db.queryAll(
      `
      SELECT *
      FROM member_profiles
      WHERE guild_id = ?
      ORDER BY ${noCaseOrder('ingame_name')}, user_id ASC
      `,
      [guildId],
    );
  }

  async function upsertMemberProfile(guildId, userId, ingameName, gameId, monPhai, updatedAt) {
    if (isMysql) {
      await db.execute(
        `
        INSERT INTO member_profiles (guild_id, user_id, ingame_name, game_id, mon_phai, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          ingame_name = VALUES(ingame_name),
          game_id = VALUES(game_id),
          mon_phai = VALUES(mon_phai),
          updated_at = VALUES(updated_at)
        `,
        [guildId, userId, ingameName, gameId, monPhai, updatedAt],
      );
    } else {
      await db.execute(
        `
        INSERT INTO member_profiles (guild_id, user_id, ingame_name, game_id, mon_phai, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(guild_id, user_id) DO UPDATE SET
          ingame_name = excluded.ingame_name,
          game_id = excluded.game_id,
          mon_phai = excluded.mon_phai,
          updated_at = excluded.updated_at
        `,
        [guildId, userId, ingameName, gameId, monPhai, updatedAt],
      );
    }

    return getMemberProfile(guildId, userId);
  }

  async function setMemberProfileBankQr(guildId, userId, bankQrUrl, updatedAt) {
    await db.execute(
      `
      UPDATE member_profiles
      SET bank_qr_url = ?,
          updated_at = ?
      WHERE guild_id = ? AND user_id = ?
      `,
      [bankQrUrl, updatedAt, guildId, userId],
    );

    return getMemberProfile(guildId, userId);
  }

  async function removeMemberProfileBankQr(guildId, userId, updatedAt) {
    return setMemberProfileBankQr(guildId, userId, null, updatedAt);
  }

  async function upsertMemberProfiles(guildId, profiles, updatedAt) {
    return runInTransaction(async (tx) => {
      for (const profile of profiles) {
        if (isMysql) {
          await tx.execute(
            `
            INSERT INTO member_profiles (guild_id, user_id, ingame_name, game_id, mon_phai, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              ingame_name = VALUES(ingame_name),
              game_id = VALUES(game_id),
              mon_phai = VALUES(mon_phai),
              updated_at = VALUES(updated_at)
            `,
            [guildId, profile.userId, profile.ingameName, profile.gameId, profile.monPhai, updatedAt],
          );
        } else {
          await tx.execute(
            `
            INSERT INTO member_profiles (guild_id, user_id, ingame_name, game_id, mon_phai, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(guild_id, user_id) DO UPDATE SET
              ingame_name = excluded.ingame_name,
              game_id = excluded.game_id,
              mon_phai = excluded.mon_phai,
              updated_at = excluded.updated_at
            `,
            [guildId, profile.userId, profile.ingameName, profile.gameId, profile.monPhai, updatedAt],
          );
        }
      }
    }).then(() => listMemberProfiles(guildId));
  }

  async function createVote({ guildId, channelId, title, eventTime, description, createdBy, createdAt, updatedAt }) {
    const result = await db.execute(
      `
      INSERT INTO votes (
        guild_id,
        channel_id,
        title,
        event_time,
        description,
        status,
        created_by,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?)
      `,
      [guildId, channelId, title, eventTime, description, createdBy, createdAt, updatedAt],
    );

    return getVoteById(result.lastInsertId);
  }

  async function deleteVote(voteId) {
    await db.execute('DELETE FROM votes WHERE id = ?', [voteId]);
  }

  async function updateVoteMessageId(voteId, messageId) {
    await db.execute('UPDATE votes SET message_id = ? WHERE id = ?', [messageId, voteId]);
    return getVoteById(voteId);
  }

  async function getVoteById(voteId) {
    return db.queryOne('SELECT * FROM votes WHERE id = ?', [voteId]);
  }

  async function getVoteByIdForGuild(guildId, voteId) {
    return db.queryOne('SELECT * FROM votes WHERE guild_id = ? AND id = ?', [guildId, voteId]);
  }

  async function getOpenVote(guildId) {
    return db.queryOne(
      `
      SELECT *
      FROM votes
      WHERE guild_id = ? AND status = 'open'
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [guildId],
    );
  }

  async function getMostRecentVote(guildId) {
    return db.queryOne(
      `
      SELECT *
      FROM votes
      WHERE guild_id = ?
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [guildId],
    );
  }

  async function listRecentVotes(guildId, limit) {
    return db.queryAll(
      `
      SELECT *
      FROM votes
      WHERE guild_id = ?
      ORDER BY created_at DESC
      LIMIT ?
      `,
      [guildId, limit],
    );
  }

  async function closeVote(voteId, closedAt) {
    await db.execute(
      `
      UPDATE votes
      SET status = 'closed',
          updated_at = ?,
          closed_at = ?
      WHERE id = ?
      `,
      [closedAt, closedAt, voteId],
    );

    return getVoteById(voteId);
  }

  async function touchVote(voteId, updatedAt) {
    await db.execute('UPDATE votes SET updated_at = ? WHERE id = ?', [updatedAt, voteId]);
    return getVoteById(voteId);
  }

  async function getVoteResponse(voteId, userId) {
    return db.queryOne('SELECT * FROM vote_responses WHERE vote_id = ? AND user_id = ?', [voteId, userId]);
  }

  async function upsertVoteResponse(voteId, userId, choice, snapshotIngameName, snapshotMonPhai, timestamp) {
    const existing = await getVoteResponse(voteId, userId);

    if (!existing) {
      await db.execute(
        `
        INSERT INTO vote_responses (
          vote_id,
          user_id,
          choice,
          snapshot_ingame_name,
          snapshot_mon_phai,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [voteId, userId, choice, snapshotIngameName, snapshotMonPhai, timestamp, timestamp],
      );

      return {
        created: true,
        changed: true,
        previousChoice: null,
        response: await getVoteResponse(voteId, userId),
      };
    }

    if (
      existing.choice === choice
      && existing.snapshot_ingame_name === snapshotIngameName
      && existing.snapshot_mon_phai === snapshotMonPhai
    ) {
      return {
        created: false,
        changed: false,
        previousChoice: existing.choice,
        response: existing,
      };
    }

    await db.execute(
      `
      UPDATE vote_responses
      SET choice = ?,
          snapshot_ingame_name = ?,
          snapshot_mon_phai = ?,
          updated_at = ?
      WHERE vote_id = ? AND user_id = ?
      `,
      [choice, snapshotIngameName, snapshotMonPhai, timestamp, voteId, userId],
    );

    return {
      created: false,
      changed: true,
      previousChoice: existing.choice,
      response: await getVoteResponse(voteId, userId),
    };
  }

  async function getVoteSummary(voteId) {
    const summary = await db.queryOne(
      `
      SELECT
        SUM(CASE WHEN choice = 'join' THEN 1 ELSE 0 END) AS join_count,
        SUM(CASE WHEN choice = 'reserve' THEN 1 ELSE 0 END) AS reserve_count,
        SUM(CASE WHEN choice = 'absent' THEN 1 ELSE 0 END) AS absent_count,
        COUNT(*) AS total_count
      FROM vote_responses
      WHERE vote_id = ?
      `,
      [voteId],
    );

    return {
      joinCount: Number(summary?.join_count || 0),
      reserveCount: Number(summary?.reserve_count || 0),
      absentCount: Number(summary?.absent_count || 0),
      totalCount: Number(summary?.total_count || 0),
    };
  }

  async function getJoinMonPhaiBreakdown(voteId) {
    const rows = await db.queryAll(
      `
      SELECT
        COALESCE(member_profiles.mon_phai, vote_responses.snapshot_mon_phai) AS mon_phai,
        COUNT(*) AS member_count
      FROM vote_responses
      JOIN votes ON votes.id = vote_responses.vote_id
      LEFT JOIN member_profiles
        ON member_profiles.guild_id = votes.guild_id
       AND member_profiles.user_id = vote_responses.user_id
      WHERE vote_responses.vote_id = ?
        AND vote_responses.choice = 'join'
        AND COALESCE(member_profiles.mon_phai, vote_responses.snapshot_mon_phai) IS NOT NULL
      GROUP BY COALESCE(member_profiles.mon_phai, vote_responses.snapshot_mon_phai)
      HAVING COUNT(*) > 0
      ORDER BY member_count DESC, ${isMysql ? 'LOWER(mon_phai) ASC' : 'mon_phai COLLATE NOCASE ASC'}
      `,
      [voteId],
    );

    return rows.map((row) => ({
      monPhai: row.mon_phai,
      count: Number(row.member_count),
    }));
  }

  async function listAttendanceForVote(voteId) {
    const rows = await db.queryAll(
      `
      SELECT
        vote_responses.user_id AS discord_user_id,
        COALESCE(member_profiles.ingame_name, vote_responses.snapshot_ingame_name) AS ingame_name,
        COALESCE(member_profiles.mon_phai, vote_responses.snapshot_mon_phai) AS mon_phai,
        vote_responses.choice AS choice,
        vote_responses.snapshot_ingame_name AS snapshot_ingame_name,
        vote_responses.snapshot_mon_phai AS snapshot_mon_phai
      FROM vote_responses
      JOIN votes ON votes.id = vote_responses.vote_id
      LEFT JOIN member_profiles
        ON member_profiles.guild_id = votes.guild_id
       AND member_profiles.user_id = vote_responses.user_id
      WHERE vote_responses.vote_id = ?
      ORDER BY
        CASE vote_responses.choice
          WHEN 'join' THEN 1
          WHEN 'reserve' THEN 2
          ELSE 3
        END,
        ${noCaseOrder('ingame_name')},
        discord_user_id ASC
      `,
      [voteId],
    );

    return rows.map((row) => ({
      discordUserId: row.discord_user_id,
      ingameName: row.ingame_name,
      monPhai: row.mon_phai,
      choice: row.choice,
      snapshotIngameName: row.snapshot_ingame_name,
      snapshotMonPhai: row.snapshot_mon_phai,
    }));
  }

  return {
    getGuildSettings,
    setGuildAttendanceChannel,
    setGuildMemberRole,
    setGuildAdminRole,
    getMemberProfile,
    findMemberProfileByIngameName,
    findMemberProfileByGameId,
    listMemberProfiles,
    upsertMemberProfile,
    setMemberProfileBankQr,
    removeMemberProfileBankQr,
    upsertMemberProfiles,
    createVote,
    deleteVote,
    updateVoteMessageId,
    getVoteById,
    getVoteByIdForGuild,
    getOpenVote,
    getMostRecentVote,
    listRecentVotes,
    closeVote,
    touchVote,
    getVoteResponse,
    upsertVoteResponse,
    getVoteSummary,
    getJoinMonPhaiBreakdown,
    listAttendanceForVote,
  };
}

module.exports = {
  createRepositories,
};
