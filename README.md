# ASCEND · versión web 3.0

Hábitos, rutinas, planificación, bienestar y gimnasio en un solo centro de control. Oscuro con acentos rojos, mobile first, en español.

**v3.0 · Reforma integral** (ver `docs/AUDITORIA-Y-PLAN.md`, `docs/REFORMA-V3.md` y `docs/DISENO.md`). Incluye:
- Nueva identidad visual.
- Inicio rediseñado.
- Hábitos mensuales, con mínimo e ideal, en pausa y por momento del día.
- Rutinas de hábitos, 3 prioridades, modo enfoque y plan de recuperación.
- Desafío mensual, recompensas e historial de logros.
- Ánimo diario, diario privado, Insights y estadísticas por período.
- Recordatorios con pausa y silencio.

Antes, esta app ya incorporaba las 4 fases del "Prompt maestro de actualización" (datos más seguros, juego más justo, gimnasio más completo y preparación para publicar), el **módulo de gimnasio guiado para principiantes** (v2.1, `docs/GIMNASIO.md`) y el **calendario de progreso** (v2.2, `docs/CALENDARIO.md`).

> "ASCEND" es un nombre de trabajo: no se verificó su disponibilidad (ver `docs/MARCA.md`).

---

## 1. Cómo ejecutarla

**Rápido:** doble clic en `index.html`. Todo funciona salvo instalar la app y el modo sin conexión (los navegadores no permiten service workers en `file://`).

**Recomendado:**

```bash
cd ascend-web
python3 -m http.server 8000      # o:  npx serve .
```

Abrí `http://localhost:8000`, o `http://IP-DE-TU-COMPU:8000` desde el celular en la misma Wi-Fi.
Para instalarla en el celular y usarla sin conexión hace falta **https** (por ejemplo, subirla a Netlify, Vercel, GitHub Pages o Cloudflare Pages). En `localhost` funciona igual sin https.

### Después de editar archivos

```bash
python3 scripts/build-sw.py      # actualiza la lista de archivos para uso sin conexión
# y subir VERSION en sw.js para que los usuarios reciban la versión nueva
python3 scripts/build-legal.py   # si editaste docs/privacidad.md o docs/terminos.md
```

---

## 2. Migraciones de datos

| Desde | Hacia | Qué pasa |
|---|---|---|
| v1 (`localStorage`, clave `ascend:data:v1`) | v2 (IndexedDB, base `ascend`) | Automática y **una sola vez** al abrir. Antes se crea una copia "Antes de migrar a IndexedDB". La clave vieja se renombra a `ascend:data:v1:migrado-a-indexeddb` (no se borra). Si IndexedDB no existe, sigue usando `localStorage`. |
| Esquema 1 | Esquema 2 | `store.migrate()` agrega los campos nuevos con valores por defecto (`kind: 'check'` en hábitos, ajustes de discos, comodines, semanas, lápidas de borrado, etc.) y repara tipos dañados sin borrar datos. |
| Esquema 2 | Esquema 3 (v3.0) | Agrega `pauses: []` a cada hábito, colecciones vacías nuevas (rutinas de hábitos, ánimo, enfoque, recompensas, meses, recuperación) y ajustes de recordatorios (pausa, silencio). No cambia ni borra nada existente; los hábitos sin "momento del día" lo toman de su horario de recordatorio. Probado en `tests/v3.test.js`. |
| Documento dañado | Última copia válida | Si el checksum no coincide al abrir, se recupera la copia más reciente y se avisa. |

Copias locales: automática cada 7 días (al abrir la app; se guardan 4), manual desde Perfil y antes de importar o restaurar. **No reemplazan** a un respaldo fuera del dispositivo: por eso existe Exportar.

---

## 3. Qué se implementó

### Fase 1 · Datos y calidad
- IndexedDB con escrituras agrupadas, guardado al ocultar la pestaña, checksum, recuperación y modo de respaldo.
- Copias de seguridad locales y pedido de almacenamiento persistente.
- **Edición de días pasados limitada** a hoy + ayer (configurable hasta 7 días en `settings.editWindowDays`); las correcciones quedan registradas; las semanas se "cierran" y sus misiones ya no cambian.
- Rendimiento: estadísticas memorizadas por revisión de datos y caché por día.
- Accesibilidad: foco atrapado en ventanas, Escape, retorno del foco, errores en campos con `aria-invalid`, contrastes corregidos (WCAG 2.2 AA en texto y controles).

