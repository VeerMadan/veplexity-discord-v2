import 'dotenv/config';
import express from 'express';
import { verifyKey } from 'discord-interactions';
import {
  InteractionType,
  InteractionResponseType,
} from 'discord-interactions';
import { DiscordRequest, getRandomEmoji } from './utils.js';

const app = express();
const PORT = process.env.PORT || 8080;

const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;
if (!PUBLIC_KEY) throw new Error('DISCORD_PUBLIC_KEY is not set');

/* =========================
   INTERACTIONS ENDPOINT
========================= */
app.post(
  '/interactions',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];

    if (!verifyKey(req.body, signature, timestamp, PUBLIC_KEY)) {
      return res.status(401).send('Bad request signature');
    }

    const interaction = JSON.parse(req.body.toString('utf8'));

    /* ---- PING ---- */
    if (interaction.type === InteractionType.PING) {
      return res.json({ type: InteractionResponseType.PONG });
    }

    /* ---- COMMANDS ---- */
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const { name } = interaction.data;

      /* /test */
      if (name === 'test') {
        return res.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: `hello world ${getRandomEmoji()}` },
        });
      }

      /* ALL MOD COMMANDS → DEFER FIRST */
      if (['kick', 'timeout', 'mute', 'ban'].includes(name)) {
        res.json({
          type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
          data: { flags: 64 }, // ephemeral ACK
        });

        if (name === 'kick') handleKick(interaction);
        if (name === 'timeout' || name === 'mute') handleTimeout(interaction);
        if (name === 'ban') handleBan(interaction);
        if (name === 'pvc_warn') handlePVCWarn(interaction);
if (name === 'pvc_ban') handlePVCBan(interaction);

        return;
      }
    }

    return res.status(400).send('Unhandled interaction');
  }
);

/* =========================
   HELPERS
========================= */
function parseDuration(input) {
  const match = input?.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  return value * { s: 1e3, m: 6e4, h: 3.6e6, d: 8.64e7 }[unit];
}
const APPEAL_LINK = 'https://appeal.gg/HtRYpbfJur#';

async function safeDMEmbed(userId, embed) {
  try {
    const dm = await DiscordRequest('/users/@me/channels', {
      method: 'POST',
      body: { recipient_id: userId },
    });

    await DiscordRequest(`/channels/${dm.id}/messages`, {
      method: 'POST',
      body: { embeds: [embed] },
    });
  } catch {
    // User DMs closed – ignore safely
  }
}

async function postPublicModAction({
  interaction,
  action,
  emoji,
  targetUserId,
  reason,
  extra = '',
}) {
  await DiscordRequest(`/channels/${interaction.channel_id}/messages`, {
    method: 'POST',
    body: {
      content:
        `${emoji} **Moderation Action: ${action}**\n\n` +
        `👤 **User:** <@${targetUserId}>\n` +
        `🛡️ **Moderator:** <@${interaction.member.user.id}>\n` +
        (extra ? `${extra}\n` : '') +
        `📝 **Reason:** ${reason || 'No reason provided'}`,
    },
  });
}

/* =========================
   KICK
========================= */
async function handleKick(interaction) {
  const opts = interaction.data.options ?? [];
  const userId = opts.find(o => o.name === 'user')?.value;
  const reason = opts.find(o => o.name === 'reason')?.value || 'No reason provided';

  const responseUrl = `/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`;
  const perms = BigInt(interaction.member.permissions);

  if ((perms & (1n << 1n)) === 0n) {
    return DiscordRequest(responseUrl, { method: 'PATCH', body: { content: '❌ No kick permission.' } });
  }

  await DiscordRequest(`/guilds/${interaction.guild_id}/members/${userId}`, {
    method: 'DELETE',
    body: { reason },
  });

  await DiscordRequest(responseUrl, {
    method: 'PATCH',
    body: { content: '✅ User kicked successfully.' },
  });

  await postPublicModAction({
    interaction,
    action: 'KICK',
    emoji: '👢',
    targetUserId: userId,
    reason,
  });
}

/* =========================
   TIMEOUT / MUTE
========================= */
async function handleTimeout(interaction) {
  const opts = interaction.data.options ?? [];
  const userId = opts.find(o => o.name === 'user')?.value;
  const durationInput = opts.find(o => o.name === 'duration')?.value;
  const reason = opts.find(o => o.name === 'reason')?.value || 'No reason provided';

  const responseUrl = `/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`;
  const durationMs = parseDuration(durationInput);
  const perms = BigInt(interaction.member.permissions);

  if (!durationMs) {
    return DiscordRequest(responseUrl, { method: 'PATCH', body: { content: '❌ Invalid duration.' } });
  }
  if ((perms & (1n << 40n)) === 0n) {
    return DiscordRequest(responseUrl, { method: 'PATCH', body: { content: '❌ No timeout permission.' } });
  }

  await DiscordRequest(`/guilds/${interaction.guild_id}/members/${userId}`, {
    method: 'PATCH',
    body: { communication_disabled_until: new Date(Date.now() + durationMs).toISOString(), reason },
  });

  await DiscordRequest(responseUrl, {
    method: 'PATCH',
    body: { content: '✅ User timed out successfully.' },
  });

  await postPublicModAction({
    interaction,
    action: 'TIMEOUT',
    emoji: '⏳',
    targetUserId: userId,
    reason,
    extra: `🕒 **Duration:** ${durationInput}`,
  });
}

