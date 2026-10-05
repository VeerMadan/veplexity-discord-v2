import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import musicManager from '../../services/music/MusicManager.js';
import streamResolver from '../../services/music/StreamResolver.js';
import localLibrary from '../../services/music/LocalLibrary.js';
import { buildEmbed } from '../../utils/embeds.js';

// ─── HELPER: MUSIC CONTROLS BUTTON ROW ───────────────────────────────────────
function createMusicControlsRow(isPaused = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('music_toggle_pause')
      .setLabel(isPaused ? 'Resume' : 'Pause')
      .setEmoji(isPaused ? '▶️' : '⏸️')
      .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('music_skip')
      .setLabel('Skip')
      .setEmoji('⏭️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_stop')
      .setLabel('Stop')
      .setEmoji('⏹️')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('music_queue')
      .setLabel('Queue')
      .setEmoji('📜')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_effects_info')
      .setLabel('Effects')
      .setEmoji('🎛️')
      .setStyle(ButtonStyle.Secondary)
  );
}

// ─── 1. /play COMMAND ────────────────────────────────────────────────────────
export const play = {
  name: 'play',
  description: 'Stream any track from YouTube or local 24-bit lossless FLAC master library',
  options: [
    {
      name: 'song',
      description: 'Song title, artist name, or YouTube URL (instant autocomplete)',
      type: 3, // STRING
      required: true,
      autocomplete: true
    }
  ],

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const rawQuery = (focused || '').trim();

    if (!rawQuery) {
      // Show sample of local studio master library when query is empty
      const sample = localLibrary.search('', 15).map(song => ({
        name: `📁 ${song.title} - ${song.author} [24-bit FLAC]`.slice(0, 100),
        value: song.id
      }));
      return interaction.respond(sample.slice(0, 25)).catch(() => {});
    }

    const isExplicitYt = rawQuery.toLowerCase().startsWith('yt:') || rawQuery.toLowerCase().startsWith('youtube:');
    const isExplicitLocal = rawQuery.toLowerCase().startsWith('local:') || rawQuery.toLowerCase().startsWith('flac:');
    const cleanQuery = rawQuery.replace(/^(yt|youtube|local|flac):/i, '').trim() || rawQuery;

    const suggestions = [];

    // 1. Explicit local search
    if (isExplicitLocal) {
      const localMatches = localLibrary.search(cleanQuery, 25);
      for (const song of localMatches) {
        suggestions.push({
          name: `📁 ${song.title} - ${song.author} [24-bit FLAC]`.slice(0, 100),
          value: song.id
        });
      }
      return interaction.respond(suggestions.slice(0, 25)).catch(() => {});
    }

    // 2. Explicit YouTube search
    if (isExplicitYt) {
      try {
        const ytResults = await Promise.race([
          streamResolver.searchYouTube(cleanQuery, 25),
          new Promise(res => setTimeout(() => res([]), 2200))
        ]);
        for (const t of ytResults) {
          suggestions.push({
            name: `🌐 ${t.title} - ${t.author} [YouTube]`.slice(0, 100),
            value: t.url.slice(0, 100)
          });
        }
      } catch (e) {}
      return interaction.respond(suggestions.slice(0, 25)).catch(() => {});
    }

    // 3. Balanced Search: Top 4 local FLAC + YouTube results
    const localMatches = localLibrary.search(cleanQuery, 4);
    for (const song of localMatches) {
      suggestions.push({
        name: `📁 ${song.title} - ${song.author} [24-bit FLAC]`.slice(0, 100),
        value: song.id
      });
    }

    if (cleanQuery.length >= 2 && !cleanQuery.startsWith('http')) {
      try {
        const remainingSlots = Math.min(15, 25 - suggestions.length);
        const ytResults = await Promise.race([
          streamResolver.searchYouTube(cleanQuery, remainingSlots),
          new Promise(res => setTimeout(() => res([]), 2200))
        ]);

        for (const t of ytResults) {
          if (suggestions.length < 25) {
            suggestions.push({
              name: `🌐 ${t.title} - ${t.author} [YouTube]`.slice(0, 100),
              value: t.url.slice(0, 100)
            });
          }
        }
      } catch (e) {}
    }

    // If slots remain, add more local matches
    if (suggestions.length < 25) {
      const moreLocal = localLibrary.search(cleanQuery, 25).slice(4);
      for (const song of moreLocal) {
        if (suggestions.length >= 25) break;
        suggestions.push({
          name: `📁 ${song.title} - ${song.author} [24-bit FLAC]`.slice(0, 100),
          value: song.id
        });
      }
    }

    return interaction.respond(suggestions.slice(0, 25)).catch(() => {});
  },

  async execute(interaction) {
    const query = interaction.options.getString('song');
    return musicManager.play(interaction, query);
  }
};

