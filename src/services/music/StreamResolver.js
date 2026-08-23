import YTDlpWrap from 'yt-dlp-wrap';
import { createAudioResource, StreamType } from '@discordjs/voice';
import spotifyUrlInfo from 'spotify-url-info';
import YouTube from 'youtube-sr';
import ffmpegStatic from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import fs from 'fs';
import path from 'path';
import { formatSeconds } from '../../utils/helpers.js';

const YTDlp = YTDlpWrap.default || YTDlpWrap;
const ytSearcher = YouTube.default || YouTube;

const isWindows = process.platform === 'win32';
const BINARY_NAME = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
const BINARY_PATH = path.resolve(`./${BINARY_NAME}`);

const spotify = spotifyUrlInfo(fetch);

// Use system ffmpeg on Linux (installed via apt), ffmpeg-static on Windows
const FFMPEG_CMD = (!isWindows) ? 'ffmpeg' : (ffmpegStatic || 'ffmpeg');

class StreamResolverService {
  constructor() {
    this.ytDlp = null;
    this.initPromise = this.ensureBinary();
  }

  async ensureBinary() {
    try {
      if (!fs.existsSync(BINARY_PATH)) {
        console.log(`[StreamResolver] Downloading yt-dlp binary to ${BINARY_PATH}...`);
        await YTDlp.downloadFromGithub(BINARY_PATH);
        if (!isWindows) {
          try { fs.chmodSync(BINARY_PATH, 0o755); } catch (e) {
            console.error('[StreamResolver] chmod +x failed:', e);
          }
        }
        console.log('[StreamResolver] yt-dlp binary downloaded.');
      } else if (!isWindows) {
        try { fs.chmodSync(BINARY_PATH, 0o755); } catch {}
      }
      this.ytDlp = new YTDlp(BINARY_PATH);
      const version = await this.ytDlp.getVersion();
      console.log(`[StreamResolver] yt-dlp active version: ${version}`);
    } catch (err) {
      console.error('[StreamResolver] Binary init error:', err);
    }
  }

