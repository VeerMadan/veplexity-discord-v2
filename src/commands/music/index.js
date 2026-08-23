import musicManager from '../../services/music/MusicManager.js';
import streamResolver from '../../services/music/StreamResolver.js';
import { buildEmbed } from '../../utils/embeds.js';

export const play = {
  name: 'play',
  description: 'Play music from YouTube or Spotify (track, album, playlist, or search)',
  options: [
    {
      name: 'query',
      type: 3,
      required: true,
      description: 'Song name, YouTube URL, or Spotify URL',
      autocomplete: true
    }
  ],
  async autocomplete(interaction) {
    const query = interaction.options.getString('query');
    if (!query || query.trim().length < 2) return interaction.respond([]);

    // If already a direct URL, don't run YouTube search
    if (/^https?:\/\//i.test(query)) {
      return interaction.respond([{
        name: query.slice(0, 100),
        value: query.slice(0, 100)
      }]);
    }

    try {
      const results = await streamResolver.searchYouTube(query, 10);
      const filtered = results.filter(t => !/remix|cover|sped up|slowed|8d|nightcore|mashup/i.test(t.title));
      const finalTracks = filtered.length > 0 ? filtered : results;

      return interaction.respond(
        finalTracks.slice(0, 10).map(t => ({
          name: `${t.title} - ${t.author}`.slice(0, 100),
          value: t.url.slice(0, 100)
        }))
      );
    } catch (e) {
      return interaction.respond([]).catch(() => {});
    }
  },
  async execute(interaction) {
    const query = interaction.options.getString('query');
    return musicManager.play(interaction, query);
  }
};

export const pause = {
  name: 'pause',
  description: 'Pause current track',
  async execute(interaction) {
    const queue = musicManager.getQueue(interaction.guildId);
    if (!queue || !queue.isPlaying) return interaction.editReply('❌ Nothing is playing right now.');
    if (queue.isPaused) return interaction.editReply('⏸️ Already paused.');
    queue.pause();
    return interaction.editReply('⏸️ Playback paused.');
  }
};

export const resume = {
  name: 'resume',
  description: 'Resume paused track',
  async execute(interaction) {
    const queue = musicManager.getQueue(interaction.guildId);
    if (!queue) return interaction.editReply('❌ Nothing to resume.');
    if (!queue.isPaused) return interaction.editReply('▶️ Already playing.');
    queue.resume();
    return interaction.editReply('▶️ Resumed playback.');
  }
};

export const skip = {
  name: 'skip',
  description: 'Skip the current track',
  async execute(interaction) {
    const queue = musicManager.getQueue(interaction.guildId);
    if (!queue || !queue.current) return interaction.editReply('❌ Nothing is currently playing to skip.');
    const title = queue.current.title;
    queue.skip();
    return interaction.editReply(`⏭️ Skipped: **${title}**`);
  }
};

export const stop = {
  name: 'stop',
  description: 'Stop music and clear queue',
  async execute(interaction) {
    const queue = musicManager.getQueue(interaction.guildId);
    if (!queue) return interaction.editReply('❌ Nothing is playing.');
    queue.stop();
    return interaction.editReply('⏹️ Stopped playback and cleared queue.');
  }
};

export const queue = {
  name: 'queue',
  description: 'Show current playback queue',
  async execute(interaction) {
    const q = musicManager.getQueue(interaction.guildId);
    if (!q || (!q.current && q.tracks.length === 0)) {
      return interaction.editReply('❌ Queue is empty.');
    }

    const current = q.current;
    const upcoming = q.tracks.slice(0, 10);
    let desc = current ? `**Now Playing:** [${current.title}](${current.url || current.sourceUrl}) (${current.duration})\n\n` : '';
    desc += upcoming.length > 0
      ? upcoming.map((t, i) => `**${i + 1}.** [${t.title}](${t.url || t.sourceUrl}) — \`${t.duration}\` (Requested by <@${t.requestedBy?.id}>)`).join('\n')
      : '_No upcoming tracks in queue._';

    if (q.tracks.length > 10) {
      desc += `\n\n*...and ${q.tracks.length - 10} more track(s).*`;
    }

    const embed = buildEmbed('Music Queue', '📜', 0x3498db, [
      { name: 'Status', value: desc }
    ], `Queue Length: ${q.tracks.length + (current ? 1 : 0)} | 24/7: ${q.is247 ? 'On' : 'Off'} | Loop: ${q.repeatMode}`);

    return interaction.editReply({ embeds: [embed] });
  }
};