// ─── 2. /pause COMMAND ───────────────────────────────────────────────────────
export const pause = {
  name: 'pause',
  description: 'Pause current audio playback',
  async execute(interaction) {
    const queue = musicManager.getQueue(interaction.guildId);
    if (!queue || !queue.isPlaying) return interaction.editReply('❌ Nothing is playing right now.');
    if (queue.isPaused) return interaction.editReply('⏸️ Playback is already paused.');
    queue.pause();
    return interaction.editReply('⏸️ Playback paused.');
  }
};

// ─── 3. /resume COMMAND ──────────────────────────────────────────────────────
export const resume = {
  name: 'resume',
  description: 'Resume paused audio playback',
  async execute(interaction) {
    const queue = musicManager.getQueue(interaction.guildId);
    if (!queue) return interaction.editReply('❌ Nothing to resume.');
    if (!queue.isPaused) return interaction.editReply('▶️ Already playing.');
    queue.resume();
    return interaction.editReply('▶️ Resumed audio playback.');
  }
};

// ─── 4. /skip COMMAND ────────────────────────────────────────────────────────
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

// ─── 5. /stop COMMAND ────────────────────────────────────────────────────────
export const stop = {
  name: 'stop',
  description: 'Stop playback, clear queue, and leave voice channel',
  async execute(interaction) {
    const queue = musicManager.getQueue(interaction.guildId);
    if (!queue) return interaction.editReply('❌ Nothing is playing.');
    queue.stop();
    return interaction.editReply('⏹️ Stopped playback and cleared queue.');
  }
};

// ─── 6. /queue COMMAND ───────────────────────────────────────────────────────
export const queue = {
  name: 'queue',
  description: 'Display current music playback queue',
  async execute(interaction) {
    const q = musicManager.getQueue(interaction.guildId);
    if (!q || (!q.current && q.tracks.length === 0)) {
      return interaction.editReply('❌ The queue is empty.');
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
    ], `Queue Length: ${q.tracks.length + (current ? 1 : 0)} | Loop: ${q.repeatMode}`);

    return interaction.editReply({ embeds: [embed] });
  }
};

// ─── 7. /nowplaying COMMAND ──────────────────────────────────────────────────
export const nowplaying = {
  name: 'nowplaying',
  description: 'Show details, progress bar, audio quality & active effects of current track',
  async execute(interaction) {
    const info = musicManager.getNowPlayingDisplay(interaction.guildId);
    if (!info) return interaction.editReply('❌ Nothing is playing right now.');

    const isFlac = info.duration.includes('FLAC') || (info.url && info.url.endsWith('.flac'));
    const embed = buildEmbed('Now Playing', '🎶', 0x3498db, [
      { name: 'Track', value: `**${info.title}**`, inline: false },
      { name: 'Artist / Author', value: info.author, inline: true },
      { name: 'Requested By', value: `<@${info.requestedBy?.id}>`, inline: true },
      { name: 'Audio Quality', value: isFlac ? '💎 FLAC 24-bit Lossless Studio' : '🔊 Opus 48kHz Stereo', inline: true },
      { name: 'Progress', value: `\`${info.currentFormatted}\` ${info.progressBar} \`${info.totalFormatted}\``, inline: false },
      { name: 'Active Effects', value: `\`${info.activeEffects}\``, inline: true },
      { name: 'Settings', value: `🔊 Volume: **${info.volume}%** | 🔁 Loop: **${info.repeatMode}**`, inline: true }
    ]);

    if (info.thumbnail) {
      embed.setThumbnail(info.thumbnail);
    }

    const row = createMusicControlsRow(info.isPaused);
    return interaction.editReply({ embeds: [embed], components: [row] });
  }
};

// ─── 8. /volume COMMAND ──────────────────────────────────────────────────────
export const volume = {
  name: 'volume',
  description: 'Adjust audio playback volume in real-time',
  options: [
    {
      name: 'level',
      description: 'Volume level (0-150%)',
      type: 4, // INTEGER
      required: true,
      minValue: 0,
      maxValue: 150
    }
  ],
  async execute(interaction) {
    const queue = musicManager.getQueue(interaction.guildId);
    if (!queue) return interaction.editReply('❌ I need to be connected and playing first.');
    const level = interaction.options.getInteger('level');
    queue.setVolume(level);
    return interaction.editReply(`🔊 Volume set to **${level}%**.`);
  }
};

