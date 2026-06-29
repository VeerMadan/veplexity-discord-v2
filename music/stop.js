import { getVoiceConnection } from '@discordjs/voice';

export default {
  name: 'stop',
  async execute(interaction) {
    const connection = getVoiceConnection(interaction.guild.id);

    if (!connection) {
      return interaction.reply('❌ Nothing is playing.');
    }

    connection.destroy();

    return interaction.reply('⏹ Music stopped and disconnected.');
  },
};