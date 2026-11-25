# Plan de pruebas con usuarios

## Objetivo

Saber si una persona que nunca vio ASCEND entiende el juego de hábitos, completa las tareas clave sin ayuda y quiere volver al día siguiente.

## Participantes

- **5 a 8 personas** (con 5 aparecen la mayoría de los problemas de uso).
- Mezcla: 2–3 que van al gimnasio, 2–3 que quieren armar hábitos sin gimnasio, 1–2 que ya usaron apps de hábitos.
- Al menos 1 con teléfono chico o Android de gama baja y 1 con iPhone.
- Consentimiento: explicar qué se observa, que se puede abandonar en cualquier momento y que no se graba la pantalla sin permiso.

## Preparación

- Servir la app por https (o en la red local) y abrirla en el teléfono de cada participante.
- Datos limpios: cada persona hace la bienvenida desde cero.
- Moderador: lee las tareas, no ayuda, pide que piense en voz alta. Observador: anota tiempos y trabas.

## Tareas (sesión de 30–40 min)

| # | Tarea | Éxito si… | Mide |
|---|---|---|---|
| 1 | Configurá la app para vos | Termina la bienvenida y acepta los textos | Tiempo, abandono, dudas sobre el consentimiento |
| 2 | Marcá un hábito de hoy | Lo hace en < 15 s | Descubrimiento del check rápido |
| 3 | Creá un hábito "tomar 2 litros de agua" que se cuente de a vasos | Elige "Con cantidad" | Comprensión de tipos de hábito |
| 4 | Creá un hábito para dejar algo y registrá una recaída | Elige "Evitar" y encuentra "Registrar recaída" | Claridad del hábito negativo |
| 5 | Explicá con tus palabras qué son XP, nivel y rango | Lo explica sin abrir el tutorial | Claridad del juego |
| 6 | Elegí el desafío de esta semana | Elige uno y entiende qué pasa si no lo cumple | Motivación / presión |
| 7 | (Gym) Empezá un entrenamiento y registrá 2 series | Lo hace sin ayuda | Flujo del entrenamiento |
| 8 | (Gym) ¿Cuánto peso ponés de cada lado para 100 kg? | Usa la calculadora de discos | Descubrimiento |
| 9 | Ayer te olvidaste de marcar un hábito: arreglalo | Lo marca desde el calendario o la semana | Ventana de edición |
| 10 | Guardá una copia de tus datos | Usa Exportar | Confianza en los datos |
| 11 | (Gym, nunca entrenó) Entrá a Gimnasio y elegí cómo empezar | Elige una rutina básica sin ayuda | Claridad del menú de bienvenida |
| 12 | (Gym) Agregá un ejercicio de espalda a tu rutina de pecho | Usa el selector por grupos y entiende la recomendación | Utilidad de las recomendaciones |
| 14 | Mirá el calendario: ¿cuál fue tu mejor y tu peor semana del último mes? | Lo responde usando el calendario en menos de 1 min | Lectura de la escala de rojos |
| 13 | (Gym) La máquina está ocupada: cambiá el ejercicio por otro | Usa "Reemplazar" o "Cambiar por hoy" y explica por qué eligió esa alternativa | Comprensión de los reemplazos |

## Después de la sesión

- **SUS** (System Usability Scale, 10 preguntas). Meta: ≥ 75.
- Preguntas abiertas: ¿qué fue lo más motivador? ¿Qué te molestó? ¿La usarías mañana? ¿Algo te pareció injusto en el juego?
- Seguimiento de 7 días (opcional): pedir que la usen una semana y exporten sus datos (o los muestren) para ver retención y rachas. **Solo con su permiso.**

## Métricas

| Métrica | Meta |
|---|---|
| Tareas completadas sin ayuda | ≥ 80 % |
| Tiempo de bienvenida | < 2 min |
| Personas que explican XP/rango correctamente | ≥ 4 de 5 |
| SUS | ≥ 75 |
| Usan la app ≥ 4 de 7 días (seguimiento) | ≥ 50 % |

## Registro de hallazgos

| Tarea | Problema observado | Personas afectadas | Gravedad (1–4) | Propuesta |
|---|---|---|---|---|

Gravedad: 4 = impide completar la tarea, 3 = la completa con mucha dificultad, 2 = molesta, 1 = cosmético. Corregir primero los de gravedad 3–4 que afectan a 2 o más personas.

---

# Pruebas técnicas (automatizadas y manuales)

## Automatizadas

```bash
# Lógica (Node, sin navegador)
node tests/logica.test.js
node tests/reglas.test.js
node tests/gimnasio.test.js
node tests/sync.test.js
node tests/rutinas.test.js
node tests/calendario.test.js

# Navegador (Python + Playwright; servir la carpeta padre por http)
cd .. && python3 -m http.server 8765 &
cd ascend-web
pip install playwright && python3 -m playwright install chromium
python3 tests/e2e/e2e_v2.py      # almacenamiento, cantidades, foco, reglas, tutorial, comodines, negativos
python3 tests/e2e/e2e_gym.py     # superseries, RIR, sugerencia, calculadora de discos
python3 tests/e2e/migracion.py   # localStorage v1 → IndexedDB (necesita la carpeta ascend-v1 al lado)
python3 tests/e2e/responsive.py  # 320 a 1440 px y horizontal, sin desbordes
python3 tests/e2e/fase4.py       # consentimiento, legal, perfil, service worker, sin conexión
python3 tests/e2e/gimnasio_guia.py # bienvenida, rutinas básicas, selector guiado, reemplazos, fichas
python3 tests/e2e/calendario.py    # calendario de progreso: intensidad, vistas, estadísticas, detalle
```

Variables opcionales: `ASCEND_URL`, `ASCEND_BASE`, `CHROME` (ruta a Chrome), `SHOTS` (carpeta de capturas).

## Manuales (no se pueden automatizar acá)

- [ ] Instalar en Android (Chrome) y en iPhone (Safari → Agregar a inicio, iOS 16.4+).
- [ ] Recordatorio con la app en segundo plano en Android.
- [ ] Lector de pantalla: TalkBack y VoiceOver en la bienvenida, marcar hábito y entrenamiento.
- [ ] Navegación solo con teclado en escritorio (Tab, Escape, Enter).
- [ ] Zoom del sistema al 200 %.
- [ ] Cambio de día con la app abierta (pasada la medianoche).
- [ ] Modo avión después de la primera visita (sin conexión).
