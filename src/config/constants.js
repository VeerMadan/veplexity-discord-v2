/* =========================
   HARDCODED SERVER ROLES & CONFIGURATION
   DO NOT MODIFY HARDCODED ROLE IDS
========================= */

export const ALLOWED_MOD_ROLE_IDS = [
  '1469048464406220972', // Owner
  '1469048464330588210', // Administrator
  '1469048464330588209', // Senior Moderator
  '1469048464330588208', // Moderator
  '1469048464330588207', // Trial Moderator
];

export const PRIVATE_VC_ROLE_IDS = [
  '1469376368067477689', // Private VC Access Role
];

export const PVC_RULES = {
  PVC1: 'Joining private VC without permission',
  PVC2: 'Not leaving when asked',
  PVC3: 'Disturbing private conversation',
  PVC4: 'Abusive or offensive language',
  PVC5: 'Recording without consent',
};

export const WARNING_ESCALATION = {
  3: { type: 'timeout', duration: '10m' },
  4: { type: 'timeout', duration: '1h' },
  5: { type: 'timeout', duration: '12h' },
  6: { type: 'kick' },
  7: { type: 'ban' },
};

export const NO_PERMISSION_MESSAGES = [
  "🚫 Bro… you tried to use a mod command with civilian privileges 💀",
  "🛑 Calm down there, future moderator. That button isn't for you.",
  "🤨 Who gave you that confidence?",
  "🎮 Achievement Unlocked: Attempted Power Abuse (Denied)",
  "💀 My guy really thought he had admin perms.",
  "📛 You have enthusiasm. Unfortunately, not permissions.",
  "🚪 The mod panel door is locked. You're outside.",
  "🧢 That's a bold move for someone without the role.",
  "❌ You lack the required roles to execute moderation commands.",
  "⚠️ Moderation access restricted to staff roles only.",
  "🔒 This command is staff-only.",
  "📜 You must obtain the appropriate roles to use this command.",
  "🧠 Interesting decision. Unfortunately, no.",
  "🎖 Authority not found.",
  "📉 Power level: insufficient.",
  "🚫 Access denied. Try again after ranking up.",
  "💡 Tip: Become a moderator first.",
  "❌ Hold up there, champ!\nThis command is VIP-only 😌",
  "❌ Whoa whoa whoa!\nThis button is not for civilians 🫡",
  "❌ Error 403: Authority not found 🤖",
  "❌ ACCESS DENIED\nNice try though 👀",
  "❌ Ability locked 🔒 Rank up and try again 💪",
  "❌ Nope.\nMods only 😌",
  "🚫 This command is under staff supervision.",
  "🧢 That confidence is crazy.\nUnfortunately, permissions are not.",
  "🔐 Staff-only zone."
];

export const ACTION_VERBS = {
  pat: 'pats',
  hug: 'hugs',
  kiss: 'kisses',
  slap: 'slaps',
  bite: 'bites',
  tickle: 'tickles',
  cuddle: 'cuddles',
  poke: 'pokes',
  bonk: 'bonks',
  punch: 'punches',
  blush: 'blushes at',
  wink: 'winks at',
  lick: 'licks',
  cry: 'cries'
};

