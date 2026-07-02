const { REST, Routes } = require('discord.js');
const { validateDeployEnv, env } = require('../src/config/env');
const { commands } = require('../src/commands');

validateDeployEnv();

const rest = new REST().setToken(env.botToken);
const body = commands.map((command) => command.data.toJSON());

async function deployCommands() {
  const route = env.testGuildId
    ? Routes.applicationGuildCommands(env.clientId, env.testGuildId)
    : Routes.applicationCommands(env.clientId);

  await rest.put(route, { body });
  console.log(`Deployed ${body.length} slash commands.`);
}

deployCommands().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
