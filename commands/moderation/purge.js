export default {
  name: 'purge',
  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');

    if (!interaction.member.permissions.has('ManageMessages')) {
      return interaction.reply({ content: '❌ You do not have permission to delete messages.', ephemeral: true });
    }

    if (amount < 1 || amount > 100) {
      return interaction.reply({ content: '❌ You need to input a number between 1 and 100.', ephemeral: true });
    }

    await interaction.channel.bulkDelete(amount, true).catch(error => {
      console.error(error);
      return interaction.reply({ content: '❌ There was an error trying to prune messages in this channel!', ephemeral: true });
    });

    await interaction.reply({ content: `✅ Successfully deleted ${amount} messages.`, ephemeral: true });
  }
};