### Fase 2 · Juego
- Tutorial de 6 pasos (se abre la primera vez en la pestaña Semana; repetible desde Perfil).
- **Comodines de racha**: 1 cada 7 días de racha, máximo 2, solo para un día dentro de la ventana de edición.
- Hábitos **con cantidad** (ej. 2000 ml de a 250) y **para evitar** (días limpio, recaídas, hitos).
- XP centralizada en `js/config/xp.js` con topes diarios (ver `docs/BALANCE.md`).
- Sonidos opcionales (apagados por defecto), confeti y celebraciones respetando "Reducir animaciones".
- Estadísticas: mejor y peor día de la semana, hábitos más y menos cumplidos, tendencia de 4 semanas, ánimo con y sin entrenamiento (con aviso de que es asociación, no causa).

### Fase 3 · Gimnasio
- RIR o RPE por serie (opcional).
- Sugerencia de **doble progresión** con explicación; **solo se aplica si tocás "Aplicar"**.
- Superseries en rutinas y en el entrenamiento (A1 → B1 → descanso de ronda).
- Calculadora de discos (kg y lb, discos disponibles configurables).
- Mapa muscular propio en SVG en cada ejercicio (sin imágenes de terceros, ver `docs/fuentes-ejercicios.md`).

### v3.0 · Reforma integral (ver `docs/REFORMA-V3.md`)
- **Identidad**: paleta nueva centralizada en variables, rojo solo donde importa y contraste verificado.
- **Inicio**:
  - Resumen del día con el mismo % que el calendario, más hechos, pendientes, cantidades y XP de hoy.
  - Ánimo del día.
  - Hábitos por mañana, tarde y noche.
  - Motivación: nivel, XP que falta, racha y mensaje.
  - Desafío del mes.
  - Gimnasio: próximo y último entrenamiento.
  - Plan del día con 3 prioridades.
  - Acceso al modo enfoque.
- **Hábitos**:
  - Frecuencia mensual.
  - Mínimo e ideal.
  - Pausar y reanudar sin perder historial.
  - Momento del día.
  - Pestaña **Rutinas**: mañana, tarde, noche o personalizada, con hábitos y actividades en orden y recordatorio propio.
- **Planificación**: 3 prioridades, reordenar, pasar a mañana y traer pendientes; modo **Enfoque** con temporizador que puede sumar minutos a un hábito.
- **Recuperación**: si hubo varios días flojos, se ofrece (sin culpas) un plan corto: hábitos clave, pausar el resto, bajar mínimos y obstáculos con consejos. Al terminar, deshace exactamente lo que hizo.
- **Juego**: desafío mensual, recompensas propias, logros con fecha y página "Cómo se gana XP" generada desde la configuración.
- **Bienestar**: ánimo diario, tipos de entrada (nota, reflexión, acontecimiento importante) y diario privado que se oculta hasta tocar "Mostrar".
- **Estadísticas**:
  - Comparación con el período anterior.
  - Consistencia por hábito.
  - Promedio por día de la semana.
  - **Insights** con su base de datos y aclarando que asociación no es causa.
  - Ánimo vs. hábitos.
- **Recordatorios**: por rutina, pausa por días y horario de silencio, incluso si cruza la medianoche.

### v2.2 · Calendario de progreso (ver `docs/CALENDARIO.md`)
- Hábitos → Calendario con vistas de semana, mes, 3, 6 y 12 meses, navegación y "Ir a hoy".
- Cada día se pinta con un rojo de intensidad continua según el % real (las cantidades parciales suman su fracción); "sin hábitos programados", 0 % y días futuros se distinguen.
- Estadísticas del período (promedio, días al 100 %, parciales, sin cumplir, mejor día y racha actual), calculadas con los mismos datos que las celdas.
- Detalle del día de solo lectura: %, completados, pendientes, cantidades, XP del día, diario, entrenamientos y recaídas. "Corregir este día" solo dentro de la ventana de edición.
- Usa el cálculo diario y la caché existentes: cambiar de vista no recalcula el historial.

### v2.1 · Gimnasio guiado (ver `docs/GIMNASIO.md`)
- Menú de bienvenida "¿Cómo querés empezar a entrenar?" (rutina básica, crear la mía o explorar), solo la primera vez y reabrible.
- 4 rutinas básicas de iniciación (pecho, espalda, piernas, brazos) con series, reps, descanso, duración y consejos.
- Selector guiado al agregar ejercicios: grupo muscular → recomendados con el motivo → todos los del grupo, con info rápida.
- Reemplazar ejercicio con alternativas ordenadas por similitud y explicadas; "Cambiar por hoy" durante el entrenamiento.
- Revisión de cada rutina y resumen semanal, que dicen qué revisaron (sin declarar "equilibrada").
- Fichas completas: para qué sirve, paso a paso, errores frecuentes, series orientativas y alternativas.
- Preferencias: nivel, equipamiento, "prefiero evitar" y organización por días o en secuencia propia.
- Ayudas contextuales ("?") y "Aprendé lo básico".

