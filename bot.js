import 'dotenv/config';
import dns from 'node:dns'; 
import ffmpeg from 'ffmpeg-static'; // 👈 1. Import the FFmpeg package

// 🔧 CRITICAL FIX: Tell the audio engine EXACTLY where FFmpeg is located on the Azure server
process.env.FFMPEG_PATH = ffmpeg;

// 🔧 CRITICAL FIX: Force Node.js to use IPv4
dns.setDefaultResultOrder('ipv4first');

import { Client, GatewayIntentBits, Collection, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Player } from 'discord-player';
import { YoutubeiExtractor } from 'discord-player-youtubei';
import { DefaultExtractors } from '@discord-player/extractor';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
  ],
});

client.commands = new Collection();

// 🔧 Initialize Discord Player AND Force it to use FFmpeg
const player = new Player(client, {
    skipFFmpeg: false 
});

player.extractors.register(YoutubeiExtractor, {
  streamOptions: { useClient: 'WEB' }
}).catch(console.error);

player.extractors.loadMulti(DefaultExtractors).then(() => {
  console.log("✅ Fallback extractors loaded.");
}).catch(console.error);

// 🔧 DEBUG LISTENERS
player.events.on('debug', (queue, message) => console.log(`[QUEUE] ${message}`));
player.on('debug', (message) => console.log(`[CORE] ${message}`));
player.events.on('error', (queue, error) => console.log(`[Player Error] ${error.message}`));
player.events.on('playerError', (queue, error) => console.log(`[Audio Error] ${error.message}`));

// 🔧 UI: Send Buttons when a song starts!
player.events.on('playerStart', (queue, track) => {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('pause_play').setLabel('⏯️ Pause/Resume').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('skip_track').setLabel('⏭️ Skip').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('stop_track').setLabel('⏹️ Stop').setStyle(ButtonStyle.Danger)
    );

    queue.metadata.channel.send({
      content: `▶️ Now playing: **${track.title}**`,
      components: [row]
    }).catch(console.error);
});

client.once('clientReady', () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  // 🔧 1. Handle Autocomplete for /play
  if (interaction.isAutocomplete()) {
    const query = interaction.options.getString('query');
    if (!query) return interaction.respond([]);
    
    const results = await player.search(query, { searchEngine: 'soundcloudSearch' });
    const tracks = results.tracks.slice(0, 10).map((t) => ({
      name: `${t.title} - ${t.author}`.slice(0, 100),
      value: t.title.slice(0, 100)
    }));
    return interaction.respond(tracks);
  }

  // 🔧 2. Handle Button Clicks
  if (interaction.isButton()) {
    const queue = player.nodes.get(interaction.guildId);
    if (!queue) return interaction.reply({ content: '❌ Nothing is playing.', ephemeral: true });

    await interaction.deferUpdate();
    if (interaction.customId === 'pause_play') queue.node.setPaused(!queue.node.isPaused());
    if (interaction.customId === 'skip_track') queue.node.skip();
    if (interaction.customId === 'stop_track') queue.delete();
    return;
  }

  // 🔧 3. Handle Standard Slash Commands
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return interaction.reply('❌ Command not found');

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
      if (!command || !command.name) continue;
      client.commands.set(command.name, command);
      console.log('LOADING:', file, command.name);
    }
  }
}

await loadCommands('./commands');
 
import express from 'express';
const app = express();
app.get('/', (req, res) => res.send('VePlexity Bot Online 🚀'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Health server running on port ${PORT}`));

console.log("🔄 Attempting to authenticate with Discord...");
if (!process.env.DISCORD_TOKEN) {
  console.error("❌ CRITICAL ERROR: DISCORD_TOKEN is missing!");
} else {
  client.login(process.env.DISCORD_TOKEN.replace(/['"]/g, '').trim())
    .then(() => console.log("✅ Authentication request successfully sent to Discord!"))
    .catch(err => console.error("❌ FATAL LOGIN ERROR:", err));
}