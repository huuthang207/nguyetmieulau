const helpCommand = require('./help');
const configCommand = require('./config');
const voteCommand = require('./vote');
const memberCommand = require('./member');

const commands = [
  helpCommand,
  configCommand,
  voteCommand,
  memberCommand,
];

const commandMap = new Map(commands.map((command) => [command.data.name, command]));

module.exports = {
  commands,
  commandMap,
};