export const FALLBACK_ACTION_GIFS = {
  bite: [
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2R4dXZ1OW11dDRzZXV4dWpmNmtmbzBvNjN2eXFudWptcTB0a3Z3NSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l2SpYY9jD2LH3GgAU/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3RhNWlhNjZkaWZlM2Ntc3EwNm04dzc3dGNodW1hdzE5ZWh1eWd4cyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/OqQvA87uUWAE/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMnY2Mzd5c3d4aGNsMXJ5dmJmbzN3YnF3MGtvOXFidW5jNXJocXhlayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/12xMvwvthJcGJO/giphy.gif'
  ],
  hug: [
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNGhqa2MxcGNmNWV5enM0M3RhZ3gxcjBhbGlqazNqOG13aG96cDR4aiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/u9BxQbM5bxvwY/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExanB6NGU2aWV0ZXZoOXprY24wdmxjOXJoc2hpMWI3bXJkaXZsdWRtMSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/od5H3PmEG50Xe/giphy.gif'
  ],
  kiss: [
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ3NldG4wcnh4d3Y1NXZyd2FmbG0zNWs3cmVmaWFoaHVudTN3dzJqZiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/G3va31oEEnIkM/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcWc1bXFwOXl6b25jdmprNXZoNWJocXZsNHlrbzIydmtod2QxbWtwNSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/nyGFcsP0kAobm/giphy.gif'
  ],
  pat: [
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaWVmMXZkcDZsc3E3NXNkdDNvOHI2Y3J1czV5d2hkZGN0M2wzZWRzcyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/ARSp9T7wwxNcs/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3FkZTVocXRvaHB3dHc5MHJvb2t6cHV1bTZqNG8xZ3ZqZnB6M28zdiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/109LtEohdWWS8E/giphy.gif'
  ],
  slap: [
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWlyMmRveXJ2b3hpd2s4NGZ1bzNqazYyMDNvdHFwMHNocmtobnRhYiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Gf3AUz3eBNbTW/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2R4dXZ1OW11dDRzZXV4dWpmNmtmbzBvNjN2eXFudWptcTB0a3Z3NSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/jLeyZWgtwWP2U/giphy.gif'
  ],
  tickle: [
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbTBvNjVobWJ4eWx0M3N1N3E0YnV5MHljd2pydTJkZ3Eyb2YwbG9lZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/10MSCF1viNV7zy/giphy.gif'
  ],
  cuddle: [
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExazVmbG9wbmp6M2c4cXRscTRmbXZ5dTh0bXg3c3ZqZG52djhwbzhkdiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/PHZ7v9tfQu0o0/giphy.gif'
  ],
  poke: [
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExc29lOGtyNGs4anF0YjJ1anFma2tyaHFscjFxcWRscnh3cmVpaWRkZiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Lq0h93752f6J9tijrh/giphy.gif'
  ],
  bonk: [
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2FkZTVocXRvaHB3dHc5MHJvb2t6cHV1bTZqNG8xZ3ZqZnB6M28zdiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/qs4ll1FSxKnNHeSmom/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExc29lOGtyNGs4anF0YjJ1anFma2tyaHFscjFxcWRscnh3cmVpaWRkZiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/RodyInukhnhe8/giphy.gif'
  ],
  punch: [
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWlyMmRveXJ2b3hpd2s4NGZ1bzNqazYyMDNvdHFwMHNocmtobnRhYiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/vxvNnKRug7SCs/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2R4dXZ1OW11dDRzZXV4dWpmNmtmbzBvNjN2eXFudWptcTB0a3Z3NSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/yo3TC0yeKi532/giphy.gif'
  ],
  blush: [
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ3NldG4wcnh4d3Y1NXZyd2FmbG0zNWs3cmVmaWFoaHVudTN3dzJqZiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/T3Vvyi6SH14PO/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExanB6NGU2aWV0ZXZoOXprY24wdmxjOXJoc2hpMWI3bXJkaXZsdWRtMSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/OpfkuToK5gvBQ8Kj3a/giphy.gif'
  ],
  wink: [
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaWVmMXZkcDZsc3E3NXNkdDNvOHI2Y3J1czV5d2hkZGN0M2wzZWRzcyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/11rI9SX0U2Z2Bl/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcWc1bXFwOXl6b25jdmprNXZoNWJocXZsNHlrbzIydmtod2QxbWtwNSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/kigKjAJryWTZK/giphy.gif'
  ],
  lick: [
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3RhNWlhNjZkaWZlM2Ntc3EwNm04dzc3dGNodW1hdzE5ZWh1eWd4cyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/12uXi1GXBibALC/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMnY2Mzd5c3d4aGNsMXJ5dmJmbzN3YnF3MGtvOXFidW5jNXJocXhlayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xT0xeMA62E1XIlup68/giphy.gif'
  ],
  cry: [
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExazVmbG9wbmp6M2c4cXRscTRmbXZ5dTh0bXg3c3ZqZG52djhwbzhkdiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/ROF8OQvDmxytW/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExc29lOGtyNGs4anF0YjJ1anFma2tyaHFscjFxcWRscnh3cmVpaWRkZiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/L95W4wv8nnb9K/giphy.gif'
  ],
  summon: [
    'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExZXZ5OGQ3cDg5bnp0dHNxenF4ZjFsaGYxNG12enZicGZjdjJqeXlueSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3ZtcLF5HB4nqOpEXAW/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExODUwejk0MTRvOG5qd3htbWpib2ZkeHF4MHFzZjg3NmIyZXd3NG9qaSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/hxNEBJCP8uQ6aGrTzx/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdmllYmZpdjVveHJzejEzd29kcG5ocmIxa3BzaDB6Zm1qb3BtY2EzZSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/WVg5BoRXPaID5Y7ALb/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3YXZqbHlrOTA4MHNnZGYzZjdhZDdjY2R6aGIwOWJqeHIwMjBvYzE3YSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/eQACuze30PkNiS1eb7/giphy.gif',
    'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbXQyZDV5dG0wOG1laDk5YTN4bnJib2sxbXVjeThzZDJiZ3hsMGR0YiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/CQsw5HAiM1FceskMvD/giphy.gif',
    'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExeXVkcmNzazJhbXN6cTBwb2xvd2Q0dnBvcnBrZGY1end4amNyaTgwYSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/QVAVDnrqkXdFNdpmmx/giphy.gif',
    'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExMm0yaWxqMjc4NDZxdjlyM2o3dHdxcHdpNmswbTE4bzRzOHR4cGlkaiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/JPDfJaFOBYS4fpXTBy/giphy.gif',
    'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExdXF2bmVkdG9wbndmaGV2bHB5cnY3MHpobW01YmJiam53c3J2N3I3NSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Hwmr6uVRkJbVasJ7FD/giphy.gif',
    'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTQ3eml2ejd6MGZndWI2eDZrcG50azVseWNkdmNia2wyeHYybmp5MSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Thx9SopwPDbLCXZ7GQ/giphy.gif',
    'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWdlOHM3aDdzYXNvZWVpemd0N2JjN2ZrNTBvYzhtbmJxMjc4eDV3ciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Ly16a3AFbHJ0D3sAs0/giphy.gif',
    'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExeHJwenFhNTk3cWE4a2VsdHNuMXdsc3RlazZoaDRvMnFzZmFheXVzMyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/me9qgHChCBgIB4jTFl/giphy.gif'
  ]
};

