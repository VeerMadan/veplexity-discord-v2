import { buildEmbed, sendModLog } from '../../utils/embeds.js';
import { parseDuration } from '../../utils/helpers.js';
import db from '../../services/database.js';
import { PRIVATE_VC_ROLE_IDS, PVC_RULES, WARNING_ESCALATION } from '../../config/constants.js';

export const modlogs = {
  name: 'modlogs',
  description: 'Set mod logs channel',
  options: [{ name: 'channel', type: 7, required: true, description: 'Channel to send moderation audit logs' }],
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    db.setModLogChannel(interaction.guildId, channel.id);
    const embed = buildEmbed('Mod Logs Configured', '📜', 0x3498db, [
      { name: 'Channel', value: `<#${channel.id}>`, inline: true },
      { name: 'Set By', value: `<@${interaction.user.id}>`, inline: true }
    ]);
    await sendModLog(interaction.guild, embed);
    return interaction.editReply({ embeds: [embed] });
  }
};

export const warn = {
  name: 'warn',
  description: 'Warn a user',
  options: [
    { name: 'user', description: 'User to warn', type: 6, required: true },
    { name: 'reason', description: 'Reason for warning', type: 3, required: true },
  ],
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const caseId = db.createCase({
      action: 'warn',
      userId: user.id,
      moderatorId: interaction.user.id,
      reason,
      channelId: interaction.channelId,
      guildId: interaction.guildId
    });

    const warnData = db.addWarn(user.id, false);

    const embed = buildEmbed('Warning Issued', '⚠️', 0xf1c40f, [
      { name: 'User', value: `<@${user.id}>`, inline: true },
      { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Case', value: `#${caseId}`, inline: true },
      { name: 'Reason', value: reason, inline: false },
      { name: 'Total Warnings', value: `${warnData.n}`, inline: true }
    ]);

    await interaction.editReply({ embeds: [embed] });
    await sendModLog(interaction.guild, embed);

    // Check escalation
    const rule = WARNING_ESCALATION[warnData.n];
    if (rule) {
      const targetMember = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (targetMember) {
        if (rule.type === 'timeout') {
          await targetMember.timeout(parseDuration(rule.duration), `Auto-escalation: ${warnData.n} warns`).catch(() => null);
        } else if (rule.type === 'kick') {
          await targetMember.kick(`Auto-escalation: ${warnData.n} warns`).catch(() => null);
        } else if (rule.type === 'ban') {
          await targetMember.ban({ reason: `Auto-escalation: ${warnData.n} warns` }).catch(() => null);
        }
        await interaction.channel.send(`🚨 **Escalation:** <@${user.id}> has been ${rule.type}ed (Reached ${warnData.n} warnings).`).catch(() => null);
      }
    }
  }
};

export const pvc_warn = {
  name: 'pvc_warn',
  description: 'Warn user for PVC violation',
  options: [
    { name: 'user', type: 6, required: true, description: 'User' },
    {
      name: 'rule',
      type: 3,
      required: true,
      description: 'Rule violated',
      choices: [
        { name: 'Joining private VC without permission', value: 'PVC1' },
        { name: 'Not leaving when asked', value: 'PVC2' },
        { name: 'Disturbing private conversation', value: 'PVC3' },
        { name: 'Abusive or offensive language', value: 'PVC4' },
        { name: 'Recording without consent', value: 'PVC5' }
      ]
    }
  ],
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const ruleKey = interaction.options.getString('rule');
    const reason = PVC_RULES[ruleKey] || 'PVC Violation';

    const caseId = db.createCase({
      action: 'pvc_warn',
      userId: user.id,
      moderatorId: interaction.user.id,
      reason,
      channelId: interaction.channelId,
      guildId: interaction.guildId
    });

    const warnData = db.addWarn(user.id, true);

    const embed = buildEmbed('PVC Warning Issued', '⚠️', 0xe67e22, [
      { name: 'User', value: `<@${user.id}>`, inline: true },
      { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Case', value: `#${caseId}`, inline: true },
      { name: 'Rule', value: `${ruleKey}: ${reason}`, inline: false },
      { name: 'Total PVC Warnings', value: `${warnData.p}`, inline: true }
    ]);

    await interaction.editReply({ embeds: [embed] });
    await sendModLog(interaction.guild, embed);
  }
};

