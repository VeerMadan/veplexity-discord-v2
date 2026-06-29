import 'dotenv/config';
import { DiscordRequest } from './utils.js';

async function reset() {
  const appId = process.env.DISCORD_CLIENT_ID;

  // DELETE ALL GLOBAL COMMANDS
  await DiscordRequest(`/applications/${appId}/commands`, {
    method: 'PUT',
    body: [],
  });

  console.log('All global commands wiped');
}

reset();
