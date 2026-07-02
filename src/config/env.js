const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config();

const databasePath = process.env.DATABASE_PATH || './data/attendance-bot.sqlite';

const env = {
  botToken: process.env.BOT_TOKEN || '',
  clientId: process.env.CLIENT_ID || '',
  testGuildId: process.env.TEST_GUILD_ID || '',
  databasePath: path.resolve(process.cwd(), databasePath),
};

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

function validateRuntimeEnv() {
  requireEnv('BOT_TOKEN', env.botToken);
}

function validateDeployEnv() {
  requireEnv('BOT_TOKEN', env.botToken);
  requireEnv('CLIENT_ID', env.clientId);
}

module.exports = {
  env,
  validateRuntimeEnv,
  validateDeployEnv,
};
