"""Calendario de progreso: verifica los 10 escenarios pedidos y la integración.
Uso: python3 tests/e2e/calendario.py   (con la app servida por http; ver README)"""
import asyncio, json, os, re
from playwright.async_api import async_playwright
U=os.environ.get('ASCEND_URL','http://localhost:8765/ascend-web/index.html')
SHOTS=os.environ.get('SHOTS','capturas'); os.makedirs(SHOTS,exist_ok=True)
results={}
def check(name, cond, extra=None):
    results[name]=bool(cond); print(('  ✓ ' if cond else '  ✗ ')+name+('' if extra is None else '  '+json.dumps(extra,ensure_ascii=False)[:300]))
SEED="""async()=>{const s=ASC.store.get();const D=ASC.dates,T=D.today(),K=(n)=>D.addDays(T,-n);
 s.profile.name='Tomás';s.profile.onboarded=true;s.consent={at:new Date().toISOString()};s.ui.tutorialWeekSeen=true;
 const start=K(5);
 for(let i=0;i<7;i++)s.habits.push({id:'h'+i,name:'Hábito '+(i+1),emoji:'',kind:'check',freqType:'daily',days:[],timesPerWeek:3,startDate:start,order:i,category:'salud',color:'#ff2d3a'});
 s.habits.push({id:'agua',name:'Agua',emoji:'',kind:'quantity',qtyTarget:8,qtyUnit:'vasos',qtyStep:1,freqType:'daily',days:[],timesPerWeek:3,startDate:start,order:7,category:'salud',color:'#1ec8ff'});
 const done=(ids,k)=>ids.forEach(id=>{s.habitLogs[id]=s.habitLogs[id]||{};s.habitLogs[id][k]=true});
 s.habitQty={agua:{}};
 done(['h0','h1','h2','h3','h4','h5','h6','agua'],K(2));s.habitQty.agua[K(2)]=8;
 done(['h0','h1','h2','h3'],K(3));
 done(['h0'],K(4));
 s.habitQty.agua[K(5)]=4;
 s.journal.push({id:'j',date:K(2),text:'Día redondo.',mood:5,createdAt:new Date().toISOString()});
 const L=ASC.progress.xp(s).level;s.progressSeen={level:L.level,rankIndex:L.rankIndex};ASC.store.save();await ASC.store.flush();return {T,K1:K(1),K2:K(2),K3:K(3),K4:K(4),K5:K(5),K6:K(6)}}"""
async def go(pg, h, wait=400):
    await pg.evaluate("h=>{location.hash=h}", h); await pg.wait_for_timeout(wait)
