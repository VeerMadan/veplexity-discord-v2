import 'dotenv/config';
import dns from 'node:dns'; 

// 🔧 CRITICAL FIX: Force Node.js to use IPv4
dns.setDefaultResultOrder('ipv4first');

import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { Player } from 'discord-player';
import { YoutubeiExtractor } from 'discord-player-youtubei';
import { DefaultExtractors } from '@discord-player/extractor'; // 👈 Safety net added back

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
  ],
});

client.commands = new Collection();

// 🔧 Initialize Discord Player
const player = new Player(client);

// 🔧 1. Register Youtubei Extractor as the main engine
player.extractors.register(YoutubeiExtractor, {}).then(() => {
  console.log("✅ Youtubei Extractor loaded successfully.");
}).catch(console.error);

// 🔧 2. Load Fallback Extractors (Spotify, SoundCloud) so it can bridge streams if YouTube blocks Azure
player.extractors.loadMulti(DefaultExtractors).then(() => {
  console.log("✅ Fallback extractors loaded.");
}).catch(console.error);

// 🔧 3. Catch internal audio errors so the bot doesn't throw warnings
player.events.on('error', (queue, error) => {
    console.log(`[Player Error] ${error.message}`);
});
player.events.on('playerError', (queue, error) => {
    console.log(`[Audio Stream Error] ${error.message}`);
});

// 🔧 Listen for songs starting
player.events.on('playerStart', (queue, track) => {
    queue.metadata.channel.send(`▶️ Now playing: **${track.title}**`).catch(console.error);
});

client.once('ready', () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  // Handle Slash Commands
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    return interaction.reply('❌ Command not found');
  }

  try {
    await command.execute(interaction, client);
  } catch (err) {
    console.error(err);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: '❌ Error executing command', ephemeral: true });
    } else {
      await interaction.reply({ content: '❌ Error executing command', ephemeral: true });
    }
  }
});

import fs from 'fs';
import path from 'path';

async function loadCommands(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);

    if (fs.statSync(fullPath).isDirectory()) {
      await loadCommands(fullPath);
    } else if (file.endsWith('.js')) {
      const imported = await import(`file://${path.resolve(fullPath)}`);
      const command = imported.default;

      console.log('LOADING:', file, command?.name || 'Unknown');

      if (!command || !command.name) {
        console.log('❌ INVALID COMMAND FILE:', file);
        continue;
      }

      client.commands.set(command.name, command);
    }
  }
}

await loadCommands('./commands');
 
import express from 'express';

const app = express();
app.get('/', (req, res) => res.send('VePlexity Bot Online 🚀'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Health server running on port ${PORT}`);
});

// 🔧 BULLETPROOF LOGIN LOGIC
console.log("🔄 Attempting to authenticate with Discord...");

if (!process.env.DISCORD_TOKEN) {
  console.error("❌ CRITICAL ERROR: DISCORD_TOKEN is missing in Environment Variables!");
} else {
  const cleanToken = process.env.DISCORD_TOKEN.replace(/['"]/g, '').trim();
  client.login(cleanToken)
    .then(() => console.log("✅ Authentication request successfully sent to Discord!"))
    .catch(err => console.error("❌ FATAL LOGIN ERROR:", err));
}