-- =============================================================================
-- Chelba Coif — sécurisation de la base Supabase
-- =============================================================================
-- À exécuter dans Supabase > SQL Editor (une seule fois, idempotent).
--
-- Pourquoi ce fichier est indispensable :
--   Le site parle DIRECTEMENT à Supabase depuis le navigateur avec la clé
--   `anon` (publique par définition). Les vérifications faites dans React
--   (page admin, formulaire de réservation…) peuvent être contournées par
--   n'importe qui avec un simple `curl`. La SEULE vraie barrière est le
--   Row Level Security (RLS) défini ici.
--
-- Ce script met en place :
--   1. `is_admin()`         : vrai si l'utilisateur connecté est dans admin_users
--   2. RLS sur chaque table : lecture publique limitée, écriture admin only
--   3. `get_booked_slots()` : RPC qui expose uniquement les heures déjà prises
--                            (plus jamais les noms / téléphones des clients)
--   4. Garde-fous côté base : statut forcé à 'pending', date non passée,
--                            avis non publiés par défaut, anti-spam léger
--   5. Policies Storage     : bucket `gallery` lisible par tous, modifiable
--                            uniquement par un admin
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 0. Table des administrateurs (créée si absente)
-- -----------------------------------------------------------------------------
create table if not exists public.admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Pour ajouter un admin (à faire manuellement, jamais depuis le site) :
--   insert into public.admin_users (id)
--   select id from auth.users where email = 'votre-email@exemple.com'
--   on conflict do nothing;

-- -----------------------------------------------------------------------------
-- 1. is_admin()
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. RLS
-- -----------------------------------------------------------------------------
alter table public.admin_users  enable row level security;
alter table public.appointments enable row level security;
alter table public.services     enable row level security;
alter table public.gallery      enable row level security;
alter table public.reviews      enable row level security;
alter table public.settings     enable row level security;

-- ---- admin_users : chacun ne voit que sa propre ligne, aucune écriture API --
drop policy if exists "admin_users: read own row" on public.admin_users;
create policy "admin_users: read own row"
  on public.admin_users for select
  to authenticated
  using (id = auth.uid());

-- ---- services ----------------------------------------------------------------
drop policy if exists "services: public read active"   on public.services;
drop policy if exists "services: admin read all"       on public.services;
drop policy if exists "services: admin write"          on public.services;

create policy "services: public read active"
  on public.services for select
  to anon, authenticated
  using (active = true or public.is_admin());

create policy "services: admin write"
  on public.services for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- gallery -----------------------------------------------------------------
drop policy if exists "gallery: public read active" on public.gallery;
drop policy if exists "gallery: admin write"        on public.gallery;

create policy "gallery: public read active"
  on public.gallery for select
  to anon, authenticated
  using (active = true or public.is_admin());

create policy "gallery: admin write"
  on public.gallery for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- reviews -----------------------------------------------------------------
drop policy if exists "reviews: public read active" on public.reviews;
drop policy if exists "reviews: public insert"      on public.reviews;
drop policy if exists "reviews: admin write"        on public.reviews;

create policy "reviews: public read active"
  on public.reviews for select
  to anon, authenticated
  using (active = true or public.is_admin());

-- Un visiteur peut déposer un avis, mais il est TOUJOURS non publié
-- (active = false) et borné : impossible de forcer active = true via l'API.
create policy "reviews: public insert"
  on public.reviews for insert
  to anon, authenticated
  with check (
    active = false
    and rating between 1 and 5
    and length(btrim(comment)) between 5 and 1000
    and (customer_name is null or length(btrim(customer_name)) between 1 and 80)
  );

create policy "reviews: admin write"
  on public.reviews for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- settings ----------------------------------------------------------------
drop policy if exists "settings: public read"  on public.settings;
drop policy if exists "settings: admin update" on public.settings;

create policy "settings: public read"
  on public.settings for select
  to anon, authenticated
  using (true);

create policy "settings: admin update"
  on public.settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- appointments ------------------------------------------------------------
