"""Fase 4: consentimiento, textos legales, perfil (instalación/cuenta), service worker y uso sin conexión.
Uso: python3 tests/e2e/fase4.py   (con la app servida por http; ver README)"""
import asyncio, json, os
from playwright.async_api import async_playwright
U=os.environ.get('ASCEND_URL','http://localhost:8765/ascend-web/index.html')
SHOTS=os.environ.get('SHOTS','capturas'); os.makedirs(SHOTS,exist_ok=True)
results={}
def check(name, cond, extra=None):
    results[name]=bool(cond); print(('  ✓ ' if cond else '  ✗ ')+name+('' if extra is None else '  '+json.dumps(extra,ensure_ascii=False)))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=os.environ.get('CHROME') or None,args=['--no-sandbox'])
        ctx=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2)
        pg=await ctx.new_page(); errs=[]
        pg.on('pageerror',lambda e: errs.append(str(e)))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto(U); await pg.evaluate("async()=>{indexedDB.deleteDatabase('ascend');localStorage.clear();const r=await navigator.serviceWorker.getRegistrations();for(const x of r)await x.unregister()}"); await pg.reload(); await pg.wait_for_timeout(600)
        # Consentimiento
        await pg.click('[data-act=ob-next]'); await pg.fill('#ob-name','Tomás'); await pg.click('[data-act=ob-next]')
        await pg.click('[data-act=ob-goal][data-id=leer]')
        while not await pg.query_selector('[data-act=ob-finish]'):
            await pg.click('[data-act=ob-next]'); await pg.wait_for_timeout(80)
        check('sin aceptar, el botón de entrar está deshabilitado', await pg.is_disabled('[data-act=ob-finish]'))
        await pg.click('[data-act=legal-open][data-doc=privacidad]'); await pg.wait_for_timeout(400)
        txt=await pg.inner_text('.sheet')
        check('la política se abre durante la bienvenida', 'BORRADOR' in txt and '25.326' in txt and 'Notas internas' not in txt)
        await pg.screenshot(path=SHOTS+'/60-privacidad.png')
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        await pg.check('#ob-consent')
        check('al aceptar, se habilita', not await pg.is_disabled('[data-act=ob-finish]'))
        await pg.screenshot(path=SHOTS+'/61-consentimiento.png')
        await pg.click('[data-act=ob-finish]'); await pg.wait_for_timeout(900)
        c=await pg.evaluate("ASC.store.get().consent")
        check('el consentimiento queda registrado con fecha y versión', c and c.get('at') and c.get('privacy'))
        # Perfil
        await pg.goto(U+'#/profile'); await pg.wait_for_timeout(700)
        prof=await pg.inner_text('#app')
        check('perfil: secciones de instalación, cuenta y legal', all(x.lower() in prof.lower() for x in ['Instalar la app','Cuenta y sincronización','Política de privacidad']))
        check('sin Supabase configurado no hay botones de cuenta', await pg.query_selector('[data-act=sync-signin],[data-act=sync-now]') is None and 'No disponible todavía' in prof)
        st=await pg.evaluate("ASC.sync.status()")
        check('estado de sincronización: no configurado', st['state']=='not-configured')
        check('push: no configurado y sin claves inventadas', await pg.evaluate("!ASC.push.capabilities().pushConfigured && ASC.config.push.vapidPublicKey===''"))
        await pg.screenshot(path=SHOTS+'/62-perfil-fase4.png',full_page=True)
        # Pantalla legal
        await pg.goto(U+'#/legal/terminos'); await pg.wait_for_timeout(300)
        check('pantalla de términos', 'No es asesoramiento médico' in await pg.inner_text('#app'))
        # Manifest y service worker
        man=await pg.evaluate("fetch('manifest.webmanifest').then(r=>r.json())")
        check('manifest con íconos PNG 192/512 y maskable', {'192x192','512x512'}<=set(i['sizes'] for i in man['icons']) and any(i.get('purpose')=='maskable' for i in man['icons']))
        await pg.evaluate("navigator.serviceWorker.ready"); await pg.wait_for_timeout(1500)
        cached=await pg.evaluate("caches.keys().then(async k=>{const c=await caches.open(k.find(x=>x.startsWith('ascend-v')));return (await c.keys()).length})")
        check('service worker activo y app guardada en caché', cached>=30, cached)
        # Sin conexión
        await ctx.set_offline(True)
        await pg.reload(); await pg.wait_for_timeout(1200)
        name=await pg.evaluate("ASC.store.get().profile.name")
        check('sin conexión: la app abre con los datos', name=='Tomás')
        await pg.goto(U+'#/habits?tab=today'); await pg.wait_for_timeout(500)
        check('sin conexión: se puede navegar', 'Hoy' in await pg.inner_text('#app'))
        await ctx.set_offline(False)
        # Marca configurable
        col=await pg.evaluate("()=>{ASC.brand.colors.accent='#00aaff';ASC.brand.apply();return getComputedStyle(document.documentElement).getPropertyValue('--red').trim()}")
        check('los colores de marca se aplican desde la configuración', col=='#00aaff')
        check('sin errores de JavaScript', not errs, errs)
        await b.close()
    bad=[k for k,v in results.items() if not v]
    print('\n%d/%d verificaciones OK' % (len(results)-len(bad), len(results)))
    raise SystemExit(1 if bad else 0)
asyncio.run(main())
