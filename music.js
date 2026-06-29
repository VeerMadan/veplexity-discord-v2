import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  getVoiceConnection,
} from '@discordjs/voice';
import play from 'play-dl';

const players = new Map();

export async function playSong(interaction, query) {
  const memberRes = await fetch(
  `https://discord.com/api/v10/guilds/${interaction.guild_id}/members/${interaction.member.user.id}`,
  {
    headers: {
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
    },
  }
);

const member = await memberRes.json();

// ❌ If not in VC
if (!member?.voice?.channel_id) {
  return '❌ Join a voice channel first';
}

  try {
    // 🔥 SEARCH SUPPORT
    let url = query;

    if (!play.yt_validate(query)) {
      const results = await play.search(query, { limit: 1 });
      if (!results.length) return '❌ No results found';

      url = results[0].url;
    }

    const stream = await play.stream(url, { quality: 2 });

    const connection = joinVoiceChannel({
      channelId: member.voice.channel_id,
      guildId: interaction.guild_id,
      adapterCreator: interaction.guild.voiceAdapterCreator,
    });

    const player = createAudioPlayer();
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
    });

    player.play(resource);
    connection.subscribe(player);

    players.set(interaction.guild_id, player);

    player.on(AudioPlayerStatus.Idle, () => {
      // stays in VC
    });

    return `🎶 Now playing`;
  } catch (err) {
    console.error(err);
    return '❌ Failed to play track';
  }
}

export function stopSong(guildId) {
  const connection = getVoiceConnection(guildId);
  if (connection) connection.destroy();
}