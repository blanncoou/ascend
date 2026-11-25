# Notificaciones

## Lo que funciona hoy (sin servidor)

- Recordatorios de hábitos, entrenamiento y resumen diario, con horario por hábito y por día de la semana.
- Se muestran con el **service worker** (`registration.showNotification`) si la app se abrió desde http(s); si no, con la API de Notificaciones; si no hay permiso, como aviso dentro de la app.
- **Requisito:** ASCEND tiene que estar **abierta o en segundo plano reciente**. Con la app cerrada **no llegan**: un temporizador del navegador no puede despertar una página cerrada.

## Para que lleguen con la app cerrada (no implementado del lado del servidor)

Hace falta **Web Push**:

1. Generar un par de claves **VAPID** (por ejemplo con `npx web-push generate-vapid-keys`). La **pública** va en `js/config/app-config.js` (`push.vapidPublicKey`); la **privada** solo en el servidor.
2. Un endpoint (`push.subscribeEndpoint`) que guarde la suscripción del dispositivo (tabla `push_subscriptions` en `supabase/schema.sql`).
3. Un proceso programado (cron / Edge Function) que, a la hora de cada recordatorio y en la zona horaria del usuario, envíe el mensaje con la librería `web-push`.
4. El cliente ya está listo: `js/sync/push.js` suscribe el dispositivo y `sw.js` muestra el mensaje y abre la app al tocarlo.

Problema de diseño a resolver: el servidor necesita saber qué hábitos están pendientes, así que requiere la sincronización activa (o mandar un aviso genérico "¿Ya revisaste tus hábitos?").

## Límites por plataforma

- **Android (Chrome/Edge/Firefox):** funciona en el navegador y como app instalada.
- **iPhone/iPad:** solo desde **iOS/iPadOS 16.4**, y **solo si la app se agregó a la pantalla de inicio**. En una pestaña de Safari no hay notificaciones web. El permiso se tiene que pedir tras un toque del usuario.
- **Escritorio:** funciona en Chrome, Edge, Firefox y Safari (macOS 13+).
- En la app nativa (Expo) se usarán notificaciones locales programadas del sistema, que sí funcionan con la app cerrada y sin servidor.

---

## Mensajes motivacionales (v3.1)

### Qué hace
- Al terminar el registro aparece una sola vez la pantalla «Un mensaje puede cambiar tu día». El permiso del sistema **solo** se pide si el usuario toca «Activar» y después «Continuar» (antes se le explica que el sistema va a preguntar). «Ahora no» sigue al inicio sin bloquear nada y no se vuelve a preguntar.
- Configuración en **Perfil → Notificaciones motivacionales**: interruptor, franja (09:00–21:00 por defecto), mensajes por día (1–5, 2 por defecto), días, tipos (Motivación general, Disciplina y hábitos, Entrenamiento, Productividad y enfoque, Reflexiones personales), «Adaptar a mi día» y «Probar un mensaje».
- Reglas (`js/domain/motivation.js`, probadas en `tests/motivacion.test.js`):
  - horarios repartidos dentro de la franja, al menos 60 min entre mensajes y tope diario estricto;
  - respeta días elegidos, horario de silencio y pausa de recordatorios; hora local del dispositivo;
  - no llega durante un entrenamiento o una sesión de enfoque (espera y sale después);
  - no repite mensajes de los últimos 3 días; un horario que pasó hace más de 2 h (app cerrada) se descarta, no se envía tarde;
  - personalización solo con datos confirmados en ese momento (hábitos pendientes después de las 12, toca entrenar y no entrenó, constancia de 7/14/21… días, objetivo con ≥ 80 % de pasos, plan de recuperación). Cada contexto se usa una vez por día.
- Privacidad: los textos nunca incluyen nombres de hábitos, objetivos ni datos personales; todo se calcula en el dispositivo; nada se comparte con terceros.
- Biblioteca en `js/data/motivation.js` (ids estables: agregar al final, no reordenar).

### Estados
| Situación | Comportamiento |
|---|---|
| Acepta y concede permiso | Activas |
| Acepta y el sistema deniega | Quedan desactivadas (`os-denied`); se explica cómo habilitarlo en el sistema |
| «Ahora no» | Desactivadas; activables desde Perfil |
| Permiso quitado después en el sistema | Al abrir/volver a la app se detecta, se desactivan y se avisa. No se vuelve a pedir |
| Navegador sin soporte / iPhone sin instalar | Se guarda la elección; se explica el requisito; no se simula el envío |
| Otro dispositivo | La configuración y el registro de envíos son **por dispositivo** (el permiso también lo es); la sincronización no los mezcla |

### Capacidad real según plataforma
| Plataforma | ¿Llegan con ASCEND cerrada? |
|---|---|
| Web / PWA (hoy, GitHub Pages) | **No.** Se envían mientras la app está abierta o en segundo plano reciente (revisión cada 30 s y al volver a la app). |
| iPhone, PWA instalada (iOS 16.4+) | Igual que arriba mientras no exista un servidor de Web Push. |
| App nativa con Capacitor | **Sí**, con `@capacitor/local-notifications`: `js/sync/native-notify.js` programa los próximos 14 días en el sistema (solo mensajes generales, porque a futuro no se pueden confirmar datos) y reprograma al cambiar preferencias o abrir la app. **Preparado, no probado en un dispositivo.** |
| Web Push | Requiere un servidor (claves VAPID, guardar suscripciones, tarea programada que envíe según la configuración de cada usuario, p. ej. Supabase Edge Function + cron). No está implementado. |
