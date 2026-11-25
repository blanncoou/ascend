#!/usr/bin/env python3
"""Copia docs/privacidad.md y docs/terminos.md dentro de js/data/legal.js para mostrarlos en la app
(funciona incluso abriendo index.html con doble clic, donde no se pueden leer archivos con fetch).
Correr después de editar los textos:  python3 scripts/build-legal.py"""
import json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
docs = {k: (root / 'docs' / f'{k}.md').read_text(encoding='utf-8') for k in ('privacidad', 'terminos')}
# la sección de notas internas no se muestra en la app
docs['privacidad'] = docs['privacidad'].split('### Notas internas')[0].rstrip().rstrip('-').rstrip()
out = '/* Generado por scripts/build-legal.py a partir de docs/*.md — no editar a mano */\n'
out += '(function (root) {\n  const ASC = (root.ASC = root.ASC || {});\n  ASC.legalDocs = ' + json.dumps(docs, ensure_ascii=False) + ';\n})(typeof window !== "undefined" ? window : globalThis);\n'
(root / 'js' / 'data' / 'legal.js').write_text(out, encoding='utf-8')
print('js/data/legal.js actualizado')
