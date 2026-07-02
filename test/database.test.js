const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createDatabase } = require('../src/db/database');
const { createRepositories } = require('../src/db/repositories');
const { createVoteService, HISTORY_MAX_LIMIT } = require('../src/services/vote-service');

function createTempDatabasePath() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'attendance-bot-test-'));
  return path.join(directory, 'test.sqlite');
}

test('database migrations create required tables and support vote lifecycle', () => {
  const databasePath = createTempDatabasePath();
  const db = createDatabase(databasePath);
  const repositories = createRepositories(db);
  const voteService = createVoteService(repositories);

  repositories.setGuildAdminRole('guild-1', 'admin-role', new Date().toISOString());
  repositories.setGuildMemberRole('guild-1', 'member-role', new Date().toISOString());
  repositories.setGuildAttendanceChannel('guild-1', 'channel-1', new Date().toISOString());

  const vote = voteService.createVote({
    guildId: 'guild-1',
    channelId: 'channel-1',
    title: 'Bang Chiến tối nay',
    eventTime: '20:00 05/07/2026',
    description: null,
    createdBy: 'user-admin',
  });

  assert.equal(vote.status, 'open');
  assert.equal(repositories.getOpenVote('guild-1').id, vote.id);

  const firstChoice = voteService.saveMemberChoice(vote.id, 'member-1', 'join');
  assert.equal(firstChoice.created, true);
  assert.equal(firstChoice.summary.joinCount, 1);
  assert.equal(firstChoice.summary.totalCount, 1);

  const changedChoice = voteService.saveMemberChoice(vote.id, 'member-1', 'reserve');
  assert.equal(changedChoice.created, false);
  assert.equal(changedChoice.changed, true);
  assert.equal(changedChoice.summary.joinCount, 0);
  assert.equal(changedChoice.summary.reserveCount, 1);

  const unchangedChoice = voteService.saveMemberChoice(vote.id, 'member-1', 'reserve');
  assert.equal(unchangedChoice.changed, false);

  const closed = voteService.closeVote(vote.id);
  assert.equal(closed.vote.status, 'closed');
  assert.equal(repositories.getOpenVote('guild-1'), null);

  db.close();
});

test('vote history respects default ordering and max limit clamping', () => {
  const databasePath = createTempDatabasePath();
  const db = createDatabase(databasePath);
  const repositories = createRepositories(db);
  const voteService = createVoteService(repositories);

  for (let index = 0; index < 25; index += 1) {
    const vote = voteService.createVote({
      guildId: 'guild-2',
      channelId: 'channel-2',
      title: `Vote ${index + 1}`,
      eventTime: `slot-${index + 1}`,
      description: null,
      createdBy: 'user-admin',
    });

    voteService.closeVote(vote.id);
  }

  const votes = voteService.listVoteHistory('guild-2', 999);
  assert.equal(votes.length, HISTORY_MAX_LIMIT);
  assert.ok(votes[0].id > votes[votes.length - 1].id);

  db.close();
});
