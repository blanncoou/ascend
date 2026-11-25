/* ASCEND · Privacidad y términos (borradores) */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  const { esc, icon } = ASC.ui;

  function inline(t) {
    return esc(t)
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/\[([^\]]+)\]\((privacidad|terminos)\.md\)/g, '<a href="#/legal/$2" class="red">$1</a>');
  }

  /** Markdown mínimo: títulos, listas, citas, separadores y párrafos */
  function md(src) {
    const out = [];
    let list = null;
    const close = () => { if (list) { out.push('</ul>'); list = null; } };
    src.split('\n').forEach((raw) => {
      const l = raw.trim();
      if (!l) return close();
      let m;
      if ((m = l.match(/^(#{1,3}) (.+)/))) { close(); const n = Math.min(m[1].length + 1, 4); out.push('<h' + n + ' class="legal-h' + n + '">' + inline(m[2]) + '</h' + n + '>'); }
      else if ((m = l.match(/^[-*] (\[[ x]\] )?(.+)/))) { if (!list) { out.push('<ul class="legal-list">'); list = true; } out.push('<li>' + inline(m[2]) + '</li>'); }
      else if (l.startsWith('> ')) { close(); out.push('<div class="legal-note" role="note">' + inline(l.slice(2)) + '</div>'); }
      else if (l === '---') { close(); out.push('<hr class="legal-hr">'); }
      else { close(); out.push('<p>' + inline(l) + '</p>'); }
    });
    close();
    return out.join('');
  }

  function render(params) {
    const key = params[0] === 'terminos' ? 'terminos' : 'privacidad';
    const docs = ASC.legalDocs || {};
    let s = '<div class="screen legal"><div class="head"><a class="icon-btn" href="#/profile" aria-label="Volver al perfil">' + icon('chevL', 'sm') + '</a>' +
      '<nav class="seg" aria-label="Documentos legales" style="flex:1;margin:0"><a class="' + (key === 'privacidad' ? 'on' : '') + '"' + (key === 'privacidad' ? ' aria-current="page"' : '') + ' href="#/legal/privacidad">Privacidad</a><a class="' + (key === 'terminos' ? 'on' : '') + '"' + (key === 'terminos' ? ' aria-current="page"' : '') + ' href="#/legal/terminos">Términos</a></nav></div>';
    s += '<article class="card legal-body">' + (docs[key] ? md(docs[key]) : '<p class="muted">No se encontró el texto.</p>') + '</article>';
    return s + '</div>';
  }

  /** Abre el documento en una hoja (sirve también durante la bienvenida) */
  function open(key) {
    const docs = ASC.legalDocs || {};
    ASC.ui.sheet({ title: key === 'terminos' ? 'Términos y condiciones' : 'Política de privacidad', body: '<div class="legal-body">' + md((docs[key] || '').replace(/^# .+\n/, '')) + '</div><button class="btn block mt" data-close>Cerrar</button>' });
  }

  ASC.actions['legal-open'] = (el) => open(el.dataset.doc);
  ASC.screens.legal = { render, tab: 'profile' };
  ASC.legal = { md, open };
})(typeof window !== 'undefined' ? window : globalThis);
