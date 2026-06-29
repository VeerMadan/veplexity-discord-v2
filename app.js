import { playSong, stopSong } from './music.js';
import 'dotenv/config';
  import express from 'express';
  import {
    verifyKey,
    InteractionType,
    InteractionResponseType,
  } from 'discord-interactions';
  import { DiscordRequest } from './utils.js';
  import fs from 'fs';
  import path from 'path';


const DATA_PATH = path.resolve('./data/storage.json');

function loadData() {
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(
  DATA_PATH,
  JSON.stringify({ warns: {}, modLogs: {}, cases: {}, caseCounter: 0 }, null, 2)
);
  }
  return JSON.parse(fs.readFileSync(DATA_PATH));
}

function saveData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}
function createCase(interaction, action, userId, reason) {
  database.caseCounter++;

  const id = database.caseCounter;

  database.cases[id] = {
    action,
    user: userId,
    moderator: interaction.member.user.id,
    reason,
    channel: interaction.channel_id,
    timestamp: new Date().toISOString()
  };

  setImmediate(() => saveData(database));

  return id;
}

let database = loadData();

database.warns ??= {};
database.modLogs ??= {};
database.cases ??= {};
database.caseCounter ??= 0;



  const WARNING_ESCALATION = {
    3: { type: 'timeout', duration: '10m' },
    4: { type: 'timeout', duration: '1h' },
    5: { type: 'timeout', duration: '12h' },
    6: { type: 'kick' },
    7: { type: 'ban' },
  };

    const PRIVATE_VC_ROLE_IDS = [
      '1469376368067477689',
      

    ];



  const NO_PERMISSION_MESSAGES = [
    // Funny
    "🚫 Bro… you tried to use a mod command with civilian privileges 💀",
    "🛑 Calm down there, future moderator. That button isn't for you.",
    "🤨 Who gave you that confidence?",
    "🎮 Achievement Unlocked: Attempted Power Abuse (Denied)",

    // Roast style
    "💀 My guy really thought he had admin perms.",
    "📛 You have enthusiasm. Unfortunately, not permissions.",
    "🚪 The mod panel door is locked. You're outside.",
    "🧢 That's a bold move for someone without the role.",

    // Slightly serious
    "❌ You lack the required role <@&1469048464330588210>, <@&1469048464330588209>, <@&1469048464330588208>, <@&1469048464330588207> to execute moderation commands.",
    "⚠️ Moderation access restricted to staff roles only.<@&1469048464406220970>",
    "🔒 This command is staff-only.<@&1469048464406220970>",
    "📜 You must obtain the appropriate roles to use this command.",

    // Sarcastic
    "🧠 Interesting decision. Unfortunately, no.",
    "🎖 Authority not found.",
    "📉 Power level: insufficient.",
    "🚫 Access denied. Try again after ranking up.",
    "💡 Tip: Become a moderator first.",
    // 🤡 Light Fun (friendly meme vibe)
    "❌ Hold up there, champ!\nThis command is VIP-only 😌\nGrab the <@&1469048464330588210> or <@&1469048464330588208> role and come back like a legend.",

    // 😈 Playful Roast (respectful)
    "❌ Whoa whoa whoa!\nThis button is not for civilians 🫡\nYou’ll need the <@&1469048464330588210> or <@&1469048464330588208> role to unlock this power.",

    // 🤖 Self-aware Bot Humor
    "❌ Error 403: Authority not found 🤖\nPlease install <@&1469048464330588210> or <@&1469048464330588208> role to continue.",

    // 🛑 Mock-serious authority tone
    "❌ ACCESS DENIED\nRequired clearance level:\n<@&1469048464330588210> or <@&1469048464330588208>\nNice try though 👀",

    // 🎮 Gamer-style
    "❌ Ability locked 🔒\nRequired perks:\n<@&1469048464330588210> or <@&1469048464330588208> some ranks and try again 💪",

    // 😆 Short & clean
    "❌ Nope.\nMods only 😌\n(<@&1469048464330588210> / <@&1469048464330588208> required)",

    // Extra fun variants
    "🚫 This command is under staff supervision.\nPlease acquire 🎖 Admin or <@&1469048464330588208> status.",
    "🧢 That confidence is crazy.\nUnfortunately, permissions are not.",
    "🔐 Staff-only zone.\nApply for <@&1469048464330588210> or <@&1469048464330588208>.",
    
  
  ];
  function getRandomNoPermMessage() {
  return NO_PERMISSION_MESSAGES[
    Math.floor(Math.random() * NO_PERMISSION_MESSAGES.length)
  ];
}
    
  const app = express();
  const PORT = process.env.PORT || 8080;
  const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;
  // Role IDs allowed to use moderation commands
  // who tf allowed mod role ids to be hardcoded like this, should be env vars or smth
  // fuck it, it's faster to hardcode for now and we can change later if needed
  const ALLOWED_MOD_ROLE_IDS = [
    '1469048464406220972', // Owner
    '1469048464330588210', // Administrator
    '1469048464330588209', // Senior Moderator
    '1469048464330588208', // Moderator
    '1469048464330588207', // Trial Moderator
  ];

  if (!PUBLIC_KEY) throw new Error('DISCORD_PUBLIC_KEY missing');

  const modLogChannels = new Map(Object.entries(database.modLogs));
