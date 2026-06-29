import { generateDependencyReport } from '@discordjs/voice';
console.log(generateDependencyReport());

import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  StreamType,
} from '@discordjs/voice';

import play from 'play-dl';

// 🔧 Authenticate with YouTube to bypass Render/datacenter IP blocks
if (process.env.YOUTUBE_COOKIE) {
  play.setToken({
    youtube: {
      cookie: process.env.YOUTUBE_COOKIE
    }
  });
  console.log('✅ YouTube Cookie initialized!');
}

const queues = new Map();

export async function playSong(interaction, query) {
  const voiceChannel = interaction.member.voice.channel;

  if (!voiceChannel) {
    return interaction.editReply({
      content: '❌ Join a voice channel first.',
    });
  }

  let queue = queues.get(interaction.guild.id);

  if (!queue) {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false, 
    });

    const player = createAudioPlayer();

    connection.subscribe(player);

    queue = {
      connection,
      player,
      songs: [],
      playing: false,
      textChannel: interaction.channel, 
    };

    queues.set(interaction.guild.id, queue);
  }

  // 🔧 Switched back to YouTube by removing the SoundCloud override
  console.log("Searching...");

const results = await play.search(query, {
    limit: 1,
    source: {
        youtube: "video"
    }
});

console.log("Search Finished");
console.log(results);

  if (!results.length) {
    return interaction.editReply({
      content: '❌ No results found.',
    });
  }

  const song = results[0];

  queue.songs.push(song);

  if (!queue.playing) {
    playNext(interaction.guild.id);
  }

  const trackName = song.title || song.name;
  return interaction.editReply({
    content: `🎶 Added to queue: **${trackName}**`,
  });
}

async function playNext(guildId) {
  const queue = queues.get(guildId);

  if (!queue || !queue.songs.length) {
    if (queue) queue.playing = false;
    return;
  }

  queue.playing = true;

  const song = queue.songs.shift();

  try {
    const info = await play.video_info(song.url);

console.log("==========================");
console.log(info.video_details);
console.log("==========================");

const stream = await play.stream(info.video_details.url, {
    discordPlayerCompatibility: false
});

    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
      inlineVolume: true 
    });
    
    resource.volume.setVolume(1); 

    queue.player.play(resource);
    
    const trackName = song.title || song.name;
    queue.textChannel.send(`▶️ Now playing: **${trackName}**`).catch(console.error);

   queue.player.once(AudioPlayerStatus.Playing, () => {
    console.log("✅ Playback started.");
});

    // 🔧 Re-added the Idle listener so the queue actually moves to the next song!
    queue.player.once(AudioPlayerStatus.Idle, () => {
      playNext(guildId);
    });

   queue.player.on("error", (error) => {
    console.error("=======================");
    console.error(error);
    console.error("=======================");
});

  } catch (error) {
    console.error('Stream Extraction Error:', error);
    queue.textChannel.send(`❌ Failed to load stream. It might be age-restricted or invalid. Skipping...`).catch(console.error);
    playNext(guildId);
  }
}

export function skipSong(guildId) {
  const queue = queues.get(guildId);

  if (!queue) return;

  queue.player.stop();
}

export function stopSong(guildId) {
  const queue = queues.get(guildId);

  if (!queue) return;

  queue.songs = [];

  queue.player.stop();
}