import { EmbedBuilder } from 'discord.js';
import db from '../services/database.js';

export function buildEmbed(title, emoji, color, fields = [], footerText = 'VePlexity Moderation') {
  const embed = new EmbedBuilder()
    .setTitle(`${emoji ? `${emoji} ` : ''}${title}`)
    .setColor(color)
    .setFooter({ text: footerText })
    .setTimestamp();

  if (fields && fields.length > 0) {
    embed.addFields(fields.filter(Boolean));
  }

  return embed;
}

export async function sendModLog(guild, embed) {
  if (!guild || !embed) return;
  try {
    const channelId = db.getModLogChannel(guild.id);
    if (!channelId) return;

    let channel = guild.channels.cache.get(channelId);
    if (!channel) {
      channel = await guild.channels.fetch(channelId).catch(() => null);
    }

    if (channel && channel.isTextBased()) {
      await channel.send({ embeds: [embed] }).catch(() => null);
    }
  } catch (error) {
    console.error('[ModLog Error]', error);
  }
}
