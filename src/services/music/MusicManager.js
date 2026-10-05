import { LavalinkManager, EQList } from 'lavalink-client';
import localLibrary from './LocalLibrary.js';
import streamResolver from './StreamResolver.js';
import { createProgressBar, formatMs, formatSeconds } from '../../utils/helpers.js';

class MusicManager {
  constructor() {
    this.client = null;
    this.lavalink = new LavalinkManager({
      nodes: [
        {
          authorization: process.env.LAVALINK_PASSWORD || 'V33r',
          host: '127.0.0.1',
          port: 2333,
          id: 'main'
        }
      ],
      sendToShard: (guildId, payload) => this.client?.guilds?.cache?.get(guildId)?.shard?.send(payload),
      client: {
        id: process.env.CLIENT_ID || '1470533218376613908',
        username: 'VePlexity'
      },
      autoSkip: true,
      playerOptions: {
        defaultSearchPlatform: 'ytsearch',
        onDisconnect: { autoReconnect: true, destroyPlayer: false },
        onEmptyQueue: { destroyAfterMs: 60000 }
      }
    });

    this.setupListeners();
  }

  init(discordClient) {
    this.client = discordClient;
    this.lavalink.init({
      id: discordClient.user.id,
      username: discordClient.user.username
    });
    console.log('[MusicManager] Initialized with client ID:', discordClient.user.id);
  }

  setupListeners() {
    this.lavalink.nodeManager.on('connect', (node) => {
      console.log(`[Lavalink] ✅ Connected to audio node: ${node.id}`);
    });

    this.lavalink.nodeManager.on('error', (node, err) => {
      console.error(`[Lavalink] ❌ Node ${node.id} error:`, err.message);
    });

    this.lavalink.on('trackStart', (player, track) => {
      console.log(`[Lavalink] 🔊 trackStart on guild ${player.guildId}: ${track.info.title}`);
      player.set('lastTrack', track);
      if (player.textChannelId && this.client) {
        const channel = this.client.channels.cache.get(player.textChannelId);
        if (channel) {
          const isLocal = track.info.sourceName === 'local';
          const tag = isLocal ? '📁 [24-bit FLAC]' : '🌐 [YouTube]';
          channel.send(`🎶 Now playing: **${track.info.title}** by **${track.info.author}** ${tag}`).catch(() => null);
        }
      }
    });

    this.lavalink.on('queueEnd', async (player) => {
      console.log(`[Lavalink] ⏹️ Queue ended on guild ${player.guildId}`);
      if (player.get('autoplay')) {
        const lastTrack = player.get('lastTrack');
        if (lastTrack && lastTrack.info) {
          try {
            console.log(`[Autoplay] Finding radio track related to: ${lastTrack.info.title}`);
            const query = `ytsearch:${lastTrack.info.author} popular music`;
            const res = await this.lavalink.search({ query, source: 'youtube' }, player.node);
            if (res?.tracks?.length > 0) {
              const candidate = res.tracks.find(t => t.info.title.toLowerCase() !== lastTrack.info.title.toLowerCase()) || res.tracks[0];
              if (candidate) {
                await player.queue.add(candidate);
                await player.play();
                if (player.textChannelId && this.client) {
                  const channel = this.client.channels.cache.get(player.textChannelId);
                  channel?.send(`📻 **Endless Radio:** Auto-queued **${candidate.info.title}** by **${candidate.info.author}** ✨`).catch(() => null);
                }
              }
            }
          } catch (e) {
            console.error('[Autoplay Error]', e.message);
          }
        }
      }
    });

    this.lavalink.on('playerError', (player, error) => {
      console.error(`[Lavalink] ❌ Player error on guild ${player.guildId}:`, error);
    });
  }

  getPlayer(guildId) {
    return this.lavalink.getPlayer(guildId) || null;
  }

  getOrCreatePlayer(guildId, voiceChannelId, textChannelId) {
    let player = this.lavalink.getPlayer(guildId);
    if (!player) {
      player = this.lavalink.createPlayer({
        guildId,
        voiceChannelId,
        textChannelId,
        selfDeaf: true,
        volume: 100
      });
    } else {
      if (voiceChannelId) player.voiceChannelId = voiceChannelId;
      if (textChannelId) player.textChannelId = textChannelId;
    }
    return player;
  }

  getQueue(guildId) {
    const player = this.getPlayer(guildId);
    if (!player) return null;

    return {
      player,
      isPlaying: player.playing,
      isPaused: player.paused,
      current: player.queue.current ? {
        title: player.queue.current.info.title,
        author: player.queue.current.info.author,
        url: player.queue.current.info.uri,
        sourceUrl: player.queue.current.info.uri,
        duration: formatSeconds(Math.round(player.queue.current.info.length / 1000)),
        requestedBy: player.queue.current.requester
      } : null,
      tracks: (player.queue.tracks || []).map(t => ({
        title: t.info.title,
        author: t.info.author,
        url: t.info.uri,
        sourceUrl: t.info.uri,
        duration: formatSeconds(Math.round(t.info.length / 1000)),
        requestedBy: t.requester
      })),
      repeatMode: player.repeatMode || 'off',
      pause: () => player.pause(),
      resume: () => player.resume(),
      skip: () => player.skip(),
      stop: () => player.destroy(),
      setVolume: (level) => player.setVolume(level),
      seek: (positionInput) => this.seek(guildId, positionInput)
    };
  }

