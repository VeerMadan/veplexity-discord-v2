import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import db from '../../services/database.js';

const CURRENCY = '₹';

function formatMoney(amount) {
  return `${CURRENCY}${Number(amount || 0).toLocaleString('en-IN')}`;
}

// ─── 1. BALANCE & BANKING ───────────────────────────────────────────────────

export const balance = {
  name: 'balance',
  description: 'Check your wallet, bank vault, or deposit/withdraw cash to stay safe from robbers',
  options: [
    { name: 'user', description: 'User to check (defaults to you)', type: 6, required: false },
    {
      name: 'bank_action',
      description: 'Quickly deposit or withdraw all cash into your safe bank vault',
      type: 3,
      required: false,
      choices: [
        { name: '🏦 Deposit All Wallet Cash to Bank', value: 'deposit_all' },
        { name: '💵 Withdraw All Bank Cash to Wallet', value: 'withdraw_all' }
      ]
    }
  ],
  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const action = interaction.options.getString('bank_action');
    const profile = db.getUser(target.id);

    let actionNotice = '';
    if (action && target.id === interaction.user.id) {
      if (action === 'deposit_all' && profile.wallet > 0) {
        const amt = profile.wallet;
        db.updateUser(target.id, { wallet: 0, bank: profile.bank + amt });
        actionNotice = `✅ Deposited **${formatMoney(amt)}** into your bank vault! Robbers can't touch it now.\n\n`;
      } else if (action === 'withdraw_all' && profile.bank > 0) {
        const amt = profile.bank;
        db.updateUser(target.id, { wallet: profile.wallet + amt, bank: 0 });
        actionNotice = `✅ Withdrew **${formatMoney(amt)}** to your wallet!\n\n`;
      }
    }

    const updated = db.getUser(target.id);
    const total = updated.wallet + updated.bank;

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle(`💳 ${target.username}'s Vault & Balance`)
      .setDescription(actionNotice || `Here is the financial breakdown for <@${target.id}>:`)
      .addFields(
        { name: '👛 Wallet (Robbable)', value: `**${formatMoney(updated.wallet)}**`, inline: true },
        { name: '🏦 Bank Vault (Safe)', value: `**${formatMoney(updated.bank)}**`, inline: true },
        { name: '💎 Net Worth', value: `**${formatMoney(total)}**`, inline: true }
      )
      .setThumbnail(target.displayAvatarURL())
      .setFooter({ text: 'Tip: Use /balance bank_action:Deposit All to protect your money from /rob!' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};

// ─── 2. DAILY REWARD ────────────────────────────────────────────────────────

export const daily = {
  name: 'daily',
  description: 'Claim your daily cash reward and build your streak bonus',
  async execute(interaction) {
    const userId = interaction.user.id;
    const profile = db.getUser(userId);
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;

    if (now - profile.lastDaily < cooldown) {
      const nextClaim = Math.floor((profile.lastDaily + cooldown) / 1000);
      return interaction.editReply(`⏳ Chill bro! You already claimed your daily bag. Come back <t:${nextClaim}:R>.`);
    }

    const isStreakAlive = (now - profile.lastDaily) < (48 * 60 * 60 * 1000);
    const streak = isStreakAlive ? (profile.dailyStreak || 0) + 1 : 1;
    const baseReward = 1500;
    const streakBonus = Math.min(streak * 250, 5000);
    const totalReward = baseReward + streakBonus;

    db.updateUser(userId, {
      wallet: profile.wallet + totalReward,
      lastDaily: now,
      dailyStreak: streak
    });

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('💰 Daily Bag Claimed!')
      .setDescription(`You collected **${formatMoney(totalReward)}**!`)
      .addFields(
        { name: '💵 Base Pay', value: formatMoney(baseReward), inline: true },
        { name: '🔥 Streak Bonus', value: `${formatMoney(streakBonus)} (${streak}d streak)`, inline: true },
        { name: '👛 New Wallet', value: formatMoney(profile.wallet + totalReward), inline: true }
      )
      .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};

// ─── 3. WORK SHIFT ──────────────────────────────────────────────────────────

export const work = {
  name: 'work',
  description: 'Work a chaotic side-hustle shift to earn cash (10m cooldown)',
  async execute(interaction) {
    const userId = interaction.user.id;
    const profile = db.getUser(userId);
    const now = Date.now();
    const cooldown = 10 * 60 * 1000; // 10 mins

    if (now - profile.lastWork < cooldown) {
      const readyAt = Math.floor((profile.lastWork + cooldown) / 1000);
      return interaction.editReply(`😮‍💨 You're still recovering from your last shift! Next shift available <t:${readyAt}:R>.`);
    }

    const jobs = [
      { text: 'sold viral memes to corporate brands and made', min: 400, max: 1100 },
      { text: 'set up a late-night Tapri chai stall for coding insomniacs and earned', min: 500, max: 1200 },
      { text: 'moderated a chaotic Discord server for 2 hours and got paid', min: 600, max: 1400 },
      { text: 'fixed a production bug by restarting the server and billed the client', min: 800, max: 1600 },
      { text: 'worked as a stunt double in a Bollywood action scene and pocketed', min: 500, max: 1300 },
      { text: 'scalped concert tickets outside the stadium and walked away with', min: 700, max: 1500 },
      { text: 'carried a wealthy noob to Radiant in Valorant and got tipped', min: 600, max: 1400 }
    ];

    const pick = jobs[Math.floor(Math.random() * jobs.length)];
    const earned = Math.floor(Math.random() * (pick.max - pick.min + 1)) + pick.min;

    db.updateUser(userId, {
      wallet: profile.wallet + earned,
      lastWork: now
    });

    return interaction.editReply(`💼 **<@${userId}>** ${pick.text} **${formatMoney(earned)}**! *(Wallet: ${formatMoney(profile.wallet + earned)})*`);
  }
};

// ─── 4. ROB / STEAL ─────────────────────────────────────────────────────────

export const rob = {
  name: 'rob',
  description: 'Attempt a high-stakes robbery on another member\'s wallet',
  options: [{ name: 'target', description: 'Who to rob', type: 6, required: true }],
  async execute(interaction) {
    const target = interaction.options.getUser('target');
    const robberId = interaction.user.id;

    if (target.bot) return interaction.editReply('❌ You cannot rob a bot—they have laser defense systems.');
    if (target.id === robberId) return interaction.editReply('🤡 Trying to rob yourself? Touch some grass bro.');

    const robber = db.getUser(robberId);
    const victim = db.getUser(target.id);
    const now = Date.now();
    const cooldown = 15 * 60 * 1000; // 15m

    if (now - robber.lastRob < cooldown) {
      const nextRob = Math.floor((robber.lastRob + cooldown) / 1000);
      return interaction.editReply(`🚓 Police are still patrolling from your last heist! Lay low until <t:${nextRob}:R>.`);
    }

    if (victim.wallet < 250) {
      return interaction.editReply(`💸 <@${target.id}> is too broke in their wallet (${formatMoney(victim.wallet)}) to be worth robbing!`);
    }

    if (robber.wallet < 250) {
      return interaction.editReply(`❌ You need at least **${formatMoney(250)}** in your wallet to risk a heist!`);
    }

    const success = Math.random() < 0.45; // 45% success rate
    if (success) {
      const percent = (Math.floor(Math.random() * 31) + 20) / 100; // 20% to 50%
      const stolen = Math.max(100, Math.floor(victim.wallet * percent));

      db.updateUser(robberId, { wallet: robber.wallet + stolen, lastRob: now });
      db.updateUser(target.id, { wallet: Math.max(0, victim.wallet - stolen) });

      return interaction.editReply(`🥷 **HEIST SUCCESSFUL!** <@${robberId}> snuck up on <@${target.id}> and ran off with **${formatMoney(stolen)}**! 🏃‍♂️💨`);
    } else {
      const fine = Math.min(robber.wallet, Math.max(200, Math.floor(robber.wallet * 0.25)));
      db.updateUser(robberId, { wallet: robber.wallet - fine, lastRob: now });
      db.updateUser(target.id, { wallet: victim.wallet + fine });

      return interaction.editReply(`🚨 **BUSTED IN 4K!** <@${robberId}> tried to rob <@${target.id}>, tripped over their own shoelaces, and had to pay <@${target.id}> **${formatMoney(fine)}** in damages! 🤡`);
    }
  }
};

// ─── 5. PAY / TRANSFER ──────────────────────────────────────────────────────

export const pay = {
  name: 'pay',
  description: 'Send cash from your wallet to another user',
  options: [
    { name: 'user', description: 'Recipient', type: 6, required: true },
    { name: 'amount', description: 'Amount to send', type: 4, required: true }
  ],
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const senderId = interaction.user.id;

    if (target.bot || target.id === senderId) return interaction.editReply('❌ Invalid recipient.');
    if (amount <= 0) return interaction.editReply('❌ Enter a positive amount.');

    const sender = db.getUser(senderId);
    if (sender.wallet < amount) {
      return interaction.editReply(`❌ You don't have enough in your wallet! (Current Wallet: **${formatMoney(sender.wallet)}**)`);
    }

    const receiver = db.getUser(target.id);
    db.updateUser(senderId, { wallet: sender.wallet - amount });
    db.updateUser(target.id, { wallet: receiver.wallet + amount });

    return interaction.editReply(`💸 **<@${senderId}>** transferred **${formatMoney(amount)}** to **<@${target.id}>**!`);
  }
};

// ─── 6. INTERACTIVE BLACKJACK ───────────────────────────────────────────────

export const blackjack = {
  name: 'blackjack',
  description: 'Play interactive Casino Blackjack with Hit, Stand & Double Down buttons',
  options: [{ name: 'bet', description: 'Amount to bet', type: 4, required: true }],
  async execute(interaction) {
    let bet = interaction.options.getInteger('bet');
    const userId = interaction.user.id;
    const profile = db.getUser(userId);

    if (bet < 50) return interaction.editReply(`❌ Minimum bet is **${formatMoney(50)}**.`);
    if (profile.wallet < bet) return interaction.editReply(`❌ You only have **${formatMoney(profile.wallet)}** in your wallet!`);

    // Deduct initial bet
    db.addMoney(userId, -bet);

    const suits = ['♠️', '♥️', '♦️', '♣️'];
    const ranks = [
      { r: 'A', v: 11 }, { r: '2', v: 2 }, { r: '3', v: 3 }, { r: '4', v: 4 },
      { r: '5', v: 5 }, { r: '6', v: 6 }, { r: '7', v: 7 }, { r: '8', v: 8 },
      { r: '9', v: 9 }, { r: '10', v: 10 }, { r: 'J', v: 10 }, { r: 'Q', v: 10 }, { r: 'K', v: 10 }
    ];

    function drawCard() {
      const rank = ranks[Math.floor(Math.random() * ranks.length)];
      const suit = suits[Math.floor(Math.random() * suits.length)];
      return { label: `${rank.r}${suit}`, value: rank.v, isAce: rank.r === 'A' };
    }

    function calcScore(hand) {
      let sum = hand.reduce((acc, c) => acc + c.value, 0);
      let aces = hand.filter(c => c.isAce).length;
      while (sum > 21 && aces > 0) {
        sum -= 10;
        aces--;
      }
      return sum;
    }

    const playerHand = [drawCard(), drawCard()];
    const dealerHand = [drawCard(), drawCard()];

    function buildBjEmbed(revealDealer = false, outcomeText = null, color = 0x3498db) {
      const pScore = calcScore(playerHand);
      const dScore = revealDealer ? calcScore(dealerHand) : dealerHand[0].value;
      const dCards = revealDealer
        ? dealerHand.map(c => `\`${c.label}\``).join(' ')
        : `\`${dealerHand[0].label}\` \`🎴\``;

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('🃏 VePlexity High-Roller Blackjack')
        .setDescription(outcomeText || `Bet on table: **${formatMoney(bet)}**`)
        .addFields(
          { name: `👤 Your Hand (${pScore})`, value: playerHand.map(c => `\`${c.label}\``).join(' '), inline: true },
          { name: `🤵 Dealer Hand (${revealDealer ? dScore : '?'})`, value: dCards, inline: true }
        )
        .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() });

      return embed;
    }

    function getButtons(disabled = false, canDouble = false) {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('bj_hit').setLabel('Hit 🃏').setStyle(ButtonStyle.Primary).setDisabled(disabled),
        new ButtonBuilder().setCustomId('bj_stand').setLabel('Stand 🛑').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId('bj_double').setLabel('Double Down 🔥').setStyle(ButtonStyle.Success).setDisabled(disabled || !canDouble)
      );
    }

    const initialScore = calcScore(playerHand);
    if (initialScore === 21) {
      const payout = Math.floor(bet * 2.5);
      db.addMoney(userId, payout);
      return interaction.editReply({
        embeds: [buildBjEmbed(true, `🎉 **NATURAL BLACKJACK!** You won **${formatMoney(payout)}**!`, 0x2ecc71)]
      });
    }

    const canDouble = db.getUser(userId).wallet >= bet;
    const msg = await interaction.editReply({
      embeds: [buildBjEmbed(false)],
      components: [getButtons(false, canDouble)],
      fetchReply: true
    });

    const collector = msg.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async i => {
      if (i.user.id !== userId) {
        return i.reply({ content: '❌ This is not your Blackjack table!', ephemeral: true });
      }

      if (i.customId === 'bj_double') {
        const curr = db.getUser(userId);
        if (curr.wallet < bet) {
          return i.reply({ content: '❌ Not enough cash in wallet to double down!', ephemeral: true });
        }
        db.addMoney(userId, -bet);
        bet *= 2;
        playerHand.push(drawCard());
        collector.stop('stand');
        await finishGame(i);
        return;
      }

      if (i.customId === 'bj_hit') {
        playerHand.push(drawCard());
        if (calcScore(playerHand) >= 21) {
          collector.stop('done');
          await finishGame(i);
        } else {
          await i.update({
            embeds: [buildBjEmbed(false)],
            components: [getButtons(false, false)]
          });
        }
      } else if (i.customId === 'bj_stand') {
        collector.stop('stand');
        await finishGame(i);
      }
    });

    async function finishGame(btnInteraction) {
      const pScore = calcScore(playerHand);
      if (pScore > 21) {
        await btnInteraction.update({
          embeds: [buildBjEmbed(true, `💥 **BUSTED (${pScore})!** You lost **${formatMoney(bet)}**.`, 0xe74c3c)],
          components: [getButtons(true, false)]
        });
        return;
      }

      while (calcScore(dealerHand) < 17) {
        dealerHand.push(drawCard());
      }

      const dScore = calcScore(dealerHand);
      let outcome, color;

      if (dScore > 21 || pScore > dScore) {
        const payout = bet * 2;
        db.addMoney(userId, payout);
        outcome = `🏆 **YOU WIN!** Dealer had ${dScore}. You pocketed **${formatMoney(payout)}**!`;
        color = 0x2ecc71;
      } else if (pScore === dScore) {
        db.addMoney(userId, bet);
        outcome = `🤝 **PUSH (TIE)!** Your **${formatMoney(bet)}** bet has been returned.`;
        color = 0xf1c40f;
      } else {
        outcome = `💀 **DEALER WINS (${dScore} vs ${pScore})!** You lost **${formatMoney(bet)}**.`;
        color = 0xe74c3c;
      }

      await btnInteraction.update({
        embeds: [buildBjEmbed(true, outcome, color)],
        components: [getButtons(true, false)]
      });
    }

    collector.on('end', (_, reason) => {
      if (reason === 'time') {
        interaction.editReply({
          embeds: [buildBjEmbed(true, `⏰ **Table Timed Out!** You forfeited **${formatMoney(bet)}**.`, 0x95a5a6)],
          components: [getButtons(true, false)]
        }).catch(() => {});
      }
    });
  }
};

