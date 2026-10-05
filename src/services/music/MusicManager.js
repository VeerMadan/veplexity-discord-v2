import {
  joinVoiceChannel,
  createAudioPlayer,
  NoSubscriberBehavior,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection,
  generateDependencyReport
} from '@discordjs/voice';
import streamResolver from './StreamResolver.js';
import { createProgressBar, formatMs } from '../../utils/helpers.js';

// Log voice dependency report once at import time
console.log('[Voice] Dependency report:\n' + generateDependencyReport());

class GuildQueue {
  constructor(manager, guildId, voiceChannel, textChannel) {
    this.manager = manager;
    this.guildId = guildId;
    this.voiceChannel = voiceChannel;
    this.textChannel = textChannel;
    this.tracks = [];
    this.current = null;
    this.currentResource = null;
    this.volume = 1.0;
    this.repeatMode = 'off'; // 'off' | 'track' | 'queue'
    this.is247 = false;
    this.isPlaying = false;
    this.isPaused = false;
    this.startedAt = 0;
    this.pausedAt = 0;
    this.totalPausedDuration = 0;
    this.idleTimer = null;

    this.player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause,
        maxMissedFrames: 50
      }
    });
    this.connection = null;
    this.setupListeners();
  }

  setupListeners() {
    this.player.on(AudioPlayerStatus.Playing, () => {
      console.log(`[MusicQueue ${this.guildId}] 🔊 Player: PLAYING`);
    });

    this.player.on(AudioPlayerStatus.Buffering, () => {
      console.log(`[MusicQueue ${this.guildId}] ⏳ Player: BUFFERING`);
    });

    this.player.on(AudioPlayerStatus.AutoPaused, () => {
      console.log(`[MusicQueue ${this.guildId}] ⏸️ Player: AUTOPAUSED (no active voice subscriber yet)`);
    });

    this.player.on(AudioPlayerStatus.Idle, () => {
      console.log(`[MusicQueue ${this.guildId}] ⏹️ Player: IDLE`);
      this.isPlaying = false;
      this.cleanUpCurrentResource();

      if (this.current) {
        if (this.repeatMode === 'track') {
          this.tracks.unshift(this.current);
        } else if (this.repeatMode === 'queue') {
          this.tracks.push(this.current);
        }
      }

      this.current = null;
      this.playNext();
    });

    this.player.on('error', error => {
      console.error(`[MusicQueue ${this.guildId}] ❌ Player error:`, error.message);
      this.isPlaying = false;
      this.cleanUpCurrentResource();
      this.current = null;
      this.playNext();
    });
  }

  cleanUpCurrentResource() {
    if (this.currentResource?._ffmpegProc) {
      try {
        this.currentResource._ffmpegProc.stdout?.destroy();
        this.currentResource._ffmpegProc.stderr?.destroy();
        this.currentResource._ffmpegProc.kill('SIGKILL');
      } catch {}
    }
    if (this.currentResource?.playStream) {
      try { this.currentResource.playStream.destroy(); } catch {}
    }
    this.currentResource = null;
  }

  /**
   * Joins the voice channel and waits until the connection is fully Ready
   * before returning. This guarantees the UDP socket is open and audio
   * packets will actually reach Discord.
   */
  async connect() {
    // 1. If existing connection is already Ready, reuse it
    if (this.connection && this.connection.state?.status === VoiceConnectionStatus.Ready) {
      this.connection.subscribe(this.player);
      return this.connection;
    }

    // 2. Check global voice connection registry and reuse if healthy
    const existing = getVoiceConnection(this.guildId);
    if (existing && existing.state.status !== VoiceConnectionStatus.Destroyed) {
      this.connection = existing;
      if (existing.state.status === VoiceConnectionStatus.Ready) {
        this.connection.subscribe(this.player);
        return this.connection;
      }
      try {
        await entersState(this.connection, VoiceConnectionStatus.Ready, 10_000);
        this.connection.subscribe(this.player);
        return this.connection;
      } catch (e) {
        console.warn(`[MusicQueue ${this.guildId}] Existing connection failed to reach Ready, recreating.`);
        try { existing.destroy(); } catch {}
      }
    }

    console.log(`[MusicQueue ${this.guildId}] 🔌 Joining voice channel ${this.voiceChannel.id}...`);

    this.connection = joinVoiceChannel({
      channelId: this.voiceChannel.id,
      guildId: this.guildId,
      adapterCreator: this.voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false
    });

    this.connection.on('stateChange', (oldState, newState) => {
      console.log(`[MusicQueue ${this.guildId}] 🔗 Voice: ${oldState.status} → ${newState.status}`);
    });

    this.connection.on('debug', (msg) => {
      console.log(`[MusicQueue ${this.guildId}] [Voice Debug] ${msg}`);
    });

    this.connection.on('error', (err) => {
      console.error(`[MusicQueue ${this.guildId}] [Voice Error]`, err);
    });

    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(this.connection, VoiceConnectionStatus.Signalling, 5000),
          entersState(this.connection, VoiceConnectionStatus.Connecting, 5000),
        ]);
      } catch {
        if (!this.is247) this.destroy();
      }
    });

    try {
      await entersState(this.connection, VoiceConnectionStatus.Ready, 20_000);
      console.log(`[MusicQueue ${this.guildId}] ✅ Voice connection READY`);
    } catch (e) {
      const status = this.connection?.state?.status || 'unknown';
      console.warn(`[MusicQueue ${this.guildId}] ⚠️ Voice connection status after 20s: ${status}`);
    }

    if (this.connection && this.connection.state?.status !== VoiceConnectionStatus.Destroyed) {
      this.connection.subscribe(this.player);
      console.log(`[MusicQueue ${this.guildId}] 🎧 Player subscribed to voice connection`);
    }

    return this.connection;
  }

  async playNext(notify = true) {
    if (this.tracks.length === 0) {
      this.isPlaying = false;
      this.current = null;
      this.scheduleIdleDisconnect();
      return;
    }

    this.clearIdleDisconnect();
    const nextTrack = this.tracks.shift();
    this.current = nextTrack;

    try {
      // Ensure voice connection is Ready before we start streaming
      await this.connect();

      console.log(`[MusicQueue ${this.guildId}] ▶️ Streaming: ${nextTrack.title} by ${nextTrack.author}`);
      const streamQuery = await streamResolver.getDirectStreamUrl(nextTrack);
      if (!streamQuery) {
        this.textChannel?.send(`❌ Could not stream **${nextTrack.title}**, skipping...`).catch(() => null);
        return this.playNext();
      }

      this.currentResource = await streamResolver.createAudioResource(streamQuery, this.volume);
      this.player.play(this.currentResource);
      console.log(`[MusicQueue ${this.guildId}] 🚀 player.play() dispatched`);
      this.isPlaying = true;
      this.isPaused = false;
      this.startedAt = Date.now();
      this.pausedAt = 0;
      this.totalPausedDuration = 0;

      if (this.textChannel && notify) {
        this.textChannel.send(`🎶 Now playing: **${nextTrack.title}** by **${nextTrack.author}**`).catch(() => null);
      }
    } catch (err) {
      console.error(`[MusicQueue ${this.guildId}] Play error:`, err);
      this.textChannel?.send(`❌ Error playing **${nextTrack.title}**: ${err.message}`).catch(() => null);
      this.cleanUpCurrentResource();
      this.current = null;
      this.playNext();
    }
  }

  scheduleIdleDisconnect() {
    if (this.is247) return;
    this.clearIdleDisconnect();
    this.idleTimer = setTimeout(() => {
      if (!this.isPlaying && this.tracks.length === 0 && !this.is247) {
        this.textChannel?.send('👋 Disconnecting from voice channel due to inactivity.').catch(() => null);
        this.destroy();
      }
    }, 60000);
  }

  clearIdleDisconnect() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  getCurrentPlaybackMs() {
    if (!this.isPlaying || !this.startedAt) return 0;
    if (this.isPaused) {
      return (this.pausedAt - this.startedAt) - this.totalPausedDuration;
    }
    return (Date.now() - this.startedAt) - this.totalPausedDuration;
  }

  pause() {
    if (this.isPaused || !this.isPlaying) return false;
    const paused = this.player.pause();
    if (paused) {
      this.isPaused = true;
      this.pausedAt = Date.now();
    }
    return paused;
  }

  resume() {
    if (!this.isPaused) return false;
    const unpaused = this.player.unpause();
    if (unpaused) {
      this.isPaused = false;
      if (this.pausedAt) {
        this.totalPausedDuration += Date.now() - this.pausedAt;
        this.pausedAt = 0;
      }
    }
    return unpaused;
  }

  skip() {
    this.cleanUpCurrentResource();
    this.player.stop();
  }

  stop() {
    this.tracks = [];
    this.cleanUpCurrentResource();
    this.player.stop();
    if (!this.is247) {
      this.destroy();
    }
  }

  async setVolume(level) {
    this.volume = Math.max(0, Math.min(150, level)) / 100;
    if (this.currentResource?.volume) {
      this.currentResource.volume.setVolume(this.volume);
    } else if (this.isPlaying && this.current) {
      try {
        const seekSec = Math.max(0, Math.floor(this.getCurrentPlaybackMs() / 1000));
        const streamQuery = await streamResolver.getDirectStreamUrl(this.current);
        if (streamQuery) {
          this.cleanUpCurrentResource();
          this.currentResource = await streamResolver.createAudioResource(streamQuery, this.volume, seekSec);
          this.player.play(this.currentResource);
          console.log(`[MusicQueue ${this.guildId}] 🔊 Volume updated to ${Math.round(this.volume * 100)}% (re-streamed from ${seekSec}s)`);
        }
      } catch (err) {
        console.warn(`[MusicQueue ${this.guildId}] Volume hot-swap notice:`, err.message);
      }
    }
  }

  shuffle() {
    for (let i = this.tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
    }
  }

  destroy() {
    this.clearIdleDisconnect();
    this.cleanUpCurrentResource();
    this.tracks = [];
    this.current = null;
    this.isPlaying = false;
    this.isPaused = false;
    try {
      this.player.stop();
    } catch (e) {}

    const connection = getVoiceConnection(this.guildId) || this.connection;
    if (connection) {
      try {
        connection.destroy();
      } catch (e) {}
    }
    this.connection = null;
    this.manager.queues.delete(this.guildId);
  }
}