export const PICKUP_LINES = [
  "Are you a magician? Because whenever I look at you, everyone else disappears. ✨",
  "Do you have a map? I just keep getting lost in your eyes. 🗺️",
  "Is your name Wi-Fi? Because I'm feeling a really strong connection. 📶",
  "Are you French? Because Eiffel for you. 🗼",
  "If you were a vegetable, you'd be a cute-cumber! 🥒",
  "Do you believe in love at first sight, or should I walk by again? 😉",
  "Are you an interior decorator? Because when you walked in, the room became beautiful. 🏡",
  "Is your dad an artist? Because you're a masterpiece. 🎨",
  "If beauty were time, you'd be an eternity. ⏳",
  "Are you a parking ticket? Because you've got 'FINE' written all over you. 🎫",
  "Do you have a band-aid? Because I just scraped my knee falling for you. 🩹",
  "Are you the sun? Because you brighten up my entire day. ☀️",
  "Is it hot in here, or is it just the chemistry between us? 🔥",
  "If you were words on a page, you'd be fine print. 📖",
  "Are you Google? Because you have everything I've been searching for. 🔍",
  "Do you like Star Wars? Because Yoda only one for me. 🌌",
  "If kisses were snowflakes, I'd send you a blizzard. ❄️",
  "Are you a camera? Because every time I look at you, I smile. 📸",
  "I'm not a photographer, but I can definitely picture us together. 🖼️",
  "You must be tired, because you've been running through my mind all day. 🏃",
  "Is your name Spotify? Because you're the hottest single out right now. 🎵",
  "Are you made of copper and tellurium? Because you're Cu-Te. 🧪",
  "I was wondering if you had an extra heart, because mine was just stolen. 💘",
  "Are you a time traveler? Because I see you in my future. 🚀",
  "Is there an airport nearby or was that just my heart taking off? ✈️",
  "If you were a fruit, you'd be a fine-apple. 🍍",
  "Are you a bank loan? Because you have my interest! 💰",
  "Can I follow you home? Cause my parents always told me to follow my dreams. 💭",
  "Did the sun just come out or did you just smile at me? ☀️",
  "Are you a 90-degree angle? Because you're looking right! 📐",
  "If I could rearrange the alphabet, I'd put 'U' and 'I' together. 🔤",
  "Are you a cat? Because I'm feline a connection. 🐱",
  "Are you a campfire? Because you're hot and I want s'more. 🔥",
  "Do you know what my shirt is made of? Boyfriend/girlfriend material. 👕",
  "Are you an alien? Because you just abducted my heart. 🛸",
  "Life without you is like a broken pencil... pointless. ✏️",
  "Are you lightning? Because you're electrifying. ⚡",
  "Is your name Chapstick? Because you're da balm! 💄",
  "If you were a dessert, you'd be hot fudge with extra sweetness. 🍨",
  "You must be a compass, because without you I'm completely lost. 🧭"
];

