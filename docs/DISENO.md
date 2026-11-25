# Sistema visual (v3)

Todo sale de las variables de `css/styles.css` (`:root`) y de `js/config/brand.js`. Ningún color de marca está escrito a mano en el resto del CSS ni en el JavaScript: se pasó de 75 rojos sueltos a 0.

## Paleta

| Token | Valor | Uso |
|---|---|---|
| `--bg` | #101114 | Fondo |
| `--surface` | #1B1D22 | Superficies y tarjetas principales |
| `--surface-2` | #24262C | Tarjetas secundarias, controles |
| `--line` | #303239 | Bordes discretos |
| `--text` | #F5F5F5 | Texto principal |
| `--muted` | #9A9DA5 | Texto secundario |
| `--faint` | #8E919A | Texto terciario |
| `--control` | #6E717A | Bordes de controles (checks, interruptores) |
| `--red` | #D52B42 | Rojo principal: botones, rellenos, progreso |
| `--red-hi` | #F04459 | Rojo intenso: 100 %, logros, brillos |
| `--red-text` | #FF5A6C | Rojo para texto chico sobre tarjetas |
| `--red-600` | #C42438 | Fondo para texto blanco chico |

El rojo se reserva para acciones, progreso, logros y estados destacados. Las tarjetas y los fondos son neutros. Además, el brillo rojo de la tarjeta principal se redujo a la mitad.

## Contraste calculado (WCAG 2.2)

| Combinación | Contraste | Requisito |
|---|---|---|
| Texto principal sobre tarjeta secundaria | 13,9:1 | AA texto ✓ |
| Secundario (#9A9DA5) sobre fondo / superficie / tarjeta | 6,96 / 6,21 / 5,57:1 | AA texto ✓ |
| Terciario (#8E919A) sobre tarjeta secundaria | 4,8:1 | AA texto ✓ |
| Blanco sobre rojo principal | 4,94:1 | AA texto ✓ |
| Blanco sobre `--red-600` | 5,74:1 | AA texto ✓ |
| `--red-text` sobre tarjeta secundaria | 4,99:1 | AA texto ✓ |
| Rojo intenso sobre fondo | 5,1:1 | AA texto ✓ |
| Bordes de controles sobre superficie | 3,46:1 | AA componentes (≥ 3:1) ✓ |
| Texto oscuro sobre celda 100 % del calendario | ≈ 5:1 | AA texto ✓ |

El rojo principal (#D52B42) **no** se usa para texto chico sobre el fondo (3,8:1): para eso está `--red-text`.

## Criterios

- **Pantallas**: Inicio prioriza el día (resumen → hábitos por momento → motivación → gimnasio → plan). Lo secundario (semana, accesos rápidos) se quitó porque ya está en el calendario y en la navegación.
- **Movimiento**: animaciones cortas (150–350 ms). Todas se apagan con "Reducir animaciones" o con la preferencia del sistema.
- **Tamaños táctiles**: 44 px en las acciones principales; ningún control de los flujos nuevos baja de 30 px (WCAG 2.5.8 pide 24 px como mínimo).
- **Iconos**: un solo set de trazo (24 px, 2 px de grosor). Se agregaron tendencia, corazón, sol, atardecer, luna, regalo y ojo.
