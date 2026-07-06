const { nowIso } = require('../utils/time');

const HISTORY_DEFAULT_LIMIT = 5;
const HISTORY_MAX_LIMIT = 20;

function createVoteService(repositories) {
  function getVoteSummary(voteId) {
    return {
      ...repositories.getVoteSummary(voteId),
      joinMonPhaiBreakdown: repositories.getJoinMonPhaiBreakdown(voteId),
    };
  }

  function getVoteWithSummary(vote) {
    if (!vote) {
      return null;
    }

    return {
      vote,
      summary: getVoteSummary(vote.id),
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

  return {
    HISTORY_DEFAULT_LIMIT,
    HISTORY_MAX_LIMIT,

    getOpenVote(guildId) {
      return repositories.getOpenVote(guildId);
    },

    getVoteByIdForGuild(guildId, voteId) {
      return repositories.getVoteByIdForGuild(guildId, voteId);
    },

    getMostRecentVote(guildId) {
      return repositories.getMostRecentVote(guildId);
    },

    getVoteSummary,
    getVoteWithSummary,

    createVote({ guildId, channelId, title, eventTime, description, createdBy }) {
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

    deleteVote(voteId) {
      repositories.deleteVote(voteId);
    },

    updateVoteMessageId(voteId, messageId) {
      return repositories.updateVoteMessageId(voteId, messageId);
    },

    saveMemberChoice(voteId, userId, choice, profile) {
      const timestamp = nowIso();
      const result = repositories.upsertVoteResponse(
        voteId,
        userId,
        choice,
        profile.ingame_name,
        profile.mon_phai,
        timestamp,
      );

      let vote = repositories.getVoteById(voteId);
      if (result.changed) {
        vote = repositories.touchVote(voteId, timestamp);
      }

      return {
        ...result,
        vote,
        summary: getVoteSummary(voteId),
      };
    },

    closeVote(voteId) {
      const vote = repositories.closeVote(voteId, nowIso());
      return {
        vote,
        summary: getVoteSummary(voteId),
      };
    },

    resolveVoteForView(guildId, voteId) {
      if (voteId) {
        return getVoteWithSummary(repositories.getVoteByIdForGuild(guildId, voteId));
      }

      const openVote = repositories.getOpenVote(guildId);
      if (openVote) {
        return getVoteWithSummary(openVote);
      }

      return getVoteWithSummary(repositories.getMostRecentVote(guildId));
    },

    getVoteDetailsForView(guildId, voteId) {
      const vote = repositories.getVoteByIdForGuild(guildId, voteId);
      if (!vote) {
        return null;
      }

      const items = repositories.listAttendanceForVote(vote.id);
      return {
        vote,
        summary: getVoteSummary(vote.id),
        details: buildVoteDetails(items),
      };
    },

    resolveVoteForExport(guildId, voteId) {
      if (voteId) {
        return repositories.getVoteByIdForGuild(guildId, voteId);
      }

      return repositories.getOpenVote(guildId);
    },

    listVoteHistory(guildId, limit) {
      const safeLimit = Math.max(1, Math.min(limit || HISTORY_DEFAULT_LIMIT, HISTORY_MAX_LIMIT));
      return repositories.listRecentVotes(guildId, safeLimit);
    },

    exportAttendance(guildId, voteId) {
      const vote = this.resolveVoteForExport(guildId, voteId);
      if (!vote) {
        return null;
      }

      return {
        vote,
        items: repositories.listAttendanceForVote(vote.id),
      };
    },
  };
}

module.exports = {
  HISTORY_DEFAULT_LIMIT,
  HISTORY_MAX_LIMIT,
  createVoteService,
};
