import * as moderation from './moderation/index.js';
import * as fun from './fun/index.js';
import * as utility from './utility/index.js';
import * as economy from './economy/index.js';
import * as music from './music/index.js';

export const MODERATION_COMMAND_NAMES = [
  'warn', 'pvc', 'kick', 'ban', 'unban', 'timeout', 'purge',
  'lock', 'unlock', 'slowmode', 'warnings', 'clearwarnings',
  'cases', 'modlogs', 'notes', 'nickname', 'lockdown',
  'massmod', 'muteall', 'role', 'moveall', 'nuke', 'announce', 'aimode'
];

export const allCommandsList = [
  ...Object.values(moderation),
  ...Object.values(fun),
  ...Object.values(utility),
  ...Object.values(economy),
  ...Object.values(music)
];

export const commandsMap = new Map();

for (const cmd of allCommandsList) {
  if (cmd && cmd.name) {
    commandsMap.set(cmd.name, cmd);
  }
}

export default commandsMap;
