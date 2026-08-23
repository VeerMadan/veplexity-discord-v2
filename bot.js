import 'dotenv/config';
import dns from 'node:dns';
import express from 'express';
import cors from 'cors';
import { Client, GatewayIntentBits } from 'discord.js';
import { GoogleGenAI } from '@google/genai';
import ffmpeg from 'ffmpeg-static';
import commandsMap, { MODERATION_COMMAND_NAMES } from './src/commands/index.js';
import { hasModPerms, getRandomNoPermMessage } from './src/utils/helpers.js';
import db from './src/services/database.js';
import musicManager from './src/services/music/MusicManager.js';

// 🔧 Network & Process Configuration
if (ffmpeg) process.env.FFMPEG_PATH = ffmpeg;
dns.setDefaultResultOrder('ipv4first');

// 🛡️ ANTI-CRASH ARMOR: Keeps bot alive on unexpected network or API hiccups
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Anti-Crash] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err, origin) => {
  console.error('[Anti-Crash] Uncaught Exception:', err);
});

// 🤖 DISCORD CLIENT SETUP
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on('error', err => console.error(`[Discord Client Error] ${err.message}`));

// 🧠 MULTI-ENGINE AI CHATBOT SETUP (Groq / OpenRouter / Gemini with auto-fallback)
import { generateAiReply } from './src/services/aiService.js';
const channelMemory = new Map(); // channelId -> [{role, content}]
const chatbotCooldown = new Map(); // userId -> timestamp

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;
  if (!db.isChatbotEnabled(message.guildId)) return;
  if (!message.mentions.has(client.user)) return;

  const now = Date.now();
  const lastUsed = chatbotCooldown.get(message.author.id) || 0;
  if (now - lastUsed < 3000) return; // 3s cooldown
  chatbotCooldown.set(message.author.id, now);

  const question = message.content.replace(/<@!?\d+>/g, '').trim();
  if (!question) return;

  await message.channel.sendTyping().catch(() => {});

  const history = channelMemory.get(message.channelId) || [];

  try {
    const reply = await generateAiReply({
      prompt: question,
      history,
      maxTokens: 400
    });

    await message.reply(reply.slice(0, 2000));

    history.push({ role: 'user', content: question });
    history.push({ role: 'model', content: reply });
    channelMemory.set(message.channelId, history.slice(-10));
  } catch (error) {
    console.error('[Chatbot Error]', error.message);
    if (error.message === 'RATE_LIMITED') {
      return message.reply("⏳ Whoa, high traffic right now! Taking a quick 5-second breather.").catch(() => null);
    }
    await message.reply("Arey yaar, dimag thoda garam ho gaya tha! Ab bolo kya bol rahe the? 😌").catch(() => null);
  }
});

// ⚡ MASTER INTERACTION ROUTER
client.on('interactionCreate', async (interaction) => {
  // 1️⃣ AUTOCOMPLETE HANDLING
  if (interaction.isAutocomplete()) {
    const command = commandsMap.get(interaction.commandName);
    if (command && typeof command.autocomplete === 'function') {
      try {
        await command.autocomplete(interaction);
      } catch (err) {
        if (err.code !== 10062 && err.message !== 'Unknown interaction') {
          console.error(`[Autocomplete Error] ${interaction.commandName}:`, err.message);
        }
        return interaction.respond([]).catch(() => {});
      }
    }
    return;
  }

  // 2️⃣ CHAT INPUT COMMAND HANDLING
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;
  const command = commandsMap.get(commandName);

  if (!command) {
    return interaction.reply({ content: '❌ Unknown command.', ephemeral: true });
  }

  // 🛡️ MODERATION PERMISSION CHECK
  if (MODERATION_COMMAND_NAMES.includes(commandName)) {
    const isMod = hasModPerms(interaction.member, interaction.guild);
    if (!isMod) {
      return interaction.reply({ content: getRandomNoPermMessage() });
    }
  }

  // 🛡️ DEFERRAL (Prevents 3s Discord timeout crash)
  try {
    await interaction.deferReply();
  } catch (err) {
    console.log('[Anti-Crash] Interaction expired before deferral.');
    return;
  }

  // 🚀 EXECUTE COMMAND
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`[Command Error] ${commandName}:`, error);
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(`❌ Error executing \`/${commandName}\`: ${error.message || 'Unknown error'}`);
      } else {
        await interaction.reply({ content: `❌ Error: ${error.message}`, ephemeral: true });
      }
    } catch (e) {
      // Ignore secondary reply failures
    }
  }
});

// 🌐 VOICE STATE MANAGEMENT
client.on('voiceStateUpdate', (oldState, newState) => {
  if (oldState.member?.id !== client.user?.id) return;
  if (oldState.channelId && !newState.channelId) {
    const queue = musicManager.getQueue(oldState.guild.id);
    if (queue && !queue.is247) {
      queue.destroy();
    }
  }
});

// 🚀 READY EVENT
client.once('clientReady', () => {
  console.log(`========================================`);
  console.log(`🤖 Logged in as: ${client.user.tag}`);
  console.log(`📡 Connected Guilds: ${client.guilds.cache.size}`);
  console.log(`⚡ Loaded Commands: ${commandsMap.size}`);
  console.log(`========================================`);
});

// 🌐 EXPRESS HEALTH & DASHBOARD API
const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

app.get('/', (req, res) => res.send('VePlexity API Online 🚀'));

app.get('/api/stats', (req, res) => {
  res.json({
    status: 'online',
    ping: client.ws.ping,
    servers: client.guilds.cache.size,
    users: client.users.cache.size,
    totalCases: db.data.caseCounter,
    recentCases: Object.entries(db.data.cases).slice(-5).map(([id, data]) => ({ id, ...data }))
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`🌐 API listening on 0.0.0.0:${PORT}`));

// 🔑 LOGIN
const token = process.env.DISCORD_TOKEN?.replace(/['"]/g, '').trim();
if (!token) {
  console.error('❌ DISCORD_TOKEN is missing in .env!');
} else {
  client.login(token);
}