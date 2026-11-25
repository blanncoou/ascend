/* ASCEND · Marca (configurable)
 *
 * Todo lo que identifica a la app está acá, para poder cambiar nombre, colores o identificadores
 * sin tocar el resto del código. "ASCEND" es un nombre de trabajo: NO se verificó que esté disponible
 * como marca, dominio ni en las tiendas (ver docs/MARCA.md).
 * Si cambiás el nombre, actualizá también: manifest.webmanifest, <title> de index.html y los íconos de assets/.
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  ASC.brand = {
    name: 'ASCEND',
    shortName: 'ASCEND',
    tagline: 'Disciplina que se nota.',
    claim: ['Subí', 'un nivel', '<em>cada día.</em>'],
    version: '3.1.0',
    // Identificadores para las tiendas (a definir cuando haya dominio propio; formato dominio invertido)
    appId: { ios: 'com.ejemplo.ascend', android: 'com.ejemplo.ascend' },
    // Colores de marca: se aplican sobre las variables CSS al iniciar. Al cambiarlos, revisar el contraste (docs/MARCA.md)
    colors: {
      bg: '#101114',
      accent: '#D52B42', // principal: botones y rellenos
      accentHi: '#F04459', // intenso: 100 %, brillos, logros
      accentText: '#FF5A6C', // texto rojo chico sobre superficies
      accent600: '#C42438', // texto blanco chico sobre rojo (contraste ≥ 4.5:1)
      accent800: '#7A1626',
    },
    // Marca del logo (SVG 24x24): una flecha ascendente
    logoPath: '<path d="M4 18 12 6l8 12M8 18l4-6 4 6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  };

  /** Aplica los colores de marca a las variables CSS */
  ASC.brand.apply = function () {
    if (typeof document === 'undefined') return;
    const c = ASC.brand.colors, s = document.documentElement.style;
    const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(', '); };
    s.setProperty('--bg', c.bg);
    s.setProperty('--red', c.accent);
    s.setProperty('--red-rgb', rgb(c.accent));
    s.setProperty('--red-600', c.accent600);
    s.setProperty('--red-800', c.accent800);
    s.setProperty('--red-hi', c.accentHi || c.accent);
    s.setProperty('--red-text', c.accentText || c.accentHi || c.accent);
    s.setProperty('--red-soft', 'rgba(' + rgb(c.accent) + ', 0.14)');
    s.setProperty('--red-glow', 'rgba(' + rgb(c.accentHi || c.accent) + ', 0.35)');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', c.bg);
    if (ASC.brand.name !== 'ASCEND') document.title = ASC.brand.name;
  };
})(typeof window !== 'undefined' ? window : globalThis);

/** RGB del acento intenso (para gráficos SVG generados en JS) */
(function (root) { const b = root.ASC.brand; const n = parseInt((b.colors.accentHi || b.colors.accent).slice(1), 16); b.rgbHi = [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(','); })(typeof window !== 'undefined' ? window : globalThis);
