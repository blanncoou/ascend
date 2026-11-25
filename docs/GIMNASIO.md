# Módulo de gimnasio guiado (v2.1)

Objetivo: que alguien que nunca entrenó pueda entrar a Gimnasio, elegir una rutina básica y empezar sin sentirse perdido, y que después, a medida que aprende, arme y modifique sus rutinas con recomendaciones explicadas. La app **no decide por el usuario**: muestra opciones, dice por qué y deja la decisión en sus manos.

Se conservó todo lo anterior: biblioteca de 168 ejercicios, recomendador con estudios, plantillas, superseries, RIR/RPE, sugerencia de progresión con consentimiento, calculadora de discos, historial y récords.

---

## 1. Funciones nuevas

| Función | Dónde | Detalle |
|---|---|---|
| **Menú de bienvenida** "¿Cómo querés empezar a entrenar?" | Gimnasio (primera vez) | Opciones A (rutina básica), B (crear mi rutina) y C (explorar ejercicios), más "Ahora no". Aparece solo si nunca se configuró **y** no hay rutinas ni entrenamientos. La elección queda guardada en `settings.gym`. Se reabre desde Gimnasio ("¿Cómo empezar?") y desde Perfil. |
| **Rutinas básicas** | `#/basic` | Pecho, Espalda, Piernas y Brazos, nivel principiante. Cada una muestra series, rango de reps, descanso, duración estimada, consejos y aviso de seguridad. "Usar esta rutina" crea una **copia editable** (con días opcionales). "Usar las 4 en la semana" no duplica las que ya tenés. |
| **Selector guiado al agregar** | Editor de rutina → "Agregar ejercicio" | 1) 10 grupos musculares con las series que ya tiene la rutina y avisos ("Falta tracción"). 2) Al elegir uno: qué ya tenés, hasta 3 **recomendados** con el motivo, y todos los ejercicios del grupo por zona, con nivel y etiquetas "En la rutina" / "Parecido". 3) Info rápida de cada ejercicio sin salir. También búsqueda por nombre. |
| **Reemplazar ejercicio** | Editor de rutina (cada ejercicio) | Alternativas ordenadas por similitud en 3 grupos (Muy similares / Similares / Otras opciones no equivalentes), cada una con explicación. Opciones: conservar series-reps-descanso (sí por defecto) y conservar el peso (no por defecto). Se aplica al guardar; **Cancelar descarta**. El historial no cambia. |
| **Cambiar por hoy** | Entrenamiento activo | Reemplaza un ejercicio solo en la sesión actual (ej. máquina ocupada), si todavía no registraste series de ese ejercicio. La rutina no cambia. |
| **Revisión de la rutina** | Editor y detalle de rutina | Señala repetidos, ejercicios casi iguales, exceso de series por grupo, grupos grandes sin compuesto, empujes sin tracciones, ejercicios por encima de tu nivel (con alternativa más simple), conflictos con tus preferencias y duración. Siempre dice **qué revisó** y qué no (técnica, recuperación, lesiones). Nunca afirma que la rutina está "equilibrada". |
| **Resumen de la semana** | Gimnasio → Rutinas | Revisa todas las rutinas juntas: tracciones, relación empuje/tracción, piernas y grupos sin trabajo directo. |
| **Ficha completa** | `#/exercise/:id` | Nivel, patrón, tipo, equipamiento, músculo principal y secundarios, mapa muscular propio, **Para qué sirve**, **Cómo hacerlo** paso a paso, **Errores frecuentes**, **Consejos**, **Para empezar** (series/reps/descanso según nivel), **Ejercicios alternativos**, "Agregar a mi rutina", "Evitar" y aviso de seguridad. |
| **Preferencias de entrenamiento** | Gimnasio, Perfil, bienvenida | Nivel, equipamiento disponible, "prefiero evitar" (6 categorías de movimiento) y ejercicios puntuales, organización por **días de la semana** o **secuencia propia** (Día 1, Día 2…). No pide información médica. |
| **Ayudas contextuales** | Botones "?" y "Aprendé lo básico" | Series, repeticiones, rango, descanso, sobrecarga progresiva, RIR, RPE, calentamiento, recuperación, compuesto/aislamiento, superserie y patrón de movimiento. Se abren en una ventana corta. |
| **Sin duplicados por error** | Selector, "Agregar a mi rutina", rutinas básicas | Si el ejercicio ya está, pide confirmación (se puede agregar igual a propósito). |

---

## 2. Rutinas básicas incorporadas

Valores orientativos y editables. Duración estimada = calentamiento 8 min + ~45 s por serie + descansos + 1 min por cambio de ejercicio.

