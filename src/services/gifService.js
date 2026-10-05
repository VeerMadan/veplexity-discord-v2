// 🎬 DYNAMIC CONTEXTUAL GIF RESOLVER & REACTION ENGINE
// Supports: Giphy API, Tenor v2 API, and zero-key Nekos.best (60+ live reaction categories)

const NEKOS_ENDPOINTS = [
  'lurk', 'shoot', 'sleep', 'clap', 'shrug', 'stare', 'wave', 'poke',
  'confused', 'smile', 'peck', 'wink', 'sip', 'blush', 'smug', 'tickle',
  'yeet', 'think', 'highfive', 'feed', 'wag', 'bite', 'teehee', 'shocked',
  'bleh', 'bored', 'nom', 'nya', 'yawn', 'facepalm', 'cuddle', 'kick',
  'happy', 'carry', 'hug', 'kabedon', 'baka', 'bonk', 'pat', 'angry',
  'spin', 'shake', 'run', 'nod', 'nope', 'kiss', 'dance', 'punch',
  'handshake', 'slap', 'cry', 'lappillow', 'pout', 'blowkiss', 'handhold',
  'salute', 'thumbsup', 'laugh', 'tableflip'
];

const ACTION_ENDPOINT_MAP = {
  hug: 'hug',
  kiss: 'kiss',
  slap: 'slap',
  pat: 'pat',
  bite: 'bite',
  tickle: 'tickle',
  cuddle: 'cuddle',
  poke: 'poke',
  bonk: 'smack',
  punch: 'punch',
  blush: 'blush',
  wink: 'wink',
  lick: 'lick',
  cry: 'cry',
  summon: 'stare',
  shoot: 'smack',
  yeet: 'punch',
  feed: 'nom',
  highfive: 'clap',
  handshake: 'handhold'
};

const SEMANTIC_KEYWORD_MAP = {
  roast: ['smug', 'slap', 'punch', 'laugh', 'evillaugh'],
  burn: ['smug', 'laugh', 'punch'],
  fire: ['smug', 'dance', 'cool'],
  laugh: ['laugh', 'smile', 'smug'],
  funny: ['laugh', 'smile'],
  joke: ['laugh', 'wink', 'smug'],
  flirt: ['blush', 'kiss', 'airkiss', 'wink', 'cuddle'],
  love: ['hug', 'kiss', 'cuddle', 'blush', 'love'],
  cute: ['blush', 'smile', 'cuddle', 'pat'],
  angry: ['mad', 'pout', 'punch'],
  mad: ['mad', 'slap', 'punch'],
  sad: ['cry', 'pout', 'sad'],
  cry: ['cry', 'sad'],
  shocked: ['surprised', 'stare', 'confused', 'woah'],
  wow: ['surprised', 'happy', 'smile', 'woah'],
  confused: ['confused', 'shrug', 'stare'],
  dance: ['dance', 'celebrate', 'happy'],
  party: ['dance', 'happy', 'clap', 'celebrate'],
  vibe: ['dance', 'smile', 'sip', 'cool'],
  bye: ['wave', 'run'],
  smug: ['smug', 'evillaugh'],
  facepalm: ['facepalm', 'no'],
  sleep: ['sleep', 'yawn', 'tired'],
  think: ['stare', 'confused'],
  yes: ['thumbsup', 'happy', 'yes', 'yay'],
  no: ['no', 'stop', 'shrug'],
  ratio: ['smug', 'laugh', 'evillaugh', 'facepalm'],
  win: ['thumbsup', 'celebrate', 'happy', 'yay'],
  cheers: ['cheers', 'sip', 'celebrate'],
  magic: ['stare', 'surprised', 'cool'],
  summon: ['stare', 'run', 'surprised'],
  popcorn: ['nom', 'smile', 'smug'],
  coinflip: ['surprised', 'happy', 'confused'],
  roll: ['roll', 'happy', 'yay'],
  rps: ['punch', 'smug', 'clap'],
  trivia: ['confused', 'stare', 'happy'],
  '8ball': ['confused', 'stare', 'smug'],
  iq: ['cool', 'smug', 'confused', 'facepalm'],
  simp: ['blush', 'drool', 'nosebleed', 'love'],
  howgay: ['dance', 'celebrate', 'blush']
};

