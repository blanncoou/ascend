"""Módulo de gimnasio guiado: verifica los 14 puntos pedidos.
Uso: python3 tests/e2e/gimnasio_guia.py   (con la app servida por http; ver README)"""
import asyncio, json, os
from playwright.async_api import async_playwright
U=os.environ.get('ASCEND_URL','http://localhost:8765/ascend-web/index.html')
SHOTS=os.environ.get('SHOTS','capturas'); os.makedirs(SHOTS,exist_ok=True)
results={}
def check(name, cond, extra=None):
    results[name]=bool(cond); print(('  ✓ ' if cond else '  ✗ ')+name+('' if extra is None else '  '+json.dumps(extra,ensure_ascii=False)[:300]))
SEED="""async()=>{const s=ASC.store.get();s.profile.name='Tomás';s.profile.onboarded=true;s.consent={at:new Date().toISOString()};s.ui.tutorialWeekSeen=true;s.bodyProfile.level='Principiante';
 const L=ASC.progress.xp(s).level;s.progressSeen={level:L.level,rankIndex:L.rankIndex};ASC.store.save();await ASC.store.flush()}"""
async def close_overlays(pg):
    await pg.evaluate("()=>document.querySelectorAll('.overlay').forEach(o=>o._close&&o._close())"); await pg.wait_for_timeout(150)
