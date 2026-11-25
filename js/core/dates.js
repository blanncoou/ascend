/* ASCEND · Utilidades de fechas
 * Todas las fechas de hábitos se guardan como fecha LOCAL "YYYY-MM-DD" (nunca timestamp),
 * así un registro a las 00:30 no cae en el día equivocado.
 * Módulo puro: se puede portar tal cual a TypeScript para la app.
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});

  const pad = (n) => String(n).padStart(2, '0');

  /** Date -> "YYYY-MM-DD" en hora local */
  function toKey(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  /** "YYYY-MM-DD" -> Date local a las 12:00 (evita problemas de horario de verano) */
  function fromKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }

  function today() {
    return toKey(new Date());
  }

  function addDays(key, n) {
    const d = fromKey(key);
    d.setDate(d.getDate() + n);
    return toKey(d);
  }

  /** 0 = domingo … 6 = sábado */
  function weekday(key) {
    return fromKey(key).getDay();
  }

  /** Días entre dos fechas (b - a) */
  function diffDays(a, b) {
    return Math.round((fromKey(b) - fromKey(a)) / 864e5);
  }

  /** Lunes de la semana de la fecha (semana empieza lunes) */
  function weekStart(key) {
    const wd = weekday(key);
    const offset = (wd + 6) % 7; // lunes=0
    return addDays(key, -offset);
  }

  /** Lista de claves desde a hasta b inclusive */
  function range(a, b) {
    const out = [];
    if (a > b) return out;
    let k = a;
    while (k <= b) {
      out.push(k);
      k = addDays(k, 1);
    }
    return out;
  }

  const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const DIAS_LETRA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  /** "lunes 23 de noviembre" */
  function longLabel(key) {
    const d = fromKey(key);
    return DIAS_LARGOS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()];
  }

  /** "23 nov" */
  function shortLabel(key) {
    const d = fromKey(key);
    return d.getDate() + ' ' + MESES_CORTOS[d.getMonth()];
  }

  function monthLabel(year, month) {
    const s = MESES[month] + ' ' + year;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /** Duración en ms -> "1 h 05 min" / "42 min" */
  function duration(ms) {
    const min = Math.max(0, Math.round(ms / 60000));
    if (min < 60) return min + ' min';
    return Math.floor(min / 60) + ' h ' + pad(min % 60) + ' min';
  }

  /** Segundos -> "1:30" */
  function clock(sec) {
    sec = Math.max(0, Math.ceil(sec));
    return Math.floor(sec / 60) + ':' + pad(sec % 60);
  }

  ASC.dates = {
    toKey, fromKey, today, addDays, weekday, diffDays, weekStart, range,
    longLabel, shortLabel, monthLabel, duration, clock,
    DIAS_CORTOS, DIAS_LETRA, DIAS_LARGOS, MESES, MESES_CORTOS,
  };
})(typeof window !== 'undefined' ? window : globalThis);
