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

async function createSqliteDatabase() {
  return createDatabase({
    databaseClient: 'sqlite',
    databasePath: createTempDatabasePath(),
  });
}

test('resolveVoteForView returns the most recent historical vote when no open vote exists', async () => {
  const db = await createSqliteDatabase();
  const repositories = createRepositories(db);
  const voteService = createVoteService(repositories);

  const voteA = await voteService.createVote({
    guildId: 'guild-view',
    channelId: 'channel-1',
    title: 'Vote A',
    eventTime: 'slot-a',
    description: null,
    createdBy: 'admin',
  });
  await voteService.closeVote(voteA.id);

  const voteB = await voteService.createVote({
    guildId: 'guild-view',
    channelId: 'channel-1',
    title: 'Vote B',
    eventTime: 'slot-b',
    description: null,
    createdBy: 'admin',
  });
  await repositories.updateVoteMessageId(voteB.id, null);
  await voteService.closeVote(voteB.id);

  const resolved = await voteService.resolveVoteForView('guild-view');

  assert.equal(resolved.vote.id, voteB.id);
  assert.equal(resolved.vote.title, 'Vote B');

  await db.close();
});
