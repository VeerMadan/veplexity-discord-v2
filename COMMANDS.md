# 📜 VePlexity Discord Bot - Complete Commands Directory

All 94 slash commands available on VePlexity, categorized by feature type.

---

## 🎵 1. Music Playback Commands (13 Commands)
High quality YouTube & Spotify streaming. Supports 24/7 VC mode.

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

## 🛡️ 2. Moderation & Server Administration (30 Commands)
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
| `/role` | `<user> <role> <add \| remove>` | Adds or removes a server role from a member with hierarchy validation. |
| `/moveall` | `<from> <to>` | Moves all connected members from one voice channel to another. |
| `/nuke` | `[reason]` | Completely wipes and clones the current text channel for a clean reset. |
| `/announce` | `<channel> <title> <message> [color] [ping]` | Sends a beautiful, rich announcement embed to a channel with optional ping. |
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

## 🎭 3. Action, Roleplay & Flirty Commands (16 Commands)
*Sends high-quality anime GIF reaction embeds with playful messaging.*

| Command | Arguments | Description |
| :--- | :--- | :--- |
| `/pat` | `<user>` | Pat someone gently on the head. |
| `/hug` | `<user>` | Give someone a warm, comforting hug. |
| `/kiss` | `<user>` | Kiss someone sweetly. |
| `/slap` | `<user>` | Slap someone across the face. |
| `/bite` | `<user>` | Playfully bite someone. |
| `/tickle` | `<user>` | Tickle someone until they laugh. |
| `/cuddle` | `<user>` | Cuddle up close with someone. |
| `/poke` | `<user>` | Poke someone to get their attention. |
| `/bonk` | `<user>` | Bonk someone into horny jail with an anime mallet. |
| `/punch` | `<user>` | Throw a full-power anime punch at someone. |
| `/blush` | `<user>` | Blush shyly at someone special. |
| `/wink` | `<user>` | Wink playfully and charismatically at someone. |
| `/lick` | `<user>` | Playfully lick someone. |
| `/cry` | *None* | Express your sorrow with a dramatic crying anime GIF. |
| `/flirt` | `<user>` | Generate a smooth, AI-crafted flirty line for someone. |
| `/pickup` | `[user]` | Drop a smooth or cheesy pickup line from our curated vault. |

---

## 🎮 4. Fun, Social & Interactive Games (27 Commands)

| Command | Arguments | Description |
| :--- | :--- | :--- |
| `/truth` | *None* | Get a spicy or thought-provoking Truth challenge question. |
| `/dare` | *None* | Get a hilarious, bold Dare challenge to complete in the server. |
| `/joke` | *None* | Fresh, funny joke with spoiler punchline delivery. |
| `/meme` | *None* | Fetches a fresh, trending meme directly from Reddit. |
| `/quote` | *None* | Inspiring or philosophical quote from legendary thinkers. |
| `/trivia` | *None* | Interactive 4-choice trivia challenge with button selection and timer. |
| `/wyr` | *None* | Interactive "Would You Rather" prompt with live voting buttons (A vs B). |
| `/howgay` | `[user]` | Measure someone's rainbow percentage on the Gay-O-Meter. |
| `/simp` | `[user]` | Calculate someone's simp score on the Simp-O-Meter. |
| `/vibe` | `[user]` | Run an energetic vibe check to determine current mood/aesthetic. |
| `/ratio` | `<user>` | Attempt to brutally ratio another member in the server. |
| `/iq` | `[user]` | Calculate someone's IQ score with funny assessment categories. |
| `/affirmation` | *None* | Receive a boost of positive daily motivation and encouragement. |
| `/8ball` | `<question>` | Consult the mystical Magic 8-Ball for cosmic guidance. |
| `/coinflip` | *None* | Flip a golden coin with dramatic reveal (Heads/Tails). |
| `/roll` | `[sides]` | Roll dice (customizable up to 1,000 sides). |
| `/rps` | `<choice>` | Play Rock Paper Scissors against the bot. |
| `/ship` | `<user1> <user2>` | Calculate love compatibility percentage with visual heart bar meter. |
| `/tictactoe` | `<opponent>` | Play 2-player Tic-Tac-Toe on an interactive 3x3 button grid. |
| `/connect4` | `<opponent>` | Play 2-player Connect 4 with emoji board rendering and drop buttons. |
| `/rpsduel` | `<opponent>` | 2-player secret Rock Paper Scissors duel with button selections. |
| `/summon` | `<user>` | Summon someone with dramatic ancient rituals and anime summoning GIFs. |
| `/chatbot` | `<on \| off>` | Toggle Gemini AI Chatbot mode for `@mention` conversations in the server. |
| `/roast` | `<user>` | Unleash a savage, AI-generated PG-13 roast on a member. |
| `/compliment` | `<user>` | Generate a warm, AI-crafted compliment for a member. |
| `/fact` | *None* | Get a mind-blowing trivia fact from live API + curated backup. |
| `/emojify` | `<text>` | Convert plain text into bold regional indicator emojis. |

---

## ⚙️ 5. Utility & Server Information (8 Commands)

| Command | Arguments | Description |
| :--- | :--- | :--- |
| `/test` | *None* | Bot status dashboard showing gateway ping, uptime, memory, and Node.js version. |
| `/serverinfo` | *None* | Displays server statistics, boost count, channel totals, and owner. |
| `/roleinfo` | `<role>` | Shows role color, permissions, member count, and creation date. |
| `/userinfo` | `<user>` | Displays account age, server join date, avatar, and roles. |
| `/avatar` | `[user]` | Shows a full-resolution 1024px avatar image embed for any user. |
| `/rate` | `<thing>` | Rates anything on a 0–10 scale with a filled visual meter. |
| `/poll` | `<question>` | Creates a formatted poll embed and auto-reacts with 👍 and 👎. |
| `/remindme` | `<time> <text>` | Sets a timed reminder (e.g. `10m`, `1h`, `2d`) up to 7 days. |

---

**Total Slash Commands:** 94 Commands
