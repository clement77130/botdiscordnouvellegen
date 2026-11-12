import { ChannelType, ChatInputCommandInteraction, SlashCommandBuilder, TextChannel } from 'discord.js';
import { m, tr } from '../../messages';
import { isStaff } from '../../utils/ticketUtils';
import { sendRecruitPanel } from '../../utils/regiments';

export const data = new SlashCommandBuilder()
  .setName('recrutement')
  .setDescription('Publier le panel « Rejoindre un régiment »')
  .addChannelOption(o => o.setName('salon').setDescription('Salon du panel (par défaut : celui-ci)').addChannelTypes(ChannelType.GuildText))
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.inCachedGuild()) {
    return interaction.reply({ content: m(interaction.guildId, 'common.guildOnly', 'Cette commande doit être utilisée dans un serveur.'), ephemeral: true });
  }
  const gid = interaction.guildId;

  if (!(await isStaff(interaction.member))) {
    return interaction.reply({ content: m(gid, 'common.noPermission', "Vous n'avez pas la permission d'utiliser cette commande."), ephemeral: true });
  }

  const target = interaction.options.getChannel('salon') ?? interaction.channel;
  if (!target || target.type !== ChannelType.GuildText) {
    return interaction.reply({ content: tr(gid, 'lock.notText'), ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });
  const result = await sendRecruitPanel(target as TextChannel);
  await interaction.editReply({ content: 'error' in result ? result.error : tr(gid, 'regiments.panelSent', { channel: `<#${target.id}>` }) });
}
