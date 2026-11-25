import asyncio, json, os
from playwright.async_api import async_playwright
U=os.environ.get('ASCEND_URL','http://localhost:8765/ascend-web/index.html')
SHOTS=os.environ.get('SHOTS','capturas'); os.makedirs(SHOTS,exist_ok=True)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=os.environ.get('CHROME') or None,args=['--no-sandbox'])
        ctx=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2)
        pg=await ctx.new_page(); errs=[]
        pg.on('pageerror',lambda e: errs.append(str(e)))
        pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'Failed to load' not in m.text else None)
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto(U); await pg.evaluate("async()=>{indexedDB.deleteDatabase('ascend');localStorage.clear()}"); await pg.reload(); await pg.wait_for_timeout(600)
        # onboarding rápido
        await pg.click('[data-act=ob-next]'); await pg.fill('#ob-name','Tomás'); await pg.click('[data-act=ob-next]')
        await pg.click('[data-act=ob-goal][data-id=leer]'); await pg.click('[data-act=ob-goal][data-id=alimentacion]')
        while not await pg.query_selector('[data-act=ob-finish]'):
            await pg.click('[data-act=ob-next]'); await pg.wait_for_timeout(80)
        await pg.check('#ob-consent')
        await pg.click('[data-act=ob-finish]'); await pg.wait_for_timeout(800)
        print('mode', await pg.evaluate("ASC.store.mode()"))
        # hábito con cantidad
        await pg.goto(U+'#/habits?tab=today'); await pg.wait_for_timeout(300)
        await pg.click('.fab'); await pg.wait_for_timeout(300)
        await pg.click('.sheet [data-group=kind] [data-val=quantity]')
        await pg.fill('.sheet [name=name]','Tomar agua'); await pg.fill('.sheet [name=qtyTarget]','2000'); await pg.fill('.sheet [name=qtyUnit]','ml'); await pg.fill('.sheet [name=qtyStep]','500')
        await pg.screenshot(path=SHOTS+'/50-form-qty.png')
        await pg.click('[data-act=habit-create]'); await pg.wait_for_timeout(300)
        for _ in range(3): await pg.click('.check.qty >> nth=0'); await pg.wait_for_timeout(150)
        q=await pg.evaluate("()=>{const s=ASC.store.get();const h=s.habits.find(x=>x.kind==='quantity');return [ASC.habits.getQty(s,h.id,ASC.dates.today()),ASC.habits.isDone(s,h.id,ASC.dates.today())]}"); print('qty after 3 taps', q)
        await pg.click('.check.qty >> nth=0'); await pg.wait_for_timeout(500)
        if await pg.query_selector('.overlay.center [data-ok]'): await pg.click('.overlay.center [data-ok]')
        q=await pg.evaluate("()=>{const s=ASC.store.get();const h=s.habits.find(x=>x.kind==='quantity');return [ASC.habits.getQty(s,h.id,ASC.dates.today()),ASC.habits.isDone(s,h.id,ASC.dates.today())]}"); print('qty after 4 taps', q)
        # hábito a evitar
        await pg.click('.fab'); await pg.wait_for_timeout(300)
        await pg.click('.sheet [data-group=kind] [data-val=negative]'); await pg.fill('.sheet [name=name]','Fumar')
        await pg.click('.sheet [data-group=neggoal] [data-val="30"]'); await pg.click('[data-act=habit-create]'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=SHOTS+'/51-today.png',full_page=True)
        # foco: abrir hoja, Tab no sale, Escape cierra y devuelve foco
        await pg.focus('.fab'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(300)
        inside=True
        for _ in range(40):
            await pg.keyboard.press('Tab')
            if not await pg.evaluate("!!document.activeElement.closest('.sheet')"): inside=False
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
        print('focus trapped', inside, 'sheet closed', not await pg.query_selector('.sheet'), 'focus back on fab', await pg.evaluate("document.activeElement.classList.contains('fab')"))
        # días cerrados: semilla con historia y prueba directa de la regla
        await pg.evaluate("""()=>{const s=ASC.store.get();const D=ASC.dates;const t=D.today();s.createdAt=new Date(Date.now()-30*864e5).toISOString();s.habits.forEach(h=>h.startDate=D.addDays(t,-25));
          const ids=s.habits.filter(h=>h.kind==='check').map(h=>h.id);for(let d=25;d>=2;d--){ids.forEach(id=>ASC.habits.forceToggle(s,id,D.addDays(t,-d)))};ASC.perf.reset();ASC.app.commit({silent:true})}""")
        r=await pg.evaluate("()=>{const s=ASC.store.get();const D=ASC.dates;const id=s.habits.find(h=>h.kind==='check').id;return {closed:ASC.habits.toggle(s,id,D.addDays(D.today(),-3)),open:ASC.habits.toggle(s,id,D.addDays(D.today(),-1))}}"); print('rules', r)
        await pg.evaluate("()=>{const s=ASC.store.get();const id=s.habits.find(h=>h.kind==='check').id;ASC.habits.toggle(s,id,ASC.dates.addDays(ASC.dates.today(),-1));ASC.app.commit({silent:true})}")
        await pg.goto(U+'#/habits?tab=week'); await pg.wait_for_timeout(900)
        tut=await pg.query_selector('.tutorial'); print('tutorial shown', bool(tut))
        await pg.screenshot(path=SHOTS+'/52-tutorial.png')
        for _ in range(5): await pg.click('.tutorial [data-tut=next]'); await pg.wait_for_timeout(120)
        await pg.click('.tutorial [data-tut=sound]'); await pg.click('.tutorial [data-tut=next]'); await pg.wait_for_timeout(300)
        print('tutorial seen', await pg.evaluate("ASC.store.get().ui.tutorialWeekSeen"), 'sound', await pg.evaluate("ASC.store.get().settings.sound"))
        fz=await pg.query_selector('[data-act=freeze-use]'); print('freeze offered', bool(fz))
        await pg.screenshot(path=SHOTS+'/53-week.png',full_page=True)
        if fz:
            await fz.click(); await pg.wait_for_timeout(200); await pg.click('[data-yes]'); await pg.wait_for_timeout(400)
            print('streak after freeze', await pg.evaluate("ASC.progress.consistency(ASC.store.get()).current"), 'freezes', await pg.evaluate("JSON.stringify(ASC.progress.consistency(ASC.store.get()).freezes)"))
        closedCells=await pg.evaluate("document.querySelectorAll('span.wcell.closed').length"); btnClosed=await pg.evaluate("document.querySelectorAll('button.wcell.closed').length"); print('closed cells (no button)', closedCells, 'closed buttons', btnClosed)
        await pg.goto(U+'#/progress?tab=personal'); await pg.wait_for_timeout(500)
        await pg.screenshot(path=SHOTS+'/54-insights.png',full_page=True)
        await pg.goto(U+'#/profile'); await pg.wait_for_timeout(1200)
        await pg.screenshot(path=SHOTS+'/55-profile.png',full_page=True)
        hab=[h['kind'] for h in await pg.evaluate("ASC.store.get().habits")]
        neg=await pg.evaluate("()=>{const s=ASC.store.get();const h=s.habits.find(x=>x.kind==='negative');return ASC.habits.cleanStreak(s,h)}"); print('neg', neg, hab)
        print('perf', await pg.evaluate("JSON.stringify(ASC.perf.stats)"))
        print('ERRORS', errs)
        await b.close()
asyncio.run(main())
