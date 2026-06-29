import { loadDatabase, saveDatabase } from './database.js';

export function createCase(userId, action, moderatorId, reason) {
  const db = loadDatabase();

  if (!db.cases[userId]) {
    db.cases[userId] = [];
  }

  const caseData = {
    id: db.cases[userId].length + 1,
    action,
    moderatorId,
    reason,
    timestamp: Date.now(),
  };

  db.cases[userId].push(caseData);

  saveDatabase(db);

  return caseData;
}