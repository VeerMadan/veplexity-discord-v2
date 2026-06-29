import play from 'play-dl';

class MusicManager {

    async play(interaction) {

        console.log("========== PLAY REQUEST ==========");

        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply({
                content: "❌ Join a voice channel first.",
                ephemeral: true
            });
        }

        const query = interaction.options.getString("query");

        console.log("Voice Channel:", voiceChannel.name);
        console.log("Query:", query);

        // We'll implement playback next.
    }

}

export default new MusicManager();