### Fase 4 · Preparación para publicar
- **PWA:** manifest completo, íconos PNG (192, 512, maskable, Apple), service worker con la app en caché, modo sin conexión verificado, botón "Instalar" cuando el navegador lo ofrece e instrucciones para iPhone.
- **Recordatorios** mediante el service worker cuando está disponible.
- **Supabase preparado:** configuración vacía, módulo de cuentas y sincronización, combinación de datos con pruebas, esquema SQL con RLS (`supabase/schema.sql`).
- **Consentimiento explícito** en la bienvenida, con la fecha guardada; política de privacidad y términos visibles en la app (borradores).
- **Marca configurable** (nombre, colores aplicados al iniciar, versión, identificadores de tienda).
- Base para un plan premium futuro (`ASC.entitlements`): hoy **no bloquea nada** y no hay pagos.
- Plan de pruebas con usuarios.

---

## 4. Configuración externa pendiente

| Qué | Para qué | Dónde | Estado |
|---|---|---|---|
| Proyecto Supabase (URL + clave publishable) | Cuentas y sincronización | `js/config/app-config.js`, `docs/SUPABASE.md` | **Configurado** (proyecto ASCEND, São Paulo) |
| Edge Function de eliminación de cuenta | Exigido por las tiendas si hay cuentas | `docs/SUPABASE.md` | No hecho |
| Claves VAPID + servidor de envío | Recordatorios con la app cerrada | `docs/NOTIFICACIONES.md` | **No configurado** |
| Hosting con https | Instalar la app y modo sin conexión en el celular | — | Pendiente |
| Revisión legal | Política de privacidad y términos | `docs/privacidad.md`, `docs/terminos.md` | Borradores |
| Búsqueda de marca (INPI, tiendas, dominio) | Poder usar el nombre | `docs/MARCA.md` | No hecha |

Nada de esto se inventó ni se simuló: mientras falte, la app lo indica y sigue funcionando en modo local.

---

## 5. Qué quedó pendiente y por qué

| Función | Por qué no está |
|---|---|
| Correos de cuenta para otras personas | El servidor de correo gratuito de Supabase solo envía a los miembros del equipo (2 por hora). Para sumar usuarios hace falta SMTP propio. |
| Notificaciones con la app cerrada | Requiere servidor de Web Push. En iPhone, además, solo con la app instalada (iOS 16.4+). |
| Mensajes motivacionales | Activos con la app abierta o en segundo plano reciente. Con la app cerrada: app nativa (adaptador Capacitor preparado) o servidor de Web Push. Ver docs/NOTIFICACIONES.md |
| Copia semanal **fuera** del dispositivo | Sin servidor no se puede hacer automática; se ofrece Exportar a archivo. |
| Eliminación de cuenta en servidor | Depende de Supabase (Edge Function con `service_role`). |
| Fichas específicas para los 168 ejercicios | Hay 41 con paso a paso propio; el resto muestra la guía general de su patrón, avisando. Conviene redactarlas con un profesional. |
| Imágenes/animaciones de ejercicios | Las bases abiertas (wger) tienen licencias por imagen que no garantizan uso comercial. Se usa un mapa muscular propio. |
| Huella / Face ID, fotos de progreso | Son de la app nativa (Expo): en la web no hay forma segura equivalente. |
| Fotos de progreso cifradas | Requieren la app nativa o el almacenamiento privado de Supabase; en la web no se guardan fotos. |
| Protección del diario con contraseña o biometría | La web solo puede ocultar el contenido. Un bloqueo real necesita la app nativa (Face ID / huella). |
| Recordatorios de rutinas con la app cerrada | Igual que el resto: con la app abierta o en segundo plano reciente. Con la app cerrada hace falta Web Push. |
| Tipografías locales | La web carga Inter y Barlow Condensed de Google Fonts (se guardan en caché tras la primera visita). Alojarlas localmente evita esa conexión; conviene hacerlo antes de publicar. |
| Usuarios de la v1 sin consentimiento registrado | Siguen usando la app; el consentimiento se pide en la bienvenida a usuarios nuevos. Conviene agregar un aviso único al publicar la versión con textos definitivos. |

---

## 6. Pruebas realizadas y resultados

