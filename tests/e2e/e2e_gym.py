import asyncio, json, os
from playwright.async_api import async_playwright
U=os.environ.get('ASCEND_URL','http://localhost:8765/ascend-web/index.html')
SHOTS=os.environ.get('SHOTS','capturas'); os.makedirs(SHOTS,exist_ok=True)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=os.environ.get('CHROME') or None,args=['--no-sandbox'])
        pg=await (await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2)).new_page(); errs=[]
        pg.on('pageerror',lambda e: errs.append(str(e)))
        pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'Failed to load' not in m.text else None)
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto(U); await pg.evaluate("async()=>{indexedDB.deleteDatabase('ascend');localStorage.clear()}"); await pg.reload(); await pg.wait_for_timeout(500)
        await pg.evaluate("""async()=>{const s=ASC.store.get();s.profile.name='Tomás';s.profile.onboarded=true;s.ui.tutorialWeekSeen=true;s.settings.effortScale='rir';
          s.routines.push({id:'r1',name:'Push',days:[1],order:0,items:[{id:'a',exerciseId:'press-banca',sets:2,reps:'8-12',weight:60,rest:90},{id:'b',exerciseId:'remo-barra',sets:2,reps:'8-12',weight:50,rest:120}]});
          const se={id:'old',routineName:'Push',startedAt:new Date(Date.now()-3*864e5).toISOString(),endedAt:new Date(Date.now()-3*864e5+3600e3).toISOString(),status:'completed',exercises:[{exerciseId:'press-banca',name:'Press de banca',rest:90,targetReps:'8-12',sets:[{weight:60,reps:12,done:true},{weight:60,reps:12,done:true}]}]};
          s.sessions.push(se);ASC.app.commit({silent:true})}""")
        # editor: unir en superserie
        await pg.goto(U+'#/routine-edit/r1'); await pg.wait_for_timeout(300)
        await pg.click('[data-act=draft-link][data-i="0"]'); await pg.wait_for_timeout(200)
        await pg.screenshot(path=SHOTS+'/60-editor-ss.png',full_page=True)
        await pg.click('[data-act=routine-save]'); await pg.wait_for_timeout(300)
        print('groups', await pg.evaluate("ASC.store.get().routines[0].items.map(i=>i.group?'G':'-').join('')"))
        await pg.click('[data-act=workout-start]'); await pg.wait_for_timeout(500)
        await pg.screenshot(path=SHOTS+'/61-workout.png',full_page=True)
        await pg.select_option('select[data-k="0"]','2')
        await pg.click('[data-act=wo-set-done][data-k="0"]'); await pg.wait_for_timeout(300)
        r=await pg.evaluate("()=>{const s=ASC.store.get();const a=s.sessions.find(x=>x.status==='in_progress');return {cur:a.currentIndex,rest:!!a.rest,rir:a.exercises[0].sets[0].rir,w0:a.exercises[0].sets[0].weight}}"); print('after A1', r)
        await pg.click('[data-act=wo-set-done][data-k="0"]'); await pg.wait_for_timeout(300)
        r=await pg.evaluate("()=>{const s=ASC.store.get();const a=s.sessions.find(x=>x.status==='in_progress');return {cur:a.currentIndex,rest:a.rest&&a.rest.label}}"); print('after B1', r)
        await pg.screenshot(path=SHOTS+'/62-round-rest.png')
        await pg.click('[data-act=wo-rest-skip]')
        await pg.click('[data-act=wo-apply-sug]') if await pg.query_selector('[data-act=wo-apply-sug]') else None
        await pg.wait_for_timeout(200)
        print('sug weight pending', await pg.evaluate("ASC.store.get().sessions.find(x=>x.status==='in_progress').exercises[0].sets[1].weight"))
        await pg.click('[data-act=plates-open]'); await pg.wait_for_timeout(400)
        await pg.fill('.sheet [name=ptotal]','102.5'); await pg.wait_for_timeout(150)
        print('plates', await pg.inner_text('[data-plates-result] .card'))
        await pg.screenshot(path=SHOTS+'/63-plates.png')
        await pg.keyboard.press('Escape')
        await pg.goto(U+'#/exercise/remo-barra'); await pg.wait_for_timeout(400)
        await pg.screenshot(path=SHOTS+'/64-exercise.png')
        print('ERRORS', errs)
        await b.close()
asyncio.run(main())