export const kick = {
  name: 'kick',
  description: 'Kick a user',
  options: [
    { name: 'user', type: 6, required: true, description: 'User' },
    { name: 'reason', type: 3, required: false, description: 'Reason' },
  ],
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.editReply('❌ User not found in this server.');

    const caseId = db.createCase({
      action: 'kick',
      userId: user.id,
      moderatorId: interaction.user.id,
      reason,
      channelId: interaction.channelId,
      guildId: interaction.guildId
    });

    await member.kick(reason);

    const embed = buildEmbed('Member Kicked', '👢', 0x95a5a6, [
      { name: 'User', value: `<@${user.id}> (${user.tag})`, inline: true },
      { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Case', value: `#${caseId}`, inline: true },
      { name: 'Reason', value: reason, inline: false }
    ]);

    await interaction.editReply({ embeds: [embed] });
    await sendModLog(interaction.guild, embed);
  }
};

export const ban = {
  name: 'ban',
  description: 'Ban a user',
  options: [
    { name: 'user', type: 6, required: true, description: 'User' },
    { name: 'reason', type: 3, required: false, description: 'Reason' },
  ],
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const caseId = db.createCase({
      action: 'ban',
      userId: user.id,
      moderatorId: interaction.user.id,
      reason,
      channelId: interaction.channelId,
      guildId: interaction.guildId
    });

    await interaction.guild.bans.create(user.id, { reason });

    const embed = buildEmbed('User Banned', '⛔', 0xe74c3c, [
      { name: 'User', value: `<@${user.id}> (${user.tag})`, inline: true },
      { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Case', value: `#${caseId}`, inline: true },
      { name: 'Reason', value: reason, inline: false }
    ]);

    await interaction.editReply({ embeds: [embed] });
    await sendModLog(interaction.guild, embed);
  }
};