  async searchYouTube(query, limit = 10) {
    try {
      const cleanQuery = query.replace(/["\n\r]/g, ' ').trim();
      const videos = await ytSearcher.search(cleanQuery, { limit, type: 'video' });
      return videos.map(v => ({
        id: v.id,
        title: v.title || 'Unknown Title',
        author: v.channel?.name || 'Unknown Artist',
        url: v.url || `https://www.youtube.com/watch?v=${v.id}`,
        durationSec: Math.round((v.duration || 0) / 1000),
        duration: v.durationFormatted || formatSeconds(Math.round((v.duration || 0) / 1000)),
        thumbnail: v.thumbnail?.url || null
      })).filter(t => t.url);
    } catch (error) {
      console.error('[StreamResolver] Search error:', error.message);
      return [];
    }
  }

  isSpotifyUrl(url) {
    return /^https?:\/\/(open\.)?spotify\.com\/(track|album|playlist)/i.test(url);
  }

  isYouTubeUrl(url) {
    return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url);
  }

  isYouTubePlaylist(url) {
    return this.isYouTubeUrl(url) && (url.includes('list=') || url.includes('/playlist'));
  }

  async resolveTracks(query, requestedBy) {
    await this.initPromise;
    const trimmed = query.trim();

    // 1️⃣ SPOTIFY URL
    if (this.isSpotifyUrl(trimmed)) {
      try {
        if (/spotify\.com\/track\//i.test(trimmed)) {
          const data = await spotify.getData(trimmed);
          const title = data.name || 'Unknown Title';
          const artist = data.artists?.map(a => a.name).join(', ') || 'Unknown Artist';
          const durationSec = Math.round((data.duration || 0) / 1000);
          return [{
            title, author: artist,
            searchQuery: `${title} ${artist}`,
            url: null, sourceUrl: trimmed, durationSec,
            duration: formatSeconds(durationSec),
            thumbnail: data.coverArt?.sources?.[0]?.url || null,
            requestedBy
          }];
        }
        if (/spotify\.com\/(album|playlist)\//i.test(trimmed)) {
          const tracks = await spotify.getTracks(trimmed);
          return tracks.map(t => {
            const title = t.name || 'Unknown Title';
            const artist = Array.isArray(t.artists) ? t.artists.map(a => a.name || a).join(', ') : (t.artist || 'Unknown Artist');
            const durationSec = Math.round((t.duration || t.duration_ms || 0) / 1000);
            return {
              title, author: artist,
              searchQuery: `${title} ${artist}`,
              url: null, sourceUrl: trimmed, durationSec,
              duration: formatSeconds(durationSec),
              thumbnail: null, requestedBy
            };
          });
        }
      } catch (e) {
        console.error('[StreamResolver] Spotify resolution error:', e);
      }
    }

    // 2️⃣ YOUTUBE PLAYLIST
    if (this.isYouTubePlaylist(trimmed)) {
      try {
        const playlist = await ytSearcher.getPlaylist(trimmed, { limit: 100 });
        if (playlist && playlist.videos?.length > 0) {
          return playlist.videos.map(v => ({
            title: v.title || 'Unknown Title',
            author: v.channel?.name || 'Unknown Artist',
            searchQuery: `${v.title} ${v.channel?.name || ''}`.trim(),
            url: v.url || `https://www.youtube.com/watch?v=${v.id}`,
            sourceUrl: v.url || `https://www.youtube.com/watch?v=${v.id}`,
            durationSec: Math.round((v.duration || 0) / 1000),
            duration: v.durationFormatted || formatSeconds(Math.round((v.duration || 0) / 1000)),
            thumbnail: v.thumbnail?.url || null,
            requestedBy
          })).filter(t => t.url);
        }
      } catch (e) {
        console.error('[StreamResolver] YouTube playlist error:', e);
      }
    }

    // 3️⃣ YOUTUBE DIRECT VIDEO URL
    if (this.isYouTubeUrl(trimmed)) {
      try {
        const video = await ytSearcher.getVideo(trimmed);
        if (video) {
          return [{
            title: video.title || 'Unknown Title',
            author: video.channel?.name || 'Unknown Artist',
            searchQuery: `${video.title} ${video.channel?.name || ''}`.trim(),
            url: video.url || trimmed,
            sourceUrl: video.url || trimmed,
            durationSec: Math.round((video.duration || 0) / 1000),
            duration: video.durationFormatted || formatSeconds(Math.round((video.duration || 0) / 1000)),
            thumbnail: video.thumbnail?.url || null,
            requestedBy
          }];
        }
      } catch (e) {
        console.error('[StreamResolver] YouTube video info error:', e);
        return [{
          title: 'YouTube Track', author: 'Unknown Artist',
          searchQuery: trimmed, url: trimmed, sourceUrl: trimmed,
          durationSec: 0, duration: '0:00', thumbnail: null, requestedBy
        }];
      }
    }

    // 4️⃣ SEARCH QUERY
    const searchResults = await this.searchYouTube(trimmed, 1);
    if (searchResults.length > 0) {
      const top = searchResults[0];
      return [{
        title: top.title, author: top.author,
        searchQuery: `${top.title} ${top.author}`.trim(),
        url: top.url, sourceUrl: top.url,
        durationSec: top.durationSec, duration: top.duration,
        thumbnail: top.thumbnail, requestedBy
      }];
    }

    return [];
  }

  async getDirectStreamUrl(track) {
    if (track.searchQuery) return track.searchQuery;
    if (track.title) return `${track.title} ${track.author || ''}`.trim();
    if (track.url) return track.url;
    return null;
  }

  /**
   * Creates an AudioResource by:
   *  1. Using yt-dlp to extract the direct CDN audio URL (no piping raw bytes)
   *  2. Spawning system ffmpeg to stream that URL and output 48kHz stereo PCM
   *  3. Feeding ffmpeg's PCM stdout into @discordjs/voice as StreamType.Raw
   *
   * This avoids all intermediate pipe/prism-media issues.
   */
  async createAudioResource(queryOrUrl, volume = 1.0) {
    if (!this.ytDlp) {
      this.ytDlp = new YTDlp(BINARY_PATH);
    }

    const clean = String(queryOrUrl).trim();
    const sourceTarget = clean.startsWith('http') ? clean : `scsearch1:${clean}`;

    // ── Step 1: Extract the direct CDN audio URL ──────────────────────
    console.log(`[StreamResolver] Extracting audio URL for: ${sourceTarget.slice(0, 60)}`);
    const raw = await this.ytDlp.execPromise([
      sourceTarget, '-f', 'ba/b', '--get-url', '--no-warnings'
    ]);
    const audioUrl = raw.trim().split('\n')[0];

    if (!audioUrl || !audioUrl.startsWith('http')) {
      throw new Error(`Failed to extract audio URL from: ${sourceTarget}`);
    }
    console.log(`[StreamResolver] Got CDN URL: ${audioUrl.slice(0, 80)}...`);

    // ── Step 2: Spawn system ffmpeg to stream URL → 48kHz PCM stdout ─
    //    -reconnect flags keep the HTTP stream alive on network hiccups.
    //    Input options (-analyzeduration, -loglevel) come BEFORE -i.
    //    Output options (-f, -ar, -ac) come AFTER -i.
    const ffmpegProc = spawn(FFMPEG_CMD, [
      '-reconnect',        '1',
      '-reconnect_streamed', '1',
      '-reconnect_delay_max', '5',
      '-analyzeduration',  '0',
      '-loglevel',         '0',
      '-i',                audioUrl,
      '-f',                's16le',
      '-ar',               '48000',
      '-ac',               '2',
      'pipe:1'
    ], { stdio: ['pipe', 'pipe', 'pipe'] });

    ffmpegProc.on('error', e => {
      console.error('[StreamResolver] ffmpeg process error:', e.message);
    });
    ffmpegProc.stderr.on('data', d => {
      const msg = d.toString().trim();
      if (msg) console.error('[StreamResolver] ffmpeg stderr:', msg);
    });

    // ── Step 3: Create Discord AudioResource from PCM stdout ─────────
    const resource = createAudioResource(ffmpegProc.stdout, {
      inputType: StreamType.Raw,
      inlineVolume: true
    });

    resource.volume?.setVolume(volume);
    resource._ffmpegProc = ffmpegProc;

    console.log('[StreamResolver] AudioResource created from ffmpeg PCM stream');
    return resource;
  }
}

export const streamResolver = new StreamResolverService();
export default streamResolver;
