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
        const playlist = await ytSearcher.getPlaylist(trimmed, { limit: 100 });
        if (playlist && playlist.videos?.length > 0) {
          return playlist.videos.map(v => ({
            title: v.title || 'Unknown Title',
            author: v.channel?.name || 'Unknown Artist',
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
          title: 'YouTube Track',
          author: 'Unknown Artist',
          url: trimmed,
          sourceUrl: trimmed,
          durationSec: 0,
          duration: '0:00',
          thumbnail: null,
          requestedBy
        }];
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

  async createAudioResource(streamUrl, volume = 1.0) {
    if (!this.ytDlp) {
      this.ytDlp = new YTDlp(BINARY_PATH);
    }

    const baseFlags = [
      '-f', 'ba/b',
      '--no-warnings',
      '--js-runtimes', 'node',
      '--extractor-args', 'youtube:player_client=android_music,android,tv_embedded'
    ];

    if (fs.existsSync(COOKIES_PATH)) {
      baseFlags.push('--cookies', COOKIES_PATH);
    }

    try {
      // 1. Extract direct googlevideo CDN stream URL using Android Music / TV Embedded clients
      const raw = await this.ytDlp.execPromise([
        streamUrl,
        '--get-url',
        ...baseFlags
      ]);
      const directUrl = raw.trim().split('\n')[0];
      if (directUrl && directUrl.startsWith('http')) {
        const resource = createAudioResource(directUrl, {
          inputType: StreamType.Arbitrary,
          inlineVolume: true
        });
        resource.volume?.setVolume(volume);
        return resource;
      }
    } catch (e) {
      console.log('[StreamResolver] Direct CDN URL extraction note:', e.message);
    }

    // 2. Fallback to child process execStream
    const flags = [
      streamUrl,
      '-o', '-',
      ...baseFlags
    ];

    const stream = this.ytDlp.execStream(flags);

    const resource = createAudioResource(stream, {
      inputType: StreamType.Arbitrary,
      inlineVolume: true
    });

    resource.volume?.setVolume(volume);
    resource._ytStream = stream;

    return resource;
  }
}

export const streamResolver = new StreamResolverService();
export default streamResolver;
