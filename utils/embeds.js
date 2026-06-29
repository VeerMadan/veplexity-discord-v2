import { EmbedBuilder } from 'discord.js';

export function createEmbed(title, emoji, color, fields = []) {
  return new EmbedBuilder()
    .setTitle(`${emoji} ${title}`)
    .setColor(color)
    .addFields(fields)
    .setFooter({
      text: 'VePlexity Moderation',
    })
    .setTimestamp();
}