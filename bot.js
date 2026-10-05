import 'dotenv/config';
import dns from 'node:dns';
import path from 'path';
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
client.on('raw', d => musicManager.lavalink.sendRawData(d));

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

  // 🔘 BUTTON INTERACTIONS (Music Player Controls, etc.)
  if (interaction.isButton()) {
    if (interaction.customId.startsWith('music_')) {
      const queue = musicManager.getQueue(interaction.guildId);
      if (!queue) {
        return interaction.reply({ content: '❌ Nothing is currently playing.', ephemeral: true });
      }

      if (interaction.customId === 'music_toggle_pause') {
        if (queue.isPaused) {
          queue.resume();
          return interaction.reply({ content: '▶️ Resumed audio playback.', ephemeral: true });
        } else {
          queue.pause();
          return interaction.reply({ content: '⏸️ Playback paused.', ephemeral: true });
        }
      }

      if (interaction.customId === 'music_skip') {
        const title = queue.current?.title || 'current track';
        queue.skip();
        return interaction.reply({ content: `⏭️ Skipped **${title}**!`, ephemeral: true });
      }

      if (interaction.customId === 'music_stop') {
        queue.stop();
        return interaction.reply({ content: '⏹️ Stopped playback and cleared queue.', ephemeral: true });
      }

      if (interaction.customId === 'music_queue') {
        const current = queue.current;
        const upcoming = queue.tracks.slice(0, 5);
        let desc = current ? `**Now Playing:** [${current.title}](${current.url}) (${current.duration})\n\n` : '';
        desc += upcoming.length > 0
          ? upcoming.map((t, i) => `**${i + 1}.** [${t.title}](${t.url}) — \`${t.duration}\``).join('\n')
          : '_No more upcoming tracks._';
        return interaction.reply({ content: `📜 **Queue:**\n${desc}`, ephemeral: true });
      }

      if (interaction.customId === 'music_effects_info') {
        const active = musicManager.getActiveFilters(interaction.guildId);
        const text = active.length > 0 ? active.join(', ') : 'None (Studio Flat / Lossless)';
        return interaction.reply({ content: `🎛️ **Active DSP Effects:** ${text}\nUse \`/effects\` to toggle or apply presets like 8D Audio, Bass Boost, Nightcore, Vaporwave!`, ephemeral: true });
      }
    }
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
    console.log(`[Bot VoiceStateUpdate] oldChannel: ${oldState.channelId} -> newChannel: ${newState.channelId}`);
    if (oldState.channelId && !newState.channelId) {
      setTimeout(() => {
        const member = oldState.guild.members.me;
        if (!member?.voice?.channelId) {
          console.log(`[Bot VoiceStateUpdate] Confirmed bot disconnected from voice, destroying queue`);
          const queue = musicManager.getQueue(oldState.guild.id);
          if (queue && !queue.is247) {
            queue.destroy();
          }
        }
      }, 3000);
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
  musicManager.init(client);
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

// Serve static brand assets from bmcbrand folder
app.use('/brand', express.static(path.resolve('./bmcbrand')));

// 🎨 Sleek Dark-Mode Web Portal & Buy Me a Coffee Support Hub
app.get('/', (req, res) => {
  const uptimeSec = Math.floor(process.uptime());
  const days = Math.floor(uptimeSec / 86400);
  const hours = Math.floor((uptimeSec % 86400) / 3600);
  const minutes = Math.floor((uptimeSec % 3600) / 60);
  const uptimeStr = `${days > 0 ? `${days}d ` : ''}${hours}h ${minutes}m`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VePlexity Bot — Official Portal & Support</title>
  <link rel="icon" href="/brand/bmc-logo-yellow.png">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background: #0c0e14; color: #f1f2f6; display: flex; flex-direction: column; align-items: center; min-height: 100vh; padding: 40px 20px; }
    .container { max-width: 860px; width: 100%; display: flex; flex-direction: column; gap: 28px; }
    .header { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .title { font-size: 2.8rem; font-weight: 800; background: linear-gradient(135deg, #BD5FFF, #FFDD00); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .badge-status { display: inline-flex; align-items: center; gap: 8px; background: rgba(46, 204, 113, 0.15); border: 1px solid #2ecc71; color: #2ecc71; padding: 6px 14px; border-radius: 999px; font-size: 0.9rem; font-weight: 600; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
    .card { background: rgba(25, 28, 41, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 20px; text-align: center; }
    .card-num { font-size: 1.8rem; font-weight: 700; color: #fff; margin-bottom: 4px; }
    .card-label { font-size: 0.85rem; color: #8a8d9b; text-transform: uppercase; letter-spacing: 0.05em; }
    .support-section { background: linear-gradient(145deg, rgba(189, 95, 255, 0.12), rgba(255, 221, 0, 0.08)); border: 1px solid rgba(189, 95, 255, 0.3); border-radius: 20px; padding: 32px 24px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 20px; }
    .support-title { font-size: 1.8rem; font-weight: 700; color: #fff; }
    .support-desc { max-width: 580px; color: #b0b4c3; font-size: 1rem; line-height: 1.6; }
    .qr-card { background: #fff; padding: 14px; border-radius: 18px; box-shadow: 0 12px 36px rgba(189, 95, 255, 0.25); display: inline-block; }
    .qr-card img { width: 190px; height: 190px; display: block; border-radius: 10px; }
    .btn-group { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; margin-top: 10px; }
    .footer { text-align: center; font-size: 0.85rem; color: #575a6b; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge-status">🟢 System Operational</div>
      <h1 class="title">VePlexity Discord Bot</h1>
      <p style="color: #8a8d9b; font-size: 1.05rem;">Next-Gen Lossless Studio Music, Savage AI Chatbot & Server Economy</p>
    </div>

    <div class="stats-grid">
      <div class="card">
        <div class="card-num">${client.guilds.cache.size}</div>
        <div class="card-label">Connected Servers</div>
      </div>
      <div class="card">
        <div class="card-num">${client.users.cache.size}</div>
        <div class="card-label">Server Members</div>
      </div>
      <div class="card">
        <div class="card-num">${commandsMap.size}</div>
        <div class="card-label">Slash Commands</div>
      </div>
      <div class="card">
        <div class="card-num">${uptimeStr}</div>
        <div class="card-label">Live Uptime</div>
      </div>
    </div>

    <div class="support-section">
      <h2 class="support-title">☕ Support the Project</h2>
      <p class="support-desc">Fuel the bot's 24/7 lossless music engine, high-speed AI chatbot, and cloud VM infrastructure! Every cup of coffee directly supports development and unlocks server perks.</p>

      <div class="qr-card">
        <img src="/brand/bmc-qr-code.png" alt="Scan to Support on Buy Me a Coffee">
      </div>
      <p style="font-size: 0.85rem; color: #8a8d9b;">📱 Scan with phone camera or click below</p>

      <div class="btn-group">
        <a href="https://www.buymeacoffee.com/veplexity1" target="_blank" rel="noopener">
          <img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=☕&slug=veplexity1&button_colour=BD5FFF&font_colour=ffffff&font_family=Comic&outline_colour=000000&coffee_colour=FFDD00" alt="Buy Me a Coffee Badge" style="height: 52px; border-radius: 10px;" />
        </a>
      </div>
    </div>

    <div class="footer">
      VePlexity Bot v2.0 • Hosted on Azure Cloud • Powered by Google DeepMind & Discord.js
    </div>
  </div>

  <!-- Official Buy Me a Coffee Floating Widget -->
  <script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="veplexity1" data-description="Support me on Buy me a coffee!" data-message="Fuel the 24/7 lossless music & AI engine! ☕💖" data-color="#BD5FFF" data-position="Right" data-x_margin="18" data-y_margin="18"></script>
</body>
</html>`;

  res.send(html);
});

// ☕ Buy Me a Coffee Webhook Receiver
app.post('/api/webhook/bmc', async (req, res) => {
  try {
    const data = req.body?.response || req.body || {};
    const supporter = data.supporter_name || 'Generous Supporter';
    const coffees = data.support_coffees || 1;
    const note = data.supporter_message || 'No message';

    console.log(`[BMC Webhook] ☕ New Coffee from ${supporter} (${coffees} cups): "${note}"`);

    // Broadcast to primary guild announcement/system channel
    for (const guild of client.guilds.cache.values()) {
      const targetChannel = guild.systemChannel || guild.channels.cache.find(c => c.isTextBased() && c.name.includes('general'));
      if (targetChannel?.isTextBased()) {
        const embed = new EmbedBuilder()
          .setColor(0xBD5FFF)
          .setTitle('☕ New Supporter Alert! 🎉')
          .setDescription(`**${supporter}** just bought **${coffees} coffee(s)** for VePlexity!\n\n💬 *"${note}"*\n\nThank you so much for supporting the bot! 💖`)
          .setThumbnail('https://media1.giphy.com/media/TDQOtnWgsBx99cNoyH/giphy.gif')
          .setFooter({ text: 'Buy Me a Coffee Supporter • buymeacoffee.com/veplexity1' })
          .setTimestamp();

        await targetChannel.send({ embeds: [embed] }).catch(() => {});
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[BMC Webhook Error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

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