# Marca

"ASCEND" es un **nombre de trabajo**. **No se verificó** que esté disponible como marca registrada, dominio, usuario en redes ni nombre en las tiendas. Es un nombre muy usado en inglés, así que la probabilidad de conflicto es alta.

## Cómo cambiarla

Todo está centralizado en `js/config/brand.js`:

- `name`, `shortName`, `tagline`, `claim`, `version`.
- `colors` (fondo y acento): se aplican a las variables CSS al iniciar. Si cambiás el acento, revisá que el texto blanco pequeño sobre `accent600` tenga contraste ≥ 4,5:1 (por ejemplo con webaim.org/resources/contrastchecker).
- `logoPath`: el SVG del logo.
- `appId`: identificadores de las tiendas (dominio invertido, p. ej. `ar.com.tudominio.app`).

Además hay que actualizar a mano: `manifest.webmanifest` (name, short_name, colores), el `<title>` y `theme-color` de `index.html`, y los íconos de `assets/` (regenerarlos con el nuevo logo en 192, 512, 512 maskable y 180 para Apple).

## Checklist antes de publicar (no está hecho)

- [ ] Búsqueda en el **INPI** (Argentina) en la clase 9 (software) y, si aplica, 41 y 44.
- [ ] Búsqueda en **WIPO Global Brand Database** si se piensa salir del país.
- [ ] Búsqueda del nombre en **App Store** y **Google Play**.
- [ ] Disponibilidad del dominio (**NIC Argentina** para `.com.ar`, y `.com`/`.app`).
- [ ] Usuarios en Instagram, TikTok y X.
- [ ] Consultar con un agente de la propiedad industrial antes de invertir en la marca.
- [ ] Recién entonces: registrar, cambiar `appId` y publicar.