| Prueba | Resultado |
|---|---|
| `node tests/logica.test.js` (rachas, récords, niveles) | OK |
| `node tests/reglas.test.js` (ventana de edición, comodines, cantidades, negativos, XP, semanas cerradas) | 21/21 OK |
| `node tests/gimnasio.test.js` (progresión, discos, superseries, rangos de reps) | 14/14 OK |
| `node tests/sync-cliente.test.js` (cliente de sincronización con servidor simulado: dos dispositivos, cuentas, conflictos) | 15/15 OK |
| `node tests/motivacion.test.js` (mensajes motivacionales: horarios, tope, silencio, repeticiones, privacidad) | 22/22 OK |
| `python3 tests/e2e/motivacion.py` (pantalla tras el registro, permiso, configuración, envío, permiso revocado) | 30/30 OK |
| `node tests/sync.test.js` (combinación entre dispositivos, config sin credenciales) | 13/13 OK |
| `node tests/v3.test.js` (mensual, mínimo/ideal, pausas, migración, prioridades, rutinas, enfoque, recuperación, desafío mensual, recompensas, ánimo, insights) | 23/23 OK |
| `tests/e2e/v3.py` (recorrido completo de la reforma, persistencia, responsive y errores) | 24/24 OK |
| `node tests/rutinas.test.js` (gimnasio guiado: datos, recomendaciones, reemplazos, historial) | 28/28 OK |
| `tests/e2e/gimnasio_guia.py` (los 14 puntos del módulo de gimnasio) | 28/28 OK |
| `node tests/calendario.test.js` (cálculo diario, períodos, estadísticas, XP del día) | 24/24 OK |
| `tests/e2e/calendario.py` (los 10 escenarios del calendario + integración) | 20/20 OK |
| `tests/e2e/e2e_v2.py` | OK, sin errores de JavaScript |
| `tests/e2e/e2e_gym.py` (A1→B1→ronda, RIR, 60→62,5 kg con consentimiento, 102,5 kg = 20+20+1,25 por lado) | OK |
| `tests/e2e/migracion.py` (v1 → IndexedDB una vez, sin duplicar, recuperación de documento dañado) | OK |
| `tests/e2e/responsive.py` (320, 390, 768, 1024, 1440 px y horizontal, 26 pantallas) | Sin desbordes ni errores |
| `tests/e2e/fase4.py` (consentimiento, legal, perfil, service worker, sin conexión, marca) | 15/15 OK |

No probado (requiere dispositivos o servicios reales): instalación en Android/iPhone, lectores de pantalla, Supabase y Web Push. Ver la lista manual en `docs/PLAN-DE-PRUEBAS.md`.

---

## 7. Estructura

```text
ascend-web/
├─ index.html · manifest.webmanifest · sw.js
├─ assets/            Íconos (SVG, PNG 192/512, maskable, Apple)
├─ css/styles.css     Sistema visual (variables en :root; colores de marca desde brand.js)
├─ js/
│  ├─ config/         brand.js (marca) · xp.js (balance) · app-config.js (servicios externos, vacío)
│  ├─ core/           dates · db (IndexedDB) · store (datos, migraciones, copias) · perf
│  ├─ data/           exercises.js (168 ejercicios) · exercise-guide.js (patrones, fichas, rutinas básicas) · legal.js (generado)
│  ├─ domain/         LÓGICA PURA: rules, habits, gym, progress, coach, routine-guide, game, rewards, insights, calendar, planner, recovery, wellbeing
│  ├─ sync/           merge (probado) · sync (Supabase, activo) · push (inactivo)
│  ├─ ui/             ui.js (componentes accesibles) · sound.js
│  ├─ screens/        una pantalla por archivo (+ tutorial y legal)
│  └─ app.js          router, eventos, logros, recordatorios, PWA
├─ supabase/schema.sql
├─ scripts/           build-sw.py · build-legal.py
├─ docs/              AUDITORIA-Y-PLAN · REFORMA-V3 · DISENO · CALENDARIO · GIMNASIO · BALANCE · SUPABASE · NOTIFICACIONES · MARCA · PLAN-DE-PRUEBAS · fuentes-ejercicios · privacidad · terminos
└─ tests/             pruebas de lógica (Node) y e2e/ (Playwright)
```

## 8. Paso a la app (React Native + Expo)

1. `js/domain/`, `js/core/dates.js`, `js/config/` y `js/sync/merge.js` pasan a TypeScript casi sin cambios: no tocan el DOM.
2. IndexedDB se reemplaza por SQLite; el esquema de Supabase ya está preparado.
3. Notificaciones locales del sistema (funcionan con la app cerrada), Face ID/huella y fotos privadas.
4. Las pantallas se reescriben como componentes nativos usando estas como referencia.
