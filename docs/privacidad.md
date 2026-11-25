# Política de privacidad de ASCEND

> **BORRADOR — no es un texto legal definitivo.** Fue preparado como punto de partida y **debe revisarlo un abogado** antes de publicar la app o subirla a una tienda. No garantiza el cumplimiento de la Ley 25.326 ni de otras normas. Los campos entre [corchetes] hay que completarlos.

Última actualización: [fecha]

## 1. Quién es responsable de tus datos

Responsable: [nombre o razón social], [CUIT], con domicilio en [domicilio], Argentina.
Contacto para temas de privacidad: [correo electrónico].

## 2. Qué datos usa ASCEND

Según cómo uses la app, ASCEND puede guardar:

- **Perfil:** nombre o apodo, objetivos generales y áreas que elegiste.
- **Hábitos y objetivos:** hábitos, días marcados, cantidades, recaídas registradas en hábitos para evitar, objetivos, tareas y notas del diario (incluido el estado de ánimo, si lo cargás).
- **Entrenamiento:** rutinas, ejercicios, series, pesos, repeticiones y esfuerzo percibido.
- **Datos corporales:** peso, medidas, sexo, edad, altura y nivel de experiencia, si decidís cargarlos.
- **Ajustes:** recordatorios, preferencias de sonido, animación y unidades.

ASCEND **no** pide tu ubicación, contactos, fotos (en esta versión web) ni datos de pago, y **no** muestra publicidad.

### Datos sensibles

Algunos de estos datos (peso, medidas, estado de ánimo, información sobre hábitos que querés dejar) pueden considerarse **datos de salud**, que la Ley 25.326 trata como **datos sensibles** (art. 2 y art. 7). Por eso:

- Cargarlos es **siempre opcional**: nadie puede obligarte a darlos y la app funciona sin ellos.
- Solo se usan para mostrarte tu propio progreso.
- No se comparten con terceros ni se usan para publicidad.

## 3. Dónde se guardan

**Versión actual (web, sin cuenta):** todos los datos se guardan **solo en tu dispositivo**, dentro del navegador (IndexedDB). No se envían a ningún servidor de ASCEND. Las copias automáticas también quedan en tu dispositivo.

Esto significa que:
- Si borrás los datos del navegador, desinstalás la app o perdés el dispositivo, **se pierden**, salvo que hayas exportado un archivo.
- Quien tenga acceso a tu dispositivo desbloqueado puede ver la app.

**Si creás una cuenta (opcional):** tu correo, tu contraseña (guardada cifrada por el proveedor, nunca en texto plano) y una copia de tus datos de ASCEND (hábitos, registros, objetivos, rutinas, entrenamientos, diario, ajustes y perfil) se guardan en **Supabase**, en servidores de **São Paulo, Brasil** (AWS sa-east-1), para sincronizar tus dispositivos. Esto implica una transferencia internacional de datos fuera de Argentina. Solo vos podés leer tus datos: el servidor aplica reglas de acceso por usuario (RLS). [Pendiente de revisión legal: base legal, plazos de conservación y procedimiento de eliminación.]

Las tipografías de la app se descargan de Google Fonts, por lo que tu navegador se conecta a servidores de Google (que reciben datos técnicos como la dirección IP). [Evaluar alojar las fuentes localmente para evitarlo.]

## 4. Para qué se usan

Solo para que la app funcione: mostrarte tus hábitos, rachas, progreso, estadísticas y recomendaciones de entrenamiento. No hay decisiones automatizadas con efectos legales sobre vos.

## 5. Base legal y consentimiento

Usamos tus datos con tu **consentimiento libre, expreso e informado** (Ley 25.326, art. 5 y art. 6), que das al aceptar esta política al empezar. Podés retirarlo en cualquier momento borrando tus datos desde **Perfil → Tus datos y copias → Borrar todos mis datos**.

## 6. Tus derechos

Como titular de los datos, tenés derecho a:

- **Acceso:** saber qué datos tuyos hay. Es gratuito si lo pedís con intervalos de al menos seis meses, salvo un interés legítimo que justifique hacerlo antes (art. 14, inc. 3). El responsable debe responder dentro de los **10 días corridos** desde que lo pidas (art. 14, inc. 2).
- **Rectificación, actualización y supresión:** corregir o borrar tus datos. Debe hacerse dentro de los **5 días hábiles** desde el pedido (art. 16).
- **Portabilidad práctica:** exportar todos tus datos en un archivo JSON desde **Perfil → Exportar mis datos**.

En la versión actual, como los datos están solo en tu dispositivo, podés ejercer estos derechos vos mismo desde la app (ver, editar, exportar y borrar). Para cualquier consulta: [correo electrónico].

**La Agencia de Acceso a la Información Pública (AAIP)**, en su carácter de Órgano de Control de la Ley N.º 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales. [Verificar el texto exacto que la AAIP exige incluir y sus datos de contacto vigentes.]

## 7. Seguridad

- Los datos quedan en el almacenamiento del navegador de tu dispositivo, protegido por el sistema operativo.
- Con cuenta, el acceso al servidor está limitado para que cada usuario solo pueda leer y modificar sus propios datos (reglas RLS verificadas en el proyecto).
- Ningún sistema es 100 % seguro: te recomendamos bloquear tu dispositivo con contraseña o biometría.

## 8. Cuánto tiempo se guardan

Mientras los conserves en tu dispositivo. Se eliminan al borrarlos desde la app, al borrar los datos del navegador o al desinstalar la app.

## 9. Menores de edad

ASCEND está pensada para personas mayores de [13/16/18] años. [Definir edad mínima con asesoramiento legal y según los requisitos de cada tienda.]

## 10. Cambios a esta política

Si la cambiamos, te lo vamos a avisar dentro de la app antes de que el cambio tenga efecto.

---

### Notas internas para completar antes de publicar (borrar esta sección)

- [ ] Revisión por un abogado con experiencia en protección de datos.
- [ ] Evaluar si corresponde **inscribir la base de datos** en el Registro Nacional de Bases de Datos de la AAIP (en la versión 100 % local probablemente no haya base en poder del responsable; con cuenta y servidor, sí).
- [ ] Revisar el Decreto 1558/2001 (reglamentario) y las disposiciones vigentes de la AAIP.
- [ ] Si se suma Supabase: indicar proveedor, región de los servidores y transferencia internacional (art. 12).
- [ ] **App Store:** la política debe tener una URL pública; si la app permite crear cuenta, también tiene que permitir **eliminarla desde la app**; completar las "etiquetas de privacidad".
- [ ] **Google Play:** URL pública de la política, formulario de **Seguridad de los datos** y, si hay cuentas, una forma de pedir la eliminación de la cuenta también desde la web.
- [ ] Si algún día se agregan fotos de progreso, analíticas o pagos, actualizar las secciones 2, 3 y 7.
