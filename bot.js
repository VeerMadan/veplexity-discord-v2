import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
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
            model: 'gemini-flash-latest',
            contents,
            config: {
                systemInstruction: "You're VePlexity, a witty, friendly Discord bot. Keep replies short and conversational — a sentence or two unless the question genuinely needs more. You have a playful sense of humor and often use emojis. Avoid long explanations or lists. If you don't know the answer, admit it politely. and when asked, be like a flirty girl too, who speaks in highly casual, playful, and flirty manner. Use emojis liberally to convey tone and emotion. Keep your responses concise, fun, and engaging.",
                maxOutputTokens: 300
            }
        });

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
  
  const MOD_COMMANDS = ['warn', 'pvc_warn', 'kick', 'timeout', 'ban', 'pvc_ban', 'warnings', 'clearwarnings', 'modlogs', 'pvc_restore', 'case', 'cases', 'purge', 'lock', 'unlock', 'slowmode'];
  
  if (MOD_COMMANDS.includes(commandName)) {
      const member = interaction.member;
      const hasPerms = member.id === interaction.guild.ownerId || 
                       member.permissions.has('Administrator') || 
                       member.roles.cache.some(r => ALLOWED_MOD_ROLE_IDS.includes(r.id));
      if (!hasPerms) {
          return interaction.reply({ content: getRandomNoPermMessage(), ephemeral: true });
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
        
        const caseId = createCase(interaction, 'timeout', user.id, reason);
        await member.timeout(parseDuration(duration), reason);
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
        const caseId = createCase(interaction, 'pvc_ban', user.id, reason);
        await interaction.editReply({ embeds: [buildEmbed('Private VC Revoked', '🚫', 0xe74c3c, [{ name: 'User', value: `<@${user.id}>` }, { name: 'Reason', value: reason }])] });
        break;
      }

      case 'pvc_restore': {
        const user = options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id).catch(()=>null);
        if (member) await member.roles.add(PRIVATE_VC_ROLE_IDS).catch(()=>null);
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