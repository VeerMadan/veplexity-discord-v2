export default {
  name: 'warn',
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    // Send the embed directly and successfully complete the interaction
    await interaction.reply({
      content: `⚠️ **${user.tag}** has been warned!\n**Reason:** ${reason}`
    });
  }
};