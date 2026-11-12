import { randomBytes } from 'crypto';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  MessageComponentInteraction,
  ModalSubmitInteraction,
  UserSelectMenuBuilder,
  UserSelectMenuInteraction
} from 'discord.js';
import type { EventPanel } from '@prisma/client';
import { prisma } from './prisma';
import { tr } from '../messages';
import { EventSettings, buildLogEmbed, canWriteIn, closePanelMessage, getLogChannel, getResponses } from './events';
import { sendChoice } from './regiments';

// Fin d'une FGI : le staff désigne les joueurs présents, puis chaque joueur reçoit un message pour CHOISIR SON RÉGIMENT
// (bouton) ; sa demande part ensuite en message privé aux chefs du régiment (C1 et C2). Voir utils/regiments.ts.

interface Session {
  token: string;
  guildId: string;
  eventId: number;
  ownerId: string;
  answers: [string, string][];
  settings: EventSettings;
  attendees: string[];
  busy: boolean;
}

const sessions = new Map<string, Session>();
const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_ATTENDEES = 200;
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

function render(s: Session) {
  const gid = s.guildId;
  const id = (action: string) => `fgiR:${s.token}:${action}`;

  const list = s.attendees.map(u => `<@${u}>`).join(' · ');
  const embed = new EmbedBuilder().setTitle(tr(gid, 'fgi.title')).setDescription(tr(gid, 'fgi.help')).setColor(0x5865f2);
  if (s.attendees.length) {
    embed.addFields({ name: tr(gid, 'fgi.added', { count: s.attendees.length }), value: list.length > 1000 ? list.slice(0, 997) + '…' : list, inline: false });
  }

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
        new UserSelectMenuBuilder().setCustomId(id('users')).setPlaceholder(tr(gid, 'fgi.selectUser').slice(0, 150)).setMinValues(1).setMaxValues(25)
      ),
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(id('allpresent')).setLabel(tr(gid, 'fgi.btnAllPresent').slice(0, 80)).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(id('undo')).setLabel(tr(gid, 'fgi.btnUndo').slice(0, 80)).setStyle(ButtonStyle.Secondary).setDisabled(s.attendees.length === 0)
      ),
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(id('finish')).setLabel(tr(gid, 'fgi.btnFinish').slice(0, 80)).setStyle(ButtonStyle.Primary).setDisabled(s.attendees.length === 0),
        new ButtonBuilder().setCustomId(id('cancel')).setLabel(tr(gid, 'fgi.btnCancel').slice(0, 80)).setStyle(ButtonStyle.Danger)
      )
    ]
  };
}

// Premier écran de l'assistant, après le formulaire de fin
export async function startRoster(
  interaction: ModalSubmitInteraction<'cached'>,
  event: EventPanel,
  answers: [string, string][],
  settings: EventSettings
): Promise<void> {
  const gid = interaction.guildId;
  if (settings.regiments.length === 0) {
    await interaction.reply({ content: tr(gid, 'fgi.noRegiments'), ephemeral: true });
    return;
  }

  const session: Session = {
    token: randomBytes(5).toString('hex'),
    guildId: gid,
    eventId: event.id,
    ownerId: interaction.user.id,
    answers,
    settings,
    attendees: [],
    busy: false
  };
  sessions.set(session.token, session);
  setTimeout(() => sessions.delete(session.token), SESSION_TTL_MS).unref();

  await interaction.reply({ ...render(session), ephemeral: true });
}

type RosterInteraction = ButtonInteraction<'cached'> | UserSelectMenuInteraction<'cached'>;