export const nowplaying = {
  name: 'nowplaying',
  description: 'Show info about the currently playing track',
  async execute(interaction) {
    const info = musicManager.getNowPlayingDisplay(interaction.guildId);
    if (!info) return interaction.editReply('❌ Nothing is playing right now.');

    const embed = buildEmbed('Now Playing', '🎶', 0x3498db, [
      { name: 'Track', value: `[${info.title}](${info.url})`, inline: false },
      { name: 'Author', value: info.author, inline: true },
      { name: 'Requested By', value: `<@${info.requestedBy?.id}>`, inline: true },
      { name: 'Progress', value: `\`${info.currentFormatted}\` ${info.progressBar} \`${info.totalFormatted}\``, inline: false },
      { name: 'Settings', value: `🔊 Volume: **${info.volume}%** | 🔁 Loop: **${info.repeatMode}** | 🌙 24/7: **${info.is247 ? 'Enabled' : 'Disabled'}**`, inline: false }
    ]);

    if (info.thumbnail) {
      embed.setThumbnail(info.thumbnail);
    }

    return interaction.editReply({ embeds: [embed] });
  }
};

export const volume = {
  name: 'volume',
  description: 'Set playback volume',
  options: [
    { name: 'level', type: 4, required: true, description: 'Volume level between 0 and 150' }
  ],
  async execute(interaction) {
    const queue = musicManager.getQueue(interaction.guildId);
    if (!queue) return interaction.editReply('❌ I need to be connected and playing first.');
    const level = interaction.options.getInteger('level');
    if (level < 0 || level > 150) return interaction.editReply('❌ Volume must be between 0 and 150.');
    queue.setVolume(level);
    return interaction.editReply(`🔊 Volume set to **${level}%**.`);
  }
};

export const loop = {
  name: 'loop',
  description: 'Set loop mode',
  options: [
    {
      name: 'mode',
      description: 'Loop mode to use',
      type: 3,
      required: true,
      choices: [
        { name: 'off', value: 'off' },
        { name: 'track', value: 'track' },
        { name: 'queue', value: 'queue' }
      ]
    }
  ],
  async execute(interaction) {
    const queue = musicManager.getQueue(interaction.guildId);
    if (!queue) return interaction.editReply('❌ I need to be connected first.');
    const mode = interaction.options.getString('mode');
    queue.repeatMode = mode;
    const labels = {
      off: '➡️ Loop disabled.',
      track: '🔂 Looping current track.',
      queue: '🔁 Looping the queue.'
    };
    return interaction.editReply(labels[mode] || `Loop mode set to **${mode}**.`);
  }
};

export const shuffle = {
  name: 'shuffle',
  description: 'Shuffle upcoming queue tracks',
  async execute(interaction) {
    const queue = musicManager.getQueue(interaction.guildId);
    if (!queue || queue.tracks.length < 2) return interaction.editReply('❌ Not enough tracks in queue to shuffle (need at least 2).');
    queue.shuffle();
    return interaction.editReply(`🔀 Shuffled **${queue.tracks.length}** tracks in the queue.`);
  }
};

export const connect = {
  name: 'connect',
  description: 'Connect bot to your voice channel and stay put',
  async execute(interaction) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) return interaction.editReply('❌ Join a voice channel first.');

    const queue = musicManager.getOrCreateQueue(interaction.guildId, voiceChannel, interaction.channel);
    await queue.connect();
    queue.is247 = true;
    return interaction.editReply(`🔌 Connected to **${voiceChannel.name}** and staying put in 24/7 mode! (Use \`/disconnect\` to leave).`);
  }
};

export const disconnect = {
  name: 'disconnect',
  description: 'Disconnect the bot from voice channel',
  async execute(interaction) {
    const queue = musicManager.getQueue(interaction.guildId);
    if (queue) {
      queue.is247 = false;
      queue.destroy();
    }
    return interaction.editReply('🔌 Disconnected from voice channel.');
  }
};

export const mode247 = {
  name: '247',
  description: 'Toggle 24/7 mode (bot stays in VC even when idle)',
  async execute(interaction) {
    const queue = musicManager.getQueue(interaction.guildId);
    if (!queue) return interaction.editReply('❌ Bot is not currently connected to any voice channel. Use `/connect` first.');
    queue.is247 = !queue.is247;
    return interaction.editReply(queue.is247 ? '☀️ 24/7 mode **enabled** — I\'ll stay connected in VC indefinitely.' : '🌙 24/7 mode **disabled** — I\'ll leave when idle.');
  }
};
