import { loadDatabase } from './database.js';

export async function sendModLog(guild, embed) {
  const db = loadDatabase();

  const channelId = db.modlogs[guild.id];

  if (!channelId) return;

  const channel = guild.channels.cache.get(channelId);

  if (!channel) return;

  await channel.send({
    embeds: [embed],
  });
}