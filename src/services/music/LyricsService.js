// 📜 LIVE LYRICS ENGINE (Zero-Key LRCLIB Integration)
// Supports synced and plain lyrics for any song

export class LyricsService {
  /**
   * Cleans YouTube video titles to extract clean track and artist names
   */
  cleanTitle(title) {
    if (!title) return '';
    return title
      .replace(/\[.*?\]/g, '') // remove brackets [Official Music Video]
      .replace(/\(.*?\)/g, '') // remove parentheses (Official HD Video)
      .replace(/ft\..*|feat\..*/i, '') // remove ft. artist
      .replace(/official\s*(music)?\s*(video|audio|lyrics?)/gi, '')
      .replace(/4k|1080p|60fps|remastered|hd/gi, '')
      .replace(/\|.*$/g, '')
      .replace(/-.*$/g, '') // remove trailing dash phrases if present
      .trim();
  }

  /**
   * Fetch lyrics from LRCLIB
   */
  async getLyrics({ title, artist, duration } = {}) {
    const cleanTitle = this.cleanTitle(title);
    const searchQueries = [
      `${cleanTitle} ${artist || ''}`.trim(),
      cleanTitle,
      title
    ].filter(Boolean);

    for (const query of searchQueries) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const url = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const results = await res.json();
          if (Array.isArray(results) && results.length > 0) {
            // Find best match with lyrics
            const match = results.find(r => r.plainLyrics || r.syncedLyrics) || results[0];
            if (match && (match.plainLyrics || match.syncedLyrics)) {
              let text = match.plainLyrics;
              if (!text && match.syncedLyrics) {
                // Strip timestamps like [00:12.34]
                text = match.syncedLyrics.replace(/\[\d{2}:\d{2}\.\d{2,3}\]\s*/g, '');
              }
              return {
                title: match.trackName || title,
                artist: match.artistName || artist || 'Unknown Artist',
                album: match.albumName || null,
                lyrics: text?.trim() || null,
                synced: match.syncedLyrics || null
              };
            }
          }
        }
      } catch (e) {
        // Continue to next query fallback
      }
    }

    return null;
  }
}

export const lyricsService = new LyricsService();
export default lyricsService;
