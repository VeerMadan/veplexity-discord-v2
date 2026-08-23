import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { allCommandsList } from './src/commands/index.js';

const CLIENT_ID = process.env.CLIENT_ID?.replace(/['"]/g, '').trim();
const GUILD_ID = process.env.GUILD_ID?.replace(/['"]/g, '').trim();
const TOKEN = process.env.DISCORD_TOKEN?.replace(/['"]/g, '').trim();

if (!TOKEN || !CLIENT_ID) {
  console.error('❌ Missing DISCORD_TOKEN or CLIENT_ID in environment!');
  process.exit(1);
}

const commandsData = allCommandsList.map(cmd => ({
  name: cmd.name,
  description: cmd.description || 'Command',
  options: cmd.options || []
}));

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log(`🚀 Registering ${commandsData.length} slash commands...`);
    console.log(`- CLIENT_ID: ${CLIENT_ID}`);
    console.log(`- GUILD_ID: ${GUILD_ID || '(Global registration)'}`);

    if (GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commandsData }
      );
      console.log(`✅ Successfully registered ${commandsData.length} guild commands to guild ${GUILD_ID}!`);
    } else {
      await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: commandsData }
      );
      console.log(`✅ Successfully registered ${commandsData.length} global commands!`);
    }
  } catch (error) {
    console.error('❌ Failed to register commands:', error);
  }
})();