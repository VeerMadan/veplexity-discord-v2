import { useMainPlayer } from 'discord-player';

export default {
  name: 'play',
  async execute(interaction) {
    const player = useMainPlayer();
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
      return interaction.reply({ content: '❌ Join a voice channel first.', ephemeral: true });
    }

    const query = interaction.options.getString('query');
    
    if (!query) {
      return interaction.reply({ content: '❌ Provide a song name or URL.', ephemeral: true });
    }

    // 🔧 Defer to give the bot time to extract the stream
    await interaction.deferReply();

    try {

  console.log("=================================");
  console.log("PLAY COMMAND");
  console.log("Query:", query);
  console.log("Voice Channel:", voiceChannel.name);

  const { track } = await player.play(voiceChannel, query, {
        nodeOptions: {
          metadata: interaction.channel, // Pass the text channel so playerStart knows where to send messages
        },
      });

      console.log("Track Loaded:", track);

return interaction.editReply(`🎶 Added to queue: **${track.title}**`);
    } catch (e) {
  console.error("=========================");
  console.error("PLAY COMMAND ERROR");
  console.error(e);
  console.error("=========================");
      return interaction.editReply(`❌ Something went wrong: ${e.message}`);
    }
  },
};