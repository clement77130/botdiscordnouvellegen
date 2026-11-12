import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Guild,
  ModalBuilder,
  ModalSubmitInteraction,
  PermissionFlagsBits,
  TextChannel,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { prisma } from './prisma';
import { tr } from '../messages';
import { Regiment, loadEventSettings } from './events';

// Choix d'un régiment par le joueur : bouton -> pseudo Roblox -> demande envoyée en message privé aux chefs (C1 et C2)
// -> le chef accepte ou refuse -> le joueur est prévenu (et reçoit les liens du régiment s'il est accepté).
// Ces interactions peuvent venir d'un message privé : le serveur est donc lu dans l'identifiant du bouton.

const CLEAN = (value: string, max: number) => value.trim().replace(/`/g, "'").slice(0, max);

// Boutons « un par régiment » (25 maximum). userId limite le choix à un joueur ; eventId rattache la demande à une FGI.
export function regimentRows(guildId: string, regiments: Regiment[], userId: string | null, eventId: number | null): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  regiments.slice(0, 25).forEach((reg, i) => {
    if (i % 5 === 0) rows.push(new ActionRowBuilder<ButtonBuilder>());
    rows[rows.length - 1].addComponents(
      new ButtonBuilder()
        .setCustomId(`rg:${guildId}:${reg.id}:${userId ?? '0'}:${eventId ?? 0}`)
        .setLabel(reg.name.slice(0, 80))
        .setStyle(ButtonStyle.Primary)
    );
  });
  return rows;
}

// Panel public « Rejoindre un régiment »
export async function sendRecruitPanel(channel: TextChannel): Promise<{ url: string } | { error: string }> {
  const guild = channel.guild;
  const gid = guild.id;
  const settings = await loadEventSettings(gid);
  if (settings.regiments.length === 0) return { error: tr(gid, 'regiments.noRegiments') };

  const me = guild.members.me;
  if (!me || !channel.permissionsFor(me)?.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
    return { error: tr(gid, 'regiments.channelPerms', { channel: `<#${channel.id}>` }) };
  }

  const embed = new EmbedBuilder()
    .setTitle(tr(gid, 'regiments.panelTitle'))
    .setDescription(tr(gid, 'regiments.panelDescription'))
    .setColor(0x5865f2);
  const message = await channel.send({ embeds: [embed], components: regimentRows(gid, settings.regiments, null, null) });
  return { url: message.url };
}

// Message de choix envoyé à un joueur (en MP, ou dans le salon de secours si ses MP sont bloqués)
export async function sendChoice(guild: Guild, client: Client, userId: string, eventId: number, eventTitle: string): Promise<'dm' | 'channel' | 'failed'> {
  const gid = guild.id;
  const settings = await loadEventSettings(gid);
  const rows = regimentRows(gid, settings.regiments, userId, eventId);
  const embed = new EmbedBuilder()
    .setTitle(tr(gid, 'regiments.choiceTitle'))
    .setDescription(tr(gid, 'regiments.choiceBody', { title: eventTitle }))
    .setColor(0x5865f2);

  try {
    const user = await client.users.fetch(userId);
    await user.send({ embeds: [embed], components: rows });
    return 'dm';
  } catch {
    // MP bloqués : salon de secours si configuré
  }

  const channel = settings.regimentChannelId ? guild.channels.cache.get(settings.regimentChannelId) : null;
  const me = guild.members.me;
  if (channel && channel.isTextBased() && 'send' in channel && me && channel.permissionsFor(me)?.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
    try {
      await channel.send({
        content: tr(gid, 'regiments.choiceMention', { member: `<@${userId}>` }),
        embeds: [embed],
        components: rows,
        allowedMentions: { users: [userId] }
      });
      return 'channel';
    } catch {
      // ignoré
    }
  }
  return 'failed';
}

function parseId(customId: string) {
  const [, guildId, regimentId, userId, eventId] = customId.split(':');
  return { guildId, regimentId, userId, eventId: Number(eventId) || 0 };
}

