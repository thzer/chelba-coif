# Chelba Coif

Site vitrine et prise de rendez-vous pour le barber shop Chelba Coif (Djerba),
avec une interface d'administration.

- **Site public** (`/`) : services, galerie, avis clients, réservation d'un
  créneau avec envoi du récapitulatif sur WhatsApp.
- **Administration** (`/admin`) : gestion des rendez-vous, services (avec
  upload d'images), galerie, modération des avis, paramètres du salon.

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

## Base de données et sécurité

Le site parle directement à Supabase depuis le navigateur : **toute la sécurité
repose sur le Row Level Security**. Après création du projet Supabase :

1. Exécuter [`supabase/security.sql`](supabase/security.sql) dans
   *SQL Editor* (idempotent, ré-exécutable).
2. *Authentication → Providers → Email* : désactiver **Allow new users to sign up**.
3. Créer l'utilisateur admin dans *Authentication → Users*, puis l'autoriser :

   ```sql
   insert into public.admin_users (id, email)
   select id, email from auth.users where email = 'admin@exemple.com'
   on conflict do nothing;
   ```

Tables : `appointments`, `services`, `gallery`, `reviews`, `settings`,
`admin_users`. Bucket Storage public : `gallery` (images de la galerie et des
services).

## Changement de nom de domaine

Mettre à jour `NEXT_PUBLIC_SITE_URL` dans Vercel (*Settings → Environment
Variables*) puis redéployer. Métadonnées, `sitemap.xml` et `robots.txt`
suivent automatiquement.

## Points à connaître (logique métier dans le code)

- Les horaires réservables sont définis dans `app/page.tsx` (fermé le
  mercredi, samedi jusqu'à 20h, pause 12h30–14h). Le champ « Horaires » de
  l'admin ne change que le texte affiché.
- Une réservation est enregistrée « en attente » puis WhatsApp s'ouvre
  pré-rempli. Aucune notification automatique n'est envoyée au salon : les
  demandes se consultent dans l'admin.
- Pas de « mot de passe oublié » dans l'admin : réinitialiser depuis
  *Supabase → Authentication → Users*.

## Scripts

```bash
npm run dev     # développement
npm run build   # build de production
npm run start   # serveur de production
npm run lint    # ESLint
```
