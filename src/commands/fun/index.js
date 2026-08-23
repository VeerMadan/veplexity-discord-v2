import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import {
  FALLBACK_ACTION_GIFS,
  ACTION_VERBS,
  PICKUP_LINES,
  TRUTH_QUESTIONS,
  DARE_CHALLENGES,
  FUN_FACTS,
  WYR_PROMPTS,
  AFFIRMATIONS
} from '../../config/constants.js';
import { buildEmbed } from '../../utils/embeds.js';
import db from '../../services/database.js';
import { generateAiReply } from '../../services/aiService.js';

const ACTION_PAST_VERBS = {
  bite: 'bit',
  hug: 'hugged',
  kiss: 'kissed',
  pat: 'patted',
  slap: 'slapped',
  tickle: 'tickled',
  cuddle: 'cuddled',
  poke: 'poked',
  bonk: 'bonked',
  punch: 'punched',
  blush: 'blushed at',
  wink: 'winked at',
  lick: 'licked'
};

async function fetchActionGif(category) {
  try {
    const res = await fetch(`https://api.otakugifs.xyz/gif?reaction=${category}`);
    if (res.ok) {
      const data = await res.json();
      if (data.url) return data.url;
    }
  } catch (e) {}

  const list = FALLBACK_ACTION_GIFS[category] || FALLBACK_ACTION_GIFS.summon;
  return list[Math.floor(Math.random() * list.length)];
}

async function handleAction(interaction, category) {
  const target = interaction.options.getUser('user');
  const gif = await fetchActionGif(category);
  const verb = ACTION_PAST_VERBS[category] || `${category}ed`;
  const isSelf = target.id === interaction.user.id;

  const description = isSelf
    ? `**<@${interaction.user.id}> ${verb} themselves... wait, what? 😳**`
    : `**<@${interaction.user.id}> ${verb} <@${target.id}>!**`;

  const embed = new EmbedBuilder()
    .setColor(0xff2a6d)
    .setDescription(description)
    .setImage(gif);

  return interaction.editReply({ embeds: [embed] });
}

// ─── ACTION COMMANDS ─────────────────────────────────────────────────────────

export const pat = { name: 'pat', description: 'Pat someone on the head', options: [{ name: 'user', description: 'Who to pat', type: 6, required: true }], execute: (i) => handleAction(i, 'pat') };
export const hug = { name: 'hug', description: 'Give someone a warm hug', options: [{ name: 'user', description: 'Who to hug', type: 6, required: true }], execute: (i) => handleAction(i, 'hug') };
export const kiss = { name: 'kiss', description: 'Kiss someone sweetly', options: [{ name: 'user', description: 'Who to kiss', type: 6, required: true }], execute: (i) => handleAction(i, 'kiss') };
export const slap = { name: 'slap', description: 'Slap someone across the face', options: [{ name: 'user', description: 'Who to slap', type: 6, required: true }], execute: (i) => handleAction(i, 'slap') };
export const bite = { name: 'bite', description: 'Bite someone playfully', options: [{ name: 'user', description: 'Who to bite', type: 6, required: true }], execute: (i) => handleAction(i, 'bite') };
export const tickle = { name: 'tickle', description: 'Tickle someone until they laugh', options: [{ name: 'user', description: 'Who to tickle', type: 6, required: true }], execute: (i) => handleAction(i, 'tickle') };
export const cuddle = { name: 'cuddle', description: 'Cuddle up with someone', options: [{ name: 'user', description: 'Who to cuddle', type: 6, required: true }], execute: (i) => handleAction(i, 'cuddle') };
export const poke = { name: 'poke', description: 'Poke someone gently', options: [{ name: 'user', description: 'Who to poke', type: 6, required: true }], execute: (i) => handleAction(i, 'poke') };
export const bonk = { name: 'bonk', description: 'Bonk someone into horny jail', options: [{ name: 'user', description: 'Who to bonk', type: 6, required: true }], execute: (i) => handleAction(i, 'bonk') };
export const punch = { name: 'punch', description: 'Throw a punch at someone', options: [{ name: 'user', description: 'Who to punch', type: 6, required: true }], execute: (i) => handleAction(i, 'punch') };
export const blush = { name: 'blush', description: 'Blush at someone special', options: [{ name: 'user', description: 'Who makes you blush', type: 6, required: true }], execute: (i) => handleAction(i, 'blush') };
export const wink = { name: 'wink', description: 'Wink playfully at someone', options: [{ name: 'user', description: 'Who to wink at', type: 6, required: true }], execute: (i) => handleAction(i, 'wink') };
export const lick = { name: 'lick', description: 'Lick someone playfully', options: [{ name: 'user', description: 'Who to lick', type: 6, required: true }], execute: (i) => handleAction(i, 'lick') };

export const cry = {
  name: 'cry',
  description: 'Express your sadness with a dramatic crying GIF',
  async execute(interaction) {
    const gifs = FALLBACK_ACTION_GIFS.cry;
    const gif = gifs[Math.floor(Math.random() * gifs.length)];
    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setDescription(`😭 **<@${interaction.user.id}> is crying... someone give them a hug!**`)
      .setImage(gif);
    return interaction.editReply({ embeds: [embed] });
  }
};

