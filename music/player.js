import { useMainPlayer } from 'discord-player';

export async function playSong(interaction, query, voiceChannel) {
  const player = useMainPlayer();

  try {
    console.log("Searching and Queueing via Discord Player...");
    
    // 🔧 The magic function: Handles joining VC, searching, extracting, and queueing
    const { track } = await player.play(voiceChannel, query, {
      nodeOptions: {
        metadata: interaction, // Attach interaction for event listeners
        leaveOnEmpty: true,
        leaveOnEmptyCooldown: 300000, // Leave after 5 mins of being alone
        leaveOnEnd: false
      }
    });

    return interaction.editReply({
        content: `🎶 Added to queue: **${track.title}**`
    });

  } catch (error) {
    console.error("Playback Engine Error:", error);
    return interaction.editReply({
        content: `❌ Failed to extract the stream. YouTube might be blocking the IP right now.`
    });
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