import {
  joinVoiceChannel,
  createAudioPlayer,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection
} from '@discordjs/voice';
import streamResolver from './StreamResolver.js';
import { createProgressBar, formatMs } from '../../utils/helpers.js';

class GuildQueue {
  constructor(manager, guildId, voiceChannel, textChannel) {
    this.manager = manager;
    this.guildId = guildId;
    this.voiceChannel = voiceChannel;
    this.textChannel = textChannel;
    this.tracks = [];
    this.current = null;
    this.currentResource = null;
    this.volume = 1.0; // 100%
    this.repeatMode = 'off'; // 'off' | 'track' | 'queue'
    this.is247 = false;
    this.isPlaying = false;
    this.isPaused = false;
    this.startedAt = 0;
    this.pausedAt = 0;
    this.totalPausedDuration = 0;
    this.idleTimer = null;

    this.player = createAudioPlayer();
    this.connection = null;
    this.setupListeners();
  }

  setupListeners() {
    this.player.on(AudioPlayerStatus.Idle, () => {
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
      console.error(`[MusicQueue ${this.guildId}] Player error:`, error.message);
      this.isPlaying = false;
      this.cleanUpCurrentResource();
      this.current = null;
      this.playNext();
    });
  }

  cleanUpCurrentResource() {
    if (this.currentResource?._ytStream) {
      try {
        this.currentResource._ytStream.destroy();
      } catch (e) {}
    }
    this.currentResource = null;
  }

  async connect() {
    if (this.connection && this.connection.state.status !== VoiceConnectionStatus.Destroyed) {
      return this.connection;
    }

    this.connection = joinVoiceChannel({
      channelId: this.voiceChannel.id,
      guildId: this.guildId,
      adapterCreator: this.voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false
    });

    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(this.connection, VoiceConnectionStatus.Signalling, 5000),
          entersState(this.connection, VoiceConnectionStatus.Connecting, 5000),
        ]);
      } catch (error) {
        if (!this.is247) {
          this.destroy();
        }
      }
    });

    this.connection.subscribe(this.player);
    return this.connection;
  }

  async playNext() {
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
      const streamUrl = await streamResolver.getDirectStreamUrl(nextTrack);
      if (!streamUrl) {
        this.textChannel?.send(`❌ Could not stream **${nextTrack.title}**, skipping...`).catch(() => null);
        return this.playNext();
      }

      this.currentResource = await streamResolver.createAudioResource(streamUrl, this.volume);
      this.player.play(this.currentResource);
      this.isPlaying = true;
      this.isPaused = false;
      this.startedAt = Date.now();
      this.pausedAt = 0;
      this.totalPausedDuration = 0;

      if (this.textChannel) {
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
    }, 60000); // 1 minute idle timeout
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

  setVolume(level) {
    this.volume = Math.max(0, Math.min(150, level)) / 100;
    if (this.currentResource?.volume) {
      this.currentResource.volume.setVolume(this.volume);
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

    const queue = this.getOrCreateQueue(interaction.guildId, voiceChannel, interaction.channel);
    await queue.connect();

    const tracks = await streamResolver.resolveTracks(query, interaction.user);
    if (!tracks || tracks.length === 0) {
      return interaction.editReply(`❌ No results found for: \`${query}\``);
    }

    if (tracks.length === 1) {
      const track = tracks[0];
      queue.tracks.push(track);
      if (!queue.isPlaying && !queue.isPaused) {
        queue.playNext();
        return interaction.editReply(`🎶 Added to queue: **${track.title}** by **${track.author}**`);
      }
      return interaction.editReply(`📝 Enqueued (#${queue.tracks.length}): **${track.title}** (${track.duration})`);
    } else {
      queue.tracks.push(...tracks);
      if (!queue.isPlaying && !queue.isPaused) {
        queue.playNext();
      }
      return interaction.editReply(`🎶 Enqueued **${tracks.length}** tracks from playlist! First up: **${tracks[0].title}**`);
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
