function createRepositories(db) {
  function runInTransaction(callback) {
    db.exec('BEGIN');

    try {
      const result = callback();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  return {
    getGuildSettings(guildId) {
      return db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId) || null;
    },

    setGuildAttendanceChannel(guildId, channelId, updatedAt) {
      db.prepare(
        `
        INSERT INTO guild_settings (guild_id, attendance_channel_id, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(guild_id) DO UPDATE SET
          attendance_channel_id = excluded.attendance_channel_id,
          updated_at = excluded.updated_at
        `,
      ).run(guildId, channelId, updatedAt);

      return this.getGuildSettings(guildId);
    },

    setGuildMemberRole(guildId, roleId, updatedAt) {
      db.prepare(
        `
        INSERT INTO guild_settings (guild_id, member_role_id, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(guild_id) DO UPDATE SET
          member_role_id = excluded.member_role_id,
          updated_at = excluded.updated_at
        `,
      ).run(guildId, roleId, updatedAt);

      return this.getGuildSettings(guildId);
    },

    setGuildAdminRole(guildId, roleId, updatedAt) {
      db.prepare(
        `
        INSERT INTO guild_settings (guild_id, admin_role_id, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(guild_id) DO UPDATE SET
          admin_role_id = excluded.admin_role_id,
          updated_at = excluded.updated_at
        `,
      ).run(guildId, roleId, updatedAt);

      return this.getGuildSettings(guildId);
    },

    getMemberProfile(guildId, userId) {
      return db
        .prepare('SELECT * FROM member_profiles WHERE guild_id = ? AND user_id = ?')
        .get(guildId, userId) || null;
    },

    findMemberProfileByIngameName(guildId, ingameName) {
      return db
        .prepare('SELECT * FROM member_profiles WHERE guild_id = ? AND ingame_name = ?')
        .get(guildId, ingameName) || null;
    },

    listMemberProfiles(guildId) {
      return db
        .prepare(
          `
          SELECT *
          FROM member_profiles
          WHERE guild_id = ?
          ORDER BY ingame_name COLLATE NOCASE ASC, user_id ASC
          `,
        )
        .all(guildId);
    },

    upsertMemberProfile(guildId, userId, ingameName, monPhai, updatedAt) {
      db.prepare(
        `
        INSERT INTO member_profiles (guild_id, user_id, ingame_name, mon_phai, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(guild_id, user_id) DO UPDATE SET
          ingame_name = excluded.ingame_name,
          mon_phai = excluded.mon_phai,
          updated_at = excluded.updated_at
        `,
      ).run(guildId, userId, ingameName, monPhai, updatedAt);

      return this.getMemberProfile(guildId, userId);
    },

    upsertMemberProfiles(guildId, profiles, updatedAt) {
      return runInTransaction(() => {
        for (const profile of profiles) {
          db.prepare(
            `
            INSERT INTO member_profiles (guild_id, user_id, ingame_name, mon_phai, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(guild_id, user_id) DO UPDATE SET
              ingame_name = excluded.ingame_name,
              mon_phai = excluded.mon_phai,
              updated_at = excluded.updated_at
            `,
          ).run(guildId, profile.userId, profile.ingameName, profile.monPhai, updatedAt);
        }

        return this.listMemberProfiles(guildId);
      });
    },

    createVote({ guildId, channelId, title, eventTime, description, createdBy, createdAt, updatedAt }) {
      const result = db.prepare(
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
      ).run(guildId, channelId, title, eventTime, description, createdBy, createdAt, updatedAt);

      return this.getVoteById(result.lastInsertRowid);
    },

    deleteVote(voteId) {
      db.prepare('DELETE FROM votes WHERE id = ?').run(voteId);
    },

    updateVoteMessageId(voteId, messageId) {
      db.prepare('UPDATE votes SET message_id = ? WHERE id = ?').run(messageId, voteId);
      return this.getVoteById(voteId);
    },

    getVoteById(voteId) {
      return db.prepare('SELECT * FROM votes WHERE id = ?').get(voteId) || null;
    },

    getVoteByIdForGuild(guildId, voteId) {
      return db.prepare('SELECT * FROM votes WHERE guild_id = ? AND id = ?').get(guildId, voteId) || null;
    },

    getOpenVote(guildId) {
      return db
        .prepare(
          `
          SELECT *
          FROM votes
          WHERE guild_id = ? AND status = 'open'
          ORDER BY created_at DESC
          LIMIT 1
          `,
        )
        .get(guildId) || null;
    },

    getMostRecentVote(guildId) {
      return db
        .prepare(
          `
          SELECT *
          FROM votes
          WHERE guild_id = ?
          ORDER BY created_at DESC
          LIMIT 1
          `,
        )
        .get(guildId) || null;
    },

    listRecentVotes(guildId, limit) {
      return db
        .prepare(
          `
          SELECT *
          FROM votes
          WHERE guild_id = ?
          ORDER BY created_at DESC
          LIMIT ?
          `,
        )
        .all(guildId, limit);
    },

    closeVote(voteId, closedAt) {
      db.prepare(
        `
        UPDATE votes
        SET status = 'closed',
            updated_at = ?,
            closed_at = ?
        WHERE id = ?
        `,
      ).run(closedAt, closedAt, voteId);

      return this.getVoteById(voteId);
    },

    touchVote(voteId, updatedAt) {
      db.prepare('UPDATE votes SET updated_at = ? WHERE id = ?').run(updatedAt, voteId);
      return this.getVoteById(voteId);
    },

    getVoteResponse(voteId, userId) {
      return db
        .prepare('SELECT * FROM vote_responses WHERE vote_id = ? AND user_id = ?')
        .get(voteId, userId) || null;
    },

    upsertVoteResponse(voteId, userId, choice, snapshotIngameName, snapshotMonPhai, timestamp) {
      const existing = this.getVoteResponse(voteId, userId);

      if (!existing) {
        db.prepare(
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
        ).run(voteId, userId, choice, snapshotIngameName, snapshotMonPhai, timestamp, timestamp);

        return {
          created: true,
          changed: true,
          previousChoice: null,
          response: this.getVoteResponse(voteId, userId),
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

      db.prepare(
        `
        UPDATE vote_responses
        SET choice = ?,
            snapshot_ingame_name = ?,
            snapshot_mon_phai = ?,
            updated_at = ?
        WHERE vote_id = ? AND user_id = ?
        `,
      ).run(choice, snapshotIngameName, snapshotMonPhai, timestamp, voteId, userId);

      return {
        created: false,
        changed: true,
        previousChoice: existing.choice,
        response: this.getVoteResponse(voteId, userId),
      };
    },

    getVoteSummary(voteId) {
      const summary = db
        .prepare(
          `
          SELECT
            SUM(CASE WHEN choice = 'join' THEN 1 ELSE 0 END) AS join_count,
            SUM(CASE WHEN choice = 'reserve' THEN 1 ELSE 0 END) AS reserve_count,
            SUM(CASE WHEN choice = 'absent' THEN 1 ELSE 0 END) AS absent_count,
            COUNT(*) AS total_count
          FROM vote_responses
          WHERE vote_id = ?
          `,
        )
        .get(voteId);

      return {
        joinCount: Number(summary?.join_count || 0),
        reserveCount: Number(summary?.reserve_count || 0),
        absentCount: Number(summary?.absent_count || 0),
        totalCount: Number(summary?.total_count || 0),
      };
    },

    getJoinMonPhaiBreakdown(voteId) {
      const rows = db
        .prepare(
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
          ORDER BY member_count DESC, mon_phai COLLATE NOCASE ASC
          `,
        )
        .all(voteId);

      return rows.map((row) => ({
        monPhai: row.mon_phai,
        count: Number(row.member_count),
      }));
    },

    listAttendanceForVote(voteId) {
      const rows = db
        .prepare(
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
            ingame_name COLLATE NOCASE ASC,
            discord_user_id ASC
          `,
        )
        .all(voteId);

      return rows.map((row) => ({
        discordUserId: row.discord_user_id,
        ingameName: row.ingame_name,
        monPhai: row.mon_phai,
        choice: row.choice,
        snapshotIngameName: row.snapshot_ingame_name,
        snapshotMonPhai: row.snapshot_mon_phai,
      }));
    },
  };
}

module.exports = {
  createRepositories,
};