export const summon = {
  name: 'summon',
  description: 'Summon someone with a dramatic announcement and GIF',
  options: [{ name: 'user', description: 'User to summon', type: 6, required: true }],
  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const summonGifs = FALLBACK_ACTION_GIFS.summon;
    const gif = summonGifs[Math.floor(Math.random() * summonGifs.length)];

    const phrases = [
      `🔮 <@${interaction.user.id}> has summoned <@${targetUser.id}> from the shadow realm!`,
      `📜 By ancient decree, <@${interaction.user.id}> summons thee, <@${targetUser.id}>!`,
      `🌀 <@${interaction.user.id}> performed the Summoning Jutsu... <@${targetUser.id}> has appeared!`,
      `⚡ <@${interaction.user.id}> rang the bell. <@${targetUser.id}>, your presence is required immediately.`,
      `🕯️ A circle was drawn. A name was spoken. <@${targetUser.id}>, you have been called by <@${interaction.user.id}>.`,
      `📯 Hear ye, hear ye — <@${interaction.user.id}> summons <@${targetUser.id}> to this realm!`,
      `🧙 <@${interaction.user.id}> cast a summoning spell. <@${targetUser.id}> had no choice but to appear.`
    ];
    const message = phrases[Math.floor(Math.random() * phrases.length)];

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setDescription(`### ${message}`)
      .setImage(gif);

    return interaction.editReply({ embeds: [embed] });
  }
};

export const chatbot = {
  name: 'chatbot',
  description: 'Toggle AI chatbot mode (mention the bot to chat)',
  options: [
    {
      name: 'mode',
      description: 'Turn on or off',
      type: 3,
      required: true,
      choices: [
        { name: 'on', value: 'on' },
        { name: 'off', value: 'off' }
      ]
    }
  ],
  async execute(interaction) {
    const setting = interaction.options.getString('mode');
    const enabled = setting === 'on';
    db.setChatbotGuild(interaction.guildId, enabled);
    const embed = new EmbedBuilder()
      .setColor(enabled ? 0x2ecc71 : 0xe74c3c)
      .setTitle('🤖 VePlexity AI Chatbot')
      .setDescription(enabled
        ? '✨ **Chatbot mode ENABLED!** Mention me anywhere in this server and I\'ll talk with personality.'
        : '💤 **Chatbot mode DISABLED.** I\'ll rest until you turn me back on.')
      .setFooter({ text: 'Powered by Google Gemini Flash' });
    return interaction.editReply({ embeds: [embed] });
  }
};

// ─── UPGRADED PREMIUM CLASSICS ───────────────────────────────────────────────