const warns = new Map(Object.entries(database.warns));

  const PVC_RULES = {
    PVC1: 'Joining private VC without permission',
    PVC2: 'Not leaving when asked',
    PVC3: 'Disturbing private conversation',
    PVC4: 'Abusive or offensive language',
    PVC5: 'Recording without consent',
  };

  /* =========================
    DISCORD ENTRYPOINT
  ========================= */
  app.post(
    '/interactions',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const sig = req.headers['x-signature-ed25519'];
      const ts = req.headers['x-signature-timestamp'];

      if (!sig || !ts) return res.sendStatus(401);
      if (!(await verifyKey(req.body, sig, ts, PUBLIC_KEY)))
        return res.sendStatus(401);

      const interaction = JSON.parse(req.body.toString());

      if (interaction.type === InteractionType.PING) {
        return res.json({ type: InteractionResponseType.PONG });
      }

      if (interaction.type !== InteractionType.APPLICATION_COMMAND) {
        return res.sendStatus(204);
      }

      const { name, options = [] } = interaction.data;
      const MOD_COMMANDS = [
    'warn',
    'pvc_warn',
    'kick',
    'timeout',
    'ban',
    'pvc_ban',
    'warnings',
    'clearwarnings',
    'modlogs',
    'pvc_restore',
    'case',
  ];

  if (MOD_COMMANDS.includes(name)) {
    const access = await hasModerationAccess(interaction);

    if (access === 'MISSING_ROLES') {
      return res.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content:
            '❌ This server is not configured with moderator roles for this bot.',
          flags: 64,
        },
      });
    }

    if (!access) {
    const randomMessage =
      NO_PERMISSION_MESSAGES[
        Math.floor(Math.random() * NO_PERMISSION_MESSAGES.length)
      ];

    // 1️⃣ Public reply (guaranteed)
    res.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: randomMessage,
      },
    });

    // 2️⃣ Attempt DM (may fail silently — THAT IS OK)
    await safeDM(interaction.member.user.id, randomMessage);

    return;
  }


  }
  function getRandomNoPermMessage() {
    return NO_PERMISSION_MESSAGES[
      Math.floor(Math.random() * NO_PERMISSION_MESSAGES.length)
    ];
  }
      // TEST = instant
      if (name === 'test') {
        return res.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '✅ Bot is alive and stable.' },
        });
      }

      
      res.json({
  type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
});

