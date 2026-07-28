import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { LavalinkManager } from 'lavalink-client';
import ffmpeg from 'ffmpeg-static';
import { GoogleGenAI } from '@google/genai';

// 🔧 CRITICAL FIXES
process.env.FFMPEG_PATH = ffmpeg;
import dns from 'node:dns'; 
dns.setDefaultResultOrder('ipv4first');

// 🛡️ ANTI-CRASH ARMOR: Prevents the bot from ever shutting down due to random API errors
process.on('unhandledRejection', (reason, p) => {
    console.log('[Anti-Crash] Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err, origin) => {
    console.log('[Anti-Crash] Uncaught Exception:', err);
});

/* =========================
   DATABASE SETUP
========================= */
const DATA_PATH = path.resolve('./data/storage.json');

if (!fs.existsSync(path.resolve('./data'))) {
    fs.mkdirSync(path.resolve('./data'));
}

function loadData() {
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify({ warns: {}, modLogs: {}, cases: {}, caseCounter: 0 }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DATA_PATH));
}

function saveData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

let database = loadData();
database.warns ??= {};
database.modLogs ??= {};
database.cases ??= {};
database.caseCounter ??= 0;
database.chatbotGuilds ??= [];
database.pvcRevoked ??= [];
database.notes ??= {};

async function fetchNekoGif(category) {
    try {
        const res = await fetch(`https://nekos.best/api/v2/${category}`);
        const data = await res.json();
        return data.results?.[0]?.url || null;
    } catch {
        return null;
    }
}

const ACTION_VERBS = {
    pat: 'pats', hug: 'hugs', kiss: 'kisses', slap: 'slaps',
    bite: 'bites', tickle: 'tickles', cuddle: 'cuddles', poke: 'pokes'
};

async function handleActionCommand(interaction, category) {
    const target = interaction.options.getUser('user');
    const gif = await fetchNekoGif(category);
    const verb = ACTION_VERBS[category] || category;
    const selfAction = target.id === interaction.user.id;
    const text = selfAction
        ? `${interaction.user.username} ${verb} themselves... okay then 😅`
        : `**${interaction.user.username}** ${verb} **${target.username}**!`;
    if (!gif) return interaction.editReply(text);
    return interaction.editReply({ content: text, embeds: [{ image: { url: gif } }] });
}

function createCase(interaction, action, userId, reason) {
  database.caseCounter++;
  const id = database.caseCounter;
  database.cases[id] = {
    action,
    user: userId,
    moderator: interaction.user.id,
    reason,
    channel: interaction.channelId,
    timestamp: new Date().toISOString()
  };
  setImmediate(() => saveData(database));
  return id;
}

/* =========================
   CONSTANTS
========================= */
const WARNING_ESCALATION = {
  3: { type: 'timeout', duration: '10m' },
  4: { type: 'timeout', duration: '1h' },
  5: { type: 'timeout', duration: '12h' },
  6: { type: 'kick' },
  7: { type: 'ban' },
};

const PRIVATE_VC_ROLE_IDS = ['1469376368067477689']; 
const ALLOWED_MOD_ROLE_IDS = [
  '1469048464406220972', '1469048464330588210', 
  '1469048464330588209', '1469048464330588208', '1469048464330588207'
];

const PVC_RULES = {
  PVC1: 'Joining private VC without permission',
  PVC2: 'Not leaving when asked',
  PVC3: 'Disturbing private conversation',
  PVC4: 'Abusive or offensive language',
  PVC5: 'Recording without consent',
};

const NO_PERMISSION_MESSAGES = [
  "🚫 Bro… you tried to use a mod command with civilian privileges 💀",
  "🛑 Calm down there, future moderator. That button isn't for you.",
  "💀 My guy really thought he had admin perms.",
  "❌ You lack the required roles to execute moderation commands.",
  "❌ Whoa whoa whoa!\nThis button is not for civilians 🫡"
];

function getRandomNoPermMessage() {
  return NO_PERMISSION_MESSAGES[Math.floor(Math.random() * NO_PERMISSION_MESSAGES.length)];
}

function parseDuration(str) {
  const m = str.match(/^(\d+)(s|m|h|d)$/);
  return m ? Number(m[1]) * { s:1e3, m:6e4, h:3.6e6, d:8.64e7 }[m[2]] : 0;
}

function buildEmbed(title, emoji, color, fields) {
  const embed = new EmbedBuilder()
    .setTitle(`${emoji} ${title}`)
    .setColor(color)
    .setFooter({ text: 'VePlexity Moderation' })
    .setTimestamp();
  if (fields) {
      embed.addFields(fields.filter(Boolean));
  }
  return embed;
}

async function sendModLog(interaction, embed) {
  const channelId = database.modLogs[interaction.guildId];
  if (!channelId) return;
  const channel = interaction.guild.channels.cache.get(channelId);
  if (channel) await channel.send({ embeds: [embed] }).catch(() => {});
}

