import 'dotenv/config';
import dns from 'node:dns';
import express from 'express';
import cors from 'cors';
import { Client, GatewayIntentBits } from 'discord.js';
import ffmpeg from 'ffmpeg-static';
import commandsMap, { MODERATION_COMMAND_NAMES } from './src/commands/index.js';
import { hasModPerms, getRandomNoPermMessage } from './src/utils/helpers.js';
import db from './src/services/database.js';
import musicManager from './src/services/music/MusicManager.js';
import { generateAiReply } from './src/services/aiService.js';
import { deletedMessages, editedMessages } from './src/services/snipeService.js';

// 🔧 Network & Process Configuration
if (ffmpeg) process.env.FFMPEG_PATH = ffmpeg;
dns.setDefaultResultOrder('ipv4first');

// 🛡️ ANTI-CRASH ARMOR: Keeps bot alive on unexpected network or API hiccups
process.on('unhandledRejection', (reason) => {
  console.error('[Anti-Crash] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
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

// 🕵️ CAUGHT IN 4K: SNIPE & EDIT-SNIPE LISTENERS
client.on('messageDelete', (message) => {
  if (!message.guild || message.author?.bot) return;
  const attachmentUrl = message.attachments?.first()?.proxyURL || message.attachments?.first()?.url || null;
  if (!message.content && !attachmentUrl) return;

  deletedMessages.set(message.channelId, {
    content: message.content || '',
    authorTag: message.author?.tag || 'Unknown User',
    authorId: message.author?.id,
    authorAvatar: message.author?.displayAvatarURL?.() || null,
    image: attachmentUrl,
    timestamp: Date.now()
  });
});

client.on('messageUpdate', (oldMessage, newMessage) => {
  if (!newMessage.guild || newMessage.author?.bot) return;
  if (!oldMessage.content || !newMessage.content) return;
  if (oldMessage.content === newMessage.content) return;

  editedMessages.set(newMessage.channelId, {
    oldContent: oldMessage.content,
    newContent: newMessage.content,
    authorTag: newMessage.author?.tag || 'Unknown User',
    authorId: newMessage.author?.id,
    authorAvatar: newMessage.author?.displayAvatarURL?.() || null,
    timestamp: Date.now()
  });
});

// 🧠 MEMORY & COOLDOWN MAPS
const channelMemory = new Map(); // channelId -> [{role, content}]
const chatbotCooldown = new Map(); // userId -> timestamp
const xpCooldown = new Map(); // userId -> timestamp

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const now = Date.now();

  // 1️⃣ AFK AUTO-CLEAR & PING RESPONDER
  if (db.removeAfk(message.author.id)) {
    message.reply(`👋 Welcome back **${message.author.displayName || message.author.username}**! I've removed your AFK status.`)
      .then(msg => setTimeout(() => msg.delete().catch(() => {}), 8000))
      .catch(() => {});
  }

  if (message.mentions.users.size > 0) {
    for (const [mentionedId, mentionedUser] of message.mentions.users) {
      if (mentionedId === message.author.id || mentionedUser.bot) continue;
      const afkData = db.getAfk(mentionedId);
      if (afkData) {
        const unixSec = Math.floor(afkData.timestamp / 1000);
        message.reply(`💤 **${mentionedUser.displayName || mentionedUser.username}** is currently AFK: *"${afkData.reason}"* (since <t:${unixSec}:R>)`).catch(() => {});
      }
    }
  }

  // 2️⃣ PASSIVE XP & LEVELING ENGINE
  const lastXp = xpCooldown.get(message.author.id) || 0;
  if (now - lastXp >= 30000 && message.content.length >= 3) {
    xpCooldown.set(message.author.id, now);
    const xpGain = Math.floor(Math.random() * 16) + 15; // 15 - 30 XP
    const { leveledUp, newLevel, reward } = db.addXp(message.author.id, xpGain);
    if (leveledUp) {
      message.channel.send(
        `🎉 **LEVEL UP!** GG <@${message.author.id}>, you just reached **Level ${newLevel}** and pocketed a **₹${reward.toLocaleString('en-IN')}** cash bonus! 💰`
      ).catch(() => {});
    }
  }

  // 3️⃣ MULTI-ENGINE AI CHATBOT (Responds on @mention OR direct reply to bot)
  if (!db.isChatbotEnabled(message.guildId)) return;

  const isMentioned = message.mentions.has(client.user);
  const isReplyToBot = message.reference?.messageId && message.mentions.repliedUser?.id === client.user.id;
  if (!isMentioned && !isReplyToBot) return;

  const lastUsed = chatbotCooldown.get(message.author.id) || 0;
  if (now - lastUsed < 2500) return; // 2.5s anti-spam cooldown
  chatbotCooldown.set(message.author.id, now);

  const cleanText = message.content.replace(/<@!?\d+>/g, '').trim();
  if (!cleanText) return;

  const senderName = message.author.displayName || message.author.username;
  const contextualPrompt = `[User "${senderName}" says]: ${cleanText}`;
  const activeMode = db.getAiMode(message.guildId);

  await message.channel.sendTyping().catch(() => {});

  const history = channelMemory.get(message.channelId) || [];

  try {
    const reply = await generateAiReply({
      prompt: contextualPrompt,
      mode: activeMode,
      history,
      maxTokens: 400
    });

    await message.reply(reply.slice(0, 2000));

    history.push({ role: 'user', content: contextualPrompt });
    history.push({ role: 'model', content: reply });
    channelMemory.set(message.channelId, history.slice(-12));
  } catch (error) {
    console.error('[Chatbot Error]', error.message);
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

  // 🛡️ DEFERRAL (Ephemeral for /confess so identity stays 100% hidden!)
  try {
    if (commandName === 'confess') {
      await interaction.deferReply({ ephemeral: true });
    } else {
      await interaction.deferReply();
    }
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

// ⏰ PERSISTENT REMINDERS LOOP
setInterval(async () => {
  if (!client.isReady()) return;
  const due = db.getDueReminders();
  for (const rem of due) {
    db.removeReminder(rem.id);
    try {
      const user = await client.users.fetch(rem.userId).catch(() => null);
      if (user) {
        await user.send(`⏰ **Reminder:** ${rem.text}`).catch(async () => {
          const channel = await client.channels.fetch(rem.channelId).catch(() => null);
          if (channel?.isTextBased()) {
            await channel.send(`⏰ <@${rem.userId}> **Reminder:** ${rem.text}`).catch(() => {});
          }
        });
      }
    } catch (e) {
      // Ignore delivery errors
    }
  }
}, 15000);

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