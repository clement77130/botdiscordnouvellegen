# Wiki des commandes personnalisées

> Ce document est aussi disponible dans le panel (page **Wiki**).

## Présentation

Les **commandes personnalisées** servent à créer vos propres commandes et automatisations directement depuis le panel : de la simple réponse « bonjour » jusqu'à un système d'économie complet.

- **Blocs** : on assemble des briques (répondre, donner un rôle, mémoriser un nombre, tester une condition…) sans écrire de code.
- **JavaScript** : pour les développeurs, un script complet avec accès à Discord, à la mémoire et à des API externes (réservé aux personnes de confiance).
- **Déclencheurs** : une commande slash, l'arrivée ou le départ d'un membre, ou le clic sur un bouton.
- **Mémoire** : retenir des valeurs par serveur ou par membre (points, niveaux, délais…).

> Une commande est propre à votre serveur et utilisable quelques secondes après l'enregistrement. Vous pouvez la désactiver sans la supprimer.

## Ma première commande en 2 minutes

- Panel → **Commandes perso** → **＋ Nouvelle** → **Commande slash**.
- Nom : `bonjour` (minuscules, chiffres, - et _). Ajoutez une description.
- Cliquez sur **＋ Ajouter un bloc** → **Répondre**, puis écrivez : `Salut {user} !`
- **Enregistrer**, puis tapez `/bonjour` sur Discord.

Si la commande n'apparaît pas, rechargez Discord (Ctrl+R) ou attendez quelques secondes.

#### Dire bonjour · Débutant

La commande la plus simple : une réponse avec le nom de la personne.

- 💬 Répondre : Salut {user} ! Bienvenue sur **{server.name}** 👋

## Les déclencheurs

| Déclencheur | Quand ? | Particularités |
|---|---|---|
| Commande slash | Quelqu'un tape /nom | Peut avoir des options (texte, nombre, membre, salon, rôle…) et être limitée à certains rôles. |
| Quand un membre arrive | Un membre rejoint le serveur | `{user}` est le membre qui arrive. Les blocs « Répondre » n'ont pas d'effet : utilisez « Envoyer dans un salon » ou « Envoyer un message privé ». |
| Quand un membre part | Un membre quitte le serveur | Mêmes remarques ; le message privé ne peut plus lui être envoyé. |
| Quand on clique sur un bouton | Clic sur un bouton créé par un bloc ou un script | Identifié par un **identifiant de bouton** (ex : `accepter_reglement`). |

« Les réponses ne sont visibles que par la personne qui utilise la commande » rend la réponse privée (message éphémère).

## Variables et options

Dans tous les champs texte des blocs, `{nom}` est remplacé par sa valeur au moment de l'exécution.

| Variable | Valeur |
|---|---|
| `{user}` | Mention de la personne |
| `{user.id}` | Son identifiant |
| `{user.name}` | Son nom d'utilisateur |
| `{user.nickname}` | Son pseudo sur le serveur |
| `{server.name}` | Nom du serveur |
| `{server.members}` | Nombre de membres |
| `{channel}` | Mention du salon |
| `{channel.name}` | Nom du salon |
| `{option.nom}` | Valeur de l'option « nom » de la commande |
| `{date}` | Date du jour |
| `{time}` | Heure |
| `{button.key}` | Identifiant du bouton cliqué (déclencheur « bouton ») |
| `{index}` | Numéro du tour (1, 2, 3…) dans un bloc « Répéter » |

### Options de commande

Chaque option ajoutée à une commande slash devient une variable : `{option.nom}`. Pour une option de type Membre, Rôle ou Salon, `{option.nom}` est l'**identifiant**, `{option.nom.mention}` la mention et `{option.nom.name}` le nom.

### Vos propres variables

Les blocs **Définir une variable**, **Calculer**, **Nombre aléatoire**, **Choisir au hasard** et **Lire dans la mémoire** créent des variables (lettres, chiffres et _, sans espace, commençant par une lettre).

## Référence des blocs

### Messages

#### 💬 Répondre

Répond à la personne qui a utilisé la commande.

| Champ | Type |
|---|---|
| Message | Texte long |
| Afficher dans un embed | Case à cocher |
| Titre de l'embed | Texte |
| Couleur | Couleur |
| Boutons | Boutons |

#### 📢 Envoyer dans un salon

| Champ | Type |
|---|---|
| Salon | Salon |
| Message | Texte long |
| Afficher dans un embed | Case à cocher |
| Titre de l'embed | Texte |
| Couleur | Couleur |
| Boutons | Boutons |