async def go(pg, hash, wait=350):
    await pg.evaluate("h=>{location.hash=h}", hash); await pg.wait_for_timeout(wait)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=os.environ.get('CHROME') or None,args=['--no-sandbox'])
        ctx=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,has_touch=True)
        pg=await ctx.new_page(); errs=[]
        pg.set_default_timeout(8000)
        pg.on('pageerror',lambda e: errs.append(str(e)))
        pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'Failed to load' not in m.text and 'net::' not in m.text else None)
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto(U); await pg.evaluate("async()=>{indexedDB.deleteDatabase('ascend');localStorage.clear()}"); await pg.reload(); await pg.wait_for_timeout(700)
        await pg.evaluate(SEED); await pg.reload(); await pg.wait_for_timeout(700)

        # 1) Menú inicial solo cuando corresponde
        await go(pg,'#/gym',500)
        txt=await pg.inner_text('#app')
        check('1. bienvenida al entrar por primera vez', '¿Cómo querés empezar a entrenar?'.lower() in txt.lower() and 'Explorar ejercicios'.lower() in txt.lower())
        await pg.screenshot(path=SHOTS+'/70-gym-bienvenida.png')
        await pg.click('[data-act=gw-basic]'); await pg.wait_for_timeout(400)
        # 3) Las cuatro rutinas básicas
        cards=await pg.locator('.basic-card').count()
        check('3. existen las 4 rutinas básicas', cards==4, cards)
        await pg.screenshot(path=SHOTS+'/71-rutinas-basicas.png')
        await pg.click('a[href="#/basic/basica-pecho"]'); await pg.wait_for_timeout(400)
        await pg.screenshot(path=SHOTS+'/72-basica-pecho.png',full_page=True)
        det=await pg.inner_text('#app')
        check('3b. la rutina básica muestra series, reps, descanso, duración y consejos', all(x.lower() in det.lower() for x in ['series ×','descanso','min','Antes de empezar','no es un plan universal']))
        await pg.click('[data-act=basic-day][data-val="3"]')
        await pg.click('[data-act=basic-use]'); await pg.wait_for_timeout(600)
        r=await pg.evaluate("()=>{const s=ASC.store.get();return {setup:s.settings.gym.setupDone,choice:s.settings.gym.choice,routines:s.routines.map(r=>({n:r.name,src:r.source,days:r.days,items:r.items.length}))}}")
        check('2. la elección se guarda', r['setup'] and r['choice']=='basic' and r['routines'][0]['src']=='basica-pecho' and r['routines'][0]['days']==[1,3], r)
        await pg.reload(); await pg.wait_for_timeout(800)
        await go(pg,'#/gym',400)
        check('1b. no vuelve a aparecer después de elegir (tras recargar)', '¿cómo querés empezar' not in (await pg.inner_text('#app')).lower())
        await go(pg,'#/gym-start',300)
        check('1c. se puede volver a abrir desde Gimnasio', 'explorar ejercicios' in (await pg.inner_text('#app')).lower())

        # 5, 7, 8) Selector guiado
        rid=await pg.evaluate("ASC.store.get().routines[0].id")
        await go(pg,'#/routine-edit/'+rid,400)
        await pg.click('[data-act=draft-add]'); await pg.wait_for_timeout(300)
        groups=await pg.locator('.sheet .mgroup').count()
        check('5a. "Agregar ejercicio" muestra primero los 10 grupos musculares', groups==10, groups)
        await pg.screenshot(path=SHOTS+'/73-selector-grupos.png')
        await pg.click('.sheet [data-act=pk-muscle][data-m=pecho]'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=SHOTS+'/74-selector-pecho.png',full_page=False)
        info=await pg.evaluate("""()=>{const sh=document.querySelector('.sheet');const rec=[...sh.querySelectorAll('.pick-rec b')].map(b=>b.textContent);
          const rows=[...sh.querySelectorAll('.pick-row')].map(r=>r.innerText);return {rec,note:sh.querySelector('.sheet-body p').innerText,similar:rows.filter(t=>/parecido/i.test(t)).map(t=>t.split('\\n')[0]),inR:rows.filter(t=>/en la rutina/i.test(t)).map(t=>t.split('\\n')[0])}}""")
        check('7. las recomendaciones consideran la rutina (ya tiene press en máquina, inclinado y pec deck)', info['rec'] and 'Press de pecho en máquina' not in info['rec'] and 'Ya tenés' in info['note'] and len(info['inR'])>=3, info)
        lst=await pg.evaluate("()=>[...document.querySelectorAll('.sheet [data-act=pk-add]')].map(b=>b.dataset.id)")
        mus=await pg.evaluate("ids=>ids.map(i=>ASC.gym.getExercise(ASC.store.get(),i).muscle)", lst)
        check('4. al elegir Pecho solo aparecen ejercicios de pecho', set(mus)=={'pecho'}, sorted(set(mus)))
        # Ficha rápida dentro del selector
        await pg.click('.sheet .pick-rec [data-act=pk-info]'); await pg.wait_for_timeout(250)
        q=await pg.inner_text('.sheet')
        check('8b. info contextual: músculo, para qué sirve, movimiento y alternativas', all(x in q for x in ['Músculo principal','Para qué sirve','Movimiento','Cumplen una función parecida']))
        await pg.screenshot(path=SHOTS+'/75-selector-info.png')
        await pg.click('.sheet [data-act=pk-back-muscle]'); await pg.wait_for_timeout(200)
        # 8) Duplicado: pide confirmación y cancelar no agrega
        n0=await pg.evaluate("document.querySelectorAll('.screen .card [data-act=draft-replace]').length")
        await pg.click('.sheet [data-act=pk-add][data-id="pec-deck"]'); await pg.wait_for_timeout(300)
        dlg=await pg.query_selector('.dialog [data-no]')
        check('8. agregar un ejercicio repetido pide confirmación', dlg is not None)
        if dlg: await dlg.click(); await pg.wait_for_timeout(200)
        # agregar uno recomendado
        first=await pg.evaluate("document.querySelector('.sheet .pick-rec [data-act=pk-add]').dataset.id")
        await pg.click('.sheet .pick-rec [data-act=pk-add]'); await pg.wait_for_timeout(400)
        n1=await pg.evaluate("document.querySelectorAll('.screen .card [data-act=draft-replace]').length")
        check('5. se pueden agregar ejercicios (y el repetido cancelado no se sumó)', n1==n0+1, {'antes':n0,'despues':n1,'agregado':first})
        await pg.click('[data-act=routine-save]'); await pg.wait_for_timeout(500)
        await go(pg,'#/routine-edit/'+rid,400)

        # 6) Reemplazar
        await pg.click('[data-act=draft-replace][data-i="0"]'); await pg.wait_for_timeout(300)
        rp=(await pg.inner_text('.sheet')).lower()
        check('6a. reemplazo: alternativas por similitud con explicación', 'muy similares' in rp and 'mismo patrón' in rp and 'ninguna es idéntica' in rp)
        await pg.screenshot(path=SHOTS+'/76-reemplazar.png')
        new_id=await pg.evaluate("document.querySelector('.sheet [data-act=rp-choose]').dataset.id")
        await pg.click('.sheet [data-act=rp-choose]'); await pg.wait_for_timeout(300)
        d=await pg.evaluate("()=>[...document.querySelectorAll('.screen .card b')].slice(0,1).map(b=>b.textContent)")
        # cancelar descarta
        await pg.click('[data-act=routine-cancel]'); await pg.wait_for_timeout(400)
        saved=await pg.evaluate("ASC.store.get().routines[0].items[0].exerciseId")
        check('6b. cancelar descarta el reemplazo', saved=='press-pecho-maq', saved)
        # rehacer y guardar
        await go(pg,'#/routine-edit/'+rid,400)
        await pg.click('[data-act=draft-replace][data-i="0"]'); await pg.wait_for_timeout(300)
        await pg.click('.sheet [data-act=rp-choose][data-id="%s"]' % new_id); await pg.wait_for_timeout(300)
        await pg.click('[data-act=routine-save]'); await pg.wait_for_timeout(500)
        it0=await pg.evaluate("ASC.store.get().routines[0].items[0]")
        check('6c. reemplazo guardado conservando series/reps/descanso', it0['exerciseId']==new_id and it0['sets']==3 and it0['reps']=='10-12' and it0['replaced'][0]['from']=='press-pecho-maq', it0)

        # 9) Persistencia
        await pg.wait_for_timeout(300); await pg.reload(); await pg.wait_for_timeout(900)
        r2=await pg.evaluate("()=>{const r=ASC.store.get().routines[0];return {first:r.items[0].exerciseId,n:r.items.length,mode:ASC.store.mode()}}")
        check('9. las modificaciones persisten tras recargar (IndexedDB)', r2['first']==new_id and r2['n']==4 and r2['mode']=='indexeddb', r2)

        # 10) Historial intacto + cambiar por hoy en el entrenamiento
        await go(pg,'#/routine/'+rid,300)
        await pg.click('.hero [data-act=workout-start]'); await pg.wait_for_timeout(500)
        await pg.click('[data-act=wo-swap]'); await pg.wait_for_timeout(300)
        sw_id=await pg.evaluate("document.querySelector('.sheet [data-act=rp-choose]').dataset.id")
        await pg.click('.sheet [data-act=rp-choose]'); await pg.wait_for_timeout(300)
        await pg.fill('[data-k="0"][data-f=weight]','40'); await pg.fill('[data-k="0"][data-f=reps]','10')
        await pg.click('[data-act=wo-set-done][data-k="0"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-act=wo-rest-skip]') if await pg.query_selector('[data-act=wo-rest-skip]') else None
        await pg.evaluate("()=>{ASC.actions['wo-finish']()}"); await pg.wait_for_timeout(500)
        dlg=await pg.query_selector('.dialog [data-yes]')
        if dlg: await dlg.click(); await pg.wait_for_timeout(900)
        await close_overlays(pg)
        h=await pg.evaluate("()=>{const s=ASC.store.get();const se=s.sessions.find(x=>x.status==='completed');return {sessEx:se.exercises[0].exerciseId,from:(se.exercises[0].swappedFrom||{}).exerciseId,routineFirst:s.routines[0].items[0].exerciseId}}")
        check('14a. "Cambiar por hoy" cambia solo el entrenamiento, no la rutina', h['sessEx']==sw_id and h['routineFirst']==new_id and h['from']==new_id, h)
        # ahora reemplazar en la rutina y verificar que la sesión no cambia
        await go(pg,'#/routine-edit/'+rid,400)
        await pg.click('[data-act=draft-replace][data-i="0"]'); await pg.wait_for_timeout(300)
        await pg.click('.sheet [data-act=rp-choose]:not([data-id="%s"])' % new_id); await pg.wait_for_timeout(300)
        await pg.click('[data-act=routine-save]'); await pg.wait_for_timeout(500)
        h2=await pg.evaluate("()=>{const s=ASC.store.get();const se=s.sessions.find(x=>x.status==='completed');return {sessEx:se.exercises[0].exerciseId,sets:se.exercises[0].sets.filter(x=>x.done).map(x=>[x.weight,x.reps]),rec:ASC.gym.records(s,se.exercises[0].exerciseId).sessions}}")
        check('10. el historial anterior queda intacto al cambiar la rutina', h2['sessEx']==sw_id and h2['sets']==[[40,10]] and h2['rec']==1, h2)

        # 11) Fichas
        await go(pg,'#/exercise/press-pecho-maq',400)
        f=await pg.inner_text('#app')
        need=['Para qué sirve','Cómo hacerlo','Errores frecuentes','Consejos de ejecución','Para empezar','Ejercicios alternativos','Agregar a mi rutina','Principiante','Ilustración esquemática']
        check('11. ficha completa (específica)', all(x.lower() in f.lower() for x in need), [x for x in need if x.lower() not in f.lower()])
        await pg.screenshot(path=SHOTS+'/77-ficha.png',full_page=True)
        await go(pg,'#/exercise/remo-seal',400)
        check('11b. ficha sin guía específica: lo aclara y muestra la guía del patrón', 'guía general del movimiento' in (await pg.inner_text('#app')).lower())
        # Ayudas
        await pg.click('[data-act=help][data-term=rir]'); await pg.wait_for_timeout(250)
        check('14b. las ayudas contextuales abren una explicación', 'repeticiones en reserva' in (await pg.inner_text('.sheet')).lower())
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)

        # 14c) Preferencias: evitar ejercicios por encima de la cabeza
        await go(pg,'#/gym',300)
        await pg.click('.tool-row [data-act=gym-prefs]'); await pg.wait_for_timeout(300)
        await pg.click('.sheet [data-group=gp-avoid] [data-val=overhead]')
        await pg.click('.sheet [data-act=gp-save]'); await pg.wait_for_timeout(400)
        av=await pg.evaluate("ASC.store.get().settings.gym.avoid")
        rec=await pg.evaluate("ASC.routineGuide.suggestFor(ASC.store.get(),[], 'hombros').recommended.map(x=>x.ex.id)")
        check('14c. las preferencias se guardan y filtran recomendaciones', av==['overhead'] and 'press-hombro-manc' not in rec and 'press-militar' not in rec, rec)
        await go(pg,'#/exercise/press-militar',300)
        check('14d. la ficha avisa si un ejercicio contradice tus preferencias', 'no se va a recomendar' in (await pg.inner_text('#app')).lower())
        # Usar las 4: no duplica la de pecho
        await go(pg,'#/basic',300)
        await pg.click('[data-act=basic-all]'); await pg.wait_for_timeout(500)
        srcs=await pg.evaluate("ASC.store.get().routines.map(r=>r.source)")
        check('8c. "Usar las 4" no duplica la rutina que ya tenías', sorted([x for x in srcs if x])==['basica-brazos','basica-espalda','basica-pecho','basica-piernas'], srcs)
        await go(pg,'#/gym',400)
        await pg.screenshot(path=SHOTS+'/78-gym-rutinas.png',full_page=True)
        # Secuencia propia
        await pg.evaluate("()=>{const s=ASC.store.get();s.settings.gym.scheduleMode='sequence';ASC.app.commit()}"); await pg.wait_for_timeout(300)
        check('14e. organización sin semana fija (Día 1, Día 2…)', 'día 1' in (await pg.inner_text('#app')).lower())

        # 12) Celular chico: sin desbordes en las pantallas nuevas
        over=[]
        for w in (320,360):
            await pg.set_viewport_size({'width':w,'height':700})
            for r in ['#/gym-start','#/basic','#/basic/basica-piernas','#/routine-edit/'+rid,'#/exercise/press-banca','#/gym']:
                await go(pg,r,300)
                ow=await pg.evaluate("()=>({sw:document.documentElement.scrollWidth,W:document.documentElement.clientWidth})")
                if ow['sw']>ow['W']: over.append((w,r,ow))
            await go(pg,'#/routine-edit/'+rid,300)
            await pg.click('[data-act=draft-add]'); await pg.wait_for_timeout(250)
            await pg.click('.sheet [data-act=pk-muscle][data-m=espalda]'); await pg.wait_for_timeout(250)
            sw=await pg.evaluate("()=>{const s=document.querySelector('.sheet');return s.scrollWidth<=s.clientWidth+1}")
            if not sw: over.append((w,'picker'))
            if w==320: await pg.screenshot(path=SHOTS+'/79-selector-320.png')
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
            await pg.click('[data-act=routine-cancel]'); await pg.wait_for_timeout(200)
        check('12. funciona en celulares (320 y 360 px) sin desbordes', not over, over)
        # Foco accesible en el selector
        await pg.set_viewport_size({'width':390,'height':844})
        await go(pg,'#/routine-edit/'+rid,300)
        await pg.click('[data-act=draft-add]'); await pg.wait_for_timeout(250)
        await pg.keyboard.press('Tab')
        inside=await pg.evaluate("!!document.activeElement.closest('.sheet')")
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
        check('14f. el selector mantiene el foco dentro (teclado)', inside)
        check('13. sin errores de JavaScript', not errs, errs[:5])
        await b.close()
    bad=[k for k,v in results.items() if not v]
    print('\n%d/%d verificaciones OK' % (len(results)-len(bad), len(results)))
    raise SystemExit(1 if bad else 0)
asyncio.run(main())
