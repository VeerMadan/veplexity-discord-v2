import MusicManager from "../../music/manager.js";

export default {

    name: "play",

    async execute(interaction) {

        return MusicManager.play(interaction);

    }

};