export const unban = {
  name: 'unban',
  description: 'Unban a user',
  options: [{ name: 'user', type: 3, required: true, description: 'User ID' }],
  async execute(interaction) {
    const userId = interaction.options.getString('user').trim();
    const caseId = db.createCase({
      action: 'unban',
      userId,
      moderatorId: interaction.user.id,
      reason: 'Unbanned user',
      channelId: interaction.channelId,
      guildId: interaction.guildId
    });

    await interaction.guild.bans.remove(userId).catch(() => null);

    const embed = buildEmbed('User Unbanned', '🔓', 0x2ecc71, [
      { name: 'User ID', value: userId, inline: true },
      { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Case', value: `#${caseId}`, inline: true }
    ]);

    await interaction.editReply({ embeds: [embed] });
    await sendModLog(interaction.guild, embed);
  }
};

export const timeout = {
  name: 'timeout',
  description: 'Timeout a user',
  options: [
    { name: 'user', type: 6, required: true, description: 'User' },
    {
      name: 'duration',
      type: 3,
      required: true,
      description: 'How long to timeout for',
      choices: [
        { name: '60 seconds', value: '60s' },
        { name: '5 minutes', value: '5m' },
        { name: '10 minutes', value: '10m' },
        { name: '30 minutes', value: '30m' },
        { name: '1 hour', value: '1h' },
        { name: '6 hours', value: '6h' },
        { name: '1 day', value: '1d' },
        { name: '1 week', value: '7d' },
      ],
    },
    { name: 'reason', type: 3, required: false, description: 'Reason' },
  ],
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const duration = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.editReply('❌ User not found in this server.');

    const durationMs = parseDuration(duration);
    if (!durationMs) return interaction.editReply('❌ Invalid duration format.');

    const caseId = db.createCase({
      action: 'timeout',
      userId: user.id,
      moderatorId: interaction.user.id,
      reason,
      channelId: interaction.channelId,
      guildId: interaction.guildId
    });

    await member.timeout(durationMs, reason);

    const embed = buildEmbed('Member Timed Out', '⏳', 0x3498db, [
      { name: 'User', value: `<@${user.id}>`, inline: true },
      { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Case', value: `#${caseId}`, inline: true },
      { name: 'Duration', value: duration, inline: true },
      { name: 'Reason', value: reason, inline: false }
    ]);

    await interaction.editReply({ embeds: [embed] });
    await sendModLog(interaction.guild, embed);
  }
};

export const purge = {
  name: 'purge',
  description: 'Delete messages',
  options: [{ name: 'amount', type: 4, required: true, description: '1-100' }],
  async execute(interaction) {
    const amount = Math.min(100, Math.max(1, interaction.options.getInteger('amount')));
    const deleted = await interaction.channel.bulkDelete(amount, true).catch(() => null);
    const count = deleted ? deleted.size : amount;

    const caseId = db.createCase({
      action: 'purge',
      userId: interaction.user.id,
      moderatorId: interaction.user.id,
      reason: `Purged ${count} messages in #${interaction.channel.name}`,
      channelId: interaction.channelId,
      guildId: interaction.guildId
    });

    const embed = buildEmbed('Messages Purged', '🧹', 0x95a5a6, [
      { name: 'Amount', value: `${count}`, inline: true },
      { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Channel', value: `<#${interaction.channelId}>`, inline: true },
      { name: 'Case', value: `#${caseId}`, inline: true }
    ]);

    await interaction.editReply({ embeds: [embed] });
    await sendModLog(interaction.guild, embed);
  }
};

export const lock = {
  name: 'lock',
  description: 'Lock current channel',
  async execute(interaction) {
    await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
    const caseId = db.createCase({
      action: 'lock',
      userId: interaction.user.id,
      moderatorId: interaction.user.id,
      reason: `Locked channel #${interaction.channel.name}`,
      channelId: interaction.channelId,
      guildId: interaction.guildId
    });

    const embed = buildEmbed('Channel Locked', '🔒', 0xe74c3c, [
      { name: 'Channel', value: `<#${interaction.channelId}>`, inline: true },
      { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Case', value: `#${caseId}`, inline: true }
    ]);

    await interaction.editReply({ embeds: [embed] });
    await sendModLog(interaction.guild, embed);
  }
};

export const unlock = {
  name: 'unlock',
  description: 'Unlock current channel',
  async execute(interaction) {
    await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
    const caseId = db.createCase({
      action: 'unlock',
      userId: interaction.user.id,
      moderatorId: interaction.user.id,
      reason: `Unlocked channel #${interaction.channel.name}`,
      channelId: interaction.channelId,
      guildId: interaction.guildId
    });

    const embed = buildEmbed('Channel Unlocked', '🔓', 0x2ecc71, [
      { name: 'Channel', value: `<#${interaction.channelId}>`, inline: true },
      { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Case', value: `#${caseId}`, inline: true }
    ]);

    await interaction.editReply({ embeds: [embed] });
    await sendModLog(interaction.guild, embed);
  }
};

export const slowmode = {
  name: 'slowmode',
  description: 'Set slowmode for channel',
  options: [{ name: 'seconds', type: 4, required: true, description: 'Seconds (0 to disable)' }],
  async execute(interaction) {
    const seconds = interaction.options.getInteger('seconds');
    await interaction.channel.setRateLimitPerUser(seconds);

    const caseId = db.createCase({
      action: 'slowmode',
      userId: interaction.user.id,
      moderatorId: interaction.user.id,
      reason: `Set slowmode to ${seconds}s in #${interaction.channel.name}`,
      channelId: interaction.channelId,
      guildId: interaction.guildId
    });

    const embed = buildEmbed('Slowmode Updated', '🐢', 0xf1c40f, [
      { name: 'Channel', value: `<#${interaction.channelId}>`, inline: true },
      { name: 'Rate Limit', value: `${seconds}s`, inline: true },
      { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Case', value: `#${caseId}`, inline: true }
    ]);

    await interaction.editReply({ embeds: [embed] });
    await sendModLog(interaction.guild, embed);
  }
};

export const pvc_ban = {
  name: 'pvc_ban',
  description: 'Revoke private VC access',
  options: [
    { name: 'user', type: 6, required: true, description: 'User' },
    {
      name: 'rule',
      type: 3,
      required: true,
      description: 'Rule violated',
      choices: [
        { name: 'Joining private VC without permission', value: 'PVC1' },
        { name: 'Not leaving when asked', value: 'PVC2' },
        { name: 'Disturbing private conversation', value: 'PVC3' },
        { name: 'Abusive or offensive language', value: 'PVC4' },
        { name: 'Recording without consent', value: 'PVC5' }
      ]
    }
  ],
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const ruleKey = interaction.options.getString('rule');
    const reason = PVC_RULES[ruleKey] || 'PVC Violation';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (member) {
      await member.roles.remove(PRIVATE_VC_ROLE_IDS).catch(() => null);
    }
    db.addPvcRevoked(user.id);

    const caseId = db.createCase({
      action: 'pvc_ban',
      userId: user.id,
      moderatorId: interaction.user.id,
      reason,
      channelId: interaction.channelId,
      guildId: interaction.guildId
    });

    const embed = buildEmbed('Private VC Revoked', '🚫', 0xe74c3c, [
      { name: 'User', value: `<@${user.id}>`, inline: true },
      { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Rule', value: `${ruleKey}: ${reason}`, inline: false },
      { name: 'Case', value: `#${caseId}`, inline: true }
    ]);

    await interaction.editReply({ embeds: [embed] });
    await sendModLog(interaction.guild, embed);
  }
};

export const pvc_restore = {
  name: 'pvc_restore',
  description: 'Restore private VC access',
  options: [{ name: 'user', type: 6, required: true, description: 'User' }],
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (member) {
      await member.roles.add(PRIVATE_VC_ROLE_IDS).catch(() => null);
    }
    db.removePvcRevoked(user.id);

    const caseId = db.createCase({
      action: 'pvc_restore',
      userId: user.id,
      moderatorId: interaction.user.id,
      reason: 'Restored private VC access',
      channelId: interaction.channelId,
      guildId: interaction.guildId
    });

    const embed = buildEmbed('Private VC Restored', '🔓', 0x2ecc71, [
      { name: 'User', value: `<@${user.id}>`, inline: true },
      { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Case', value: `#${caseId}`, inline: true }
    ]);

    await interaction.editReply({ embeds: [embed] });
    await sendModLog(interaction.guild, embed);
  }
};

export const warnings = {
  name: 'warnings',
  description: 'Check user warnings',
  options: [{ name: 'user', type: 6, required: true, description: 'User' }],
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const warnData = db.getWarns(user.id);

    const embed = buildEmbed('User Warnings', '📊', 0x9b59b6, [
      { name: 'User', value: `<@${user.id}>`, inline: true },
      { name: 'General Warnings', value: `${warnData.n}`, inline: true },
      { name: 'PVC Warnings', value: `${warnData.p}`, inline: true }
    ]);

    return interaction.editReply({ embeds: [embed] });
  }
};

export const clearwarnings = {
  name: 'clearwarnings',
  description: 'Clear user warnings',
  options: [{ name: 'user', type: 6, required: true, description: 'User' }],
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    db.clearWarns(user.id);

    const caseId = db.createCase({
      action: 'clearwarnings',
      userId: user.id,
      moderatorId: interaction.user.id,
      reason: 'Cleared all warnings',
      channelId: interaction.channelId,
      guildId: interaction.guildId
    });

    const embed = buildEmbed('Warnings Cleared', '🧹', 0x2ecc71, [
      { name: 'User', value: `<@${user.id}>`, inline: true },
      { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Case', value: `#${caseId}`, inline: true }
    ]);

    await interaction.editReply({ embeds: [embed] });
    await sendModLog(interaction.guild, embed);
  }
};

export const cases = {
  name: 'cases',
  description: 'View all cases of a user',
  options: [{ name: 'user', type: 6, required: true, description: 'User' }],
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const userCases = db.getUserCases(user.id);

    if (userCases.length === 0) {
      return interaction.editReply({
        embeds: [buildEmbed('No Cases Found', '🫠', 0x95a5a6, [{ name: 'Status', value: `No records on <@${user.id}>.` }])]
      });
    }

    const formatted = userCases.slice(-10).map(c => `**#${c.id}** • \`${c.action.toUpperCase()}\` — ${c.reason} (<t:${Math.floor(new Date(c.timestamp).getTime() / 1000)}:R>)`).join('\n');

    const embed = buildEmbed('User Case History', '📁', 0x3498db, [
      { name: 'User', value: `<@${user.id}>`, inline: true },
      { name: 'Total Cases', value: `${userCases.length}`, inline: true },
      { name: 'Recent Records', value: formatted.slice(0, 1000), inline: false }
    ]);

    return interaction.editReply({ embeds: [embed] });
  }
};

export const caseCmd = {
  name: 'case',
  description: 'View specific case details',
  options: [{ name: 'id', type: 4, required: true, description: 'Case ID' }],
  async execute(interaction) {
    const id = interaction.options.getInteger('id');
    const c = db.getCase(id);
    if (!c) return interaction.editReply('❌ Case not found.');

    const embed = buildEmbed(`Case #${id}`, '📁', 0x3498db, [
      { name: 'Action', value: c.action.toUpperCase(), inline: true },
      { name: 'Target User', value: `<@${c.user}>`, inline: true },
      { name: 'Moderator', value: `<@${c.moderator}>`, inline: true },
      { name: 'Channel', value: c.channel ? `<#${c.channel}>` : 'N/A', inline: true },
      { name: 'Timestamp', value: `<t:${Math.floor(new Date(c.timestamp).getTime() / 1000)}:F>`, inline: true },
      { name: 'Reason', value: c.reason, inline: false }
    ]);

    return interaction.editReply({ embeds: [embed] });
  }
};

export const note = {
  name: 'note',
  description: 'Add a private staff note about a user',
  options: [
    { name: 'user', description: 'User', type: 6, required: true },
    { name: 'text', description: 'Note text', type: 3, required: true }
  ],
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const text = interaction.options.getString('text');
    db.addNote(user.id, interaction.user.id, text);

    const embed = buildEmbed('Staff Note Added', '📝', 0x9b59b6, [
      { name: 'User', value: `<@${user.id}>`, inline: true },
      { name: 'Added By', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Note', value: text, inline: false }
    ]);

    await interaction.editReply({ embeds: [embed] });
    await sendModLog(interaction.guild, embed);
  }
};

export const notes = {
  name: 'notes',
  description: "View a user's staff notes",
  options: [{ name: 'user', description: 'User', type: 6, required: true }],
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const list = db.getNotes(user.id);
    if (!list.length) return interaction.editReply(`No staff notes recorded on <@${user.id}>.`);

    const formatted = list.map((n, i) => `**${i + 1}.** ${n.text} — *(by <@${n.by}> <t:${Math.floor(n.at / 1000)}:R>)*`).join('\n');

    const embed = buildEmbed(`Staff Notes: ${user.username}`, '📝', 0x9b59b6, [
      { name: 'Entries', value: formatted.slice(0, 1000) }
    ]);

    return interaction.editReply({ embeds: [embed] });
  }
};

export const nickname = {
  name: 'nickname',
  description: "Change a user's nickname",
  options: [
    { name: 'user', description: 'User', type: 6, required: true },
    { name: 'name', description: 'New nickname (leave blank to reset)', type: 3, required: false }
  ],
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const newNick = interaction.options.getString('name') || null;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.editReply('❌ Member not found in server.');

    await member.setNickname(newNick).catch(() => null);

    const caseId = db.createCase({
      action: 'nickname',
      userId: user.id,
      moderatorId: interaction.user.id,
      reason: newNick ? `Changed nickname to: ${newNick}` : 'Reset nickname',
      channelId: interaction.channelId,
      guildId: interaction.guildId
    });

    const embed = buildEmbed('Nickname Updated', '✏️', 0x3498db, [
      { name: 'User', value: `<@${user.id}>`, inline: true },
      { name: 'New Name', value: newNick || '(Default)', inline: true },
      { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Case', value: `#${caseId}`, inline: true }
    ]);

    await interaction.editReply({ embeds: [embed] });
    await sendModLog(interaction.guild, embed);
  }
};

export const lockdown = {
  name: 'lockdown',
  description: 'Lock all text channels in server',
  async execute(interaction) {
    const channels = interaction.guild.channels.cache.filter(c => c.isTextBased() && !c.isThread());
    let count = 0;
    for (const [, ch] of channels) {
      await ch.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false }).catch(() => null);
      count++;
    }

    const caseId = db.createCase({
      action: 'lockdown',
      userId: interaction.user.id,
      moderatorId: interaction.user.id,
      reason: `Locked down ${count} channels`,
      channelId: interaction.channelId,
      guildId: interaction.guildId
    });

    const embed = buildEmbed('Server Lockdown', '🔒', 0xe74c3c, [
      { name: 'Channels Affected', value: `${count}`, inline: true },
      { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Case', value: `#${caseId}`, inline: true }
    ]);

    await interaction.editReply({ embeds: [embed] });
    await sendModLog(interaction.guild, embed);
  }
};

export const unlockdown = {
  name: 'unlockdown',
  description: 'Unlock all text channels in server',
  async execute(interaction) {
    const channels = interaction.guild.channels.cache.filter(c => c.isTextBased() && !c.isThread());
    let count = 0;
    for (const [, ch] of channels) {
      await ch.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null }).catch(() => null);
      count++;
    }

    const caseId = db.createCase({
      action: 'unlockdown',
      userId: interaction.user.id,
      moderatorId: interaction.user.id,
      reason: `Unlocked ${count} channels`,
      channelId: interaction.channelId,
      guildId: interaction.guildId
    });

    const embed = buildEmbed('Server Unlockdown', '🔓', 0x2ecc71, [
      { name: 'Channels Affected', value: `${count}`, inline: true },
      { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Case', value: `#${caseId}`, inline: true }
    ]);

    await interaction.editReply({ embeds: [embed] });
    await sendModLog(interaction.guild, embed);
  }
};

