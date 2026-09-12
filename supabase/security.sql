-- =============================================================================
-- Chelba Coif — sécurisation de la base Supabase
-- =============================================================================
-- ✅ APPLIQUÉ sur le projet `napycyccvnqxgzmkjydf` le 2026-09-12 via les
--    migrations `harden_rls_storage_and_booked_slots_rpc` et
--    `restrict_security_definer_functions` (visibles dans Supabase >
--    Database > Migrations).
--
-- Ce fichier sert de référence et permet de rejouer la sécurisation sur un
-- nouveau projet (script idempotent). Il complète les policies déjà créées
-- à l'origine du projet (lecture publique des services/galerie/avis actifs,
-- écriture réservée aux admins via is_admin()).
--
-- Pourquoi c'est indispensable : le site parle DIRECTEMENT à Supabase depuis
-- le navigateur avec la clé `anon` (publique). Les vérifications faites dans
-- React peuvent être contournées ; la seule vraie barrière est le RLS.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 0. Table des administrateurs
-- -----------------------------------------------------------------------------
create table if not exists public.admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;

drop policy if exists "Admins can read their own admin record" on public.admin_users;
create policy "Admins can read their own admin record"
  on public.admin_users for select
  to authenticated
  using (id = auth.uid());

-- Pour ajouter un admin (jamais depuis le site) :
--   insert into public.admin_users (id, email)
--   select id, email from auth.users where email = 'admin@exemple.com'
--   on conflict do nothing;

-- -----------------------------------------------------------------------------
-- 1. is_admin() — utilisée par toutes les policies d'écriture
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where id = auth.uid());
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- -----------------------------------------------------------------------------
-- 2. appointments
-- -----------------------------------------------------------------------------
alter table public.appointments enable row level security;

-- Lecture / modification / suppression : admins uniquement.
drop policy if exists "Admins can view appointments"   on public.appointments;
drop policy if exists "Admins can update appointments" on public.appointments;
drop policy if exists "Admins can delete appointments" on public.appointments;
create policy "Admins can view appointments"
  on public.appointments for select to authenticated using (public.is_admin());
create policy "Admins can update appointments"
  on public.appointments for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete appointments"
  on public.appointments for delete to authenticated using (public.is_admin());

-- Insertion publique bornée : statut forcé à 'pending', date non passée,
-- nom/téléphone sains, service existant et actif.
drop policy if exists "Anyone can create appointments" on public.appointments;
create policy "Anyone can create appointments"
  on public.appointments for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and appointment_date >= current_date
    and length(btrim(customer_name)) between 1 and 80
    and btrim(phone) ~ '^\+?[0-9 .-]{8,20}$'
    and exists (select 1 from public.services s where s.id = service_id and s.active = true)
  );

-- Statuts autorisés
alter table public.appointments drop constraint if exists appointments_status_check;
alter table public.appointments
  add constraint appointments_status_check
  check (status in ('pending', 'confirmed', 'completed', 'cancelled'));

-- Pas de double réservation sur un créneau actif (le front gère le code 23505)
create unique index if not exists appointments_unique_active_slot
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
revoke all on function public.limit_active_appointments_per_phone() from public, anon, authenticated;

drop trigger if exists appointments_limit_per_phone on public.appointments;
create trigger appointments_limit_per_phone
  before insert on public.appointments
  for each row execute function public.limit_active_appointments_per_phone();

-- RPC publique : heures réservées d'une journée, format HH:MM, sans aucune
-- donnée personnelle. C'est ce que la page de réservation utilise.
create or replace function public.get_booked_slots(target_date date)
returns table (appointment_time text)
language sql
stable
security definer
set search_path = public
as $$
  select to_char(a.appointment_time, 'HH24:MI')
  from public.appointments a
  where a.appointment_date = target_date
    and a.status in ('pending', 'confirmed');
$$;
revoke all on function public.get_booked_slots(date) from public;
grant execute on function public.get_booked_slots(date) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. services / gallery / reviews / settings
-- -----------------------------------------------------------------------------
alter table public.services enable row level security;
alter table public.gallery  enable row level security;
alter table public.reviews  enable row level security;
alter table public.settings enable row level security;

