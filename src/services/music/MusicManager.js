import { LavalinkManager } from 'lavalink-client';
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
      if (player.textChannelId && this.client) {
        const channel = this.client.channels.cache.get(player.textChannelId);
        if (channel) {
          const isLocal = track.info.sourceName === 'local';
          const tag = isLocal ? '📁 [24-bit FLAC]' : '🌐 [YouTube]';
          channel.send(`🎶 Now playing: **${track.info.title}** by **${track.info.author}** ${tag}`).catch(() => null);
        }
      }
    });

    this.lavalink.on('queueEnd', (player) => {
      console.log(`[Lavalink] ⏹️ Queue ended on guild ${player.guildId}`);
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
      setVolume: (level) => player.setVolume(level)
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

  getNowPlayingDisplay(guildId) {
    const player = this.getPlayer(guildId);
    if (!player || !player.queue.current) return null;

    const track = player.queue.current;
    const currentMs = player.position || 0;
    const totalMs = track.info.length || 0;
    const bar = createProgressBar(currentMs, totalMs, 18);

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
      is247: false
    };
  }
}

export const musicManager = new MusicManager();
export default musicManager;
