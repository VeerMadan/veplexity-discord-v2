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
  punch: 'punches'
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
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2FkZTVocXRvaHB3dHc5MHJvb2t6cHV1bTZqNG8xZ3ZqZnB6M28zdiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/109LtEohdWWS8E/giphy.gif'
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
