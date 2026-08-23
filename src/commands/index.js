import * as music from './music/index.js';
import * as moderation from './moderation/index.js';
import * as fun from './fun/index.js';
import * as utility from './utility/index.js';

export const MODERATION_COMMAND_NAMES = [
  'warn', 'pvc_warn', 'kick', 'ban', 'unban', 'timeout', 'purge',
  'lock', 'unlock', 'slowmode', 'pvc_ban', 'pvc_restore', 'warnings',
  'clearwarnings', 'cases', 'case', 'modlogs', 'note', 'notes',
  'nickname', 'lockdown', 'unlockdown', 'masskick', 'massban', 'muteall', 'unmuteall'
];

export const allCommandsList = [
  ...Object.values(music),
  ...Object.values(moderation),
  ...Object.values(fun),
  ...Object.values(utility)
];

export const commandsMap = new Map();

for (const cmd of allCommandsList) {
  if (cmd && cmd.name) {
    commandsMap.set(cmd.name, cmd);
  }
}

export default commandsMap;