#### ✉️ Envoyer un message privé

| Champ | Type |
|---|---|
| Membre | Texte |
| Message | Texte long |

### Membres

#### ➕ Donner un rôle

| Champ | Type |
|---|---|
| Membre | Texte |
| Rôle | Rôle |

#### ➖ Retirer un rôle

| Champ | Type |
|---|---|
| Membre | Texte |
| Rôle | Rôle |

#### ✏️ Changer le pseudo

| Champ | Type |
|---|---|
| Membre | Texte |
| Nouveau pseudo | Texte |

#### ⏳ Exclure temporairement

| Champ | Type |
|---|---|
| Membre | Texte |
| Minutes | Nombre |
| Raison | Texte |

#### 👢 Expulser

| Champ | Type |
|---|---|
| Membre | Texte |
| Raison | Texte |

#### 🔨 Bannir

| Champ | Type |
|---|---|
| Membre | Texte |
| Raison | Texte |

### Variables

#### 📦 Définir une variable

Utilisable ensuite avec {nom}.

| Champ | Type |
|---|---|
| Nom | Nom |
| Valeur | Texte |

#### 🧮 Calculer

+ - * / % ( ) abs() round() floor() ceil() min() max() sqrt()

| Champ | Type |
|---|---|
| Nom du résultat | Nom |
| Calcul | Texte |

#### 🎲 Nombre aléatoire

| Champ | Type |
|---|---|
| Nom du résultat | Nom |
| Minimum | Texte |
| Maximum (peut être {option.nom}) | Texte |

#### 🎯 Choisir au hasard

| Champ | Type |
|---|---|
| Nom du résultat | Nom |
| Choix (un par ligne) | Texte long |

### Mémoire

#### 📖 Lire dans la mémoire

| Champ | Type |
|---|---|
| Mettre dans la variable | Nom |
| Mémoire | Choix |
| Membre | Texte |
| Clé | Nom |
| Valeur si vide | Texte |

#### 💾 Écrire dans la mémoire

| Champ | Type |
|---|---|
| Mémoire | Choix |
| Membre | Texte |
| Clé | Nom |
| Valeur | Texte |

#### 📈 Ajouter à un nombre mémorisé

| Champ | Type |
|---|---|
| Mettre le résultat dans la variable (facultatif) | Nom |
| Mémoire | Choix |
| Membre | Texte |
| Clé | Nom |
| Quantité (négative pour retirer) | Texte |

#### 🗑️ Effacer de la mémoire

| Champ | Type |
|---|---|
| Mémoire | Choix |
| Membre | Texte |
| Clé | Nom |

### Logique

#### 🔀 Si… alors… sinon

| Champ | Type |
|---|---|
| Conditions | Conditions |
| Alors | Zone de blocs |
| Sinon | Zone de blocs |

#### 🔁 Répéter

| Champ | Type |
|---|---|
| Nombre de fois | Nombre |
| Répéter ces blocs | Zone de blocs |

#### ⏱️ Attendre

| Champ | Type |
|---|---|
| Secondes | Nombre |

#### 🛑 Arrêter

Arrête la commande ici.

## Conditions et calculs

Le bloc **Si… alors… sinon** contient une ou plusieurs conditions, vraies **toutes** ensemble ou **au moins une**. Chaque condition peut être **inversée**.