-- Lecture : ADMIN UNIQUEMENT. Le public passe par get_booked_slots() qui ne
-- renvoie que les heures (plus de fuite des noms/téléphones de tous les clients).
drop policy if exists "appointments: admin read"    on public.appointments;
drop policy if exists "appointments: public insert" on public.appointments;
drop policy if exists "appointments: admin write"   on public.appointments;

create policy "appointments: admin read"
  on public.appointments for select
  to authenticated
  using (public.is_admin());

create policy "appointments: public insert"
  on public.appointments for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and appointment_date >= current_date
    and length(btrim(customer_name)) between 1 and 80
    and btrim(phone) ~ '^\+?[0-9 .-]{8,20}$'
    and exists (
      select 1 from public.services s
      where s.id = service_id and s.active = true
    )
  );

create policy "appointments: admin write"
  on public.appointments for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "appointments: admin delete" on public.appointments;
create policy "appointments: admin delete"
  on public.appointments for delete
  to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- 3. RPC get_booked_slots(date) — heures prises, sans données personnelles
-- -----------------------------------------------------------------------------
create or replace function public.get_booked_slots(target_date date)
returns table (appointment_time text)
language sql
stable
security definer
set search_path = public
as $$
  select a.appointment_time::text
  from public.appointments a
  where a.appointment_date = target_date
    and a.status in ('pending', 'confirmed');
$$;

revoke all on function public.get_booked_slots(date) from public;
grant execute on function public.get_booked_slots(date) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. Garde-fous supplémentaires
-- -----------------------------------------------------------------------------

-- Statuts autorisés
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'appointments_status_check'
  ) then
    alter table public.appointments
      add constraint appointments_status_check
      check (status in ('pending', 'confirmed', 'completed', 'cancelled'));
  end if;
end $$;

-- Pas de double réservation sur un créneau actif (le front gère le code 23505).
-- Si un index équivalent existe déjà sous un autre nom, celui-ci est redondant
-- mais inoffensif.
create unique index if not exists appointments_active_slot_unique
  on public.appointments (appointment_date, appointment_time)
  where status in ('pending', 'confirmed');

-- Anti-spam léger : max 3 réservations actives par numéro de téléphone.
create or replace function public.limit_active_appointments_per_phone()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_count integer;
begin
  select count(*) into active_count
  from public.appointments
  where regexp_replace(phone, '\D', '', 'g') = regexp_replace(new.phone, '\D', '', 'g')
    and status in ('pending', 'confirmed')
    and appointment_date >= current_date;

  if active_count >= 3 then
    raise exception 'Trop de réservations actives pour ce numéro.'
      using errcode = 'check_violation';
  end if;

  new.customer_name := btrim(new.customer_name);
  new.phone := btrim(new.phone);

  return new;
end;
$$;

drop trigger if exists appointments_limit_per_phone on public.appointments;
create trigger appointments_limit_per_phone
  before insert on public.appointments
  for each row execute function public.limit_active_appointments_per_phone();

-- -----------------------------------------------------------------------------
-- 5. Storage — bucket `gallery`
-- -----------------------------------------------------------------------------
-- Lecture publique (les images sont affichées sur le site), écriture admin only.
drop policy if exists "gallery storage: public read"  on storage.objects;
drop policy if exists "gallery storage: admin insert" on storage.objects;
drop policy if exists "gallery storage: admin update" on storage.objects;
drop policy if exists "gallery storage: admin delete" on storage.objects;

create policy "gallery storage: public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'gallery');

create policy "gallery storage: admin insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'gallery' and public.is_admin());

create policy "gallery storage: admin update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'gallery' and public.is_admin())
  with check (bucket_id = 'gallery' and public.is_admin());

create policy "gallery storage: admin delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'gallery' and public.is_admin());

-- Limite la taille / les types acceptés par le bucket lui-même (défense en
-- profondeur : le front vérifie aussi, mais le front peut être contourné).
update storage.buckets
set
  file_size_limit = 5242880, -- 5 MB
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'gallery';

commit;

-- =============================================================================
-- Après exécution, vérifiez dans Supabase > Authentication > Providers > Email
-- que « Allow new users to sign up » est DÉSACTIVÉ : le site n'a aucun
-- formulaire d'inscription, seul(s) le(s) admin(s) doivent avoir un compte.
-- =============================================================================