| Rutina | Ejercicios (series × reps · descanso) | Duración |
|---|---|---|
| **Pecho · Iniciación** | Press de pecho en máquina 3 × 10–12 · 90 s · Press inclinado con mancuernas 3 × 10–12 · 90 s · Pec deck 2 × 12–15 · 60 s | ≈ 25 min |
| **Espalda · Iniciación** | Jalón al pecho 3 × 10–12 · 90 s · Remo sentado en polea 3 × 10–12 · 90 s · Remo con mancuerna 2 × 10–12 por lado · 75 s | ≈ 25 min |
| **Piernas · Iniciación** | Prensa 3 × 10–12 · 120 s · Curl femoral sentado 3 × 10–12 · 75 s · Extensión de cuádriceps 2 × 12–15 · 75 s · Gemelos en prensa 2 × 12–15 · 60 s | ≈ 30 min |
| **Brazos · Iniciación** | Curl con mancuernas 3 × 10–12 · 60 s · Curl martillo 2 × 10–12 · 60 s · Extensión de tríceps en polea 3 × 10–12 · 60 s · Extensión sobre la cabeza en polea 2 × 10–12 · 60 s | ≈ 25 min |

Criterios de selección: máquinas y poleas para aprender la trayectoria con menos exigencia técnica; un patrón distinto por ejercicio (sin variantes repetidas); 7–10 series por rutina; rangos de 10–15 repeticiones para practicar técnica con cargas moderadas. Cada rutina aclara que no es un plan universal y que la técnica, la recuperación y la adaptación individual importan.

Propuesta semanal opcional ("Usar las 4"): pecho lunes, espalda martes, piernas jueves, brazos viernes.

---

## 3. Criterios de recomendación

Todo está en `js/domain/routine-guide.js` (lógica pura, probada en `tests/rutinas.test.js`). Los datos de apoyo están en `js/data/exercise-guide.js`.

**Clasificación de cada ejercicio** (los 168):
- **Patrón de movimiento** (29 patrones: empuje horizontal, inclinado y vertical, tracción vertical y horizontal, aperturas, sentadilla/prensa, bisagra, extensión y flexión de rodilla, curl, extensión de codo, etc.).
- **Dificultad** orientativa: principiante, intermedio o avanzado (ej. dominadas, peso muerto y sentadilla frontal = avanzado; press de banca con barra y sentadilla = intermedio; máquinas y poleas = principiante).
- **Etiquetas "prefiero evitar"**: por encima de la cabeza, barra sobre la espalda o desde el piso, zancadas y flexión profunda de rodilla, colgarse, saltos/impacto, acostado en el piso.

**Al agregar ejercicios a un grupo** (`suggestFor`), suma o resta puntos según:
1. Tus preferencias y equipamiento: lo excluido no se recomienda (se lista aparte, con el motivo).
2. Lo que ya está en la rutina: no se repite; si tiene el mismo patrón **y** la misma zona que uno existente, se marca "Parecido" y baja.
3. Zonas sin cubrir del músculo (ej. pecho superior si solo tenés press plano): suben.
4. Tipo: si el grupo grande no tiene compuesto, sube un compuesto; si ya lo tiene, sube un aislamiento de la misma zona.
5. Nivel: primero ejercicios de tu nivel; uno por encima solo si faltan opciones (con aviso); los avanzados no se recomiendan a principiantes.
6. Zonas complementarias (trapecio, lumbar, pecho inferior) quedan detrás de las principales.
7. Los recomendados no repiten patrón + zona entre sí (variedad real).
8. Si el grupo ya suma muchas series en la rutina (10 para principiantes, 14 para el resto), se avisa que agregar más probablemente no aporte mucho.

**Reemplazos** (`replacementsFor`): candidatos del mismo músculo o del mismo patrón con músculos relacionados. Puntaje: mismo músculo +35, mismo patrón +35, misma zona +15, mismo tipo +5, nivel accesible +5, más difícil −8 por nivel. Etiquetas: ≥ 85 "Muy similar", ≥ 65 "Similar", el resto "Alternativa parcial (no equivalente)". La explicación se arma con lo que cambia: equipamiento (máquina = trayectoria guiada; mancuernas = cada lado por separado; polea = tensión constante; barra = más carga y más técnica…), zona, tipo y dificultad.

**Revisión de rutina** (`analyzeRoutine`): detalle en la sección 1. Los límites son referencias generales para orientar, no reglas.

**Series sugeridas al agregar**: principiante o sin objetivo definido → compuestos 3 × 10–12 con 90 s, aislamientos 2 × 12–15 con 60 s; estabilidad 3 × 30 s. Con nivel intermedio/avanzado y objetivo cargado, se usan los valores por objetivo que ya existían.

---

## 4. Seguridad

- Avisos de "orientación general, no reemplaza a un profesional" en bienvenida, rutinas básicas y fichas.
- Las preferencias "prefiero evitar" filtran recomendaciones y reemplazos, y la ficha avisa si un ejercicio las contradice. No son diagnósticos ni contraindicaciones médicas, y no se pide información de salud.
- La sugerencia de subir peso sigue siendo solo una sugerencia basada en el historial: nada cambia sin confirmación.
- No hay fotos ni animaciones de terceros: se usa un **mapa muscular propio**, aclarando que es esquemático y no muestra la ejecución. Cuando un ejercicio no tiene ficha específica, se muestra la guía general de su patrón **avisando** que es general.