export const masskick = {
  name: 'masskick',
  description: 'Kick multiple users at once',
  options: [
    { name: 'users', description: 'Comma-separated user IDs', type: 3, required: true },
    { name: 'reason', description: 'Reason', type: 3, required: false }
  ],
  async execute(interaction) {
    const ids = interaction.options.getString('users').split(',').map(s => s.trim()).filter(Boolean);
    const reason = interaction.options.getString('reason') || 'Mass kick';
    let success = 0, fail = 0;

    for (const id of ids) {
      const member = await interaction.guild.members.fetch(id).catch(() => null);
      if (member) {
        await member.kick(reason).then(() => success++).catch(() => fail++);
      } else {
        fail++;
      }
    }

    const caseId = db.createCase({
      action: 'masskick',
      userId: ids.join(', '),
      moderatorId: interaction.user.id,
      reason: `${reason} (${success} kicked, ${fail} failed)`,
      channelId: interaction.channelId,
      guildId: interaction.guildId
    });

    const embed = buildEmbed('Mass Kick Executed', '👢', 0x95a5a6, [
      { name: 'Successful', value: `${success}`, inline: true },
      { name: 'Failed', value: `${fail}`, inline: true },
      { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Reason', value: reason, inline: false },
      { name: 'Case', value: `#${caseId}`, inline: true }
    ]);

    await interaction.editReply({ embeds: [embed] });
    await sendModLog(interaction.guild, embed);
  }
};

export const massban = {
  name: 'massban',
  description: 'Ban multiple users at once',
  options: [
    { name: 'users', description: 'Comma-separated user IDs', type: 3, required: true },
    { name: 'reason', description: 'Reason', type: 3, required: false }
  ],
  async execute(interaction) {
    const ids = interaction.options.getString('users').split(',').map(s => s.trim()).filter(Boolean);
    const reason = interaction.options.getString('reason') || 'Mass ban';
    let success = 0, fail = 0;

    for (const id of ids) {
      const ok = await interaction.guild.members.ban(id, { reason }).then(() => true).catch(() => false);
      if (ok) success++;
      else fail++;
    }

    const caseId = db.createCase({
      action: 'massban',
      userId: ids.join(', '),
      moderatorId: interaction.user.id,
      reason: `${reason} (${success} banned, ${fail} failed)`,
      channelId: interaction.channelId,
      guildId: interaction.guildId
    });

    const embed = buildEmbed('Mass Ban Executed', '🔨', 0xe74c3c, [
      { name: 'Successful', value: `${success}`, inline: true },
      { name: 'Failed', value: `${fail}`, inline: true },
      { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Reason', value: reason, inline: false },
      { name: 'Case', value: `#${caseId}`, inline: true }
    ]);

    await interaction.editReply({ embeds: [embed] });
    await sendModLog(interaction.guild, embed);
  }
};

export const muteall = {
  name: 'muteall',
  description: 'Server-mute everyone in your current VC',
  async execute(interaction) {
    const vc = interaction.member.voice.channel;
    if (!vc) return interaction.editReply('❌ You must join a voice channel first.');

    let count = 0;
    for (const [, member] of vc.members) {
      if (!member.user.bot) {
        await member.voice.setMute(true).catch(() => null);
        count++;
      }
    }

    const caseId = db.createCase({
      action: 'muteall',
      userId: vc.id,
      moderatorId: interaction.user.id,
      reason: `Muted all ${count} members in ${vc.name}`,
      channelId: interaction.channelId,
      guildId: interaction.guildId
    });

    const embed = buildEmbed('VC Muted', '🔇', 0x95a5a6, [
      { name: 'Channel', value: vc.name, inline: true },
      { name: 'Members Muted', value: `${count}`, inline: true },
      { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Case', value: `#${caseId}`, inline: true }
    ]);

    await interaction.editReply({ embeds: [embed] });
    await sendModLog(interaction.guild, embed);
  }
};

export const unmuteall = {
  name: 'unmuteall',
  description: 'Unmute everyone in your current VC',
  async execute(interaction) {
    const vc = interaction.member.voice.channel;
    if (!vc) return interaction.editReply('❌ You must join a voice channel first.');

    let count = 0;
    for (const [, member] of vc.members) {
      if (!member.user.bot) {
        await member.voice.setMute(false).catch(() => null);
        count++;
      }
    }

    const caseId = db.createCase({
      action: 'unmuteall',
      userId: vc.id,
      moderatorId: interaction.user.id,
      reason: `Unmuted all ${count} members in ${vc.name}`,
      channelId: interaction.channelId,
      guildId: interaction.guildId
    });

    const embed = buildEmbed('VC Unmuted', '🔊', 0x2ecc71, [
      { name: 'Channel', value: vc.name, inline: true },
      { name: 'Members Unmuted', value: `${count}`, inline: true },
      { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Case', value: `#${caseId}`, inline: true }
    ]);

    await interaction.editReply({ embeds: [embed] });
    await sendModLog(interaction.guild, embed);
  }
};

export const role = {
  name: 'role',
  description: 'Add or remove a role from a server member',
  options: [
    { name: 'user', description: 'Target member', type: 6, required: true },
    { name: 'role', description: 'Target role', type: 8, required: true },
    {
      name: 'action',
      description: 'Action to perform',
      type: 3,
      required: true,
      choices: [
        { name: 'Add Role ➕', value: 'add' },
        { name: 'Remove Role ➖', value: 'remove' }
      ]
    }
  ],
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const targetRole = interaction.options.getRole('role');
    const action = interaction.options.getString('action');

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.editReply('❌ Member not found in this server.');

    const botMember = interaction.guild.members.me;
    if (targetRole.position >= botMember.roles.highest.position) {
      return interaction.editReply('❌ I cannot manage this role because it is higher than or equal to my highest role.');
    }

    const isAdd = action === 'add';
    if (isAdd) {
      if (member.roles.cache.has(targetRole.id)) {
        return interaction.editReply(`❌ <@${user.id}> already has the <@&${targetRole.id}> role.`);
      }
      await member.roles.add(targetRole.id, `Role added by ${interaction.user.tag}`);
    } else {
      if (!member.roles.cache.has(targetRole.id)) {
        return interaction.editReply(`❌ <@${user.id}> does not have the <@&${targetRole.id}> role.`);
      }
      await member.roles.remove(targetRole.id, `Role removed by ${interaction.user.tag}`);
    }

    const caseId = db.createCase({
      action: isAdd ? 'role_add' : 'role_remove',
      userId: user.id,
      moderatorId: interaction.user.id,
      reason: `${isAdd ? 'Added' : 'Removed'} role @${targetRole.name}`,
      channelId: interaction.channelId,
      guildId: interaction.guildId
    });

    const embed = buildEmbed(
      isAdd ? 'Role Added' : 'Role Removed',
      isAdd ? '➕' : '➖',
      isAdd ? 0x2ecc71 : 0xe74c3c,
      [
        { name: 'Member', value: `<@${user.id}>`, inline: true },
        { name: 'Role', value: `<@&${targetRole.id}>`, inline: true },
        { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Case', value: `#${caseId}`, inline: true }
      ]
    );

    await interaction.editReply({ embeds: [embed] });
    await sendModLog(interaction.guild, embed);
  }
};

export const moveall = {
  name: 'moveall',
  description: 'Move all connected members from one voice channel to another',
  options: [
    { name: 'from', description: 'Source voice channel', type: 7, channel_types: [2], required: true },
    { name: 'to', description: 'Destination voice channel', type: 7, channel_types: [2], required: true }
  ],
  async execute(interaction) {
    const fromChannel = interaction.options.getChannel('from');
    const toChannel = interaction.options.getChannel('to');

    if (fromChannel.id === toChannel.id) {
      return interaction.editReply('❌ Source and destination voice channels cannot be the same.');
    }

    const members = fromChannel.members;
    if (!members || members.size === 0) {
      return interaction.editReply(`❌ No members found in <#${fromChannel.id}> to move.`);
    }

    let movedCount = 0;
    for (const [, member] of members) {
      try {
        await member.voice.setChannel(toChannel.id);
        movedCount++;
      } catch (e) {}
    }

    const caseId = db.createCase({
      action: 'moveall',
      userId: fromChannel.id,
      moderatorId: interaction.user.id,
      reason: `Moved ${movedCount} members from ${fromChannel.name} to ${toChannel.name}`,
      channelId: interaction.channelId,
      guildId: interaction.guildId
    });

    const embed = buildEmbed('Mass Voice Move', '🚚', 0x3498db, [
      { name: 'From Channel', value: `<#${fromChannel.id}>`, inline: true },
      { name: 'To Channel', value: `<#${toChannel.id}>`, inline: true },
      { name: 'Members Moved', value: `${movedCount}`, inline: true },
      { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Case', value: `#${caseId}`, inline: true }
    ]);

    await interaction.editReply({ embeds: [embed] });
    await sendModLog(interaction.guild, embed);
  }
};

export const nuke = {
  name: 'nuke',
  description: 'Completely wipe and clone the current channel for a fresh start',
  options: [
    { name: 'reason', description: 'Reason for nuking the channel', type: 3, required: false }
  ],
  async execute(interaction) {
    const channel = interaction.channel;
    const reason = interaction.options.getString('reason') || 'Channel purge / fresh start';

    const cloned = await channel.clone({
      reason: `Nuked by ${interaction.user.tag}: ${reason}`
    });

    await channel.delete(`Nuked by ${interaction.user.tag}`);

    const caseId = db.createCase({
      action: 'nuke',
      userId: cloned.id,
      moderatorId: interaction.user.id,
      reason,
      channelId: cloned.id,
      guildId: interaction.guildId
    });

    const embed = buildEmbed('Channel Nuked', '💥', 0xe74c3c, [
      { name: 'Channel', value: `<#${cloned.id}>`, inline: true },
      { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Reason', value: reason, inline: false },
      { name: 'Case', value: `#${caseId}`, inline: true }
    ]);

    embed.setImage('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWlyMmRveXJ2b3hpd2s4NGZ1bzNqazYyMDNvdHFwMHNocmtobnRhYiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/oe33xf3B50fsc/giphy.gif');

    await cloned.send({ embeds: [embed] });
    await sendModLog(interaction.guild, embed);
  }
};

export const announce = {
  name: 'announce',
  description: 'Send a professional announcement embed to a channel',
  options: [
    { name: 'channel', description: 'Target announcement channel', type: 7, channel_types: [0], required: true },
    { name: 'title', description: 'Announcement title', type: 3, required: true },
    { name: 'message', description: 'Announcement body text (supports markdown)', type: 3, required: true },
    {
      name: 'color',
      description: 'Color theme of the announcement',
      type: 3,
      required: false,
      choices: [
        { name: 'Blue 🔵', value: 'blue' },
        { name: 'Gold ⭐', value: 'gold' },
        { name: 'Green 🟢', value: 'green' },
        { name: 'Red 🔴', value: 'red' },
        { name: 'Purple 🟣', value: 'purple' }
      ]
    },
    {
      name: 'ping',
      description: 'Role mention',
      type: 3,
      required: false,
      choices: [
        { name: '@everyone', value: 'everyone' },
        { name: '@here', value: 'here' },
        { name: 'None', value: 'none' }
      ]
    }
  ],
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const title = interaction.options.getString('title');
    const message = interaction.options.getString('message');
    const colorChoice = interaction.options.getString('color') || 'gold';
    const pingChoice = interaction.options.getString('ping') || 'none';

    const colors = {
      blue: 0x3498db,
      gold: 0xf1c40f,
      green: 0x2ecc71,
      red: 0xe74c3c,
      purple: 0x9b59b6
    };

    const embed = new (await import('discord.js')).EmbedBuilder()
      .setColor(colors[colorChoice] || 0xf1c40f)
      .setTitle(`📢 ${title}`)
      .setDescription(message)
      .setFooter({ text: `Announced by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    let content = '';
    if (pingChoice === 'everyone') content = '@everyone';
    else if (pingChoice === 'here') content = '@here';

    await channel.send({ content: content || undefined, embeds: [embed] });

    return interaction.editReply(`✅ Announcement successfully sent to <#${channel.id}>!`);
  }
};

