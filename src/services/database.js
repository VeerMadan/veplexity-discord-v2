import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve('./data');
const DATA_PATH = path.resolve('./data/storage.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function initialData() {
  return {
    warns: {},
    modLogs: {},
    cases: {},
    caseCounter: 0,
    chatbotGuilds: [],
    aiModes: {},
    pvcRevoked: [],
    notes: {},
    users: {},
    afk: {},
    reminders: [],
    confessionChannel: {}
  };
}

function defaultUserProfile() {
  return {
    wallet: 500,
    bank: 0,
    lastDaily: 0,
    dailyStreak: 0,
    lastWork: 0,
    lastRob: 0,
    lastRep: 0,
    xp: 0,
    level: 1,
    rep: 0,
    partner: null,
    marriedAt: null,
    bio: 'Just vibing in the server ✨'
  };
}

class DatabaseService {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      if (!fs.existsSync(DATA_PATH)) {
        const init = initialData();
        fs.writeFileSync(DATA_PATH, JSON.stringify(init, null, 2));
        return init;
      }
      const raw = fs.readFileSync(DATA_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      parsed.warns ??= {};
      parsed.modLogs ??= {};
      parsed.cases ??= {};
      parsed.caseCounter ??= Object.keys(parsed.cases).length;
      parsed.chatbotGuilds ??= [];
      parsed.aiModes ??= {};
      parsed.pvcRevoked ??= [];
      parsed.notes ??= {};
      parsed.users ??= {};
      parsed.afk ??= {};
      parsed.reminders ??= [];
      parsed.confessionChannel ??= {};
      return parsed;
    } catch (e) {
      console.error('[Database] Failed to load data, using default:', e);
      return initialData();
    }
  }

  save() {
    try {
      fs.writeFileSync(DATA_PATH, JSON.stringify(this.data, null, 2));
    } catch (e) {
      console.error('[Database] Failed to save data:', e);
    }
  }

  // --- CASES ---
  createCase({ action, userId, moderatorId, reason, channelId, guildId }) {
    this.data.caseCounter++;
    const id = this.data.caseCounter;
    const record = {
      id,
      action,
      user: userId,
      moderator: moderatorId,
      reason: reason || 'No reason provided',
      channel: channelId,
      guildId,
      timestamp: new Date().toISOString()
    };
    this.data.cases[id] = record;
    this.save();
    return id;
  }

  getCase(id) {
    return this.data.cases[id] || null;
  }

  getUserCases(userId) {
    return Object.entries(this.data.cases)
      .filter(([_, data]) => data.user === userId)
      .map(([id, data]) => ({ id, ...data }));
  }

  // --- WARNS ---
  addWarn(userId, isPvc = false) {
    const userWarns = this.data.warns[userId] || { n: 0, p: 0 };
    if (isPvc) {
      userWarns.p++;
    } else {
      userWarns.n++;
    }
    this.data.warns[userId] = userWarns;
    this.save();
    return userWarns;
  }

  getWarns(userId) {
    return this.data.warns[userId] || { n: 0, p: 0 };
  }

  clearWarns(userId) {
    delete this.data.warns[userId];
    this.save();
  }

  // --- MOD LOGS ---
  setModLogChannel(guildId, channelId) {
    this.data.modLogs[guildId] = channelId;
    this.save();
  }

  getModLogChannel(guildId) {
    return this.data.modLogs[guildId] || null;
  }

  // --- NOTES ---
  addNote(userId, moderatorId, text) {
    this.data.notes[userId] ??= [];
    this.data.notes[userId].push({
      text,
      by: moderatorId,
      at: Date.now()
    });
    this.save();
  }

  getNotes(userId) {
    return this.data.notes[userId] || [];
  }

  // --- PVC ACCESS REVOCATION ---
  addPvcRevoked(userId) {
    if (!this.data.pvcRevoked.includes(userId)) {
      this.data.pvcRevoked.push(userId);
      this.save();
    }
  }

  removePvcRevoked(userId) {
    this.data.pvcRevoked = this.data.pvcRevoked.filter(id => id !== userId);
    this.save();
  }

  isPvcRevoked(userId) {
    return this.data.pvcRevoked.includes(userId);
  }

  // --- CHATBOT & AI MODES ---
  setChatbotGuild(guildId, enabled) {
    if (enabled) {
      if (!this.data.chatbotGuilds.includes(guildId)) {
        this.data.chatbotGuilds.push(guildId);
      }
    } else {
      this.data.chatbotGuilds = this.data.chatbotGuilds.filter(id => id !== guildId);
    }
    this.save();
  }

  isChatbotEnabled(guildId) {
    return this.data.chatbotGuilds.includes(guildId);
  }

  setAiMode(guildId, mode) {
    this.data.aiModes[guildId] = mode;
    this.save();
  }

  getAiMode(guildId) {
    return this.data.aiModes[guildId] || 'default';
  }

  // --- USER ECONOMY, XP & PROFILES ---
  getUser(userId) {
    if (!this.data.users[userId]) {
      this.data.users[userId] = defaultUserProfile();
      this.save();
    } else {
      this.data.users[userId] = { ...defaultUserProfile(), ...this.data.users[userId] };
    }
    return this.data.users[userId];
  }

  updateUser(userId, updates) {
    const current = this.getUser(userId);
    this.data.users[userId] = { ...current, ...updates };
    this.save();
    return this.data.users[userId];
  }

  addMoney(userId, amount, toBank = false) {
    const user = this.getUser(userId);
    if (toBank) {
      user.bank = Math.max(0, (user.bank || 0) + amount);
    } else {
      user.wallet = Math.max(0, (user.wallet || 0) + amount);
    }
    this.data.users[userId] = user;
    this.save();
    return user;
  }

  addXp(userId, xpGain) {
    const user = this.getUser(userId);
    user.xp = (user.xp || 0) + xpGain;
    const xpNeeded = user.level * 150;
    let leveledUp = false;
    if (user.xp >= xpNeeded) {
      user.xp -= xpNeeded;
      user.level = (user.level || 1) + 1;
      user.wallet = (user.wallet || 0) + (user.level * 250); // Level up cash reward!
      leveledUp = true;
    }
    this.data.users[userId] = user;
    this.save();
    return { leveledUp, newLevel: user.level, reward: user.level * 250, user };
  }

  getTopBalances(limit = 10) {
    return Object.entries(this.data.users)
      .map(([id, u]) => ({ id, total: (u.wallet || 0) + (u.bank || 0), wallet: u.wallet || 0, bank: u.bank || 0 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  }

  getTopLevels(limit = 10) {
    return Object.entries(this.data.users)
      .map(([id, u]) => ({ id, level: u.level || 1, xp: u.xp || 0, rep: u.rep || 0 }))
      .sort((a, b) => (b.level - a.level) || (b.xp - a.xp))
      .slice(0, limit);
  }

  // --- AFK SYSTEM ---
  setAfk(userId, reason) {
    this.data.afk[userId] = {
      reason: reason || 'AFK',
      timestamp: Date.now()
    };
    this.save();
  }

  getAfk(userId) {
    return this.data.afk[userId] || null;
  }

  removeAfk(userId) {
    if (this.data.afk[userId]) {
      delete this.data.afk[userId];
      this.save();
      return true;
    }
    return false;
  }

  // --- PERSISTENT REMINDERS ---
  addReminder({ userId, channelId, text, triggerAt }) {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.data.reminders.push({ id, userId, channelId, text, triggerAt });
    this.save();
    return id;
  }

  getDueReminders() {
    const now = Date.now();
    return this.data.reminders.filter(r => r.triggerAt <= now);
  }

  removeReminder(id) {
    this.data.reminders = this.data.reminders.filter(r => r.id !== id);
    this.save();
  }
}

export const db = new DatabaseService();
export default db;
