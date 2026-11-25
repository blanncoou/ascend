# Reforma integral v3.0: qué se hizo, punto por punto

Estados:
- **Terminado**: funciona y está probado.
- **Terminado con límite**: funciona, con una restricción técnica explicada.
- **Requiere infraestructura**: el código está preparado, pero falta un servicio externo.

| # | Pedido | Estado | Dónde / cómo |
|---|---|---|---|
| — | Auditoría, inventario, plan y estrategia de pruebas | Terminado | `docs/AUDITORIA-Y-PLAN.md` |
| 1 | Identidad visual premium | Terminado | Paleta pedida en variables; 0 rojos sueltos; contraste calculado (`docs/DISENO.md`) |
| 2 | Inicio | Terminado | Resumen del día (mismo % que el calendario), XP de hoy, cantidades, hábitos por mañana/tarde/noche con acciones rápidas, gimnasio (próximo y último), motivación (nivel, XP que falta, racha, mensaje), navegación Inicio · Hábitos · Gimnasio · Estadísticas · Perfil |
| 3 | Hábitos avanzados | Terminado | Diarios, días fijos, X por semana, **X por mes**, con cantidad, positivos, a evitar, **mínimo e ideal**, **pausados**, archivados (conservan historial), **momento del día**, **rutinas agrupadas**. Los días no programados o en pausa no cuentan como incumplidos |
| 4 | Calendario y estadísticas | Terminado | Calendario de 5 vistas (v2.2) + comparación entre períodos, consistencia por hábito, promedio por día de la semana, evolución semanal y mensual, **Insights** con datos reales y su base |
| 5 | Planificación y rutinas | Terminado | Rutinas de mañana, tarde, noche y personalizadas (hábitos y actividades en orden); 3 prioridades; horarios; reordenar; pasar a mañana; traer pendientes; objetivos con pasos (ya existían, horizonte corto); **modo enfoque** |
| 6 | Recuperación | Terminado | Detección amable de días flojos; plan opcional de 5, 7 o 14 días: hábitos clave, pausar el resto, mínimos a la mitad, obstáculos con consejos; se deshace solo |
| 7 | Gamificación | Terminado | XP, niveles, rangos, logros **con fecha**, desafíos semanales y **mensuales**, **recompensas propias**, comodines, animaciones; configuración única en `js/config/xp.js`; página "Cómo se gana XP" |
| 8 | Ánimo y diario | Terminado con límite | Ánimo diario, notas, reflexiones, acontecimientos importantes, ánimo vs. hábitos. Privacidad: solo en el dispositivo y contenido oculto a pedido. Un **bloqueo real** (biometría) requiere la app nativa |
| 9 | Gimnasio | Terminado (v2.1) | Se conservó y se volvió a probar (28/28). El material visual con licencia sigue pendiente (ver `docs/fuentes-ejercicios.md`) |
| 10 | Recordatorios | Terminado con límite | Por hábito y por rutina, con días, pausa y horario de silencio. Llegan con la app abierta o en segundo plano reciente. **Con la app cerrada requiere Web Push** (`docs/NOTIFICACIONES.md`) |
| 11 | Persistencia, seguridad, sincronización | Terminado / requiere infraestructura | IndexedDB, migración v2→v3 sin pérdidas, copias, exportar e importar, recuperación. La combinación entre dispositivos incluye los datos v3, pero la sincronización **requiere Supabase**: no se simula |
| 12 | Accesibilidad | Terminado (sin prueba con lectores de pantalla reales) | Contraste AA, foco visible, ventanas con foco atrapado y Escape, `aria-pressed` y etiquetas, confirmación en acciones destructivas, movimiento reducido |
| 13 | Rendimiento | Terminado | Todo se calcula desde la caché diaria; XP y estadísticas se memorizan por revisión |
| 14 | Pruebas | Terminado | Ver abajo |
| 15 | Entrega | Terminado | Proyecto completo, mismas tecnologías (sin compilación ni dependencias), README actualizado |

## Decisiones de diseño (para no premiar ni castigar de más)

- **Mínimo e ideal**: el día cuenta como cumplido con el mínimo. El ideal se marca aparte y no suma XP extra, para no inflar el juego.
- **Pausa**: no es incumplir. No corta rachas, no resta XP y el historial queda intacto. Es distinta de archivar.
- **Enfoque**: no da XP propia. Si se vincula a un hábito en minutos, suma minutos reales y la XP llega por el hábito.
- **Desafío mensual**: uno por mes, elegido por el usuario. Se cobra una sola vez y queda congelado cuando cierra el mes.
- **Recompensas propias**: no dan XP. Se desbloquean con progreso real (nivel, rango o mejor racha).
- **Recuperación**: los mensajes nunca culpan ("Pasa: lo importante es volver"). Si se descarta, no vuelve a insistir por 7 días.
- **Insights**: aparecen solo con datos suficientes, muestran su base ("últimas 12 semanas, 24 días") y aclaran siempre que una asociación no demuestra causa.

## Pruebas de esta versión

- `tests/v3.test.js`: 23 pruebas de lógica.
- `tests/e2e/v3.py`: 24 verificaciones en el navegador:
  - Crear, editar, pausar, reanudar y eliminar hábitos.
  - Mínimo/ideal.
  - Inicio.
  - Rutinas.
  - Prioridades.
  - Enfoque.
  - Recuperación.
  - Desafío mensual.
  - Recompensas.
  - Reglas de XP.
  - Diario privado.
  - Recordatorios.
  - Estadísticas.
  - Persistencia.
  - Responsive.
  - Errores de JavaScript.
- **Regresión completa**: lógica, reglas, gimnasio, rutinas, calendario, sincronización y las suites de navegador e2e_v2, e2e_gym, migración, fase 4, gimnasio guiado, calendario y responsive (26 pantallas × 6 tamaños).
