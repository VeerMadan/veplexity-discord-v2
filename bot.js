import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import { Player } from 'discord-player';
import { YoutubeiExtractor } from 'discord-player-youtubei';
import { DefaultExtractors } from '@discord-player/extractor';
import ffmpeg from 'ffmpeg-static';

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
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages],
});

client.on('error', err => console.log(`[Discord Client Error] ${err.message}`));

const player = new Player(client, { skipFFmpeg: false });
player.extractors.register(YoutubeiExtractor, { streamOptions: { useClient: 'WEB' } }).catch(console.error);
player.extractors.loadMulti(DefaultExtractors).catch(console.error);

client.once('clientReady', () => console.log(`🤖 Logged in as ${client.user.tag}`));

/* =========================
   THE MASTER ROUTER
========================= */
client.on('interactionCreate', async (interaction) => {
  if (interaction.isAutocomplete()) {
      const query = interaction.options.getString('query');
      if (!query) return interaction.respond([]);
      const results = await player.search(query, { searchEngine: 'soundcloudSearch' });
      return interaction.respond(results.tracks.slice(0, 10).map(t => ({ name: `${t.title} - ${t.author}`.slice(0, 100), value: t.title.slice(0, 100) })));
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

      case 'play': {
        const query = options.getString('query');
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) return interaction.editReply('❌ Join a voice channel first.');
        
        const searchResult = await player.search(query, { requestedBy: interaction.user, searchEngine: 'soundcloudSearch' });
        if (!searchResult.hasTracks()) return interaction.editReply('❌ No results found.');
        
        await player.play(voiceChannel, searchResult.tracks[0], { nodeOptions: { metadata: interaction, biquad: 'classic' }});
        return interaction.editReply(`🎶 Added to queue: **${searchResult.tracks[0].title}**`);
      }

      case 'skip': {
        const q = player.nodes.get(interaction.guildId);
        if (q) q.node.skip();
        return interaction.editReply('⏭️ Skipped.');
      }

      case 'stop': {
        const q = player.nodes.get(interaction.guildId);
        if (q) q.delete();
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

//const PORT = process.env.PORT || 8080;
//app.listen(PORT, '0.0.0.0', () => console.log(`🌐 Dashboard API running on port ${PORT}`));


// Find this in bot.js and change it:
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`🌐 API listening on 0.0.0.0:${PORT}`));
client.login(process.env.DISCORD_TOKEN.replace(/['"]/g, '').trim());
