const { nowIso } = require('../utils/time');

const HISTORY_DEFAULT_LIMIT = 5;
const HISTORY_MAX_LIMIT = 20;

function createVoteService(repositories) {
  function getVoteSummary(voteId) {
    return repositories.getVoteSummary(voteId);
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

    saveMemberChoice(voteId, userId, choice) {
      const timestamp = nowIso();
      const result = repositories.upsertVoteResponse(voteId, userId, choice, timestamp);

      let vote = repositories.getVoteById(voteId);
      if (result.changed) {
        vote = repositories.touchVote(voteId, timestamp);
      }

      return {
        ...result,
        vote,
        summary: repositories.getVoteSummary(voteId),
      };
    },

    closeVote(voteId) {
      const vote = repositories.closeVote(voteId, nowIso());
      return {
        vote,
        summary: repositories.getVoteSummary(voteId),
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

    listVoteHistory(guildId, limit) {
      const safeLimit = Math.max(1, Math.min(limit || HISTORY_DEFAULT_LIMIT, HISTORY_MAX_LIMIT));
      return repositories.listRecentVotes(guildId, safeLimit);
    },
  };
}

module.exports = {
  HISTORY_DEFAULT_LIMIT,
  HISTORY_MAX_LIMIT,
  createVoteService,
};
