import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { ALLOWED_MOD_ROLE_IDS, NO_PERMISSION_MESSAGES } from '../config/constants.js';
import db from '../services/database.js';

export function hasModPerms(member, guild) {
  if (!member || !guild) return false;
  if (member.id === guild.ownerId) return true;
  if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
  return member.roles?.cache?.some(r => ALLOWED_MOD_ROLE_IDS.includes(r.id)) ?? false;
}

export function getRandomNoPermMessage() {
  return NO_PERMISSION_MESSAGES[Math.floor(Math.random() * NO_PERMISSION_MESSAGES.length)];
}

export function parseDuration(str) {
  if (!str) return 0;
  const m = str.match(/^(\d+)(s|m|h|d|w)$/i);
  if (!m) return 0;
  const num = Number(m[1]);
  const unit = m[2].toLowerCase();
  const mult = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000
  };
  return num * (mult[unit] || 0);
}

export function formatMs(ms) {
  if (!ms || isNaN(ms) || ms < 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const hrs = Math.floor(totalSec / 3600);
  const min = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  if (hrs > 0) {
    return `${hrs}:${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function formatSeconds(sec) {
  return formatMs((sec || 0) * 1000);
}

export function createProgressBar(currentMs, totalMs, length = 20) {
  if (!totalMs || totalMs <= 0) return '🔘' + '▬'.repeat(length - 1);
  const progress = Math.min(Math.max(currentMs / totalMs, 0), 1);
  const index = Math.round(progress * (length - 1));
  let bar = '';
  for (let i = 0; i < length; i++) {
    if (i === index) {
      bar += '🔘';
    } else {
      bar += '▬';
    }
  }
  return bar;
}
