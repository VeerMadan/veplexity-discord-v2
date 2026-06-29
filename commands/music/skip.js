import { getVoiceConnection } from '@discordjs/voice';

export default {
  name: 'skip',
  async execute(interaction) {
    const connection = getVoiceConnection(interaction.guild.id);

    if (!connection) {
      return interaction.reply('❌ Nothing is playing.');
    }

    connection.state.subscription.player.stop();

    return interaction.reply('⏭ Skipped current song.');
  },
};