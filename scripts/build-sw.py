#!/usr/bin/env python3
"""Actualiza la lista de archivos que el service worker guarda para uso sin conexión.
Correr después de agregar o quitar archivos, y subir VERSION en sw.js:  python3 scripts/build-sw.py"""
import glob, os, re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
os.chdir(root)
files = ['./', 'index.html', 'manifest.webmanifest', 'css/styles.css'] + sorted(glob.glob('js/**/*.js', recursive=True)) + sorted(glob.glob('assets/*'))
sw = (root / 'sw.js').read_text(encoding='utf-8')
lst = 'const SHELL = [\n' + ''.join(f"  '{f}',\n" for f in files) + '];'
sw = re.sub(r'const SHELL = \[.*?\];', lambda m: lst, sw, flags=re.S)
(root / 'sw.js').write_text(sw, encoding='utf-8')
print(len(files), 'archivos en la lista del service worker')
