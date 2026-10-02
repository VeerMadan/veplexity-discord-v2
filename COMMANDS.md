# 🤖 VePlexity Bot — Full 100 Slash Commands Catalog

> **Total Commands:** `100 / 100` (Maximum Discord Guild Capacity)  
> **Prefix:** `/` (Discord Slash Commands)  
> **Bot Client ID:** `1470533218376613908`

---

## 🎧 Lossless Studio Music & Local FLAC Library (1 Master Suite)
*Zero-buffering lossless audio playback directly streaming from your 400+ FLAC library stored on Azure VM with autocomplete.*

| Command | Arguments | Description |
| :--- | :--- | :--- |
| `/music play` | `<song>` | **Instant Autocomplete!** Plays any track from your local 400+ FLAC lossless studio library or streams from online fallback. |
| `/music library` | `[search]` | Explores the local FLAC library folder (`~/music` on Azure VM), displays total indexed tracks, and lists songs. |
| `/music pause` | *None* | Pauses the currently playing track. |
| `/music resume` | *None* | Resumes playback of a paused track. |
| `/music skip` | *None* | Skips the current track and moves to the next song in queue. |
| `/music stop` | *None* | Stops playback, clears the queue, and disconnects the bot from the voice channel. |
| `/music queue` | *None* | Displays upcoming tracks in the music queue. |
| `/music nowplaying` | *None* | Shows track name, artist, interactive progress bar, volume, and audio quality (e.g. 💎 FLAC 48kHz Lossless). |
| `/music volume` | `<level>` | Adjusts audio volume between 0% and 150%. |

---

## 💸 Economy, Casino, Profiles & Marriage (13 Commands)
*Full server economy with bank protection, robberies, casino games, XP leveling, and marriages.*

| Command | Arguments | Description |
| :--- | :--- | :--- |
| `/balance` | `[user]` `[bank_action]` | Check wallet, safe bank vault, or deposit/withdraw all cash to stay safe from `/rob`. |
| `/daily` | *None* | Claim your daily `₹1,500+` reward and build your daily streak bonus. |
| `/work` | *None* | Work a chaotic side-hustle shift every 10 minutes to earn `₹400–₹1,600`. |
| `/rob` | `<target>` | Attempt a high-stakes heist on another user's wallet (or get busted and fined!). |
| `/pay` | `<user>` `<amount>` | Transfer cash directly from your wallet to another member. |
| `/blackjack` | `<bet>` | Play interactive Casino Blackjack with **Hit 🃏**, **Stand 🛑**, and **Double Down 🔥** buttons. |
| `/slots` | `<bet>` | Spin the Vegas Slot Machine for up to **10x** jackpot payouts. |
| `/roulette` | `<bet>` `<color>` | Bet on **Red (2x)**, **Black (2x)**, or **Green 0 (14x)** on the Roulette wheel. |
| `/leaderboard` | `[category]` | View the server's **Richest Tycoons** (`money`) or **Highest Level Legends** (`levels`). |
| `/profile` | `[user]` `[set_bio]` | View a member's Server Profile Card (Level, XP bar, Net Worth, Partner, Rep, Bio) or update your bio. |
| `/rep` | `<user>` | Give `+1 Reputation` respect point to another member (12h cooldown). |
| `/marry` | `<user>` | Propose marriage to someone with interactive **💍 I Do** and **💔 Run Away** buttons. |
| `/divorce` | *None* | File divorce papers and end your current server marriage. |

---

## 🚀 Killer Features, Caught in 4K & Utilities (17 Commands)
*Auto Temp VCs, Starboard Hall of Fame, Counting Game, Birthday Tracker, Confessions, AI image gen & diagnostics.*

