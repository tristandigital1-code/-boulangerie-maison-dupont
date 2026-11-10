-- Soldetoi : schéma Supabase. À exécuter une fois dans l'éditeur SQL du projet.

-- 1. Profil : réponses de l'onboarding, objectif, résultat de l'analyse.
create table if not exists public.profils (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  reponses jsonb,
  objectif jsonb,
  analyse jsonb,
  releve_chemin text,
  offre_choisie text,
  -- Accès payant : jamais modifiable par l'utilisateur, seulement par le
  -- serveur de paiement (clé de service) quand il sera connecté.
  acces boolean not null default false,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now()
);

alter table public.profils enable row level security;

create policy "profil : lecture par son propriétaire" on public.profils
  for select using (auth.uid() = id);
create policy "profil : création par son propriétaire" on public.profils
  for insert with check (auth.uid() = id);
create policy "profil : modification par son propriétaire" on public.profils
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- L'utilisateur ne peut écrire que ses propres colonnes, jamais « acces ».
revoke insert, update on public.profils from anon, authenticated;
grant select on public.profils to authenticated;
grant insert (id, email, reponses, objectif, analyse, releve_chemin, offre_choisie, maj_le)
  on public.profils to authenticated;
grant update (email, reponses, objectif, analyse, releve_chemin, offre_choisie, maj_le)
  on public.profils to authenticated;

-- 2. Relevés : compartiment privé. Les fichiers y arrivent déjà chiffrés par
-- l'appareil de l'utilisateur (AES-256-GCM) : le serveur ne stocke que du
-- contenu illisible, et chaque utilisateur n'accède qu'à son propre dossier.
insert into storage.buckets (id, name, public)
  values ('releves', 'releves', false)
  on conflict (id) do nothing;

create policy "relevé : lecture par son propriétaire" on storage.objects
  for select to authenticated
  using (bucket_id = 'releves' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "relevé : envoi par son propriétaire" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'releves' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "relevé : remplacement par son propriétaire" on storage.objects
  for update to authenticated
  using (bucket_id = 'releves' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "relevé : suppression par son propriétaire" on storage.objects
  for delete to authenticated
  using (bucket_id = 'releves' and (storage.foldername(name))[1] = auth.uid()::text);
