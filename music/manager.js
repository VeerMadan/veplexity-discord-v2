import { playSong } from "./player.js";

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

        await interaction.deferReply();

        // 🔧 Pass the voiceChannel explicitly to the player
        return playSong(interaction, query, voiceChannel);
    }
}

export default new MusicManager();