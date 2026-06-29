import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
} from '@discordjs/voice';
import play from 'play-dl';

export default {
  name: 'play',
  async execute(interaction) {
    const query = interaction.options.getString('query');

    const channel = interaction.member.voice.channel;

    if (!channel) {
      return interaction.reply('❌ Join VC first');
    }

    await interaction.deferReply();

    let url = query;

    if (!play.yt_validate(query)) {
      const results = await play.search(query, { limit: 1 });
      if (!results.length) {
        return interaction.editReply('❌ No results found');
      }
      url = results[0].url;
    }

    const stream = await play.stream(url);

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator,
    });

    const player = createAudioPlayer();
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
    });

    player.play(resource);
    connection.subscribe(player);

    return interaction.editReply('🎶 Playing now');
  },
};