export async function handleRosterInteraction(interaction: RosterInteraction): Promise<void> {
  const gid = interaction.guildId;
  const [, token, action] = interaction.customId.split(':');
  const s = sessions.get(token);

  if (!s) {
    await interaction.reply({ content: tr(gid, 'fgi.sessionExpired'), ephemeral: true });
    return;
  }
  if (interaction.user.id !== s.ownerId) {
    await interaction.reply({ content: tr(gid, 'fgi.notYours'), ephemeral: true });
    return;
  }

  const refresh = () => (interaction as MessageComponentInteraction).update(render(s));
  const add = (ids: string[]) => {
    for (const id of ids) if (!s.attendees.includes(id) && s.attendees.length < MAX_ATTENDEES) s.attendees.push(id);
  };

  switch (action) {
    case 'users': {
      add([...(interaction as UserSelectMenuInteraction).users.values()].filter(u => !u.bot).map(u => u.id));
      return void (await refresh());
    }

    case 'allpresent': {
      const responses = await getResponses(s.eventId);
      if (responses.present.length === 0) {
        await interaction.reply({ content: tr(gid, 'fgi.noPresent'), ephemeral: true });
        return;
      }
      add(responses.present);
      return void (await refresh());
    }

    case 'undo': {
      s.attendees.pop();
      return void (await refresh());
    }

    case 'cancel': {
      sessions.delete(s.token);
      await (interaction as ButtonInteraction).update({ content: tr(gid, 'fgi.cancelled'), embeds: [], components: [] });
      return;
    }

    case 'finish':
      return finish(interaction as ButtonInteraction<'cached'>, s);
  }
}

async function finish(interaction: ButtonInteraction<'cached'>, s: Session): Promise<void> {
  const gid = s.guildId;
  const guild = interaction.guild;

  if (s.attendees.length === 0) {
    await interaction.reply({ content: tr(gid, 'fgi.listEmpty'), ephemeral: true });
    return;
  }
  if (s.busy) return;

  const event = await prisma.eventPanel.findFirst({ where: { id: s.eventId, guildId: gid } });
  if (!event || event.status !== 'open') {
    sessions.delete(s.token);
    await interaction.update({ content: tr(gid, 'fgi.alreadyDone'), embeds: [], components: [] });
    return;
  }

  const logChannel = getLogChannel(guild, s.settings.fgi);
  if (!logChannel) {
    await interaction.reply({ content: tr(gid, 'eventsEnd.logChannelMissing'), ephemeral: true });
    return;
  }
  if (!canWriteIn(guild, logChannel)) {
    await interaction.reply({ content: tr(gid, 'eventsEnd.logChannelPerms'), ephemeral: true });
    return;
  }

  s.busy = true;
  await interaction.update({ content: tr(gid, 'fgi.sending'), embeds: [], components: [] });

  // 1. Message de choix de régiment à chaque présent
  const failed: string[] = [];
  let sent = 0;
  for (const userId of s.attendees) {
    const result = await sendChoice(guild, interaction.client, userId, event.id, event.title);
    if (result === 'failed') failed.push(userId);
    else sent++;
    await sleep(500);
  }

  // 2. Compte rendu dans le salon de logs, puis clôture de l'événement
  try {
    const responses = await getResponses(event.id);
    const main = buildLogEmbed(gid, event, responses, s.answers, interaction.user, s.settings).addFields(
      { name: tr(gid, 'fgi.logPresent'), value: String(s.attendees.length), inline: true },
      { name: tr(gid, 'fgi.logChoices'), value: `${sent}/${s.attendees.length}`, inline: true }
    );
    if (failed.length) {
      main.addFields({ name: tr(gid, 'fgi.logFailed'), value: failed.map(u => `<@${u}>`).join(' ').slice(0, 1000), inline: false });
    }
    await logChannel.send({ embeds: [main] });

    const lines = s.attendees.map(u => `<@${u}>`);
    for (let i = 0; i < lines.length; i += 80) {
      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(tr(gid, 'fgi.logRoster') + (i > 0 ? tr(gid, 'fgi.logRosterMore') : ''))
            .setDescription(lines.slice(i, i + 80).join(' · '))
            .setColor(0x2ecc71)
        ],
        allowedMentions: { parse: [] }
      });
    }

    await prisma.eventPanel.update({ where: { id: event.id }, data: { status: 'closed' } });
    await closePanelMessage(guild, event, responses, s.settings);
  } catch (error) {
    console.error('❌ Compte rendu de la FGI impossible:', error);
    s.busy = false;
    await interaction.editReply({ content: tr(gid, 'fgi.reportFailed') });
    return;
  }

  sessions.delete(s.token);
  let summary = tr(gid, 'fgi.summary', { channel: `<#${logChannel.id}>`, sent, total: s.attendees.length });
  if (failed.length) summary += tr(gid, 'fgi.summaryFailed', { users: failed.map(u => `<@${u}>`).join(' ') });
  await interaction.editReply({ content: summary.slice(0, 2000) });
}