const SAFE_FALLBACK_GIFS = {
  laugh: [
    'https://media.giphy.com/media/10hO3rDNqqJ2y4/giphy.gif',
    'https://media.giphy.com/media/26n6Gx9moCgs1qxxt/giphy.gif',
    'https://media.giphy.com/media/3oEjHAUOqG3lSS0f1C/giphy.gif'
  ],
  roast: [
    'https://media.giphy.com/media/ro08ZmQ1MeqZypzgDN/giphy.gif',
    'https://media.giphy.com/media/cF7QqO5DYdft6/giphy.gif',
    'https://media.giphy.com/media/AiqLB6aghXEDm/giphy.gif'
  ],
  flirt: [
    'https://media.giphy.com/media/B9rJsTkqAglb2/giphy.gif',
    'https://media.giphy.com/media/OpfkuToK5gvBQ8Kj3a/giphy.gif',
    'https://media.giphy.com/media/M90mJvfWfd5mbUuULX/giphy.gif'
  ],
  cry: [
    'https://media.giphy.com/media/ROF8OQvDmxRxK/giphy.gif',
    'https://media.giphy.com/media/L95W4wv8nnb9K/giphy.gif'
  ],
  default: [
    'https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/giphy.gif',
    'https://media.giphy.com/media/10hO3rDNqqJ2y4/giphy.gif'
  ]
};

const giphyCache = new Map(); // query -> { urls: string[], timestamp: number }

class GifService {
  /**
   * Search Giphy API (if GIPHY_API_KEY is configured in .env) with 15-min smart caching
   */
  async searchGiphy(query) {
    const apiKey = process.env.GIPHY_API_KEY?.replace(/['"]/g, '').trim();
    if (!apiKey) return null;

    const cacheKey = (query || '').toLowerCase().trim();
    const cached = giphyCache.get(cacheKey);
    const now = Date.now();

    // 15-minute cache hit: pick random from previous batch
    if (cached && (now - cached.timestamp < 15 * 60 * 1000) && cached.urls.length > 0) {
      return cached.urls[Math.floor(Math.random() * cached.urls.length)];
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const url = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=25&rating=pg-13`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.status === 429) {
        console.warn('[GIPHY] Rate limit reached (100 calls/hr). Falling back smoothly to OtakuGIFs/Nekos.');
        return null;
      }

      if (res.ok) {
        const data = await res.json();
        if (data.data?.length > 0) {
          const urls = data.data
            .map(item => item.images?.original?.url || item.images?.downsized?.url)
            .filter(Boolean);

          if (urls.length > 0) {
            giphyCache.set(cacheKey, { urls, timestamp: now });
            return urls[Math.floor(Math.random() * urls.length)];
          }
        }
      }
    } catch (e) {
      // Ignore network timeout and fall to next tier
    }
    return null;
  }

  /**
   * Search Tenor v2 API (if TENOR_API_KEY is configured in .env)
   */
  async searchTenor(query) {
    const apiKey = process.env.TENOR_API_KEY?.replace(/['"]/g, '').trim();
    if (!apiKey) return null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${apiKey}&limit=25`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data.results?.length > 0) {
          const item = data.results[Math.floor(Math.random() * data.results.length)];
          return item.media_formats?.gif?.url || null;
        }
      }
    } catch (e) {}
    return null;
  }

