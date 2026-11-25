# Cuentas y sincronización con Supabase

**Estado: conectado a un proyecto real.** La app sigue funcionando completa sin cuenta y sin conexión.

## Proyecto

| Dato | Valor |
|---|---|
| Proyecto | ASCEND (`vqugkhklctxgmcosopod`), organización de la cuenta de GitHub `blanncoou`, plan Free |
| Región | South America (São Paulo) · `sa-east-1` |
| URL | `https://vqugkhklctxgmcosopod.supabase.co` |
| Clave en el front | **publishable** (`sb_publishable_…`), en `js/config/app-config.js`. Es pública por diseño. |
| Site URL | `https://blanncoou.github.io/ascend/` |
| Redirect URLs | `https://blanncoou.github.io/ascend/**` |
| Auth | Email + contraseña · confirmación por correo **activada** · contraseña mínima 8 · registro anónimo desactivado |

**Nunca** poner en el repositorio la clave secreta (`sb_secret_…`) ni la `service_role`, ni la contraseña de la base de datos. El repositorio es público.

## Qué se sincroniza

Todo el estado de ASCEND del dispositivo: hábitos y sus registros diarios y cantidades, recaídas, objetivos, tareas, diario, rutinas de hábitos, ejercicios, rutinas y entrenamientos, medidas corporales, ánimo, sesiones de enfoque, semanas, meses, recompensas, logros vistos, planes de recuperación, ajustes y perfil. XP, niveles, rachas y estadísticas no se guardan: se **calculan** a partir de esos datos, así que quedan iguales en todos los dispositivos.

Se guarda como **un documento JSON por usuario** en `public.user_state` (`data`), con número de revisión `rev`.

## Cómo resuelve conflictos (js/sync/merge.js + js/sync/sync.js)

- Al sincronizar: si la revisión remota cambió desde la última vez (u otro dispositivo es nuevo), se descarga y se **combina** con lo local antes de subir. Nunca se reemplazan los datos locales por los remotos. Antes de combinar se crea una copia de seguridad local.
- La subida solo se acepta si `rev` no cambió en el medio (concurrencia optimista); si cambió, reintenta hasta 3 veces.
- Reglas: unión por id; si un mismo elemento se editó en los dos, gana la edición más reciente (`updatedAt`); lo borrado no revive (lápidas en `state.deleted`); días marcados se suman; cantidades: el mayor valor; ajustes y perfil: los del dispositivo actual.
- **Cuentas distintas en un mismo dispositivo:** el dispositivo recuerda con qué cuenta sincronizó. Si se ingresa con otra, no se mezcla nada hasta que el usuario elija «Sumar a esta cuenta» (o cierre sesión).
- **Limitación conocida:** desmarcar un día en un dispositivo mientras el otro lo tenía marcado deja el día marcado (se prioriza no perder registros).

## Cuándo sincroniza

- Al tocar **Sincronizar ahora** (Perfil → Cuenta y sincronización).
- Al iniciar sesión (o al abrir el enlace de confirmación).
- Al abrir la app con la sesión guardada, **si hay cambios pendientes**.

Estados visibles: sincronizando · sincronizado (con hora) · cambios sin sincronizar · sin conexión · error · sin sesión · datos de otra cuenta.

## Correos (confirmación y recuperación)

- Los enlaces vuelven a `https://blanncoou.github.io/ascend/#access_token=…` (flujo implícito). La app los procesa antes de mostrar la pantalla, limpia la dirección y:
  - confirmación → sesión iniciada y sincronización;
  - recuperación → ventana «Nueva contraseña»;
  - enlace vencido o usado → aviso para pedir otro.
- Se usa el flujo implícito y no PKCE porque en iPhone el correo abre Safari, que no comparte almacenamiento con la app instalada en la pantalla de inicio: con PKCE el enlace fallaría.
- **Servidor de correo:** sin SMTP propio, Supabase **solo envía a los miembros del equipo de la organización** (el correo de la cuenta de GitHub del dueño) y como máximo **2 correos por hora**. Alcanza para uso personal. Para sumar usuarios: configurar SMTP propio (por ejemplo Brevo o Resend) en *Authentication → Emails → SMTP Settings* y subir el límite en *Rate Limits*.

## Seguridad verificada en el proyecto

- `public.user_state` y `public.push_subscriptions`: **RLS activado**.
- Políticas solo para el rol `authenticated`, todas con `auth.uid() = user_id` (leer, crear, actualizar, borrar).
- El rol `anon` no tiene ningún permiso sobre las tablas; `authenticated` solo SELECT/INSERT/UPDATE/DELETE (se quitaron TRUNCATE, TRIGGER y REFERENCES, que venían por defecto: TRUNCATE ignora RLS).
- Bucket `progress-photos` privado, una carpeta por usuario.
- Comprobado desde `blanncoou.github.io` sin sesión: leer y escribir `user_state` devuelve *permission denied*.

## Mantenimiento

- **Pausa por inactividad (plan Free):** si el proyecto no tiene actividad en una semana, Supabase lo pausa y avisa por correo antes. Se reactiva desde el panel (se puede restaurar hasta 90 días después). Mientras está pausado, ASCEND funciona igual con los datos locales; al reactivarlo, se vuelve a sincronizar.
- **Clave publishable:** si alguna vez se rota, actualizar `js/config/app-config.js` y publicar.
- **Esquema:** `supabase/schema.sql` es idempotente (se puede volver a ejecutar sin borrar datos; Supabase lo marca como «destructivo» porque reemplaza políticas).
- **Eliminación de cuenta** (obligatoria en App Store/Google Play si hay cuentas): falta una Edge Function con la clave secreta que borre los archivos del bucket y el usuario de `auth.users` (lo demás se borra en cascada), y el botón en el perfil.

## Pruebas

- `node tests/sync-cliente.test.js`: cliente con un servidor simulado (dos dispositivos, borrados, ediciones, cambios simultáneos, cambio de cuenta, errores).
- `node tests/sync.test.js`: reglas de combinación y que la configuración solo tenga valores públicos.
- Pruebas reales contra el proyecto: ver el informe de la conexión (registro, ingreso, recuperación, RLS con dos sesiones).
