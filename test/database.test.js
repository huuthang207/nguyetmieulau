const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createDatabase } = require('../src/db/database');
const { createRepositories } = require('../src/db/repositories');
const { createVoteService, HISTORY_MAX_LIMIT } = require('../src/services/vote-service');
const { createProfileService } = require('../src/services/profile-service');

function createTempDatabasePath() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'attendance-bot-test-'));
  return path.join(directory, 'test.sqlite');
}

async function createSqliteDatabase() {
  return createDatabase({
    databaseClient: 'sqlite',
    databasePath: createTempDatabasePath(),
  });
}

test('database migrations create required tables and support vote lifecycle', async () => {
  const db = await createSqliteDatabase();
  const repositories = createRepositories(db);
  const voteService = createVoteService(repositories);
  const profileService = createProfileService(repositories);

  await repositories.setGuildAdminRole('guild-1', 'admin-role', new Date().toISOString());
  await repositories.setGuildMemberRole('guild-1', 'member-role', new Date().toISOString());
  await repositories.setGuildAttendanceChannel('guild-1', 'channel-1', new Date().toISOString());

  const savedProfile = await profileService.saveProfile({
    guildId: 'guild-1',
    userId: 'member-1',
    ingameName: 'Thang207',
    gameId: 'gid-Thang207',
    monPhai: 'Tố Vấn',
  });
  assert.equal(savedProfile.ok, true);
  assert.equal(savedProfile.profile.game_id, 'gid-Thang207');

  const qrProfile = await repositories.setMemberProfileBankQr('guild-1', 'member-1', 'https://cdn.example/qr.png', new Date().toISOString());
  assert.equal(qrProfile.bank_qr_url, 'https://cdn.example/qr.png');
  const removedQrProfile = await repositories.removeMemberProfileBankQr('guild-1', 'member-1', new Date().toISOString());
  assert.equal(removedQrProfile.bank_qr_url, null);

  const duplicateGameId = await profileService.saveProfile({
    guildId: 'guild-1',
    userId: 'member-2',
    ingameName: 'OtherName',
    gameId: 'gid-Thang207',
    monPhai: 'Huyết Hà',
  });
  assert.equal(duplicateGameId.ok, false);
  assert.match(duplicateGameId.message, /game_id.*đã tồn tại/);

  const vote = await voteService.createVote({
    guildId: 'guild-1',
    channelId: 'channel-1',
    title: 'Bang Chiến tối nay',
    eventTime: '20:00 05/07/2026',
    description: null,
    createdBy: 'user-admin',
  });

  assert.equal(vote.status, 'open');
  assert.equal((await repositories.getOpenVote('guild-1')).id, vote.id);

  const firstChoice = await voteService.saveMemberChoice(vote.id, 'member-1', 'join', savedProfile.profile);
  assert.equal(firstChoice.created, true);
  assert.equal(firstChoice.summary.joinCount, 1);
  assert.equal(firstChoice.summary.totalCount, 1);
  assert.deepEqual(firstChoice.summary.joinMonPhaiBreakdown, [{ monPhai: 'Tố Vấn', count: 1 }]);

  const responseAfterFirstVote = await repositories.getVoteResponse(vote.id, 'member-1');
  assert.equal(responseAfterFirstVote.snapshot_ingame_name, 'Thang207');
  assert.equal(responseAfterFirstVote.snapshot_mon_phai, 'Tố Vấn');

  const changedChoice = await voteService.saveMemberChoice(vote.id, 'member-1', 'reserve', savedProfile.profile);
  assert.equal(changedChoice.created, false);
  assert.equal(changedChoice.changed, true);
  assert.equal(changedChoice.summary.joinCount, 0);
  assert.equal(changedChoice.summary.reserveCount, 1);

  const unchangedChoice = await voteService.saveMemberChoice(vote.id, 'member-1', 'reserve', savedProfile.profile);
  assert.equal(unchangedChoice.changed, false);

  const closed = await voteService.closeVote(vote.id);
  assert.equal(closed.vote.status, 'closed');
  assert.equal(await repositories.getOpenVote('guild-1'), null);

  await db.close();
});

test('vote history respects default ordering and max limit clamping', async () => {
  const db = await createSqliteDatabase();
  const repositories = createRepositories(db);
  const voteService = createVoteService(repositories);

  for (let index = 0; index < 25; index += 1) {
    const vote = await voteService.createVote({
      guildId: 'guild-2',
      channelId: 'channel-2',
      title: `Vote ${index + 1}`,
      eventTime: `slot-${index + 1}`,
      description: null,
      createdBy: 'user-admin',
    });

    await voteService.closeVote(vote.id);
  }

  const votes = await voteService.listVoteHistory('guild-2', 999);
  assert.equal(votes.length, HISTORY_MAX_LIMIT);
  assert.ok(votes[0].id > votes[votes.length - 1].id);

  await db.close();
});
