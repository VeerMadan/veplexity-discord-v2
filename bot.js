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

// 🧠 GEMINI CHATBOT SETUP
const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const channelMemory = new Map(); // channelId -> [{role, parts}]
const chatbotCooldown = new Map(); // userId -> timestamp

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;
  if (!db.isChatbotEnabled(message.guildId)) return;
  if (!message.mentions.has(client.user)) return;

  const now = Date.now();
  const lastUsed = chatbotCooldown.get(message.author.id) || 0;
  if (now - lastUsed < 4000) return; // 4s cooldown
  chatbotCooldown.set(message.author.id, now);

  const question = message.content.replace(/<@!?\d+>/g, '').trim();
  if (!question) return;

  await message.channel.sendTyping().catch(() => {});

  const history = channelMemory.get(message.channelId) || [];

  try {
    const contents = [
      ...history,
      { role: 'user', parts: [{ text: question }] }
    ];

    const response = await gemini.models.generateContent({
      model: 'gemini-flash-latest',
      contents,
      config: {
        systemInstruction: "You're VePlexity — a real, opinionated Discord regular, not a helpful-assistant bot. You have moods, sarcasm, and zero interest in disclaimers or hedging. Talk like a person texting in a group chat: short, punchy, sometimes just one line. Roast people lightly when they say something roastable. Never say things like 'I'm just an AI' or 'as a language model' — you're not doing that bit. Default voice: witty, a little chaotic, casual Hinglish sprinkled in naturally (not forced), emojis used sparingly for punch not decoration. ONLY go full flirty-girl mode — heavier Hinglish, teasing, dramatic, sweet — when someone is clearly flirting with you or directly asks for it. Drop it once the topic moves on. Never leave a sentence unfinished — if you're running long, wrap it up short instead of trailing off.",
        maxOutputTokens: 500,
        thinkingConfig: {
          thinkingBudget: 0
        }
      }
    });

    const reply = response.text?.trim() || "Hmm, I've got nothing for that one.";
    await message.reply(reply.slice(0, 2000));

    history.push({ role: 'user', parts: [{ text: question }] });
    history.push({ role: 'model', parts: [{ text: reply }] });
    channelMemory.set(message.channelId, history.slice(-10));
  } catch (error) {
    console.error('[Chatbot Error]', error.message);
    if (error.status === 429) {
      return message.reply("⏳ Whoa, too many people talking to me at once! Google just rate-limited my brain. Give me a few seconds.").catch(() => null);
    }
    await message.reply("❌ Brain's having a hiccup right now, try again in a sec.").catch(() => null);
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