/* =========================
   BOT CLIENT & PLAYER
========================= */
function formatMs(ms) {
  if (!ms || ms < 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const chatbotEnabled = new Set(); // guilds with /chatbot on
const channelMemory = new Map(); // channelId -> [{role, text}]
const chatbotCooldown = new Map(); // userId -> timestamp
//aise hi
client.on('error', err => console.log(`[Discord Client Error] ${err.message}`));

client.lavalink = new LavalinkManager({
    nodes: [
        {
            authorization: process.env.LAVALINK_PASSWORD,
            host: '127.0.0.1',
            port: 2333,
            id: 'main-node'
        }
    ],
    sendToShard: (guildId, payload) => client.guilds.cache.get(guildId)?.shard?.send(payload),
    client: {
        id: process.env.CLIENT_ID,
        username: 'VePlexity'
    },
    autoSkip: true,
    playerOptions: {
        defaultSearchPlatform: 'ytsearch',
        onDisconnect: { autoReconnect: true, destroyPlayer: false },
        onEmptyQueue: { destroyAfterMs: 9999999999 } // disabled — handled manually below for 24/7 support
    }
});

const guild247 = new Set();

client.lavalink.on('queueEnd', (player) => {
    if (guild247.has(player.guildId)) return; // 24/7 mode — stay connected
    setTimeout(() => {
        const p = client.lavalink.getPlayer(player.guildId);
        if (p && !p.queue.tracks.length && !p.playing) p.destroy();
    }, 30000);
});

client.on('raw', d => client.lavalink.sendRawData(d));

client.lavalink.nodeManager.on('connect', (node) => console.log(`✅ Lavalink node "${node.id}" connected`));
client.lavalink.nodeManager.on('error', (node, error) => console.error(`❌ Lavalink node "${node.id}" error:`, error));

client.lavalink.on('trackStart', (player, track) => {
    const channel = client.channels.cache.get(player.textChannelId);
    if (channel) channel.send(`🎶 Now playing: **${track.info.title}** by **${track.info.author}**`).catch(() => null);
});
client.lavalink.on('trackError', (player, track, payload) => {
    console.error(`❌ Track Error for ${track.info.title}:`, JSON.stringify(payload, null, 2));
});
client.lavalink.on('trackStuck', (player, track, payload) => {
    console.error(`⚠️ Track Stuck for ${track.info.title}:`, JSON.stringify(payload, null, 2));
});
client.lavalink.on('playerDestroy', (player) => {
    console.log(`[Debug] Lavalink player destroyed for guild ${player.guildId}.`);
});
client.on('voiceStateUpdate', (oldState, newState) => {
    if (oldState.member?.id !== client.user.id) return;
    if (oldState.channelId && !newState.channelId) {
        console.log(`[Debug] Bot left voice in guild ${oldState.guild.id} — was in channel ${oldState.channelId}.`);
    }
});


database.chatbotGuilds.forEach(id => chatbotEnabled.add(id));

client.once('clientReady', () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);
    client.lavalink.init({ id: client.user.id, username: client.user.username });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (!chatbotEnabled.has(message.guildId)) return;
    if (!message.mentions.has(client.user)) return;

    const now = Date.now();
    const lastUsed = chatbotCooldown.get(message.author.id) || 0;
    if (now - lastUsed < 5000) return; // 5s cooldown per user
    chatbotCooldown.set(message.author.id, now);

    const question = message.content.replace(/<@!?\d+>/g, '').trim();
    if (!question) return;

    await message.channel.sendTyping();

    const history = channelMemory.get(message.channelId) || [];

    try {
        const contents = [
            ...history,
            { role: 'user', parts: [{ text: question }] }
        ];
const response = await gemini.models.generateContent({
            model: 'gemini-2.0-flash', // Swapped to the stable 2.0 model name
            contents,
            config: {
                systemInstruction: "You're VePlexity — a real, opinionated Discord regular, not a helpful-assistant bot. You have moods, sarcasm, and zero interest in disclaimers or hedging. Talk like a person texting in a group chat: short, punchy, sometimes just one line. Roast people lightly when they say something roastable. Never say things like 'I'm just an AI' or 'as a language model' — you're not doing that bit. Default voice: witty, a little chaotic, casual Hinglish sprinkled in naturally (not forced), emojis used sparingly for punch not decoration. ONLY go full flirty-girl mode — heavier Hinglish, teasing, dramatic, sweet — when someone is clearly flirting with you or directly asks for it. Drop it once the topic moves on. Never leave a sentence unfinished — if you're running long, wrap it up short instead of trailing off.",
                maxOutputTokens: 500
                // Removed the thinkingConfig entirely
            }
        });
        //const response = await gemini.models.generateContent({
        //    model: 'gemini-flash-latest',
         //   contents,
        //    config: {
         //       systemInstruction: "You're VePlexity — a real, opinionated Discord regular, not a helpful-assistant bot. You have moods, sarcasm, and zero interest in disclaimers or hedging. Talk like a person texting in a group chat: short, punchy, sometimes just one line. Roast people lightly when they say something roastable. Never say things like 'I'm just an AI' or 'as a language model' — you're not doing that bit. Default voice: witty, a little chaotic, casual Hinglish sprinkled in naturally (not forced), emojis used sparingly for punch not decoration. ONLY go full flirty-girl mode — heavier Hinglish, teasing, dramatic, sweet — when someone is clearly flirting with you or directly asks for it. Drop it once the topic moves on. Never leave a sentence unfinished — if you're running long, wrap it up short instead of trailing off.",
         //       maxOutputTokens: 500,
         //       thinkingConfig: {
         //           thinkingBudget: 0
         //       }
         //   }
        //});

        console.log(`[Gemini Debug] Tokens — prompt: ${response.usageMetadata?.promptTokenCount}, reply: ${response.usageMetadata?.candidatesTokenCount}, total: ${response.usageMetadata?.totalTokenCount}`);
        const reply = response.text?.trim() || "Hmm, I've got nothing for that one.";
        await message.reply(reply.slice(0, 2000));

        history.push({ role: 'user', parts: [{ text: question }] });
        history.push({ role: 'model', parts: [{ text: reply }] });
        channelMemory.set(message.channelId, history.slice(-10)); // keep last 5 exchanges
    } catch (error) {
        console.error('[Chatbot Error]', error);
        await message.reply("❌ Brain's not working right now, try again in a bit.").catch(() => null);
    }
});

