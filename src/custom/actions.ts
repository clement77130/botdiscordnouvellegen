import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Guild,
  GuildMember,
  GuildTextBasedChannel,
  PermissionFlagsBits
} from 'discord.js';
import { prisma } from '../utils/prisma';
import { ButtonDef, MessagePayload, MessageRef, Ops, ProgramError, Scope } from './engine';
import { scriptHttp } from './http';

// Actions Discord des commandes personnalisées (blocs ET scripts passent par ici : mêmes vérifications et mêmes limites)

export interface RunContext {
  guild: Guild;
  trigger: GuildMember | null;
  channel: GuildTextBasedChannel | null;
  interaction: ChatInputCommandInteraction<'cached'> | ButtonInteraction<'cached'> | null;
  ephemeral: boolean;
  replied: boolean;
  counters: { actions: number; messages: number; http: number };
}

const MAX_ACTIONS = 40;
const MAX_MESSAGES = 15;
const MAX_DATA_ROWS = 20_000;
const ID_RE = /^\d{5,25}$/;
const KEY_RE = /^[A-Za-z0-9_.-]{1,50}$/;
const BUTTON_KEY_RE = /^[a-z0-9_-]{1,40}$/;
const REASON_PREFIX = '[Commande personnalisée] ';

const STYLES: Record<ButtonDef['style'], ButtonStyle> = {
  primary: ButtonStyle.Primary,
  secondary: ButtonStyle.Secondary,
  success: ButtonStyle.Success,
  danger: ButtonStyle.Danger
};

// Nettoie un message venant d'un script (donnée non fiable)
export function sanitizePayload(raw: unknown): MessagePayload {
  if (typeof raw === 'string') return { content: raw.slice(0, 2000) };
  if (!raw || typeof raw !== 'object') throw new ProgramError('Message invalide');
  const r = raw as any;
  const payload: MessagePayload = {};
  if (typeof r.content === 'string' && r.content) payload.content = r.content.slice(0, 2000);

  if (r.embed && typeof r.embed === 'object') {
    const e = r.embed;
    const url = (v: unknown) => (typeof v === 'string' && /^https:\/\/\S{1,500}$/.test(v) ? v : undefined);
    payload.embed = {
      title: typeof e.title === 'string' ? e.title.slice(0, 256) : undefined,
      description: typeof e.description === 'string' ? e.description.slice(0, 4000) : undefined,
      color: typeof e.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(e.color) ? e.color : undefined,
      footer: typeof e.footer === 'string' ? e.footer.slice(0, 200) : undefined,
      author: typeof e.author === 'string' ? e.author.slice(0, 200) : undefined,
      url: url(e.url),
      thumbnail: url(e.thumbnail),
      image: url(e.image),
      timestamp: e.timestamp === true,
      fields: Array.isArray(e.fields)
        ? e.fields.slice(0, 25).map((f: any) => ({
            name: String(f?.name ?? '').slice(0, 256) || '\u200b',
            value: String(f?.value ?? '').slice(0, 1024) || '\u200b',
            inline: f?.inline === true
          }))
        : undefined
    };
  }

  if (Array.isArray(r.buttons)) {
    payload.buttons = r.buttons.slice(0, 5).map((b: any) => {
      const key = String(b?.key ?? '');
      if (!BUTTON_KEY_RE.test(key)) throw new ProgramError(`Identifiant de bouton invalide : « ${key} »`);
      return {
        label: String(b?.label ?? '').slice(0, 80) || 'Bouton',
        style: ['primary', 'secondary', 'success', 'danger'].includes(b?.style) ? b.style : 'primary',
        key
      };
    });
  }
  return payload;
}

