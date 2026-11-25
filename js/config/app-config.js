/* ASCEND · Configuración de servicios externos
 *
 * Todo vacío a propósito: la app funciona 100 % local sin credenciales.
 * NO poner acá claves secretas (service_role, claves privadas VAPID): este archivo se descarga al navegador.
 * La "anon key" de Supabase sí es pública por diseño (la seguridad la dan las reglas RLS del servidor).
 * Ver docs/SUPABASE.md y docs/NOTIFICACIONES.md.
 */
(function (root) {
  const ASC = (root.ASC = root.ASC || {});
  ASC.config = {
    supabase: {
      url: '', // ej. https://xxxx.supabase.co
      anonKey: '', // clave pública "anon" del proyecto
      sdkUrl: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js',
      redirectTo: '', // URL de la app para el enlace de recuperación de contraseña
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