| Command | Arguments | Description |
| :--- | :--- | :--- |
| `/tempvc` | `<setup/rename/lock/unlock/limit>` | **Auto Join-to-Create voice hub!** Setup auto-rooms or manage your custom voice room (rename, lock, member limits). |
| `/starboard` | `[channel]` `[stars]` `[disable]` | **Hall of Fame!** Pins community-voted messages receiving ⭐ reactions to a designated showcase channel. |
| `/counting` | `[channel]` `[reset]` | **Interactive Counting Game!** Designate a streak counting channel with high-score tracking and anti-double-count rules. |
| `/birthday` | `<set/view/upcoming/channel>` | **Birthday Celebrations!** Register your birth date (`DD-MM`), view birthdays, and get automated server announcements. |
| `/snipe` | `[type]` | **Caught in 4K!** Expose the last deleted message (`deleted`) or before/after edited message (`edited`). |
| `/confess` | `<secret>` | Post a **100% anonymous confession** in the channel with zero trace of who sent it. |
| `/afk` | `[reason]` | Set an AFK status—auto-replies when someone pings you and auto-clears when you return. |
| `/imagine` | `<prompt>` | Generate high-resolution **1024x1024 AI artwork** from any text prompt for free. |
| `/aimode` | `<persona>` | *(Staff)* Switch the AI Chatbot's active personality (`default`, `savage`, `flirty`, `chill`). |
| `/giveaway` | `<duration>` `<prize>` `[winners]` | Launch an interactive **🎉 button giveaway** with automatic winner picking. |
| `/remindme` | `<time>` `<text>` | Set a persistent reminder (`10m`, `1h`, `2d`) saved to disk (survives bot restarts!). |
| `/test` | *None* | Live system diagnostics showing gateway ping, uptime, memory usage, and Node version. |
| `/serverinfo` | *None* | Displays server statistics, boost tier, channel count, and owner. |
| `/roleinfo` | `<role>` | Shows role color, member count, hierarchy position, and creation date. |
| `/userinfo` | `<user>` | Displays account creation date, server join date, avatar, and roles. |
| `/avatar` | `[user]` | Displays a user's full-resolution 1024px avatar. |
| `/poll` | `<question>` | Creates a formatted poll embed with automatic 👍 and 👎 reactions. |

---

## 🛡️ Moderation & Server Administration (23 Commands)
*Restricted to Staff Roles: Owner, Administrator, Senior Moderator, Moderator, Trial Moderator.*

| Command | Arguments | Description |
| :--- | :--- | :--- |
| `/warn` | `<user>` `<reason>` | Issues an official warning (Auto-escalates: 3 = 10m timeout, 4 = 1h, 5 = 12h, 6 = kick, 7 = ban). |
| `/pvc` | `<action: warn/ban/restore>` `<user>` `[rule]` | Manage Private Voice Channel rules: warn violations, revoke PVC access, or restore access. |
| `/kick` | `<user>` `[reason]` | Kicks a member from the server. |
| `/ban` | `<user>` `[reason]` | Permanently bans a member from the server. |
| `/unban` | `<user_id>` | Unbans a user by their Discord User ID. |
| `/timeout` | `<user>` `<duration>` `[reason]` | Times out a member (`60s`, `5m`, `10m`, `30m`, `1h`, `6h`, `1d`, `7d`). |
| `/purge` | `<amount>` (1-100) | Bulk deletes messages in the current channel. |
| `/lock` | *None* | Locks the current text channel for `@everyone`. |
| `/unlock` | *None* | Restores sending permissions for `@everyone` in the channel. |
| `/slowmode` | `<seconds>` | Sets per-user slowmode rate limit in seconds (`0` to disable). |
| `/role` | `<user>` `<role>` `<action>` | Adds or removes a server role from a member with hierarchy validation. |
| `/moveall` | `<from>` `<to>` | Moves all connected members from one voice channel to another. |
| `/nuke` | `[reason]` | Completely wipes and clones the current channel for a fresh reset. |
| `/announce` | `<channel>` `<title>` `<message>` `[color]` `[ping]` | Sends a formatted announcement embed with optional ping (`@everyone`/`@here`). |
| `/warnings` | `<user>` | Displays total general warnings and PVC warnings count for a user. |
| `/clearwarnings`| `<user>` | Clears all warnings for a user in the database. |
| `/cases` | `[user]` `[id]` | Views moderation case history for a user or fetches details for a specific case ID. |
| `/modlogs` | `<channel>` | Sets the designated audit logs channel for all moderation actions. |
| `/notes` | `<user>` `[add]` | Views staff notes or appends a new note to a user's moderation record. |
| `/nickname` | `<user>` `[name]` | Changes or resets a member's server nickname. |
| `/lockdown` | `[action: lock/unlock]` | Locks or unlocks all text channels across the entire server in emergency. |
| `/massmod` | `<action: kick/ban>` `<users>` `[reason]` | Kicks or bans multiple comma-separated user IDs simultaneously. |
| `/muteall` | `<action: mute/unmute>` | Server-mutes or unmutes all members in your active voice channel. |

