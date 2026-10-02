import 'dotenv/config';
import dns from 'node:dns';
import express from 'express';
import cors from 'cors';
import { Client, GatewayIntentBits, Partials, ChannelType, EmbedBuilder } from 'discord.js';
import ffmpeg from 'ffmpeg-static';
import commandsMap, { MODERATION_COMMAND_NAMES } from './src/commands/index.js';
import { hasModPerms, getRandomNoPermMessage } from './src/utils/helpers.js';
import db from './src/services/database.js';
import musicManager from './src/services/music/MusicManager.js';
import { generateAiReply } from './src/services/aiService.js';
import { deletedMessages, editedMessages } from './src/services/snipeService.js';
import gifService from './src/services/gifService.js';

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
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
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

  // 🔢 INTERACTIVE COUNTING GAME
  const countingConfig = db.getCountingConfig(message.guildId);
  if (countingConfig && countingConfig.channelId === message.channelId) {
    const trimmed = message.content.trim();
    if (/^\d+$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      const expected = (countingConfig.currentCount || 0) + 1;

      if (message.author.id === countingConfig.lastUserId) {
        db.updateCounting(message.guildId, 0, null, countingConfig.highScore);
        await message.react('❌').catch(() => {});
        return message.channel.send(`❌ <@${message.author.id}> broke the streak by counting twice in a row! The count was at **${countingConfig.currentCount}**. Count resets to **0**.`);
      }

      if (num !== expected) {
        db.updateCounting(message.guildId, 0, null, countingConfig.highScore);
        await message.react('❌').catch(() => {});
        return message.channel.send(`❌ <@${message.author.id}> ruined the streak at **${countingConfig.currentCount}** by typing **${num}**! Next number was supposed to be **${expected}**. Count resets to **0**.`);
      }

      const isNewHighScore = num > (countingConfig.highScore || 0);
      db.updateCounting(message.guildId, num, message.author.id, Math.max(countingConfig.highScore || 0, num));

      if (num % 100 === 0) {
        await message.react('💯').catch(() => {});
      } else if (num % 50 === 0) {
        await message.react('⭐').catch(() => {});
      } else {
        await message.react('✅').catch(() => {});
      }

      if (isNewHighScore && num >= 10 && num % 10 === 0) {
        message.channel.send(`🔥 **New High Score: ${num}!** Keep the streak alive!`).catch(() => {});
      }
      return;
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
    const rawReply = await generateAiReply({
      prompt: contextualPrompt,
      mode: activeMode,
      history,
      maxTokens: 400
    });

    // 🎬 CONTEXTUAL & DYNAMIC REACTION GIF ENGINE
    const { cleanText: finalReply, tag } = gifService.extractGifTag(rawReply);
    const gifResult = await gifService.getGifForContext({
      text: finalReply,
      prompt: cleanText,
      mode: activeMode,
      tag,
      chance: 0.40 // ~40% random chance to send matching GIF
    });

    if (gifResult?.url) {
      const modeColors = {
        savage: 0xff4757,
        flirty: 0xff2a6d,
        chill: 0x2ecc71,
        default: 0x9b59b6
      };
      const gifEmbed = new EmbedBuilder()
        .setColor(modeColors[activeMode] || 0x3498db)
        .setImage(gifResult.url);

      await message.reply({
        content: finalReply.slice(0, 2000),
        embeds: [gifEmbed]
      });
    } else {
      await message.reply(finalReply.slice(0, 2000));
    }

    history.push({ role: 'user', content: contextualPrompt });
    history.push({ role: 'model', content: finalReply });
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

// 🌐 VOICE STATE MANAGEMENT (Temp VCs + Music Cleanup)
client.on('voiceStateUpdate', async (oldState, newState) => {
  // 1. Music 24/7 disconnect handling
  if (oldState.member?.id === client.user?.id) {
    if (oldState.channelId && !newState.channelId) {
      const queue = musicManager.getQueue(oldState.guild.id);
      if (queue && !queue.is247) {
        queue.destroy();
      }
    }
    return;
  }

  // 2. Temp VC Auto-Create (Join-to-Create Hub)
  const guildId = newState.guild?.id || oldState.guild?.id;
  if (!guildId) return;

  const tempVcConfig = db.getTempVcConfig(guildId);
  if (tempVcConfig && tempVcConfig.hubChannelId && newState.channelId === tempVcConfig.hubChannelId) {
    try {
      const member = newState.member;
      const userName = member.displayName || member.user.username;
      const parentId = tempVcConfig.categoryId || newState.channel?.parentId;

      const createdChannel = await newState.guild.channels.create({
        name: `🔊 ${userName}'s Room`,
        type: ChannelType.GuildVoice,
        parent: parentId || undefined
      });

      db.addActiveTempVc(createdChannel.id, member.id);
      await newState.setChannel(createdChannel);
    } catch (err) {
      console.error('[Temp VC Create Error]:', err.message);
    }
  }

  // 3. Temp VC Auto-Delete (when empty)
  if (oldState.channelId && oldState.channelId !== newState.channelId) {
    if (db.isTempVc(oldState.channelId)) {
      const oldChannel = oldState.channel;
      if (oldChannel && oldChannel.members.size === 0) {
        db.removeActiveTempVc(oldState.channelId);
        await oldChannel.delete().catch(() => {});
      }
    }
  }
});

// ⭐ STARBOARD LISTENER
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot || !reaction.message.guild) return;

  try {
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();
  } catch (err) {
    return;
  }

  if (reaction.emoji.name !== '⭐') return;

  const guildId = reaction.message.guildId;
  const config = db.getStarboardConfig(guildId);
  if (!config || !config.channelId) return;
  if (reaction.message.channelId === config.channelId) return;

  const threshold = config.threshold || 3;
  if (reaction.count < threshold) return;

  const starboardChannel = reaction.message.guild.channels.cache.get(config.channelId) ||
    await reaction.message.guild.channels.fetch(config.channelId).catch(() => null);
  if (!starboardChannel) return;

  const origMsg = reaction.message;
  const existingPostId = db.getStarboardPost(origMsg.id);

  const starEmbed = new EmbedBuilder()
    .setAuthor({ name: origMsg.author.tag, iconURL: origMsg.author.displayAvatarURL() })
    .setDescription(origMsg.content || '*[Attachment/Embed]*')
    .setColor(0xf1c40f)
    .addFields([
      { name: 'Source', value: `[Jump to message](${origMsg.url})`, inline: true },
      { name: 'Channel', value: `<#${origMsg.channelId}>`, inline: true }
    ])
    .setFooter({ text: `⭐ ${reaction.count} | ID: ${origMsg.id}` })
    .setTimestamp(origMsg.createdTimestamp);

  const attachment = origMsg.attachments?.first();
  if (attachment && attachment.contentType?.startsWith('image/')) {
    starEmbed.setImage(attachment.url);
  }

  if (existingPostId) {
    const existingMsg = await starboardChannel.messages.fetch(existingPostId).catch(() => null);
    if (existingMsg) {
      await existingMsg.edit({ content: `⭐ **${reaction.count}** <#${origMsg.channelId}>`, embeds: [starEmbed] }).catch(() => {});
      return;
    }
  }

  const sent = await starboardChannel.send({ content: `⭐ **${reaction.count}** <#${origMsg.channelId}>`, embeds: [starEmbed] }).catch(() => null);
  if (sent) {
    db.setStarboardPost(origMsg.id, sent.id);
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

// 🎂 DAILY BIRTHDAY CHECK LOOP (Runs every 30 mins)
setInterval(async () => {
  if (!client.isReady()) return;
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const todayStr = `${day}-${month}`;

  const allBirthdays = db.getAllBirthdays();
  for (const [userId, bdayStr] of Object.entries(allBirthdays)) {
    if (bdayStr === todayStr && !db.hasAnnouncedBirthday(todayStr, userId)) {
      db.markBirthdayAnnounced(todayStr, userId);

      for (const guild of client.guilds.cache.values()) {
        try {
          const member = await guild.members.fetch(userId).catch(() => null);
          if (!member) continue;

          const bdayConfig = db.getBirthdayConfig(guild.id);
          let targetChannel = null;
          if (bdayConfig?.channelId) {
            targetChannel = guild.channels.cache.get(bdayConfig.channelId);
          } else {
            targetChannel = guild.systemChannel || guild.channels.cache.find(c => c.isTextBased() && c.name.includes('general'));
          }

          if (targetChannel?.isTextBased()) {
            const bdayEmbed = new EmbedBuilder()
              .setColor(0xff69b4)
              .setTitle('🎂 Happy Birthday! 🎉')
              .setDescription(`Today is <@${userId}>'s birthday! 🎈✨\n\nWishing you an incredible year ahead filled with happiness, success, and blessings! Have an amazing celebration! 🍰🎁`)
              .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
              .setFooter({ text: 'VePlexity Birthday Celebrations 🎉' })
              .setTimestamp();

            await targetChannel.send({ content: `🎉 Happy Birthday <@${userId}>!`, embeds: [bdayEmbed] }).catch(() => {});
          }
        } catch (e) {
          // Continue to next guild
        }
      }
    }
  }
}, 1800000);

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