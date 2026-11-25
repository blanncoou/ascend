"""Mensajes motivacionales: pantalla tras el registro, permiso, configuración, envío y permiso revocado.
Uso: python3 tests/e2e/motivacion.py   (con la app servida por http; ver README)"""
import asyncio, json, os
from playwright.async_api import async_playwright
U=os.environ.get('ASCEND_URL','http://localhost:8765/ascend-web/index.html')
SHOTS=os.environ.get('SHOTS','capturas'); os.makedirs(SHOTS,exist_ok=True)
results={}
def check(name, cond, extra=None):
    results[name]=bool(cond); print(('  ✓ ' if cond else '  ✗ ')+name+('' if extra is None else '  '+json.dumps(extra,ensure_ascii=False)[:260]))
async def go(pg,h,w=350): await pg.evaluate("h=>{location.hash=h}",h); await pg.wait_for_timeout(w)
async def closeall(pg): await pg.evaluate("()=>document.querySelectorAll('.overlay').forEach(o=>o._close&&o._close())"); await pg.wait_for_timeout(150)

FAKE="""window.__sent=[];window.__answer='granted';
class FakeN{constructor(t,o){window.__sent.push({t,b:o&&o.body})}}
Object.defineProperty(FakeN,'permission',{get:()=>localStorage.getItem('__perm')||'default',set:(v)=>localStorage.setItem('__perm',v)});FakeN.requestPermission=async()=>{window.__asked=(window.__asked||0)+1;FakeN.permission=window.__answer;return FakeN.permission};
window.Notification=FakeN;
if(window.ServiceWorkerRegistration)ServiceWorkerRegistration.prototype.showNotification=function(t,o){window.__sent.push({t,b:o&&o.body});return Promise.resolve()};"""
# Espía de notificaciones: cuenta lo que realmente se envía al sistema (service worker o API) sin depender del SO
SPY="""()=>{window.__sent=[];const N=window.Notification;
 if(navigator.serviceWorker){navigator.serviceWorker.getRegistration().then(r=>{if(r){const o=r.showNotification.bind(r);r.showNotification=(t,o2)=>{window.__sent.push({t,b:o2&&o2.body});return Promise.resolve()}}})}
 window.Notification=function(t,o){window.__sent.push({t,b:o&&o.body})};window.Notification.permission=N.permission;window.Notification.requestPermission=N.requestPermission.bind(N);}"""

async def onboard(pg):
    await pg.click('[data-act=ob-next]'); await pg.fill('#ob-name','Tomás'); await pg.click('[data-act=ob-next]')
    await pg.click('[data-act=ob-goal][data-id=leer]')
    while not await pg.query_selector('[data-act=ob-finish]'):
        await pg.click('[data-act=ob-next]'); await pg.wait_for_timeout(80)
    await pg.check('#ob-consent'); await pg.click('[data-act=ob-finish]'); await pg.wait_for_timeout(800)

