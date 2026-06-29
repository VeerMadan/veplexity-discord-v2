import fs from 'fs';

const PATH = './data/storage.json';

export function loadDatabase() {
  if (!fs.existsSync(PATH)) {
    fs.writeFileSync(
      PATH,
      JSON.stringify(
        {
          warns: {},
          cases: {},
          modlogs: {},
        },
        null,
        2
      )
    );
  }

  return JSON.parse(fs.readFileSync(PATH));
}

export function saveDatabase(data) {
  fs.writeFileSync(PATH, JSON.stringify(data, null, 2));
}