function buildMessage(payload: MessagePayload) {
  const hasEmbed = !!payload.embed && !!(payload.embed.title || payload.embed.description || payload.embed.fields?.length);
  if (!payload.content && !hasEmbed) throw new ProgramError('Le message est vide');

  const body: {
    content?: string;
    embeds?: EmbedBuilder[];
    components?: ActionRowBuilder<ButtonBuilder>[];
    allowedMentions: { parse: ('users')[] };
  } = {
    // Jamais de @everyone, @here ni de mention de rôle ; les mentions de membres notifient normalement
    allowedMentions: { parse: ['users'] }
  };

  if (payload.content) body.content = payload.content;
  if (hasEmbed && payload.embed) {
    const embed = new EmbedBuilder();
    if (payload.embed.title) embed.setTitle(payload.embed.title);
    if (payload.embed.description) embed.setDescription(payload.embed.description);
    if (payload.embed.color) embed.setColor(payload.embed.color as `#${string}`);
    if (payload.embed.footer) embed.setFooter({ text: payload.embed.footer });
    if (payload.embed.url) embed.setURL(payload.embed.url);
    if (payload.embed.author) embed.setAuthor({ name: payload.embed.author });
    if (payload.embed.thumbnail) embed.setThumbnail(payload.embed.thumbnail);
    if (payload.embed.image) embed.setImage(payload.embed.image);
    if (payload.embed.timestamp) embed.setTimestamp();
    if (payload.embed.fields?.length) embed.addFields(payload.embed.fields);
    body.embeds = [embed];
  }
  if (payload.buttons?.length) {
    body.components = [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        payload.buttons.map(b => new ButtonBuilder().setCustomId(`ca:${b.key}`).setLabel(b.label).setStyle(STYLES[b.style]))
      )
    ];
  }
  return body;
}

