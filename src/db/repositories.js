function createRepositories(db) {
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

    upsertVoteResponse(voteId, userId, choice, timestamp) {
      const existing = this.getVoteResponse(voteId, userId);

      if (!existing) {
        db.prepare(
          `
          INSERT INTO vote_responses (vote_id, user_id, choice, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
          `,
        ).run(voteId, userId, choice, timestamp, timestamp);

        return {
          created: true,
          changed: true,
          previousChoice: null,
          response: this.getVoteResponse(voteId, userId),
        };
      }

      if (existing.choice === choice) {
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
        SET choice = ?, updated_at = ?
        WHERE vote_id = ? AND user_id = ?
        `,
      ).run(choice, timestamp, voteId, userId);

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
  };
}

module.exports = {
  createRepositories,
};