/* =========================
   BAN
========================= */
async function handleBan(interaction) {
  const opts = interaction.data.options ?? [];
  const userId = opts.find(o => o.name === 'user')?.value;
  const deleteDays = opts.find(o => o.name === 'delete_days')?.value ?? 0;
  const reason = opts.find(o => o.name === 'reason')?.value || 'No reason provided';

  const responseUrl = `/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`;
  const perms = BigInt(interaction.member.permissions);

  if ((perms & (1n << 2n)) === 0n) {
    return DiscordRequest(responseUrl, { method: 'PATCH', body: { content: '❌ No ban permission.' } });
  }

  await DiscordRequest(`/guilds/${interaction.guild_id}/bans/${userId}`, {
    method: 'PUT',
    body: { delete_message_days: deleteDays, reason },
  });

  await DiscordRequest(responseUrl, {
    method: 'PATCH',
    body: { content: '✅ User banned successfully.' },
  });

  await postPublicModAction({
    interaction,
    action: 'BAN',
    emoji: '🚫',
    targetUserId: userId,
    reason,
    extra: `🗑️ **Messages Deleted:** ${deleteDays} day(s)`,
  });
}
async function handlePVCWarn(interaction) {
  const opts = interaction.data.options ?? [];
  const userId = opts.find(o => o.name === 'user')?.value;
  const rule = opts.find(o => o.name === 'rule')?.value;
  const note = opts.find(o => o.name === 'note')?.value;

  const RULE_MAP = {
    PVC1: 'Joining private VC without permission',
    PVC2: 'Not leaving when asked',
    PVC3: 'Disturbing private conversation',
    PVC4: 'Abusive or offensive language',
    PVC5: 'Recording without consent',
  };

  // DM embed
  await safeDMEmbed(userId, {
    title: '⚠️ Private VC Warning',
    description:
      `You have received a warning in **VePlexity Point** for violating Private VC guidelines.\n\n` +
      `📌 **Violation:** ${RULE_MAP[rule]}\n` +
      (note ? `📝 **Note:** ${note}\n\n` : '\n') +
      `Please respect private spaces. Continued violations may lead to removal actions.`,
    color: 0xF1C40F,
  });

  // Public channel message
  await postPublicModAction({
    interaction,
    action: 'PVC WARNING',
    emoji: '⚠️',
    targetUserId: userId,
    reason: RULE_MAP[rule],
  });
}
async function handlePVCBan(interaction) {
  const opts = interaction.data.options ?? [];
  const userId = opts.find(o => o.name === 'user')?.value;
  const rule = opts.find(o => o.name === 'rule')?.value;
  const reason = opts.find(o => o.name === 'reason')?.value || 'Repeated Private VC violations';

  const RULE_MAP = {
    PVC1: 'Joining private VC without permission',
    PVC2: 'Not leaving when asked',
    PVC3: 'Disturbing private conversation',
    PVC4: 'Abusive or offensive language',
    PVC5: 'Recording without consent',
  };

  // 1️⃣ DM FIRST
  await safeDMEmbed(userId, {
    title: '🔒 You have been banned',
    description:
      `You have been banned from **VePlexity Point** due to repeated Private VC guideline violations.\n\n` +
      `📌 **Violation:** ${RULE_MAP[rule]}\n` +
      `📝 **Reason:** ${reason}\n\n` +
      `If you believe this was a mistake, you may appeal below.`,
    color: 0xE74C3C,
    footer: { text: 'VePlexity Moderation Team' },
  });

  // 2️⃣ BAN
  await DiscordRequest(
    `/guilds/${interaction.guild_id}/bans/${userId}`,
    { method: 'PUT', body: { reason } }
  );

  // 3️⃣ PUBLIC MESSAGE
  await postPublicModAction({
    interaction,
    action: 'PVC BAN',
    emoji: '🔒',
    targetUserId: userId,
    reason: RULE_MAP[rule],
  });
}


/* ========================= */
app.get('/', (_, res) => res.send('OK'));
app.listen(PORT, () => console.log(`✅ Server running on ${PORT}`));
