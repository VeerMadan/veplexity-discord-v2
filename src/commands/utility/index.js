import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { buildEmbed } from '../../utils/embeds.js';
import { parseDuration } from '../../utils/helpers.js';
import { deletedMessages, editedMessages } from '../../services/snipeService.js';
import db from '../../services/database.js';

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
  description: 'Set a persistent reminder for yourself (survives bot restarts!)',
  options: [
    { name: 'time', description: 'e.g. 10m, 1h, 2d', type: 3, required: true },
    { name: 'text', description: 'What to remind you about', type: 3, required: true }
  ],
  async execute(interaction) {
    const time = interaction.options.getString('time');
    const text = interaction.options.getString('text');
    const ms = parseDuration(time);
    if (!ms) return interaction.editReply('❌ Invalid time format. Use e.g. `10m`, `1h`, `2d`.');
    if (ms > 7 * 24 * 60 * 60 * 1000) return interaction.editReply('❌ Max reminder time is 7 days.');

    const triggerAt = Date.now() + ms;
    db.addReminder({
      userId: interaction.user.id,
      channelId: interaction.channelId,
      text,
      triggerAt
    });

    return interaction.editReply(`⏰ Got it! I'll remind you about **"${text}"** <t:${Math.floor(triggerAt / 1000)}:R>.`);
  }
};

// ─── NEW UPGRADES: SNIPE, AFK, CONFESS, IMAGINE, AIMODE, GIVEAWAY ───────────

export const snipe = {
  name: 'snipe',
  description: 'Caught in 4K! Expose the most recently deleted or edited message in this channel',
  options: [
    {
      name: 'type',
      description: 'Snipe deleted message or edited message',
      type: 3,
      required: false,
      choices: [
        { name: '🗑️ Deleted Message (Default)', value: 'deleted' },
        { name: '✏️ Edited Message', value: 'edited' }
      ]
    }
  ],
  async execute(interaction) {
    const type = interaction.options.getString('type') || 'deleted';

    if (type === 'edited') {
      const edited = editedMessages.get(interaction.channelId);
      if (!edited) {
        return interaction.editReply('🕵️ Nothing to edit-snipe in this channel yet!');
      }

      const embed = new EmbedBuilder()
        .setColor(0xf39c12)
        .setAuthor({ name: `${edited.authorTag} (Caught Editing in 4K 📸)`, iconURL: edited.authorAvatar })
        .addFields(
          { name: '❌ Before Edit', value: edited.oldContent.slice(0, 1024) || '*[Empty]*' },
          { name: '✅ After Edit', value: edited.newContent.slice(0, 1024) || '*[Empty]*' }
        )
        .setFooter({ text: 'Caught by VePlexity 4K Surveillance' })
        .setTimestamp(edited.timestamp);

      return interaction.editReply({ embeds: [embed] });
    }

    const sniped = deletedMessages.get(interaction.channelId);
    if (!sniped) {
      return interaction.editReply('🕵️ Nothing to snipe! Nobody has deleted a message here recently.');
    }

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setAuthor({ name: `${sniped.authorTag} (Caught in 4K 📸)`, iconURL: sniped.authorAvatar })
      .setDescription(sniped.content || '*[Attachment / Image Only]*')
      .setFooter({ text: 'Deleted message exposed by VePlexity' })
      .setTimestamp(sniped.timestamp);

    if (sniped.image) {
      embed.setImage(sniped.image);
    }

    return interaction.editReply({ embeds: [embed] });
  }
};

export const afk = {
  name: 'afk',
  description: 'Set an AFK status — anyone who pings you will be notified automatically',
  options: [{ name: 'reason', description: 'Why are you going AFK?', type: 3, required: false }],
  async execute(interaction) {
    const reason = interaction.options.getString('reason') || 'Busy / Away from keyboard';
    db.setAfk(interaction.user.id, reason);

    return interaction.editReply(`💤 **<@${interaction.user.id}> is now AFK:** *"${reason}"*\n*(I'll notify anyone who pings you, and remove your AFK when you send a message.)*`);
  }
};

export const confess = {
  name: 'confess',
  description: 'Post a 100% anonymous confession in this channel (nobody will know it was you)',
  options: [{ name: 'secret', description: 'Your anonymous confession or secret', type: 3, required: true }],
  async execute(interaction) {
    const secret = interaction.options.getString('secret');
    const confessionNum = Math.floor(1000 + Math.random() * 9000);

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle(`🤫 Anonymous Confession #${confessionNum}`)
      .setDescription(`> *"${secret}"*`)
      .setFooter({ text: '100% Anonymous • Use /confess to submit yours' })
      .setTimestamp();

    await interaction.channel.send({ embeds: [embed] });
    return interaction.editReply({ content: '✅ Your confession has been posted anonymously! Zero trace left behind. 🤫' });
  }
};

