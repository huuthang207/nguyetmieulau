const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config();

const databasePath = process.env.DATABASE_PATH || './data/attendance-bot.sqlite';
const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.JDBC_DATABASE_URL || '';
const explicitDatabaseClient = process.env.DATABASE_CLIENT || '';
const databaseClient = explicitDatabaseClient || (databaseUrl ? 'mysql' : 'sqlite');
const mysqlSsl = process.env.MYSQL_SSL;
const mysqlSslRejectUnauthorized = process.env.MYSQL_SSL_REJECT_UNAUTHORIZED;

const env = {
  botToken: process.env.BOT_TOKEN || '',
  clientId: process.env.CLIENT_ID || '',
  testGuildId: process.env.TEST_GUILD_ID || '',
  databaseClient,
  databasePath: path.resolve(process.cwd(), databasePath),
  databaseUrl,
  mysqlSsl: mysqlSsl == null ? null : ['1', 'true', 'yes', 'on'].includes(mysqlSsl.toLowerCase()),
  mysqlSslRejectUnauthorized: mysqlSslRejectUnauthorized == null
    ? null
    : ['1', 'true', 'yes', 'on'].includes(mysqlSslRejectUnauthorized.toLowerCase()),
};

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

function validateDatabaseEnv() {
  if (!['sqlite', 'mysql'].includes(env.databaseClient)) {
    throw new Error('DATABASE_CLIENT must be either `sqlite` or `mysql`.');
  }

  if (env.databaseClient === 'mysql') {
    requireEnv('DATABASE_URL or MYSQL_URL or JDBC_DATABASE_URL', env.databaseUrl);
  }
}

function validateRuntimeEnv() {
  requireEnv('BOT_TOKEN', env.botToken);
  validateDatabaseEnv();
}

function validateDeployEnv() {
  requireEnv('BOT_TOKEN', env.botToken);
  requireEnv('CLIENT_ID', env.clientId);
}

module.exports = {
  env,
  validateRuntimeEnv,
  validateDeployEnv,
  validateDatabaseEnv,
};
