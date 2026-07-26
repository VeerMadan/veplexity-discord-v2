import { Player, QueryType } from 'discord-player';
import { Client, GatewayIntentBits } from 'discord.js';
import { YoutubeiExtractor } from 'discord-player-youtubei';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const player = new Player(client);

console.log('--- Testing ANDROID client, no cookie ---');

try {
    await player.extractors.register(YoutubeiExtractor, {
    streamOptions: { useClient: 'WEB' },
    cookie: cookieString,
    innertubeConfigRaw: { player_id: '0004de42' } // current known player id as of recent reports
}).catch(console.error);
    console.log('✅ Extractor registered');
} catch (e) {
    console.error('❌ Extractor registration failed:', e);
}

try {
    const result = await player.search('on my way', { searchEngine: QueryType.YOUTUBE_SEARCH });
    console.log('Tracks found:', result.tracks.length);
    if (result.tracks[0]) {
        console.log('First result:', result.tracks[0].title, '—', result.tracks[0].url);
    }
} catch (e) {
    console.error('❌ Search failed:', e);
}

process.exit(0);