/* =========================
   THE MASTER ROUTER
========================= */
client.on('interactionCreate', async (interaction) => {
 if (interaction.isAutocomplete()) {
      const query = interaction.options.getString('query');
      if (!query || query.trim().length < 2) return interaction.respond([]);
      
      try {
          const node = client.lavalink.nodeManager.leastUsedNodes()[0];
          if (!node) return interaction.respond([]);
          const res = await node.search({ query, source: 'ytsearch' }, interaction.user).catch(() => null);
          if (!res || !res.tracks?.length) return interaction.respond([]);

          const filtered = res.tracks.filter(t => 
              !/remix|cover|sped up|slowed|8d|nightcore|mashup/i.test(t.info.title)
          );
          const finalTracks = filtered.length ? filtered : res.tracks;

          return interaction.respond(
              finalTracks.slice(0, 10).map(t => ({
                  name: `${t.info.title} - ${t.info.author}`.slice(0, 100),
                  value: t.info.uri.slice(0, 100)
              }))
          );
      } catch (e) {
          // Silent catch so Discord doesn't crash on timeouts
          return interaction.respond([]).catch(() => {});
      }
  }

  if (!interaction.isChatInputCommand()) return;

  const { commandName, options } = interaction;
  
  const MOD_COMMANDS = ['warn', 'pvc_warn', 'kick', 'timeout', 'ban', 'unban', 'pvc_ban', 'warnings', 'clearwarnings', 'modlogs', 'pvc_restore', 'case', 'cases', 'purge', 'lock', 'unlock', 'slowmode', 'disconnect', 'note', 'notes', 'nickname', 'lockdown', 'unlockdown', 'masskick', 'massban', 'muteall', 'unmuteall'];
  
  if (MOD_COMMANDS.includes(commandName)) {
      const member = interaction.member;
      const hasPerms = member.id === interaction.guild.ownerId || 
                       member.permissions.has('Administrator') || 
                       member.roles.cache.some(r => ALLOWED_MOD_ROLE_IDS.includes(r.id));
      if (!hasPerms) {
          return interaction.reply({ content: getRandomNoPermMessage() });
      }
  }

  // 🛡️ ANTI-CRASH: Safely defer reply so 3-second timeouts don't crash the bot
  try {
      await interaction.deferReply();
  } catch (err) {
      console.log('[Anti-Crash] Interaction expired before deferral.');
      return; // Stop here so it doesn't try to edit a dead message
  }

  try {
    switch (commandName) {
      
      case 'test':
        return interaction.editReply('✅ Bot is alive and stable.');

      case 'modlogs': {
        const channel = options.getChannel('channel');
        database.modLogs[interaction.guildId] = channel.id;
        saveData(database);
        return interaction.editReply({ embeds: [buildEmbed('Mod Logs Set', '📜', 0x3498db, [{ name: 'Channel', value: `<#${channel.id}>` }])] });
      }

      case 'warn':
      case 'pvc_warn': {
        const user = options.getUser('user');
        const pvc = commandName === 'pvc_warn';
        const reason = pvc ? (PVC_RULES[options.getString('rule')] || 'PVC Violation') : (options.getString('reason') || 'No reason');
        
        const caseId = createCase(interaction, pvc ? 'pvc_warn' : 'warn', user.id, reason);
        const data = database.warns[user.id] || { n: 0, p: 0 };
        pvc ? data.p++ : data.n++;
        database.warns[user.id] = data;
        saveData(database);

        const replyEmbed = buildEmbed(pvc ? 'PVC Warning' : 'Warning Issued', '⚠️', pvc ? 0xe67e22 : 0xf1c40f, [
          { name: 'User', value: `<@${user.id}>`, inline: true },
          { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Reason', value: reason },
          { name: 'Case', value: `#${caseId}`, inline: true },
          !pvc ? { name: 'Total Warnings', value: `${data.n}`, inline: true } : null
        ]);

        await interaction.editReply({ embeds: [replyEmbed] });
        await sendModLog(interaction, replyEmbed);

        if (!pvc) {
            const rule = WARNING_ESCALATION[data.n];
            if (rule) {
                const targetMember = await interaction.guild.members.fetch(user.id).catch(()=>null);
                if (targetMember) {
                    if (rule.type === 'timeout') await targetMember.timeout(parseDuration(rule.duration), `Auto-escalation: ${data.n} warns`);
                    if (rule.type === 'kick') await targetMember.kick(`Auto-escalation: ${data.n} warns`);
                    if (rule.type === 'ban') await targetMember.ban({ reason: `Auto-escalation: ${data.n} warns` });
                    await interaction.channel.send(`🚨 **Escalation:** <@${user.id}> has been ${rule.type}ed (Reached ${data.n} warnings).`);
                }
            }
        }
        break;
      }

      case 'kick': {
        const user = options.getUser('user');
        const reason = options.getString('reason') || 'No reason';
        const member = await interaction.guild.members.fetch(user.id).catch(()=>null);
        if (!member) return interaction.editReply('❌ User not found.');
        
        const caseId = createCase(interaction, 'kick', user.id, reason);
        await member.kick(reason);
        const e = buildEmbed('Member Kicked', '👢', 0x95a5a6, [{ name: 'User', value: `<@${user.id}>` }, { name: 'Reason', value: reason }, { name: 'Case', value: `#${caseId}` }]);
        await interaction.editReply({ embeds: [e] });
        await sendModLog(interaction, e);
        break;
      }

      case 'ban': {
        const user = options.getUser('user');
        const reason = options.getString('reason') || 'No reason';
        const caseId = createCase(interaction, 'ban', user.id, reason);
        await interaction.guild.bans.create(user.id, { reason });
        const e = buildEmbed('User Banned', '⛔', 0xe74c3c, [{ name: 'User', value: `<@${user.id}>` }, { name: 'Reason', value: reason }, { name: 'Case', value: `#${caseId}` }]);
        await interaction.editReply({ embeds: [e] });
        await sendModLog(interaction, e);
        break;
      }

      case 'unban': {
        const userId = options.getString('user');
        const caseId = createCase(interaction, 'unban', userId, 'Unbanned user');
        await interaction.guild.bans.remove(userId).catch(()=>null);
        const e = buildEmbed('User Unbanned', '🔓', 0x2ecc71, [{ name: 'User', value: `<@${userId}>` }, { name: 'Case', value: `#${caseId}` }]);
        await interaction.editReply({ embeds: [e] });
        await sendModLog(interaction, e);
        break;
      }

      case 'timeout': {
        const user = options.getUser('user');
        const duration = options.getString('duration');
        const reason = options.getString('reason') || 'No reason';
        const member = await interaction.guild.members.fetch(user.id).catch(()=>null);
        if (!member) return interaction.editReply('❌ User not found.');
        
        const durationMs = parseDuration(duration);
        if (!durationMs) return interaction.editReply('❌ Invalid duration.');
        const caseId = createCase(interaction, 'timeout', user.id, reason);
        await member.timeout(durationMs, reason);
        const e = buildEmbed('Member Timed Out', '⏳', 0x3498db, [{ name: 'User', value: `<@${user.id}>` }, { name: 'Duration', value: duration }, { name: 'Case', value: `#${caseId}` }]);
        await interaction.editReply({ embeds: [e] });
        await sendModLog(interaction, e);
        break;
      }

      case 'purge': {
        const amount = options.getInteger('amount');
        await interaction.channel.bulkDelete(amount, true).catch(() => null);
        const caseId = createCase(interaction, 'purge', interaction.user.id, `Deleted ${amount} messages`);
        const e = buildEmbed('Messages Purged', '🧹', 0x95a5a6, [{ name: 'Deleted', value: `${amount}` }, { name: 'Case', value: `#${caseId}` }]);
        
        try {
            await interaction.editReply({ embeds: [e] });
        } catch {
            await interaction.channel.send({ embeds: [e] }).then(msg => setTimeout(() => msg.delete().catch(()=>null), 5000));
        }
        await sendModLog(interaction, e);
        break;
      }

      case 'lock': {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
        await interaction.editReply({ embeds: [buildEmbed('Channel Locked', '🔒', 0xe74c3c, [{ name: 'Moderator', value: `<@${interaction.user.id}>` }])] });
        break;
      }

      case 'unlock': {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
        await interaction.editReply({ embeds: [buildEmbed('Channel Unlocked', '🔓', 0x2ecc71, [{ name: 'Moderator', value: `<@${interaction.user.id}>` }])] });
        break;
      }

      case 'slowmode': {
        const seconds = options.getInteger('seconds');
        await interaction.channel.setRateLimitPerUser(seconds);
        await interaction.editReply({ embeds: [buildEmbed('Slowmode Enabled', '🐢', 0xf1c40f, [{ name: 'Duration', value: `${seconds}s` }])] });
        break;
      }

      case 'pvc_ban': {
        const user = options.getUser('user');
        const reason = PVC_RULES[options.getString('rule')] || 'PVC Violation';
        const member = await interaction.guild.members.fetch(user.id).catch(()=>null);
        if (member) await member.roles.remove(PRIVATE_VC_ROLE_IDS).catch(()=>null);
        if (!database.pvcRevoked.includes(user.id)) database.pvcRevoked.push(user.id);
        saveData(database);
        const caseId = createCase(interaction, 'pvc_ban', user.id, reason);
        await interaction.editReply({ embeds: [buildEmbed('Private VC Revoked', '🚫', 0xe74c3c, [{ name: 'User', value: `<@${user.id}>` }, { name: 'Reason', value: reason }])] });
        break;
      }

      case 'pvc_restore': {
        const user = options.getUser('user');
        if (!database.pvcRevoked.includes(user.id)) {
            return interaction.editReply(`❌ <@${user.id}> doesn't have revoked PVC access to restore.`);
        }
        const member = await interaction.guild.members.fetch(user.id).catch(()=>null);
        if (member) await member.roles.add(PRIVATE_VC_ROLE_IDS).catch(()=>null);
        database.pvcRevoked = database.pvcRevoked.filter(id => id !== user.id);
        saveData(database);
        await interaction.editReply({ embeds: [buildEmbed('Private VC Restored', '🔓', 0x2ecc71, [{ name: 'User', value: `<@${user.id}>` }])] });
        break;
      }

      case 'warnings': {
        const user = options.getUser('user');
        const d = database.warns[user.id] || { n: 0, p: 0 };
        await interaction.editReply({ embeds: [buildEmbed('User Warnings', '📊', 0x9b59b6, [{ name: 'General', value: `${d.n}`, inline: true }, { name: 'PVC', value: `${d.p}`, inline: true }])] });
        break;
      }

      case 'clearwarnings': {
        const user = options.getUser('user');
        delete database.warns[user.id];
        saveData(database);
        await interaction.editReply({ embeds: [buildEmbed('Warnings Cleared', '🧹', 0x2ecc71, [{ name: 'User', value: `<@${user.id}>` }])] });
        break;
      }

      case 'cases': {
        const user = options.getUser('user');
        const userCases = Object.entries(database.cases).filter(([_, data]) => data.user === user.id);
        if (userCases.length === 0) return interaction.editReply({ embeds: [buildEmbed('No Cases Found', '🫠', 0x95a5a6, [{ name: 'Status', value: 'Zero records.' }])] });
        const formatted = userCases.slice(-10).map(([id, data]) => `**#${id}** • ${data.action.toUpperCase()}`).join('\n');
        await interaction.editReply({ embeds: [buildEmbed('User Case History', '📁', 0x3498db, [{ name: 'User', value: `<@${user.id}>` }, { name: 'Recent Cases', value: formatted }])] });
        break;
      }

      case 'case': {
        const caseId = options.getInteger('id');
        const data = database.cases[caseId];
        if (!data) return interaction.editReply('❌ Case not found.');
        await interaction.editReply({ embeds: [buildEmbed(`Case #${caseId}`, '📁', 0x3498db, [{ name: 'Action', value: data.action, inline: true }, { name: 'User', value: `<@${data.user}>`, inline: true }, { name: 'Reason', value: data.reason }])] });
        break;
      }
case 'summon': {
        const targetUser = options.getUser('user');
        if (!targetUser) return interaction.editReply('❌ You need to mention someone to summon.');

        const summonGifs = [
            'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExZXZ5OGQ3cDg5bnp0dHNxenF4ZjFsaGYxNG12enZicGZjdjJqeXlueSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3ZtcLF5HB4nqOpEXAW/giphy.gif',
            'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExODUwejk0MTRvOG5qd3htbWpib2ZkeHF4MHFzZjg3NmIyZXd3NG9qaSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/hxNEBJCP8uQ6aGrTzx/giphy.gif',
            'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdmllYmZpdjVveHJzejEzd29kcG5ocmIxa3BzaDB6Zm1qb3BtY2EzZSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/WVg5BoRXPaID5Y7ALb/giphy.gif',
            'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3YXZqbHlrOTA4MHNnZGYzZjdhZDdjY2R6aGIwOWJqeHIwMjBvYzE3YSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/eQACuze30PkNiS1eb7/giphy.gif',
            'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMHIxd3VkYzRybmwwN2RoczJrYWlhc2o5ZGg5ejV6cXlyeHJ6cTBlZyZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/2Y9eQob7S7ighEhv3y/giphy.gif',
            'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMHIxd3VkYzRybmwwN2RoczJrYWlhc2o5ZGg5ejV6cXlyeHJ6cTBlZyZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/gr7ekRT0Jzmi6mdpPy/giphy.gif',
            'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbXQyZDV5dG0wOG1laDk5YTN4bnJib2sxbXVjeThzZDJiZ3hsMGR0YiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/CQsw5HAiM1FceskMvD/giphy.gif',
            'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExeXVkcmNzazJhbXN6cTBwb2xvd2Q0dnBvcnBrZGY1end4amNyaTgwYSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/QVAVDnrqkXdFNdpmmx/giphy.gif',
            'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExMm0yaWxqMjc4NDZxdjlyM2o3dHdxcHdpNmswbTE4bzRzOHR4cGlkaiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/JPDfJaFOBYS4fpXTBy/giphy.gif',
            'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExdXF2bmVkdG9wbndmaGV2bHB5cnY3MHpobW01YmJiam53c3J2N3I3NSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Hwmr6uVRkJbVasJ7FD/giphy.gif',
            'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTQ3eml2ejd6MGZndWI2eDZrcG50azVseWNkdmNia2wyeHYybmp5MSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Thx9SopwPDbLCXZ7GQ/giphy.gif',
            'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWdlOHM3aDdzYXNvZWVpemd0N2JjN2ZrNTBvYzhtbmJxMjc4eDV3ciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Ly16a3AFbHJ0D3sAs0/giphy.gif',
            'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExeHJwenFhNTk3cWE4a2VsdHNuMXdsc3RlazZoaDRvMnFzZmFheXVzMyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/me9qgHChCBgIB4jTFl/giphy.gif',
        ];
        const gif = summonGifs[Math.floor(Math.random() * summonGifs.length)];
        console.log(`[Summon Debug] Picked gif: ${gif}`);

        const summonPhrases = [
            `🔮 <@${interaction.user.id}> has summoned <@${targetUser.id}> from the shadow realm!`,
            `📜 By ancient decree, <@${interaction.user.id}> summons thee, <@${targetUser.id}>!`,
            `🌀 <@${interaction.user.id}> performed the Summoning Jutsu... <@${targetUser.id}> has appeared!`,
            `⚡ <@${interaction.user.id}> rang the bell. <@${targetUser.id}>, your presence is required immediately.`,
            `🕯️ A circle was drawn. A name was spoken. <@${targetUser.id}>, you have been called by <@${interaction.user.id}>.`,
            `📯 Hear ye, hear ye — <@${interaction.user.id}> summons <@${targetUser.id}> to this realm!`,
            `🧙 <@${interaction.user.id}> cast a summoning spell. <@${targetUser.id}> had no choice but to appear.`
        ];
        const message = summonPhrases[Math.floor(Math.random() * summonPhrases.length)];

        return interaction.editReply({
            content: message,
            embeds: [{ image: { url: gif } }]
        });
      }

case 'connect': {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) return interaction.editReply('❌ Join a voice channel first.');

        let lavaPlayer = client.lavalink.getPlayer(interaction.guildId);

        if (lavaPlayer && lavaPlayer.connected) {
            if (lavaPlayer.voiceChannelId === voiceChannel.id) {
                return interaction.editReply(`✅ I'm already connected to **${voiceChannel.name}**.`);
            }
            const currentChannel = interaction.guild.channels.cache.get(lavaPlayer.voiceChannelId);
            return interaction.editReply(`⚠️ I'm currently connected to **${currentChannel?.name || 'another channel'}**. Use \`/disconnect\` first if you'd like me to move.`);
        }

        if (!lavaPlayer) {
            lavaPlayer = client.lavalink.createPlayer({
                guildId: interaction.guildId,
                voiceChannelId: voiceChannel.id,
                textChannelId: interaction.channelId,
                selfDeaf: false,
                selfMute: false
            });
        }
        if (!lavaPlayer.connected) await lavaPlayer.connect();
        guild247.add(interaction.guildId);
        return interaction.editReply(`🔌 Connected to **${voiceChannel.name}** and staying put (use \`/disconnect\` to leave).`);
      }

      case 'disconnect': {
        const lavaPlayer = client.lavalink.getPlayer(interaction.guildId);
        guild247.delete(interaction.guildId);
        if (lavaPlayer) await lavaPlayer.destroy();
        return interaction.editReply('🔌 Disconnected.');
      }

      case '247': {
        if (guild247.has(interaction.guildId)) {
            guild247.delete(interaction.guildId);
            return interaction.editReply('🌙 24/7 mode **disabled** — I\'ll leave when idle.');
        }
        guild247.add(interaction.guildId);
        return interaction.editReply('☀️ 24/7 mode **enabled** — I\'ll stay connected.');
      }

      case 'chatbot': {
        const setting = options.getString('mode');
        if (setting === 'on') {
            chatbotEnabled.add(interaction.guildId);
            if (!database.chatbotGuilds.includes(interaction.guildId)) database.chatbotGuilds.push(interaction.guildId);
        } else {
            chatbotEnabled.delete(interaction.guildId);
            database.chatbotGuilds = database.chatbotGuilds.filter(id => id !== interaction.guildId);
        }
        saveData(database);
        return interaction.editReply(`🤖 Chatbot mode **${setting === 'on' ? 'enabled' : 'disabled'}**. ${setting === 'on' ? 'Mention me anywhere and I\'ll respond!' : ''}`);
      }

      case '8ball': {
        const question = options.getString('question');
        const answers = [
            "It is certain.", "Without a doubt.", "Yes, definitely.", "You may rely on it.",
            "Most likely.", "Signs point to yes.", "Reply hazy, try again.", "Ask again later.",
            "Cannot predict now.", "Don't count on it.", "My reply is no.", "Outlook not so good.", "Very doubtful."
        ];
        const answer = answers[Math.floor(Math.random() * answers.length)];
        return interaction.editReply(`🎱 **${question}**\n${answer}`);
      }

      case 'coinflip': {
        const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
        return interaction.editReply(`🪙 The coin landed on **${result}**!`);
      }

      case 'roll': {
        const sides = options.getInteger('sides') || 6;
        if (sides < 2) return interaction.editReply('❌ Dice need at least 2 sides.');
        const result = Math.floor(Math.random() * sides) + 1;
        return interaction.editReply(`🎲 You rolled a **${result}** (out of ${sides}).`);
      }

      case 'rps': {
        const choice = options.getString('choice');
        const options_list = ['rock', 'paper', 'scissors'];
        const botChoice = options_list[Math.floor(Math.random() * 3)];
        let result;
        if (choice === botChoice) result = "It's a tie!";
        else if (
            (choice === 'rock' && botChoice === 'scissors') ||
            (choice === 'paper' && botChoice === 'rock') ||
            (choice === 'scissors' && botChoice === 'paper')
        ) result = "You win! 🎉";
        else result = "I win! 😎";
        const emoji = { rock: '🪨', paper: '📄', scissors: '✂️' };
        return interaction.editReply(`You chose ${emoji[choice]} **${choice}**\nI chose ${emoji[botChoice]} **${botChoice}**\n\n${result}`);
      }

      case 'ship': {
        const user1 = options.getUser('user1');
        const user2 = options.getUser('user2');
        const percent = Math.floor(Math.random() * 101);
        const barLength = 20;
        const filled = Math.round((percent / 100) * barLength);
        const bar = '💖'.repeat(Math.max(Math.round(filled / 2), 0)) + '🖤'.repeat(Math.max(Math.round((barLength - filled) / 2), 0));
        let verdict;
        if (percent >= 90) verdict = "Soulmates. It's written in the stars. ✨";
        else if (percent >= 70) verdict = "Strong potential here! 💕";
        else if (percent >= 40) verdict = "Could go either way, honestly.";
        else if (percent >= 15) verdict = "...it's giving 'just friends' energy.";
        else verdict = "Yeah, hard pass from the universe on this one. 💀";
        return interaction.editReply(`💘 **${user1.username}** × **${user2.username}**\n${bar}\n**${percent}%** compatible\n${verdict}`);
      }

      case 'avatar': {
        const target = options.getUser('user') || interaction.user;
        return interaction.editReply({
            content: `🖼️ **${target.username}**'s avatar:`,
            embeds: [{ image: { url: target.displayAvatarURL({ size: 1024 }) } }]
        });
      }

      case 'rate': {
        const thing = options.getString('thing');
        const rating = Math.floor(Math.random() * 11);
        return interaction.editReply(`📊 I'd rate **${thing}** a solid **${rating}/10**.`);
      }

      case 'tictactoe': {
        const opponent = options.getUser('opponent');
        if (opponent.bot) return interaction.editReply('❌ You can\'t challenge a bot.');
        if (opponent.id === interaction.user.id) return interaction.editReply('❌ You can\'t challenge yourself.');

        const board = Array(9).fill(null);
        let currentPlayer = interaction.user.id;
        const players = { [interaction.user.id]: '❌', [opponent.id]: '⭕' };

        function renderBoard(winner) {
            const rows = [];
            for (let i = 0; i < 9; i += 3) {
                rows.push(
                    new ActionRowBuilder().addComponents(
                        [0, 1, 2].map(j => {
                            const idx = i + j;
                            return new ButtonBuilder()
                                .setCustomId(`ttt_${idx}`)
                                .setLabel(board[idx] || '\u200b')
                                .setStyle(board[idx] === '❌' ? ButtonStyle.Danger : board[idx] === '⭕' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                                .setDisabled(!!board[idx] || !!winner);
                        })
                    )
                );
            }
            return rows;
        }

        function checkWinner() {
            const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
            for (const [a,b,c] of lines) {
                if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
            }
            if (board.every(cell => cell)) return 'draw';
            return null;
        }

        const msg = await interaction.editReply({
            content: `❌ <@${interaction.user.id}> vs ⭕ <@${opponent.id}>\nTurn: <@${currentPlayer}>`,
            components: renderBoard(null)
        });

        const collector = msg.createMessageComponentCollector({ time: 120000 });

        collector.on('collect', async (btn) => {
            if (btn.user.id !== currentPlayer) {
                return btn.reply({ content: '⏳ Not your turn.', ephemeral: true });
            }
            const idx = parseInt(btn.customId.split('_')[1]);
            if (board[idx]) return btn.deferUpdate();

            board[idx] = players[currentPlayer];
            const winner = checkWinner();

            if (winner === 'draw') {
                await btn.update({ content: `🤝 It's a draw!`, components: renderBoard(true) });
                collector.stop();
                return;
            }
            if (winner) {
                const winnerId = Object.keys(players).find(id => players[id] === winner);
                await btn.update({ content: `🏆 <@${winnerId}> wins!`, components: renderBoard(true) });
                collector.stop();
                return;
            }

            currentPlayer = currentPlayer === interaction.user.id ? opponent.id : interaction.user.id;
            await btn.update({
                content: `❌ <@${interaction.user.id}> vs ⭕ <@${opponent.id}>\nTurn: <@${currentPlayer}>`,
                components: renderBoard(null)
            });
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                interaction.editReply({ content: '⏱️ Game timed out.', components: renderBoard(true) }).catch(() => null);
            }
        });

        break;
      }

      case 'pat': case 'hug': case 'kiss': case 'slap': case 'bite': case 'tickle': case 'cuddle': case 'poke': {
        await handleActionCommand(interaction, commandName);
        break;
      }

      case 'fact': {
        const facts = [
            "Bananas are berries, but strawberries aren't.",
            "Octopuses have three hearts.",
            "A day on Venus is longer than a year on Venus.",
            "Honey never spoils — archaeologists have found 3000-year-old honey that's still edible.",
            "Wombat poop is cube-shaped.",
            "The Eiffel Tower grows taller in summer due to heat expansion.",
            "Sharks existed before trees.",
            "There are more possible chess games than atoms in the observable universe.",
            "Sea otters hold hands while sleeping so they don't drift apart.",
            "A group of flamingos is called a 'flamboyance'.",
            "Your stomach gets an entirely new lining every 3-4 days.",
            "Cows have best friends and get stressed when separated.",
            "The shortest war in history lasted 38 minutes.",
            "Bananas are slightly radioactive.",
            "Scotland's national animal is the unicorn."
        ];
        return interaction.editReply(`🧠 ${facts[Math.floor(Math.random() * facts.length)]}`);
      }

      case 'wyr': {
        const prompts = [
            "have the ability to fly, or be invisible?",
            "always be 10 minutes late, or always be 20 minutes early?",
            "fight one horse-sized duck, or 100 duck-sized horses?",
            "know when you're going to die, or how you're going to die?",
            "have unlimited money but no friends, or unlimited friends but no money?",
            "be able to talk to animals, or speak every human language?",
            "lose all your memories, or never make new ones again?",
            "live without music, or live without movies?",
            "always say what's on your mind, or never speak again?",
            "have a rewind button, or a pause button on life?"
        ];
        return interaction.editReply(`🤔 Would you rather ${prompts[Math.floor(Math.random() * prompts.length)]}`);
      }

      // case 'roast': {
      //   const target = options.getUser('user');
      //   try {
      //       const response = await gemini.models.generateContent({
      //           model: 'gemini-flash-latest',
      //           contents: [{ role: 'user', parts: [{ text: `Write a short, funny, PG-13 roast (1-2 sentences) aimed playfully at someone named ${target.username}. Keep it light and funny, not genuinely mean.` }] }],
      //           config: { thinkingConfig: { thinkingBudget: 0 }, maxOutputTokens: 200 }
      //       });
      case 'roast': {
        const target = options.getUser('user');
        try {
            const response = await gemini.models.generateContent({
                model: 'gemini-2.0-flash', // Updated model name
                contents: [{ role: 'user', parts: [{ text: `Write a short, funny, PG-13 roast (1-2 sentences) aimed playfully at someone named ${target.username}. Keep it light and funny, not genuinely mean.` }] }],
                config: { maxOutputTokens: 200 } // Removed thinkingConfig
            });
            const roast = response.text?.trim() || `${target.username} is so boring even I couldn't think of a roast.`;
            return interaction.editReply(`🔥 <@${target.id}>: ${roast}`);
        } catch (e) {
            console.error('[Roast Error]', e);
            return interaction.editReply('❌ Roast generator is out of ammo right now.');
        }
      }

      // case 'compliment': {
      //   const target = options.getUser('user');
      //   try {
      //       const response = await gemini.models.generateContent({
      //           model: 'gemini-flash-latest',
      //           contents: [{ role: 'user', parts: [{ text: `Write a short, warm, genuine compliment (1-2 sentences) for someone named ${target.username}.` }] }],
      //           config: { thinkingConfig: { thinkingBudget: 0 }, maxOutputTokens: 200 }
      //       });
      case 'compliment': {
        const target = options.getUser('user');
        try {
            const response = await gemini.models.generateContent({
                model: 'gemini-2.0-flash', // Updated model name
                contents: [{ role: 'user', parts: [{ text: `Write a short, warm, genuine compliment (1-2 sentences) for someone named ${target.username}.` }] }],
                config: { maxOutputTokens: 200 } // Removed thinkingConfig
            });
            const compliment = response.text?.trim() || `${target.username} is pretty great, honestly.`;
            return interaction.editReply(`💐 <@${target.id}>: ${compliment}`);
        } catch (e) {
            console.error('[Compliment Error]', e);
            return interaction.editReply('❌ Compliment generator is having a moment.');
        }
      }

      case 'emojify': {
        const text = options.getString('text');
        const emojified = text.split('').map(ch => {
            const lower = ch.toLowerCase();
            if (/[a-z]/.test(lower)) return `:regional_indicator_${lower}:`;
            if (ch === ' ') return '   ';
            return ch;
        }).join(' ');
        return interaction.editReply(emojified.slice(0, 2000));
      }

      case 'serverinfo': {
        const guild = interaction.guild;
        const e = buildEmbed('Server Info', 'ℹ️', 0x3498db, [
            { name: 'Name', value: guild.name, inline: true },
            { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
            { name: 'Members', value: `${guild.memberCount}`, inline: true },
            { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
            { name: 'Boosts', value: `${guild.premiumSubscriptionCount || 0}`, inline: true },
            { name: 'Channels', value: `${guild.channels.cache.size}`, inline: true },
        ]);
        return interaction.editReply({ embeds: [e] });
      }

      case 'roleinfo': {
        const role = options.getRole('role');
        const e = buildEmbed('Role Info', '🎭', role.color || 0x99aab5, [
            { name: 'Name', value: role.name, inline: true },
            { name: 'Members', value: `${role.members.size}`, inline: true },
            { name: 'Position', value: `${role.position}`, inline: true },
            { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
            { name: 'Created', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:D>`, inline: true },
        ]);
        return interaction.editReply({ embeds: [e] });
      }

      case 'poll': {
        const question = options.getString('question');
        const pollMsg = await interaction.editReply({
            embeds: [buildEmbed('Poll', '📊', 0x9b59b6, [{ name: question, value: `Asked by <@${interaction.user.id}>` }])],
            fetchReply: true
        });
        await pollMsg.react('👍');
        await pollMsg.react('👎');
        break;
      }

      case 'remindme': {
        const time = options.getString('time');
        const text = options.getString('text');
        const ms = parseDuration(time);
        if (!ms) return interaction.editReply('❌ Invalid time format. Use e.g. 10m, 1h, 2d.');
        if (ms > 7 * 24 * 60 * 60 * 1000) return interaction.editReply('❌ Max reminder time is 7 days.');
        await interaction.editReply(`⏰ Got it — I'll remind you about "${text}" in ${time}. (Note: reminders don't survive a bot restart.)`);
        setTimeout(() => {
            interaction.user.send(`⏰ **Reminder:** ${text}`).catch(() => {
                interaction.channel.send(`⏰ <@${interaction.user.id}> reminder: ${text}`).catch(() => null);
            });
        }, ms);
        break;
      }

      case 'note': {
        const user = options.getUser('user');
        const text = options.getString('text');
        database.notes[user.id] ??= [];
        database.notes[user.id].push({ text, by: interaction.user.id, at: Date.now() });
        saveData(database);
        return interaction.editReply(`📝 Note added for <@${user.id}>.`);
      }

      case 'notes': {
        const user = options.getUser('user');
        const notes = database.notes[user.id] || [];
        if (!notes.length) return interaction.editReply(`No notes on <@${user.id}>.`);
        const list = notes.map((n, i) => `${i + 1}. ${n.text} — <t:${Math.floor(n.at / 1000)}:R>`).join('\n');
        return interaction.editReply({ embeds: [buildEmbed(`Notes: ${user.username}`, '📝', 0x9b59b6, [{ name: 'Entries', value: list.slice(0, 1000) }])] });
      }

      case 'nickname': {
        const user = options.getUser('user');
        const newNick = options.getString('name');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.editReply('❌ Member not found.');
        await member.setNickname(newNick || null).catch(() => null);
        return interaction.editReply(`✏️ Nickname for <@${user.id}> set to **${newNick || '(reset)'}**.`);
      }

      case 'lockdown': {
        const channels = interaction.guild.channels.cache.filter(c => c.isTextBased() && !c.isThread());
        let count = 0;
        for (const [, ch] of channels) {
            await ch.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false }).catch(() => null);
            count++;
        }
        return interaction.editReply(`🔒 Locked down **${count}** channels.`);
      }

      case 'unlockdown': {
        const channels = interaction.guild.channels.cache.filter(c => c.isTextBased() && !c.isThread());
        let count = 0;
        for (const [, ch] of channels) {
            await ch.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null }).catch(() => null);
            count++;
        }
        return interaction.editReply(`🔓 Unlocked **${count}** channels.`);
      }

      case 'masskick': {
        const ids = options.getString('users').split(',').map(s => s.trim()).filter(Boolean);
        const reason = options.getString('reason') || 'Mass kick';
        let success = 0, fail = 0;
        for (const id of ids) {
            const member = await interaction.guild.members.fetch(id).catch(() => null);
            if (member) { await member.kick(reason).then(() => success++).catch(() => fail++); }
            else fail++;
        }
        createCase(interaction, 'masskick', ids.join(','), reason);
        return interaction.editReply(`👢 Kicked **${success}** users. Failed: **${fail}**.`);
      }

      case 'massban': {
        const ids = options.getString('users').split(',').map(s => s.trim()).filter(Boolean);
        const reason = options.getString('reason') || 'Mass ban';
        let success = 0, fail = 0;
        for (const id of ids) {
            await interaction.guild.members.ban(id, { reason }).then(() => success++).catch(() => fail++);
        }
        createCase(interaction, 'massban', ids.join(','), reason);
        return interaction.editReply(`🔨 Banned **${success}** users. Failed: **${fail}**.`);
      }

      case 'muteall': {
        const vc = interaction.member.voice.channel;
        if (!vc) return interaction.editReply('❌ Join a voice channel first.');
        let count = 0;
        for (const [, member] of vc.members) { await member.voice.setMute(true).catch(() => null); count++; }
        return interaction.editReply(`🔇 Muted **${count}** members in **${vc.name}**.`);
      }

      case 'unmuteall': {
        const vc = interaction.member.voice.channel;
        if (!vc) return interaction.editReply('❌ Join a voice channel first.');
        let count = 0;
        for (const [, member] of vc.members) { await member.voice.setMute(false).catch(() => null); count++; }
        return interaction.editReply(`🔊 Unmuted **${count}** members in **${vc.name}**.`);
      }

      case 'connect4': {
        const opponent = options.getUser('opponent');
        if (opponent.bot) return interaction.editReply('❌ You can\'t challenge a bot.');
        if (opponent.id === interaction.user.id) return interaction.editReply('❌ You can\'t challenge yourself.');

        const ROWS = 6, COLS = 7;
        const board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
        let currentPlayer = interaction.user.id;
        const players = { [interaction.user.id]: '🔴', [opponent.id]: '🟡' };

        function renderText() {
            let out = '';
            for (let r = 0; r < ROWS; r++) out += board[r].map(cell => cell || '⚪').join('') + '\n';
            out += '1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣';
            return out;
        }
        function dropPiece(col, symbol) {
            for (let r = ROWS - 1; r >= 0; r--) if (!board[r][col]) { board[r][col] = symbol; return r; }
            return -1;
        }
        function checkWin(symbol) {
            for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
                if (board[r][c] !== symbol) continue;
                for (const [dr, dc] of [[0,1],[1,0],[1,1],[1,-1]]) {
                    let count = 1;
                    for (let i = 1; i < 4; i++) {
                        const nr = r + dr*i, nc = c + dc*i;
                        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || board[nr][nc] !== symbol) break;
                        count++;
                    }
                    if (count >= 4) return true;
                }
            }
            return false;
        }
        function renderButtons(disabled) {
            const row1 = new ActionRowBuilder().addComponents(
                [0,1,2,3,4].map(c => new ButtonBuilder().setCustomId(`c4_${c}`).setLabel(`${c+1}`).setStyle(ButtonStyle.Secondary).setDisabled(disabled || board[0][c] !== null))
            );
            const row2 = new ActionRowBuilder().addComponents(
                [5,6].map(c => new ButtonBuilder().setCustomId(`c4_${c}`).setLabel(`${c+1}`).setStyle(ButtonStyle.Secondary).setDisabled(disabled || board[0][c] !== null))
            );
            return [row1, row2];
        }

        const msg = await interaction.editReply({
            content: `🔴 <@${interaction.user.id}> vs 🟡 <@${opponent.id}>\n${renderText()}\nTurn: <@${currentPlayer}>`,
            components: renderButtons(false)
        });
        const collector = msg.createMessageComponentCollector({ time: 180000 });

        collector.on('collect', async (btn) => {
            if (btn.user.id !== currentPlayer) return btn.reply({ content: '⏳ Not your turn.', ephemeral: true });
            const col = parseInt(btn.customId.split('_')[1]);
            const symbol = players[currentPlayer];
            if (dropPiece(col, symbol) === -1) return btn.deferUpdate();

            if (checkWin(symbol)) {
                await btn.update({ content: `🏆 <@${currentPlayer}> wins Connect 4!\n${renderText()}`, components: renderButtons(true) });
                collector.stop();
                return;
            }
            if (board.every(r => r.every(c => c))) {
                await btn.update({ content: `🤝 It's a draw!\n${renderText()}`, components: renderButtons(true) });
                collector.stop();
                return;
            }
            currentPlayer = currentPlayer === interaction.user.id ? opponent.id : interaction.user.id;
            await btn.update({
                content: `🔴 <@${interaction.user.id}> vs 🟡 <@${opponent.id}>\n${renderText()}\nTurn: <@${currentPlayer}>`,
                components: renderButtons(false)
            });
        });
        collector.on('end', (collected, reason) => {
            if (reason === 'time') interaction.editReply({ content: '⏱️ Game timed out.', components: renderButtons(true) }).catch(() => null);
        });
        break;
      }

      case 'rpsduel': {
        const opponent = options.getUser('opponent');
        if (opponent.bot) return interaction.editReply('❌ You can\'t challenge a bot.');
        if (opponent.id === interaction.user.id) return interaction.editReply('❌ You can\'t challenge yourself.');

        const choices = {};
        const emoji = { rock: '🪨', paper: '📄', scissors: '✂️' };
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('rpsd_rock').setLabel('Rock 🪨').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('rpsd_paper').setLabel('Paper 📄').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('rpsd_scissors').setLabel('Scissors ✂️').setStyle(ButtonStyle.Secondary)
        );
        const msg = await interaction.editReply({
            content: `⚔️ <@${interaction.user.id}> challenges <@${opponent.id}> to RPS! Both players pick your move (only you see your own pick).`,
            components: [row]
        });
        const collector = msg.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async (btn) => {
            if (![interaction.user.id, opponent.id].includes(btn.user.id)) {
                return btn.reply({ content: '❌ This isn\'t your duel.', ephemeral: true });
            }
            if (choices[btn.user.id]) return btn.reply({ content: '✅ You already picked.', ephemeral: true });
            choices[btn.user.id] = btn.customId.split('_')[1];
            await btn.reply({ content: `You picked ${emoji[choices[btn.user.id]]} ${choices[btn.user.id]}!`, ephemeral: true });

            if (Object.keys(choices).length === 2) {
                const p1 = interaction.user.id, p2 = opponent.id;
                const c1 = choices[p1], c2 = choices[p2];
                let result;
                if (c1 === c2) result = "🤝 It's a tie!";
                else if ((c1 === 'rock' && c2 === 'scissors') || (c1 === 'paper' && c2 === 'rock') || (c1 === 'scissors' && c2 === 'paper')) result = `🏆 <@${p1}> wins!`;
                else result = `🏆 <@${p2}> wins!`;
                await interaction.editReply({
                    content: `⚔️ **Results:**\n<@${p1}>: ${emoji[c1]} ${c1}\n<@${p2}>: ${emoji[c2]} ${c2}\n\n${result}`,
                    components: []
                });
                collector.stop();
            }
        });
        collector.on('end', (collected, reason) => {
            if (reason === 'time' && Object.keys(choices).length < 2) {
                interaction.editReply({ content: '⏱️ Duel timed out — someone didn\'t pick in time.', components: [] }).catch(() => null);
            }
        });
        break;
      }

      case 'nowplaying': {
        const lavaPlayer = client.lavalink.getPlayer(interaction.guildId);
        if (!lavaPlayer || !lavaPlayer.queue.current) return interaction.editReply('❌ Nothing is playing right now.');
        const track = lavaPlayer.queue.current;
        const position = lavaPlayer.position || 0;
        const duration = track.info.length || 0;
        const barLength = 20;
        const filled = duration ? Math.round((position / duration) * barLength) : 0;
        const bar = '▬'.repeat(Math.max(filled - 1, 0)) + '🔘' + '▬'.repeat(Math.max(barLength - filled, 0));
        return interaction.editReply(`🎶 **Now Playing:** ${track.info.title} — ${track.info.author}\n\`${formatMs(position)}\` ${bar} \`${formatMs(duration)}\``);
      }

      case 'pause': {
        const lavaPlayer = client.lavalink.getPlayer(interaction.guildId);
        if (!lavaPlayer || !lavaPlayer.playing) return interaction.editReply('❌ Nothing is playing.');
        if (lavaPlayer.paused) return interaction.editReply('⏸️ Already paused.');
        await lavaPlayer.pause();
        return interaction.editReply('⏸️ Paused.');
      }

      case 'resume': {
        const lavaPlayer = client.lavalink.getPlayer(interaction.guildId);
        if (!lavaPlayer) return interaction.editReply('❌ Nothing to resume.');
        if (!lavaPlayer.paused) return interaction.editReply('▶️ Already playing.');
        await lavaPlayer.resume();
        return interaction.editReply('▶️ Resumed.');
      }

      case 'queue': {
        const lavaPlayer = client.lavalink.getPlayer(interaction.guildId);
        if (!lavaPlayer || (!lavaPlayer.queue.current && !lavaPlayer.queue.tracks.length)) {
            return interaction.editReply('❌ Queue is empty.');
        }
        const current = lavaPlayer.queue.current;
        const upcoming = lavaPlayer.queue.tracks.slice(0, 10);
        let msg = current ? `**Now Playing:** ${current.info.title}\n\n` : '';
        msg += upcoming.length
            ? upcoming.map((t, i) => `${i + 1}. ${t.info.title} — ${t.info.author}`).join('\n')
            : '_Nothing queued up next._';
        if (lavaPlayer.queue.tracks.length > 10) msg += `\n...and ${lavaPlayer.queue.tracks.length - 10} more.`;
        return interaction.editReply(msg);
      }

      case 'volume': {
        const lavaPlayer = client.lavalink.getPlayer(interaction.guildId);
        if (!lavaPlayer) return interaction.editReply('❌ I need to be connected first.');
        const level = options.getInteger('level');
        if (level < 0 || level > 150) return interaction.editReply('❌ Volume must be between 0 and 150.');
        await lavaPlayer.setVolume(level);
        return interaction.editReply(`🔊 Volume set to **${level}%**.`);
      }

      case 'loop': {
        const lavaPlayer = client.lavalink.getPlayer(interaction.guildId);
        if (!lavaPlayer) return interaction.editReply('❌ I need to be connected first.');
        const mode = options.getString('mode');
        await lavaPlayer.setRepeatMode(mode);
        const labels = { off: '➡️ Loop disabled.', track: '🔂 Looping current track.', queue: '🔁 Looping the queue.' };
        return interaction.editReply(labels[mode]);
      }

      case 'shuffle': {
        const lavaPlayer = client.lavalink.getPlayer(interaction.guildId);
        if (!lavaPlayer || lavaPlayer.queue.tracks.length < 2) return interaction.editReply('❌ Not enough tracks in queue to shuffle.');
        await lavaPlayer.queue.shuffle();
        return interaction.editReply('🔀 Queue shuffled.');
      }

      case 'play': {
        const query = options.getString('query');
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) return interaction.editReply('❌ Join a voice channel first.');

        try {
          let lavaPlayer = client.lavalink.getPlayer(interaction.guildId);
          if (!lavaPlayer) {
              lavaPlayer = client.lavalink.createPlayer({
                  guildId: interaction.guildId,
                  voiceChannelId: voiceChannel.id,
                  textChannelId: interaction.channelId,
                  selfDeaf: false,
                  selfMute: false
              });
          }
          if (!lavaPlayer.connected) await lavaPlayer.connect();

          const isUrl = /^https?:\/\//i.test(query);
          const res = await lavaPlayer.search(isUrl ? { query } : { query, source: 'ytsearch' }, interaction.user);
          console.log('[Play Debug] loadType:', res?.loadType, '| tracks:', res?.tracks?.length, '| exception:', res?.exception);
          if (!res || !res.tracks?.length) {
              return interaction.editReply(`❌ No results found for "${query}"`);
          }

          const track = res.tracks[0];
          await lavaPlayer.queue.add(track);
          if (!lavaPlayer.playing) await lavaPlayer.play();

          return interaction.editReply(`🎶 Added to queue: **${track.info.title}** by **${track.info.author}**`);
        } catch (error) {
          console.error('Play command error:', error);
          return interaction.editReply(`❌ Could not play track: ${error.message || 'Unknown error'}`);
        }
      }

      case 'skip': {
        const lavaPlayer = client.lavalink.getPlayer(interaction.guildId);
        if (lavaPlayer) await lavaPlayer.skip();
        return interaction.editReply('⏭️ Skipped.');
      }

      case 'stop': {
        const lavaPlayer = client.lavalink.getPlayer(interaction.guildId);
        if (lavaPlayer) await lavaPlayer.destroy();
        return interaction.editReply('⏹️ Stopped and left VC.');
      }

      default:
        await interaction.editReply('❌ Command execution logic missing.').catch(()=>null);
    }
  } catch (error) {
    console.error(`Error in ${commandName}:`, error);
    try {
        await interaction.followUp({ content: '❌ An error occurred executing this command.', ephemeral: true }).catch(() => null);
    } catch (e) {
        // Ignore silent fails
    }
  }
});

import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

// 🌐 Health Check
app.get('/', (req, res) => res.send('VePlexity API Online 🚀'));

// 📊 Dashboard API Endpoint: Get Bot Stats & Database Info
app.get('/api/stats', (req, res) => {
  res.json({
    status: 'online',
    ping: client.ws.ping,
    servers: client.guilds.cache.size,
    users: client.users.cache.size,
    totalCases: database.caseCounter,
    // Send the last 5 moderation cases
    recentCases: Object.entries(database.cases).slice(-5).map(([id, data]) => ({ id, ...data }))
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`🌐 API listening on 0.0.0.0:${PORT}`));
client.login(process.env.DISCORD_TOKEN.replace(/['"]/g, '').trim());