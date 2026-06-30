import { useMainPlayer } from 'discord-player';

export async function playSong(interaction, query, voiceChannel) {
  const player = useMainPlayer();

  try {
    console.log(`Searching for "${query}" on SoundCloud to bypass infinite loops...`);
    
    // 🔧 Force the search engine to use SoundCloud (No API keys needed, no IP blocks)
    const searchResult = await player.search(query, {
      requestedBy: interaction.user,
      searchEngine: 'soundcloudSearch' // 👈 THE FIX
    });

    if (!searchResult.hasTracks()) {
      return interaction.editReply({ content: '❌ No results found.' });
    }

    const track = searchResult.tracks[0];
    console.log(`✅ Track found: ${track.title}`);

    // 🔧 Play the track. 
    await player.play(voiceChannel, track, {
      nodeOptions: { 
        metadata: interaction,
        leaveOnEmpty: true,
        leaveOnEmptyCooldown: 300000,
        leaveOnEnd: false
      }
    });

    return interaction.editReply({ content: `🎶 Added to queue: **${track.title}**` });

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