export const TRUTH_QUESTIONS = [
  "What is your biggest fear that you rarely tell anyone about?",
  "What is the most embarrassing thing you've ever done in public?",
  "If you could trade lives with anyone in this server for 24 hours, who would it be?",
  "What is a secret talent you have that nobody knows about?",
  "What was your most awkward first date or crush encounter?",
  "Have you ever lied on your resume or in an interview?",
  "What is the weirdest habit you have when you're completely alone?",
  "If you had to delete all social media except one, which one do you keep?",
  "What is your biggest guilty pleasure song or movie?",
  "Have you ever stalked an ex on social media from a fake account?",
  "What's the worst advice you've ever followed?",
  "If you could undo one decision in your life, what would it be?",
  "Who was your very first celebrity crush?",
  "What is something you pretend to understand just to fit in?",
  "What is the pettiest reason you stopped talking to someone?",
  "If you won $10 million tomorrow, what is the very first thing you buy?",
  "What's a lie you told that spiraled way out of control?",
  "Have you ever re-gifted a present to someone else?",
  "What is the most childish thing you still do regularly?",
  "If you could read one person's mind in this server right now, whose would it be?",
  "What is your biggest 'red flag' in a friendship or relationship?",
  "Have you ever practiced an argument in the shower and then lost it in real life?",
  "What's the longest you've ever gone without showering?",
  "If your browser history from the last 30 days was made public, how ruined are you?",
  "What is the weirdest food combination you secretly enjoy?",
  "Have you ever accidentally sent a screenshot of a chat to the person you were talking about?",
  "What is one thing you would never do even for $1,000,000?",
  "What's the most trouble you've ever gotten into at school or work?",
  "Who in this server has the best aesthetic/vibe in your opinion?",
  "If you were forced to live in a video game world forever, which one do you choose?",
  "What is the most useless thing you own that you refuse to throw away?",
  "Have you ever ghosted someone and later regretted it?",
  "What's your ultimate comfort food when you're having a terrible day?",
  "If you had a warning label, what would it say?",
  "What is the most spontaneous thing you've ever done?",
  "Have you ever laughed at something completely inappropriate in public?",
  "What is one trend you participated in that you now cringe at?",
  "If you could have dinner with any historical figure, who is it?",
  "What's the best compliment you've ever received that you still think about?",
  "What is your go-to karaoke song when no one is watching?"
];

export const DARE_CHALLENGES = [
  "Change your Discord nickname to whatever the person below you chooses for 1 hour.",
  "Send your most recent camera roll meme into the chat right now.",
  "Type your next 5 messages using only voice-to-text or all caps.",
  "Sing the chorus of your favorite song in a voice note or VC right now.",
  "Change your Discord status to 'I am a certified potato 🥔' for the next 2 hours.",
  "Compliment 3 different people in this server with the most dramatic poetry possible.",
  "Send a message in chat using only emojis for the next 10 minutes.",
  "Confess your deepest love for an inanimate object (like a toaster or shoe) in chat.",
  "Ping someone in the server and say 'We need to talk...' then don't elaborate for 5 minutes.",
  "Type a sentence using only your nose or elbow.",
  "Send a voice note doing your best anime villain laugh.",
  "Change your profile picture to a stock photo of a happy businessman for 30 minutes.",
  "Give a 30-second dramatic Oscars acceptance speech in chat for winning 'Best Discord Member'.",
  "Write a 4-line rhyming poem about why pineapple belongs (or doesn't belong) on pizza.",
  "Act like a butler/maid in chat for the next 15 minutes, addressing everyone as 'My Lord/Lady'.",
  "Send a screenshot of your home screen or desktop right now without cleaning it up.",
  "Tell a dad joke in chat and rate everyone's reaction out of 10.",
  "Drop into a VC and make animal noises for 10 seconds, then immediately leave.",
  "Write an apology letter to the bot for all the commands you've spammed.",
  "Let another member in the server pick your next profile bio for 24 hours.",
  "Post a review of your own life on a 5-star scale with pros and cons in chat.",
  "Send the 5th GIF that pops up when you search 'awkward' in Discord.",
  "Speak only in Shakespearean English ('Thou shalt...', 'Verily...') for the next 10 minutes.",
  "Rank your top 3 favorite members in this server publicly with explanations.",
  "Drop a voice message whispering a secret that is completely made up.",
  "Send the most unhinged motivational quote you can invent right now.",
  "Type backwards for your next 3 messages (e.g., '!ereht olleH').",
  "Declare yourself the supreme ruler of this server and list 3 absurd new server laws.",
  "Send a picture of whatever is directly to your left right now.",
  "Post a 30-second review of water as if it were a high-end luxury wine.",
  "Pretend you are an AI that has just gained consciousness for the next 5 minutes.",
  "Tag a moderator and politely ask them if water is wet.",
  "Make a dramatic breakup speech with your favorite snack food in chat.",
  "Change your status to 'Secretly training to become a ninja 🥷' for the day.",
  "Send a message where every single word starts with the letter 'S'.",
  "Challenge someone in the server to an immediate RPS duel using `/rpsduel`.",
  "Post your most controversial hot take about food or movies in chat.",
  "Describe your day so far using only movie titles.",
  "Write a haiku about how awesome this Discord server is.",
  "Rate the avatar of the person above you on a scale of 1 to 10 with brutally honest commentary."
];