route(interaction, name, options).catch(err => {

  console.error('Route error:', err);

  // create log embed
  const failEmbed = embed(
    'Command Failed',
    '❌',
    0xe74c3c,
    [
      { name: 'Command', value: name, inline: true },
      { name: 'Moderator', value: `<@${interaction.member.user.id}>`, inline: true },
      { name: 'Channel', value: `<#${interaction.channel_id}>` },
      { name: 'Error', value: err.message || 'Unknown error' }
    ]
  );

  // send to mod logs
  setImmediate(() => {
    //sendModLog(interaction, failEmbed);
  });

  // respond to user
  DiscordRequest(
    `/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
    {
      method: 'PATCH',
      body: { content: '❌ Command execution failed.' },
    }
  ).catch(() => {});
});

    } );


  /* =========================
    ROUTER
  ========================= */
  async function route(interaction, name, options) {
    switch (name) {
      case 'play': {
  const query = options.find(o => o.name === 'query').value;

  let result;

try {
  result = await playSong(interaction, query);
} catch (err) {
  console.error(err);
  result = '❌ Failed to play song';
}

  return finalize(
    interaction,
    embed('Music Player', '🎶', 0x3498db, [
      { name: 'Status', value: result }
    ])
  );
}

case 'stop': {
  stopSong(interaction.guild_id);

  return finalize(
    interaction,
    embed('Music Stopped', '🛑', 0xe74c3c, [
      { name: 'Status', value: 'Stopped playback and left VC' }
    ])
  );
}
      case 'unban': return unban(interaction, options);
      case 'cases': return showUserCases(interaction, options);
      case 'purge': return purge(interaction, options);
      case 'case': return showCase(interaction, options);
      case 'warn': return warn(interaction, options, false);
      case 'pvc_warn': return warn(interaction, options, true);
      case 'warnings': return listWarnings(interaction, options);
      case 'clearwarnings': return clearWarnings(interaction, options);
      case 'kick': return kick(interaction, options);
      case 'timeout': return timeout(interaction, options);
      case 'ban': return ban(interaction, options, false);
      case 'lock': return lock(interaction);
case 'unlock': return unlock(interaction);
case 'slowmode': return slowmode(interaction, options);
case 'userinfo': return userinfo(interaction, options);
      case 'pvc_ban': {
    return ban(interaction, options, true); // treat as normal ban
  }
      case 'pvc_restore': {
    const userId = options.find(o => o.name === 'user').value;

    const restored = await restorePrivateAccess(interaction, userId);

    return finalize(
      interaction,
      embed(
        'Private VC Access Restored',
        '🔓',
        0x2ecc71,
        [
          { name: 'User', value: `<@${userId}>`, inline: true },
          { name: 'Moderator', value: `<@${interaction.member.user.id}>`, inline: true },
          { name: 'Roles Restored', value: `${restored}` },
        ]
      )
    );
  }
      case 'modlogs': {
    const channelId = options.find(o => o.name === 'channel').value;

    modLogChannels.set(interaction.guild_id, channelId);
    database.modLogs[interaction.guild_id] = channelId;
setImmediate(() => saveData(database));

    return finalize(
      interaction,
      embed(
        'Mod Logs Channel Set',
        '📜',
        0x3498db,
        [
          { name: 'Channel', value: `<#${channelId}>` }
        ]
      )
    );
  }
      default: return finalize(
  interaction,
  embed('Unknown Command', '❓', 0x95a5a6, [
    { name: 'Info', value: 'Command not recognized.' }
  ])
);
    }
  }

  /* =========================
    EMBEDS
  ========================= */

  async function safeDM(userId, message) {
    try {
      const dm = await DiscordRequest('/users/@me/channels', {
        method: 'POST',
        body: { recipient_id: userId },
      });

      await DiscordRequest(`/channels/${dm.id}/messages`, {
        method: 'POST',
        body: { content: message },
      });

      return true;
    } catch (err) {
      // Discord blocked DM (privacy / blocked bot)
      return false;
    }
  }
  function embed(title, emoji, color, fields) {
    return {
      title: `${emoji} ${title}`,
      color,
      fields,
      footer: { text: 'VePlexity Moderation' },
      timestamp: new Date().toISOString(),
    };
  }
  async function restorePrivateAccess(interaction, targetUserId) {
    // Add ALL private VC roles back
    for (const roleId of PRIVATE_VC_ROLE_IDS) {
      await DiscordRequest(
        `/guilds/${interaction.guild_id}/members/${targetUserId}/roles/${roleId}`,
        { method: 'PUT' }
      );
    }

    return PRIVATE_VC_ROLE_IDS.length;
  }
  async function postEmbed(channelId, embed) {
    await DiscordRequest(`/channels/${channelId}/messages`, {
      method: 'POST',
      body: { embeds: [embed] },
    });
  }

  async function finalize(interaction, embed) {
    // Edit original interaction message (public)
    await DiscordRequest(
      `/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
      {
        method: 'PATCH',
        body: { embeds: [embed] },
      }
    );
  }



  /* =========================
    COMMANDS
  ========================= */
  async function hasModerationAccess(interaction) {
    const member = interaction.member;

    /* 1️⃣ SERVER OWNER */
    if (interaction.member.user.id === interaction.guild_owner_id) {
      return true;
    }

    /* 2️⃣ ADMINISTRATOR PERMISSION */
    const perms = BigInt(member.permissions);
    const ADMIN = 1n << 3n;
    if ((perms & ADMIN) === ADMIN) {
      return true;
    }

    /* 3️⃣ ROLE ID CHECK (MOD / SENIOR / TRIAL) */
    return member.roles.some(roleId =>
      ALLOWED_MOD_ROLE_IDS.includes(roleId)
    );
  }
  async function warn(interaction, options, pvc) {
    console.log('🔥 Sending mod log for warn');

const userId = options.find(o => o.name === 'user').value;

let reason;

if (pvc) {
  const ruleOption = options.find(o => o.name === 'rule');
  reason = PVC_RULES[ruleOption?.value] || 'Unknown PVC violation';
} else {
  reason = options.find(o => o.name === 'reason')?.value || 'No reason provided';
}
let caseId = 'N/A';

try {
  caseId = createCase(interaction, 'warn', userId, reason);
} catch (err) {
  console.error('Case creation failed:', err);
}
      

    const data = warns.get(userId) || { n: 0, p: 0 };
    

    if (pvc) {
      data.p++;
    } else {
      data.n++;
    }

    warns.set(userId, data);

    database.warns[userId] = data;
setImmediate(() => saveData(database));


    const e = embed(
      pvc ? 'PVC Warning Issued' : 'Warning Issued',
      '⚠️',
      pvc ? 0xe67e22 : 0xf1c40f,
      [
        { name: 'User', value: `<@${userId}>`, inline: true },
        { name: 'Moderator', value: `<@${interaction.member.user.id}>`, inline: true },
        { name: 'Reason', value: reason },
        { name: 'Case', value: `#${caseId}`, inline: true },
        !pvc
          ? { name: 'Total Warnings', value: `${data.n}`, inline: true }
          : null,
      ].filter(Boolean)
    );

    await finalize(interaction, e);

