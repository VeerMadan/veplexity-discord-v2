import { buildEmbed } from '../../utils/embeds.js';
import { parseDuration } from '../../utils/helpers.js';

export const test = {
  name: 'test',
  description: 'Test bot latency, uptime, and system diagnostics',
  async execute(interaction) {
    const client = interaction.client;
    const uptimeSec = Math.floor(process.uptime());
    const days = Math.floor(uptimeSec / 86400);
    const hours = Math.floor((uptimeSec % 86400) / 3600);
    const minutes = Math.floor((uptimeSec % 3600) / 60);
    const seconds = uptimeSec % 60;
    const uptimeStr = `${days > 0 ? `${days}d ` : ''}${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds}s`;

    const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    const ping = client.ws.ping;

    const embed = buildEmbed('System Status & Diagnostics', '⚡', 0x2ecc71, [
      { name: '🟢 Status', value: 'Online & Fully Operational', inline: true },
      { name: '📡 Gateway Ping', value: `${ping}ms`, inline: true },
      { name: '⏱️ Uptime', value: uptimeStr, inline: true },
      { name: '💾 Memory Usage', value: `${memUsage} MB`, inline: true },
      { name: '🌐 Connected Guilds', value: `${client.guilds.cache.size}`, inline: true },
      { name: '⚙️ Node.js', value: process.version, inline: true }
    ]);

    embed.setFooter({ text: 'VePlexity Bot Diagnostics', iconURL: client.user.displayAvatarURL() });

    return interaction.editReply({ embeds: [embed] });
  }
};

export const serverinfo = {
  name: 'serverinfo',
  description: 'Show server statistics and details',
  async execute(interaction) {
    const guild = interaction.guild;
    const embed = buildEmbed('Server Info', 'ℹ️', 0x3498db, [
      { name: 'Server Name', value: guild.name, inline: true },
      { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
      { name: 'Total Members', value: `${guild.memberCount}`, inline: true },
      { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
      { name: 'Boost Level', value: `${guild.premiumTier} (${guild.premiumSubscriptionCount || 0} boosts)`, inline: true },
      { name: 'Channels', value: `${guild.channels.cache.size}`, inline: true }
    ]);
    if (guild.iconURL()) embed.setThumbnail(guild.iconURL());
    return interaction.editReply({ embeds: [embed] });
  }
};

export const roleinfo = {
  name: 'roleinfo',
  description: 'Show details about a specific role',
  options: [{ name: 'role', description: 'Role to inspect', type: 8, required: true }],
  async execute(interaction) {
    const role = interaction.options.getRole('role');
    const embed = buildEmbed('Role Info', '🎭', role.color || 0x99aab5, [
      { name: 'Role Name', value: role.name, inline: true },
      { name: 'Role ID', value: role.id, inline: true },
      { name: 'Members with Role', value: `${role.members.size}`, inline: true },
      { name: 'Position', value: `${role.position}`, inline: true },
      { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
      { name: 'Created', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:D>`, inline: true }
    ]);
    return interaction.editReply({ embeds: [embed] });
  }
};

export const userinfo = {
  name: 'userinfo',
  description: 'Show user account details',
  options: [{ name: 'user', description: 'User', type: 6, required: true }],
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const embed = buildEmbed('User Info', '👤', 0x3498db, [
      { name: 'Username', value: `${user.tag}`, inline: true },
      { name: 'User ID', value: user.id, inline: true },
      { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`, inline: true },
      member?.joinedTimestamp ? { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>`, inline: true } : null,
      member?.roles ? { name: 'Roles', value: member.roles.cache.filter(r => r.id !== interaction.guildId).map(r => `<@&${r.id}>`).slice(0, 8).join(', ') || 'None' } : null
    ].filter(Boolean));

    embed.setThumbnail(user.displayAvatarURL({ size: 512 }));
    return interaction.editReply({ embeds: [embed] });
  }
};

export const avatar = {
  name: 'avatar',
  description: "Show a user's avatar in full resolution",
  options: [{ name: 'user', description: 'User (defaults to you)', type: 6, required: false }],
  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    return interaction.editReply({
      content: `🖼️ **${target.username}**'s avatar:`,
      embeds: [{ image: { url: target.displayAvatarURL({ size: 1024 }) } }]
    });
  }
};

export const rate = {
  name: 'rate',
  description: 'Get a rating out of 10 for anything',
  options: [{ name: 'thing', description: 'What to rate', type: 3, required: true }],
  async execute(interaction) {
    const thing = interaction.options.getString('thing');
    const rating = Math.floor(Math.random() * 11);
    return interaction.editReply(`📊 I'd rate **${thing}** a solid **${rating}/10**.`);
  }
};

export const poll = {
  name: 'poll',
  description: 'Create a yes/no poll',
  options: [{ name: 'question', description: 'Poll question', type: 3, required: true }],
  async execute(interaction) {
    const question = interaction.options.getString('question');
    const pollMsg = await interaction.editReply({
      embeds: [buildEmbed('Poll', '📊', 0x9b59b6, [{ name: question, value: `Asked by <@${interaction.user.id}>` }])],
      fetchReply: true
    });
    await pollMsg.react('👍').catch(() => null);
    await pollMsg.react('👎').catch(() => null);
  }
};

export const remindme = {
  name: 'remindme',
  description: 'Set a reminder for yourself',
  options: [
    { name: 'time', description: 'e.g. 10m, 1h, 2d', type: 3, required: true },
    { name: 'text', description: 'What to remind you about', type: 3, required: true }
  ],
  async execute(interaction) {
    const time = interaction.options.getString('time');
    const text = interaction.options.getString('text');
    const ms = parseDuration(time);
    if (!ms) return interaction.editReply('❌ Invalid time format. Use e.g. 10m, 1h, 2d.');
    if (ms > 7 * 24 * 60 * 60 * 1000) return interaction.editReply('❌ Max reminder time is 7 days.');

    await interaction.editReply(`⏰ Got it — I'll remind you about "${text}" in ${time}.`);

    setTimeout(() => {
      interaction.user.send(`⏰ **Reminder:** ${text}`).catch(() => {
        interaction.channel?.send(`⏰ <@${interaction.user.id}> Reminder: ${text}`).catch(() => null);
      });
    }, ms);
  }
};
