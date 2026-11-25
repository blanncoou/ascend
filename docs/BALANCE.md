# Balance de experiencia (XP)

Toda la configuración vive en **`js/config/xp.js`** (`ASC.XP`). La XP **no se guarda**: se recalcula siempre a partir de los registros, así que cambiar un valor reajusta el total de todos los usuarios sin migraciones.

## Fuentes de XP

| Fuente | XP | Tope |
|---|---|---|
| Hábito completado | 10 | 8 hábitos por día |
| Día perfecto (todo lo programado, mínimo 2 hábitos) | 20 | 1 por día |
| Entrada de diario | 5 | 1 por día |
| Entrenamiento terminado | 50 | 2 por día |
| Récord personal | 25 | 3 por sesión |
| Paso de un objetivo / objetivo cumplido | 15 / 100 | — |
| Misiones semanales | 50–80 cada una | 3 por semana |
| Compromiso semanal suave / firme / total | 100 / 200 / 350 | 1 por semana |
| Hitos de racha (3, 7, 14, 30, 60, 100, 180, 365 días) | 30 → 3650 | una vez cada uno |
| Hitos de hábitos para evitar (7, 30, 90, 180, 365 días limpio) | 50 → 1500 | una vez cada uno |

Los topes existen para que crear 40 hábitos triviales o registrar 10 entrenamientos falsos en un día no permita subir de rango de golpe.

## Curva de niveles

Pasar del nivel *n* al *n+1* cuesta **50 + 25·(n−1)** XP (`level.base` y `level.step`).

## Cuánto tarda cada rango (estimación, sin contar hitos de racha)

- **Usuario constante:** 5 hábitos al 80 %, 40 % de días perfectos, 3 entrenamientos y 3 entradas de diario por semana, 2 misiones y compromiso firme → **≈ 122 XP/día**.
- **Usuario ocasional:** 3 hábitos al 60 %, 1 entrenamiento por semana, 1 misión → **≈ 36 XP/día**.

| Rango | Desde nivel | XP total | Días (constante) | Días (ocasional) |
|---|---|---|---|---|
| Idea | 1 | 0 | 0 | 0 |
| Chispa | 4 | 225 | 2 | 6 |
| Intento | 7 | 675 | 6 | 19 |
| Hábito | 11 | 1.625 | 13 | 45 |
| Rutina | 16 | 3.375 | 28 | 94 |
| Constancia | 21 | 5.750 | 47 | 160 |
| Determinación | 28 | 10.125 | 83 | 281 |
| Hierro | 35 | 15.725 | 129 | 437 |
| Voluntad | 43 | 23.625 | 193 | 656 |
| Disciplina pura | 51 | 33.125 | ≈ 9 meses | ≈ 2,5 años |

Idea: los primeros rangos llegan rápido (motivación inicial) y "Disciplina pura" exige meses de constancia real. Los hitos de racha aceleran entre un 10 y un 20 % a quien no corta.

## Cómo ajustar

1. Cambiar valores en `js/config/xp.js`.
2. Correr `node tests/logica.test.js` y `node tests/reglas.test.js`.
3. Actualizar esta tabla: días = `ASC.game.xpForLevel(nivel) / XP por día`.
