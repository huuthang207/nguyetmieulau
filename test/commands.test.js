const test = require('node:test');
const assert = require('node:assert/strict');
const { commands, commandMap } = require('../src/commands');
const { buildVoteMessagePayload, buildHistoryEmbed } = require('../src/services/vote-embed-service');
const configCommand = require('../src/commands/config');
const helpCommand = require('../src/commands/help');
const memberCommand = require('../src/commands/member');
const voteCommand = require('../src/commands/vote');

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

function subcommandNames(command) {
  return command.data.options.map((option) => option.name);
}

test('command registry exposes grouped slash commands only', () => {
  assert.equal(commands.length, 4);
  assert.deepEqual([...commandMap.keys()], ['help', 'config', 'vote', 'member']);
  assert.equal(helpCommand.data.name, 'help');
  assert.equal(configCommand.data.name, 'config');
  assert.equal(voteCommand.data.name, 'vote');
  assert.equal(memberCommand.data.name, 'member');

  for (const oldCommand of ['vote-config', 'vote-tao', 'vote-dong', 'vote-xem', 'vote-lich-su', 'profile', 'member-panel']) {
    assert.equal(commandMap.has(oldCommand), false);
  }
});

test('grouped command definitions expose expected subcommands', () => {
  assert.deepEqual(subcommandNames(configCommand), ['channel', 'member-role', 'admin-role']);
  assert.deepEqual(subcommandNames(voteCommand), ['create', 'close', 'view', 'history', 'export']);
  assert.deepEqual(subcommandNames(memberCommand), [
    'panel',
    'view',
    'set-qr',
    'remove-qr',
    'view-other',
    'set-other',
    'import',
    'export',
  ]);
  assert.equal(helpCommand.data.options[0].name, 'topic');
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

  const breakdownField = payload.embeds[0].data.fields.find((field) => field.name === 'Tham Gia theo môn phái');
  assert.match(breakdownField?.value, /Tố Vấn: 5/);
});

test('history embed renders vote list lines', () => {
  const embed = buildHistoryEmbed([
    createVote('closed'),
    { ...createVote('open'), id: 13, title: 'Công thành cuối tuần', event_time: '21:00 12/07/2026' },
  ]);

  assert.match(embed.data.description, /#12 - Bang Chiến tối nay - closed - 20:00 05\/07\/2026/);
  assert.match(embed.data.description, /#13 - Công thành cuối tuần - open - 21:00 12\/07\/2026/);
});
