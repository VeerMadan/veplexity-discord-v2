import 'dotenv/config';
import dns from 'node:dns'; 

// 🔧 CRITICAL FIX: Force Node.js to use IPv4 to prevent Render's network from swallowing the Discord login request
dns.setDefaultResultOrder('ipv4first');

import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { Player } from 'discord-player';
import { YoutubeiExtractor } from 'discord-player-youtubei';
 
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
  ],
});

client.commands = new Collection();

// 🔧 Initialize Discord Player & Extractor Bypass
const player = new Player(client);

// 🔧 Register Youtubei Extractor WITHOUT the broken auth block
player.extractors.register(YoutubeiExtractor, {}).then(() => {
  console.log("✅ Youtubei Extractor loaded successfully.");
}).catch(console.error);

// 🔧 Listen for songs starting to send the "Now Playing" message automatically
player.events.on('playerStart', (queue, track) => {
    queue.metadata.channel.send(`▶️ Now playing: **${track.title}**`).catch(console.error);
});

// 🔧 Fix the deprecation warning while we are at it
client.once('clientReady', () => {
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
    await interaction.followUp({
      content: '❌ Error executing command',
      ephemeral: true,
    });
  } else {
    await interaction.reply({
      content: '❌ Error executing command',
      ephemeral: true,
    });
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

      console.log('LOADING:', file, command);

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

app.get('/', (req, res) => {
  res.send('VePlexity Bot Online 🚀');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🌐 Health server running on port ${PORT}`);
});

// 🔧 BULLETPROOF LOGIN LOGIC
console.log("🔄 Attempting to authenticate with Discord...");

if (!process.env.DISCORD_TOKEN) {
  console.error("❌ CRITICAL ERROR: DISCORD_TOKEN is missing in Render Environment Variables!");
} else {
  const cleanToken = process.env.DISCORD_TOKEN.replace(/['"]/g, '').trim();
  
  client.login(cleanToken)
    .then(() => console.log("✅ Authentication request successfully sent to Discord!"))
    .catch(err => console.error("❌ FATAL LOGIN ERROR:", err));
}