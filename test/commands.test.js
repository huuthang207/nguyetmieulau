const test = require('node:test');
const assert = require('node:assert/strict');
const { commands, commandMap } = require('../src/commands');
const { buildVoteMessagePayload, buildHistoryEmbed } = require('../src/services/vote-embed-service');

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
  assert.equal(commands.length, 5);
  assert.ok(commandMap.has('vote-config'));
  assert.ok(commandMap.has('vote-tao'));
  assert.ok(commandMap.has('vote-dong'));
  assert.ok(commandMap.has('vote-xem'));
  assert.ok(commandMap.has('vote-lich-su'));
});

test('vote message payload includes disabled buttons when vote is closed', () => {
  const payload = buildVoteMessagePayload(createVote('closed'), {
    joinCount: 5,
    reserveCount: 2,
    absentCount: 1,
    totalCount: 8,
  });

  assert.equal(payload.embeds.length, 1);
  assert.equal(payload.components.length, 1);
  for (const component of payload.components[0].components) {
    assert.equal(component.data.disabled, true);
  }
});

test('history embed renders vote list lines', () => {
  const embed = buildHistoryEmbed([
    createVote('closed'),
    { ...createVote('open'), id: 13, title: 'Công thành cuối tuần', event_time: '21:00 12/07/2026' },
  ]);

  assert.match(embed.data.description, /#12 - Bang Chiến tối nay - closed - 20:00 05\/07\/2026/);
  assert.match(embed.data.description, /#13 - Công thành cuối tuần - open - 21:00 12\/07\/2026/);
});
