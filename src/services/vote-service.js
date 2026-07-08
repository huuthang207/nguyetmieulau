const { nowIso } = require('../utils/time');

const HISTORY_DEFAULT_LIMIT = 5;
const HISTORY_MAX_LIMIT = 20;

function createVoteService(repositories) {
  async function getVoteSummary(voteId) {
    return {
      ...await repositories.getVoteSummary(voteId),
      joinMonPhaiBreakdown: await repositories.getJoinMonPhaiBreakdown(voteId),
    };
  }

  async function getVoteWithSummary(vote) {
    if (!vote) {
      return null;
    }

    return {
      vote,
      summary: await getVoteSummary(vote.id),
    };
  }

  function buildDisplayName(item) {
    return item.ingameName || `<@${item.discordUserId}>`;
  }

  function buildVoteDetails(items) {
    const joinGroupsByMonPhai = new Map();
    const reserveNames = [];
    const absentNames = [];

    for (const item of items) {
      const displayName = buildDisplayName(item);

      if (item.choice === 'join') {
        const monPhai = item.monPhai || 'Chưa rõ môn phái';
        const existingGroup = joinGroupsByMonPhai.get(monPhai);

        if (existingGroup) {
          existingGroup.names.push(displayName);
        } else {
          joinGroupsByMonPhai.set(monPhai, {
            monPhai,
            names: [displayName],
          });
        }

        continue;
      }

      if (item.choice === 'reserve') {
        reserveNames.push(displayName);
        continue;
      }

      absentNames.push(displayName);
    }

    const joinGroups = Array.from(joinGroupsByMonPhai.values())
      .map((group) => ({
        ...group,
        names: [...group.names].sort((left, right) => left.localeCompare(right, 'vi')),
        count: group.names.length,
      }))
      .sort((left, right) => {
        if (right.count !== left.count) {
          return right.count - left.count;
        }

        return left.monPhai.localeCompare(right.monPhai, 'vi');
      });

    return {
      joinGroups,
      reserveNames: reserveNames.sort((left, right) => left.localeCompare(right, 'vi')),
      absentNames: absentNames.sort((left, right) => left.localeCompare(right, 'vi')),
    };
  }

  async function resolveVoteForExport(guildId, voteId) {
    if (voteId) {
      return repositories.getVoteByIdForGuild(guildId, voteId);
    }

    return repositories.getOpenVote(guildId);
  }

  async function exportAttendance(guildId, voteId) {
    const vote = await resolveVoteForExport(guildId, voteId);
    if (!vote) {
      return null;
    }

    return {
      vote,
      items: await repositories.listAttendanceForVote(vote.id),
    };
  }

  return {
    HISTORY_DEFAULT_LIMIT,
    HISTORY_MAX_LIMIT,

    async getOpenVote(guildId) {
      return repositories.getOpenVote(guildId);
    },

    async getVoteByIdForGuild(guildId, voteId) {
      return repositories.getVoteByIdForGuild(guildId, voteId);
    },

    async getMostRecentVote(guildId) {
      return repositories.getMostRecentVote(guildId);
    },

    getVoteSummary,
    getVoteWithSummary,

    async createVote({ guildId, channelId, title, eventTime, description, createdBy }) {
      const timestamp = nowIso();
      return repositories.createVote({
        guildId,
        channelId,
        title,
        eventTime,
        description,
        createdBy,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    },

    async deleteVote(voteId) {
      await repositories.deleteVote(voteId);
    },

    async updateVoteMessageId(voteId, messageId) {
      return repositories.updateVoteMessageId(voteId, messageId);
    },

    async saveMemberChoice(voteId, userId, choice, profile) {
      const timestamp = nowIso();
      const result = await repositories.upsertVoteResponse(
        voteId,
        userId,
        choice,
        profile.ingame_name,
        profile.mon_phai,
        timestamp,
      );

      let vote = await repositories.getVoteById(voteId);
      if (result.changed) {
        vote = await repositories.touchVote(voteId, timestamp);
      }

      return {
        ...result,
        vote,
        summary: await getVoteSummary(voteId),
      };
    },

    async closeVote(voteId) {
      const vote = await repositories.closeVote(voteId, nowIso());
      return {
        vote,
        summary: await getVoteSummary(voteId),
      };
    },

    async resolveVoteForView(guildId, voteId) {
      if (voteId) {
        return getVoteWithSummary(await repositories.getVoteByIdForGuild(guildId, voteId));
      }

      const openVote = await repositories.getOpenVote(guildId);
      if (openVote) {
        return getVoteWithSummary(openVote);
      }

      return getVoteWithSummary(await repositories.getMostRecentVote(guildId));
    },

    async getVoteDetailsForView(guildId, voteId) {
      const vote = await repositories.getVoteByIdForGuild(guildId, voteId);
      if (!vote) {
        return null;
      }

      const items = await repositories.listAttendanceForVote(vote.id);
      return {
        vote,
        summary: await getVoteSummary(vote.id),
        details: buildVoteDetails(items),
      };
    },

    resolveVoteForExport,

    async listVoteHistory(guildId, limit) {
      const safeLimit = Math.max(1, Math.min(limit || HISTORY_DEFAULT_LIMIT, HISTORY_MAX_LIMIT));
      return repositories.listRecentVotes(guildId, safeLimit);
    },

    exportAttendance,
  };
}

module.exports = {
  HISTORY_DEFAULT_LIMIT,
  HISTORY_MAX_LIMIT,
  createVoteService,
};