export const eightball = {
  name: '8ball',
  description: 'Consult the mystical Magic 8-Ball for cosmic answers',
  options: [{ name: 'question', description: 'The question you seek an answer for', type: 3, required: true }],
  async execute(interaction) {
    const question = interaction.options.getString('question');
    const answers = [
      { text: "It is certain.", type: 'positive' },
      { text: "Without a shadow of a doubt.", type: 'positive' },
      { text: "Yes, definitely!", type: 'positive' },
      { text: "You may rely on it with your life.", type: 'positive' },
      { text: "As I see it, yes.", type: 'positive' },
      { text: "Most likely, absolutely.", type: 'positive' },
      { text: "Outlook is glowing bright! ✨", type: 'positive' },
      { text: "Signs point to an undeniable YES.", type: 'positive' },
      { text: "100% guaranteed.", type: 'positive' },
      { text: "Reply hazy, gaze into the mist and ask again.", type: 'neutral' },
      { text: "Ask again after the next sunrise.", type: 'neutral' },
      { text: "Better not tell you now... the cosmos is shy.", type: 'neutral' },
      { text: "Cannot predict now, energies are turbulent.", type: 'neutral' },
      { text: "Concentrate deeply and ask once more.", type: 'neutral' },
      { text: "The universe remains undecided.", type: 'neutral' },
      { text: "Don't count on it, chief.", type: 'negative' },
      { text: "My reply is a firm no.", type: 'negative' },
      { text: "My sources say absolutely not.", type: 'negative' },
      { text: "Outlook not so good at all.", type: 'negative' },
      { text: "Very doubtful, sorry.", type: 'negative' },
      { text: "In your wildest dreams... maybe.", type: 'negative' },
      { text: "Chances are close to zero.", type: 'negative' },
      { text: "The stars align against this.", type: 'negative' }
    ];

    const pick = answers[Math.floor(Math.random() * answers.length)];
    const colorMap = { positive: 0x2ecc71, neutral: 0xf1c40f, negative: 0xe74c3c };
    const emojiMap = { positive: '🟢', neutral: '🟡', negative: '🔴' };

    const embed = new EmbedBuilder()
      .setColor(colorMap[pick.type])
      .setTitle('🔮 The Mystic 8-Ball Has Spoken')
      .addFields(
        { name: '❓ Question Asked', value: `*"${question}"*` },
        { name: `${emojiMap[pick.type]} Cosmic Verdict`, value: `**${pick.text}**` }
      )
      .setFooter({ text: `Consulted by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};

export const coinflip = {
  name: 'coinflip',
  description: 'Flip a golden coin with realistic physics and reveal',
  async execute(interaction) {
    const isHeads = Math.random() < 0.5;
    const result = isHeads ? 'HEADS' : 'TAILS';
    const emoji = isHeads ? '👑' : '🦅';

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('🪙 Coin Toss Result')
      .setDescription(`The golden coin flipped through the air and landed on...\n\n# ${emoji} **${result}!**`)
      .setFooter({ text: `Flipped by ${interaction.user.username}` })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};

export const roll = {
  name: 'roll',
  description: 'Roll dice with custom sides and visual outcome',
  options: [{ name: 'sides', description: 'Number of sides (default 6)', type: 4, required: false }],
  async execute(interaction) {
    const sides = interaction.options.getInteger('sides') || 6;
    if (sides < 2) return interaction.editReply('❌ Dice must have at least 2 sides.');
    if (sides > 1000) return interaction.editReply('❌ Maximum 1,000 sides.');

    const result = Math.floor(Math.random() * sides) + 1;
    const d6Emojis = { 1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅' };
    const diceIcon = (sides === 6 && d6Emojis[result]) ? d6Emojis[result] : '🎲';

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(`${diceIcon} Dice Roll Result`)
      .setDescription(`Rolling a **d${sides}**...\n\n# **You rolled a ${result}!**`)
      .addFields({ name: '📊 Range', value: `1 - ${sides}`, inline: true })
      .setFooter({ text: `Rolled by ${interaction.user.username}` })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};

export const rps = {
  name: 'rps',
  description: 'Challenge VePlexity Bot to Rock, Paper, Scissors',
  options: [
    {
      name: 'choice',
      description: 'Your chosen weapon',
      type: 3,
      required: true,
      choices: [
        { name: 'Rock 🪨', value: 'rock' },
        { name: 'Paper 📄', value: 'paper' },
        { name: 'Scissors ✂️', value: 'scissors' }
      ]
    }
  ],
  async execute(interaction) {
    const choice = interaction.options.getString('choice');
    const choices = ['rock', 'paper', 'scissors'];
    const botChoice = choices[Math.floor(Math.random() * 3)];
    const emoji = { rock: '🪨 Rock', paper: '📄 Paper', scissors: '✂️ Scissors' };

    let outcome, color;
    if (choice === botChoice) {
      outcome = "🤝 It's a dead tie! Great minds think alike.";
      color = 0x95a5a6;
    } else if (
      (choice === 'rock' && botChoice === 'scissors') ||
      (choice === 'paper' && botChoice === 'rock') ||
      (choice === 'scissors' && botChoice === 'paper')
    ) {
      outcome = "🎉 **You win!** You outsmarted the bot this round!";
      color = 0x2ecc71;
    } else {
      outcome = "😎 **I win!** Better luck next time, challenger.";
      color = 0xe74c3c;
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('⚔️ Rock Paper Scissors Duel')
      .addFields(
        { name: '👤 Your Pick', value: emoji[choice], inline: true },
        { name: '🤖 Bot Pick', value: emoji[botChoice], inline: true },
        { name: '🏆 Verdict', value: outcome }
      )
      .setFooter({ text: `Played with ${interaction.user.username}` })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};

export const ship = {
  name: 'ship',
  description: 'Calculate love compatibility between two users with a love meter',
  options: [
    { name: 'user1', description: 'First user', type: 6, required: true },
    { name: 'user2', description: 'Second user', type: 6, required: true }
  ],
  async execute(interaction) {
    const user1 = interaction.options.getUser('user1');
    const user2 = interaction.options.getUser('user2');
    const percent = Math.floor(Math.random() * 101);

    const barLength = 10;
    const filled = Math.round((percent / 100) * barLength);
    const bar = '💖'.repeat(filled) + '🖤'.repeat(barLength - filled);

    let verdict, titleEmoji;
    if (percent >= 90) {
      verdict = "💍 **True Soulmates.** The stars, galaxies, and universe have aligned for you two!";
      titleEmoji = '💖';
    } else if (percent >= 70) {
      verdict = "💕 **Strong Spark!** There's undeniable chemistry and great potential here.";
      titleEmoji = '💘';
    } else if (percent >= 45) {
      verdict = "⚖️ **Balanced Chemistry.** Could blossom into something sweet with a little effort.";
      titleEmoji = '💌';
    } else if (percent >= 20) {
      verdict = "🤝 **Strictly Friendzone.** Best to keep it as great buddies, honestly.";
      titleEmoji = '💔';
    } else {
      verdict = "💀 **Absolute Catastrophe.** Even AI cannot compute a worse combination.";
      titleEmoji = '🖤';
    }

    const embed = new EmbedBuilder()
      .setColor(0xff69b4)
      .setTitle(`${titleEmoji} Love Compatibility Calculator`)
      .setDescription(`### <@${user1.id}> × <@${user2.id}>\n\n**Match Meter:** \`[${percent}%]\`\n${bar}\n\n${verdict}`)
      .setThumbnail(user2.displayAvatarURL())
      .setFooter({ text: `Shipped by ${interaction.user.username}` })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};

export const roast = {
  name: 'roast',
  description: 'Unleash a witty, savage, AI-generated roast upon someone',
  options: [{ name: 'user', description: 'The brave target to roast', type: 6, required: true }],
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const roastText = await generateAiReply({
      prompt: `Write a short, hilarious, savage yet PG-13 playful roast (1-2 sentences) aimed at someone named ${target.username}. Make it punchy and witty without being hateful.`,
      maxTokens: 200
    });
    return interaction.editReply(`🔥 <@${target.id}>: **${roastText}**`);
  }
};

export const compliment = {
  name: 'compliment',
  description: 'Generate a heartfelt, AI-crafted compliment for someone special',
  options: [{ name: 'user', description: 'Who deserves some love and praise', type: 6, required: true }],
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const complimentText = await generateAiReply({
      prompt: `Write a warm, creative, genuinely uplifting compliment (1-2 sentences) for someone named ${target.username}. Make them smile!`,
      maxTokens: 200
    });
    return interaction.editReply(`💐 <@${target.id}>: **${complimentText}**`);
  }
};

export const fact = {
  name: 'fact',
  description: 'Get an intriguing, mind-blowing trivia fact',
  async execute(interaction) {
    let factText = null;
    try {
      const res = await fetch('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en');
      if (res.ok) {
        const data = await res.json();
        if (data.text) factText = data.text;
      }
    } catch (e) {}

    if (!factText) {
      factText = FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)];
    }

    const embed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle('🧠 Did You Know?')
      .setDescription(`### *"${factText}"*`)
      .setFooter({ text: 'Knowledge is power • VePlexity Facts' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};

export const wyr = {
  name: 'wyr',
  description: 'Spawn an interactive Would You Rather prompt with live voting buttons',
  async execute(interaction) {
    const raw = WYR_PROMPTS[Math.floor(Math.random() * WYR_PROMPTS.length)];
    const parts = raw.split(/,\s*or\s*/i);
    const optA = parts[0]?.replace(/^would you rather\s+/i, '').trim() || 'Option A';
    const optB = parts[1]?.replace(/\?$/, '').trim() || 'Option B';

    const votes = { a: new Set(), b: new Set() };

    function renderEmbed() {
      return new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('🤔 Would You Rather...')
        .setDescription(`**🅰️ Option A:**\n> ${optA}\n\n**🆚**\n\n**🅱️ Option B:**\n> ${optB}`)
        .addFields(
          { name: `🅰️ Votes: ${votes.a.size}`, value: votes.a.size > 0 ? Array.from(votes.a).map(id => `<@${id}>`).slice(0, 5).join(', ') : '*No votes yet*', inline: true },
          { name: `🅱️ Votes: ${votes.b.size}`, value: votes.b.size > 0 ? Array.from(votes.b).map(id => `<@${id}>`).slice(0, 5).join(', ') : '*No votes yet*', inline: true }
        )
        .setFooter({ text: 'Click a button below to cast your vote! (60s timer)' });
    }

    function renderButtons(disabled = false) {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('wyr_a').setLabel(`Option A (${votes.a.size})`).setStyle(ButtonStyle.Primary).setDisabled(disabled),
        new ButtonBuilder().setCustomId('wyr_b').setLabel(`Option B (${votes.b.size})`).setStyle(ButtonStyle.Danger).setDisabled(disabled)
      );
    }

    const msg = await interaction.editReply({
      embeds: [renderEmbed()],
      components: [renderButtons()]
    });

    const collector = msg.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async (btn) => {
      const isA = btn.customId === 'wyr_a';
      if (isA) {
        votes.a.add(btn.user.id);
        votes.b.delete(btn.user.id);
      } else {
        votes.b.add(btn.user.id);
        votes.a.delete(btn.user.id);
      }

      await btn.deferUpdate();
      await interaction.editReply({
        embeds: [renderEmbed()],
        components: [renderButtons()]
      }).catch(() => null);
    });

    collector.on('end', () => {
      interaction.editReply({
        embeds: [renderEmbed()],
        components: [renderButtons(true)]
      }).catch(() => null);
    });
  }
};

export const emojify = {
  name: 'emojify',
  description: 'Convert normal text into bold regional indicator emojis',
  options: [{ name: 'text', description: 'The text to convert', type: 3, required: true }],
  async execute(interaction) {
    const text = interaction.options.getString('text');
    const emojified = text.split('').map(ch => {
      const lower = ch.toLowerCase();
      if (/[a-z]/.test(lower)) return `:regional_indicator_${lower}:`;
      if (ch === ' ') return '   ';
      return ch;
    }).join(' ');

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('🔤 Emojified Text')
      .setDescription(emojified.slice(0, 4000))
      .setFooter({ text: `Requested by ${interaction.user.username}` });

    return interaction.editReply({ embeds: [embed] });
  }
};

export const rate = {
  name: 'rate',
  description: 'Rate anything on a precise 0 to 10 scale with a visual progress bar',
  options: [{ name: 'thing', description: 'What to rate', type: 3, required: true }],
  async execute(interaction) {
    const thing = interaction.options.getString('thing');
    const score = Math.floor(Math.random() * 11);

    const barLength = 10;
    const filled = '█'.repeat(score);
    const empty = '░'.repeat(barLength - score);
    const progressBar = `[${filled}${empty}]`;

    let commentary;
    if (score === 10) commentary = "Absolute perfection! 10/10 masterpiece. ⭐";
    else if (score >= 8) commentary = "Extremely high tier, highly recommended! 🔥";
    else if (score >= 5) commentary = "Decent, pretty average overall. 🤷";
    else if (score >= 2) commentary = "Not looking great, honestly pretty questionable. 😬";
    else commentary = "Trash tier. Complete disaster. 🗑️";

    const embed = new EmbedBuilder()
      .setColor(score >= 7 ? 0x2ecc71 : score >= 4 ? 0xf1c40f : 0xe74c3c)
      .setTitle('📊 Rate-O-Meter')
      .addFields(
        { name: '🎯 Subject', value: `**${thing}**` },
        { name: '⭐ Rating', value: `\`${progressBar}\` **${score}/10**` },
        { name: '💬 Verdict', value: commentary }
      )
      .setFooter({ text: `Evaluated for ${interaction.user.username}` })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};

// ─── BRAND NEW PREMIUM FUN & FLIRTY COMMANDS ─────────────────────────────────

export const truth = {
  name: 'truth',
  description: 'Get a spicy or thought-provoking Truth question',
  async execute(interaction) {
    const question = TRUTH_QUESTIONS[Math.floor(Math.random() * TRUTH_QUESTIONS.length)];
    return interaction.editReply(`🤫 **Truth Challenge for <@${interaction.user.id}>:**\n> "${question}"`);
  }
};

export const dare = {
  name: 'dare',
  description: 'Get a bold, hilarious Dare challenge to complete',
  async execute(interaction) {
    const challenge = DARE_CHALLENGES[Math.floor(Math.random() * DARE_CHALLENGES.length)];
    return interaction.editReply(`⚡ **Dare Challenge for <@${interaction.user.id}>:**\n> "${challenge}"`);
  }
};

export const joke = {
  name: 'joke',
  description: 'Get a fresh, funny joke to lighten the mood',
  async execute(interaction) {
    let jokeSetup = '', jokeDelivery = '';
    try {
      const res = await fetch('https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,racist,sexist&type=twopart');
      if (res.ok) {
        const data = await res.json();
        if (data.setup && data.delivery) {
          jokeSetup = data.setup;
          jokeDelivery = data.delivery;
        }
      }
    } catch (e) {}

    if (!jokeSetup) {
      jokeSetup = "Why don't scientists trust atoms?";
      jokeDelivery = "Because they make up everything! 😂";
    }

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('😂 Daily Dose of Humor')
      .setDescription(`### ${jokeSetup}\n\n||**${jokeDelivery}**||`)
      .setFooter({ text: 'Click the spoiler to reveal punchline!' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};

export const meme = {
  name: 'meme',
  description: 'Fetch a fresh, trending meme from Reddit',
  async execute(interaction) {
    try {
      const res = await fetch('https://meme-api.com/gimme');
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          const embed = new EmbedBuilder()
            .setColor(0xff4500)
            .setTitle(data.title || 'Fresh Meme')
            .setURL(data.postLink || 'https://reddit.com')
            .setImage(data.url)
            .setFooter({ text: `👍 ${data.ups || 0} upvotes • r/${data.subreddit || 'memes'}` });
          return interaction.editReply({ embeds: [embed] });
        }
      }
    } catch (e) {}

    return interaction.editReply('❌ Failed to fetch meme from Reddit right now. Try again in a second!');
  }
};

export const quote = {
  name: 'quote',
  description: 'Get an inspiring or philosophical quote from great thinkers',
  async execute(interaction) {
    const fallbackQuotes = [
      { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
      { quote: "It always seems impossible until it's done.", author: "Nelson Mandela" },
      { quote: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
      { quote: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
      { quote: "Be the change that you wish to see in the world.", author: "Mahatma Gandhi" }
    ];

    let q = null;
    try {
      const res = await fetch('https://api.quotable.io/random');
      if (res.ok) {
        const data = await res.json();
        if (data.content) q = { quote: data.content, author: data.author };
      }
    } catch (e) {}

    if (!q) q = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];

    const embed = new EmbedBuilder()
      .setColor(0x34495e)
      .setTitle('📜 Words of Wisdom')
      .setDescription(`*"${q.quote}"*\n\n— **${q.author}**`)
      .setFooter({ text: 'Inspirational Quotes' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};

export const trivia = {
  name: 'trivia',
  description: 'Test your knowledge with an interactive 4-choice trivia question',
  async execute(interaction) {
    try {
      const res = await fetch('https://opentdb.com/api.php?amount=1&type=multiple');
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const item = data.results[0];
          const decode = (str) => str.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

          const question = decode(item.question);
          const correct = decode(item.correct_answer);
          const options = [...item.incorrect_answers.map(decode), correct].sort(() => Math.random() - 0.5);

          const row = new ActionRowBuilder().addComponents(
            options.map((opt, idx) =>
              new ButtonBuilder()
                .setCustomId(`triv_${idx}`)
                .setLabel(opt.slice(0, 80))
                .setStyle(ButtonStyle.Secondary)
            )
          );

          const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle(`🧠 Trivia Challenge: ${item.category}`)
            .setDescription(`**Difficulty:** \`${item.difficulty.toUpperCase()}\`\n\n### ${question}`)
            .setFooter({ text: 'You have 20 seconds to choose your answer!' });

          const msg = await interaction.editReply({ embeds: [embed], components: [row] });
          const collector = msg.createMessageComponentCollector({ time: 20000 });

          collector.on('collect', async (btn) => {
            if (btn.user.id !== interaction.user.id) {
              return btn.reply({ content: '❌ This trivia question is for the command caller.', ephemeral: true });
            }

            const chosenIdx = parseInt(btn.customId.split('_')[1]);
            const chosen = options[chosenIdx];
            const isCorrect = chosen === correct;

            const resultEmbed = new EmbedBuilder()
              .setColor(isCorrect ? 0x2ecc71 : 0xe74c3c)
              .setTitle(isCorrect ? '🎉 Correct Answer!' : '❌ Wrong Answer!')
              .setDescription(`### ${question}\n\n**Your Answer:** ${chosen}\n**Correct Answer:** **${correct}**\n\n${isCorrect ? '🏆 Great job, genius!' : '💡 Better luck next round!'}`)
              .setFooter({ text: `Answered by ${interaction.user.username}` });

            await btn.update({ embeds: [resultEmbed], components: [] });
            collector.stop();
          });

          collector.on('end', (collected, reason) => {
            if (reason === 'time') {
              const timeoutEmbed = new EmbedBuilder()
                .setColor(0x95a5a6)
                .setTitle('⏱️ Trivia Time Expired!')
                .setDescription(`### ${question}\n\n**The correct answer was:** **${correct}**`);
              interaction.editReply({ embeds: [timeoutEmbed], components: [] }).catch(() => null);
            }
          });
          return;
        }
      }
    } catch (e) {}

    return interaction.editReply('❌ Failed to load trivia question. Please try again!');
  }
};

export const howgay = {
  name: 'howgay',
  description: 'Calculate someone\'s rainbow percentage on the Gay-O-Meter',
  options: [{ name: 'user', description: 'Target user (defaults to you)', type: 6, required: false }],
  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const percent = Math.floor(Math.random() * 101);

    const barLength = 10;
    const filled = Math.round((percent / 100) * barLength);
    const bar = '🏳️‍🌈'.repeat(filled) + '⬛'.repeat(barLength - filled);

    const embed = new EmbedBuilder()
      .setColor(0xff69b4)
      .setTitle('🌈 Gay-O-Meter Measurement')
      .setDescription(`### <@${target.id}> is **${percent}%** gay!\n\n${bar}`)
      .setThumbnail(target.displayAvatarURL())
      .setFooter({ text: '100% scientifically accurate • Just for fun' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};

export const simp = {
  name: 'simp',
  description: 'Calculate someone\'s simp rate on the Simp-O-Meter',
  options: [{ name: 'user', description: 'Target user (defaults to you)', type: 6, required: false }],
  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const percent = Math.floor(Math.random() * 101);

    const barLength = 10;
    const filled = Math.round((percent / 100) * barLength);
    const bar = '💖'.repeat(filled) + '🖤'.repeat(barLength - filled);

    let verdict;
    if (percent >= 90) verdict = "👑 **Supreme Simp Overlord.** Would donate their entire life savings in 0.2s.";
    else if (percent >= 70) verdict = "🥺 **High-Tier Simp.** Replies to DMs in under 3 milliseconds.";
    else if (percent >= 40) verdict = "😎 **Moderate Simp.** Has a soft spot but maintains dignity.";
    else if (percent >= 15) verdict = "🛡️ **Anti-Simp Guard.** Rarely simps, focused on the grind.";
    else verdict = "🗿 **Gigachad / Gigaqueen.** Immune to all forms of simping.";

    const embed = new EmbedBuilder()
      .setColor(0xff69b4)
      .setTitle('🥺 Simp-O-Meter')
      .setDescription(`### <@${target.id}> is **${percent}%** simp!\n\n${bar}\n\n${verdict}`)
      .setThumbnail(target.displayAvatarURL())
      .setFooter({ text: 'Certified Simp Measurement' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};

export const vibe = {
  name: 'vibe',
  description: 'Run an energetic vibe check on yourself or another member',
  options: [{ name: 'user', description: 'Who to vibe check (defaults to you)', type: 6, required: false }],
  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const vibes = [
      { name: "Immaculate Vibes ✨", desc: "Radiating pure sunshine, calmness, and good energy.", color: 0x2ecc71 },
      { name: "Chaotic Neutral 🌪️", desc: "Unpredictable energy. Might start a revolution or take a 4-hour nap.", color: 0xe67e22 },
      { name: "Unhinged Gremlin 👹", desc: "Running on 2 hours of sleep and caffeine. Approach with caution.", color: 0xe74c3c },
      { name: "Chill & Cozy ☕", desc: "Lofi beats, warm blanket, zero drama in life.", color: 0x3498db },
      { name: "Cottagecore Royalty 🌿", desc: "Living peacefully, picking flowers and baking fresh bread.", color: 0x27ae60 },
      { name: "Midnight Gamer 🎮", desc: "Locked in the zone with headphones on and Discord open 24/7.", color: 0x9b59b6 }
    ];

    const pick = vibes[Math.floor(Math.random() * vibes.length)];
    const score = Math.floor(Math.random() * 41) + 60; // 60-100%

    const embed = new EmbedBuilder()
      .setColor(pick.color)
      .setTitle('🔮 Vibe Check Results')
      .setDescription(`### <@${target.id}>'s Current Vibe:\n\n# **${pick.name}**\n\n> *"${pick.desc}"*\n\n**Vibe Rating:** \`${score}%\` match`)
      .setThumbnail(target.displayAvatarURL())
      .setFooter({ text: `Checked by ${interaction.user.username}` })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};

export const ratio = {
  name: 'ratio',
  description: 'Attempt to brutally ratio another member in the server',
  options: [{ name: 'user', description: 'Who to ratio', type: 6, required: true }],
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const isSuccess = Math.random() < 0.65; // 65% success rate

    const embed = new EmbedBuilder()
      .setColor(isSuccess ? 0x2ecc71 : 0xe74c3c)
      .setTitle(isSuccess ? '🏆 RATIO SUCCESSFUL!' : '❌ COUNTER-RATIOED!')
      .setDescription(isSuccess
        ? `🔥 <@${interaction.user.id}> has successfully **RATIOED** <@${target.id}> into oblivion!\n\n> *L + Ratio + No Maidens + Touch Grass + Fell Off 💀*`
        : `🤡 <@${interaction.user.id}> attempted to ratio <@${target.id}> and failed miserably!\n\n> *You got counter-ratioed! Take the L. 📉*`)
      .setThumbnail(target.displayAvatarURL())
      .setFooter({ text: 'Certified Discord Ratio Authority' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};

export const iq = {
  name: 'iq',
  description: 'Calculate someone\'s IQ score with a hilarious classification',
  options: [{ name: 'user', description: 'Target user (defaults to you)', type: 6, required: false }],
  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const score = Math.floor(Math.random() * 181) + 20; // 20 to 200

    let verdict;
    if (score >= 170) verdict = "🌌 **Galactic Brain 5000.** Solves quantum physics in their sleep.";
    else if (score >= 140) verdict = "🧠 **Certified Genius.** 500 IQ plays every single day.";
    else if (score >= 110) verdict = "💡 **Sharp & Clever.** Above average intellect.";
    else if (score >= 90) verdict = "🥪 **Average Human.** Can operate a toaster without manual.";
    else if (score >= 60) verdict = "🥔 **Potato Battery Level.** Occasionally forgets how to breathe.";
    else verdict = "🪨 **Room Temperature IQ.** Solid rock energy.";

    const embed = new EmbedBuilder()
      .setColor(score >= 110 ? 0x3498db : score >= 80 ? 0xf1c40f : 0xe74c3c)
      .setTitle('🧠 IQ Test Assessment')
      .setDescription(`### <@${target.id}>'s IQ Score:\n\n# **${score} IQ**\n\n${verdict}`)
      .setThumbnail(target.displayAvatarURL())
      .setFooter({ text: '100% totally legitimate scientific IQ assessment' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};

export const affirmation = {
  name: 'affirmation',
  description: 'Receive a boost of daily positive motivation and affirmation',
  async execute(interaction) {
    const quote = AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)];
    return interaction.editReply(`✨ **Daily Affirmation for <@${interaction.user.id}>:**\n> ${quote}`);
  }
};

export const flirt = {
  name: 'flirt',
  description: 'Generate a smooth, charming, AI-crafted flirty message for someone',
  options: [{ name: 'user', description: 'Who to flirt with', type: 6, required: true }],
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const flirtText = await generateAiReply({
      prompt: `Write a smooth, charming, clever, PG-13 flirty line (1-2 sentences) aimed at someone named ${target.username}. Make it sweet, charismatic and punchy.`,
      maxTokens: 200
    });
    return interaction.editReply(`💋 **<@${interaction.user.id}> flirts with <@${target.id}>:**\n> *"${flirtText}"*`);
  }
};

export const pickup = {
  name: 'pickup',
  description: 'Drop a smooth or cheesy pickup line',
  options: [{ name: 'user', description: 'Who to direct the pickup line to', type: 6, required: false }],
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const line = PICKUP_LINES[Math.floor(Math.random() * PICKUP_LINES.length)];

    if (target) {
      return interaction.editReply(`💘 **<@${interaction.user.id}> whispers to <@${target.id}>:**\n> *"${line}"*`);
    }
    return interaction.editReply(`💘 *"${line}"*`);
  }
};

// ─── MULTIPLAYER INTERACTIVE GAMES ──────────────────────────────────────────

export const tictactoe = {
  name: 'tictactoe',
  description: 'Challenge someone to Tic-Tac-Toe on an interactive button grid',
  options: [{ name: 'opponent', description: 'Who to challenge', type: 6, required: true }],
  async execute(interaction) {
    const opponent = interaction.options.getUser('opponent');
    if (opponent.bot) return interaction.editReply("❌ You can't challenge a bot.");
    if (opponent.id === interaction.user.id) return interaction.editReply("❌ You can't challenge yourself.");

    const board = Array(9).fill(null);
    let currentPlayer = interaction.user.id;
    const players = { [interaction.user.id]: '❌', [opponent.id]: '⭕' };

    function renderBoard(winner) {
      const rows = [];
      for (let i = 0; i < 9; i += 3) {
        rows.push(
          new ActionRowBuilder().addComponents(
            [0, 1, 2].map(j => {
              const idx = i + j;
              return new ButtonBuilder()
                .setCustomId(`ttt_${idx}`)
                .setLabel(board[idx] || '\u200b')
                .setStyle(board[idx] === '❌' ? ButtonStyle.Danger : board[idx] === '⭕' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                .setDisabled(!!board[idx] || !!winner);
            })
          )
        );
      }
      return rows;
    }

    function checkWinner() {
      const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
      for (const [a,b,c] of lines) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
      }
      if (board.every(cell => cell)) return 'draw';
      return null;
    }

    const msg = await interaction.editReply({
      content: `❌ <@${interaction.user.id}> vs ⭕ <@${opponent.id}>\nTurn: <@${currentPlayer}>`,
      components: renderBoard(null)
    });

    const collector = msg.createMessageComponentCollector({ time: 120000 });

    collector.on('collect', async (btn) => {
      if (btn.user.id !== currentPlayer) {
        return btn.reply({ content: '⏳ Not your turn.', ephemeral: true });
      }
      const idx = parseInt(btn.customId.split('_')[1]);
      if (board[idx]) return btn.deferUpdate();

      board[idx] = players[currentPlayer];
      const winner = checkWinner();

      if (winner === 'draw') {
        await btn.update({ content: `🤝 It's a draw!`, components: renderBoard(true) });
        collector.stop();
        return;
      }
      if (winner) {
        const winnerId = Object.keys(players).find(id => players[id] === winner);
        await btn.update({ content: `🏆 <@${winnerId}> wins!`, components: renderBoard(true) });
        collector.stop();
        return;
      }

      currentPlayer = currentPlayer === interaction.user.id ? opponent.id : interaction.user.id;
      await btn.update({
        content: `❌ <@${interaction.user.id}> vs ⭕ <@${opponent.id}>\nTurn: <@${currentPlayer}>`,
        components: renderBoard(null)
      });
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time') {
        interaction.editReply({ content: '⏱️ Game timed out.', components: renderBoard(true) }).catch(() => null);
      }
    });
  }
};

export const connect4 = {
  name: 'connect4',
  description: 'Challenge someone to Connect 4 with an interactive board',
  options: [{ name: 'opponent', description: 'Who to challenge', type: 6, required: true }],
  async execute(interaction) {
    const opponent = interaction.options.getUser('opponent');
    if (opponent.bot) return interaction.editReply("❌ You can't challenge a bot.");
    if (opponent.id === interaction.user.id) return interaction.editReply("❌ You can't challenge yourself.");

    const ROWS = 6, COLS = 7;
    const board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    let currentPlayer = interaction.user.id;
    const players = { [interaction.user.id]: '🔴', [opponent.id]: '🟡' };

    function renderText() {
      let out = '';
      for (let r = 0; r < ROWS; r++) out += board[r].map(cell => cell || '⚪').join('') + '\n';
      out += '1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣';
      return out;
    }
    function dropPiece(col, symbol) {
      for (let r = ROWS - 1; r >= 0; r--) if (!board[r][col]) { board[r][col] = symbol; return r; }
      return -1;
    }
    function checkWin(symbol) {
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        if (board[r][c] !== symbol) continue;
        for (const [dr, dc] of [[0,1],[1,0],[1,1],[1,-1]]) {
          let count = 1;
          for (let i = 1; i < 4; i++) {
            const nr = r + dr*i, nc = c + dc*i;
            if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || board[nr][nc] !== symbol) break;
            count++;
          }
          if (count >= 4) return true;
        }
      }
      return false;
    }
    function renderButtons(disabled) {
      const row1 = new ActionRowBuilder().addComponents(
        [0,1,2,3,4].map(c => new ButtonBuilder().setCustomId(`c4_${c}`).setLabel(`${c+1}`).setStyle(ButtonStyle.Secondary).setDisabled(disabled || board[0][c] !== null))
      );
      const row2 = new ActionRowBuilder().addComponents(
        [5,6].map(c => new ButtonBuilder().setCustomId(`c4_${c}`).setLabel(`${c+1}`).setStyle(ButtonStyle.Secondary).setDisabled(disabled || board[0][c] !== null))
      );
      return [row1, row2];
    }

    const msg = await interaction.editReply({
      content: `🔴 <@${interaction.user.id}> vs 🟡 <@${opponent.id}>\n${renderText()}\nTurn: <@${currentPlayer}>`,
      components: renderButtons(false)
    });
    const collector = msg.createMessageComponentCollector({ time: 180000 });

    collector.on('collect', async (btn) => {
      if (btn.user.id !== currentPlayer) return btn.reply({ content: '⏳ Not your turn.', ephemeral: true });
      const col = parseInt(btn.customId.split('_')[1]);
      const symbol = players[currentPlayer];
      if (dropPiece(col, symbol) === -1) return btn.deferUpdate();

      if (checkWin(symbol)) {
        await btn.update({ content: `🏆 <@${currentPlayer}> wins Connect 4!\n${renderText()}`, components: renderButtons(true) });
        collector.stop();
        return;
      }
      if (board.every(r => r.every(c => c))) {
        await btn.update({ content: `🤝 It's a draw!\n${renderText()}`, components: renderButtons(true) });
        collector.stop();
        return;
      }
      currentPlayer = currentPlayer === interaction.user.id ? opponent.id : interaction.user.id;
      await btn.update({
        content: `🔴 <@${interaction.user.id}> vs 🟡 <@${opponent.id}>\n${renderText()}\nTurn: <@${currentPlayer}>`,
        components: renderButtons(false)
      });
    });
    collector.on('end', (collected, reason) => {
      if (reason === 'time') interaction.editReply({ content: '⏱️ Game timed out.', components: renderButtons(true) }).catch(() => null);
    });
  }
};

export const rpsduel = {
  name: 'rpsduel',
  description: 'Challenge someone to a 2-player secret Rock Paper Scissors duel',
  options: [{ name: 'opponent', description: 'Who to challenge', type: 6, required: true }],
  async execute(interaction) {
    const opponent = interaction.options.getUser('opponent');
    if (opponent.bot) return interaction.editReply("❌ You can't challenge a bot.");
    if (opponent.id === interaction.user.id) return interaction.editReply("❌ You can't challenge yourself.");

    const choices = {};
    const emoji = { rock: '🪨', paper: '📄', scissors: '✂️' };
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('rpsd_rock').setLabel('Rock 🪨').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('rpsd_paper').setLabel('Paper 📄').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('rpsd_scissors').setLabel('Scissors ✂️').setStyle(ButtonStyle.Secondary)
    );
    const msg = await interaction.editReply({
      content: `⚔️ <@${interaction.user.id}> challenges <@${opponent.id}> to RPS! Both players click your move below.`,
      components: [row]
    });
    const collector = msg.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async (btn) => {
      if (![interaction.user.id, opponent.id].includes(btn.user.id)) {
        return btn.reply({ content: "❌ This isn't your duel.", ephemeral: true });
      }
      if (choices[btn.user.id]) return btn.reply({ content: '✅ You already picked.', ephemeral: true });
      choices[btn.user.id] = btn.customId.split('_')[1];
      await btn.reply({ content: `You picked ${emoji[choices[btn.user.id]]} ${choices[btn.user.id]}!`, ephemeral: true });

      if (Object.keys(choices).length === 2) {
        const p1 = interaction.user.id, p2 = opponent.id;
        const c1 = choices[p1], c2 = choices[p2];
        let result;
        if (c1 === c2) result = "🤝 It's a tie!";
        else if ((c1 === 'rock' && c2 === 'scissors') || (c1 === 'paper' && c2 === 'rock') || (c1 === 'scissors' && c2 === 'paper')) result = `🏆 <@${p1}> wins!`;
        else result = `🏆 <@${p2}> wins!`;
        await interaction.editReply({
          content: `⚔️ **Results:**\n<@${p1}>: ${emoji[c1]} ${c1}\n<@${p2}>: ${emoji[c2]} ${c2}\n\n${result}`,
          components: []
        });
        collector.stop();
      }
    });
    collector.on('end', (collected, reason) => {
      if (reason === 'time' && Object.keys(choices).length < 2) {
        interaction.editReply({ content: '⏱️ Duel timed out — someone didn\'t pick in time.', components: [] }).catch(() => null);
      }
    });
  }
};
