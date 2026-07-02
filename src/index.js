const { Client, GatewayIntentBits, Events } = require('discord.js');
const { env, validateRuntimeEnv } = require('./config/env');
const { createDatabase } = require('./db/database');
const { createRepositories } = require('./db/repositories');
const { createSettingsService } = require('./services/settings-service');
const { createVoteService } = require('./services/vote-service');
const { commandMap } = require('./commands');
const { handleVoteButton } = require('./interactions/vote-buttons');

validateRuntimeEnv();

const db = createDatabase();
const repositories = createRepositories(db);
const services = {
  settingsService: createSettingsService(repositories),
  voteService: createVoteService(repositories),
};

const context = {
  db,
  repositories,
  services,
};

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
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

client.login(env.botToken);
