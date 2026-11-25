# Calendario de progreso (v2.2)

Dónde está: **Hábitos → Calendario**. Reemplaza al calendario mensual anterior. Los enlaces viejos (`?m=AAAA-MM&d=…`) siguen funcionando.

## Cómo se integró (sin sistema paralelo)

- **Una sola fuente de verdad**: los registros de siempre (`habitLogs`, `habitQty`, `habits`). El calendario no guarda nada propio, así que no puede duplicar registros.
- **Mismo cálculo diario**: se extendió el agregado diario que ya existía (`ASC.habits.dayCounts` / `dayStatus`). Se sumó un campo nuevo, `progress`, con el avance real (las cantidades parciales aportan su fracción). Los campos de siempre (`done`, `scheduled`, `status`) **no cambiaron**, así que rachas, día perfecto, XP y misiones dan exactamente lo mismo que antes. Esto está probado.
- **Misma caché**: ese agregado ya se guardaba por día (`ASC.perf`). Marcar un hábito invalida solo ese día; editar hábitos invalida todo. Cambiar de vista **no recalcula el historial**. Medido con un año de datos: 0 días recalculados al pasar de una vista a otra y unos 6 ms para dibujar 12 meses.
- **Mismas reglas de edición**: consultar es solo lectura. "Corregir este día" aparece solo si la fecha está dentro de la ventana de edición (hoy y ayer, por defecto) y usa los mismos controles de siempre.

## Cálculo del cumplimiento

`% del día = suma del avance de los hábitos que correspondían ese día / cantidad de esos hábitos`

| Caso | Cómo cuenta |
|---|---|
| Hábito sí/no completado | 1 (100 %) |
| Hábito sí/no sin completar | 0 |
| Con cantidad (ej. 4 de 8 vasos) | 0,5. Si no llegó al objetivo, como máximo 0,99, para no contradecir el registro "no cumplido" (por ejemplo, si después se bajó el objetivo). |
| Días específicos (lun/mié/vie) | Solo cuenta los días programados |
| X veces por semana | Suma el día que se hizo; nunca resta |
| Antes de crearse | No cuenta |
| Archivado | Cuenta hasta la fecha en que se archivó; después no altera nada |
| Eliminado | Se elimina con sus registros (comportamiento existente), así que deja de contar |
| Hábitos para evitar | No entran en el % (siguen con sus días limpios y recaídas, que se ven en el detalle) |
| Día sin hábitos programados | "Sin hábitos programados": no es 0 % y no entra en las estadísticas |
| Día futuro | Sin color y fuera de las estadísticas |
| Hoy | Se ve con su avance, pero entra en las estadísticas solo cuando está completo (el día todavía no terminó) |

## Escala de rojos

La intensidad es **continua**: opacidad del rojo = 0,14 + 0,66 × % (de 0,15 con 1 % a 0,79 con 99 %). El 100 % es rojo pleno con brillo. Los niveles de la leyenda (1–24, 25–49, 50–74, 75–99, 100) se usan como referencia y en la descripción para lectores de pantalla. 0 % = gris neutro; "sin hábitos programados" = celda vacía con borde; futuro = casi invisible.

## Vistas

- **Semana** (lunes a domingo): celdas grandes con día, número, % y hechos/programados.
- **Mes**: grilla de 7 columnas con número y % (en pantallas de menos de 400 px se muestra solo el número) y un punto blanco en los días con entrenamiento.
- **3, 6 y 12 meses**: un mini-calendario por mes, sin números, con el promedio del mes. El nombre del mes abre esa vista mensual: eso sirve como alternativa accesible a las celdas chicas.
- Flechas para ir al período anterior o siguiente (el foco queda en la flecha), "Ir a hoy" en períodos pasados y animación suave al cambiar (se desactiva con "Reducir animaciones" o con la preferencia del sistema).

## Estadísticas del período

