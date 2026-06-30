export default {
  name: 'kick',
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    // Check if the bot has permission to kick
    if (!interaction.member.permissions.has('KickMembers')) {
      return interaction.reply({ content: '❌ You do not have permission to kick.', ephemeral: true });
    }

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: '❌ User not found in this server.', ephemeral: true });

    try {
      await member.kick(reason);
      await interaction.reply(`👢 **${user.tag}** was kicked. Reason: ${reason}`);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ I do not have high enough permissions to kick that user.', ephemeral: true });
    }
  }
};