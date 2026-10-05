import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

/**
 * Splits raw lyrics text into aesthetic, readable pages by stanzas/paragraphs.
 * @param {string} lyricsText - Full lyrics string
 * @param {number} maxCharsPerPage - Target character budget per page (~550-700)
 * @returns {string[]} Array of page texts
 */
export function splitLyricsIntoPages(lyricsText, maxCharsPerPage = 650) {
  if (!lyricsText) return [];
  const rawStanzas = lyricsText.replace(/\r\n/g, '\n').split(/\n\s*\n/);
  const pages = [];
  let currentPage = '';

  for (const rawStanza of rawStanzas) {
    const stanza = rawStanza.trim();
    if (!stanza) continue;

    // If a single stanza is abnormally large, break it line by line
    if (stanza.length > maxCharsPerPage) {
      const lines = stanza.split('\n');
      for (const line of lines) {
        if ((currentPage + '\n' + line).trim().length > maxCharsPerPage && currentPage.trim()) {
          pages.push(currentPage.trim());
          currentPage = line;
        } else {
          currentPage = currentPage ? `${currentPage}\n${line}` : line;
        }
      }
      continue;
    }

    if ((currentPage + '\n\n' + stanza).trim().length > maxCharsPerPage && currentPage.trim()) {
      pages.push(currentPage.trim());
      currentPage = stanza;
    } else {
      currentPage = currentPage ? `${currentPage}\n\n${stanza}` : stanza;
    }
  }

  if (currentPage.trim()) {
    pages.push(currentPage.trim());
  }

  return pages.length > 0 ? pages : [lyricsText.slice(0, 1000)];
}

/**
 * Sends an interactive paginated lyrics booklet embed in response to an interaction.
 * @param {import('discord.js').Interaction} interaction
 * @param {{ title: string, artist?: string, album?: string, lyrics: string }} data
 */
export async function sendLyricsPagination(interaction, data) {
  const pages = splitLyricsIntoPages(data.lyrics, 650);
  const uid = Math.random().toString(36).substring(2, 8);

  const createEmbed = (pageIndex) => {
    return new EmbedBuilder()
      .setColor(0x1db954) // Spotify Green
      .setTitle(`📜 Lyrics: ${data.title}`)
      .setAuthor({
        name: data.artist || 'Unknown Artist',
        iconURL: 'https://cdn-icons-png.flaticon.com/512/3845/3845868.png'
      })
      .setDescription(pages[pageIndex])
      .setFooter({
        text: pages.length > 1
          ? `Page ${pageIndex + 1} of ${pages.length} • Powered by LRCLIB • VePlexity Audio`
          : 'Powered by LRCLIB • VePlexity Audio'
      })
      .setTimestamp();
  };

  const createRow = (pageIndex) => {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`lyrics_prev_${uid}`)
        .setLabel('Previous')
        .setEmoji('◀️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pageIndex === 0),
      new ButtonBuilder()
        .setCustomId(`lyrics_page_${uid}`)
        .setLabel(`${pageIndex + 1} / ${pages.length}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`lyrics_next_${uid}`)
        .setLabel('Next')
        .setEmoji('▶️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pageIndex === pages.length - 1),
      new ButtonBuilder()
        .setCustomId(`lyrics_close_${uid}`)
        .setLabel('Close')
        .setEmoji('✖️')
        .setStyle(ButtonStyle.Danger)
    );
  };

  const initialRows = pages.length > 1 ? [createRow(0)] : [];

  const message = await interaction.editReply({
    embeds: [createEmbed(0)],
    components: initialRows
  });

  if (pages.length <= 1) return message;

  const collector = message.createMessageComponentCollector({
    filter: i => i.customId.startsWith('lyrics_') && i.customId.endsWith(`_${uid}`),
    time: 300000 // 5 minutes
  });

  let currentPage = 0;

  collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id) {
      return i.reply({
        content: '❌ Only the person who requested the lyrics can flip pages.',
        ephemeral: true
      });
    }

    if (i.customId === `lyrics_close_${uid}`) {
      collector.stop('closed');
      try {
        return await i.message.delete();
      } catch {
        return await i.update({ components: [] }).catch(() => {});
      }
    }

    if (i.customId === `lyrics_prev_${uid}`) {
      if (currentPage > 0) currentPage--;
    } else if (i.customId === `lyrics_next_${uid}`) {
      if (currentPage < pages.length - 1) currentPage++;
    }

    await i.update({
      embeds: [createEmbed(currentPage)],
      components: [createRow(currentPage)]
    }).catch(() => {});
  });

  collector.on('end', async (_, reason) => {
    if (reason !== 'closed') {
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev_dis').setEmoji('◀️').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('page_dis').setLabel(`${currentPage + 1} / ${pages.length}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('next_dis').setEmoji('▶️').setStyle(ButtonStyle.Secondary).setDisabled(true)
      );
      message.edit({ components: [disabledRow] }).catch(() => {});
    }
  });

  return message;
}

export default sendLyricsPagination;
