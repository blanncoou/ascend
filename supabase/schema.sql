-- ASCEND · Esquema de Supabase para cuentas y sincronización
-- Ejecutar completo en el editor SQL del proyecto. Es idempotente: se puede volver a ejecutar
-- sin borrar datos (solo crea lo que falta y reemplaza las políticas por las mismas).

-- 1) Documento de datos por usuario (sincronización de la versión web)
create table if not exists public.user_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb       not null,
  rev        bigint      not null default 1 check (rev >= 1),
  device     text        check (char_length(device) <= 200),
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

-- Solo usuarios con sesión iniciada; nunca el rol anónimo
revoke all on public.user_state from anon;
grant select, insert, update, delete on public.user_state to authenticated;
revoke truncate, references, trigger on public.user_state from authenticated; -- TRUNCATE ignora RLS

-- Cada usuario solo puede ver y modificar su propia fila
drop policy if exists "user_state: leer la propia"       on public.user_state;
drop policy if exists "user_state: crear la propia"      on public.user_state;
drop policy if exists "user_state: actualizar la propia" on public.user_state;
drop policy if exists "user_state: borrar la propia"     on public.user_state;
create policy "user_state: leer la propia"       on public.user_state for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_state: crear la propia"      on public.user_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_state: actualizar la propia" on public.user_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_state: borrar la propia"     on public.user_state for delete to authenticated using ((select auth.uid()) = user_id);

-- 2) Fotos de progreso (para la app): bucket privado, una carpeta por usuario
insert into storage.buckets (id, name, public) values ('progress-photos', 'progress-photos', false)
  on conflict (id) do nothing;

drop policy if exists "fotos: leer las propias"          on storage.objects;
drop policy if exists "fotos: subir a la carpeta propia" on storage.objects;
drop policy if exists "fotos: borrar las propias"        on storage.objects;
create policy "fotos: leer las propias" on storage.objects for select to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "fotos: subir a la carpeta propia" on storage.objects for insert to authenticated
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "fotos: borrar las propias" on storage.objects for delete to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- 3) Suscripciones push (si se implementa el servidor de notificaciones)
create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  subscription jsonb not null,
  schedule     jsonb not null default '[]',
  tz           text,
  created_at   timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
revoke truncate, references, trigger on public.push_subscriptions from authenticated;
drop policy if exists "push: propias" on public.push_subscriptions;
create policy "push: propias" on public.push_subscriptions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Eliminación de cuenta: borrar el usuario en auth.users elimina en cascada user_state y push_subscriptions.
-- Las fotos de Storage deben borrarse desde una Edge Function con la clave secreta (ver docs/SUPABASE.md).
