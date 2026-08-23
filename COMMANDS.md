# 📜 VePlexity Discord Bot - Complete Commands Directory

All 70 slash commands available on VePlexity, categorized by feature type.

---

## 🎵 1. Music Playback Commands
High quality YouTube & Spotify streaming (No SoundCloud). Supports 24/7 VC mode.

| Command | Arguments | Description |
| :--- | :--- | :--- |
| `/play` | `<query>` | Plays a YouTube search query, YouTube URL/playlist, or Spotify track/album/playlist URL with live autocomplete. |
| `/pause` | *None* | Pauses the current audio stream. |
| `/resume` | *None* | Resumes playback of a paused track. |
| `/skip` | *None* | Skips the currently playing song. |
| `/stop` | *None* | Stops playback, clears queue, and leaves voice channel. |
| `/queue` | *None* | Displays the list of upcoming tracks with durations and requesters. |
| `/nowplaying` | *None* | Shows active track info, duration progress bar (`01:23 ▬▬▬▬🔘▬▬▬▬ 03:45`), volume, and loop mode. |
| `/volume` | `<level>` (0-150) | Adjusts playback volume level. |
| `/loop` | `<off \| track \| queue>` | Sets repeat mode (Disable loop, loop current track, or loop whole queue). |
| `/shuffle` | *None* | Randomizes the upcoming track queue. |
| `/connect` | *None* | Connects bot to your voice channel and stays connected (24/7 mode). |
| `/disconnect` | *None* | Disconnects bot from the voice channel. |
| `/247` | *None* | Toggles 24/7 mode so the bot never disconnects on idle. |

---

## 🛡️ 2. Moderation & Server Administration
*Restricted to Staff Roles: Owner, Administrator, Senior Mod, Moderator, Trial Mod.*
*All actions automatically log a case to the database and send rich embeds to the configured mod-log channel.*

| Command | Arguments | Description |
| :--- | :--- | :--- |
| `/warn` | `<user> <reason>` | Issues an official warning. Triggers auto-escalations (3: 10m timeout, 4: 1h, 5: 12h, 6: kick, 7: ban). |
| `/pvc_warn` | `<user> <rule>` | Issues a warning for Private VC rule violation (`PVC1`–`PVC5`). |
| `/kick` | `<user> [reason]` | Kicks a member from the server. |
| `/ban` | `<user> [reason]` | Bans a user from the server. |
| `/unban` | `<user_id>` | Unbans a user by their Discord User ID. |
| `/timeout` | `<user> <duration> [reason]` | Times out a member (`60s`, `5m`, `10m`, `30m`, `1h`, `6h`, `1d`, `7d`). |
| `/purge` | `<amount>` (1-100) | Bulk deletes messages in the current channel. |
| `/lock` | *None* | Locks current channel for `@everyone`. |
| `/unlock` | *None* | Unlocks current channel for `@everyone`. |
| `/slowmode` | `<seconds>` | Sets rate limit per user in channel (0 to disable). |
| `/pvc_ban` | `<user> <rule>` | Revokes Private VC access role (`1469376368067477689`). |
| `/pvc_restore` | `<user>` | Restores Private VC access role. |
| `/warnings` | `<user>` | Displays total general warnings and PVC warnings for a user. |
| `/clearwarnings`| `<user>` | Clears all warnings for a user. |
| `/cases` | `<user>` | Lists recent moderation case history for a user. |
| `/case` | `<id>` | Displays full details for a specific case number. |
| `/modlogs` | `<channel>` | Sets the designated mod-logs channel for audit logging. |
| `/note` | `<user> <text>` | Adds a private staff note about a user. |
| `/notes` | `<user>` | Displays all private staff notes for a user. |
| `/nickname` | `<user> [name]` | Changes or resets a member's nickname. |
| `/lockdown` | *None* | Locks down all text channels across the entire server. |
| `/unlockdown` | *None* | Unlocks all text channels across the entire server. |
| `/masskick` | `<users> [reason]` | Kicks multiple comma-separated user IDs. |
| `/massban` | `<users> [reason]` | Bans multiple comma-separated user IDs. |
| `/muteall` | *None* | Server-mutes all non-bot members in your voice channel. |
| `/unmuteall` | *None* | Server-unmutes all members in your voice channel. |

---

## 🎭 3. Roleplay & Action Commands
*Mentions both users (`@User1 bit @User2!`) and sends a random high-quality anime GIF.*

| Command | Arguments | Description |
| :--- | :--- | :--- |
| `/bite` | `<user>` | Bite someone with a fun anime GIF. |
| `/hug` | `<user>` | Hug someone warmly. |
| `/kiss` | `<user>` | Kiss someone sweet. |
| `/pat` | `<user>` | Pat someone gently on the head. |
| `/slap` | `<user>` | Slap someone dramatically. |
| `/tickle` | `<user>` | Tickle someone. |
| `/cuddle` | `<user>` | Cuddle up with someone. |
| `/poke` | `<user>` | Poke someone to get their attention. |

---

## 🎮 4. Interactive Games & Fun
*Multiplayer games featuring Discord button components.*

| Command | Arguments | Description |
| :--- | :--- | :--- |
| `/tictactoe` | `<opponent>` | Interactive 2-player Tic-Tac-Toe with Discord buttons. |
| `/connect4` | `<opponent>` | Interactive 2-player Connect 4 with Discord buttons. |
| `/rpsduel` | `<opponent>` | 2-player Rock Paper Scissors duel with secret button picks. |
| `/rps` | `<rock \| paper \| scissors>` | Play Rock Paper Scissors against the bot. |
| `/ship` | `<user1> <user2>` | Calculates love compatibility between two users with heart progress bar. |
| `/8ball` | `<question>` | Ask the magic 8-ball any question. |
| `/coinflip` | *None* | Flip a coin (Heads or Tails). |
| `/roll` | `[sides]` | Roll a dice (default 6 sides). |
| `/summon` | `<user>` | Dramatically summon someone from the shadow realm with anime GIF. |

---

## 🧠 5. AI & Social Commands
*Powered by Google Gemini AI (`@google/genai`).*

| Command | Arguments | Description |
| :--- | :--- | :--- |
| `/chatbot` | `<on \| off>` | Toggles AI chatbot in the server (mention `@VePlexity` in any channel to chat). |
| `/roast` | `<user>` | Generates a witty, playful AI roast of a user. |
| `/compliment` | `<user>` | Generates a genuine, warm AI compliment for a user. |
| `/fact` | *None* | Returns a mind-blowing random fact. |
| `/wyr` | *None* | Returns a funny "Would You Rather" prompt. |
| `/emojify` | `<text>` | Converts text into regional indicator emoji letters. |

---

## ⚙️ 6. Utility & Server Information

| Command | Arguments | Description |
| :--- | :--- | :--- |
| `/serverinfo` | *None* | Shows server stats, owner, boost level, channel counts, and creation date. |
| `/roleinfo` | `<role>` | Shows role statistics, permissions, member count, and creation date. |
| `/userinfo` | `<user>` | Displays account creation date, server join date, and roles for a user. |
| `/avatar` | `[user]` | Displays full-resolution avatar image of a user or yourself. |
| `/rate` | `<thing>` | Rates anything out of 10. |
| `/poll` | `<question>` | Creates an interactive yes/no poll with 👍 and 👎 reactions. |
| `/remindme` | `<time> <text>` | Sets a personal reminder (e.g. `10m`, `1h`, `2d`). |
| `/test` | *None* | Verifies bot responsiveness and stability. |
