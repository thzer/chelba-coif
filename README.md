# Chelba Coif

Site vitrine et prise de rendez-vous pour le barber shop Chelba Coif (Djerba),
avec une interface d'administration.

- **Site public** (`/`) : services, galerie, avis clients, réservation d'un
  créneau avec envoi du récapitulatif sur WhatsApp. Disponible en
  **français, anglais et arabe** (sélecteur dans l'en-tête, RTL pour l'arabe).
- **Administration** (`/admin`) : rendez-vous (liste + agenda du jour par coiffeur,
  messages WhatsApp pré-remplis vers le client), statistiques, services (avec
  upload d'images), galerie, modération des avis, horaires d'ouverture et
  fermetures exceptionnelles, sécurité du compte (2FA), mot de passe oublié.

Stack : Next.js 16 (App Router), React 19, Tailwind CSS 4, Supabase
(Postgres + Auth + Storage), déployé sur Vercel.

## Démarrage

```bash
npm install
cp .env.example .env.local   # puis remplir les valeurs
npm run dev
```

Variables d'environnement (voir `.env.example`) :

| Variable                        | Rôle                                                        |
| ------------------------------- | ----------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL du projet Supabase                                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique `anon` (jamais la `service_role`)              |
| `NEXT_PUBLIC_SITE_URL`          | URL publique du site (SEO : sitemap, robots, Open Graph)    |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`  | Clé publique VAPID (notifications push admin)               |
| `VAPID_PRIVATE_KEY`             | Clé privée VAPID — serveur uniquement                       |
| `BOOKING_WEBHOOK_SECRET`        | Secret partagé base → `/api/notify-booking` (aussi dans Vault) |

## Base de données et sécurité

Le site parle directement à Supabase depuis le navigateur : **toute la sécurité
repose sur le Row Level Security**. Après création du projet Supabase :

1. Exécuter [`supabase/security.sql`](supabase/security.sql) dans
   *SQL Editor* (idempotent, ré-exécutable).
2. *Authentication → Providers → Email* : désactiver **Allow new users to sign up**.
   Recommandé : *Minimum password length* = 12.
3. *Authentication → URL Configuration* : ajouter aux **Redirect URLs**
   `https://<votre-domaine>/admin/reset-password` (et
   `http://localhost:3000/admin/reset-password` pour le développement),
   sinon le lien « Mot de passe oublié » ne fonctionnera pas.
4. Créer l'utilisateur admin dans *Authentication → Users*, puis l'autoriser :

   ```sql
   insert into public.admin_users (id, email)
   select id, email from auth.users where email = 'admin@exemple.com'
   on conflict do nothing;
   ```

Tables : `appointments`, `services`, `gallery`, `reviews`, `settings`
(dont `schedule` / `slot_interval`), `closures`, `barbers`, `admin_users`. Bucket Storage public : `gallery` (images de la galerie et des
services).

## Changement de nom de domaine

Mettre à jour `NEXT_PUBLIC_SITE_URL` dans Vercel (*Settings → Environment
Variables*) puis redéployer. Métadonnées, `sitemap.xml` et `robots.txt`
suivent automatiquement.

## Points à connaître

- Plusieurs coiffeurs : le client choisit le sien (ou « Sans préférence » →
  premier disponible). Chaque coiffeur a son propre planning ; un créneau
  est unique par coiffeur. Section « Nos coiffeurs » sur le site (photo,
  description, bouton « Réserver avec … »). Gestion (photo, nom,
  description, activation) dans *Admin → Paramètres → Coiffeurs*.
  Les horaires sont communs à tous les coiffeurs.
- Les horaires, la pause, l'intervalle des créneaux et les fermetures
  exceptionnelles se règlent dans *Admin → Paramètres*. Les créneaux proposés
  tiennent compte de la durée réelle de chaque service.
- Une réservation est enregistrée « en attente » puis WhatsApp s'ouvre
  pré-rempli côté client. Le salon reçoit une **notification push** sur
  chaque appareil activé dans *Admin → Paramètres → Notifications* (trigger
  `notify_new_booking` → pg_net → `/api/notify-booking` → web-push), et un
  bandeau temps réel si l'admin est ouvert. Confirmer ou annuler un RDV ouvre
  WhatsApp avec un message prêt pour le client.
- Sur iPhone, les notifications exigent d'ajouter l'admin à l'écran d'accueil
  (manifest PWA fourni). Les secrets `site_url` et `booking_webhook_secret`
  sont dans *Supabase → Vault* ; à mettre à jour si le domaine change.
- Double authentification (application TOTP) activable dans *Admin →
  Paramètres → Sécurité*. Une fois activée, `is_admin()` exige une session
  validée par un code : la protection est appliquée par la base, pas
  seulement par l'interface. En cas de perte du téléphone : supprimer le
  facteur dans *Supabase → Authentication → Users → MFA*.
- **Aucun double rendez-vous possible** : contrainte d'exclusion en base
  (`appointments_no_overlap`) par coiffeur, qui tient compte de la durée du
  service (11:00 45 min bloque 11:30). Côté client, les créneaux pris sont
  masqués, la liste est actualisée toutes les 25 s pendant la réservation, et
  un conflit affiche l'heure concernée avec les créneaux voisins libres et les
  coiffeurs disponibles à cette heure.
- **Annulation par le client** : chaque réservation a un jeton secret
  (`cancel_token`) → page `/rdv/<jeton>` (détails, annulation jusqu'à 2 h
  avant, opt-in rappel). Le lien est affiché à la confirmation et inclus dans
  le WhatsApp de confirmation du barbier. Une annulation client notifie le salon.
- **Rappels automatiques** (pg_cron toutes les 15 min → `run_reminders()` →
  `/api/reminders`) : push au client 24 h avant s'il a activé le rappel,
  push au barbier 30 min avant, récap à 08:00. *Admin → Rendez-vous → Rappels*
  liste les rappels WhatsApp à envoyer à la main.
- **Téléphones** normalisés au format international (`lib/phone.ts`), avec
  écran de confirmation du numéro avant l'envoi.
- **Finances** (tableau de bord) : CA, coût produits (`services.cost`),
  commissions (`barbers.commission_pct`), dépenses (`expenses`), marge nette,
  par période et par coiffeur. Seuls les RDV **terminés** comptent : pensez à
  cliquer « Terminer » après chaque prestation.
- Traductions du site public : `lib/i18n.ts`. L'administration reste en
  français.

## Scripts

```bash
npm run dev     # développement
npm run build   # build de production
npm run start   # serveur de production
npm run lint    # ESLint
```
