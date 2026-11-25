import asyncio, json, os
from playwright.async_api import async_playwright
B=os.environ.get('ASCEND_BASE','http://localhost:8765/')
SHOTS=os.environ.get('SHOTS','capturas'); os.makedirs(SHOTS,exist_ok=True)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=os.environ.get('CHROME') or None,args=['--no-sandbox'])
        ctx=await b.new_context(viewport={'width':390,'height':844})
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        # 1) datos creados con la versión anterior (localStorage)
        await pg.goto(B+'ascend-v1/index.html'); await pg.wait_for_timeout(300)
        await pg.evaluate("""()=>{const s=ASC.store.get();s.profile.name='Tomás';s.profile.onboarded=true;s.habits.push({id:'h1',name:'Leer',icon:'📖',category:'lectura',freqType:'daily',days:[],startDate:ASC.dates.addDays(ASC.dates.today(),-3),color:'#f00'});ASC.habits.toggle(s,'h1',ASC.dates.addDays(ASC.dates.today(),-1));s.journal.push({id:'j',date:ASC.dates.today(),mood:4,text:'hola'});ASC.store.save()}""")
        v1=await pg.evaluate("localStorage.getItem('ascend:data:v1').length"); print('v1 bytes',v1)
        # 2) abrir versión nueva: debe migrar a IndexedDB una sola vez
        await pg.goto(B+'ascend-web/index.html'); await pg.wait_for_timeout(1200)
        r=await pg.evaluate("""async()=>({mode:ASC.store.mode(),name:ASC.store.get().profile.name,habits:ASC.store.get().habits.length,kind:ASC.store.get().habits[0].kind,logs:Object.keys(ASC.store.get().habitLogs.h1||{}).length,ls:localStorage.getItem('ascend:data:v1'),lsMig:!!localStorage.getItem('ascend:data:v1:migrado-a-indexeddb'),backups:(await ASC.store.listBackups()).map(b=>b.reason),version:ASC.store.get().version})"""); print('after migration',json.dumps(r,ensure_ascii=False))
        # 3) cambio + recarga: persiste en IndexedDB
        await pg.evaluate("()=>{const s=ASC.store.get();s.habits.push({id:'h2',name:'Agua',icon:'💧',kind:'check',category:'salud',freqType:'daily',days:[],startDate:ASC.dates.today(),color:'#0af'});ASC.store.save()}")
        await pg.wait_for_timeout(400); await pg.reload(); await pg.wait_for_timeout(1000)
        r=await pg.evaluate("()=>({habits:ASC.store.get().habits.length,mode:ASC.store.mode()})"); print('after reload',r)
        # 4) reabrir no duplica (no vuelve a migrar aunque reaparezca localStorage viejo)
        await pg.evaluate("()=>localStorage.setItem('ascend:data:v1', localStorage.getItem('ascend:data:v1:migrado-a-indexeddb'))")
        await pg.reload(); await pg.wait_for_timeout(1000)
        r=await pg.evaluate("()=>({habits:ASC.store.get().habits.length})"); print('no re-migration',r)
        # 5) documento dañado -> recupera copia
        await pg.evaluate("""async()=>{await ASC.store.createBackup('test');const db=await ASC.db.open();await new Promise(r=>{const t=db.transaction('kv','readwrite');t.objectStore('kv').put({schema:2,checksum:'bad',json:'{rota'},'state');t.oncomplete=r})}""")
        await pg.reload(); await pg.wait_for_timeout(1200)
        r=await pg.evaluate("()=>({habits:ASC.store.get().habits.length,name:ASC.store.get().profile.name})"); print('recovered',r)
        await pg.goto(B+'ascend-web/index.html#/profile'); await pg.wait_for_timeout(1000)
        await pg.screenshot(path=SHOTS+'/40-profile-data.png',full_page=True)
        print('errors',errs)
        await b.close()
asyncio.run(main())
