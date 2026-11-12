import { Events, Interaction, DiscordAPIError } from 'discord.js';
import * as ticketHandlers from './interactions/tickets';
import * as giveawayHandlers from './interactions/giveaways';
import * as commandHandlers from './interactions/commands';
import { handleEndModal } from '../utils/events';
import { handleRosterInteraction } from '../utils/fgiRoster';
import { handleCustomSlash } from '../custom/runtime';
import { handleRegimentModal } from '../utils/regiments';

export const name = Events.InteractionCreate;
export const once = false;

export async function execute(interaction: Interaction) {
  try {
    // Formulaire de choix de régiment : peut être envoyé depuis un message privé
    if (interaction.isModalSubmit() && interaction.customId.startsWith('rgm:')) {
      await handleRegimentModal(interaction);
      return;
    }

    if (!interaction.inCachedGuild()) return;

    // Autocomplétion (ex : choix d'un événement)
    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (command?.autocomplete) await command.autocomplete(interaction);
      return;
    }

    if (interaction.isCommand()) {
      // Commande créée dans le panel (aucune commande du bot ne porte ce nom)
      if (interaction.isChatInputCommand() && !interaction.client.commands.has(interaction.commandName)) {
        if (await handleCustomSlash(interaction)) return;
      }
      await commandHandlers.handleCommand(interaction);
    } else if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_create') {
      await ticketHandlers.handleSelect(interaction);
    } else if (interaction.isUserSelectMenu() && interaction.customId.startsWith('fgiR:')) {
      await handleRosterInteraction(interaction);
    } else if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket_modal_')) {
      await ticketHandlers.handleCreate(interaction);
    } else if (interaction.isModalSubmit() && interaction.customId.startsWith('evtend:')) {
      await handleEndModal(interaction);
    }
    // Les boutons sont gérés dans buttonInteraction.ts
  } catch (error) {
    console.error('Erreur dans interactionCreate:', error);

    if (error instanceof DiscordAPIError) {
      if (error.code === 10062 || error.code === 40060) return;
    }

    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: 'Une erreur est survenue.',
          ephemeral: true
        });
      } catch (e) {
        console.error("Impossible de répondre à l'interaction:", e);
      }
    }
  }
}
