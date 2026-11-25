/* ASCEND · Componentes de interfaz reutilizables (sin dependencias)
 * Patrón: cada pantalla devuelve HTML; los botones llevan data-act="nombre" y se resuelven
 * por delegación en ASC.actions (ver app.js).
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    habits: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    heart: '<path d="M12 20s-7-4.4-9-9a4.6 4.6 0 0 1 9-2 4.6 4.6 0 0 1 9 2c-2 4.6-9 9-9 9z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    sunset: '<path d="M17 18a5 5 0 0 0-10 0"/><path d="M12 2v7M4.2 10.2l1.4 1.4M1 18h2M21 18h2M18.4 11.6l1.4-1.4M23 22H1M8 6l4-4 4 4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
    chart: '<path d="M4 20V11M10 20V4M16 20v-7M21 20H3"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    flame: '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 1.6 1.2 2.5 2 2.5-1-3 0-6 1-8z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    book: '<path d="M4 19V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM8 7h7"/>',
    chevR: '<path d="M9 6l6 6-6 6"/>',
    chevL: '<path d="M15 6l-6 6 6 6"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>',
    archive: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v12h14V8M10 12h4"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>',
    play: '<path d="M7 4.5v15l12.5-7.5z"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5v1A3 3 0 0 0 8 10M16 6h3.5v1A3 3 0 0 1 16 10M12 13v4M8 21h8M9 17h6"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    scale: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 10a4 4 0 0 1 6 0l-3 2.5"/>',
    note: '<path d="M5 4h14v16H5zM9 9h6M9 13h6M9 17h3"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2"/>',
    star: '<path d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>',
    logout: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
    skip: '<path d="M5 5v14l10-7zM19 5v14"/>',
    minus: '<path d="M5 12h14"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.5L3 9M3 4v5h5M4 13a8 8 0 0 0 14.6 4.5L21 15M21 20v-5h-5"/>',
  };

  function icon(name, cls) {
    return '<svg class="icon ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (P[name] || '') + '</svg>';
  }

  /** Anillo de progreso. pct 0..1 */
  function ring(pct, size, stroke, inner) {
    size = size || 112; stroke = stroke || 10;
    const r = (size - stroke) / 2, c = 2 * Math.PI * r;
    const off = c * (1 - Math.max(0, Math.min(1, pct)));
    return '<div class="ring" style="width:' + size + 'px;height:' + size + 'px">' +
      '<svg width="' + size + '" height="' + size + '"><circle class="track" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke-width="' + stroke + '"/>' +
      '<circle class="bar" data-ring cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke-width="' + stroke + '" stroke-dasharray="' + c + '" stroke-dashoffset="' + c + '" data-off="' + off + '"/></svg>' +
      '<div class="label">' + (inner || '') + '</div></div>';
  }

  /** Anima los anillos recién renderizados (de 0 a su valor) */
  function animateRings(scope) {
    const rings = (scope || document).querySelectorAll('[data-ring]');
    requestAnimationFrame(() => requestAnimationFrame(() => rings.forEach((el) => el.setAttribute('stroke-dashoffset', el.dataset.off))));
  }

  function emptyState(ic, title, text, btnLabel, act, attrs) {
    return '<div class="empty"><div class="em-icon">' + icon(ic) + '</div><h3>' + esc(title) + '</h3><p>' + esc(text) + '</p>' +
      (btnLabel ? '<button class="btn primary" data-act="' + act + '" ' + (attrs || '') + '>' + icon('plus', 'sm') + esc(btnLabel) + '</button>' : '') + '</div>';
  }

  /* ---------- Toasts ---------- */
  let toastWrap;
  function toast(msg, kind, html) {
    if (!toastWrap) {
      toastWrap = document.createElement('div');
      toastWrap.className = 'toast-wrap';
      toastWrap.setAttribute('role', 'status');
      toastWrap.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastWrap);
    }
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || '');
    if (kind === 'error') t.setAttribute('role', 'alert'); // los errores se anuncian de inmediato
    t.innerHTML = html ? msg : esc(msg);
    toastWrap.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 260); }, 2600);
  }

  /* ---------- Hojas inferiores y diálogos (accesibles) ----------
   * Al abrir: el foco entra en la ventana. Tab / Shift+Tab quedan dentro. Escape cierra.
   * Al cerrar: el foco vuelve al elemento que la abrió. El resto de la página queda inerte.
   */
  const stack = [];
  let idSeq = 0;
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function focusables(panel) {
    return Array.from(panel.querySelectorAll(FOCUSABLE)).filter((el) => !el.hidden && el.offsetParent !== null);
  }

  function setInert(on) {
    const app = document.getElementById('app');
    if (!app) return;
    if (on) app.setAttribute('inert', ''); else app.removeAttribute('inert');
    app.setAttribute('aria-hidden', on ? 'true' : 'false');
  }

  /** Registra una capa modal: trampa de foco, Escape y devolución del foco */
  function layer(ov, panel, onEscape, initial) {
    const opener = document.activeElement;
    stack.push(ov);
    setInert(true);
    panel.setAttribute('tabindex', '-1');
    ov.addEventListener('keydown', (e) => {
      if (stack[stack.length - 1] !== ov) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onEscape(); return; }
      if (e.key !== 'Tab') return;
      const f = focusables(panel);
      if (!f.length) { e.preventDefault(); panel.focus(); return; }
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    setTimeout(() => {
      const target = initial ? panel.querySelector(initial) : null;
      (target || focusables(panel)[0] || panel).focus({ preventScroll: true });
    }, 60);
    return function release() {
      const i = stack.indexOf(ov);
      if (i >= 0) stack.splice(i, 1);
      if (!stack.length) setInert(false);
      if (opener && document.body.contains(opener) && opener.focus) opener.focus({ preventScroll: true });
    };
  }

  function sheet(opts) {
    const ov = document.createElement('div');
    ov.className = 'overlay';
    const hid = 'sheet-title-' + ++idSeq;
    ov.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="' + hid + '"><div class="grab" aria-hidden="true"></div>' +
      '<div class="sheet-head"><h2 id="' + hid + '">' + esc(opts.title || '') + '</h2><button class="icon-btn" data-close aria-label="Cerrar">' + icon('x') + '</button></div>' +
      '<div class="sheet-body">' + opts.body + '</div></div>';
    const panel = ov.querySelector('.sheet');
    let release = null;
    const close = () => {
      if (!ov.isConnected) return;
      ov.remove();
      if (release) release();
      if (opts.onClose) opts.onClose();
    };
    ov.addEventListener('click', (e) => {
      if (e.target === ov || e.target.closest('[data-close]')) close();
    });
    ov._close = close;
    document.body.appendChild(ov);
    release = layer(ov, panel, close, opts.autofocus === false ? '.sheet-body [data-act], .sheet-body button, [data-close]' : '.sheet-body input:not([type=hidden]), .sheet-body textarea');
    if (opts.onMount) opts.onMount(panel, close);
    return { el: panel, close };
  }

  function closeTop() {
    const ov = stack[stack.length - 1];
    if (ov && ov._close) ov._close();
  }

  function topSheet() {
    for (let i = stack.length - 1; i >= 0; i--) { const sh = stack[i].querySelector('.sheet'); if (sh) return sh; }
    return null;
  }

  /** Diálogo centrado. onEscape: qué hacer si se presiona Escape. */
  function dialog(html, cls, onEscape) {
    const ov = document.createElement('div');
    ov.className = 'overlay center';
    const did = 'dlg-' + ++idSeq;
    ov.innerHTML = '<div class="dialog ' + (cls || '') + '" role="alertdialog" aria-modal="true" aria-labelledby="' + did + '-t" aria-describedby="' + did + '-d">' + html + '</div>';
    const panel = ov.querySelector('.dialog');
    const t = panel.querySelector('h3, .rank-name'); if (t) t.id = did + '-t';
    const d = panel.querySelector('p'); if (d) d.id = did + '-d';
    document.body.appendChild(ov);
    let release = null;
    const close = () => { if (!ov.isConnected) return; ov.remove(); if (release) release(); };
    ov._close = close;
    release = layer(ov, panel, () => (onEscape ? onEscape() : close()), '[data-ok], [data-no]');
    return ov;
  }

  /** Confirmación obligatoria antes de borrar o descartar */
  function confirm(opts) {
    return new Promise((resolve) => {
      let ov;
      const done = (v) => { ov._close(); resolve(v); };
      ov = dialog('<h3>' + esc(opts.title) + '</h3><p>' + esc(opts.text || '') + '</p>' +
        '<div class="btn-row"><button class="btn ghost" data-no>' + esc(opts.cancel || 'Cancelar') + '</button>' +
        '<button class="btn ' + (opts.danger ? 'danger' : 'primary') + '" data-yes>' + esc(opts.ok || 'Confirmar') + '</button></div>', '', () => done(false));
      ov.addEventListener('click', (e) => {
        if (e.target.closest('[data-yes]')) done(true);
        else if (e.target.closest('[data-no]') || e.target === ov) done(false);
      });
    });
  }

  function celebrate(title, text) {
    haptic([12, 40, 20]);
    if (ASC.sound) ASC.sound.play('achievement');
    const ov = dialog('<div class="medal">' + icon('trophy') + '</div><div class="kicker">LOGRO DESBLOQUEADO</div>' +
      '<h3 style="margin-top:6px">' + esc(title) + '</h3><p>' + esc(text) + '</p><button class="btn primary block" data-ok>Seguir</button>', 'unlock');
    ov.addEventListener('click', (e) => { if (e.target.closest('[data-ok]') || e.target === ov) ov._close(); });
  }

  /* ---------- Microinteracciones ---------- */
  function haptic(p) {
    try { if (navigator.vibrate) navigator.vibrate(p || 10); } catch (e) {}
  }

  function burst(el) {
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('reduce-motion')) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (let i = 0; i < 10; i++) {
      const p = document.createElement('i');
      p.className = 'burst';
      const a = (Math.PI * 2 * i) / 10, d = 26 + Math.random() * 16;
      p.style.left = cx - 3 + 'px';
      p.style.top = cy - 3 + 'px';
      p.style.setProperty('--dx', Math.cos(a) * d + 'px');
      p.style.setProperty('--dy', Math.sin(a) * d + 'px');
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 650);
    }
  }

  /* ---------- Gráficos SVG simples ---------- */
  /** data: [{label, value, highlight?, text?}] */
  function barChart(data, opts) {
    opts = opts || {};
    const W = 340, H = opts.height || 150, padB = 22, padT = 18;
    const max = opts.max || Math.max(1, ...data.map((d) => d.value));
    const bw = (W / data.length) * 0.56, step = W / data.length;
    let s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.label || 'Gráfico') + '">';
    s += '<line class="grid" x1="0" x2="' + W + '" y1="' + (H - padB) + '" y2="' + (H - padB) + '"/>';
    data.forEach((d, i) => {
      const h = ((H - padB - padT) * d.value) / max;
      const x = i * step + (step - bw) / 2, y = H - padB - h;
      s += '<rect class="barv ' + (d.value ? '' : 'dim') + '" x="' + x + '" y="' + (d.value ? y : H - padB - 3) + '" width="' + bw + '" height="' + (d.value ? Math.max(h, 3) : 3) + '" rx="5" opacity="' + (d.highlight === false ? 0.45 : 1) + '"/>';
      if (d.value && d.text != null) s += '<text class="val" x="' + (x + bw / 2) + '" y="' + (y - 5) + '" text-anchor="middle">' + esc(d.text) + '</text>';
      s += '<text class="axis" x="' + (x + bw / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(d.label) + '</text>';
    });
    return s + '</svg>';
  }

  /** points: [{label, value}] en orden cronológico */
  function lineChart(points, opts) {
    opts = opts || {};
    const W = 340, H = opts.height || 160, padL = 34, padR = 10, padT = 14, padB = 22;
    const vals = points.map((p) => p.value);
    let min = Math.min(...vals), max = Math.max(...vals);
    if (min === max) { min -= 1; max += 1; }
    const span = max - min; min -= span * 0.1; max += span * 0.1;
    const X = (i) => padL + (points.length === 1 ? (W - padL - padR) / 2 : (i * (W - padL - padR)) / (points.length - 1));
    const Y = (v) => padT + ((max - v) * (H - padT - padB)) / (max - min);
    const fmt = (v) => (Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10);
    let s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.label || 'Evolución') + '">';
    s += '<defs><linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="' + ASC.brand.colors.accentHi + '" stop-opacity=".35"/><stop offset="1" stop-color="' + ASC.brand.colors.accentHi + '" stop-opacity="0"/></linearGradient></defs>';
    for (let g = 0; g < 3; g++) {
      const v = min + ((max - min) * g) / 2, y = Y(v);
      s += '<line class="grid" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + y + '" y2="' + y + '"/><text class="axis" x="' + (padL - 6) + '" y="' + (y + 3) + '" text-anchor="end">' + fmt(v) + '</text>';
    }
    const d = points.map((p, i) => (i ? 'L' : 'M') + X(i) + ' ' + Y(p.value)).join('');
    if (points.length > 1) s += '<path class="area" d="' + d + 'L' + X(points.length - 1) + ' ' + (H - padB) + 'L' + X(0) + ' ' + (H - padB) + 'Z"/>';
    s += '<path class="line" d="' + d + '"/>';
    const every = Math.ceil(points.length / 6);
    points.forEach((p, i) => {
      s += '<circle class="pt" cx="' + X(i) + '" cy="' + Y(p.value) + '" r="3.5"/>';
      if (i % every === 0 || i === points.length - 1) s += '<text class="axis" x="' + X(i) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(p.label) + '</text>';
    });
    return s + '</svg>';
  }

  /* ---------- Emblemas de rango (evolucionan de "Idea" a "Disciplina pura") ---------- */
  function emblem(i, size) {
    size = size || 64;
    const red = ASC.brand.colors.accentHi, soft = i < 1 ? '#9a9aa3' : i < 3 ? '#ff6670' : red;
    const sw = 3;
    const uid = 'em' + i + '-' + size;
    const chev = (y, col) => '<path d="M21 ' + y + 'l11-8 11 8" fill="none" stroke="' + (col || soft) + '" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round"/>';
    const hex = 'M32 6l22 12.7v26.6L32 58 10 45.3V18.7z';
    const shield = 'M32 5l22 8v16c0 14-9.5 24.5-22 30C19.5 53.5 10 43 10 29V13z';
    let g = '';
    if (i === 0) g = '<circle cx="32" cy="32" r="20" fill="none" stroke="' + soft + '" stroke-width="2" stroke-dasharray="3 5"/><circle cx="32" cy="32" r="6" fill="#fff" opacity=".9"/>';
    else if (i === 1) g = '<circle cx="32" cy="32" r="20" fill="none" stroke="' + soft + '" stroke-width="2" opacity=".5"/><path d="M32 14l4 14 14 4-14 4-4 14-4-14-14-4 14-4z" fill="' + soft + '"/>';
    else if (i <= 4) {
      const n = i - 1;
      g = '<circle cx="32" cy="32" r="22" fill="none" stroke="' + soft + '" stroke-width="2.5"/>';
      for (let k = 0; k < n; k++) g += chev(40 - k * 8 + (n - 1) * 4);
    } else {
      const base = i >= 7 ? shield : hex;
      const fill = i >= 9 ? 'url(#' + uid + ')' : i >= 6 ? 'rgba(' + ASC.brand.rgbHi + ',.18)' : 'none';
      g = '<defs><linearGradient id="' + uid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff4651"/><stop offset="1" stop-color="#6d0a12"/></linearGradient></defs>';
      if (i >= 8) for (let k = 0; k < 12; k++) {
        const a = (Math.PI * 2 * k) / 12, r1 = 29, r2 = i >= 9 ? 33 : 31.5;
        g += '<line x1="' + (32 + Math.cos(a) * r1).toFixed(1) + '" y1="' + (32 + Math.sin(a) * r1).toFixed(1) + '" x2="' + (32 + Math.cos(a) * r2).toFixed(1) + '" y2="' + (32 + Math.sin(a) * r2).toFixed(1) + '" stroke="' + red + '" stroke-width="2" stroke-linecap="round"/>';
      }
      g += '<path d="' + base + '" fill="' + fill + '" stroke="' + red + '" stroke-width="2.5" stroke-linejoin="round"/>';
      if (i === 6) g += '<circle cx="32" cy="32" r="13" fill="none" stroke="' + red + '" stroke-width="1.5" opacity=".6"/>';
      const col = i >= 9 ? '#fff' : red;
      g += chev(44, col) + chev(36, col) + chev(28, col);
      if (i >= 9) g += '<circle cx="32" cy="16" r="2.5" fill="#fff"/>';
    }
    const glow = i >= 3 ? 'drop-shadow(0 0 ' + Math.min(14, 2 + i * 1.4) + 'px rgba(' + ASC.brand.rgbHi + ',' + Math.min(0.75, 0.15 + i * 0.07) + '))' : 'none';
    return '<svg class="emblem" width="' + size + '" height="' + size + '" viewBox="0 0 64 64" style="filter:' + glow + '" aria-hidden="true">' + g + '</svg>';
  }

  /** Celebración de nuevo rango (pantalla completa) */
  function rankUp(info) {
    haptic([20, 60, 20, 60, 40]);
    confetti(110);
    if (ASC.sound) ASC.sound.play('rank');
    const ov = dialog('<div class="kicker">NUEVO RANGO</div><div class="rank-emblem">' + emblem(info.rankIndex, 132) + '</div>' +
      '<div class="rank-name">' + esc(info.rank) + '</div><p class="rank-motto">' + esc(info.motto) + '</p>' +
      '<div class="small muted" style="margin-bottom:18px">Nivel ' + info.level + (info.nextRank ? ' · Próximo rango: <b style="color:#fff">' + esc(info.nextRank) + '</b> en nivel ' + info.nextRankLevel : ' · Llegaste a la cima.') + '</div>' +
      '<button class="btn primary block" data-ok>Seguir subiendo</button>', 'rankup');
    ov.addEventListener('click', (e) => { if (e.target.closest('[data-ok]')) ov._close(); });
  }

  /** Aviso de subida de nivel */
  function levelUp(info) {
    haptic([15, 40, 15]);
    toast('<span class="lv-badge">' + info.level + '</span><span><b>¡Nivel ' + info.level + '!</b><br><span class="muted small">' + esc(info.rank) + (info.nextRank ? ' · ' + ASC.ui.fmtNum(info.xpToNextRank) + ' XP para ' + esc(info.nextRank) : '') + '</span></span>', 'levelup', true);
  }

  /* ---------- Mapa muscular (ilustración propia, sin licencias de terceros) ---------- */
  // Cada forma pertenece a un grupo (y opcionalmente a una zona). Frente a la izquierda, espalda a la derecha.
  const MM = [
    // frente (centro x=50)
    ['hombros', 'ant', 'e', 33, 45, 7, 6], ['hombros', 'ant', 'e', 67, 45, 7, 6],
    ['pecho', 'sup', 'r', 37, 47, 12, 6, 3], ['pecho', 'sup', 'r', 51, 47, 12, 6, 3],
    ['pecho', 'med', 'r', 37, 53, 12, 5, 2], ['pecho', 'med', 'r', 51, 53, 12, 5, 2],
    ['pecho', 'inf', 'r', 38, 58, 11, 4, 2], ['pecho', 'inf', 'r', 51, 58, 11, 4, 2],
    ['biceps', '', 'e', 27, 64, 4.8, 9], ['biceps', '', 'e', 73, 64, 4.8, 9],
    ['antebrazos', '', 'e', 23, 86, 4.2, 10], ['antebrazos', '', 'e', 77, 86, 4.2, 10],
    ['abdomen', 'recto', 'r', 43, 64, 14, 28, 4], ['abdomen', 'oblicuos', 'r', 37, 67, 5, 20, 3], ['abdomen', 'oblicuos', 'r', 58, 67, 5, 20, 3],
    ['otros', 'aductores', 'e', 47, 112, 2.6, 9], ['otros', 'aductores', 'e', 53, 112, 2.6, 9],
    ['cuadriceps', '', 'e', 41, 122, 6.5, 19], ['cuadriceps', '', 'e', 59, 122, 6.5, 19],
    ['gemelos', 'soleo', 'e', 41, 160, 3.6, 10], ['gemelos', 'soleo', 'e', 59, 160, 3.6, 10],
    // espalda (centro x=150)
    ['espalda', 'trap', 'r', 141, 35, 18, 10, 4],
    ['hombros', 'post', 'e', 133, 45, 7, 6], ['hombros', 'post', 'e', 167, 45, 7, 6], ['hombros', 'lat', 'e', 128, 49, 3.5, 5], ['hombros', 'lat', 'e', 172, 49, 3.5, 5],
    ['espalda', 'media', 'r', 141, 46, 18, 12, 3],
    ['espalda', 'dorsal', 'r', 135, 52, 9, 24, 5], ['espalda', 'dorsal', 'r', 156, 52, 9, 24, 5],
    ['espalda', 'lumbar', 'r', 144, 78, 12, 12, 3],
    ['triceps', '', 'e', 127, 64, 4.8, 9], ['triceps', '', 'e', 173, 64, 4.8, 9],
    ['antebrazos', '', 'e', 123, 86, 4.2, 10], ['antebrazos', '', 'e', 177, 86, 4.2, 10],
    ['gluteos', 'mayor', 'e', 143, 101, 7.5, 8], ['gluteos', 'mayor', 'e', 157, 101, 7.5, 8], ['gluteos', 'medio', 'e', 136, 94, 3.5, 4], ['gluteos', 'medio', 'e', 164, 94, 3.5, 4],
    ['isquios', '', 'e', 142, 126, 6.5, 17], ['isquios', '', 'e', 158, 126, 6.5, 17],
    ['gemelos', 'gastro', 'e', 142, 158, 5, 11], ['gemelos', 'gastro', 'e', 158, 158, 5, 11],
  ];

  function muscleMap(primary, region, secondary, size) {
    secondary = secondary || [];
    const shape = (m, cls) => (m[2] === 'e'
      ? '<ellipse class="' + cls + '" cx="' + m[3] + '" cy="' + m[4] + '" rx="' + m[5] + '" ry="' + m[6] + '"/>'
      : '<rect class="' + cls + '" x="' + m[3] + '" y="' + m[4] + '" width="' + m[5] + '" height="' + m[6] + '" rx="' + m[7] + '"/>');
    let body = '';
    [50, 150].forEach((cx) => {
      body += '<circle class="mm-base" cx="' + cx + '" cy="20" r="9"/><rect class="mm-base" x="' + (cx - 4) + '" y="28" width="8" height="6" rx="2"/>' +
        '<path class="mm-base" d="M' + (cx - 20) + ' 38 Q' + cx + ' 32 ' + (cx + 20) + ' 38 L' + (cx + 17) + ' 96 Q' + cx + ' 100 ' + (cx - 17) + ' 96 Z"/>' +
        '<rect class="mm-base" x="' + (cx - 16) + '" y="96" width="32" height="84" rx="10"/><circle class="mm-base" cx="' + (cx - 28) + '" cy="100" r="4"/><circle class="mm-base" cx="' + (cx + 28) + '" cy="100" r="4"/>' +
        '<rect class="mm-base" x="' + (cx - 33) + '" y="44" width="11" height="54" rx="5"/><rect class="mm-base" x="' + (cx + 22) + '" y="44" width="11" height="54" rx="5"/>';
    });
    let mus = '';
    MM.forEach((m) => {
      let cls = 'mm-m';
      if (m[0] === primary && (!region || !m[1] || m[1] === region || (primary === 'hombros' && region === 'lat' && m[1] !== 'post' && m[1] !== 'ant'))) cls += ' mm-p';
      else if (m[0] === primary) cls += ' mm-g';
      else if (secondary.includes(m[0])) cls += ' mm-s';
      mus += shape(m, cls);
    });
    return '<svg class="muscle-map" viewBox="0 0 200 186" width="' + (size || 200) + '" role="img" aria-label="Mapa muscular: ' + esc(ASC.exerciseData ? ASC.exerciseData.muscleLabel(primary) : primary) + '">' + body + mus +
      '<text x="50" y="185" text-anchor="middle" class="mm-t">Frente</text><text x="150" y="185" text-anchor="middle" class="mm-t">Espalda</text></svg>';
  }

  /** Lluvia de partículas para celebraciones grandes (respeta movimiento reducido) */
  function confetti(n) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('reduce-motion')) return;
    const colors = [ASC.brand.colors.accentHi, '#ffffff', '#ff7a85', '#b3131e', '#ffd0d4'];
    const wrap = document.createElement('div');
    wrap.className = 'confetti';
    wrap.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < (n || 70); i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = Math.random() * 0.5 + 's';
      p.style.animationDuration = 1.6 + Math.random() * 1.4 + 's';
      p.style.setProperty('--r', Math.round(Math.random() * 720 - 360) + 'deg');
      p.style.setProperty('--x', Math.round(Math.random() * 120 - 60) + 'px');
      wrap.appendChild(p);
    }
    document.body.appendChild(wrap);
    setTimeout(() => wrap.remove(), 3600);
  }

  /** Marca un campo con error: aria-invalid, mensaje visible asociado y foco */
  function fieldError(input, msg) {
    if (!input) { toast(msg, 'error'); return; }
    const field = input.closest('.field') || input.parentElement;
    let m = field.querySelector('.field-error');
    if (!m) { m = document.createElement('div'); m.className = 'field-error'; m.id = 'err-' + ++idSeq; m.setAttribute('role', 'alert'); field.appendChild(m); }
    m.textContent = msg;
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', m.id);
    input.focus();
    input.addEventListener('input', () => { input.removeAttribute('aria-invalid'); m.remove(); }, { once: true });
  }

  function fmtNum(n) {
    return Number(n || 0).toLocaleString('es-AR');
  }

  ASC.actions = ASC.actions || {};
  ASC.screens = ASC.screens || {};
  ASC.ui = { muscleMap, confetti, fieldError, emblem, rankUp, levelUp, esc, icon, ring, animateRings, emptyState, toast, sheet, closeTop, topSheet, dialog, confirm, celebrate, haptic, burst, barChart, lineChart, fmtNum };
})(typeof window !== 'undefined' ? window : globalThis);