//  Run heavy stuff AFTER responding
await sendModLog(
  interaction,
  embed(
    'Moderation Log',
    '📝',
    0xf1c40f,
    [
      { name: 'Action', value: pvc ? 'PVC Warn' : 'Warn', inline: true },
      { name: 'User', value: `<@${userId}>`, inline: true },
      { name: 'Moderator', value: `<@${interaction.member.user.id}>`, inline: true },
      { name: 'Channel Used', value: `<#${interaction.channel_id}>` },
      { name: 'Reason', value: reason },
      { name: 'Case', value: `#${caseId}`, inline: true }
    ]
  )
);

if (!pvc) {
  await applyWarningEscalation(interaction, userId, data.n);
}
  }
  async function applyWarningEscalation(interaction, userId, warnCount) {
    const rule = WARNING_ESCALATION[warnCount];
    if (!rule) return;

    const reason = `Automatic action: ${warnCount} warnings`;

    if (rule.type === 'timeout') {
      const ms = parseDuration(rule.duration);
      const until = new Date(Date.now() + ms).toISOString();

      await DiscordRequest(
        `/guilds/${interaction.guild_id}/members/${userId}`,
        {
          method: 'PATCH',
          body: { communication_disabled_until: until, reason },
        }
      );

      await postPublicMessage(
        interaction,
        `⏳ <@${userId}> has been timed out for **${rule.duration}** (Reached ${warnCount} warnings).`
      );
    }

    if (rule.type === 'kick') {
      await DiscordRequest(
        `/guilds/${interaction.guild_id}/members/${userId}`,
        {
          method: 'DELETE',
          body: { reason },
        }
      );

      await postPublicMessage(
        interaction,
        `👢 <@${userId}> has been kicked (Reached ${warnCount} warnings).`
      );
    }

    if (rule.type === 'ban') {
      await DiscordRequest(
        `/guilds/${interaction.guild_id}/bans/${userId}`,
        {
          method: 'PUT',
          body: { reason },
        }
      );

      await postPublicMessage(
        interaction,
        `🚫 <@${userId}> has been banned (Reached ${warnCount} warnings).`
      );
    }
  }

  async function listWarnings(interaction, options) {
    const userId = options.find(o => o.name === 'user').value;
    const d = warns.get(userId) || { n: 0, p: 0 };

    await finalize(
      interaction,
      embed('User Warnings', '📊', 0x9b59b6, [
        { name: 'General', value: `${d.n}`, inline: true },
        { name: 'PVC', value: `${d.p}`, inline: true },
      ])
    );
  }

  async function clearWarnings(interaction, options) {
    const userId = options.find(o => o.name === 'user').value;
    warns.delete(userId);
    delete database.warns[userId];
    setImmediate(() => saveData(database));

    await finalize(
  interaction,
  embed('Warnings Cleared', '🧹', 0x2ecc71, [
    { name: 'User', value: `<@${userId}>` },
  ])
);

// run logging outside interaction lifecycle
setImmediate(() => {
  sendModLog(
    interaction,
    embed(
      'Moderation Log',
      '🧹',
      0x2ecc71,
      [
        { name: 'Action', value: 'Clear Warnings', inline: true },
        { name: 'User', value: `<@${userId}>`, inline: true },
        { name: 'Moderator', value: `<@${interaction.member.user.id}>`, inline: true },
        { name: 'Channel Used', value: `<#${interaction.channel_id}>` },
      ]
    )
  );
});
  }

  async function kick(interaction, options) {
    const userId = options.find(o => o.name === 'user').value;
    const caseId = createCase(interaction, 'kick', userId, reason);
    
    const reason = options.find(o => o.name === 'reason')?.value || 'No reason';

    await DiscordRequest(
      `/guilds/${interaction.guild_id}/members/${userId}`,
      { method: 'DELETE', body: { reason } }
    );

    await finalize(
      interaction,
      embed('Member Kicked', '👢', 0x95a5a6, [
        { name: 'User', value: `<@${userId}>` },
        { name: 'Reason', value: reason },
      ])
    );
    await sendModLog(
  interaction,
  embed(
    'Moderation Log',
    '👢',
    0x95a5a6,
    [
      { name: 'Action', value: 'Kick', inline: true },
      { name: 'User', value: `<@${userId}>`, inline: true },
      { name: 'Moderator', value: `<@${interaction.member.user.id}>`, inline: true },
      { name: 'Channel Used', value: `<#${interaction.channel_id}>` },
      { name: 'Reason', value: reason },
      { name: 'Case', value: `#${caseId}`, inline: true }
    ]
  )
);
  }

  async function timeout(interaction, options) { 
    const userId = options.find(o => o.name === 'user').value;
    const caseId = createCase(interaction, 'timeout', userId, reason);
    
   
    const duration = options.find(o => o.name === 'duration').value;
    const reason = options.find(o => o.name === 'reason')?.value || 'No reason';

    const ms = parseDuration(duration);
    const until = new Date(Date.now() + ms).toISOString();

    await DiscordRequest(
      `/guilds/${interaction.guild_id}/members/${userId}`,
      {
        method: 'PATCH',
        body: { communication_disabled_until: until, reason },
      }
    );

    await finalize(
      interaction,
      embed('Member Timed Out', '⏳', 0x3498db, [
        { name: 'User', value: `<@${userId}>` },
        { name: 'Duration', value: duration },
        { name: 'Reason', value: reason },
      ])
    );
    await sendModLog(
  interaction,
  embed(
    'Moderation Log',
    '⏳',
    0x3498db,
    [
      { name: 'Action', value: 'Timeout', inline: true },
      { name: 'User', value: `<@${userId}>`, inline: true },
      { name: 'Moderator', value: `<@${interaction.member.user.id}>`, inline: true },
      { name: 'Channel Used', value: `<#${interaction.channel_id}>` },
      { name: 'Duration', value: duration },
      { name: 'Reason', value: reason },
      { name: 'Case', value: `#${caseId}`, inline: true }
    ]
  )
);
    
  }

  async function ban(interaction, options, pvc) {
    const userId = options.find(o => o.name === 'user').value;

const ruleOption = options.find(o => o.name === 'rule');
const customReason = options.find(o => o.name === 'reason');

const reason =
  pvc && ruleOption?.value === 'OTHER'
    ? customReason?.value || 'Other PVC violation'
    : pvc
    ? PVC_RULES[ruleOption?.value] || 'Unknown PVC violation'
    : options.find(o => o.name === 'reason')?.value || 'No reason provided';

const caseId = createCase(interaction, 'ban', userId, reason);

    /* =====================
      PVC BAN = ROLE REVOKE
    ====================== */
    if (pvc) {
      const removedCount = await revokePrivateAccess(interaction, userId);

      return finalize(
        interaction,
        embed(
          'Private VC Access Revoked',
          '🚫',
          0xe74c3c,
          [
            { name: 'User', value: `<@${userId}>`, inline: true },
            { name: 'Moderator', value: `<@${interaction.member.user.id}>`, inline: true },
            { name: 'Roles Removed', value: `${removedCount}`, inline: true },
            { name: 'Reason', value: reason },
            { name: 'Case', value: `#${caseId}`, inline: true },
          ]
        )
      );
    }

    /* =====================
      NORMAL BAN = SERVER BAN
    ====================== */
    await DiscordRequest(
      `/guilds/${interaction.guild_id}/bans/${userId}`,
      { method: 'PUT', body: { reason } }
    );

    await finalize(
  interaction,
  embed(
    'User Banned',
    '⛔',
    0xe74c3c,
    [
      { name: 'User', value: `<@${userId}>`, inline: true },
      { name: 'Moderator', value: `<@${interaction.member.user.id}>`, inline: true },
      { name: 'Reason', value: reason },
    ]
  )
);

setImmediate(() => {
  sendModLog(
    interaction,
    embed(
      'Moderation Log',
      '🚫',
      0xe74c3c,
      [
        { name: 'Action', value: 'Ban', inline: true },
        { name: 'User', value: `<@${userId}>`, inline: true },
        { name: 'Moderator', value: `<@${interaction.member.user.id}>`, inline: true },
        { name: 'Channel Used', value: `<#${interaction.channel_id}>` },
        { name: 'Reason', value: reason },
      ]
    )
  );
});

await sendModLog(
  interaction,
  embed(
    'Moderation Log',
    '🚫',
    0xe74c3c,
    [
      { name: 'Action', value: 'Ban', inline: true },
      { name: 'User', value: `<@${userId}>`, inline: true },
      { name: 'Moderator', value: `<@${interaction.member.user.id}>`, inline: true },
      { name: 'Channel Used', value: `<#${interaction.channel_id}>` },
      { name: 'Reason', value: reason },
      { name: 'Case', value: `#${caseId}`, inline: true },
      
    ]
  )
);

return;
    
  }
 
  


  async function postPublicMessage(interaction, content) {
    await DiscordRequest(
      `/channels/${interaction.channel_id}/messages`,
      {
        method: 'POST',
        body: { content },
      }
    );
  }
  /* ========================= */
  function parseDuration(str) {
    const m = str.match(/^(\d+)(s|m|h|d)$/);
    return m ? Number(m[1]) * { s:1e3, m:6e4, h:3.6e6, d:8.64e7 }[m[2]] : 0;
  }
  function buildNoPermissionEmbed(message) {
    return {
      title: '🚫 ACCESS DENIED',
      description: `
  > **${message}**

  **🔒 Staff-only command**

  Required roles:
  <@&1469048464330588210> <@&1469048464330588209>  
  <@&1469048464330588208> <@&1469048464330588207>
  `,
      color: 0xed4245,
      footer: {
        text: 'VePlexity Moderation System',
      },
      timestamp: new Date().toISOString(),
    };
  }
  async function revokePrivateAccess(interaction, targetUserId) {
    const response = await DiscordRequest(
      `/guilds/${interaction.guild_id}/members/${targetUserId}`,
      { method: 'GET' }
    );

    const member = response.body; // 🔥 THIS IS THE FIX

    if (!member || !Array.isArray(member.roles)) {
      console.error('❌ Could not fetch member roles', response);
      return 0;
    }

    const memberRoles = member.roles;

    const rolesToRemove = memberRoles.filter(roleId =>
      PRIVATE_VC_ROLE_IDS.includes(roleId)
    );

    console.log('🧩 Member roles:', memberRoles);
    console.log('🚫 Roles to remove:', rolesToRemove);

    for (const roleId of rolesToRemove) {
      await DiscordRequest(
        `/guilds/${interaction.guild_id}/members/${targetUserId}/roles/${roleId}`,
        { method: 'DELETE' }
      );
    }

    return rolesToRemove.length;
  }
  async function showCase(interaction, options) {
    

  const caseId = options.find(o => o.name === 'id').value;

  const data = database.cases[caseId];

  if (!data) {
    return finalize(
      interaction,
      embed('Case Not Found', '❌', 0xe74c3c, [
        { name: 'Case', value: `#${caseId}` }
      ])
    );
  }

  await finalize(
    interaction,
    embed(`Case #${caseId}`, '📁', 0x3498db, [
      { name: 'Action', value: data.action, inline: true },
      { name: 'User', value: `<@${data.user}>`, inline: true },
      { name: 'Moderator', value: `<@${data.moderator}>`, inline: true },
      { name: 'Channel', value: `<#${data.channel}>` },
      { name: 'Reason', value: data.reason },
      { name: 'Time', value: data.timestamp }
    ])
  );

}
async function showUserCases(interaction, options) {

  const userId = options.find(o => o.name === 'user').value;

  const userCases = Object.entries(database.cases)
    .filter(([_, data]) => data.user === userId);

  // ❌ No cases → funny response
  if (userCases.length === 0) {
    return finalize(
      interaction,
      embed(
        'No Cases Found',
        '🫠',
        0x95a5a6,
        [
          {
            name: 'User',
            value: `<@${userId}> is living a crime-free life 😇`,
          },
          {
            name: 'Status',
            value: 'Zero records. Either innocent… or just not caught yet 👀',
          }
        ]
      )
    );
  }

  // ✅ Format cases
  const formatted = userCases
    .slice(-10) // last 10 cases only
    .map(([id, data]) =>
      `**#${id}** • ${data.action.toUpperCase()} • <#${data.channel}>`
    )
    .join('\n');

  return finalize(
    interaction,
    embed(
      'User Case History',
      '📁',
      0x3498db,
      [
        { name: 'User', value: `<@${userId}>`, inline: true },
        { name: 'Total Cases', value: `${userCases.length}`, inline: true },
        {
          name: 'Recent Cases',
          value: formatted || 'None',
        }
      ]
    )
  );
}
async function purge(interaction, options) {

  const amount = options.find(o => o.name === 'amount').value;

  const res = await DiscordRequest(
  `/channels/${interaction.channel_id}/messages?limit=${Math.min(amount, 100)}`,
  { method: 'GET' }
);

const messages = res.body;

if (!Array.isArray(messages)) {
  throw new Error('Failed to fetch messages');
}

  let deleted = 0;

  for (const msg of messages) {
    try {
      await DiscordRequest(
        `/channels/${interaction.channel_id}/messages/${msg.id}`,
        { method: 'DELETE' }
      );
      deleted++;
    } catch {}
  }

  const caseId = createCase(
    interaction,
    'purge',
    interaction.member.user.id,
    `Deleted ${deleted} messages`
  );

  await finalize(
    interaction,
    embed('Messages Purged', '🧹', 0x95a5a6, [
      { name: 'Deleted', value: `${deleted}` },
      { name: 'Case', value: `#${caseId}` }
    ])
  );
}
async function lock(interaction) {

  await DiscordRequest(
    `/channels/${interaction.channel_id}/permissions/${interaction.guild_id}`,
    {
      method: 'PUT',
      body: {
        deny: '2048',
        type: 0
      }
    }
  );

  await finalize(
    interaction,
    embed('Channel Locked', '🔒', 0xe74c3c, [
      { name: 'Moderator', value: `<@${interaction.member.user.id}>` }
    ])
  );

}
async function unban(interaction, options) {  

  const userId = options.find(o => o.name === 'user').value.toString();

await DiscordRequest(
  `/guilds/${interaction.guild_id}/bans/${userId}`,
  { method: 'DELETE' }
);

  const caseId = createCase(interaction, 'unban', userId, 'Unbanned user');

  await finalize(
    interaction,
    embed('User Unbanned', '🔓', 0x2ecc71, [
      { name: 'User', value: `<@${userId}>` },
      { name: 'Moderator', value: `<@${interaction.member.user.id}>` },
      { name: 'Case', value: `#${caseId}` }
    ])
  );

  setImmediate(() => {
    sendModLog(
      interaction,
      embed(
        'Moderation Log',
        '🔓',
        0x2ecc71,
        [
          { name: 'Action', value: 'Unban', inline: true },
          { name: 'User', value: `<@${userId}>`, inline: true },
          { name: 'Moderator', value: `<@${interaction.member.user.id}>`, inline: true },
          { name: 'Channel Used', value: `<#${interaction.channel_id}>` },
          { name: 'Case', value: `#${caseId}`, inline: true }
        ]
      )
    );
  });
}

