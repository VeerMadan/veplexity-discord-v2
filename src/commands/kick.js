// JavaScript source code
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export const data = {
  name: 'kick',
  description: 'Kick a member from the server',
  options: [
    {
      name: 'user',
      description: 'User to kick',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: 'reason',
      description: 'Reason for kick',
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],
};

export async function execute(interaction, env) {
  const member = interaction.member;
  const target = interaction.data.options.find(o => o.name === 'user').value;
  const reasonOption = interaction.data.options.find(o => o.name === 'reason');
  const reason = reasonOption?.value || 'No reason provided';

  // Permission check (Kick Members)
  const permissions = BigInt(member.permissions);
  const KICK_PERMISSION = 1n << 1n;

  if ((permissions & KICK_PERMISSION) === 0n) {
    return {
      type: 4,
      data: {
        content: '❌ You do not have permission to kick members.',
        flags: 64,
      },
    };
  }

  // Kick user
  const res = await fetch(
    `https://discord.com/api/v10/guilds/${interaction.guild_id}/members/${target}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bot ${env.DISCORD_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    }
  );

  if (!res.ok) {
    return {
      type: 4,
      data: {
        content: '⚠️ Failed to kick the user. Check role hierarchy.',
        flags: 64,
      },
    };
  }

  return {
    type: 4,
    data: {
      content: `✅ **User kicked successfully**\n📝 Reason: ${reason}`,
    },
  };
}