export function createOps(ctx: RunContext): Ops {
  const guild = ctx.guild;

  const countAction = () => {
    if (++ctx.counters.actions > MAX_ACTIONS) throw new ProgramError(`Trop d'actions Discord dans une même commande (${MAX_ACTIONS} maximum)`);
  };
  const countMessage = () => {
    if (++ctx.counters.messages > MAX_MESSAGES) throw new ProgramError(`Trop de messages envoyés par une même commande (${MAX_MESSAGES} maximum)`);
  };

  async function member(userId: string): Promise<GuildMember> {
    if (!ID_RE.test(userId)) throw new ProgramError(`Identifiant de membre invalide : « ${userId} »`);
    const found = await guild.members.fetch(userId).catch(() => null);
    if (!found) throw new ProgramError('Membre introuvable sur le serveur');
    return found;
  }

  function role(roleId: string) {
    const found = guild.roles.cache.get(roleId);
    if (!found || found.managed || found.id === guild.id) throw new ProgramError('Rôle introuvable ou impossible à gérer');
    if (!found.editable) throw new ProgramError(`Je ne peux pas gérer le rôle « ${found.name} » (il est au-dessus de mon rôle)`);
    return found;
  }

  function checkKey(key: string) {
    if (!KEY_RE.test(key)) throw new ProgramError(`Clé de mémoire invalide : « ${key} » (lettres, chiffres, . - _)`);
  }

  const scopeKey = (scope: Scope, scopeId: string) => {
    if (scope === 'user') {
      if (!ID_RE.test(scopeId)) throw new ProgramError('Identifiant de membre invalide pour la mémoire du membre');
      return scopeId;
    }
    return '';
  };

  return {
    async reply(payload): Promise<MessageRef | void> {
      if (!ctx.interaction) return; // déclencheur sans interaction (arrivée/départ) : rien à répondre
      countMessage();
      const body = buildMessage(payload);
      let message;
      if (!ctx.replied) {
        ctx.replied = true;
        message = await ctx.interaction.editReply({ ...body, content: body.content ?? '' });
      } else {
        message = await ctx.interaction.followUp({ ...body, ephemeral: ctx.ephemeral });
      }
      return { id: message.id, channelId: message.channelId };
    },

    async send(channelId, payload): Promise<MessageRef | void> {
      countAction();
      countMessage();
      const channel = ID_RE.test(channelId) ? guild.channels.cache.get(channelId) : undefined;
      if (!channel || !channel.isTextBased() || !('send' in channel)) throw new ProgramError('Salon introuvable');
      const me = guild.members.me;
      if (!me || !channel.permissionsFor(me)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
        throw new ProgramError(`Je ne peux pas écrire dans #${channel.name}`);
      }
      const message = await channel.send(buildMessage(payload));
      return { id: message.id, channelId: channel.id };
    },

    async dm(userId, text) {
      countAction();
      const target = await member(userId);
      try {
        await target.send({ content: text.slice(0, 2000) || '—', allowedMentions: { parse: [] } });
      } catch {
        // MP bloqués : ce n'est pas une erreur de la commande
      }
    },

    async addRole(userId, roleId) {
      countAction();
      await (await member(userId)).roles.add(role(roleId), `${REASON_PREFIX}ajout de rôle`);
    },

    async removeRole(userId, roleId) {
      countAction();
      await (await member(userId)).roles.remove(role(roleId), `${REASON_PREFIX}retrait de rôle`);
    },

    async timeout(userId, minutes, reason) {
      countAction();
      const target = await member(userId);
      if (!target.moderatable) throw new ProgramError(`Je ne peux pas exclure ${target.user.username} (rôle trop haut ou administrateur)`);
      const ms = Math.min(Math.max(Math.floor(minutes), 1), 40320) * 60_000;
      await target.timeout(ms, (REASON_PREFIX + reason).slice(0, 500));
    },

    async kick(userId, reason) {
      countAction();
      const target = await member(userId);
      if (!target.kickable) throw new ProgramError(`Je ne peux pas expulser ${target.user.username}`);
      await target.kick((REASON_PREFIX + reason).slice(0, 500));
    },

    async ban(userId, reason) {
      countAction();
      const target = await member(userId);
      if (!target.bannable) throw new ProgramError(`Je ne peux pas bannir ${target.user.username}`);
      await target.ban({ reason: (REASON_PREFIX + reason).slice(0, 500) });
    },

    async nickname(userId, nickname) {
      countAction();
      const target = await member(userId);
      if (!target.manageable) throw new ProgramError(`Je ne peux pas changer le pseudo de ${target.user.username}`);
      await target.setNickname(nickname.slice(0, 32) || null, `${REASON_PREFIX}changement de pseudo`);
    },

    async hasRole(userId, roleId) {
      if (!ID_RE.test(userId)) return false;
      const found = await guild.members.fetch(userId).catch(() => null);
      return !!found && found.roles.cache.has(roleId);
    },

    async isAdmin(userId) {
      if (!ID_RE.test(userId)) return false;
      const found = await guild.members.fetch(userId).catch(() => null);
      return !!found && found.permissions.has(PermissionFlagsBits.Administrator);
    },

    async dataGet(scope, scopeId, key) {
      checkKey(key);
      const row = await prisma.customData.findUnique({
        where: { guildId_scope_scopeId_key: { guildId: guild.id, scope, scopeId: scopeKey(scope, scopeId), key } }
      });
      return row ? row.value : null;
    },

    async dataSet(scope, scopeId, key, value) {
      checkKey(key);
      const id = { guildId: guild.id, scope, scopeId: scopeKey(scope, scopeId), key };
      const existing = await prisma.customData.findUnique({ where: { guildId_scope_scopeId_key: id } });
      if (!existing && (await prisma.customData.count({ where: { guildId: guild.id } })) >= MAX_DATA_ROWS) {
        throw new ProgramError('La mémoire du serveur est pleine');
      }
      await prisma.customData.upsert({
        where: { guildId_scope_scopeId_key: id },
        create: { ...id, value: value.slice(0, 1000) },
        update: { value: value.slice(0, 1000) }
      });
    },

    async dataDelete(scope, scopeId, key) {
      checkKey(key);
      await prisma.customData.deleteMany({ where: { guildId: guild.id, scope, scopeId: scopeKey(scope, scopeId), key } });
    }
  };
}

