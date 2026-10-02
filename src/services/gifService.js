// 🎬 DYNAMIC CONTEXTUAL GIF RESOLVER & REACTION ENGINE

const CURATED_GIFS = {
  laugh: [
    'https://media.giphy.com/media/10hO3rDNqqJ2y4/giphy.gif',
    'https://media.giphy.com/media/26n6Gx9moCgs1qxxt/giphy.gif',
    'https://media.giphy.com/media/3oEjHAUOqG3lSS0f1C/giphy.gif',
    'https://media.giphy.com/media/11mwI67GLeMvgA/giphy.gif'
  ],
  roast: [
    'https://media.giphy.com/media/ro08ZmQ1MeqZypzgDN/giphy.gif', // Emotional damage
    'https://media.giphy.com/media/cF7QqO5DYdft6/giphy.gif',      // Supa hot fire
    'https://media.giphy.com/media/AiqLB6aghXEDm/giphy.gif',      // Burn explosion
    'https://media.giphy.com/media/pQmWjYrz39YAg/giphy.gif'
  ],
  smirk: [
    'https://media.giphy.com/media/B9rJsTkqAglb2/giphy.gif',
    'https://media.giphy.com/media/y0NFayaBeiWEU/giphy.gif',
    'https://media.giphy.com/media/DURbX7oesHiaA/giphy.gif',
    'https://media.giphy.com/media/8fen5LSZcHQ5O/giphy.gif'
  ],
  flirt: [
    'https://media.giphy.com/media/B9rJsTkqAglb2/giphy.gif',
    'https://media.giphy.com/media/y0NFayaBeiWEU/giphy.gif',
    'https://media.giphy.com/media/OpfkuToK5gvBQ8Kj3a/giphy.gif',
    'https://media.giphy.com/media/M90mJvfWfd5mbUuULX/giphy.gif',
    'https://media.giphy.com/media/11rI9SX0U2Z2Bl/giphy.gif'
  ],
  crying: [
    'https://media.giphy.com/media/ROF8OQvDmxRxK/giphy.gif',
    'https://media.giphy.com/media/L95W4wv8nnb9K/giphy.gif',
    'https://media.giphy.com/media/d2lcHJTG5Tscg/giphy.gif',
    'https://media.giphy.com/media/BEob50R0OQ5797EGvz/giphy.gif'
  ],
  angry: [
    'https://media.giphy.com/media/11tTNkNy1SdXGg/giphy.gif',
    'https://media.giphy.com/media/l1J9u3TZfpmeDLkD6/giphy.gif',
    'https://media.giphy.com/media/NTY1kHmcLsCsg/giphy.gif',
    'https://media.giphy.com/media/3o9bJX4O9ShW1L32eY/giphy.gif'
  ],
  shocked: [
    'https://media.giphy.com/media/tfUW8mhiFk8NlJhgEh/giphy.gif',
    'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
    'https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif',
    'https://media.giphy.com/media/PUBxelPJlRf0cAJs79/giphy.gif'
  ],
  facepalm: [
    'https://media.giphy.com/media/3og0INyCmHlNylks9O/giphy.gif',
    'https://media.giphy.com/media/WrNfErAnGV7Lm/giphy.gif',
    'https://media.giphy.com/media/XsUmnRyasLGlYYawnr/giphy.gif'
  ],
  dance: [
    'https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/giphy.gif',
    'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif',
    'https://media.giphy.com/media/13fR00PIYwb7Gg/giphy.gif'
  ],
  confused: [
    'https://media.giphy.com/media/FcuiZUneg1Sty/giphy.gif',
    'https://media.giphy.com/media/lkdH8FmImcGoyChmUC/giphy.gif',
    'https://media.giphy.com/media/g01ZnwAUvutuK8GIQn/giphy.gif'
  ],
  popcorn: [
    'https://media.giphy.com/media/gl0mkIZOW6Nwc/giphy.gif',
    'https://media.giphy.com/media/u5BzptR1OTZ04/giphy.gif'
  ],
  bye: [
    'https://media.giphy.com/media/Ru9sLV2Yjwaw8/giphy.gif',
    'https://media.giphy.com/media/m9eG1qVjvNINHg2Qw3/giphy.gif'
  ]
};