drop policy if exists "Public can view active services" on public.services;
drop policy if exists "Admins can view all services"    on public.services;
drop policy if exists "Admins can insert services"      on public.services;
drop policy if exists "Admins can update services"      on public.services;
drop policy if exists "Admins can delete services"      on public.services;
create policy "Public can view active services"
  on public.services for select to anon, authenticated using (active = true);
create policy "Admins can view all services"
  on public.services for select to authenticated using (public.is_admin());
create policy "Admins can insert services"
  on public.services for insert to authenticated with check (public.is_admin());
create policy "Admins can update services"
  on public.services for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete services"
  on public.services for delete to authenticated using (public.is_admin());

drop policy if exists "Public can view active gallery" on public.gallery;
drop policy if exists "Admins can view all gallery"    on public.gallery;
drop policy if exists "Admins can insert gallery"      on public.gallery;
drop policy if exists "Admins can update gallery"      on public.gallery;
drop policy if exists "Admins can delete gallery"      on public.gallery;
create policy "Public can view active gallery"
  on public.gallery for select to anon, authenticated using (active = true);
create policy "Admins can view all gallery"
  on public.gallery for select to authenticated using (public.is_admin());
create policy "Admins can insert gallery"
  on public.gallery for insert to authenticated with check (public.is_admin());
create policy "Admins can update gallery"
  on public.gallery for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete gallery"
  on public.gallery for delete to authenticated using (public.is_admin());

-- Un visiteur peut déposer un avis, TOUJOURS non publié (active = false)
-- et borné : impossible de forcer la publication via l'API.
alter table public.reviews alter column active set default false;

drop policy if exists "Public can view active reviews" on public.reviews;
drop policy if exists "Admins can view all reviews"    on public.reviews;
drop policy if exists "Anyone can submit reviews"      on public.reviews;
drop policy if exists "Admins can update reviews"      on public.reviews;
drop policy if exists "Admins can delete reviews"      on public.reviews;
create policy "Public can view active reviews"
  on public.reviews for select to anon, authenticated using (active = true);
create policy "Admins can view all reviews"
  on public.reviews for select to authenticated using (public.is_admin());
create policy "Anyone can submit reviews"
  on public.reviews for insert to anon, authenticated
  with check (
    active = false
    and rating between 1 and 5
    and char_length(btrim(comment)) between 5 and 1000
    and (customer_name is null or char_length(btrim(customer_name)) between 1 and 80)
  );
create policy "Admins can update reviews"
  on public.reviews for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete reviews"
  on public.reviews for delete to authenticated using (public.is_admin());

drop policy if exists "Public can read settings"   on public.settings;
drop policy if exists "Admins can update settings" on public.settings;
create policy "Public can read settings"
  on public.settings for select to anon, authenticated using (true);
create policy "Admins can update settings"
  on public.settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- 4. Storage — bucket `gallery` (photos de la galerie et des services)
-- -----------------------------------------------------------------------------
-- Lecture publique, écriture réservée aux ADMINS (pas à tout utilisateur
-- connecté).
drop policy if exists "Public can view gallery images"                 on storage.objects;
drop policy if exists "Authenticated users can upload gallery images"  on storage.objects;
drop policy if exists "Authenticated users can update gallery images"  on storage.objects;
drop policy if exists "Authenticated users can delete gallery images"  on storage.objects;
drop policy if exists "Admins can upload gallery images"               on storage.objects;
drop policy if exists "Admins can update gallery images"               on storage.objects;
drop policy if exists "Admins can delete gallery images"               on storage.objects;

create policy "Public can view gallery images"
  on storage.objects for select using (bucket_id = 'gallery');
create policy "Admins can upload gallery images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'gallery' and public.is_admin());
create policy "Admins can update gallery images"
  on storage.objects for update to authenticated
  using (bucket_id = 'gallery' and public.is_admin())
  with check (bucket_id = 'gallery' and public.is_admin());
create policy "Admins can delete gallery images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'gallery' and public.is_admin());

-- Limites imposées par le bucket lui-même (défense en profondeur).
update storage.buckets
set file_size_limit = 5242880, -- 5 MB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'gallery';

commit;

-- =============================================================================
-- Réglages à faire dans le Dashboard (non scriptables ici) :
--   • Authentication > Providers > Email : « Allow new users to sign up » OFF
--   • Authentication > Settings : « Leaked password protection » ON
-- =============================================================================