  async play(interaction, query) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.editReply('❌ You must join a voice channel first.');
    }

    try {
      const player = this.getOrCreatePlayer(interaction.guildId, voiceChannel.id, interaction.channelId);

      if (!player.connected) {
        await player.connect();
      }

      const clean = (query || '').trim();
      let res = null;

      // 1. Check local FLAC master audio library
      const songById = localLibrary.getSongById(clean);
      const songByPath = localLibrary.getSongByPath(clean);
      const isLocalPrefix = clean.toLowerCase().startsWith('local:') || clean.toLowerCase().startsWith('flac:');

      if (songById) {
        res = await player.search({ query: songById.filePath, source: 'local' }, interaction.user);
      } else if (songByPath) {
        res = await player.search({ query: songByPath.filePath, source: 'local' }, interaction.user);
      } else if (isLocalPrefix) {
        const cleanLocal = clean.replace(/^(local|flac):/i, '').trim();
        const matches = localLibrary.search(cleanLocal, 1);
        if (matches.length > 0) {
          res = await player.search({ query: matches[0].filePath, source: 'local' }, interaction.user);
        }
      } else if (!clean.startsWith('http')) {
        // High-confidence local match
        const localMatches = localLibrary.search(clean, 1);
        if (localMatches.length > 0 && localMatches[0].title.toLowerCase() === clean.toLowerCase()) {
          res = await player.search({ query: localMatches[0].filePath, source: 'local' }, interaction.user);
        }
      }

      // 2. Official YouTube / Web stream via Lavalink OAuth
      if (!res || !res.tracks?.length) {
        const ytQuery = clean.replace(/^(yt|youtube):/i, '').trim() || clean;
        res = await player.search({ query: ytQuery }, interaction.user);
      }

      if (!res || !res.tracks?.length) {
        return interaction.editReply(`❌ No results found for: \`${query}\``);
      }

      if (res.loadType === 'playlist') {
        await player.queue.add(res.tracks);
        if (!player.playing && !player.paused) await player.play();
        return interaction.editReply(`🎶 Enqueued playlist **${res.playlist?.title || 'Playlist'}** with **${res.tracks.length}** tracks!`);
      } else {
        const track = res.tracks[0];
        const isQueueEmpty = player.queue.tracks.length === 0 && !player.queue.current;
        await player.queue.add(track);

        if (!player.playing && !player.paused) {
          await player.play();
        }

        const isLocal = track.info.sourceName === 'local';
        const tag = isLocal ? '📁 [24-bit FLAC]' : '🌐 [YouTube]';
        if (isQueueEmpty) {
          return interaction.editReply(`🎶 Now playing: **${track.info.title}** by **${track.info.author}** ${tag}`);
        } else {
          return interaction.editReply(`📝 Enqueued (#${player.queue.tracks.length}): **${track.info.title}** ${tag}`);
        }
      }
    } catch (err) {
      console.error('[MusicManager] Play command error:', err);
      return interaction.editReply(`❌ Playback error: ${err.message || 'Could not connect to voice channel'}`).catch(() => {});
    }
  }

  async seek(guildId, positionInput) {
    const player = this.getPlayer(guildId);
    if (!player || !player.queue.current) throw new Error('Nothing is currently playing.');

    let seconds = 0;
    if (typeof positionInput === 'string' && positionInput.includes(':')) {
      const parts = positionInput.split(':').map(Number);
      if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
      else if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else {
      seconds = parseInt(positionInput, 10);
    }

    if (isNaN(seconds) || seconds < 0) {
      throw new Error('Invalid time format. Use seconds (e.g. `90`) or `mm:ss` (e.g. `1:30`).');
    }
    const ms = seconds * 1000;
    const maxMs = player.queue.current.info.length || 0;
    if (ms > maxMs) {
      throw new Error(`Cannot seek past track end (${formatSeconds(Math.round(maxMs / 1000))}).`);
    }

    await player.seek(ms);
    return formatSeconds(seconds);
  }

  async setFilter(guildId, preset) {
    const player = this.getPlayer(guildId);
    if (!player) throw new Error('No active music player in this server. Use `/play` first!');

    switch (preset.toLowerCase()) {
      case '8d': {
        const next = !player.filterManager.filters.rotation;
        await player.filterManager.toggleRotation(0.2);
        return { name: '🎧 8D Audio (Binaural Rotation)', active: next };
      }
      case 'bass_low': {
        await player.filterManager.setEQ(EQList.BassboostLow);
        return { name: '🔊 Bass Boost - Subtle (+5dB)', active: true };
      }
      case 'bass_medium': {
        await player.filterManager.setEQ(EQList.BassboostMedium);
        return { name: '🔊 Bass Boost - Medium (+10dB)', active: true };
      }
      case 'bass_high': {
        await player.filterManager.setEQ(EQList.BassboostHigh);
        return { name: '🔊 Bass Boost - Heavy (+15dB)', active: true };
      }
      case 'bass_extreme': {
        await player.filterManager.setEQ(EQList.BassboostEarrape);
        return { name: '💥 Bass Boost - Extreme (Ear-Rape)', active: true };
      }
      case 'nightcore': {
        const next = !player.filterManager.filters.nightcore;
        await player.filterManager.toggleNightcore();
        return { name: '⚡ Nightcore (Speed & Pitch Up)', active: next };
      }
      case 'vaporwave': {
        const next = !player.filterManager.filters.vaporwave;
        await player.filterManager.toggleVaporwave();
        return { name: '🌸 Vaporwave (Slow & Lo-Fi)', active: next };
      }
      case 'karaoke': {
        const next = !player.filterManager.filters.karaoke;
        await player.filterManager.toggleKaraoke();
        return { name: '🎤 Karaoke (Vocal Suppression)', active: next };
      }
      case 'tremolo': {
        const next = !player.filterManager.filters.tremolo;
        await player.filterManager.toggleTremolo(4, 0.75);
        return { name: '〰️ Tremolo (Volume Oscillation)', active: next };
      }
      case 'vibrato': {
        const next = !player.filterManager.filters.vibrato;
        await player.filterManager.toggleVibrato(4, 0.75);
        return { name: '🌊 Vibrato (Pitch Wobble)', active: next };
      }
      case 'lowpass': {
        const next = !player.filterManager.filters.lowPass;
        await player.filterManager.toggleLowPass(20);
        return { name: '📻 Low Pass / Muffled Chill', active: next };
      }
      case 'pop': {
        await player.filterManager.setEQ(EQList.Pop);
        return { name: '🎵 Pop Equalizer', active: true };
      }
      case 'rock': {
        await player.filterManager.setEQ(EQList.Rock);
        return { name: '🎸 Rock Equalizer', active: true };
      }
      case 'electronic': {
        await player.filterManager.setEQ(EQList.Electronic);
        return { name: '🎛️ Electronic Equalizer', active: true };
      }
      case 'clear':
      case 'reset': {
        await player.filterManager.resetFilters();
        return { name: 'All Audio Effects Cleared (Studio Lossless)', active: false };
      }
      default:
        throw new Error(`Unknown audio effect: ${preset}`);
    }
  }

  getActiveFilters(guildId) {
    const player = this.getPlayer(guildId);
    if (!player) return [];
    const active = [];
    if (player.filterManager?.filters?.rotation) active.push('🎧 8D Audio');
    if (player.filterManager?.filters?.nightcore) active.push('⚡ Nightcore');
    if (player.filterManager?.filters?.vaporwave) active.push('🌸 Vaporwave');
    if (player.filterManager?.filters?.karaoke) active.push('🎤 Karaoke');
    if (player.filterManager?.filters?.tremolo) active.push('〰️ Tremolo');
    if (player.filterManager?.filters?.vibrato) active.push('🌊 Vibrato');
    if (player.filterManager?.filters?.lowPass) active.push('📻 Low Pass');
    if (player.filterManager?.equalizerBands?.length > 0) active.push('🔊 EQ / Bass Boost');
    return active;
  }

  toggleAutoplay(guildId) {
    const player = this.getPlayer(guildId);
    if (!player) return false;
    const current = !!player.get('autoplay');
    player.set('autoplay', !current);
    return !current;
  }

  isAutoplay(guildId) {
    const player = this.getPlayer(guildId);
    return !!player?.get('autoplay');
  }

  getNowPlayingDisplay(guildId) {
    const player = this.getPlayer(guildId);
    if (!player || !player.queue.current) return null;

    const track = player.queue.current;
    const currentMs = player.position || 0;
    const totalMs = track.info.length || 0;
    const bar = createProgressBar(currentMs, totalMs, 18);
    const activeFilters = this.getActiveFilters(guildId);

    return {
      title: track.info.title,
      author: track.info.author,
      duration: formatSeconds(Math.round(totalMs / 1000)),
      currentFormatted: formatMs(currentMs),
      totalFormatted: formatMs(totalMs),
      progressBar: bar,
      url: track.info.uri,
      thumbnail: track.info.artworkUrl || null,
      requestedBy: track.requester,
      isPaused: player.paused,
      volume: player.volume,
      repeatMode: player.repeatMode || 'off',
      activeEffects: activeFilters.length > 0 ? activeFilters.join(', ') : 'None (Studio Flat)',
      isAutoplay: !!player.get('autoplay'),
      is247: false
    };
  }
}

export const musicManager = new MusicManager();
export default musicManager;