// ─── 9. /effects COMMAND ─────────────────────────────────────────────────────
export const effects = {
  name: 'effects',
  description: 'Apply real-time DSP audio effects (8D, Bassboost, Nightcore, Vaporwave, etc.)',
  options: [
    {
      name: 'preset',
      description: 'Select an audio effect preset to toggle or clear',
      type: 3, // STRING
      required: true,
      choices: [
        { name: '🎧 8D Audio (Binaural 360° Rotation)', value: '8d' },
        { name: '🔊 Bass Boost - Subtle (+5dB)', value: 'bass_low' },
        { name: '🔊 Bass Boost - Medium (+10dB)', value: 'bass_medium' },
        { name: '🔊 Bass Boost - Heavy (+15dB)', value: 'bass_high' },
        { name: '💥 Bass Boost - Extreme (Ear-Rape)', value: 'bass_extreme' },
        { name: '⚡ Nightcore (Speed & Pitch Up)', value: 'nightcore' },
        { name: '🌸 Vaporwave (Slow & Lo-Fi Reverb)', value: 'vaporwave' },
        { name: '🎤 Karaoke (Vocal Suppression)', value: 'karaoke' },
        { name: '〰️ Tremolo (Pulsing Volume)', value: 'tremolo' },
        { name: '🌊 Vibrato (Pitch Wobble)', value: 'vibrato' },
        { name: '📻 Low Pass / Muffled Chill', value: 'lowpass' },
        { name: '🎵 Pop Equalizer', value: 'pop' },
        { name: '🎸 Rock Equalizer', value: 'rock' },
        { name: '🎛️ Electronic Equalizer', value: 'electronic' },
        { name: '❌ Clear All Effects (Lossless Studio Default)', value: 'clear' }
      ]
    }
  ],
  async execute(interaction) {
    const preset = interaction.options.getString('preset');
    try {
      const result = await musicManager.setFilter(interaction.guildId, preset);
      const active = musicManager.getActiveFilters(interaction.guildId);

      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('🎛️ Audio Effect Processor')
        .setDescription(result.active
          ? `✅ **Applied:** \`${result.name}\`\nAudio DSP filters updated in real-time with zero latency.`
          : `🔄 **Updated:** \`${result.name}\``)
        .addFields(
          { name: 'Currently Active Effects', value: active.length > 0 ? active.map(f => `• ${f}`).join('\n') : '_None (Studio Flat / Lossless)_', inline: false }
        )
        .setFooter({ text: 'VePlexity Native DSP Audio Engine' });

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      return interaction.editReply(`❌ Filter Error: ${err.message}`);
    }
  }
};

// ─── 10. /seek COMMAND ───────────────────────────────────────────────────────
export const seek = {
  name: 'seek',
  description: 'Jump to a specific timestamp in the current track',
  options: [
    {
      name: 'position',
      description: 'Timestamp to jump to (e.g. 1:30 or seconds: 90)',
      type: 3, // STRING
      required: true
    }
  ],
  async execute(interaction) {
    const position = interaction.options.getString('position');
    try {
      const formatted = await musicManager.seek(interaction.guildId, position);
      return interaction.editReply(`⏩ Jumped to **${formatted}**.`);
    } catch (err) {
      return interaction.editReply(`❌ Seek Error: ${err.message}`);
    }
  }
};

// ─── 11. /library COMMAND ────────────────────────────────────────────────────
export const library = {
  name: 'library',
  description: 'Explore the local 24-bit FLAC master library catalog',
  options: [
    {
      name: 'search',
      description: 'Search for specific song titles or artists in the library',
      type: 3,
      required: false
    }
  ],
  async execute(interaction) {
    const search = interaction.options.getString('search');
    localLibrary.scan();
    const total = localLibrary.getTotalCount();
    const songs = localLibrary.search(search || '', 15);

    const desc = songs.length > 0
      ? songs.map((s, i) => `**${i + 1}.** 🎵 **${s.title}** — \`${s.author}\` [${s.format} • ${s.sizeMb}MB]`).join('\n')
      : search ? `_No songs found matching "${search}"._` : '_No songs currently in the library folder._';

    const embed = buildEmbed('Studio Master Library', '💽', 0x9b59b6, [
      { name: 'Total Tracks Indexed', value: `**${total}** studio tracks available`, inline: true },
      { name: 'Storage Location', value: `\`${localLibrary.musicDir}\``, inline: true },
      { name: search ? `Search Results ("${search}")` : 'Featured Tracks', value: desc, inline: false },
      { name: '💡 How to Play', value: 'Use `/play song:<title>` and select any track from the instant autocomplete list!', inline: false }
    ]);
    return interaction.editReply({ embeds: [embed] });
  }
};
