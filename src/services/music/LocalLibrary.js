import fs from 'fs';
import path from 'path';

class LocalLibraryService {
  constructor() {
    this.musicDir = this.resolveMusicDir();
    this.songs = [];
    this.isScanning = false;
    this.lastScanned = 0;
    this.scan();
  }

  resolveMusicDir() {
    if (process.env.LOCAL_MUSIC_DIR && fs.existsSync(process.env.LOCAL_MUSIC_DIR)) {
      return path.resolve(process.env.LOCAL_MUSIC_DIR);
    }
    // Check ~/music on Linux or %USERPROFILE%\music on Windows
    const homeDir = process.env.HOME || process.env.USERPROFILE || '.';
    const homeMusic = path.join(homeDir, 'music');
    if (fs.existsSync(homeMusic)) {
      return homeMusic;
    }
    // Local project music directory fallback
    const localMusic = path.resolve('./music');
    if (!fs.existsSync(localMusic)) {
      try { fs.mkdirSync(localMusic, { recursive: true }); } catch (e) {}
    }
    return localMusic;
  }

  /**
   * Scan the music directory recursively for audio files (.flac, .mp3, .wav, .m4a, .ogg)
   */
  scan() {
    if (this.isScanning) return;
    this.isScanning = true;

    try {
      if (!fs.existsSync(this.musicDir)) {
        fs.mkdirSync(this.musicDir, { recursive: true });
      }

      const files = this.scanDirRecursive(this.musicDir);
      const audioExts = new Set(['.flac', '.mp3', '.wav', '.m4a', '.ogg', '.aac', '.alac']);
      const parsedSongs = [];

      for (const filePath of files) {
        const ext = path.extname(filePath).toLowerCase();
        if (!audioExts.has(ext)) continue;

        const baseName = path.basename(filePath, ext);
        const stats = fs.statSync(filePath);
        const sizeMb = (stats.size / 1024 / 1024).toFixed(1);

        // Parse "Artist - Title" or "Title" format
        let artist = 'Local Studio Library';
        let title = baseName;

        if (baseName.includes(' - ')) {
          const parts = baseName.split(' - ');
          artist = parts[0].trim();
          title = parts.slice(1).join(' - ').trim();
        } else if (baseName.includes('_-_')) {
          const parts = baseName.split('_-_');
          artist = parts[0].replace(/_/g, ' ').trim();
          title = parts.slice(1).join(' ').replace(/_/g, ' ').trim();
        }

        parsedSongs.push({
          id: `local_${parsedSongs.length + 1}`,
          title,
          author: artist,
          format: ext.replace('.', '').toUpperCase(),
          filePath,
          sizeMb,
          url: filePath,
          isLocal: true,
          duration: ext === '.flac' ? 'FLAC Lossless' : 'HD Studio Audio',
          durationSec: 210, // Default display placeholder
          thumbnail: 'https://cdn-icons-png.flaticon.com/512/3844/3844724.png'
        });
      }

      this.songs = parsedSongs;
      this.lastScanned = Date.now();
      console.log(`[LocalLibrary] Indexed ${this.songs.length} audio tracks from: ${this.musicDir}`);
    } catch (err) {
      console.error('[LocalLibrary] Scan error:', err.message);
    } finally {
      this.isScanning = false;
    }
  }

  scanDirRecursive(dir) {
    let results = [];
    try {
      const list = fs.readdirSync(dir, { withFileTypes: true });
      for (const dirent of list) {
        const fullPath = path.join(dir, dirent.name);
        if (dirent.isDirectory()) {
          results = results.concat(this.scanDirRecursive(fullPath));
        } else {
          results.push(fullPath);
        }
      }
    } catch (e) {}
    return results;
  }

  /**
   * Search songs by title, artist, or filename
   */
  search(query, limit = 10) {
    if (!query || !query.trim()) {
      return this.songs.slice(0, limit);
    }

    const clean = query.toLowerCase().trim().replace(/[_\-]+/g, ' ');
    const queryWords = clean.split(/\s+/).filter(w => w.length > 0);

    return this.songs
      .map(song => {
        const titleLower = song.title.toLowerCase();
        const authorLower = song.author.toLowerCase();
        const fullCombo = `${authorLower} ${titleLower} ${path.basename(song.filePath).toLowerCase()}`;
        let score = 0;

        // Exact matches
        if (titleLower === clean) score += 120;
        else if (titleLower.startsWith(clean)) score += 80;
        else if (titleLower.includes(clean)) score += 50;

        if (authorLower === clean) score += 90;
        else if (authorLower.startsWith(clean)) score += 60;
        else if (authorLower.includes(clean)) score += 40;

        if (fullCombo.includes(clean)) score += 70;

        // Multi-word token match (e.g. "Alan Walker On My Way")
        if (queryWords.length > 1) {
          const matchedWords = queryWords.filter(word => fullCombo.includes(word));
          if (matchedWords.length === queryWords.length) {
            score += 100;
          } else if (matchedWords.length > 0) {
            score += Math.round((matchedWords.length / queryWords.length) * 50);
          }
        }

        return { song, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.song)
      .slice(0, limit);
  }

  getSongById(id) {
    return this.songs.find(s => s.id === id) || null;
  }

  getSongByPath(filePath) {
    return this.songs.find(s => s.filePath === filePath) || null;
  }

  getAllSongs() {
    return this.songs;
  }

  getTotalCount() {
    return this.songs.length;
  }
}

export const localLibrary = new LocalLibraryService();
export default localLibrary;