Promedio, días al 100 %, parciales, sin cumplir, mejor día (el de mayor %; si empatan, el de más hábitos y después el más reciente) y racha actual. La racha es la misma racha de constancia del resto de la app y solo se muestra si el período incluye hoy. Todo se calcula con los mismos datos que pintan las celdas: la prueba compara los números de las tarjetas con las celdas en pantalla.

## Detalle del día

Al tocar un día se abre una ventana de **solo lectura** con:
- Fecha.
- Porcentaje y estado.
- Completados y pendientes.
- XP del día con su desglose: hábitos (con tope diario), día perfecto, diario, entrenamientos y récords. Es la misma fórmula que el total de XP; no incluye misiones, desafíos ni hitos, que son semanales o extraordinarios, y la ventana lo aclara.
- Cantidades con su barra.
- Lista de realizados y no realizados.
- Entrenamientos, recaídas y entradas del diario.

## Archivos

- **Nuevos**:
  - `js/domain/calendar.js`: períodos, intensidad, resumen, XP del día y detalle; lógica pura.
  - `js/screens/calendar.js`: interfaz.
  - `tests/calendario.test.js`: 24 pruebas.
  - `tests/e2e/calendario.py`: 20 verificaciones.
  - Este documento.
- **Modificados**:
  - `js/domain/habits.js`: `habitFraction` y campo `progress` en el agregado diario.
  - `js/screens/habits.js`: la pestaña Calendario usa el módulo nuevo, con compatibilidad de enlaces.
  - `css/styles.css` y `js/config/brand.js` (`--red-rgb`).
  - `index.html`, `sw.js` y `tests/e2e/responsive.py`.

## Pruebas (resultados reales)

| Escenario pedido | Verificación | Resultado |
|---|---|---|
| 1. Todo completado → rojo intenso | 8/8 → clase `k-full`, color rgb(255, 45, 58) | OK |
| 2. La mitad → intermedio | 4/8 → nivel 3, opacidad 0,47 | OK |
| 3. Muy poco → tenue | 1/8 → nivel 1, opacidad 0,22 | OK |
| 4. Sin programados ≠ 0 % | Celda vacía con borde vs. gris; distinto color | OK |
| 5. Cantidades parciales | 4 de 8 vasos = 50 % del hábito; el detalle muestra "4 / 8 vasos · 50 %" | OK |
| 6. Cambio de vistas y períodos | 7, 30, 91, 183 y 365 días con rangos exactos; atrás/adelante; año bisiesto y semana que cruza el año | OK |
| 7. Historial intacto | Los registros son idénticos antes y después de recorrer todas las vistas y abrir detalles | OK |
| 8. Estadísticas = calendario | Tarjetas comparadas con las celdas en pantalla (semana, mes, 3 meses) y en Node | OK |
| 9. Futuro no cuenta | Sin color; el resumen los informa aparte | OK |
| 10. Celulares, tablets, computadoras | 320, 390, 768, 1024 y 1440 px en las 5 vistas, sin desplazamiento horizontal | OK |
| Extra | Actualización inmediata al corregir, persistencia tras recargar, sin registros duplicados, días cerrados solo de consulta, sin errores de JavaScript | OK |

Además pasan todas las suites anteriores (lógica, reglas, gimnasio, rutinas, sincronización, migración, fase 4, gimnasio guiado y la de 22 pantallas responsivas).

## Limitaciones

- En las vistas de 3, 6 y 12 meses las celdas miden menos de 24 px en celulares. Se pueden tocar igual; la alternativa accesible es el nombre del mes, que abre la vista mensual.
- El % de días pasados con hábitos de cantidad usa el objetivo **actual** del hábito, porque la app no guarda el historial de objetivos. El tope de 0,99 evita que un día no cumplido aparezca como completo, pero si cambiaste el objetivo, el % parcial de días viejos puede diferir del que veías entonces.
- La XP del día no incluye la XP semanal ni la de hitos, porque no pertenece a un día concreto.