// ─── 7. CASINO SLOTS ────────────────────────────────────────────────────────

export const slots = {
  name: 'slots',
  description: 'Spin the Vegas Slot Machine for up to 10x jackpot payouts',
  options: [{ name: 'bet', description: 'Amount to bet', type: 4, required: true }],
  async execute(interaction) {
    const bet = interaction.options.getInteger('bet');
    const userId = interaction.user.id;
    const profile = db.getUser(userId);

    if (bet < 50) return interaction.editReply(`❌ Minimum bet is **${formatMoney(50)}**.`);
    if (profile.wallet < bet) return interaction.editReply(`❌ You don't have enough cash in your wallet!`);

    const symbols = ['🍒', '🍋', '🍇', '🔔', '7️⃣', '💎'];
    const r1 = symbols[Math.floor(Math.random() * symbols.length)];
    const r2 = symbols[Math.floor(Math.random() * symbols.length)];
    const r3 = symbols[Math.floor(Math.random() * symbols.length)];

    let multiplier = 0;
    if (r1 === r2 && r2 === r3) {
      multiplier = r1 === '💎' ? 10 : r1 === '7️⃣' ? 7 : 4;
    } else if (r1 === r2 || r2 === r3 || r1 === r3) {
      multiplier = 1.8;
    }

    const payout = Math.floor(bet * multiplier);
    const netChange = payout - bet;
    db.addMoney(userId, netChange);

    const embed = new EmbedBuilder()
      .setColor(multiplier > 0 ? 0x2ecc71 : 0xe74c3c)
      .setTitle('🎰 VePlexity Vegas Slots')
      .setDescription(
        `### ╔═══════════╗\n` +
        `### ║ ${r1} │ ${r2} │ ${r3} ║\n` +
        `### ╚═══════════╝\n\n` +
        (multiplier > 0
          ? `🎉 **WINNER (${multiplier}x)!** You won **${formatMoney(payout)}**!`
          : `💀 **No match!** You lost **${formatMoney(bet)}**.`)
      )
      .setFooter({ text: `New Wallet: ${formatMoney(db.getUser(userId).wallet)}` })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};

// ─── 8. CASINO ROULETTE ─────────────────────────────────────────────────────

export const roulette = {
  name: 'roulette',
  description: 'Spin the Roulette wheel (Red 2x, Black 2x, or Green 14x!)',
  options: [
    { name: 'bet', description: 'Amount to bet', type: 4, required: true },
    {
      name: 'color',
      description: 'Color to bet on',
      type: 3,
      required: true,
      choices: [
        { name: '🔴 Red (2x Payout)', value: 'red' },
        { name: '⚫ Black (2x Payout)', value: 'black' },
        { name: '🟢 Green 0 (14x Jackpot!)', value: 'green' }
      ]
    }
  ],
  async execute(interaction) {
    const bet = interaction.options.getInteger('bet');
    const choice = interaction.options.getString('color');
    const userId = interaction.user.id;
    const profile = db.getUser(userId);

    if (bet < 50) return interaction.editReply(`❌ Minimum bet is **${formatMoney(50)}**.`);
    if (profile.wallet < bet) return interaction.editReply(`❌ Not enough cash in your wallet!`);

    const roll = Math.floor(Math.random() * 37); // 0 to 36
    const resultColor = roll === 0 ? 'green' : (roll % 2 === 0 ? 'black' : 'red');
    const emojiMap = { red: '🔴', black: '⚫', green: '🟢' };

    const won = choice === resultColor;
    const mult = resultColor === 'green' ? 14 : 2;
    const payout = won ? bet * mult : 0;

    db.addMoney(userId, won ? payout - bet : -bet);

    const embed = new EmbedBuilder()
      .setColor(won ? 0x2ecc71 : 0xe74c3c)
      .setTitle('🎡 Casino Roulette Wheel')
      .setDescription(
        `The ball spun around the wheel and landed on:\n\n` +
        `# ${emojiMap[resultColor]} **${roll} (${resultColor.toUpperCase()})**\n\n` +
        (won
          ? `🔥 **BANG!** You hit **${mult}x** and won **${formatMoney(payout)}**!`
          : `💸 **Missed!** You bet on ${emojiMap[choice]} ${choice.toUpperCase()} and lost **${formatMoney(bet)}**.`)
      )
      .setFooter({ text: `New Wallet: ${formatMoney(db.getUser(userId).wallet)}` })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};

// ─── 9. SERVER LEADERBOARD ──────────────────────────────────────────────────

export const leaderboard = {
  name: 'leaderboard',
  description: 'View the server\'s Richest Tycoons or Highest Level legends',
  options: [
    {
      name: 'category',
      description: 'Which leaderboard to display',
      type: 3,
      required: false,
      choices: [
        { name: '💰 Richest Net Worth', value: 'money' },
        { name: '⭐ Top Levels & XP', value: 'levels' }
      ]
    }
  ],
  async execute(interaction) {
    const category = interaction.options.getString('category') || 'money';
    const medals = ['🥇', '🥈', '🥉'];

    if (category === 'levels') {
      const top = db.getTopLevels(10);
      const lines = top.length
        ? top.map((u, idx) => `${medals[idx] || `\`#${idx + 1}\``} <@${u.id}> — **Level ${u.level}** *(${u.xp} XP • ⭐ ${u.rep} Rep)*`).join('\n')
        : 'No level data yet! Start chatting to earn XP.';

      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('🏆 Server XP & Level Leaderboard')
        .setDescription(lines)
        .setFooter({ text: 'Chat in the server to level up and earn cash rewards!' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } else {
      const top = db.getTopBalances(10);
      const lines = top.length
        ? top.map((u, idx) => `${medals[idx] || `\`#${idx + 1}\``} <@${u.id}> — **${formatMoney(u.total)}**`).join('\n')
        : 'No economy data yet! Use `/daily` or `/work` to get started.';

      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('💎 Richest Server Tycoons')
        .setDescription(lines)
        .setFooter({ text: 'Use /daily, /work, /blackjack, or /rob to climb the ranks!' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }
  }
};

// ─── 10. SOCIAL PROFILE & BIO ───────────────────────────────────────────────

export const profile = {
  name: 'profile',
  description: 'View a member\'s social card (Level, Net Worth, Marriage, Rep, Bio) or update your bio',
  options: [
    { name: 'user', description: 'User to inspect (defaults to you)', type: 6, required: false },
    { name: 'set_bio', description: 'Set a new custom bio on your own profile card', type: 3, required: false }
  ],
  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const newBio = interaction.options.getString('set_bio');

    if (newBio && target.id === interaction.user.id) {
      db.updateUser(interaction.user.id, { bio: newBio.slice(0, 140) });
    }

    const data = db.getUser(target.id);
    const xpNeeded = data.level * 150;
    const progress = Math.min(10, Math.round((data.xp / xpNeeded) * 10));
    const bar = '🟪'.repeat(progress) + '⬛'.repeat(10 - progress);

    const partnerText = data.partner
      ? `💍 Married to <@${data.partner}> ${data.marriedAt ? `(<t:${Math.floor(data.marriedAt / 1000)}:R>)` : ''}`
      : '💔 Single & Unattached';

    const embed = new EmbedBuilder()
      .setColor(0xe91e63)
      .setTitle(`🪪 ${target.username}'s Server Profile`)
      .setDescription(`> *"${data.bio}"*`)
      .setThumbnail(target.displayAvatarURL({ size: 512 }))
      .addFields(
        { name: '⭐ Level & Rank', value: `**Level ${data.level}** (${data.xp}/${xpNeeded} XP)\n${bar}`, inline: false },
        { name: '💰 Net Worth', value: `**${formatMoney(data.wallet + data.bank)}**`, inline: true },
        { name: '🎖️ Reputation', value: `**+${data.rep} Rep**`, inline: true },
        { name: '💖 Relationship Status', value: partnerText, inline: false }
      )
      .setFooter({ text: 'Tip: Update your bio anytime using /profile set_bio:<text>' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};

// ─── 11. REPUTATION (+REP) ──────────────────────────────────────────────────

export const rep = {
  name: 'rep',
  description: 'Give +1 Reputation respect point to another member (12h cooldown)',
  options: [{ name: 'user', description: 'Who deserves +1 Rep', type: 6, required: true }],
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const giverId = interaction.user.id;

    if (target.bot || target.id === giverId) {
      return interaction.editReply('❌ You cannot give reputation to yourself or a bot!');
    }

    const giver = db.getUser(giverId);
    const now = Date.now();
    const cooldown = 12 * 60 * 60 * 1000;

    if (now - giver.lastRep < cooldown) {
      const nextRep = Math.floor((giver.lastRep + cooldown) / 1000);
      return interaction.editReply(`⏳ You already gave out your respect today! You can give \`+rep\` again <t:${nextRep}:R>.`);
    }

    const receiver = db.getUser(target.id);
    db.updateUser(giverId, { lastRep: now });
    db.updateUser(target.id, { rep: (receiver.rep || 0) + 1 });

    return interaction.editReply(`🎖️ **<@${giverId}>** gave **+1 Reputation** to **<@${target.id}>**! *(Total Rep: **+${(receiver.rep || 0) + 1}**)*`);
  }
};

// ─── 12. MARRIAGE & DIVORCE SYSTEM ──────────────────────────────────────────

export const marry = {
  name: 'marry',
  description: 'Propose marriage to someone special in the server with a ring',
  options: [{ name: 'user', description: 'Your soulmate', type: 6, required: true }],
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const proposer = interaction.user;

    if (target.bot) return interaction.editReply('🤖 You cannot marry a bot (even though I am pretty irresistible).');
    if (target.id === proposer.id) return interaction.editReply('💀 You cannot marry yourself.');

    const pData = db.getUser(proposer.id);
    const tData = db.getUser(target.id);

    if (pData.partner) return interaction.editReply(`🚨 Hold up! You're already married to <@${pData.partner}>! Use \`/divorce\` first.`);
    if (tData.partner) return interaction.editReply(`💔 <@${target.id}> is already married to <@${tData.partner}>!`);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('marry_accept').setLabel('💍 I Do! (Accept)').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('marry_reject').setLabel('💔 Run Away (Reject)').setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setColor(0xff69b4)
      .setTitle('💍 A Wild Marriage Proposal Appeared!')
      .setDescription(`💖 <@${proposer.id}> just got down on one knee and proposed to <@${target.id}>!\n\n<@${target.id}>, do you take them as your chaotic Discord partner?`)
      .setThumbnail(target.displayAvatarURL())
      .setTimestamp();

    const msg = await interaction.editReply({
      content: `<@${target.id}>`,
      embeds: [embed],
      components: [row],
      fetchReply: true
    });

    const collector = msg.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async i => {
      if (i.user.id !== target.id) {
        return i.reply({ content: '❌ Only the person being proposed to can answer!', ephemeral: true });
      }

      collector.stop('answered');

      if (i.customId === 'marry_accept') {
        const now = Date.now();
        db.updateUser(proposer.id, { partner: target.id, marriedAt: now });
        db.updateUser(target.id, { partner: proposer.id, marriedAt: now });

        await i.update({
          content: `🎉 **CONGRATULATIONS!** 💒`,
          embeds: [
            new EmbedBuilder()
              .setColor(0x2ecc71)
              .setTitle('💒 Just Married!')
              .setDescription(`💞 <@${proposer.id}> and <@${target.id}> are now officially married! Check it out on \`/profile\`!`)
              .setTimestamp()
          ],
          components: []
        });
      } else {
        await i.update({
          content: `💀 **EMOTIONAL DAMAGE!**`,
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle('💔 Proposal Rejected')
              .setDescription(`<@${target.id}> rejected <@${proposer.id}>'s proposal in front of the whole server. Press **F** in chat.`)
              .setTimestamp()
          ],
          components: []
        });
      }
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') {
        interaction.editReply({
          content: '⌛ The marriage proposal expired—they left you on read.',
          components: []
        }).catch(() => {});
      }
    });
  }
};

export const divorce = {
  name: 'divorce',
  description: 'File divorce papers and end your current marriage',
  async execute(interaction) {
    const userId = interaction.user.id;
    const pData = db.getUser(userId);

    if (!pData.partner) {
      return interaction.editReply('❌ You aren\'t even married bro! Who are you divorcing, your imaginary friend?');
    }

    const exId = pData.partner;
    db.updateUser(userId, { partner: null, marriedAt: null });
    db.updateUser(exId, { partner: null, marriedAt: null });

    return interaction.editReply(`💔 **It's officially over.** <@${userId}> just divorced <@${exId}> and threw the ring into the ocean.`);
  }
};