  /**
   * Fetch a dynamic anime reaction GIF from OtakuGIFs (46+ endpoints, accessible everywhere including cloud VMs)
   */
  async fetchOtakuGifs(endpoint) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`https://api.otakugifs.xyz/gif?reaction=${encodeURIComponent(endpoint)}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data.url) return data.url;
      }
    } catch (e) {}
    return null;
  }

  /**
   * Fetch a dynamic anime reaction GIF from Nekos.best (zero API key needed)
   */
  async fetchNekos(endpoint) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`https://nekos.best/api/v2/${endpoint}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data.results?.[0]?.url) {
          return data.results[0].url;
        }
      }
    } catch (e) {}
    return null;
  }

  /**
   * Universal GIF Search: Matches query dynamically across Giphy, Tenor, OtakuGIFs, and Nekos.best
   */
  async searchGif(query, fallbackCategory = 'laugh') {
    const cleanQuery = (query || '').trim();
    if (!cleanQuery) return this.getFallbackGif(fallbackCategory);

    // 1. Try Live Giphy Search (if key provided in .env)
    const giphyGif = await this.searchGiphy(cleanQuery);
    if (giphyGif) return giphyGif;

    // 2. Try Live Tenor Search (if key provided in .env)
    const tenorGif = await this.searchTenor(cleanQuery);
    if (tenorGif) return tenorGif;

    // 3. Dynamic Zero-Key Reaction Engines (OtakuGIFs & Nekos.best)
    const category = this.resolveSemanticCategory(cleanQuery, fallbackCategory);
    const otakuGif = await this.fetchOtakuGifs(category);
    if (otakuGif) return otakuGif;

    const nekosGif = await this.fetchNekos(category);
    if (nekosGif) return nekosGif;

    // 4. Safe fallback pool
    return this.getFallbackGif(category);
  }

  /**
   * Action / Roleplay GIF fetcher (for /hug, /kiss, /slap, /pat, /action, etc.)
   */
  async getActionGif(action) {
    const clean = (action || '').toLowerCase().trim();

    // If Giphy/Tenor key configured, search with 50% chance for variety
    if (process.env.GIPHY_API_KEY || process.env.TENOR_API_KEY) {
      if (Math.random() > 0.5) {
        const webGif = await this.searchGif(`anime ${clean}`);
        if (webGif) return webGif;
      }
    }

    const endpoint = ACTION_ENDPOINT_MAP[clean] || clean || 'hug';
    const otakuGif = await this.fetchOtakuGifs(endpoint);
    if (otakuGif) return otakuGif;

    const nekosGif = await this.fetchNekos(endpoint);
    if (nekosGif) return nekosGif;

    return this.getFallbackGif(clean);
  }

  /**
   * Resolve query string to appropriate Nekos.best category
   */
  resolveSemanticCategory(query, fallback = 'laugh') {
    const lower = (query || '').toLowerCase().trim();
    if (NEKOS_ENDPOINTS.includes(lower)) return lower;

    for (const [key, endpoints] of Object.entries(SEMANTIC_KEYWORD_MAP)) {
      if (lower.includes(key)) {
        return endpoints[Math.floor(Math.random() * endpoints.length)];
      }
    }

    return NEKOS_ENDPOINTS.includes(fallback) ? fallback : 'laugh';
  }

  /**
   * Fallback pool in case of network timeout
   */
  getFallbackGif(category = 'default') {
    const pool = SAFE_FALLBACK_GIFS[category] || SAFE_FALLBACK_GIFS.default;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /**
   * Extract any [gif: <category>] tag appended by AI and return clean text
   */
  extractGifTag(text) {
    if (!text) return { cleanText: text, tag: null };
    const match = text.match(/\[gif:\s*([a-zA-Z_-]+)\]/i);
    if (match) {
      const tag = match[1].toLowerCase().trim();
      const cleanText = text.replace(match[0], '').trim();
      return { cleanText, tag };
    }
    return { cleanText: text, tag: null };
  }

  /**
   * Main AI Chatbot contextual GIF selector
   */
  async getGifForContext({ text = '', prompt = '', mode = 'default', tag = null, chance = 0.40 } = {}) {
    const threshold = tag ? 0.85 : chance;
    if (Math.random() > threshold) {
      return null;
    }

    const searchQuery = tag || `${prompt} ${text}`;
    const url = await this.searchGif(searchQuery, mode === 'savage' ? 'smug' : 'laugh');
    return { url, category: tag || mode };
  }
}

export const gifService = new GifService();
export default gifService;
