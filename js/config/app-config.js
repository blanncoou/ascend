/* ASCEND · Configuración de servicios externos
 *
 * Solo valores PÚBLICOS: este archivo se descarga al navegador y está en un repositorio público.
 * NUNCA poner acá claves secretas (sb_secret_…, service_role, claves privadas VAPID) ni contraseñas.
 * La clave publishable de Supabase es pública por diseño: la seguridad la dan el inicio de sesión y las reglas RLS.
 * Sin url/anonKey la app funciona igual, 100 % local (la sección de cuentas muestra "No disponible").
 * Ver docs/SUPABASE.md y docs/NOTIFICACIONES.md.
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  ASC.config = {
    supabase: {
      url: 'https://vqugkhklctxgmcosopod.supabase.co', // proyecto ASCEND (São Paulo)
      anonKey: 'sb_publishable_0TbbpyLdDdzHSZ3gCw0BOQ_GN8qMnoi', // clave PÚBLICA (publishable): segura en el navegador porque los datos están protegidos por RLS
      sdkUrl: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js',
      redirectTo: 'https://blanncoou.github.io/ascend/', // adonde vuelven los enlaces de confirmación y recuperación
    },
    push: {
      vapidPublicKey: '', // clave pública VAPID (la privada vive solo en el servidor)
      subscribeEndpoint: '', // endpoint del servidor que guarda las suscripciones
    },
    // Preparado para una futura versión premium. En esta versión NADA está bloqueado.
    plans: { current: 'free', premiumFeatures: [] },
  };

  /** ¿El usuario tiene acceso a una función? En la v1 siempre sí (no hay pagos). */
  ASC.entitlements = {
    has(feature) {
      const p = ASC.config.plans;
      return p.current === 'premium' || !p.premiumFeatures.includes(feature);
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
