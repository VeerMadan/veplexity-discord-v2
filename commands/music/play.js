//dead code, but I will keep it here for reference in case I need to revert back to it. The new code is in the music/manager.js file, which is a more organized and modular approach to handling music commands.
//-vepelxity
//-- IGNORE ---

export default {

    name: "play",

    async execute(interaction) {

        return MusicManager.play(interaction);

    }

};