export const imagine = {
  name: 'imagine',
  description: 'Generate high-resolution AI artwork from any text prompt for free',
  options: [{ name: 'prompt', description: 'Describe the image you want to create', type: 3, required: true }],
  async execute(interaction) {
    const prompt = interaction.options.getString('prompt');
    const seed = Math.floor(Math.random() * 999999);
    const encodedPrompt = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&nologo=true`;

    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle('🎨 VePlexity AI Art Studio')
      .setDescription(`**Prompt:** *"${prompt}"*`)
      .setImage(imageUrl)
      .setFooter({ text: `Generated for ${interaction.user.username} • Seed: ${seed}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};

export const aimode = {
  name: 'aimode',
  description: 'Switch VePlexity Chatbot\'s active personality mood in this server',
  options: [
    {
      name: 'persona',
      description: 'Choose the AI Chatbot personality',
      type: 3,
      required: true,
      choices: [
        { name: '🔥 Default (Savage Hinglish Roasts + Sleek English Flirt)', value: 'default' },
        { name: '💀 Pure Savage Roaster (100% Unfiltered Hinglish Destruction)', value: 'savage' },
        { name: '💋 Pure Seductive Flirt (100% Bold & Smooth English)', value: 'flirty' },
        { name: '😎 Chill Bestie (Warm, Friendly & Casual)', value: 'chill' }
      ]
    }
  ],
  async execute(interaction) {
    const mode = interaction.options.getString('persona');
    db.setAiMode(interaction.guildId, mode);
    db.setChatbotGuild(interaction.guildId, true);

    const labels = {
      default: '🔥 **Default Hybrid Mode** (Savage Hinglish Roasts + Sleek English Flirting)',
      savage: '💀 **Pure Savage Roaster Mode** (100% Unfiltered Hinglish Destruction)',
      flirty: '💋 **Pure Seductive Flirt Mode** (100% Bold & Smooth English)',
      chill: '😎 **Chill Bestie Mode** (Friendly & Casual Vibes)'
    };

    return interaction.editReply(`🧠 **AI Persona Updated!** VePlexity is now operating in:\n> ${labels[mode]}\n*(Mention <@${interaction.client.user.id}> or reply to any of its messages to chat!)*`);
  }
};

export const giveaway = {
  name: 'giveaway',
  description: 'Launch an interactive button giveaway with automatic winner selection',
  options: [
    { name: 'duration', description: 'Duration (e.g. 1m, 30m, 1h, 1d)', type: 3, required: true },
    { name: 'prize', description: 'What are you giving away?', type: 3, required: true },
    { name: 'winners', description: 'Number of winners (default 1)', type: 4, required: false }
  ],
  async execute(interaction) {
    const durationStr = interaction.options.getString('duration');
    const prize = interaction.options.getString('prize');
    const winnerCount = Math.max(1, interaction.options.getInteger('winners') || 1);

    const ms = parseDuration(durationStr);
    if (!ms || ms < 10000 || ms > 7 * 24 * 60 * 60 * 1000) {
      return interaction.editReply('❌ Invalid duration! Use between `10s` and `7d` (e.g., `5m`, `1h`, `1d`).');
    }

    const endTimeSec = Math.floor((Date.now() + ms) / 1000);
    const participants = new Set();

    function buildGwEmbed(ended = false, winnersList = []) {
      const embed = new EmbedBuilder()
        .setColor(ended ? 0x2ecc71 : 0xff69b4)
        .setTitle(`🎉 GIVEAWAY: ${prize}`)
        .setDescription(
          ended
            ? (winnersList.length
                ? `🏆 **Winner(s):** ${winnersList.map(id => `<@${id}>`).join(', ')}\n🎁 **Prize:** **${prize}**\n👥 **Total Entries:** ${participants.size}`
                : `❌ Giveaway ended with no valid entries!`)
            : `Click the **🎉 Enter Giveaway** button below to join!\n\n` +
              `🎁 **Prize:** **${prize}**\n` +
              `🏆 **Winners:** ${winnerCount}\n` +
              `⏰ **Ends:** <t:${endTimeSec}:R> (<t:${endTimeSec}:t>)\n` +
              `👥 **Entries:** **${participants.size}**`
        )
        .setFooter({ text: `Hosted by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      return embed;
    }

    function getGwRow(disabled = false) {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('gw_enter')
          .setLabel(`🎉 Enter Giveaway (${participants.size})`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(disabled)
      );
    }

    const msg = await interaction.editReply({
      embeds: [buildGwEmbed(false)],
      components: [getGwRow(false)],
      fetchReply: true
    });

    const collector = msg.createMessageComponentCollector({ time: ms });

    collector.on('collect', async i => {
      if (participants.has(i.user.id)) {
        participants.delete(i.user.id);
        await i.update({ embeds: [buildGwEmbed(false)], components: [getGwRow(false)] });
        await i.followUp({ content: '🚪 You left the giveaway.', ephemeral: true });
      } else {
        participants.add(i.user.id);
        await i.update({ embeds: [buildGwEmbed(false)], components: [getGwRow(false)] });
        await i.followUp({ content: `🎉 You're entered to win **${prize}**! Good luck!`, ephemeral: true });
      }
    });

    collector.on('end', async () => {
      const pool = Array.from(participants);
      const winners = [];
      while (winners.length < winnerCount && pool.length > 0) {
        const idx = Math.floor(Math.random() * pool.length);
        winners.push(pool.splice(idx, 1)[0]);
      }

      await interaction.editReply({
        embeds: [buildGwEmbed(true, winners)],
        components: [getGwRow(true)]
      }).catch(() => {});

      if (winners.length > 0) {
        await interaction.channel.send(
          `🎊 **CONGRATULATIONS** ${winners.map(id => `<@${id}>`).join(', ')}! You won **${prize}** hosted by <@${interaction.user.id}>!`
        ).catch(() => {});
      }
    });
  }
};