// ───── Opérations réservées aux scripts JavaScript ─────

export interface ScriptOps extends Ops {
  editMessage(channelId: string, messageId: string, payload: MessagePayload): Promise<void>;
  deleteMessage(channelId: string, messageId: string): Promise<void>;
  react(channelId: string, messageId: string, emoji: string): Promise<void>;
  membersWithRole(roleId: string): Promise<{ id: string; name: string; username: string }[]>;
  listRoles(): Promise<{ id: string; name: string; managed: boolean }[]>;
  listChannels(): Promise<{ id: string; name: string; type: string }[]>;
  dataList(scope: Scope, scopeId: string, prefix: string): Promise<{ key: string; value: string }[]>;
  http(method: string, url: string, body: unknown, headers: unknown): Promise<unknown>;
}

export function createScriptOps(ctx: RunContext): ScriptOps {
  const base = createOps(ctx);
  const guild = ctx.guild;

  const countAction = () => {
    if (++ctx.counters.actions > MAX_ACTIONS) throw new ProgramError(`Trop d'actions Discord dans une même commande (${MAX_ACTIONS} maximum)`);
  };

  async function fetchMessage(channelId: string, messageId: string) {
    countAction();
    const channel = ID_RE.test(channelId) ? guild.channels.cache.get(channelId) : undefined;
    if (!channel || !channel.isTextBased() || !('messages' in channel)) throw new ProgramError('Salon introuvable');
    if (!ID_RE.test(messageId)) throw new ProgramError('Identifiant de message invalide');
    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message) throw new ProgramError('Message introuvable');
    return message;
  }

  return {
    ...base,

    async editMessage(channelId, messageId, payload) {
      const message = await fetchMessage(channelId, messageId);
      if (!message.editable) throw new ProgramError('Je ne peux modifier que mes propres messages');
      await message.edit({ ...buildMessage(payload), content: payload.content ?? '' });
    },

    async deleteMessage(channelId, messageId) {
      const message = await fetchMessage(channelId, messageId);
      if (!message.deletable) throw new ProgramError('Je ne peux pas supprimer ce message');
      await message.delete();
    },

    async react(channelId, messageId, emoji) {
      const message = await fetchMessage(channelId, messageId);
      await message.react(emoji.slice(0, 100));
    },

    async membersWithRole(roleId) {
      const role = ID_RE.test(roleId) ? guild.roles.cache.get(roleId) : undefined;
      if (!role) throw new ProgramError('Rôle introuvable');
      return [...role.members.values()].slice(0, 200).map(m => ({ id: m.id, name: m.displayName, username: m.user.username }));
    },

    async listRoles() {
      return [...guild.roles.cache.values()]
        .filter(r => r.id !== guild.id)
        .sort((a, b) => b.position - a.position)
        .slice(0, 250)
        .map(r => ({ id: r.id, name: r.name, managed: r.managed }));
    },

    async listChannels() {
      return [...guild.channels.cache.values()].slice(0, 500).map(c => ({ id: c.id, name: c.name, type: String(c.type) }));
    },

    async dataList(scope, scopeId, prefix) {
      const rows = await prisma.customData.findMany({
        where: { guildId: guild.id, scope, scopeId: scope === 'user' ? scopeId : '', key: { startsWith: prefix.slice(0, 50) } },
        orderBy: { key: 'asc' },
        take: 200
      });
      return rows.map(r => ({ key: r.key, value: r.value }));
    },

    async http(method, url, body, headers) {
      if (++ctx.counters.http > 5) throw new ProgramError('Trop de requêtes HTTP dans une même commande (5 maximum)');
      return scriptHttp(method, url, body, headers);
    }
  };
}
