-- ASCEND · Esquema de Supabase para cuentas y sincronización
-- Ejecutar en el editor SQL del proyecto (o con la CLI: supabase db push).
-- NO probado contra un proyecto real todavía: revisar antes de usar en producción.

-- 1) Documento de datos por usuario (sincronización de la versión web)
create table if not exists public.user_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb       not null,
  rev        bigint      not null default 1,
  device     text,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

-- Cada usuario solo puede ver y modificar su propia fila
create policy "user_state: leer la propia"      on public.user_state for select using (auth.uid() = user_id);
create policy "user_state: crear la propia"     on public.user_state for insert with check (auth.uid() = user_id);
create policy "user_state: actualizar la propia" on public.user_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_state: borrar la propia"    on public.user_state for delete using (auth.uid() = user_id);

-- 2) Fotos de progreso (para la app): bucket privado, una carpeta por usuario
insert into storage.buckets (id, name, public) values ('progress-photos', 'progress-photos', false)
  on conflict (id) do nothing;

create policy "fotos: leer las propias" on storage.objects for select
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "fotos: subir a la carpeta propia" on storage.objects for insert
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "fotos: borrar las propias" on storage.objects for delete
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- 3) Suscripciones push (si se implementa el servidor de notificaciones)
create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  subscription jsonb not null,
  schedule     jsonb not null default '[]',
  tz           text,
  created_at   timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy "push: propias" on public.push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Eliminación de cuenta: borrar el usuario en auth.users elimina en cascada user_state y push_subscriptions.
-- Las fotos de Storage deben borrarse desde una Edge Function con service_role (ver docs/SUPABASE.md).