class MusicManager {
  constructor() {
    this.queues = new Map();
  }

  getQueue(guildId) {
    return this.queues.get(guildId) || null;
  }

  getOrCreateQueue(guildId, voiceChannel, textChannel) {
    let queue = this.queues.get(guildId);
    if (!queue) {
      queue = new GuildQueue(this, guildId, voiceChannel, textChannel);
      this.queues.set(guildId, queue);
    } else {
      if (voiceChannel) queue.voiceChannel = voiceChannel;
      if (textChannel) queue.textChannel = textChannel;
    }
    return queue;
  }

  async play(interaction, query) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.editReply('❌ You must join a voice channel first.');
    }

    try {
      const queue = this.getOrCreateQueue(interaction.guildId, voiceChannel, interaction.channel);

      const tracks = await streamResolver.resolveTracks(query, interaction.user);
      if (!tracks || tracks.length === 0) {
        return interaction.editReply(`❌ No results found for: \`${query}\``);
      }

      await queue.connect();

      if (tracks.length === 1) {
        const track = tracks[0];
        queue.tracks.push(track);
        if (!queue.isPlaying && !queue.isPaused) {
          queue.playNext(false);
          return interaction.editReply(`🎶 Now playing: **${track.title}** by **${track.author}** [${track.duration}]`);
        }
        return interaction.editReply(`📝 Enqueued (#${queue.tracks.length}): **${track.title}** (${track.duration})`);
      } else {
        queue.tracks.push(...tracks);
        if (!queue.isPlaying && !queue.isPaused) {
          queue.playNext(false);
        }
        return interaction.editReply(`🎶 Enqueued **${tracks.length}** tracks from playlist! First up: **${tracks[0].title}**`);
      }
    } catch (err) {
      console.error('[MusicManager] Play command error:', err);
      return interaction.editReply(`❌ Playback error: ${err.message || 'Could not connect to voice channel'}`).catch(() => {});
    }
  }

  getNowPlayingDisplay(guildId) {
    const queue = this.getQueue(guildId);
    if (!queue || !queue.current) return null;

    const track = queue.current;
    const currentMs = queue.getCurrentPlaybackMs();
    const totalMs = (track.durationSec || 0) * 1000;
    const bar = createProgressBar(currentMs, totalMs, 18);

    return {
      title: track.title,
      author: track.author,
      duration: track.duration,
      currentFormatted: formatMs(currentMs),
      totalFormatted: formatMs(totalMs),
      progressBar: bar,
      url: track.sourceUrl || track.url,
      thumbnail: track.thumbnail,
      requestedBy: track.requestedBy,
      isPaused: queue.isPaused,
      volume: Math.round(queue.volume * 100),
      repeatMode: queue.repeatMode,
      is247: queue.is247
    };
  }
}

export const musicManager = new MusicManager();
export default musicManager;