// Clic sur le bouton d'un régiment -> formulaire (pseudo Roblox + motivation)
export async function handleRegimentButton(interaction: ButtonInteraction): Promise<void> {
  const { guildId, regimentId, userId, eventId } = parseId(interaction.customId);

  if (userId !== '0' && userId !== interaction.user.id) {
    await interaction.reply({ content: tr(guildId, 'regiments.notForYou'), ephemeral: true });
    return;
  }

  const settings = await loadEventSettings(guildId);
  const regiment = settings.regiments.find(r => r.id === regimentId);
  if (!regiment) {
    await interaction.reply({ content: tr(guildId, 'regiments.unknown'), ephemeral: true });
    return;
  }
  if (!regiment.c1 && !regiment.c2) {
    await interaction.reply({ content: tr(guildId, 'regiments.noChief', { regiment: regiment.name }), ephemeral: true });
    return;
  }
  const pending = await prisma.regimentRequest.findFirst({ where: { guildId, userId: interaction.user.id, regimentId, status: 'pending' } });
  if (pending) {
    await interaction.reply({ content: tr(guildId, 'regiments.alreadyPending', { regiment: regiment.name }), ephemeral: true });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`rgm:${guildId}:${regimentId}:${eventId}`)
    .setTitle(tr(guildId, 'regiments.modalTitle', { regiment: regiment.name }).slice(0, 45))
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId('pseudo').setLabel(tr(guildId, 'regiments.robloxLabel').slice(0, 45)).setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(50)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId('motivation').setLabel(tr(guildId, 'regiments.motivationLabel').slice(0, 45)).setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(500)
      )
    );
  await interaction.showModal(modal);
}

function decisionRow(requestId: number, guildId: string, disabled = false) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`rgd:${requestId}:accept`).setLabel(tr(guildId, 'regiments.btnAccept').slice(0, 80)).setStyle(ButtonStyle.Success).setDisabled(disabled),
    new ButtonBuilder().setCustomId(`rgd:${requestId}:refuse`).setLabel(tr(guildId, 'regiments.btnRefuse').slice(0, 80)).setStyle(ButtonStyle.Danger).setDisabled(disabled)
  );
}

// Formulaire envoyé -> demande enregistrée et envoyée aux chefs
export async function handleRegimentModal(interaction: ModalSubmitInteraction): Promise<void> {
  const [, guildId, regimentId, eventText] = interaction.customId.split(':');
  const eventId = Number(eventText) || 0;

  const settings = await loadEventSettings(guildId);
  const regiment = settings.regiments.find(r => r.id === regimentId);
  if (!regiment) {
    await interaction.reply({ content: tr(guildId, 'regiments.unknown'), ephemeral: true });
    return;
  }

  const roblox = CLEAN(interaction.fields.getTextInputValue('pseudo').replace(/^@+/, ''), 50);
  const motivation = CLEAN(interaction.fields.getTextInputValue('motivation') || '', 500);

  await interaction.deferReply({ ephemeral: true });

  const pending = await prisma.regimentRequest.findFirst({ where: { guildId, userId: interaction.user.id, regimentId, status: 'pending' } });
  if (pending) {
    await interaction.editReply({ content: tr(guildId, 'regiments.alreadyPending', { regiment: regiment.name }) });
    return;
  }

  let context = tr(guildId, 'regiments.contextNone');
  if (eventId) {
    const event = await prisma.eventPanel.findFirst({ where: { id: eventId, guildId } });
    if (event) context = tr(guildId, 'regiments.contextFgi', { title: event.title });
  }

  const request = await prisma.regimentRequest.create({
    data: { guildId, userId: interaction.user.id, regimentId, regimentName: regiment.name, roblox, motivation, context }
  });

  const embed = new EmbedBuilder()
    .setTitle(tr(guildId, 'regiments.requestTitle', { regiment: regiment.name }).slice(0, 256))
    .setDescription(
      tr(guildId, 'regiments.requestBody', {
        player: `<@${interaction.user.id}>`,
        roblox,
        context,
        motivation: motivation || tr(guildId, 'regiments.noMotivation')
      }).slice(0, 4000)
    )
    .setThumbnail(interaction.user.displayAvatarURL())
    .setColor(0x5865f2)
    .setTimestamp();

  const delivered: { userId: string; channelId: string; messageId: string }[] = [];
  for (const chiefId of [...new Set([regiment.c1, regiment.c2].filter((v): v is string => !!v))]) {
    try {
      const user = await interaction.client.users.fetch(chiefId);
      const message = await user.send({ embeds: [embed], components: [decisionRow(request.id, guildId)], allowedMentions: { parse: [] } });
      delivered.push({ userId: chiefId, channelId: message.channelId, messageId: message.id });
    } catch {
      // chef injoignable (MP bloqués) : on essaie l'autre
    }
  }

  if (delivered.length === 0) {
    await prisma.regimentRequest.delete({ where: { id: request.id } });
    await interaction.editReply({ content: tr(guildId, 'regiments.chiefsUnreachable', { regiment: regiment.name }) });
    return;
  }

  await prisma.regimentRequest.update({ where: { id: request.id }, data: { chiefMessages: JSON.stringify(delivered) } });
  await interaction.editReply({ content: tr(guildId, 'regiments.requestSent', { regiment: regiment.name }) });
}