---

## 5. Archivos

**Nuevos**
- `js/data/exercise-guide.js`: patrones, dificultad, etiquetas para evitar, 41 fichas específicas, guía por patrón, glosario y rutinas básicas.
- `js/domain/routine-guide.js`: análisis, recomendaciones, reemplazos, preferencias, rutinas básicas y bienvenida.
- `js/screens/gym-guide.js`: bienvenida, rutinas básicas, selector guiado, reemplazo, preferencias y ayudas.
- `tests/rutinas.test.js` (28 pruebas) y `tests/e2e/gimnasio_guia.py` (28 verificaciones).
- `docs/GIMNASIO.md` (este documento).

**Modificados**
- `js/screens/gym.js`: bienvenida, barra de herramientas, resumen semanal, "Aprendé lo básico", revisión en el editor y el detalle, reemplazar, selector guiado, ficha completa, control de duplicados, días opcionales y modo secuencia.
- `js/screens/workout.js`: "Cambiar por hoy" y "Cómo se hace".
- `js/domain/gym.js`: próximo entrenamiento en modo secuencia propia.
- `js/core/store.js`: `settings.gym` con migración segura (los datos existentes se conservan; los usuarios con rutinas no ven la bienvenida).
- `js/screens/profile.js`: accesos a preferencias de entrenamiento y al menú de inicio.
- `js/screens/home.js`: los selectores de opciones actualizan `aria-pressed`.
- `css/styles.css`, `index.html`, `sw.js` (lista de archivos y versión), `js/config/brand.js` (versión 2.1.0), `tests/e2e/responsive.py` (pantallas nuevas).

---

## 6. Pruebas realizadas

| Prueba | Resultado |
|---|---|
| `node tests/rutinas.test.js`: datos, recomendaciones, análisis, reemplazos, historial, bienvenida, migración, secuencia | 28/28 OK |
| `python3 tests/e2e/gimnasio_guia.py`: los 14 puntos pedidos (algunos con varias verificaciones) | 28/28 OK |
| Suites anteriores: lógica, reglas (21), gimnasio (14), sincronización (12), e2e_v2, e2e_gym, migración, fase 4 (15) | Todas OK |
| `tests/e2e/responsive.py`: 320 a 1440 px y horizontal, 20 pantallas (incluye las nuevas) | Sin desbordes ni errores |

Puntos pedidos y cómo se verificaron (en `gimnasio_guia.py`):
1. El menú inicial aparece solo cuando corresponde: aparece la primera vez, no vuelve tras elegir y recargar, y se puede reabrir.
2. La elección se guarda (`setupDone`, `choice` y la rutina creada con sus días).
3. Existen las 4 rutinas básicas, con series, reps, descanso, duración y consejos.
4. Clasificación: al elegir Pecho solo aparecen ejercicios de pecho; en Node, cada patrón es compatible con su grupo.
5. Se pueden agregar ejercicios desde el selector guiado.
6. Se pueden reemplazar ejercicios; Cancelar descarta; se conservan series, reps y descanso.
7. Las recomendaciones consideran la rutina existente.
8. No se duplican ejercicios por error: pide confirmación, y "Usar las 4" no duplica.
9. Las modificaciones persisten tras recargar (IndexedDB).
10. El historial anterior queda intacto al cambiar la rutina.
11. Las fichas se ven completas, y la guía general se identifica como tal.
12. Funciona en celulares de 320 y 360 px sin desbordes.
13. No hay errores de JavaScript.
14. Botones y controles funcionan: ayudas, preferencias, "Cambiar por hoy", modo secuencia y foco dentro del selector.

---

## 7. Limitaciones pendientes

- **Fichas específicas**: 41 de 168 ejercicios (los de las rutinas básicas y los más comunes) tienen paso a paso y errores propios. El resto muestra la guía general de su patrón, avisando. Ampliarlas requiere redactarlas y, idealmente, que las revise un entrenador o profesional del ejercicio.
- **Sin fotos ni animaciones**: no se encontró una fuente verificada con licencia comercial clara (ver `docs/fuentes-ejercicios.md`). Opción a futuro: ilustraciones propias o un paquete con licencia.
- **Dificultad, patrones y límites de series**: son criterios generales elegidos para orientar, no derivados de un estudio específico para cada ejercicio. Conviene que los revise un profesional.
- **Rutinas básicas por grupo muscular**: son las que se pidieron para aprender movimientos. Entrenar cada grupo una vez por semana es una opción válida para empezar, pero no la única; la app no propone otras estructuras (full body, torso/pierna) como "mejores", aunque siguen disponibles como plantillas.
- **El reemplazo durante el entrenamiento** solo funciona antes de registrar series de ese ejercicio, para no mezclar datos de dos ejercicios en el historial.
- No se probó con usuarios reales todavía: ver `docs/PLAN-DE-PRUEBAS.md` (tareas 7 y 8 cubren el gimnasio; conviene sumar "elegí una rutina básica" y "reemplazá un ejercicio").
