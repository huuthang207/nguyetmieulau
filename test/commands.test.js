const test = require('node:test');
const assert = require('node:assert/strict');
const { commands, commandMap } = require('../src/commands');
const { buildVoteMessagePayload, buildHistoryEmbed } = require('../src/services/vote-embed-service');
const profileCommand = require('../src/commands/profile');

function createVote(status = 'open') {
  return {
    id: 12,
    title: 'Bang Chiến tối nay',
    event_time: '20:00 05/07/2026',
    description: 'Điểm danh để sắp đội hình',
    status,
    updated_at: '2026-07-05T12:42:00.000Z',
  };
}

test('command registry exposes all slash commands', () => {
  assert.equal(commands.length, 6);
  assert.ok(commandMap.has('vote-config'));
  assert.ok(commandMap.has('vote-tao'));
  assert.ok(commandMap.has('vote-dong'));
  assert.ok(commandMap.has('vote-xem'));
  assert.ok(commandMap.has('vote-lich-su'));
  assert.ok(commandMap.has('profile'));
  assert.equal(profileCommand.data.name, 'profile');
});

test('vote message payload includes details button and keeps it enabled when vote is closed', () => {
  const payload = buildVoteMessagePayload(createVote('closed'), {
    joinCount: 5,
    reserveCount: 2,
    absentCount: 1,
    totalCount: 8,
    joinMonPhaiBreakdown: [{ monPhai: 'Tố Vấn', count: 5 }],
  });

  assert.equal(payload.embeds.length, 1);
  assert.equal(payload.components.length, 1);
  assert.equal(payload.components[0].components.length, 4);

  const [joinButton, reserveButton, absentButton, detailsButton] = payload.components[0].components;
  assert.equal(joinButton.data.disabled, true);
  assert.equal(reserveButton.data.disabled, true);
  assert.equal(absentButton.data.disabled, true);
  assert.equal(detailsButton.data.disabled, false);
  assert.equal(detailsButton.data.label, 'Xem chi tiết');
});

test('history embed renders vote list lines', () => {
  const embed = buildHistoryEmbed([
    createVote('closed'),
    { ...createVote('open'), id: 13, title: 'Công thành cuối tuần', event_time: '21:00 12/07/2026' },
  ]);

  assert.match(embed.data.description, /#12 - Bang Chiến tối nay - closed - 20:00 05\/07\/2026/);
  assert.match(embed.data.description, /#13 - Công thành cuối tuần - open - 21:00 12\/07\/2026/);
});
