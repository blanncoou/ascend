# Imágenes y datos de ejercicios: licencias

## Decisión actual

La app usa **ilustraciones propias** (mapa muscular SVG dibujado para ASCEND, `ASC.ui.muscleMap`) y descripciones escritas para el proyecto. No incluye imágenes ni datos de terceros.

## Lo que se investigó: wger (wger.de)

- El **código** de wger es **AGPL-3.0**: si se integrara su código en un servicio, obliga a publicar el código fuente propio.
- Los **datos de ejercicios y las imágenes** tienen **licencias Creative Commons por cada entrada** (varían: algunas piden atribución, otras además "compartir igual"), y algunas imágenes vienen de Wikipedia/Wikimedia con sus propias condiciones.
- Conclusión: **no se puede asumir uso comercial libre**. Para usarlos haría falta guardar autor y licencia de cada imagen, mostrar la atribución en la ficha del ejercicio y excluir las licencias incompatibles con el uso comercial o con la app cerrada.

## Si en el futuro se suman imágenes externas

1. Guardar por cada imagen: `source`, `author`, `license`, `licenseUrl`, `originalUrl`.
2. Mostrar la atribución en la ficha.
3. Aceptar solo licencias revisadas (p. ej. CC0, CC BY); revisar CC BY-SA con un abogado.
4. Alternativas: encargar ilustraciones propias o comprar un paquete con licencia comercial explícita.
