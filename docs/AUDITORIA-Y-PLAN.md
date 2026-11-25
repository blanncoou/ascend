# ASCEND · Auditoría, inventario y plan de la reforma integral (v3.0)

Auditoría hecha sobre la versión 2.2, antes de modificar nada.

## 1. Arquitectura actual

| Aspecto | Estado |
|---|---|
| Tecnología | HTML + CSS + JavaScript sin dependencias ni compilación. Funciona abriendo `index.html` o servido por http(s) como PWA. |
| Estructura | `js/config` (marca, XP, servicios) · `js/core` (fechas, IndexedDB, store, caché) · `js/data` (ejercicios, guía, legales) · `js/domain` (lógica pura, probada en Node) · `js/sync` (preparado, inactivo) · `js/ui` · `js/screens` · `app.js` |
| Navegación | Router por hash (`#/pantalla/param?query`); barra inferior en celular y lateral en ≥ 1024 px |
| Persistencia | IndexedDB con checksum, migraciones por esquema, copias locales automáticas, exportar/importar JSON, recuperación ante documento dañado; respaldo en localStorage |
| Hábitos | Tipos sí/no, con cantidad y para evitar · diario, días fijos, X por semana · archivado · ventana de edición retroactiva · comodines de racha |
| Juego | XP derivada (no guardada) con config central `ASC.XP` y topes · 51 niveles, 10 rangos · 14 logros · desafío y misiones semanales · maestría por hábito |
| Calendario | 5 vistas con intensidad continua, detalle diario de solo lectura y estadísticas del período |
| Gimnasio | 168 ejercicios, rutinas básicas, selector guiado, reemplazos explicados, RIR/RPE, doble progresión con consentimiento, superseries, discos, récords, físico |
| Notificaciones | Avisos locales con la app abierta o en segundo plano reciente (service worker). Push con la app cerrada: preparado, sin servidor |
| Pruebas | 6 suites en Node (123 pruebas) y 7 recorridos en navegador |

## 2. Inventario de funcionalidades (se conservan todas)

**Inicio**: progreso del día, hábitos de hoy, hábitos para evitar, próximo entrenamiento, plan del día (tareas), semana, accesos rápidos.

**Hábitos**:
- Semana (juego, misiones, desafío).
- Hoy (activos y archivados).
- Calendario.
- Objetivos con pasos.
- Diario con ánimo.
- Detalle de hábito con estadísticas y calendario propio.
- Formulario completo (tipo, frecuencia, recordatorio por días, categoría, color, objetivo, gimnasio).

**Gimnasio**: rutinas, ejercicios, historial, físico, entrenamiento en vivo, bienvenida, rutinas básicas, preferencias.

**Progreso**: General (rango, camino, rachas, 14 días, logros, XP), Personal, Gimnasio.

**Perfil**:
- Datos y copias.
- Instalación (PWA).
- Cuenta (preparada).
- Legal.
- Recordatorios.
- Preferencias.
- Tutorial.

## 3. Problemas encontrados

| # | Problema | Impacto | Se corrige en |
|---|---|---|---|
| 1 | El % de Inicio (hechos / visibles, incluye semanales pendientes) no coincide con el % del calendario (avance real ponderado) | Dos números distintos para "hoy" | Fase B |
| 2 | Inicio sobrecargado: hábitos, semana, accesos rápidos y tareas compiten; la semana duplica al calendario | Prioridades poco claras | Fase B |
| 3 | 75 colores rojos escritos a mano en CSS y varios en JS: la marca no se puede cambiar desde un solo lugar | Identidad inconsistente | Fase A |
| 4 | Rojo usado como fondo de muchas tarjetas | La interfaz "se llena de rojo" | Fase A |
| 5 | La barra de secciones de Hábitos se corta a 390 px ("Diario") | Navegación incómoda | Fase A |
| 6 | No hay pausa de hábitos (solo archivar) ni frecuencia mensual ni mínimo/ideal | Faltan casos reales | Fase C |
| 7 | Las tareas no se pueden reordenar ni reprogramar en bloque; no hay "3 prioridades" | Planificación limitada | Fase E |
| 8 | Logros sin fecha de desbloqueo | No hay historial | Fase G |
| 9 | El diario se ve a simple vista en un dispositivo compartido | Privacidad | Fase H |
| 10 | Recordatorios sin pausa global ni horario de silencio | Notificaciones molestas | Fase I |
| 11 | Estadísticas por hábito y tendencias dispersas, sin comparación entre períodos | Difícil entender la evolución | Fase D |

## 4. Plan de implementación (en orden)

- **A. Identidad visual**: tokens nuevos (#101114, #1B1D22, #24262C, #F5F5F5, #9A9DA5, #D52B42, #F04459, #303239), rojos centralizados, menos rojo de fondo, contraste verificado.
- **B. Inicio**: resumen del día (mismo % que el calendario), hábitos por mañana/tarde/noche con acciones rápidas, gimnasio, motivación, ánimo del día, prioridades y aviso de recuperación cuando corresponda.
- **C. Hábitos**:
  - Frecuencia mensual.
  - Mínimo e ideal en hábitos con cantidad.
  - Pausar y reanudar, conservando el historial.
  - Momento del día.
  - Migración segura de los datos.
- **D. Estadísticas**: pestaña renombrada; evolución mensual, comparación con el período anterior, consistencia por hábito, tendencias por día de la semana, sección INSIGHTS con datos reales y ánimo vs. hábitos (asociación, no causa).
- **E. Planificación**:
  - Rutinas de hábitos y actividades (mañana, tarde, noche, personalizadas).
  - 3 prioridades.
  - Reordenar y reprogramar tareas.
  - Objetivos semanales.
  - Modo enfoque con temporizador.
- **F. Recuperación**: detección amable de días flojos y plan opcional (hábitos clave, objetivos reducidos temporalmente, horarios, obstáculos), sin culpas.
- **G. Juego**:
  - Desafío mensual.
  - Recompensas propias.
  - Historial de logros con fecha.
  - Página "Cómo se gana XP" generada desde la configuración.
  - Sin duplicar XP: sigue siendo derivada.
- **H. Bienestar**: ánimo diario rápido, tipos de entrada (reflexión, nota, acontecimiento importante), diario privado (oculto hasta tocar).
- **I. Recordatorios**: por rutina, pausa de recordatorios y horario de silencio.
- **J. Pruebas, documentación y entrega.**

Gimnasio, calendario, persistencia, copias, PWA y Supabase ya fueron auditados y reforzados en las versiones 2.0 a 2.2; acá se conservan y se verifican de nuevo.

## 5. Estrategia de pruebas

- **Lógica pura (Node)**:
  - Frecuencia mensual.
  - Mínimo/ideal.
  - Pausas.
  - Cálculo diario.
  - Rutinas.
  - Prioridades.
  - Recuperación.
  - Desafío mensual.
  - Ánimo vs. hábitos.
  - Insights.
  - Migración.
- **Navegador (Playwright)**:
  - Recorrido completo: crear, editar, pausar y eliminar hábitos.
  - Inicio.
  - Rutina de hábitos.
  - Prioridades.
  - Enfoque.
  - Recuperación.
  - Estadísticas.
  - Recompensas.
  - Diario privado.
  - Recordatorios.
  - Persistencia tras recargar.
  - Errores de JavaScript.
- **Regresión**: todas las suites anteriores (gimnasio, calendario, migración, fase 4, responsive).
- **Accesibilidad**:
  - Contraste calculado de los tokens.
  - Foco en ventanas.
  - Etiquetas.
  - Navegación con teclado en los flujos nuevos.
  - Tamaños táctiles.
