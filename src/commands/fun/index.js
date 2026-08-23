import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { GoogleGenAI } from '@google/genai';
import { FALLBACK_ACTION_GIFS } from '../../config/constants.js';
import { buildEmbed } from '../../utils/embeds.js';
import db from '../../services/database.js';

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
  punch: 'punched'
};

async function fetchActionGif(category) {
  try {
    const res = await fetch(`https://api.otakugifs.xyz/gif?reaction=${category}`);
    if (res.ok) {
      const data = await res.json();
      if (data.url) return data.url;
    }
  } catch (e) {}

  // Fallback to our curated working gif list
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

// Action commands
export const pat = { name: 'pat', description: 'Pat someone', options: [{ name: 'user', description: 'Who to pat', type: 6, required: true }], execute: (i) => handleAction(i, 'pat') };
export const hug = { name: 'hug', description: 'Hug someone', options: [{ name: 'user', description: 'Who to hug', type: 6, required: true }], execute: (i) => handleAction(i, 'hug') };
export const kiss = { name: 'kiss', description: 'Kiss someone', options: [{ name: 'user', description: 'Who to kiss', type: 6, required: true }], execute: (i) => handleAction(i, 'kiss') };
export const slap = { name: 'slap', description: 'Slap someone', options: [{ name: 'user', description: 'Who to slap', type: 6, required: true }], execute: (i) => handleAction(i, 'slap') };
export const bite = { name: 'bite', description: 'Bite someone with a fun anime gif', options: [{ name: 'user', description: 'Who to bite', type: 6, required: true }], execute: (i) => handleAction(i, 'bite') };
export const tickle = { name: 'tickle', description: 'Tickle someone', options: [{ name: 'user', description: 'Who to tickle', type: 6, required: true }], execute: (i) => handleAction(i, 'tickle') };
export const cuddle = { name: 'cuddle', description: 'Cuddle someone', options: [{ name: 'user', description: 'Who to cuddle', type: 6, required: true }], execute: (i) => handleAction(i, 'cuddle') };
export const poke = { name: 'poke', description: 'Poke someone', options: [{ name: 'user', description: 'Who to poke', type: 6, required: true }], execute: (i) => handleAction(i, 'poke') };

export const summon = {
  name: 'summon',
  description: 'Summon someone with a dramatic gif and announcement',
  options: [
    { name: 'user', description: 'User to summon', type: 6, required: true }
  ],
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

    return interaction.editReply({
      embeds: [embed]
    });
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
    return interaction.editReply(`🤖 Chatbot mode **${enabled ? 'enabled' : 'disabled'}**. ${enabled ? 'Mention me anywhere in this server and I\'ll respond!' : ''}`);
  }
};

export const eightball = {
  name: '8ball',
  description: 'Ask the magic 8-ball a question',
  options: [{ name: 'question', description: 'Your question', type: 3, required: true }],
  async execute(interaction) {
    const question = interaction.options.getString('question');
    const answers = [
      "It is certain.", "Without a doubt.", "Yes, definitely.", "You may rely on it.",
      "Most likely.", "Signs point to yes.", "Reply hazy, try again.", "Ask again later.",
      "Cannot predict now.", "Don't count on it.", "My reply is no.", "Outlook not so good.", "Very doubtful."
    ];
    const answer = answers[Math.floor(Math.random() * answers.length)];
    return interaction.editReply(`🎱 **Question:** ${question}\n🔮 **Answer:** ${answer}`);
  }
};

export const coinflip = {
  name: 'coinflip',
  description: 'Flip a coin',
  async execute(interaction) {
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    return interaction.editReply(`🪙 The coin landed on **${result}**!`);
  }
};

export const roll = {
  name: 'roll',
  description: 'Roll a dice',
  options: [{ name: 'sides', description: 'Number of sides (default 6)', type: 4, required: false }],
  async execute(interaction) {
    const sides = interaction.options.getInteger('sides') || 6;
    if (sides < 2) return interaction.editReply('❌ Dice need at least 2 sides.');
    const result = Math.floor(Math.random() * sides) + 1;
    return interaction.editReply(`🎲 You rolled a **${result}** (out of ${sides}).`);
  }
};

export const rps = {
  name: 'rps',
  description: 'Rock, paper, scissors against the bot',
  options: [
    {
      name: 'choice',
      description: 'Your move',
      type: 3,
      required: true,
      choices: [
        { name: 'rock', value: 'rock' },
        { name: 'paper', value: 'paper' },
        { name: 'scissors', value: 'scissors' }
      ]
    }
  ],
  async execute(interaction) {
    const choice = interaction.options.getString('choice');
    const choices = ['rock', 'paper', 'scissors'];
    const botChoice = choices[Math.floor(Math.random() * 3)];
    let result;
    if (choice === botChoice) result = "It's a tie!";
    else if (
      (choice === 'rock' && botChoice === 'scissors') ||
      (choice === 'paper' && botChoice === 'rock') ||
      (choice === 'scissors' && botChoice === 'paper')
    ) result = "You win! 🎉";
    else result = "I win! 😎";

    const emoji = { rock: '🪨', paper: '📄', scissors: '✂️' };
    return interaction.editReply(`You chose ${emoji[choice]} **${choice}**\nI chose ${emoji[botChoice]} **${botChoice}**\n\n${result}`);
  }
};

