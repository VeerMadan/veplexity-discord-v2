import { createEmbed } from '../../utils/embeds.js';
import { loadDatabase, saveDatabase } from '../../utils/database.js';
import { sendModLog } from '../../utils/modlog.js';
import { createCase } from '../../utils/cases.js';
import { hasModPerms } from '../../utils/permissions.js';

const WARNING_ESCALATION = {
  3: { type: 'timeout', duration: 10 * 60 * 1000 },
  4: { type: 'timeout', duration: 60 * 60 * 1000 },
  5: { type: 'timeout', duration: 12 * 60 * 60 * 1000 },
  6: { type: 'kick' },
  7: { type: 'ban' },
};

export default {
  name: 'warn',

  async execute(interaction) {
    if (!hasModPerms(interaction.member)) {
      return interaction.reply({
        content: '❌ You do not have moderation permissions.',
        ephemeral: true,
      });
    }

    const user = interaction.options.getUser('user');
    const reason =
      interaction.options.getString('reason') || 'No reason provided';

    const db = loadDatabase();

    if (!db.warns[user.id]) {
      db.warns[user.id] = {
        normal: 0,
        pvc: 0,
      };
    }

    db.warns[user.id].normal++;

    saveDatabase(db);

    const warnCount = db.warns[user.id].normal;

    createCase(
      user.id,
      'Warn',
      interaction.user.id,
      reason
    );

    const embed = createEmbed(
      'User Warned',
      '⚠️',
      0xf1c40f,
      [
        {
          name: 'User',
          value: `<@${user.id}>`,
          inline: true,
        },
        {
          name: 'Moderator',
          value: `<@${interaction.user.id}>`,
          inline: true,
        },
        {
          name: 'Reason',
          value: reason,
        },
        {
          name: 'Total Warnings',
          value: `${warnCount}`,
          inline: true,
        },
      ]
    );

    await interaction.reply({
      embeds: [embed],
    });

    await sendModLog(interaction.guild, embed);

    await applyEscalation(
      interaction,
      user,
      warnCount
    );
  },
};

async function applyEscalation(
  interaction,
  user,
  warnCount
) {
  const rule = WARNING_ESCALATION[warnCount];

  if (!rule) return;

  const member =
    await interaction.guild.members.fetch(user.id);

  if (rule.type === 'timeout') {
    await member.timeout(
      rule.duration,
      `${warnCount} warnings reached`
    );

    await interaction.channel.send(
      `⏳ <@${user.id}> timed out automatically (${warnCount} warnings)`
    );
  }

  if (rule.type === 'kick') {
    await member.kick(
      `${warnCount} warnings reached`
    );

    await interaction.channel.send(
      `👢 <@${user.id}> kicked automatically (${warnCount} warnings)`
    );
  }

  if (rule.type === 'ban') {
    await member.ban({
      reason: `${warnCount} warnings reached`,
    });

    await interaction.channel.send(
      `🚫 <@${user.id}> banned automatically (${warnCount} warnings)`
    );
  }
}