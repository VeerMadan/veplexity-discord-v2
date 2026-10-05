import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import musicManager from '../../services/music/MusicManager.js';
import streamResolver from '../../services/music/StreamResolver.js';
import localLibrary from '../../services/music/LocalLibrary.js';
import { buildEmbed } from '../../utils/embeds.js';

export const music = {
  name: 'music',
  description: 'Lossless FLAC studio music library player and queue controller',
  options: [
    {
      name: 'play',
      description: 'Play a track from your 400 FLAC studio library or online',
      type: 1, // SUB_COMMAND
      options: [
        {
          name: 'song',
          description: 'Song name or artist from your library (autocomplete available)',
          type: 3,
          required: true,
          autocomplete: true
        }
      ]
    },
    {
      name: 'library',
      description: 'Explore the local FLAC studio library and view song catalog',
      type: 1,
      options: [
        {
          name: 'search',
          description: 'Search for specific songs or artists in the library',
          type: 3,
          required: false
        }
      ]
    },
    {
      name: 'pause',
      description: 'Pause current audio playback',
      type: 1
    },
    {
      name: 'resume',
      description: 'Resume paused audio playback',
      type: 1
    },
    {
      name: 'skip',
      description: 'Skip the current track',
      type: 1
    },
    {
      name: 'stop',
      description: 'Stop playback, clear queue, and leave voice channel',
      type: 1
    },
    {
      name: 'queue',
      description: 'Display current music playback queue',
      type: 1
    },
    {
      name: 'nowplaying',
      description: 'Show details about the currently playing track',
      type: 1
    },
    {
      name: 'volume',
      description: 'Adjust audio playback volume',
      type: 1,
      options: [
        { name: 'level', description: 'Volume level (0-150)', type: 4, required: true, minValue: 0, maxValue: 150 }
      ]
    }
  ],

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const query = (focused || '').trim();

    // 1. Search local studio library first
    const localMatches = localLibrary.search(query, 15);
    const suggestions = localMatches.map(song => ({
      name: `🎵 ${song.title} - ${song.author} [${song.format}]`.slice(0, 100),
      value: song.id || song.title.slice(0, 100)
    }));

    if (suggestions.length >= 10 || (query.length < 3 && suggestions.length > 0)) {
      return interaction.respond(suggestions.slice(0, 25)).catch(() => {});
    }

    // 2. Fallback to online search if local results are few and query length >= 3
    if (query.length >= 3 && !query.startsWith('http')) {
      try {
        const ytResults = await streamResolver.searchYouTube(query, 5);
        for (const t of ytResults) {
          if (suggestions.length < 25) {
            suggestions.push({
              name: `🌐 ${t.title} - ${t.author}`.slice(0, 100),
              value: t.url.slice(0, 100)
            });
          }
        }
      } catch (e) {}
    }

    return interaction.respond(suggestions.slice(0, 25)).catch(() => {});
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (sub === 'play') {
      const query = interaction.options.getString('song');
      return musicManager.play(interaction, query);
    }

    if (sub === 'library') {
      const search = interaction.options.getString('search');
      localLibrary.scan(); // Refresh scan in case new songs were uploaded
      const total = localLibrary.getTotalCount();
      const songs = localLibrary.search(search || '', 15);

      const desc = songs.length > 0
        ? songs.map((s, i) => `**${i + 1}.** 🎵 **${s.title}** — \`${s.author}\` [${s.format} • ${s.sizeMb}MB]`).join('\n')
        : search ? `_No songs found matching "${search}"._` : '_No songs currently in the library folder._';

      const embed = buildEmbed('Studio Audio Library', '💽', 0x9b59b6, [
        { name: 'Total Tracks Indexed', value: `**${total}** studio tracks available`, inline: true },
        { name: 'Storage Location', value: `\`${localLibrary.musicDir}\``, inline: true },
        { name: search ? `Search Results ("${search}")` : 'Featured Tracks', value: desc, inline: false },
        { name: '💡 How to Play', value: 'Use `/music play song:<title>` and pick any song from the instant autocomplete list!', inline: false }
      ]);
      return interaction.editReply({ embeds: [embed] });
    }

    if (sub === 'pause') {
      const queue = musicManager.getQueue(guildId);
      if (!queue || !queue.isPlaying) return interaction.editReply('❌ Nothing is playing right now.');
      if (queue.isPaused) return interaction.editReply('⏸️ Playback is already paused.');
      queue.pause();
      return interaction.editReply('⏸️ Playback paused.');
    }

    if (sub === 'resume') {
      const queue = musicManager.getQueue(guildId);
      if (!queue) return interaction.editReply('❌ Nothing to resume.');
      if (!queue.isPaused) return interaction.editReply('▶️ Already playing.');
      queue.resume();
      return interaction.editReply('▶️ Resumed audio playback.');
    }

    if (sub === 'skip') {
      const queue = musicManager.getQueue(guildId);
      if (!queue || !queue.current) return interaction.editReply('❌ Nothing is currently playing to skip.');
      const title = queue.current.title;
      queue.skip();
      return interaction.editReply(`⏭️ Skipped: **${title}**`);
    }

    if (sub === 'stop') {
      const queue = musicManager.getQueue(guildId);
      if (!queue) return interaction.editReply('❌ Nothing is playing.');
      queue.stop();
      return interaction.editReply('⏹️ Stopped playback and cleared queue.');
    }

    if (sub === 'queue') {
      const q = musicManager.getQueue(guildId);
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

    if (sub === 'nowplaying') {
      const info = musicManager.getNowPlayingDisplay(guildId);
      if (!info) return interaction.editReply('❌ Nothing is playing right now.');

      const embed = buildEmbed('Now Playing', '🎶', 0x3498db, [
        { name: 'Track', value: `**${info.title}**`, inline: false },
        { name: 'Artist / Author', value: info.author, inline: true },
        { name: 'Requested By', value: `<@${info.requestedBy?.id}>`, inline: true },
        { name: 'Audio Quality', value: info.duration.includes('FLAC') ? '💎 FLAC 48kHz Lossless' : '🔊 Studio Stereo', inline: true },
        { name: 'Progress', value: `\`${info.currentFormatted}\` ${info.progressBar} \`${info.totalFormatted}\``, inline: false },
        { name: 'Settings', value: `🔊 Volume: **${info.volume}%** | 🔁 Loop: **${info.repeatMode}**`, inline: false }
      ]);

      if (info.thumbnail) {
        embed.setThumbnail(info.thumbnail);
      }

      return interaction.editReply({ embeds: [embed] });
    }

    if (sub === 'volume') {
      const queue = musicManager.getQueue(guildId);
      if (!queue) return interaction.editReply('❌ I need to be connected and playing first.');
      const level = interaction.options.getInteger('level');
      queue.setVolume(level);
      return interaction.editReply(`🔊 Volume set to **${level}%**.`);
    }
  }
};