const fillTemplate = (template: string, vars: Record<string, string>) =>
  Object.entries(vars).reduce((text, [key, value]) => text.split(`{${key}}`).join(value), template);

// Un chef clique sur Accepter / Refuser (dans ses messages privés)
export async function handleDecisionButton(interaction: ButtonInteraction): Promise<void> {
  const [, idText, action] = interaction.customId.split(':');
  const request = await prisma.regimentRequest.findUnique({ where: { id: Number(idText) } });
  if (!request) {
    await interaction.reply({ content: tr(null, 'regiments.requestGone'), ephemeral: true });
    return;
  }

  const gid = request.guildId;
  const settings = await loadEventSettings(gid);
  const regiment = settings.regiments.find(r => r.id === request.regimentId);

  if (!regiment || ![regiment.c1, regiment.c2].includes(interaction.user.id)) {
    await interaction.reply({ content: tr(gid, 'regiments.notChief'), ephemeral: true });
    return;
  }

  const accepted = action === 'accept';
  // Un seul chef peut trancher : la mise à jour ne réussit que si la demande est encore en attente
  const claimed = await prisma.regimentRequest.updateMany({
    where: { id: request.id, status: 'pending' },
    data: { status: accepted ? 'accepted' : 'refused', decidedBy: interaction.user.id }
  });
  if (claimed.count === 0) {
    const current = await prisma.regimentRequest.findUnique({ where: { id: request.id } });
    await interaction.reply({ content: tr(gid, 'regiments.alreadyDecided', { who: current?.decidedBy ? `<@${current.decidedBy}>` : '—' }), ephemeral: true, allowedMentions: { parse: [] } });
    return;
  }

  const chief = `<@${interaction.user.id}>`;
  const note = tr(gid, accepted ? 'regiments.acceptedBy' : 'regiments.refusedBy', { chief });
  const original = interaction.message.embeds[0];
  const decidedEmbed = (base?: EmbedBuilder | typeof original) =>
    EmbedBuilder.from(base ?? original).setColor(accepted ? 0x2ecc71 : 0xe74c3c).addFields({ name: '\u200b', value: note });

  // Met à jour la réponse du chef qui a cliqué, puis le message de l'autre chef
  await interaction.update({ embeds: [decidedEmbed()], components: [] });
  try {
    const delivered: { userId: string; channelId: string; messageId: string }[] = JSON.parse(request.chiefMessages);
    for (const d of delivered) {
      if (d.messageId === interaction.message.id) continue;
      try {
        const user = await interaction.client.users.fetch(d.userId);
        const dm = await user.createDM();
        const message = await dm.messages.fetch(d.messageId);
        await message.edit({ embeds: [decidedEmbed(message.embeds[0])], components: [] });
      } catch {
        // message supprimé ou inaccessible
      }
    }
  } catch {
    // liste illisible : sans importance
  }

  // Réponse au joueur
  const guild = interaction.client.guilds.cache.get(gid);
  const vars = {
    membre: `<@${request.userId}>`,
    regiment: regiment.name,
    discord: regiment.discord || '—',
    roblox: regiment.roblox || '—',
    chef: chief,
    titre: request.context
  };

  if (accepted && regiment.roleId && guild) {
    const member = await guild.members.fetch(request.userId).catch(() => null);
    const role = guild.roles.cache.get(regiment.roleId);
    if (member && role?.editable) await member.roles.add(role, `Accepté dans ${regiment.name} par ${interaction.user.tag}`).catch(() => {});
  }

  try {
    const user = await interaction.client.users.fetch(request.userId);
    const text = accepted ? fillTemplate(settings.dmTemplate, vars) : tr(gid, 'regiments.refusedDm', vars);
    await user.send({ content: text.slice(0, 2000), allowedMentions: { parse: [] } });
  } catch {
    // MP du joueur bloqués : le chef peut le contacter lui-même
  }
}