---

## 💋 Roleplay, Action & Flirty Commands (16 Commands)
*Anime reaction GIFs and bold direct messages.*

| Command | Arguments | Description |
| :--- | :--- | :--- |
| `/flirt` | `<user>` | AI-crafted sleek, bold, and seductive English flirty line directed at someone. |
| `/pickup` | `[user]` | Drops a smooth or cheeky pickup line from our curated vault. |
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

---

## 🎮 Fun, Social, SFX & Meme Image Filters (30 Commands)
*Voice meme soundboard, image manipulation canvas, interactive games, AI roasts, and server engagement.*

| Command | Arguments | Description |
| :--- | :--- | :--- |
| `/filter` | `<type>` `[user]` | **Meme Canvas Filters!** Apply `jail`, `wasted`, `triggered`, `invert`, `pixelate`, `greyscale`, `blur`, or `sepia` to any avatar. |
| `/sfx` | `<sound>` | **Voice Meme Soundboard!** Instantly blast `vine_boom`, `emotional_damage`, `fbi_open_up`, `bruh`, `undertaker_bell`, `anime_wow`, `rizz_effect`, or `metal_pipe` into your VC. |
| `/truth` | *None* | Get a spicy or thought-provoking Truth question. |
| `/dare` | *None* | Get a bold Dare challenge to complete in the server. |
| `/trivia` | *None* | Interactive trivia challenge with **4 clickable buttons** and a 20s timer. |
| `/wyr` | *None* | Interactive "Would You Rather" prompt with **live A vs B voting buttons**. |
| `/tictactoe` | `<opponent>` | Play 2-player Tic-Tac-Toe on an interactive 3x3 button grid. |
| `/connect4` | `<opponent>` | Play 2-player Connect 4 with emoji board rendering and drop buttons. |
| `/rpsduel` | `<opponent>` | 2-player secret Rock Paper Scissors duel with button selections. |
| `/joke` | *None* | Fresh joke with spoiler tag punchline delivery. |
| `/meme` | *None* | Fetches a trending meme directly from Reddit (`r/memes`). |
| `/quote` | *None* | Inspiring or philosophical quote from legendary thinkers. |
| `/howgay` | `[user]` | Measure someone's rainbow percentage on the Gay-O-Meter. |
| `/simp` | `[user]` | Calculate someone's simp score on the Simp-O-Meter. |
| `/vibe` | `[user]` | Run an energetic vibe check to determine current mood aesthetic. |
| `/ratio` | `<user>` | Attempt to brutally ratio another member in the server. |
| `/iq` | `[user]` | Calculate someone's IQ score with funny assessment categories. |
| `/affirmation` | *None* | Receive a boost of positive daily motivation and encouragement. |
| `/8ball` | `<question>` | Consult the mystical Magic 8-Ball for cosmic guidance. |
| `/coinflip` | *None* | Flip a golden coin with dramatic reveal (Heads/Tails). |
| `/roll` | `[sides]` | Roll dice (customizable up to 1,000 sides, default 6). |
| `/rps` | `<choice>` | Play Rock Paper Scissors against the bot (`Rock`/`Paper`/`Scissors`). |
| `/ship` | `<user1>` `<user2>` | Calculate love compatibility percentage with visual heart bar meter. |
| `/summon` | `<user>` | Summon someone with dramatic ancient rituals and anime summoning GIFs. |
| `/chatbot` | `<mode>` (`on`/`off`) | Toggle AI Chatbot mode for `@mention` & reply conversations in the server. |
| `/roast` | `<user>` | Unleash a savage, AI-generated roast on a member. |
| `/compliment` | `<user>` | Generate a warm, AI-crafted compliment for a member. |
| `/fact` | *None* | Get a mind-blowing trivia fact from live API + curated backup. |
| `/emojify` | `<text>` | Convert plain text into bold regional indicator emojis. |
| `/rate` | `<thing>` | Rates anything on a 0–10 scale with a visual progress bar. |