async def cell(pg, k):
    return await pg.evaluate("""k=>{const c=document.querySelector('.cd[data-k="'+k+'"]');if(!c)return null;const cs=getComputedStyle(c);return {cls:c.className,a:c.style.getPropertyValue('--a'),bg:cs.backgroundColor,label:c.getAttribute('aria-label').replace(/\u00a0/g,' ')}}""", k)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=os.environ.get('CHROME') or None,args=['--no-sandbox'])
        ctx=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,has_touch=True)
        pg=await ctx.new_page(); errs=[]; pg.set_default_timeout(8000)
        pg.on('pageerror',lambda e: errs.append(str(e)))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto(U); await pg.evaluate("async()=>{indexedDB.deleteDatabase('ascend');localStorage.clear()}"); await pg.reload(); await pg.wait_for_timeout(800)
        K=await pg.evaluate(SEED); await pg.reload(); await pg.wait_for_timeout(900)
        await pg.evaluate("()=>document.querySelectorAll('.overlay').forEach(o=>o._close&&o._close())")
        snap=await pg.evaluate("()=>JSON.stringify({l:ASC.store.get().habitLogs,q:ASC.store.get().habitQty,h:ASC.store.get().habits.length})")
        await go(pg,'#/habits?tab=calendar&v=3m',600)
        c2,c3,c4,c5,c6,c1=[await cell(pg,K[x]) for x in ('K2','K3','K4','K5','K6','K1')]
        check('1. todos completados → rojo intenso (100 %)', 'k-full' in c2['cls'] and c2['bg']=='rgb(240, 68, 89)', c2)
        check('2. la mitad → intensidad intermedia', ' b3' in c3['cls'] and 0.4<float(c3['a'])<0.55, c3)
        check('3. muy poco (1 de 8) → rojo tenue', ' b1' in c4['cls'] and float(c4['a'])<0.25, c4)
        check('4. sin hábitos programados ≠ 0 %', 'k-empty' in c6['cls'] and 'k-zero' in c1['cls'] and c6['bg']!=c1['bg'], {'vacío':c6,'cero':c1})
        check('5. cantidad parcial (4 de 8 vasos) refleja su avance', ' b1' in c5['cls'] and '6 %' in c5['label'] and float(c5['a'])>0, c5)
        await pg.screenshot(path=SHOTS+'/80-cal-3m.png',full_page=True)
        # detalle del día con cantidad
        await pg.click('.cd[data-k="%s"]' % K['K5']); await pg.wait_for_timeout(350)
        t=(await pg.inner_text('.sheet')).replace('\xa0',' ').replace('\xa0',' ')
        check('5b. el detalle muestra el progreso de la cantidad', '4 / 8 vasos' in t and '50 %' in t, t[:200])
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
        await pg.click('.cd[data-k="%s"]' % K['K2']); await pg.wait_for_timeout(350)
        t=(await pg.inner_text('.sheet')).replace('\xa0',' ')
        check('detalle: fecha, %, completados, pendientes, XP y diario', all(x in t for x in ['100 %','8','completados','pendientes','XP','Día redondo.']), t[:300])
        await pg.screenshot(path=SHOTS+'/81-cal-detalle.png')
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
        await pg.click('.cd[data-k="%s"]' % K['K4']); await pg.wait_for_timeout(300)
        t=(await pg.inner_text('.sheet')).replace('\xa0',' ').replace('\xa0',' ')
        check('día cerrado: solo consulta (sin botón de corregir)', 'Día cerrado' in t and not await pg.query_selector('.sheet [data-act=cal-edit]'))
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)

        # 6) Vistas y navegación
        info={}
        for v in ['week','month','3m','6m','12m']:
            await pg.click('.cal-views a[href*="v=%s&"]' % v); await pg.wait_for_timeout(450)
            info[v]=await pg.evaluate("""()=>{const c=[...document.querySelectorAll('.cal-card .cd')].map(x=>x.dataset.k);return {n:c.length,first:c[0],last:c[c.length-1],title:document.querySelector('.cal-title').textContent,cur:document.querySelector('.cal-views [aria-current]').getAttribute('aria-label')}}""")
        exp=await pg.evaluate("""()=>{const C=ASC.calendar,T=ASC.dates.today();const o={};for(const v of ['week','month','3m','6m','12m']){const p=C.period(v,T);o[v]={n:ASC.dates.range(p.from,p.to).length,first:p.from,last:p.to}};return o}""")
        okv=all(info[v]['n']==exp[v]['n'] and info[v]['first']==exp[v]['first'] and info[v]['last']==exp[v]['last'] for v in exp)
        check('6. semana, mes, 3, 6 y 12 meses muestran el período correcto', okv and info['week']['n']==7 and info['12m']['n'] in (365,366), {v:(info[v]['n'],info[v]['first'],info[v]['last']) for v in info})
        await pg.screenshot(path=SHOTS+'/82-cal-12m.png',full_page=True)
        await go(pg,'#/habits?tab=calendar&v=month',400)
        before=await pg.evaluate("document.querySelector('.cal-card .cd').dataset.k")
        await pg.click('[data-act=cal-go][data-f=prev]'); await pg.wait_for_timeout(450)
        prev=await pg.evaluate("document.querySelector('.cal-card .cd').dataset.k")
        foc=await pg.evaluate("document.activeElement && document.activeElement.dataset.f")
        await pg.click('[data-act=cal-go][data-f=next]'); await pg.wait_for_timeout(450)
        back=await pg.evaluate("document.querySelector('.cal-card .cd').dataset.k")
        exp_prev=await pg.evaluate("ASC.calendar.addMonths(ASC.dates.today(),-1)")
        check('6b. navegación atrás/adelante (y el foco queda en el control)', prev==exp_prev and back==before and foc=='prev', {'antes':before,'anterior':prev,'vuelta':back,'foco':foc})
        await pg.click('[data-act=cal-go][data-f=prev]'); await pg.wait_for_timeout(300)
        has_today=await pg.query_selector('[data-act=cal-go][data-f=today]')
        await pg.click('[data-act=cal-go][data-f=today]') if has_today else None; await pg.wait_for_timeout(300)
        check('6c. botón "Ir a hoy" en períodos pasados', has_today is not None and await pg.evaluate("!!document.querySelector('.cd.today')"))

        # 8) Estadísticas = celdas
        for v in ['week','month','3m']:
            await go(pg,'#/habits?tab=calendar&v='+v,400)
            r=await pg.evaluate("""()=>{const cells=[...document.querySelectorAll('.cal-card .cd')];const T=ASC.dates.today();
              const counted=cells.filter(c=>!c.classList.contains('k-empty')&&!c.classList.contains('k-future')&&!(c.dataset.k===T&&!c.classList.contains('k-full')));
              const full=counted.filter(c=>c.classList.contains('k-full')).length,zero=counted.filter(c=>c.classList.contains('k-zero')).length,part=counted.length-full-zero;
              const tiles=[...document.querySelectorAll('.cal-stats .stat .v')].map(e=>e.textContent.replace(/\\u00a0/g,' ').trim());
              const pct=counted.map(c=>{const m=c.getAttribute('aria-label').match(/(\\d+)[\\s\\u00a0]%/);return m?+m[1]:0});
              return {dom:[full,part,zero],tiles,avgDom:pct.length?pct.reduce((a,b)=>a+b,0)/pct.length:null}}""")
            avg=r['tiles'][0]
            check('8. (%s) estadísticas coinciden con las celdas' % v, r['tiles'][1:4]==[str(x) for x in r['dom']] and (avg=='—' if r['avgDom'] is None else abs(int(avg.split()[0])-r['avgDom'])<=1.5), r)
        # 9) Futuro
        await go(pg,'#/habits?tab=calendar&v=week',400)
        fut=await pg.evaluate("""()=>{const T=ASC.dates.today();const f=[...document.querySelectorAll('.cal-card .cd')].filter(c=>c.dataset.k>T);return {n:f.length,ok:f.every(c=>c.classList.contains('k-future')&&!c.style.getPropertyValue('--a'))}}""")
        nfut=await pg.evaluate("ASC.calendar.summary(ASC.store.get(),ASC.calendar.period('week',ASC.dates.today()).from,ASC.calendar.period('week',ASC.dates.today()).to).future")
        check('9. días futuros sin color y fuera de las estadísticas', fut['ok'] and nfut==fut['n'], {'celdas':fut,'resumen':nfut})

        # 7) Historial intacto tras consultar todo
        after=await pg.evaluate("()=>JSON.stringify({l:ASC.store.get().habitLogs,q:ASC.store.get().habitQty,h:ASC.store.get().habits.length})")
        check('7. consultar vistas y detalles no modifica registros', after==snap)

        # Actualización inmediata + reglas de edición + persistencia
        await go(pg,'#/habits?tab=calendar&v=month',400)
        await pg.click('.cd[data-k="%s"]' % K['K1']); await pg.wait_for_timeout(300)
        await pg.click('.sheet [data-act=cal-edit]'); await pg.wait_for_timeout(600)
        await pg.click('#cal-edit [data-act=habit-toggle][data-id=h0]'); await pg.wait_for_timeout(500)
        c1b=await cell(pg,K['K1'])
        check('se actualiza al instante al corregir un día editable', 'k-partial' in c1b['cls'] and ' b1' in c1b['cls'], c1b)
        n_logs=await pg.evaluate("k=>Object.keys(ASC.store.get().habitLogs.h0).filter(x=>x===k).length", K['K1'])
        await pg.wait_for_timeout(300); await pg.reload(); await pg.wait_for_timeout(900)
        await go(pg,'#/habits?tab=calendar&v=month',400)
        c1c=await cell(pg,K['K1'])
        check('persiste al recargar y sin registros duplicados', 'k-partial' in c1c['cls'] and n_logs==1, c1c)

        # 10) Celulares, tablets y computadoras
        over=[]
        for (w,hh) in [(320,640),(390,844),(768,1024),(1024,768),(1440,900)]:
            await pg.set_viewport_size({'width':w,'height':hh})
            for v in ['week','month','3m','6m','12m']:
                await go(pg,'#/habits?tab=calendar&v='+v,250)
                o=await pg.evaluate("()=>({sw:document.documentElement.scrollWidth,W:document.documentElement.clientWidth,card:(()=>{const c=document.querySelector('.cal-card');return c.scrollWidth<=c.clientWidth+1})()})")
                if o['sw']>o['W'] or not o['card']: over.append((w,v,o))
                if (w,v) in [(320,'12m'),(320,'week'),(768,'6m'),(1440,'month'),(1440,'12m')]: await pg.screenshot(path=SHOTS+'/83-cal-%d-%s.png' % (w,v),full_page=True)
        check('10. sin desplazamiento horizontal en 320, 390, 768, 1024 y 1440 px', not over, over)
        check('sin errores de JavaScript', not errs, errs[:5])
        await b.close()
    bad=[k for k,v in results.items() if not v]
    print('\n%d/%d verificaciones OK' % (len(results)-len(bad), len(results)))
    raise SystemExit(1 if bad else 0)
asyncio.run(main())
