//dead code, but I will keep it here for reference in case I need to revert back to it. The new code is in the music/manager.js file, which is a more organized and modular approach to handling music commands.
//-vepelxity
//-- IGNORE ---
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