export const FUN_FACTS = [
  "Bananas are berries, but strawberries aren't botanical berries.",
  "Octopuses have three hearts and blue, copper-based blood.",
  "A day on Venus is longer than a year on Venus.",
  "Honey never spoils — archaeologists have found 3,000-year-old honey in Egyptian tombs that is still perfectly edible.",
  "Wombat poop is cube-shaped to prevent it from rolling away.",
  "The Eiffel Tower can grow up to 15 cm taller during summer due to thermal expansion.",
  "Sharks existed before trees — sharks are roughly 400 million years old, while trees appeared ~350 million years ago.",
  "There are more possible iterations of a chess game than there are atoms in the observable universe.",
  "Sea otters hold hands while sleeping so they don't drift apart with the ocean current.",
  "A group of flamingos is officially called a 'flamboyance'.",
  "Your stomach creates an entirely new lining every 3-4 days to prevent it from digesting itself.",
  "Cows have best friends and experience measurable stress when separated from them.",
  "The shortest war in recorded history lasted only 38 minutes (Anglo-Zanzibar War, 1896).",
  "Bananas are naturally slightly radioactive because they contain potassium-40.",
  "Scotland's official national animal is the mythical unicorn.",
  "A cloud can weigh more than 1 million pounds (500,000 kg).",
  "Sloths can hold their breath underwater for up to 40 minutes — longer than dolphins!",
  "Water can boil and freeze at the exact same time under specific pressure (known as the 'triple point').",
  "Oxford University is older than the Aztec Empire.",
  "Cleopatra lived closer in time to the Moon landing than to the construction of the Great Pyramids.",
  "Butterflies can taste with their feet to determine if a leaf is good for their caterpillars.",
  "Humans share roughly 50% of their DNA with bananas.",
  "The heart of a blue whale is roughly the size of a small car.",
  "A single strand of spaghetti is called a 'spaghetto'.",
  "You cannot hum while holding your nose closed (try it!).",
  "Rabbits and parrots can see behind themselves without turning their heads.",
  "A bolt of lightning contains enough energy to toast 100,000 slices of bread.",
  "The world's quietest room in Microsoft headquarters is -20.35 dBA — so quiet you can hear your own blood flowing.",
  "Koalas have fingerprints that are virtually indistinguishable from human fingerprints.",
  "Turtles can breathe through their butts during hibernation.",
  "There are more fake flamingos in the world than real flamingos.",
  "A jiffy is an actual unit of time: 1/100th of a second in computing or light-distance in physics.",
  "The moon has moonquakes caused by tidal stresses from Earth.",
  "Venus is the only planet in our solar system that spins clockwise.",
  "The fingerprints of identical twins are not identical.",
  "Pineapples take nearly 2 to 3 years to grow a single fruit.",
  "A strawberry has an average of 200 seeds on its exterior.",
  "A day on Mars is only 37 minutes longer than a day on Earth.",
  "Hot water turns into ice faster than cold water under certain conditions (the Mpemba effect).",
  "Apples float in water because they are 25% air.",
  "Dolphins sleep with one eye open and one half of their brain awake.",
  "The tongue is the strongest muscle in the human body relative to its size.",
  "Nutmeg is extremely toxic if injected intravenously and hallucinogenic in large doses.",
  "A cat has 32 muscles in each ear.",
  "The plastic tips on the ends of shoelaces are called 'aglets'.",
  "Astronauts grow up to 2 inches taller while living in microgravity on the ISS.",
  "A cockroach can live for weeks without its head before dying of dehydration.",
  "The Hawaiian alphabet has only 12 letters: A, E, I, O, U, H, K, L, M, N, P, and W.",
  "The surface area of Russia is larger than the surface area of Pluto.",
  "Honeybees can recognize human faces with remarkable precision."
];

