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
    pvcRevoked: [],
    notes: {}
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
      parsed.pvcRevoked ??= [];
      parsed.notes ??= {};
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

  // --- CHATBOT ---
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
}

export const db = new DatabaseService();
export default db;