async function slowmode(interaction, options) {

  const seconds = options.find(o => o.name === 'seconds').value;

  await DiscordRequest(
    `/channels/${interaction.channel_id}`,
    {
      method: 'PATCH',
      body: { rate_limit_per_user: seconds }
    }
  );

  await finalize(
    interaction,
    embed('Slowmode Enabled', '🐢', 0xf1c40f, [
      { name: 'Duration', value: `${seconds}s` }
    ])
  );

}
async function userinfo(interaction, options) {

  const userId = options.find(o => o.name === 'user').value;

  const warnData = warns.get(userId) || { n: 0, p: 0 };

  await finalize(
    interaction,
    embed('User Info', '👤', 0x3498db, [
      { name: 'User', value: `<@${userId}>` },
      { name: 'Warnings', value: `${warnData.n}` },
      { name: 'PVC Warnings', value: `${warnData.p}` }
    ])
  );

}
async function unlock(interaction) {

  await DiscordRequest(
    `/channels/${interaction.channel_id}/permissions/${interaction.guild_id}`,
    {
      method: 'PUT',
      body: {
        allow: '2048',
        type: 0
      }
    }
  );

  const caseId = createCase(
    interaction,
    'unlock',
    interaction.member.user.id,
    'Channel unlocked'
  );

  await finalize(
    interaction,
    embed('Channel Unlocked', '🔓', 0x2ecc71, [
      { name: 'Moderator', value: `<@${interaction.member.user.id}>` },
      { name: 'Case', value: `#${caseId}` }
    ])
  );
}
  
 async function send  (interaction, embedData) {
  const channelId = modLogChannels.get(interaction.guild_id);

  if (!channelId) {
    console.log('⚠️ No modlog channel set for guild:', interaction.guild_id);
    return;
  }

  try {
    console.log('📜 Sending mod log to:', channelId);

    await DiscordRequest(
      `/channels/${channelId}/messages`,
      {
        method: 'POST',
        body: { embeds: [embedData] }
      }
    );
  } catch (err) {
    console.error('❌ Mod log failed:', err);
  }
}

  app.get('/', (_, res) => res.send('OK'));
  app.listen(PORT, () => console.log(`✅ Bot running on ${PORT}`));



  app.get('/api/cases', (req, res) => {
  res.json(database.cases);
});

app.get('/api/warnings', (req, res) => {
  res.json(database.warns);
});

app.get('/api/modlogs', (req, res) => {
  res.json(database.modLogs);
});
app.get('/api/cases', (req, res) => {
  if (req.query.key !== process.env.API_KEY) {
    return res.status(403).send('Forbidden');
  }
  res.json(database.cases);
});