"""Reforma v3: recorrido completo de las funciones nuevas + persistencia + accesibilidad básica.
Uso: python3 tests/e2e/v3.py   (con la app servida por http; ver README)"""
import asyncio, json, os
from playwright.async_api import async_playwright
U=os.environ.get('ASCEND_URL','http://localhost:8765/ascend-web/index.html')
SHOTS=os.environ.get('SHOTS','capturas'); os.makedirs(SHOTS,exist_ok=True)
results={}
def check(name, cond, extra=None):
    results[name]=bool(cond); print(('  ✓ ' if cond else '  ✗ ')+name+('' if extra is None else '  '+json.dumps(extra,ensure_ascii=False)[:260]))
SEED="""async()=>{const s=ASC.store.get();const D=ASC.dates,T=D.today(),K=n=>D.addDays(T,-n);
 s.profile.name='Tomás';s.profile.onboarded=true;s.consent={at:new Date().toISOString()};s.ui.tutorialWeekSeen=true;
 const mk=(id,name,x)=>Object.assign({id,name,icon:'✨',kind:'check',freqType:'daily',days:[],timesPerWeek:3,startDate:K(40),order:s.habits.length,category:'salud',color:'#5b7cff',pauses:[],timeOfDay:''},x||{});
 s.habits.push(mk('leer','Leer',{timeOfDay:'noche'}),mk('agua','Agua',{kind:'quantity',qtyTarget:8,qtyMin:6,qtyUnit:'vasos',qtyStep:1,timeOfDay:'manana'}),mk('estudio','Estudiar',{kind:'quantity',qtyTarget:60,qtyUnit:'min',qtyStep:15,timeOfDay:'tarde'}),mk('medit','Meditar'));
 for(let i=40;i>=8;i--){['leer','medit'].forEach(id=>{s.habitLogs[id]=s.habitLogs[id]||{};s.habitLogs[id][K(i)]=true})}
 const L=ASC.progress.xp(s).level;s.progressSeen={level:L.level,rankIndex:L.rankIndex};s.achievementsSeen={};ASC.progress.achievements(s).forEach(a=>{if(a.unlocked)s.achievementsSeen[a.key]=new Date().toISOString()});
 ASC.store.save();await ASC.store.flush()}"""