| Condition | Exemple |
|---|---|
| Comparer deux valeurs | `{score}` est plus grand ou égal à `10` (compare des nombres si les deux valeurs en sont, sinon du texte sans tenir compte des majuscules) |
| Le membre a le rôle | `{user.id}` a le rôle Membre vérifié |
| Le membre est administrateur | `{user.id}` |
| Chance (en %) | 25 % de chance de gagner un bonus |
| La variable est renseignée | `gagnant` (vrai si la variable existe et n'est pas vide) |

### Calculs

Le bloc **Calculer** accepte `+ - * / %`, les parenthèses et les fonctions `abs() round() floor() ceil() min() max() sqrt()`. Les variables sont remplacées avant le calcul : `{points} * 2 + 5`, `round({total} / {nombre})`.

Le minimum et le maximum du bloc **Nombre aléatoire** acceptent aussi des variables : `{option.faces}`.

## La mémoire

Les blocs de la catégorie **Mémoire** retiennent des valeurs même après un redémarrage du bot.

- **Du membre** : une valeur par membre (ses points, son niveau, la date de sa dernière récompense…).
- **Du serveur** : une valeur commune (un compteur global, un message d'événement…).
- Une valeur = un texte de 1000 caractères maximum. Une **clé** = lettres, chiffres, `.`, `-` et `_` (50 caractères).

**Ajouter à un nombre mémorisé** lit le nombre, ajoute la quantité (négative pour retirer) et met le résultat dans une variable : idéal pour un compteur.

#### Compteur de points · Intermédiaire

Mémoire par membre, calcul et condition : un message spécial tous les 10 points.

- 📈 Ajouter à un nombre mémorisé
- 🧮 Calculer
- 💬 Répondre : Tu as maintenant **{total}** points !
- 🔀 Si… alors… sinon
  *Alors*
    - 💬 Répondre : 🎉 Palier atteint : {total} points !

## Les boutons

Un bouton est créé par un bloc « Répondre » ou « Envoyer dans un salon » (section **Boutons**) avec un texte, une couleur et un **identifiant**. Pour qu'un clic fasse quelque chose, créez ensuite une commande de type **Quand on clique sur un bouton** avec **le même identifiant**.

#### Règlement à accepter (1/2) : le message · Avancé

Publie un message avec un bouton. À associer à l'exemple suivant, qui donne le rôle quand on clique. Choisissez le salon dans le bloc « Envoyer dans un salon » et limitez la commande au staff (« Qui peut l'utiliser ? »).

- 📢 Envoyer dans un salon : Clique sur le bouton ci-dessous pour accepter le règlement et accéder 
- 💬 Répondre : Message publié.

#### Règlement à accepter (2/2) : le bouton · Avancé

S'exécute quand quelqu'un clique sur le bouton « accepter_reglement » : donne un rôle (à choisir dans le bloc) et confirme.

- ➕ Donner un rôle
- 💬 Répondre : ✅ Merci {user}, le règlement est accepté !

> Les boutons restent actifs tant que la commande « bouton » correspondante existe et est activée. Tout le monde peut cliquer, sauf si vous limitez la commande à certains rôles.

## Arrivée et départ d'un membre

#### Message d'accueil · Intermédiaire

À l'arrivée d'un membre : un message dans un salon (à choisir) et un message privé.

- 📢 Envoyer dans un salon : Bienvenue {user} sur **{server.name}** ! Nous sommes maintenant {serve
- ✉️ Envoyer un message privé : Salut {user.name}, bienvenue sur {server.name} ! Pense à lire le règle

## JavaScript : les bases

Dans l'éditeur, choisissez l'onglet **</> JavaScript**. Votre code est le **corps d'une fonction asynchrone** : utilisez `await` devant les fonctions du bot, et `return` pour arrêter le script.

Variables disponibles :

| Nom | Contenu |
|---|---|
| `user` | `{ id, name, tag, nickname, mention }` : la personne qui déclenche |
| `server` | `{ id, name, members }` |
| `channel` | `{ id, name }` du salon où la commande est utilisée |
| `options` | Les options de la commande : `options.pseudo`, `options.membre` (identifiant)… |
| `vars` | Toutes les variables à plat (ex : `vars['button.key']`) |
| `trigger` | `slash`, `button`, `memberJoin` ou `memberLeave` |

```js
await reply('Bonjour ' + user.name + ' !');
```

> Le JavaScript est réservé au propriétaire du bot et aux identifiants listés dans SCRIPT_EDITOR_IDS (fichier .env). Le script tourne dans un environnement isolé : pas de fichiers, pas de `require`, pas de `eval`.

#### Premier script · Débutant

Le plus petit script possible.

```js
await reply('Pong ! 🏓');
```

## JavaScript : toutes les fonctions

| Fonction | Rôle |
|---|---|
| `reply(message)` | Répond à la commande. Renvoie `{ id, channelId }`. Le premier appel remplace « réflexion en cours », les suivants envoient des messages supplémentaires. |
| `send(salonId, message)` | Envoie un message dans un salon. Renvoie `{ id, channelId }`. |
| `editMessage(salonId, messageId, message)` | Modifie un message envoyé par le bot. |
| `deleteMessage(salonId, messageId)` | Supprime un message (le bot doit pouvoir le supprimer). |
| `react(salonId, messageId, emoji)` | Ajoute une réaction (`'👍'` ou `'nom:id'` pour un émoji du serveur). |
| `dm(membreId, texte)` | Message privé (ignoré en silence si ses MP sont fermés). |
| `addRole(membreId, roleId)` / `removeRole(...)` | Donne ou retire un rôle. |
| `timeout(membreId, minutes, raison)` | Exclut temporairement (max. 28 jours). |
| `kick(membreId, raison)` / `ban(membreId, raison)` | Expulse ou bannit. |
| `setNickname(membreId, pseudo)` | Change le pseudo (vide = retire). |
| `member(membreId)` | `{ id, name, tag, nickname, roles: [ids], isAdmin }` ou `null`. |
| `membersWithRole(roleId)` | Liste `[{ id, name, username }]` (200 maximum). |
| `roles()` / `channels()` | Rôles `[{ id, name, managed }]` et salons `[{ id, name, type }]` du serveur. |
| `data.get(cle)` `data.set(cle, valeur)` `data.delete(cle)` `data.list(prefixe)` | Mémoire **du serveur**. `list` renvoie `[{ key, value }]` (200 maximum). |
| `userData.get(membreId, cle)` `.set` `.delete` `.list(membreId, prefixe)` | Mémoire **d'un membre**. |
| `http.get(url)` / `http.post(url, corps)` | Requête HTTPS vers un hôte autorisé. Renvoie `{ status, ok, json, text }`. |
| `sleep(ms)` | Attend (10 s maximum à la fois, 12 s au total). |
| `random(min, max)` | Entier aléatoire, bornes comprises. |
| `log(...)` | Écrit dans la console du bot (`journalctl -u bot-army -f`). |

### Le format d'un message

`reply`, `send` et `editMessage` acceptent un texte ou un objet :

```js
await reply({
  content: 'Texte au-dessus de l\'embed',         // facultatif
  embed: {
    title: 'Titre',
    description: 'Description',
    color: '#5865f2',
    url: 'https://exemple.fr',                    // lien sur le titre (https)
    author: 'Nom affiché en haut',
    thumbnail: 'https://exemple.fr/petite.png',   // https uniquement
    image: 'https://exemple.fr/grande.png',
    footer: 'Pied de page',
    timestamp: true,
    fields: [
      { name: 'Champ 1', value: 'Valeur', inline: true },
      { name: 'Champ 2', value: 'Valeur', inline: true }
    ]
  },
  buttons: [                                      // 5 boutons maximum
    { label: 'Oui', style: 'success', key: 'vote_oui' },   // primary, secondary, success, danger
    { label: 'Non', style: 'danger', key: 'vote_non' }
  ]
});
```

Les messages n'envoient jamais de `@everyone`, `@here` ni de mention de rôle ; les mentions de membres (`<@id>`) fonctionnent.

## JavaScript : aller plus loin

### Gérer les erreurs

Toute erreur d'une fonction (permission manquante, membre introuvable…) peut être attrapée :

```js
try {
  await addRole(options.membre, '123456789012345678');
  await reply('Rôle donné.');
} catch (e) {
  await reply('Impossible : ' + e.message);
}
```

### Garder des données

Servez-vous de `data` (serveur) et `userData` (membre) pour tout ce qui doit survivre : points, délais (`Date.now()`), préférences. Un préfixe de clé (`coins:`) permet ensuite de tout relire avec `data.list('coins:')`.

### Appeler une API

`http.get` et `http.post` ne contactent que des hôtes autorisés : par défaut l'API publique de Roblox (`users`, `groups`, `thumbnails`, `badges`, `inventory`, `games`, `friends`, `apis`) et `api.github.com`. Le propriétaire du bot peut en ajouter avec la variable `SCRIPT_HTTP_HOSTS` (liste séparée par des virgules). 5 requêtes par exécution, réponse limitée à 200 000 caractères.

#### Profil d'un membre · Intermédiaire

Lire un membre, tester un résultat vide et construire un embed avec des champs.

```js
const id = options.membre || user.id;
const m = await member(id);
if (!m) return reply('Membre introuvable.');

await reply({
  embed: {
    title: 'Profil de ' + m.name,
    color: '#5865f2',
    fields: [
      { name: 'Identifiant', value: m.id, inline: true },
      { name: 'Rôles', value: String(m.roles.length), inline: true },
      { name: 'Administrateur', value: m.isAdmin ? 'Oui' : 'Non', inline: true }
    ],
    timestamp: true
  }
});
```

#### Appeler une API (Roblox) · Avancé

Deux requêtes HTTP vers l'API publique de Roblox, lecture du JSON et affichage dans un embed.

```js
const search = await http.post('https://users.roblox.com/v1/usernames/users', {
  usernames: [options.pseudo],
  excludeBannedUsers: false
});
const found = search.json && search.json.data && search.json.data[0];
if (!found) return reply('Aucun compte Roblox trouvé pour « ' + options.pseudo + ' ».');

const profil = await http.get('https://users.roblox.com/v1/users/' + found.id);
const info = profil.json || {};

await reply({
  embed: {
    title: found.name,
    url: 'https://www.roblox.com/users/' + found.id + '/profile',
    description: info.description || 'Pas de description.',
    color: '#e2231a',
    fields: [
      { name: 'Pseudo affiché', value: found.displayName || found.name, inline: true },
      { name: 'Identifiant', value: String(found.id), inline: true },
      { name: 'Compte créé', value: info.created ? info.created.slice(0, 10) : '—', inline: true }
    ]
  }
});
```

## Exemples complets (du plus simple au plus complexe)

Cliquez sur **Utiliser cet exemple** pour l'ouvrir dans l'éditeur, puis adaptez-le (salons, rôles, textes).

#### Lancer un dé · Débutant

Une option (nombre de faces), un tirage au hasard et une réponse qui reprend les variables.

- 🎲 Nombre aléatoire
- 💬 Répondre : 🎲 {user.name} lance un dé à {option.faces} faces et obtient **{n}** !

#### Récompense quotidienne (économie) · Expert

Délai de 24 h, série de jours, récompense aléatoire et mémoire par membre ET par serveur. À combiner avec le classement ci-dessous.

```js
const DAY = 24 * 60 * 60 * 1000;
const last = Number((await userData.get(user.id, 'daily_last')) || 0);
const now = Date.now();

if (now - last < DAY) {
  const heures = Math.ceil((DAY - (now - last)) / 3600000);
  return reply('⏳ Reviens dans ' + heures + ' h pour ta prochaine récompense.');
}

const streak = now - last < 2 * DAY ? Number((await userData.get(user.id, 'daily_streak')) || 0) + 1 : 1;
const gain = random(50, 100) + Math.min(streak, 10) * 10;
const coins = Number((await data.get('coins:' + user.id)) || 0) + gain;

await userData.set(user.id, 'daily_last', now);
await userData.set(user.id, 'daily_streak', streak);
await data.set('coins:' + user.id, coins);

await reply({
  embed: {
    title: '💰 Récompense quotidienne',
    description: user.mention + ' reçoit **' + gain + '** pièces !',
    color: '#f1c40f',
    fields: [
      { name: 'Série', value: streak + ' jour(s)', inline: true },
      { name: 'Total', value: coins + ' pièces', inline: true }
    ]
  }
});
```

#### Classement des plus riches · Expert

Liste les clés de la mémoire du serveur (data.list), trie et affiche le top 10.

```js
const lignes = await data.list('coins:');
const classement = lignes
  .map(l => ({ id: l.key.slice(6), coins: Number(l.value) }))
  .sort((a, b) => b.coins - a.coins)
  .slice(0, 10);

if (classement.length === 0) return reply("Personne n'a encore de pièces. Utilisez /daily !");

const texte = classement
  .map((e, i) => (i + 1) + '. <@' + e.id + '> : **' + e.coins + '** pièces')
  .join('\n');

await reply({ embed: { title: '🏆 Classement', description: texte, color: '#f1c40f' } });
```

## Limites, sécurité et dépannage

### Limites

- 50 commandes par serveur ; 200 blocs et 8 niveaux d'imbrication par commande.
- Blocs : 500 étapes, 15 secondes d'attente au total, 15 messages et 40 actions Discord par exécution.
- Scripts : 20 secondes, 80 appels vers le bot, 5 requêtes HTTP, 64 Mo de mémoire.
- Mémoire : 1000 caractères par valeur, 20 000 valeurs par serveur.

### Sécurité

- Un bloc sensible (rôle, expulsion, bannissement, exclusion, pseudo) n'est accepté que si **vous** avez vous-même la permission correspondante, et pour les rôles, seulement sous votre rôle le plus haut.
- Un script ne peut pas lire de fichier, lancer de programme ni voir les secrets du bot ; chaque appel est revérifié par le bot.
- Si quelqu'un perd le droit d'écrire des scripts, ses scripts cessent de s'exécuter.

### Dépannage

- **La commande n'apparaît pas sur Discord** : vérifiez qu'elle est activée, rechargez Discord (Ctrl+R). Le panel signale un refus de Discord (limite de 100 commandes, nom déjà pris).
- **« Une erreur est survenue dans cette commande personnalisée »** : la liste des commandes affiche la **dernière erreur** en rouge (survolez-la pour la lire en entier).
- **Un rôle ne se donne pas** : le rôle du bot doit être **au-dessus** du rôle à donner (Paramètres du serveur → Rôles).
- **Un script ne répond pas** : ajoutez `log('étape 1')` et regardez les journaux du bot avec `journalctl -u bot-army -f`.
