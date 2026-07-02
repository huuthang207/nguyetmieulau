const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createDatabase } = require('../src/db/database');
const { createRepositories } = require('../src/db/repositories');
const { createVoteService } = require('../src/services/vote-service');

function createTempDatabasePath() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'attendance-bot-view-test-'));
  return path.join(directory, 'test.sqlite');
}

test('resolveVoteForView returns the most recent historical vote when no open vote exists', () => {
  const db = createDatabase(createTempDatabasePath());
  const repositories = createRepositories(db);
  const voteService = createVoteService(repositories);

  const voteA = voteService.createVote({
    guildId: 'guild-view',
    channelId: 'channel-1',
    title: 'Vote A',
    eventTime: 'slot-a',
    description: null,
    createdBy: 'admin',
  });
  voteService.closeVote(voteA.id);

  const voteB = voteService.createVote({
    guildId: 'guild-view',
    channelId: 'channel-1',
    title: 'Vote B',
    eventTime: 'slot-b',
    description: null,
    createdBy: 'admin',
  });
  repositories.updateVoteMessageId(voteB.id, null);
  voteService.closeVote(voteB.id);

  const resolved = voteService.resolveVoteForView('guild-view');

  assert.equal(resolved.vote.id, voteB.id);
  assert.equal(resolved.vote.title, 'Vote B');

  db.close();
});
