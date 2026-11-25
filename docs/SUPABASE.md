# Cuentas y sincronización con Supabase

**Estado: preparado, NO activo y NO probado contra un proyecto real.** La app funciona completa sin esto.

## Qué está hecho

- `js/config/app-config.js`: lugar para la URL y la clave pública (vacías).
- `js/sync/sync.js`: registro, inicio de sesión, recuperación de contraseña, cierre de sesión y "Sincronizar ahora". El SDK de Supabase se descarga solo si hay configuración.
- `js/sync/merge.js`: combinación de datos entre dispositivos (probado en `tests/sync.test.js`, 12 pruebas).
- `supabase/schema.sql`: tablas `user_state` y `push_subscriptions`, bucket privado `progress-photos` y reglas **RLS** para que cada usuario vea solo lo suyo.
- Perfil → "Cuenta y sincronización": sin configuración muestra "No disponible todavía" y **no** muestra botones que no funcionen.

## Qué falta para activarlo

1. Crear un proyecto en supabase.com (elegir región; anotarla para la política de privacidad).
2. Ejecutar `supabase/schema.sql` en el editor SQL.
3. En *Authentication → Providers* dejar habilitado Email; configurar la URL del sitio y las de redirección.
4. Copiar *Project URL* y la clave **anon** (pública) en `js/config/app-config.js`. **Nunca** poner la clave `service_role` en el front.
5. Probar con dos navegadores: crear datos en ambos, sincronizar y verificar la combinación.
6. **Eliminación de cuenta** (obligatoria en App Store y Google Play si hay cuentas): crear una Edge Function con `service_role` que borre los archivos del bucket y el usuario de `auth.users` (lo demás se borra en cascada) y agregar el botón en el perfil.
7. Actualizar la política de privacidad (proveedor, región, transferencia internacional).

## Cómo resuelve conflictos

- Cada usuario tiene **un documento** (`data`) con número de revisión (`rev`).
- Al sincronizar: si la revisión remota cambió desde la última vez, se descarga y se combina con lo local antes de subir. La subida solo se acepta si `rev` no cambió en el medio (concurrencia optimista); si cambió, reintenta hasta 3 veces.
- Reglas de combinación: unión por id; gana la edición más reciente (`updatedAt`); lo borrado no revive (lápidas en `state.deleted`); días marcados se suman; cantidades: el mayor valor; ajustes y perfil: los del dispositivo actual. Antes de reemplazar los datos locales se crea una copia de seguridad.
- **Limitación conocida:** desmarcar un día en un dispositivo mientras el otro lo tenía marcado deja el día marcado (se prioriza no perder registros).

## Para la app (React Native)

El mismo esquema sirve, pero conviene pasar a tablas normalizadas (hábitos, registros, sesiones) cuando haya muchos datos. Ver el documento de arquitectura de la Etapa 1.