async def go(pg,h,w=350): await pg.evaluate("h=>{location.hash=h}",h); await pg.wait_for_timeout(w)
async def closeall(pg): await pg.evaluate("()=>document.querySelectorAll('.overlay').forEach(o=>o._close&&o._close())"); await pg.wait_for_timeout(150)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=os.environ.get('CHROME') or None,args=['--no-sandbox'])
        ctx=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,has_touch=True)
        pg=await ctx.new_page(); errs=[]; pg.set_default_timeout(8000)
        pg.on('pageerror',lambda e: errs.append(str(e)))
        pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text else None)
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto(U); await pg.evaluate("async()=>{indexedDB.deleteDatabase('ascend');localStorage.clear()}"); await pg.reload(); await pg.wait_for_timeout(800)
        await pg.evaluate(SEED); await pg.reload(); await pg.wait_for_timeout(900); await closeall(pg)

        # --- Inicio ---
        await go(pg,'#/home',500)
        r=await pg.evaluate("""()=>{const T=ASC.dates.today();const i=ASC.calendar.dayInfo(ASC.store.get(),T,T);const b=document.querySelector('.day-sum .ring b, .day-sum b');return {ring:document.querySelector('.day-sum').innerText.split('\\n')[0],pct:Math.round(i.pct*100),heads:[...document.querySelectorAll('.tod-head span:first-of-type')].map(x=>x.textContent)}}""")
        check('Inicio: resumen con el mismo % que el calendario', r['ring'].startswith(str(r['pct'])), r)
        check('Inicio: hábitos agrupados por mañana, tarde y noche', r['heads'][:3]==['Mañana','Tarde','Noche'], r['heads'])
        await pg.click('.day-sum ~ * [data-act=mood-set][data-v="4"], [data-act=mood-set][data-v="4"]'); await pg.wait_for_timeout(300)
        check('Ánimo del día se registra', await pg.evaluate("ASC.store.get().moodLog[ASC.dates.today()].mood")==4)
        await pg.click('[data-act=qty-add][data-id=agua]'); await pg.wait_for_timeout(250)
        for _ in range(5): await pg.click('[data-act=qty-add][data-id=agua]'); await pg.wait_for_timeout(120)
        done=await pg.evaluate("ASC.habits.isDone(ASC.store.get(),'agua',ASC.dates.today())")
        check('Mínimo e ideal: 6 de 8 vasos cumple el mínimo', done)
        await pg.screenshot(path=SHOTS+'/90-inicio.png',full_page=True)

        # --- Crear hábito mensual y con cantidad desde el formulario ---
        await go(pg,'#/habits?tab=today',300)
        await pg.click('.fab'); await pg.wait_for_timeout(300)
        await pg.fill('.sheet [name=name]','Llamar a mamá')
        await pg.click('.sheet [data-group=freq] [data-val=monthly]'); await pg.click('.sheet [data-group=mtimes] [data-val="4"]')
        await pg.click('.sheet [data-group=tod] [data-val=tarde]')
        await pg.click('.sheet [data-act=habit-create]'); await pg.wait_for_timeout(400)
        h=await pg.evaluate("ASC.store.get().habits.find(x=>x.name==='Llamar a mamá')")
        check('Crear hábito mensual con momento del día', h and h['freqType']=='monthly' and h['timesPerMonth']==4 and h['timeOfDay']=='tarde', h and {k:h[k] for k in ('freqType','timesPerMonth','timeOfDay')})
        await pg.click('.fab'); await pg.wait_for_timeout(300)
        await pg.click('.sheet [data-group=kind] [data-val=quantity]'); await pg.fill('.sheet [name=name]','Lectura')
        await pg.fill('.sheet [name=qtyMin]','40'); await pg.fill('.sheet [name=qtyTarget]','30'); await pg.fill('.sheet [name=qtyUnit]','min')
        await pg.click('.sheet [data-act=habit-create]'); await pg.wait_for_timeout(300)
        err=await pg.evaluate("!!document.querySelector('.sheet [name=qtyMin][aria-invalid=true]')")
        await pg.fill('.sheet [name=qtyMin]','5'); await pg.click('.sheet [data-act=habit-create]'); await pg.wait_for_timeout(400)
        lec=await pg.evaluate("ASC.store.get().habits.find(x=>x.name==='Lectura')")
        check('Mínimo mayor al ideal: error claro; corregido se guarda', err and lec and lec['qtyMin']==5 and lec['qtyTarget']==30)
        # Pausar y reanudar
        await go(pg,'#/habit/medit',300)
        await pg.click('[data-act=habit-pause]'); await pg.wait_for_timeout(250)
        await pg.click('.sheet [data-act=habit-pause-do][data-days="7"]'); await pg.wait_for_timeout(300)
        pz=await pg.evaluate("()=>{const s=ASC.store.get(),T=ASC.dates.today(),h=s.habits.find(x=>x.id==='medit');return {paused:!!ASC.habits.pausedNow(h,T),inToday:ASC.habits.habitsForDay(s,T).some(x=>x.id==='medit'),hist:Object.keys(s.habitLogs.medit).length}}")
        await go(pg,'#/habits?tab=today',300)
        inPausedList='En pausa'.lower() in (await pg.inner_text('#app')).lower()
        await pg.click('[data-act=habit-resume][data-id=medit]'); await pg.wait_for_timeout(300)
        res=await pg.evaluate("!ASC.habits.pausedNow(ASC.store.get().habits.find(x=>x.id==='medit'),ASC.dates.today())")
        check('Pausar: sale del día, conserva historial; reanudar vuelve', pz['paused'] and not pz['inToday'] and pz['hist']==33 and inPausedList and res, pz)
        # Eliminar con confirmación
        await go(pg,'#/habit/'+h['id'],300)
        await pg.click('[data-act=habit-delete]'); await pg.wait_for_timeout(250)
        await pg.click('.dialog [data-yes]'); await pg.wait_for_timeout(300)
        check('Eliminar pide confirmación y borra', not await pg.evaluate("ASC.store.get().habits.some(x=>x.name==='Llamar a mamá')"))

        # --- Rutina de hábitos ---
        await go(pg,'#/habits?tab=routines',300)
        await pg.click('[data-act=hr-new]'); await pg.wait_for_timeout(300)
        foc=await pg.evaluate("!!document.activeElement.closest('.sheet')")
        await pg.fill('#hr-name','Rutina de noche'); await pg.click('.sheet [data-group=hr-slot] [data-val=noche]')
        await pg.select_option('#hr-habit','leer'); await pg.click('[data-act=hr-add-habit]'); await pg.wait_for_timeout(150)
        await pg.fill('#hr-act','Preparar la ropa'); await pg.fill('#hr-min','5'); await pg.click('[data-act=hr-add-act]'); await pg.wait_for_timeout(150)
        await pg.click('[data-act=hr-move][data-i="1"][data-dir="-1"]'); await pg.wait_for_timeout(150)
        await pg.fill('#hr-time','21:30'); await pg.click('[data-act=hr-save]'); await pg.wait_for_timeout(400)
        rt=await pg.evaluate("ASC.store.get().habitRoutines[0]")
        check('Crear rutina con hábito y actividad, reordenada, con recordatorio', rt['slot']=='noche' and rt['items'][0]['type']=='activity' and rt['items'][1]['habitId']=='leer' and rt['reminderTime']=='21:30' and foc, rt['items'])
        await pg.click('.routine-h [data-act=hr-activity]'); await pg.wait_for_timeout(250)
        await pg.click('.routine-h [data-act=habit-toggle][data-id=leer]'); await pg.wait_for_timeout(300)
        rp=await pg.evaluate("()=>{const s=ASC.store.get(),T=ASC.dates.today();return {p:ASC.planner.routineProgress(s,s.habitRoutines[0],T).pct,leer:ASC.habits.isDone(s,'leer',T)}}")
        check('Completar la rutina marca el hábito de verdad', rp['p']==1 and rp['leer'], rp)

        # --- Prioridades y tareas ---
        await go(pg,'#/home',300)
        for t in ['Tarea A','Tarea B','Tarea C','Tarea D']:
            await pg.fill('#quick-task',t); await pg.click('[data-act=task-quick]'); await pg.wait_for_timeout(150)
        ids=await pg.evaluate("ASC.store.get().tasks.map(t=>t.id)")
        for i in ids[:3]: await pg.click('[data-act=task-top][data-id="%s"]'%i); await pg.wait_for_timeout(120)
        await pg.click('[data-act=task-top][data-id="%s"]'%ids[3]); await pg.wait_for_timeout(250)
        tops=await pg.evaluate("ASC.store.get().tasks.filter(t=>t.top).length")
        toast=await pg.evaluate("[...document.querySelectorAll('.toast')].map(t=>t.textContent).join(' ')")
        await pg.click('[data-act=task-later][data-id="%s"]'%ids[3]); await pg.wait_for_timeout(250)
        later=await pg.evaluate("i=>ASC.store.get().tasks.find(t=>t.id===i).date===ASC.dates.addDays(ASC.dates.today(),1)",ids[3])
        check('Máximo 3 prioridades (con aviso) y reprogramar a mañana', tops==3 and '3 prioridades' in toast and later, {'tops':tops})

        # --- Modo enfoque ---
        await go(pg,'#/focus',300)
        await pg.fill('#focus-custom','30'); await pg.select_option('#focus-habit','estudio')
        await pg.click('[data-act=focus-start]'); await pg.wait_for_timeout(400)
        await pg.evaluate("()=>{const f=ASC.store.get().focus;f.startedAt=new Date(Date.now()-12*60000).toISOString();f.endsAt=new Date(Date.now()+18*60000).toISOString()}")
        await go(pg,'#/home',300)
        live='enfoque' in (await pg.inner_text('.live-bar')).lower()
        await go(pg,'#/focus',300)
        await pg.click('[data-act=focus-finish][data-done="0"]'); await pg.wait_for_timeout(400)
        fz=await pg.evaluate("()=>({q:ASC.habits.getQty(ASC.store.get(),'estudio',ASC.dates.today()),n:ASC.store.get().focusSessions.length})")
        check('Enfoque: barra en vivo y suma los minutos reales al hábito', live and fz['q']==12 and fz['n']==1, fz)

        # --- Recuperación ---
        await go(pg,'#/home',400)
        card=await pg.query_selector('[data-act=rec-open]')
        check('Recuperación: se ofrece tras varios días flojos (sin culpas)', card is not None and 'retomamos' in (await pg.inner_text('.recovery')).lower())
        await pg.click('[data-act=rec-open]'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=SHOTS+'/91-recuperacion.png')
        await pg.click('.sheet [data-act=rec-flag][data-k=pauseOthers]'); await pg.wait_for_timeout(150)
        await pg.click('.sheet [data-act=rec-obs][data-id=tiempo]'); await pg.wait_for_timeout(150)
        await pg.click('.sheet [data-act=rec-start]'); await pg.wait_for_timeout(400)
        rc=await pg.evaluate("()=>{const s=ASC.store.get();return {act:!!ASC.recovery.active(s),keys:s.recovery.keyHabits,paused:s.recovery.pausedIds}}")
        await pg.reload(); await pg.wait_for_timeout(900); await closeall(pg)
        persisted=await pg.evaluate("!!ASC.recovery.active(ASC.store.get())")
        await go(pg,'#/home',300)
        await pg.click('[data-act=rec-end]'); await pg.wait_for_timeout(250); await pg.click('.dialog [data-yes]'); await pg.wait_for_timeout(400)
        after=await pg.evaluate("()=>{const s=ASC.store.get(),T=ASC.dates.today();return {act:!!s.recovery,anyPaused:s.habits.some(h=>ASC.habits.pausedNow(h,T)),hist:s.recoveryHistory.length}}")
        check('Plan de recuperación: pausa el resto, persiste y al terminar todo vuelve', rc['act'] and len(rc['keys'])>0 and len(rc['paused'])>0 and persisted and not after['act'] and not after['anyPaused'] and after['hist']==1, {'plan':rc,'fin':after})

        # --- Juego: desafío mensual, recompensas, reglas ---
        await go(pg,'#/progress',400)
        await pg.click('[data-act=month-pick]'); await pg.wait_for_timeout(300)
        await pg.click('.sheet [data-act=month-set][data-type=mood][data-tier=suave]'); await pg.wait_for_timeout(300)
        mc=await pg.evaluate("ASC.rewards.progress(ASC.store.get(),ASC.rewards.monthKey(ASC.dates.today()))")
        check('Desafío mensual elegido y medido con datos reales', mc and mc['type']=='mood' and mc['value']>=1, mc)
        await pg.click('[data-act=reward-new]'); await pg.wait_for_timeout(250)
        await pg.fill('#rw-title','Ir al cine'); await pg.fill('#rw-value','1'); await pg.click('[data-act=reward-save]'); await pg.wait_for_timeout(300)
        await pg.click('[data-act=reward-claim]'); await pg.wait_for_timeout(300)
        rw=await pg.evaluate("ASC.store.get().rewards[0]")
        ach=await pg.evaluate("[...document.querySelectorAll('.ach.on')].some(a=>/Desbloqueado el/.test(a.innerText))")
        check('Recompensa propia: se desbloquea y se canjea; logros con fecha', rw['claimedAt'] and ach, rw)
        await go(pg,'#/xp-rules',300)
        t=await pg.inner_text('#app')
        check('Página "Cómo se gana XP" generada desde la configuración', 'Desafío mensual firme' in t and '+600' in t and 'nunca resta' in t)

        # --- Diario privado ---
        await go(pg,'#/habits?tab=journal',300)
        await pg.click('.fab'); await pg.wait_for_timeout(250)
        await pg.click('.sheet [data-group=jtype] [data-val=evento]'); await pg.fill('.sheet [name=title]','Aprobé el final'); await pg.fill('.sheet [name=text]','Texto secreto')
        await pg.click('.sheet [data-act=journal-save]'); await pg.wait_for_timeout(500)
        await closeall(pg)  # el primer diario desbloquea un logro (celebración)
        await pg.click('[data-act=journal-privacy]'); await pg.wait_for_timeout(300)
        hidden='Texto secreto' not in await pg.inner_text('#app') and 'Aprobé el final' not in await pg.inner_text('#app')
        await pg.click('[data-act=journal-reveal]'); await pg.wait_for_timeout(250)
        shown='Texto secreto' in await pg.inner_text('#app')
        await go(pg,'#/home',200); await go(pg,'#/habits?tab=journal',300)
        rehidden='Texto secreto' not in await pg.inner_text('#app')
        check('Diario privado: oculta, muestra a pedido y vuelve a ocultar', hidden and shown and rehidden)

        # --- Recordatorios ---
        await go(pg,'#/profile',400)
        await pg.select_option('[data-change=rem-pause]','3'); await pg.wait_for_timeout(300)
        await pg.click('[data-act=rem-quiet-toggle]'); await pg.wait_for_timeout(300)
        rm=await pg.evaluate("""()=>{const r=ASC.store.get().settings.reminders;const T=ASC.dates.today();
          const q={pausedUntil:null,quiet:{enabled:true,from:'22:00',to:'07:00'}};
          return {paused:r.pausedUntil===ASC.dates.addDays(T,2),quiet:r.quiet.enabled,blockedNow:!ASC.remindersAllowed(r,T,'12:00'),night:!ASC.remindersAllowed(q,T,'23:30'),early:!ASC.remindersAllowed(q,T,'06:59'),day:ASC.remindersAllowed(q,T,'07:00')}}""")
        check('Recordatorios: pausa por días y horario de silencio (cruza medianoche)', all(rm.values()), rm)

        # --- Estadísticas ---
        await go(pg,'#/progress?tab=personal',400)
        t=await pg.inner_text('#app')
        check('Estadísticas: comparación, día de la semana y consistencia por hábito', all(x.lower() in t.lower() for x in ['Comparación entre períodos','Por día de la semana','Consistencia por hábito','Evolución']))
        await go(pg,'#/progress?tab=insights',400)
        check('Insights: pantalla con aviso de asociación ≠ causa', 'no significa que una cause la otra' in await pg.inner_text('#app'))

        # --- Persistencia ---
        await pg.reload(); await pg.wait_for_timeout(900)
        ps=await pg.evaluate("()=>{const s=ASC.store.get();return {r:s.habitRoutines.length,m:Object.keys(s.moodLog).length,rw:s.rewards.length,f:s.focusSessions.length,mo:Object.keys(s.months).length,mode:ASC.store.mode()}}")
        check('Todo persiste tras recargar (IndexedDB)', ps['r']==1 and ps['m']>=1 and ps['rw']==1 and ps['f']==1 and ps['mo']==1 and ps['mode']=='indexeddb', ps)

        # --- Responsive y errores ---
        over=[]
        for w in (320,768,1440):
            await pg.set_viewport_size({'width':w,'height':800})
            for r in ['#/home','#/habits?tab=routines','#/habits?tab=journal','#/progress','#/progress?tab=personal','#/progress?tab=insights','#/xp-rules','#/focus','#/profile']:
                await go(pg,r,250)
                o=await pg.evaluate("()=>({sw:document.documentElement.scrollWidth,W:document.documentElement.clientWidth})")
                if o['sw']>o['W']: over.append((w,r,o))
            if w==320: await go(pg,'#/home',250); await pg.screenshot(path=SHOTS+'/92-inicio-320.png',full_page=True)
        check('Sin desbordes horizontales en 320, 768 y 1440 px', not over, over)
        check('Sin errores de JavaScript', not errs, errs[:5])
        await b.close()
    bad=[k for k,v in results.items() if not v]
    print('\n%d/%d verificaciones OK' % (len(results)-len(bad), len(results)))
    raise SystemExit(1 if bad else 0)
asyncio.run(main())
