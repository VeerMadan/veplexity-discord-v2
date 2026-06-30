export default {
  name: 'pvc_ban',
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const rule = interaction.options.getString('rule');
    
    // 🔧 PUT YOUR PRIVATE VC ROLE ID HERE
    const privateVcRoleID = 'YOUR_ROLE_ID_HERE'; 

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: '❌ User not found.', ephemeral: true });

    try {
      await member.roles.remove(privateVcRoleID);
      await interaction.reply(`🚫 **${user.tag}** has had their Private VC access revoked.\n**Reason:** ${rule}`);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ Failed to remove role. Check my hierarchy.', ephemeral: true });
    }
  }
};