export const ship = {
  name: 'ship',
  description: 'Calculate love compatibility between two users',
  options: [
    { name: 'user1', description: 'First user', type: 6, required: true },
    { name: 'user2', description: 'Second user', type: 6, required: true }
  ],
  async execute(interaction) {
    const user1 = interaction.options.getUser('user1');
    const user2 = interaction.options.getUser('user2');
    const percent = Math.floor(Math.random() * 101);
    const barLength = 20;
    const filled = Math.round((percent / 100) * barLength);
    const bar = '💖'.repeat(Math.max(Math.round(filled / 2), 0)) + '🖤'.repeat(Math.max(Math.round((barLength - filled) / 2), 0));
    let verdict;
    if (percent >= 90) verdict = "Soulmates. It's written in the stars. ✨";
    else if (percent >= 70) verdict = "Strong potential here! 💕";
    else if (percent >= 40) verdict = "Could go either way, honestly.";
    else if (percent >= 15) verdict = "...it's giving 'just friends' energy.";
    else verdict = "Yeah, hard pass from the universe on this one. 💀";
    return interaction.editReply(`💘 **${user1.username}** × **${user2.username}**\n${bar}\n**${percent}%** compatible\n${verdict}`);
  }
};

export const tictactoe = {
  name: 'tictactoe',
  description: 'Challenge someone to Tic-Tac-Toe',
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
  description: 'Challenge someone to Connect 4',
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
  description: 'Challenge someone to Rock Paper Scissors duel',
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
      content: `⚔️ <@${interaction.user.id}> challenges <@${opponent.id}> to RPS! Both players pick your move.`,
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

export const roast = {
  name: 'roast',
  description: 'Get an AI-generated playful roast',
  options: [{ name: 'user', description: 'Who to roast', type: 6, required: true }],
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    try {
      const response = await gemini.models.generateContent({
        model: 'gemini-flash-latest',
        contents: [{ role: 'user', parts: [{ text: `Write a short, hilarious, PG-13 playful roast (1-2 sentences) aimed at someone named ${target.username}. Keep it witty and lighthearted.` }] }],
        config: { thinkingConfig: { thinkingBudget: 0 }, maxOutputTokens: 200 }
      });
      const text = response.text?.trim() || `${target.username} is so mysterious even Gemini gave up trying to roast them.`;
      return interaction.editReply(`🔥 <@${target.id}>: ${text}`);
    } catch (e) {
      return interaction.editReply(`🔥 <@${target.id}>: You got off lucky, my brain is taking a quick break.`);
    }
  }
};

export const compliment = {
  name: 'compliment',
  description: 'Get an AI-generated compliment',
  options: [{ name: 'user', description: 'Who to compliment', type: 6, required: true }],
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    try {
      const response = await gemini.models.generateContent({
        model: 'gemini-flash-latest',
        contents: [{ role: 'user', parts: [{ text: `Write a short, warm, genuine compliment (1-2 sentences) for someone named ${target.username}.` }] }],
        config: { thinkingConfig: { thinkingBudget: 0 }, maxOutputTokens: 200 }
      });
      const text = response.text?.trim() || `${target.username} brings great vibes to the server!`;
      return interaction.editReply(`💐 <@${target.id}>: ${text}`);
    } catch (e) {
      return interaction.editReply(`💐 <@${target.id}>: You're an awesome person and valued member of this server!`);
    }
  }
};

export const fact = {
  name: 'fact',
  description: 'Get a random fun fact',
  async execute(interaction) {
    const facts = [
      "Bananas are berries, but strawberries aren't.",
      "Octopuses have three hearts.",
      "A day on Venus is longer than a year on Venus.",
      "Honey never spoils — archaeologists have found 3000-year-old honey that's still edible.",
      "Wombat poop is cube-shaped.",
      "The Eiffel Tower grows taller in summer due to heat expansion.",
      "Sharks existed before trees.",
      "There are more possible chess games than atoms in the observable universe.",
      "Sea otters hold hands while sleeping so they don't drift apart.",
      "A group of flamingos is called a 'flamboyance'.",
      "Your stomach gets an entirely new lining every 3-4 days.",
      "Cows have best friends and get stressed when separated.",
      "The shortest war in history lasted 38 minutes.",
      "Bananas are slightly radioactive.",
      "Scotland's national animal is the unicorn."
    ];
    return interaction.editReply(`🧠 ${facts[Math.floor(Math.random() * facts.length)]}`);
  }
};

export const wyr = {
  name: 'wyr',
  description: 'Get a random "would you rather" prompt',
  async execute(interaction) {
    const prompts = [
      "have the ability to fly, or be invisible?",
      "always be 10 minutes late, or always be 20 minutes early?",
      "fight one horse-sized duck, or 100 duck-sized horses?",
      "know when you're going to die, or how you're going to die?",
      "have unlimited money but no friends, or unlimited friends but no money?",
      "be able to talk to animals, or speak every human language?",
      "lose all your memories, or never make new ones again?",
      "live without music, or live without movies?",
      "always say what's on your mind, or never speak again?",
      "have a rewind button, or a pause button on life?"
    ];
    return interaction.editReply(`🤔 **Would you rather...** ${prompts[Math.floor(Math.random() * prompts.length)]}`);
  }
};

export const emojify = {
  name: 'emojify',
  description: 'Turn text into emoji letters',
  options: [{ name: 'text', description: 'Text to emojify', type: 3, required: true }],
  async execute(interaction) {
    const text = interaction.options.getString('text');
    const emojified = text.split('').map(ch => {
      const lower = ch.toLowerCase();
      if (/[a-z]/.test(lower)) return `:regional_indicator_${lower}:`;
      if (ch === ' ') return '   ';
      return ch;
    }).join(' ');
    return interaction.editReply(emojified.slice(0, 2000));
  }
};
