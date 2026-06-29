import 'dotenv/config';
import dns from 'node:dns'; 

// 🔧 CRITICAL FIX: Force Node.js to use IPv4 to prevent Render's network from swallowing the Discord login request
dns.setDefaultResultOrder('ipv4first');

import { Client, GatewayIntentBits, Collection, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Player } from 'discord-player'; 
import { DefaultExtractors } from '@discord-player/extractor';

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

// 🔧 Load Extractors safely so a bad cookie can't freeze the bot startup
try {
  await player.extractors.loadMulti(DefaultExtractors, {
    youtube: {
      cookie: process.env.YOUTUBE_COOKIE?.trim() ?? ""
    }
  });

  console.log("✅ Audio extractors loaded.");

  console.log("========== LOADED EXTRACTORS ==========");

  for (const extractor of player.extractors.store.values()) {
    console.log("-", extractor.identifier);
  }

  console.log("======================================");

} catch (err) {
  console.error("Extractor Error:", err);
}

// 🔧 Send Premium Playback Buttons when a song starts
player.events.on('playerStart', async (queue, track) => {

  player.events.on('playerError', (queue, error) => {
  console.error('❌ PLAYER ERROR:', error);
});

player.events.on('error', (queue, error) => {
  console.error('❌ QUEUE ERROR:', error);
});

player.events.on('disconnect', (queue) => {
  console.log('🔌 Player disconnected from voice channel.');
});

  console.log("🎵 PLAYER START EVENT");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('pause_play')
      .setLabel('⏯️ Pause/Resume')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('skip_track')
      .setLabel('⏭️ Skip')
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId('stop_track')
      .setLabel('⏹️ Stop')
      .setStyle(ButtonStyle.Danger)
  );

  if (queue.metadata) {
    await queue.metadata.send({
      content: `▶️ Now playing: **${track.title}**`,
      components: [row],
    });
  }

});

// 🔧 Corrected ready event for discord.js v14
client.once('ready', () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  // 🔧 1. Handle Autocomplete Suggestions
  if (interaction.isAutocomplete()) {
    const query = interaction.options.getString('query');
    if (!query) return interaction.respond([]);
    
    const results = await player.search(query);
    const tracks = results.tracks.slice(0, 5).map((t) => ({
      name: `${t.title} - ${t.author}`.slice(0, 100),
      value: t.url
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

  // 🔧 3. Handle Standard Commands
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

// 🔧 TURN ON DISCORD NETWORK LOGS
client.on('debug', console.log);

if (!process.env.DISCORD_TOKEN) {
  console.error("❌ CRITICAL ERROR: DISCORD_TOKEN is missing in Render Environment Variables!");
} else {
  const cleanToken = process.env.DISCORD_TOKEN.replace(/['"]/g, '').trim();
  
  client.login(cleanToken)
    .then(() => console.log("✅ Authentication request successfully sent to Discord!"))
    .catch(err => console.error("❌ FATAL LOGIN ERROR:", err));
}