const NEKOS_MAP = {
  laugh: 'laugh',
  smirk: 'smug',
  flirt: 'blush',
  crying: 'cry',
  dance: 'dance',
  facepalm: 'facepalm',
  bye: 'wave',
  angry: 'pout',
  shocked: 'stare'
};

const OTAKU_MAP = {
  laugh: 'laugh',
  smirk: 'smug',
  flirt: 'kiss',
  crying: 'cry',
  dance: 'dance',
  confused: 'confused',
  shocked: 'shocked',
  angry: 'slap'
};

class GifService {
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
   * Determine appropriate gif category based on tag, user prompt, reply text, and active persona
   */
  detectCategory({ tag, text = '', prompt = '', mode = 'default' }) {
    if (tag && CURATED_GIFS[tag]) return tag;
    if (tag && NEKOS_MAP[tag]) return tag;

    const combined = `${prompt} ${text}`.toLowerCase();

    if (/haha|lmao|lol|rofl|😂|🤣|haste|funny|joke|chutkule|hehu/i.test(combined)) return 'laugh';
    if (/aukat|chutiya|burn|roasted|destroyed|cook|bhadwe|loser|clown|🤡|gand|bakwas/i.test(combined)) return 'roast';
    if (/darling|baby|janu|sweetheart|sexy|gorgeous|beautiful|cutie|flirt|kiss|hottie|bedroom|lips|love|attractive/i.test(combined)) return 'flirt';
    if (/smirk|chaalaak|clever|shana|sly|sus|smug|😏/i.test(combined)) return 'smirk';
    if (/gussa|angry|rage|shut up|hat|chup|pagal|teri maa|chup kar/i.test(combined)) return 'angry';
    if (/ro mat|cry|sad|dard|dukh|pain|rona|tears|sed|😭|😢|depressed/i.test(combined)) return 'crying';
    if (/what\b|kya\?!|omg|shocked|are you serious|wait what|damn|😱|😳|unbelievable/i.test(combined)) return 'shocked';
    if (/facepalm|bruh|cringe|idiot|bewakoof|🤦|dimaag kharab/i.test(combined)) return 'facepalm';
    if (/dance|party|masti|nach|vibing|celebrate|groove|💃|🕺/i.test(combined)) return 'dance';
    if (/confused|samajh nahi|pata nahi|huh|wat|kya bol/i.test(combined)) return 'confused';
    if (/lafda|drama|fight|popcorn|ladai/i.test(combined)) return 'popcorn';
    if (/bye|tata|alvida|goodnight|gn|ja raha|see you/i.test(combined)) return 'bye';

    // Persona-based fallback
    if (mode === 'savage') return Math.random() > 0.5 ? 'roast' : 'smirk';
    if (mode === 'flirty') return 'flirt';
    if (mode === 'chill') return 'dance';
    return Math.random() > 0.5 ? 'laugh' : 'smirk';
  }

  /**
   * Fetch a GIF for a detected category (trying live APIs first, falling back to curated pool)
   */
  async fetchGif(category) {
    // 1. Try Nekos.best API
    const nekosAction = NEKOS_MAP[category];
    if (nekosAction) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1800);
        const res = await fetch(`https://nekos.best/api/v2/${nekosAction}`, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          if (data.results?.[0]?.url) return data.results[0].url;
        }
      } catch (e) {}
    }

    // 2. Try OtakuGIFs API
    const otakuAction = OTAKU_MAP[category];
    if (otakuAction) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1800);
        const res = await fetch(`https://api.otakugifs.xyz/gif?reaction=${otakuAction}`, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          if (data.url) return data.url;
        }
      } catch (e) {}
    }

    // 3. Fallback to curated high-quality GIFs pool
    const pool = CURATED_GIFS[category] || CURATED_GIFS.laugh;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /**
   * Main method: Decide randomly whether to send a GIF and return URL or null
   */
  async getGifForContext({ text = '', prompt = '', mode = 'default', tag = null, chance = 0.40 } = {}) {
    // If explicit tag was sent by AI, elevate probability to 80%
    const threshold = tag ? 0.80 : chance;
    if (Math.random() > threshold) {
      return null;
    }

    const category = this.detectCategory({ tag, text, prompt, mode });
    const url = await this.fetchGif(category);
    return { url, category };
  }
}

export const gifService = new GifService();
export default gifService;