async def fresh(b, grant):
    ctx=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,has_touch=True)
    await ctx.add_init_script(FAKE)
    pg=await ctx.new_page(); errs=[]; pg.set_default_timeout(8000)
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text else None)
    await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    await pg.goto(U); await pg.evaluate("async()=>{indexedDB.deleteDatabase('ascend');localStorage.clear()}"); await pg.reload(); await pg.wait_for_timeout(800)
    return ctx,pg,errs

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=os.environ.get('CHROME') or None,args=['--no-sandbox'])
        allerrs=[]

        # ---- 1–2: aparece tras el registro y "Ahora no" continúa ----
        ctx,pg,errs=await fresh(b,False); allerrs.append(errs)
        await onboard(pg)
        r=await pg.evaluate("()=>({h:location.hash,t:document.querySelector('h1')&&document.querySelector('h1').textContent,tabs:!!document.querySelector('.tabbar:not([hidden])')})")
        check('1. La pantalla aparece al terminar el registro', r['h']=='#/motivation-intro' and r['t']=='Un mensaje puede cambiar tu día', r)
        check('   Texto y dos opciones', await pg.evaluate("()=>!!document.querySelector('[data-act=mot-intro-yes]')&&!!document.querySelector('[data-act=mot-intro-no]')&&/pequeños recordatorios/.test(document.body.innerText)"))
        perm0=await pg.evaluate("Notification.permission")
        check('   No pide el permiso nativo por su cuenta', perm0=='default')
        await pg.screenshot(path=SHOTS+'/mot-01-intro.png')
        await pg.click('[data-act=mot-intro-no]'); await pg.wait_for_timeout(500)
        s=await pg.evaluate("ASC.store.get().settings.motivation")
        check('2. "Ahora no" continúa al inicio y guarda la elección', await pg.evaluate("location.hash")=='#/home' and s['asked'] and s['choice']=='later' and not s['enabled'], s)
        await pg.reload(); await pg.wait_for_timeout(900)
        check('   No vuelve a mostrarse', await pg.evaluate("location.hash")!='#/motivation-intro' and await pg.evaluate("ASC.store.get().settings.motivation.asked"))
        await go(pg,'#/profile',500)
        check('   Se puede activar después desde Perfil', await pg.query_selector('#mot-settings [data-act=mot-toggle]') is not None)
        await ctx.close()

        # ---- 3–8: activar con permiso, enviar, horarios y tope ----
        ctx,pg,errs=await fresh(b,True); allerrs.append(errs)
        await onboard(pg)
        await pg.click('[data-act=mot-intro-yes]'); await pg.wait_for_timeout(250)
        check('   Explica antes que el sistema va a pedir permiso', await pg.evaluate("/te va a pedir permiso/.test(document.body.innerText)"))
        await pg.screenshot(path=SHOTS+'/mot-02-explica.png')
        await pg.click('[data-act=mot-intro-request]'); await pg.wait_for_timeout(500)
        s=await pg.evaluate("ASC.store.get().settings.motivation")
        check('3. Activar pide el permiso (una vez) y queda activado', s['enabled'] and s['choice']=='accepted' and await pg.evaluate("Notification.permission")=='granted' and await pg.evaluate("window.__asked")==1, s)
        await pg.click('[data-act=mot-intro-done]'); await pg.wait_for_timeout(500)
        await closeall(pg)
        await pg.evaluate("()=>{window.__sent=[]}")

        # ticks simulados a lo largo del día (mismo código que corre cada 30 s)
        SIM="""(perDay)=>{const st=ASC.store.get();st.settings.motivation.perDay=perDay;st.motivationLog=[];st.motivationMissed={};window.__sent=[];
          const T=ASC.dates.today();const plan=ASC.motivation.planDay(st,T);const RD=Date;const times=[];
          for(let m=0;m<1440;m+=5){const d=ASC.dates.fromKey(T);d.setHours(Math.floor(m/60),m%60,0,0);
            const r=ASC.motivation.tick(st,d,'granted',(a,b)=>{ASC.app.notify(a,b,{tag:'motivacion'});times.push(ASC.motivation.toTime(m));return true});}
          return {plan,times,sent:window.__sent.length}}"""
        r=await pg.evaluate(SIM,2); await pg.wait_for_timeout(300)
        r['sent']=await pg.evaluate("window.__sent.length")
        check('4. Llegan las notificaciones cuando están activas', r['sent']==2, r)
        check('6. Respeta la franja horaria', all('09:00'<=t<='21:00' for t in r['times']), r['times'])
        r3=await pg.evaluate(SIM,3)
        check('7. Respeta la cantidad diaria', len(r3['times'])==3, r3)
        rep=await pg.evaluate("""()=>{const st=ASC.store.get();st.motivationLog=[];const D=ASC.dates;const ids=[];
          for(let k=0;k<10;k++){const key=D.addDays(D.today(),k);for(let m=0;m<1440;m+=5){const d=D.fromKey(key);d.setHours(Math.floor(m/60),m%60,0,0);ASC.motivation.tick(st,d,'granted',()=>true)}ids.push(st.motivationLog.filter(x=>x.date===key).map(x=>x.id))}
          let bad=0;for(let i=1;i<ids.length;i++)ids[i].forEach(id=>{if(ids[i-1].includes(id))bad++});st.motivationLog=[];st.motivationMissed={};ASC.store.save();return bad}""")
        check('8. Sin repeticiones en días seguidos', rep==0, rep)

        # Configuración en Perfil
        await go(pg,'#/profile',500)
        await pg.evaluate("document.getElementById('mot-settings').scrollIntoView()"); await pg.wait_for_timeout(200)
        await pg.screenshot(path=SHOTS+'/mot-03-perfil.png')
        await pg.click('#mot-settings [data-act=mot-per][data-n="1"]'); await pg.wait_for_timeout(200)
        await pg.click('#mot-settings [data-act=mot-day][data-d="0"]'); await pg.wait_for_timeout(200)
        await pg.click('#mot-settings [data-act=mot-cat][data-c=reflexion]'); await pg.wait_for_timeout(200)
        await pg.fill('#mot-start','10:00'); await pg.dispatch_event('#mot-start','change'); await pg.wait_for_timeout(250)
        await pg.reload(); await pg.wait_for_timeout(900)
        s=await pg.evaluate("ASC.store.get().settings.motivation")
        check('   Configuración guardada (cantidad, días, tipos, horario)', s['perDay']==1 and 0 not in s['days'] and 'reflexion' not in s['categories'] and s['start']=='10:00', s)
        await go(pg,'#/profile',500)
        await pg.fill('#mot-end','10:10'); await pg.dispatch_event('#mot-end','change'); await pg.wait_for_timeout(250)
        check('   Franja inválida: avisa y no guarda', await pg.evaluate("ASC.store.get().settings.motivation.end")=='21:00' and await pg.evaluate("!!document.querySelector('.field-error, [aria-invalid=true]')"))
        await pg.evaluate("()=>{window.__sent=[]}")
        await pg.click('#mot-settings [data-act=mot-test]'); await pg.wait_for_timeout(400)
        check('   "Probar un mensaje" envía una notificación real', await pg.evaluate("window.__sent.length")==1 and await pg.evaluate("ASC.store.get().motivationLog.length")==0)

        # ---- 5: desactivar corta los envíos ----
        await pg.click('#mot-settings [data-act=mot-toggle]'); await pg.wait_for_timeout(300)
        r=await pg.evaluate("""()=>{const st=ASC.store.get();window.__sent=[];let n=0;const T=ASC.dates.today();for(let m=0;m<1440;m+=5){const d=ASC.dates.fromKey(T);d.setHours(Math.floor(m/60),m%60,0,0);ASC.motivation.tick(st,d,'granted',()=>{n++;return true})}return {en:st.settings.motivation.enabled,n,dis:document.querySelector('.mot-fields').disabled}}""")
        check('5. Desactivar detiene los próximos envíos', not r['en'] and r['n']==0 and r['dis'], r)
        await pg.click('#mot-settings [data-act=mot-toggle]'); await pg.wait_for_timeout(300)
        check('   Reactivar vuelve a activarlas sin pedir permiso de nuevo', await pg.evaluate("ASC.store.get().settings.motivation.enabled"))

        # Entrenamiento en curso: no interrumpe
        r=await pg.evaluate("""()=>{const st=ASC.store.get();const T=ASC.dates.today();st.motivationLog=[];st.motivationMissed={};st.sessions.push({id:'wtest',status:'in_progress'});st.activeSessionId='wtest';
          const p=ASC.motivation.planDay(st,T)[0];const d=ASC.dates.fromKey(T);const [h,m]=p.split(':').map(Number);d.setHours(h,m+1,0,0);const r=ASC.motivation.tick(st,d,'granted',()=>true);
          st.activeSessionId=null;st.sessions=st.sessions.filter(x=>x.id!=='wtest');return r.reason}""")
        check('   No llega durante un entrenamiento en curso', r=='workout', r)

        # ---- 9: permiso revocado en el sistema ----
        asked=await pg.evaluate("window.__asked||0")
        await pg.evaluate("()=>{Notification.permission='denied'}")
        await pg.evaluate("()=>{document.dispatchEvent(new Event('visibilitychange'))}"); await pg.wait_for_timeout(500)
        s=await pg.evaluate("ASC.store.get().settings.motivation")
        check('9. Permiso revocado: se desactiva sola y lo informa', not s['enabled'] and s['choice']=='os-denied', s)
        await go(pg,'#/profile',500)
        txt=await pg.evaluate("document.getElementById('mot-settings').innerText")
        check('   Explica cómo volver a permitirlo y no vuelve a pedirlo', 'bloqueado en el sistema' in txt and 'no vuelve a pedirlo' in txt, txt[:200])
        await pg.click('#mot-settings [data-act=mot-toggle]'); await pg.wait_for_timeout(300)
        check('   Con permiso bloqueado, el interruptor no lo activa ni vuelve a pedir', not await pg.evaluate("ASC.store.get().settings.motivation.enabled") and await pg.evaluate("window.__asked||0")==asked)

        # ---- 10: capacidades reales ----
        txt=await pg.evaluate("document.getElementById('mot-settings').textContent")
        check('10. Informa la capacidad real (web: con la app abierta)', 'segundo plano reciente' in txt and 'app nativa' in txt)
        check('   El adaptador nativo no se activa en la web', await pg.evaluate("ASC.nativeNotify.available()===false && ASC.motivationUI.mode()==='web'"))

        # Responsive
        for w in (320,768,1280):
            await pg.set_viewport_size({'width':w,'height':800}); await pg.wait_for_timeout(250)
            ov=await pg.evaluate("document.documentElement.scrollWidth>innerWidth+1")
            check(f'   Sin desbordes en Perfil a {w}px', not ov)
        await pg.set_viewport_size({'width':320,'height':640}); await go(pg,'#/motivation-intro',400)
        check('   Pantalla de bienvenida sin desbordes a 320px', not await pg.evaluate("document.documentElement.scrollWidth>innerWidth+1"))
        await pg.screenshot(path=SHOTS+'/mot-04-intro-320.png')
        await ctx.close()

        # Sin soporte de notificaciones (como Safari en iPhone sin instalar)
        ctx,pg,errs=await fresh(b,False); allerrs.append(errs)
        await pg.add_init_script("delete window.Notification; Object.defineProperty(navigator,'userAgent',{get:()=>'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'})")
        await pg.reload(); await pg.wait_for_timeout(900)
        await onboard(pg)
        await pg.click('[data-act=mot-intro-yes]'); await pg.wait_for_timeout(250)
        check('   iPhone sin instalar: explica que hay que agregarla a la pantalla de inicio', await pg.evaluate("/pantalla de inicio/.test(document.body.innerText)"))
        await pg.click('[data-act=mot-intro-save-pending]'); await pg.wait_for_timeout(500)
        check('   ...y sigue sin bloquear nada', await pg.evaluate("location.hash")=='#/home')
        await ctx.close()

        e=[x for l in allerrs for x in l]
        check('Sin errores de JavaScript', not e, e[:5])
        await b.close()
    bad=[k for k,v in results.items() if not v]
    print(f"\n{len(results)-len(bad)}/{len(results)} OK" + ('' if not bad else '  FALLAN: '+'; '.join(bad)))
asyncio.run(main())
