import YTDlpWrap from 'yt-dlp-wrap';
import { createAudioResource, StreamType } from '@discordjs/voice';
import spotifyUrlInfo from 'spotify-url-info';
import YouTube from 'youtube-sr';
import fs from 'fs';
import path from 'path';
import { formatSeconds } from '../../utils/helpers.js';

const YTDlp = YTDlpWrap.default || YTDlpWrap;
const ytSearcher = YouTube.default || YouTube;

const isWindows = process.platform === 'win32';
const BINARY_NAME = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
const BINARY_PATH = path.resolve(`./${BINARY_NAME}`);
const COOKIES_PATH = path.resolve('./cookies.txt');

const spotify = spotifyUrlInfo(fetch);

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
          try {
            fs.chmodSync(BINARY_PATH, 0o755);
          } catch (e) {
            console.error('[StreamResolver] Failed to set chmod +x on yt-dlp:', e);
          }
        }
        console.log('[StreamResolver] yt-dlp binary downloaded successfully.');
      } else {
        if (!isWindows) {
          try {
            fs.chmodSync(BINARY_PATH, 0o755);
          } catch (e) {}
        }
      }
      this.ytDlp = new YTDlp(BINARY_PATH);
      const version = await this.ytDlp.getVersion();
      console.log(`[StreamResolver] yt-dlp active version: ${version}`);
    } catch (err) {
      console.error('[StreamResolver] Binary init error:', err);
    }
  }

  getBaseFlags() {
    const flags = [
      '--no-warnings',
      '--js-runtimes', 'node',
      '--extractor-args', 'youtube:player_client=android,ios,web'
    ];
    if (fs.existsSync(COOKIES_PATH)) {
      flags.push('--cookies', COOKIES_PATH);
    }
    return flags;
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
      }));
    } catch (error) {
      console.error('[StreamResolver] youtube-sr search error, fallback to yt-dlp:', error.message);
      try {
        await this.initPromise;
        const flags = [
          `ytsearch${limit}:${query}`,
          '--dump-single-json',
          '--flat-playlist',
          ...this.getBaseFlags()
        ];
        const raw = await this.ytDlp.execPromise(flags);
        const data = JSON.parse(raw);
        const entries = data.entries || [];
        return entries.map(item => ({
          id: item.id,
          title: item.title || 'Unknown Title',
          author: item.uploader || item.channel || 'Unknown Artist',
          url: item.url || (item.id ? `https://www.youtube.com/watch?v=${item.id}` : null),
          durationSec: item.duration || 0,
          duration: formatSeconds(item.duration || 0),
          thumbnail: item.thumbnails?.[0]?.url || null
        })).filter(t => t.url);
      } catch (e2) {
        return [];
      }
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
            title,
            author: artist,
            searchQuery: `${title} ${artist} audio`,
            url: null,
            sourceUrl: trimmed,
            durationSec,
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
              title,
              author: artist,
              searchQuery: `${title} ${artist} audio`,
              url: null,
              sourceUrl: trimmed,
              durationSec,
              duration: formatSeconds(durationSec),
              thumbnail: null,
              requestedBy
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
        const flags = [
          trimmed,
          '--dump-single-json',
          '--flat-playlist',
          ...this.getBaseFlags()
        ];
        const raw = await this.ytDlp.execPromise(flags);
        const data = JSON.parse(raw);
        const entries = data.entries || [];
        return entries.map(item => ({
          title: item.title || 'Unknown Title',
          author: item.uploader || item.channel || 'Unknown Artist',
          url: item.url || (item.id ? `https://www.youtube.com/watch?v=${item.id}` : null),
          sourceUrl: item.url || (item.id ? `https://www.youtube.com/watch?v=${item.id}` : null),
          durationSec: item.duration || 0,
          duration: formatSeconds(item.duration || 0),
          thumbnail: item.thumbnails?.[0]?.url || null,
          requestedBy
        })).filter(t => t.url);
      } catch (e) {
        console.error('[StreamResolver] YouTube playlist error:', e);
      }
    }

    // 3️⃣ YOUTUBE DIRECT VIDEO URL
    if (this.isYouTubeUrl(trimmed)) {
      try {
        const flags = [
          trimmed,
          '--dump-single-json',
          '--no-playlist',
          ...this.getBaseFlags()
        ];
        const raw = await this.ytDlp.execPromise(flags);
        const data = JSON.parse(raw);
        return [{
          title: data.title || 'Unknown Title',
          author: data.uploader || data.channel || 'Unknown Artist',
          url: data.webpage_url || trimmed,
          sourceUrl: data.webpage_url || trimmed,
          durationSec: data.duration || 0,
          duration: formatSeconds(data.duration || 0),
          thumbnail: data.thumbnail || null,
          requestedBy
        }];
      } catch (e) {
        console.error('[StreamResolver] YouTube video info error:', e);
      }
    }

    // 4️⃣ SEARCH QUERY
    const searchResults = await this.searchYouTube(trimmed, 1);
    if (searchResults.length > 0) {
      const top = searchResults[0];
      return [{
        title: top.title,
        author: top.author,
        url: top.url,
        sourceUrl: top.url,
        durationSec: top.durationSec,
        duration: top.duration,
        thumbnail: top.thumbnail,
        requestedBy
      }];
    }

    return [];
  }

  async getDirectStreamUrl(track) {
    if (track.url) return track.url;
    if (track.searchQuery) {
      const results = await this.searchYouTube(track.searchQuery, 1);
      if (results.length > 0) {
        track.url = results[0].url;
        track.thumbnail ??= results[0].thumbnail;
        if (!track.durationSec && results[0].durationSec) {
          track.durationSec = results[0].durationSec;
          track.duration = results[0].duration;
        }
        return track.url;
      }
    }
    return null;
  }

  createAudioResource(streamUrl, volume = 1.0) {
    if (!this.ytDlp) {
      this.ytDlp = new YTDlp(BINARY_PATH);
    }
    const flags = [
      streamUrl,
      '-f', 'ba/b',
      '-o', '-',
      '--no-warnings'
    ];
    if (fs.existsSync(COOKIES_PATH)) {
      flags.push('--cookies', COOKIES_PATH);
    }

    const stream = this.ytDlp.execStream(flags);

    const resource = createAudioResource(stream, {
      inputType: StreamType.Arbitrary,
      inlineVolume: true
    });

    resource.volume?.setVolume(volume);
    resource._ytStream = stream; // track stream reference to destroy on skip/stop

    return resource;
  }
}

export const streamResolver = new StreamResolverService();
export default streamResolver;