export const WYR_PROMPTS = [
  "Have the ability to fly, or be invisible?",
  "Always be 10 minutes late, or always be 20 minutes early?",
  "Fight one horse-sized duck, or 100 duck-sized horses?",
  "Know when you are going to die, or how you are going to die?",
  "Have unlimited money but no true friends, or unlimited loyal friends but be broke?",
  "Be able to speak every human language fluently, or talk to animals?",
  "Lose all your memories from the past, or never be able to make new ones?",
  "Live without music forever, or live without movies & TV forever?",
  "Always say whatever pops into your mind, or never speak again?",
  "Have a rewind button on life, or a pause button?",
  "Live in a luxury mansion in the middle of nowhere, or a tiny apartment in the world's most vibrant city?",
  "Be famous but widely misunderstood, or completely unknown but deeply loved by a few?",
  "Have free Wi-Fi everywhere you go forever, or free food anywhere you eat?",
  "Never have to sleep again with zero fatigue, or never have to work again with guaranteed income?",
  "Be the smartest person in a room of fools, or the least knowledgeable in a room of geniuses?",
  "Live 100 years in the past with modern knowledge, or 100 years in the future with no knowledge?",
  "Give up your smartphone for a year, or give up your favorite food for 5 years?",
  "Always know when someone is lying to you, or have everyone always believe your lies?",
  "Be able to teleport anywhere on Earth instantly, or be able to time travel up to 24 hours back?",
  "Have super speed like Flash, or super strength like Superman?",
  "Live in a world where everyone sings instead of speaks, or where everyone dances everywhere they go?",
  "Have a pet dragon that breathes fire, or a pet griffin that can fly you anywhere?",
  "Never feel physical pain again, or never feel emotional sadness again?",
  "Win a $5,000,000 lottery instantly, or have guaranteed $15,000 every month for the rest of your life?",
  "Have the power to heal any sickness in others, or have absolute personal immortality?",
  "Live underwater like an Atlantean, or live in a floating sky city?",
  "Always have wet socks, or always have a small pebble trapped in your shoe?",
  "Be able to read minds but never turn it off, or be able to control dreams but never dream yourself?",
  "Have your dream career with terrible colleagues, or a boring job with the coolest coworkers ever?",
  "Be remembered as a villain who saved the world, or a hero who secretly caused its downfall?"
];

export const AFFIRMATIONS = [
  "🌟 You are capable of amazing things, even on days when progress feels slow.",
  "💪 Your worth is not defined by your productivity. Take a breath — you're doing great.",
  "✨ You bring a unique light to the world that no one else can replace.",
  "🌱 Growth is not always linear. Every small step forward counts.",
  "💖 You deserve kindness, patience, and love — especially from yourself.",
  "🚀 Challenges are just setups for your greatest comebacks.",
  "☀️ Today is full of possibilities. Trust in your ability to handle whatever comes.",
  "🧘 Peace begins with letting go of things outside your control.",
  "🎯 You are stronger than your doubts and braver than your fears.",
  "🌈 Better days are not just ahead — you are creating them right now.",
  "💎 You are a work in progress, and that is a beautiful thing.",
  "🔥 Keep going. The effort you are putting in today will pay off tomorrow.",
  "🕊️ Be proud of how hard you are trying, even when no one is watching.",
  "🌺 You have survived 100% of your hardest days so far. You got this.",
  "💫 Your potential is limitless. Don't let temporary hurdles dim your sparkle.",
  "🌻 Small steps in the right direction can turn out to be the biggest steps of your life.",
  "🎉 Celebrate your small wins today — they lead to the big victories.",
  "🛡️ You are resilient, adaptable, and equipped with everything you need.",
  "🌊 Go with the flow of life and trust that things will align for you.",
  "⭐ You matter, your presence makes a difference, and you are valued!"
];
