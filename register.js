import 'dotenv/config';
import { REST, Routes } from 'discord.js';

// Clean the variables just in case Azure added invisible quotes
const CLIENT_ID = process.env.CLIENT_ID?.replace(/['"]/g, '').trim();
const GUILD_ID = process.env.GUILD_ID?.replace(/['"]/g, '').trim();
const TOKEN = process.env.DISCORD_TOKEN?.replace(/['"]/g, '').trim();

const commands = [
  { name: 'test', description: 'Test command' },
  {
    name: 'warn',
    description: 'Warn a user',
    options: [
      { name: 'user', description: 'User to warn', type: 6, required: true },
      { name: 'reason', description: 'Reason for warning', type: 3, required: true },
    ],
  },
  {
    name: 'cases',
    description: 'View all cases of a user',
    options: [{ name: 'user', type: 6, required: true, description: 'User' }],
  },
  {
    name: 'case',
    description: 'View specific case',
    options: [{ name: 'id', type: 4, required: true, description: 'Case ID' }],
  },
  {
    name: 'ban',
    description: 'Ban a user',
    options: [
      { name: 'user', type: 6, required: true, description: 'User' },
      { name: 'reason', type: 3, required: false, description: 'Reason' },
    ],
  },
  {
    name: 'unban',
    description: 'Unban a user',
    options: [{ name: 'user', type: 3, required: true, description: 'User ID (paste it, they cannot be @mentioned since they left)' }],
  },
  {
    name: 'timeout',
    description: 'Timeout a user',
    options: [
      { name: 'user', type: 6, required: true, description: 'User' },
      {
        name: 'duration',
        type: 3,
        required: true,
        description: 'How long to timeout for',
        choices: [
          { name: '60 seconds', value: '60s' },
          { name: '5 minutes', value: '5m' },
          { name: '10 minutes', value: '10m' },
          { name: '30 minutes', value: '30m' },
          { name: '1 hour', value: '1h' },
          { name: '6 hours', value: '6h' },
          { name: '1 day', value: '1d' },
          { name: '1 week', value: '7d' },
        ],
      },
      { name: 'reason', type: 3, required: false, description: 'Reason' },
    ],
  },
  {
    name: 'kick',
    description: 'Kick a user',
    options: [
      { name: 'user', type: 6, required: true, description: 'User' },
      { name: 'reason', type: 3, required: false, description: 'Reason' },
    ],
  },
  {
    name: 'purge',
    description: 'Delete messages',
    options: [{ name: 'amount', type: 4, required: true, description: '1-1000' }],
  },
  { name: 'lock', description: 'Lock channel' },
  { name: 'unlock', description: 'Unlock channel' },
  {
    name: 'slowmode',
    description: 'Set slowmode',
    options: [{ name: 'seconds', type: 4, required: true, description: 'Seconds' }],
  },
  {
    name: 'userinfo',
    description: 'User info',
    options: [{ name: 'user', type: 6, required: true, description: 'User' }],
  },
  {
    name: 'pvc_warn',
    description: 'Warn user for PVC violation',
    options: [
      { name: 'user', type: 6, required: true, description: 'User' },
      { name: 'rule', type: 3, required: true, description: 'Rule' },
    ],
    choices: [
      { name: 'Joining private VC without permission', value: 'PVC1' },
      { name: 'Not leaving when asked', value: 'PVC2' },
      { name: 'Disturbing private conversation', value: 'PVC3' },
      { name: 'Abusive or offensive language', value: 'PVC4' },
      { name: 'Recording without consent', value: 'PVC5' },
    ]
  },
  {
    name: 'pvc_ban',
    description: 'Revoke private VC access',
    options: [
      { name: 'user', type: 6, required: true, description: 'User' },
      { name: 'rule', type: 3, required: true, description: 'Rule' },
    ],
  },
  {
    name: 'pvc_restore',
    description: 'Restore VC access',
    options: [{ name: 'user', type: 6, required: true, description: 'User' }],
  },
  {
    name: 'warnings',
    description: 'Check warnings',
    options: [{ name: 'user', type: 6, required: true, description: 'User' }],
  },
  {
    name: 'clearwarnings',
    description: 'Clear warnings',
    options: [{ name: 'user', type: 6, required: true, description: 'User' }],
  },
  {
    name: 'modlogs',
    description: 'Set mod logs channel',
    options: [{ name: 'channel', type: 7, required: true, description: 'Channel' }],
  },
  {
    name: 'play',
    description: 'Play music from YouTube/Spotify URL',
    options: [
      {
        name: 'query',
        type: 3,
        required: true,
        description: 'Song name or URL',
        autocomplete: true // 🔧 Enables the dropdown search menu
      },
    ],
  },
  { name: 'stop', description: 'Stop music and leave VC' },
  { name: 'skip', description: 'Skip song' },
  { name: 'nowplaying', description: 'Show the currently playing track' },
  { name: 'pause', description: 'Pause the current track' },
  { name: 'resume', description: 'Resume playback' },
  { name: 'queue', description: 'Show the current queue' },
  {
    name: 'volume',
    description: 'Set playback volume',
    options: [{ name: 'level', type: 4, required: true, description: 'Volume level, 0 to 150' }],
  },
  {
    name: 'loop',
    description: 'Set loop mode',
    options: [
      {
        name: 'mode',
        description: 'Loop mode to use',
        type: 3,
        required: true,
        choices: [
          { name: 'off', value: 'off' },
          { name: 'track', value: 'track' },
          { name: 'queue', value: 'queue' },
        ],
      },
    ],
  },
  { name: 'shuffle', description: 'Shuffle the queue' },
  {
    name: 'summon',
    description: 'Summon someone with a dramatic gif',
    options: [
      { name: 'user', description: 'User to summon', type: 6, required: true },
    ],
  },
  { name: 'connect', description: 'Connect the bot to your voice channel' },
  { name: 'disconnect', description: 'Disconnect the bot from voice channel' },
  { name: '247', description: 'Toggle 24/7 mode (bot stays connected in VC)' },
  {
    name: 'chatbot',
    description: 'Toggle AI chatbot mode — mention the bot to chat with it',
    options: [
      {
        name: 'mode',
        description: 'Turn on or off',
        type: 3,
        required: true,
        choices: [
          { name: 'on', value: 'on' },
          { name: 'off', value: 'off' }
        ]
      }
    ]
  },
  {
    name: '8ball',
    description: 'Ask the magic 8-ball a question',
    options: [{ name: 'question', description: 'Your question', type: 3, required: true }],
  },
  { name: 'coinflip', description: 'Flip a coin' },
  {
    name: 'roll',
    description: 'Roll a dice',
    options: [{ name: 'sides', description: 'Number of sides (default 6)', type: 4, required: false }],
  },
  {
    name: 'rps',
    description: 'Rock, paper, scissors against the bot',
    options: [
      {
        name: 'choice',
        description: 'Your move',
        type: 3,
        required: true,
        choices: [
          { name: 'rock', value: 'rock' },
          { name: 'paper', value: 'paper' },
          { name: 'scissors', value: 'scissors' },
        ],
      },
    ],
  },
  {
    name: 'ship',
    description: 'Calculate compatibility between two users',
    options: [
      { name: 'user1', description: 'First user', type: 6, required: true },
      { name: 'user2', description: 'Second user', type: 6, required: true },
    ],
  },
  {
    name: 'avatar',
    description: "Show a user's avatar",
    options: [{ name: 'user', description: 'User (defaults to you)', type: 6, required: false }],
  },
  {
    name: 'rate',
    description: 'Get a rating out of 10',
    options: [{ name: 'thing', description: 'What to rate', type: 3, required: true }],
  },
  {
    name: 'tictactoe',
    description: 'Challenge someone to Tic-Tac-Toe',
    options: [{ name: 'opponent', description: 'Who to challenge', type: 6, required: true }],
  },
  {
    name: 'connect4',
    description: 'Challenge someone to Connect 4',
    options: [{ name: 'opponent', description: 'Who to challenge', type: 6, required: true }],
  },
  {
    name: 'rpsduel',
    description: 'Challenge someone to Rock Paper Scissors',
    options: [{ name: 'opponent', description: 'Who to challenge', type: 6, required: true }],
  },
  { name: 'pat', description: 'Pat someone', options: [{ name: 'user', description: 'Who to pat', type: 6, required: true }] },
  { name: 'hug', description: 'Hug someone', options: [{ name: 'user', description: 'Who to hug', type: 6, required: true }] },
  { name: 'kiss', description: 'Kiss someone', options: [{ name: 'user', description: 'Who to kiss', type: 6, required: true }] },
  { name: 'slap', description: 'Slap someone', options: [{ name: 'user', description: 'Who to slap', type: 6, required: true }] },
  { name: 'bite', description: 'Bite someone', options: [{ name: 'user', description: 'Who to bite', type: 6, required: true }] },
  { name: 'tickle', description: 'Tickle someone', options: [{ name: 'user', description: 'Who to tickle', type: 6, required: true }] },
  { name: 'cuddle', description: 'Cuddle someone', options: [{ name: 'user', description: 'Who to cuddle', type: 6, required: true }] },
  { name: 'poke', description: 'Poke someone', options: [{ name: 'user', description: 'Who to poke', type: 6, required: true }] },
  { name: 'fact', description: 'Get a random fun fact' },
  { name: 'wyr', description: 'Get a random "would you rather" prompt' },
  { name: 'roast', description: 'Get an AI-generated roast', options: [{ name: 'user', description: 'Who to roast', type: 6, required: true }] },
  { name: 'compliment', description: 'Get an AI-generated compliment', options: [{ name: 'user', description: 'Who to compliment', type: 6, required: true }] },
  { name: 'emojify', description: 'Turn text into emoji letters', options: [{ name: 'text', description: 'Text to emojify', type: 3, required: true }] },
  { name: 'serverinfo', description: 'Show server info' },
  { name: 'roleinfo', description: 'Show role info', options: [{ name: 'role', description: 'Role to inspect', type: 8, required: true }] },
  { name: 'poll', description: 'Create a yes/no poll', options: [{ name: 'question', description: 'Poll question', type: 3, required: true }] },
  {
    name: 'remindme',
    description: 'Set a reminder',
    options: [
      { name: 'time', description: 'e.g. 10m, 1h, 2d', type: 3, required: true },
      { name: 'text', description: 'What to remind you about', type: 3, required: true },
    ],
  },
  {
    name: 'note',
    description: 'Add a private staff note about a user',
    options: [
      { name: 'user', description: 'User', type: 6, required: true },
      { name: 'text', description: 'Note text', type: 3, required: true },
    ],
  },
  { name: 'notes', description: "View a user's staff notes", options: [{ name: 'user', description: 'User', type: 6, required: true }] },
  {
    name: 'nickname',
    description: "Change a user's nickname",
    options: [
      { name: 'user', description: 'User', type: 6, required: true },
      { name: 'name', description: 'New nickname (leave blank to reset)', type: 3, required: false },
    ],
  },
  { name: 'lockdown', description: 'Lock all text channels' },
  { name: 'unlockdown', description: 'Unlock all text channels' },
  {
    name: 'masskick',
    description: 'Kick multiple users at once',
    options: [
      { name: 'users', description: 'Comma-separated user IDs', type: 3, required: true },
      { name: 'reason', description: 'Reason', type: 3, required: false },
    ],
  },
  {
    name: 'massban',
    description: 'Ban multiple users at once',
    options: [
      { name: 'users', description: 'Comma-separated user IDs', type: 3, required: true },
      { name: 'reason', description: 'Reason', type: 3, required: false },
    ],
  },
  { name: 'muteall', description: 'Server-mute everyone in your current VC' },
  { name: 'unmuteall', description: 'Unmute everyone in your current VC' },
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log("CLIENT_ID:", CLIENT_ID ? "Loaded ✅" : "Missing ❌");
    console.log("GUILD_ID:", GUILD_ID ? "Loaded ✅" : "Missing ❌");
    console.log("TOKEN:", TOKEN ? "Loaded ✅" : "Missing ❌");

    if (!CLIENT_ID || !GUILD_ID || !TOKEN) {
        throw new Error("Missing critical environment variables! Check your Azure .env file.");
    }

    console.log('🚀 Registering commands...');

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log('✅ Commands registered successfully!');
  } catch (error) {
    console.error('❌ Failed to register commands:', error);
  }
})();