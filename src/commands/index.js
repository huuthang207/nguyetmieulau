const voteConfigCommand = require('./vote-config');
const voteCreateCommand = require('./vote-tao');
const voteCloseCommand = require('./vote-dong');
const voteViewCommand = require('./vote-xem');
const voteHistoryCommand = require('./vote-lich-su');
const profileCommand = require('./profile');

const commands = [
  voteConfigCommand,
  voteCreateCommand,
  voteCloseCommand,
  voteViewCommand,
  voteHistoryCommand,
  profileCommand,
];

const commandMap = new Map(commands.map((command) => [command.data.name, command]));

module.exports = {
  commands,
  commandMap,
};
