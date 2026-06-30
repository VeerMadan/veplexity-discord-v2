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
    options: [{ name: 'user', type: 6, required: true, description: 'User ID' }],
  },
  {
    name: 'timeout',
    description: 'Timeout a user',
    options: [
      { name: 'user', type: 6, required: true, description: 'User' },
      { name: 'duration', type: 3, required: true, description: 'e.g. 10m' },
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