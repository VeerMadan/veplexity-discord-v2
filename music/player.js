import { useMainPlayer } from 'discord-player';

export async function playSong(interaction, query, voiceChannel) {
  const player = useMainPlayer();

  try {
    // 🔧 Force a search that skips the aggressive HTML parsing
    const searchResult = await player.search(query, {
      requestedBy: interaction.user,
      searchEngine: 'youtube' // Use standard youtube search instead of the heavy parser
    });

    if (!searchResult.hasTracks()) {
      return interaction.editReply({ content: '❌ No results found.' });
    }

    await player.play(voiceChannel, searchResult.tracks[0], {
      nodeOptions: { metadata: interaction }
    });

    return interaction.editReply({ content: `🎶 Added to queue: **${searchResult.tracks[0].title}**` });

  } catch (error) {
    console.error("Playback Engine Error:", error);
    return interaction.editReply({ content: `❌ Stream extraction failed: ${error.message}` });
  }
}

export function skipSong(guildId) {
  const player = useMainPlayer();
  const queue = player.nodes.get(guildId);
  if (queue) queue.node.skip();
}

export function stopSong(guildId) {
  const player = useMainPlayer();
  const queue = player.nodes.get(guildId);
  if (queue) queue.delete();
}