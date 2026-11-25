/* ASCEND · Sonidos (opcionales, desactivados por defecto)
 * Se sintetizan con Web Audio: no hay archivos que descargar y funcionan sin conexión.
 * Son breves (< 1 s), solo suenan como respuesta a una acción del usuario y respetan settings.sound.
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  let ctx = null;

  function enabled() {
    const st = ASC.store && ASC.store.get();
    return !!(st && st.settings && st.settings.sound);
  }

  function audio() {
    if (!ctx) {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(c, freq, start, dur, type, gain) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, c.currentTime + start);
    g.gain.setValueAtTime(0.0001, c.currentTime + start);
    g.gain.exponentialRampToValueAtTime(gain || 0.12, c.currentTime + start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
    o.connect(g).connect(c.destination);
    o.start(c.currentTime + start);
    o.stop(c.currentTime + start + dur + 0.02);
  }

  const SOUNDS = {
    complete: (c) => { tone(c, 660, 0, 0.12, 'triangle', 0.08); tone(c, 990, 0.06, 0.16, 'triangle', 0.07); },
    achievement: (c) => { [523, 659, 784].forEach((f, i) => tone(c, f, i * 0.08, 0.25, 'triangle', 0.09)); },
    challenge: (c) => { [392, 523, 659, 784].forEach((f, i) => tone(c, f, i * 0.07, 0.3, 'sawtooth', 0.05)); tone(c, 1046, 0.3, 0.45, 'triangle', 0.08); },
    streak: (c) => { tone(c, 440, 0, 0.18, 'sine', 0.1); tone(c, 880, 0.1, 0.3, 'sine', 0.08); },
    rank: (c) => { [262, 330, 392, 523, 659, 784].forEach((f, i) => tone(c, f, i * 0.07, 0.4, 'sawtooth', 0.045)); tone(c, 1046, 0.45, 0.6, 'triangle', 0.1); },
    week: (c) => { [392, 494, 587].forEach((f, i) => tone(c, f, i * 0.1, 0.35, 'triangle', 0.08)); },
  };

  function play(name, force) {
    if (!force && !enabled()) return;
    try { const c = audio(); if (c && SOUNDS[name]) SOUNDS[name](c); } catch (e) { /* sin audio: no pasa nada */ }
  }

  ASC.sound = { play, enabled };
})(typeof window !== 'undefined' ? window : globalThis);
