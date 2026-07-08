const { Client, GatewayIntentBits, Events } = require('discord.js');
const { env, validateRuntimeEnv } = require('./config/env');
const { createDatabase } = require('./db/database');
const { createRepositories } = require('./db/repositories');
const { createSettingsService } = require('./services/settings-service');
const { createVoteService } = require('./services/vote-service');
const { createProfileService } = require('./services/profile-service');
const { createDataExchangeService } = require('./services/data-exchange-service');
const { commandMap } = require('./commands');
const { handleVoteButton, handleVoteDetailSelect } = require('./interactions/vote-buttons');

async function main() {
  validateRuntimeEnv();

  const db = await createDatabase();
  const repositories = createRepositories(db);
  const profileService = createProfileService(repositories);
  const voteService = createVoteService(repositories);
  const services = {
    settingsService: createSettingsService(repositories),
    profileService,
    voteService,
    dataExchangeService: createDataExchangeService({
      repositories,
      profileService,
      voteService,
    }),
  };

  const context = {
    db,
    repositories,
    services,
  };

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  let shuttingDown = false;
  async function shutdown() {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    client.destroy();
    await db.close().catch(() => null);
  }

  process.once('SIGINT', () => {
    shutdown().finally(() => process.exit(0));
  });

  process.once('SIGTERM', () => {
    shutdown().finally(() => process.exit(0));
  });

  client.once(Events.ClientReady, (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}`);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isButton()) {
        const handled = await handleVoteButton(interaction, context);
        if (handled) {
          return;
        }
      }

      if (interaction.isStringSelectMenu()) {
        const handled = await handleVoteDetailSelect(interaction, context);
        if (handled) {
          return;
        }
      }

      if (!interaction.isChatInputCommand()) {
        return;
      }

      const command = commandMap.get(interaction.commandName);
      if (!command) {
        await interaction.reply({
          content: 'Lệnh này chưa được hỗ trợ.',
          ephemeral: true,
        });
        return;
      }

      await command.execute(interaction, context);
    } catch (error) {
      console.error(error);

      const response = {
        content: 'Đã xảy ra lỗi khi xử lý thao tác của bạn.',
        ephemeral: true,
      };

      if (interaction.isRepliable()) {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(response).catch(() => null);
        } else {
          await interaction.reply(response).catch(() => null);
        }
      }
    }
  });

  await client.login(env.botToken);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
