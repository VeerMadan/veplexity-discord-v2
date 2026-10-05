import YTDlpWrap from 'yt-dlp-wrap';
import { createAudioResource, StreamType } from '@discordjs/voice';
import spotifyUrlInfo from 'spotify-url-info';
import YouTube from 'youtube-sr';
import ffmpegStatic from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import fs from 'fs';
import path from 'path';
import { formatSeconds } from '../../utils/helpers.js';
import localLibrary from './LocalLibrary.js';

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
    this._searchCache = new Map();
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
    const cleanQuery = query.replace(/["\n\r]/g, ' ').trim();
    if (!cleanQuery) return [];

    const cacheKey = `${cleanQuery.toLowerCase()}:${limit}`;
    const cached = this._searchCache?.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 300000) {
      return cached.results;
    }

    // 1. Direct InnerTube API (Fastest: ~400-700ms, rock-solid, official metadata)
    try {
      const results = await this._searchInnerTube(cleanQuery, limit);
      if (results && results.length > 0) {
        if (!this._searchCache) this._searchCache = new Map();
        this._searchCache.set(cacheKey, { timestamp: Date.now(), results });
        return results;
      }
    } catch (itErr) {
      console.warn('[StreamResolver] InnerTube search error:', itErr.message);
    }

    // 2. youtube-sr fallback
    try {
      const videos = await ytSearcher.search(cleanQuery, { limit, type: 'video' });
      const results = (videos || []).map(v => ({
        id: v.id,
        title: v.title || 'Unknown Title',
        author: v.channel?.name || 'Unknown Artist',
        url: v.url || `https://www.youtube.com/watch?v=${v.id}`,
        durationSec: Math.round((v.duration || 0) / 1000),
        duration: v.durationFormatted || formatSeconds(Math.round((v.duration || 0) / 1000)),
        thumbnail: v.thumbnail?.url || null
      })).filter(t => t.url);

      if (results.length > 0) {
        if (!this._searchCache) this._searchCache = new Map();
        this._searchCache.set(cacheKey, { timestamp: Date.now(), results });
        return results;
      }
    } catch (srErr) {}

    // 3. Fast yt-dlp --print fallback (~1.6s)
    try {
      if (this.ytDlp) {
        const results = await this._searchYtDlpFast(cleanQuery, limit);
        if (results && results.length > 0) {
          if (!this._searchCache) this._searchCache = new Map();
          this._searchCache.set(cacheKey, { timestamp: Date.now(), results });
          return results;
        }
      }
    } catch (ytErr) {
      console.error('[StreamResolver] Fast yt-dlp search error:', ytErr.message);
    }

    return [];
  }

  async _searchInnerTube(query, limit = 10) {
    const url = 'https://www.youtube.com/youtubei/v1/search?prettyPrint=false';
    const body = {
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: '2.20240101.00.00',
          hl: 'en',
          gl: 'US'
        }
      },
      query: query
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(1800)
    });

    if (!res.ok) return [];
    const data = await res.json();
    const results = [];
    const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    for (const section of contents) {
      const items = section.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const v = item.videoRenderer;
        if (!v || !v.videoId) continue;
        const title = v.title?.runs?.map(r => r.text).join('') || v.title?.simpleText || 'Unknown';
        const author = v.ownerText?.runs?.map(r => r.text).join('') || v.shortBylineText?.runs?.map(r => r.text).join('') || 'Unknown Artist';
        const durationStr = v.lengthText?.simpleText || '';
        const thumb = v.thumbnail?.thumbnails?.[0]?.url || null;

        let sec = 0;
        if (durationStr) {
          const parts = durationStr.split(':').map(Number);
          if (parts.length === 3) sec = parts[0] * 3600 + parts[1] * 60 + parts[2];
          else if (parts.length === 2) sec = parts[0] * 60 + parts[1];
        }

        results.push({
          id: v.videoId,
          title,
          author,
          duration: durationStr || formatSeconds(sec),
          durationSec: sec,
          url: `https://www.youtube.com/watch?v=${v.videoId}`,
          thumbnail: thumb
        });
        if (results.length >= limit) break;
      }
      if (results.length >= limit) break;
    }
    return results;
  }

  async _searchYtDlpFast(query, limit = 10) {
    return new Promise((resolve) => {
      const proc = spawn(BINARY_PATH, [
        `ytsearch${limit}:${query}`,
        '--flat-playlist',
        '--print', '%(id)s§%(title)s§%(channel)s§%(duration)s',
        '--no-warnings',
        '--skip-download'
      ]);

      let stdout = '';
      const timer = setTimeout(() => {
        try { proc.kill(); } catch {}
        resolve([]);
      }, 2500);

      proc.stdout.on('data', d => { stdout += d.toString(); });
      proc.on('close', () => {
        clearTimeout(timer);
        const lines = stdout.trim().split('\n').filter(Boolean);
        const results = lines.map(line => {
          const [id, title, channel, duration] = line.split('§');
          const sec = Number(duration) || 0;
          return {
            id,
            title: title || 'Unknown',
            author: channel || 'Unknown Artist',
            duration: formatSeconds(sec),
            durationSec: sec,
            url: `https://www.youtube.com/watch?v=${id}`,
            thumbnail: null
          };
        }).filter(r => r.id);
        resolve(results);
      });
      proc.on('error', () => {
        clearTimeout(timer);
        resolve([]);
      });
    });
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

    // 0️⃣ LOCAL FLAC / STUDIO AUDIO LIBRARY
    // Check by song id first (e.g. local_123 from autocomplete)
    const songById = localLibrary.getSongById(trimmed);
    if (songById) {
      return [{
        title: songById.title,
        author: songById.author,
        searchQuery: songById.filePath,
        url: songById.filePath,
        sourceUrl: songById.filePath,
        filePath: songById.filePath,
        isLocal: true,
        durationSec: songById.durationSec || 210,
        duration: songById.duration || 'FLAC Lossless',
        thumbnail: songById.thumbnail,
        requestedBy
      }];
    }

    // Check by song path
    const songByPath = localLibrary.getSongByPath(trimmed);
    if (songByPath) {
      return [{
        title: songByPath.title,
        author: songByPath.author,
        searchQuery: songByPath.filePath,
        url: songByPath.filePath,
        sourceUrl: songByPath.filePath,
        filePath: songByPath.filePath,
        isLocal: true,
        durationSec: songByPath.durationSec || 210,
        duration: songByPath.duration || 'FLAC Lossless',
        thumbnail: songByPath.thumbnail,
        requestedBy
      }];
    }

    // Check exact filesystem path
    if (fs.existsSync(trimmed)) {
      const baseName = path.basename(trimmed, path.extname(trimmed));
      return [{
        title: baseName,
        author: 'Local Studio Library',
        searchQuery: trimmed,
        url: trimmed,
        sourceUrl: trimmed,
        filePath: trimmed,
        isLocal: true,
        durationSec: 210,
        duration: 'FLAC Lossless',
        thumbnail: 'https://cdn-icons-png.flaticon.com/512/3844/3844724.png',
        requestedBy
      }];
    }

    // 0.1 Explicit yt: or youtube: search prefix
    if (trimmed.toLowerCase().startsWith('yt:') || trimmed.toLowerCase().startsWith('youtube:')) {
      const cleanYt = trimmed.replace(/^(yt|youtube):/i, '').trim();
      const ytResults = await this.searchYouTube(cleanYt, 1);
      if (ytResults.length > 0) {
        const top = ytResults[0];
        return [{
          title: top.title,
          author: top.author,
          searchQuery: top.url,
          url: top.url,
          sourceUrl: top.url,
          durationSec: top.durationSec,
          duration: top.duration,
          thumbnail: top.thumbnail,
          requestedBy
        }];
      }
    }

    // 0.2 Explicit local: or flac: search prefix
    if (trimmed.toLowerCase().startsWith('local:') || trimmed.toLowerCase().startsWith('flac:')) {
      const cleanLocal = trimmed.replace(/^(local|flac):/i, '').trim();
      const localMatches = localLibrary.search(cleanLocal, 1);
      if (localMatches.length > 0) {
        const song = localMatches[0];
        return [{
          title: song.title,
          author: song.author,
          searchQuery: song.filePath,
          url: song.filePath,
          sourceUrl: song.filePath,
          filePath: song.filePath,
          isLocal: true,
          durationSec: song.durationSec || 210,
          duration: song.duration || '24-bit FLAC Studio Master',
          thumbnail: song.thumbnail,
          requestedBy
        }];
      }
    }

    // Check text search against local library if not a web URL
    if (!trimmed.startsWith('http')) {
      const localMatches = localLibrary.search(trimmed, 1);
      if (localMatches.length > 0) {
        const song = localMatches[0];
        return [{
          title: song.title,
          author: song.author,
          searchQuery: song.filePath,
          url: song.filePath,
          sourceUrl: song.filePath,
          filePath: song.filePath,
          isLocal: true,
          durationSec: song.durationSec || 210,
          duration: song.duration || '24-bit FLAC Studio Master',
          thumbnail: song.thumbnail,
          requestedBy
        }];
      }
    }

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
        searchQuery: top.url,
        url: top.url, sourceUrl: top.url,
        durationSec: top.durationSec, duration: top.duration,
        thumbnail: top.thumbnail, requestedBy
      }];
    }

    return [];
  }

  async getDirectStreamUrl(track) {
    if (track.filePath && fs.existsSync(track.filePath)) return track.filePath;
    if (track.isLocal && track.url && fs.existsSync(track.url)) return track.url;
    if (track.url && track.url.startsWith('http')) return track.url;
    if (track.sourceUrl && track.sourceUrl.startsWith('http')) return track.sourceUrl;
    if (track.searchQuery && track.searchQuery.startsWith('http')) return track.searchQuery;
    if (track.searchQuery) return `ytsearch1:${track.searchQuery}`;
    if (track.title) return `ytsearch1:${track.title} ${track.author || ''}`.trim();
    return null;
  }

  /**
   * Creates an AudioResource by:
   *  1. Direct FLAC / local studio library file OR extracting direct CDN audio URL via yt-dlp
   *  2. Spawning FFmpeg to decode and encode directly to high-bitrate Opus (320kbps) with SoX resampler
   *  3. Using -page_duration 20000 so each 20ms frame is delivered with zero buffer burst/stutter
   *  4. Feeding into @discordjs/voice as StreamType.OggOpus with zero Node.js CPU overhead
   */
  async createAudioResource(queryOrUrl, volume = 1.0, seekSec = 0) {
    if (!this.ytDlp) {
      this.ytDlp = new YTDlp(BINARY_PATH);
    }

    const clean = String(queryOrUrl).trim();
    const isLocal = fs.existsSync(clean) || (clean && !clean.startsWith('http') && fs.existsSync(path.resolve(clean)));

    let inputSource = null;
    let isHttp = false;

    if (isLocal) {
      inputSource = fs.existsSync(clean) ? clean : path.resolve(clean);
      console.log(`[StreamResolver] 🎵 Streaming local FLAC studio file: ${inputSource}`);
    } else {
      const sourceTarget = clean.startsWith('http') ? clean : (clean.startsWith('ytsearch') ? clean : `ytsearch1:${clean}`);
      console.log(`[StreamResolver] Extracting official audio URL for: ${sourceTarget.slice(0, 60)}`);
      const raw = await this.ytDlp.execPromise([
        sourceTarget, '-f', 'ba/b', '--get-url', '--no-warnings'
      ]);
      const audioUrl = raw.trim().split('\n')[0];

      if (!audioUrl || !audioUrl.startsWith('http')) {
        throw new Error(`Failed to extract audio URL from: ${sourceTarget}`);
      }
      inputSource = audioUrl;
      isHttp = true;
      console.log(`[StreamResolver] Got Official YouTube CDN URL: ${audioUrl.slice(0, 80)}...`);
    }

    const ffmpegArgs = [];

    if (isHttp) {
      ffmpegArgs.push(
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '5'
      );
    }

    if (seekSec > 0) {
      ffmpegArgs.push('-ss', String(seekSec));
    }

    ffmpegArgs.push(
      '-analyzeduration', '0',
      '-loglevel', 'error',
      '-i', inputSource
    );

    const filters = ['aresample=resampler=soxr:precision=28:osr=48000:cutoff=0.99'];
    if (volume !== 1.0 && volume > 0) {
      filters.push(`volume=${volume}`);
    }
    ffmpegArgs.push('-af', filters.join(','));

    ffmpegArgs.push(
      '-c:a', 'libopus',
      '-b:a', '320k',
      '-vbr', 'on',
      '-compression_level', '10',
      '-application', 'audio',
      '-frame_duration', '20',
      '-page_duration', '20000',
      '-f', 'opus',
      '-ar', '48000',
      '-ac', '2',
      'pipe:1'
    );

    const ffmpegProc = spawn(FFMPEG_CMD, ffmpegArgs, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    ffmpegProc.on('error', e => {
      console.error('[StreamResolver] ffmpeg process error:', e.message);
    });

    ffmpegProc.stderr.on('data', d => {
      const msg = d.toString().trim();
      if (msg) console.error('[StreamResolver] ffmpeg stderr:', msg);
    });

    const resource = createAudioResource(ffmpegProc.stdout, {
      inputType: StreamType.OggOpus,
      inlineVolume: false
    });

    resource._ffmpegProc = ffmpegProc;
    console.log(`[StreamResolver] AudioResource created (192kbps OggOpus, seek=${seekSec}s, vol=${volume})`);
    return resource;
  }
}

export const streamResolver = new StreamResolverService();
export default streamResolver;
