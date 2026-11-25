import asyncio, json, os
from playwright.async_api import async_playwright
U=os.environ.get('ASCEND_URL','http://localhost:8765/ascend-web/index.html')
SIZES=[('320',320,568,False),('390',390,844,False),('768',768,1024,False),('1024',1024,768,False),('1440',1440,900,False),('land',844,390,False)]
ROUTES=['#/home','#/habits?tab=week','#/habits?tab=calendar','#/habits?tab=today','#/habits?tab=goals','#/gym','#/gym?tab=exercises','#/exercise/press-banca','#/gym?tab=history','#/progress?tab=general','#/progress?tab=personal','#/progress?tab=gym','#/profile','#/routine-edit/r1','#/workout','#/legal/privacidad','#/gym-start','#/basic','#/basic/basica-brazos','#/exercise/remo-polea','#/habits?tab=calendar&v=week','#/habits?tab=calendar&v=12m','#/habits?tab=routines','#/progress?tab=insights','#/xp-rules','#/focus']
SEED="""()=>{const s=ASC.store.get();const D=ASC.dates;const t=D.today();s.createdAt=new Date(Date.now()-40*864e5).toISOString();s.profile.name='Tomás';s.profile.onboarded=true;s.ui.tutorialWeekSeen=true;s.consent={at:new Date().toISOString()};
 const hs=[['Leer 20 minutos','📖','lectura','daily'],['Tomar 2 L de agua','💧','salud','daily'],['Meditar','🧘','mentalidad','weekdays'],['Entrenar','🏋️','fitness','weekly'],['Levantarse 7 am temprano siempre','⏰','productividad','daily']];
 hs.forEach((h,i)=>s.habits.push({id:'h'+i,name:h[0],icon:h[1],category:h[2],freqType:h[3],days:[1,2,3,4,5],timesPerWeek:3,color:'#ff2d3a',startDate:D.addDays(t,-35),order:i}));
 for(let d=35;d>=1;d--){const k=D.addDays(t,-d);s.habits.forEach((h,i)=>{if((d+i)%4!==0&&ASC.habits.isScheduled(h,k))ASC.habits.forceToggle(s,h.id,k)})}
 s.goals.push({id:'g1',title:'Leer 12 libros',description:'',category:'lectura',horizon:'largo',startDate:t,targetDate:'',status:'active',steps:[{id:'s1',title:'Libro 1',done:true}]});
 s.journal.push({id:'j1',date:t,mood:4,text:'Buen día.',learnings:'Constancia.'});
 s.routines.push({id:'r1',name:'Push',description:'Pecho y hombros',days:[1,3,5],order:0,items:[{id:'i1',exerciseId:'press-banca',sets:3,reps:'8',weight:60,rest:90},{id:'i2',exerciseId:'elev-laterales',sets:3,reps:'12',weight:8,rest:60}]});
 const se=ASC.gym.createSessionFromRoutine(s,s.routines[0]);se.startedAt=new Date(Date.now()-3*864e5).toISOString();se.exercises.forEach(e=>e.sets.forEach(x=>{x.done=true;x.weight=x.weight||60;x.reps=8}));se.status='completed';se.endedAt=new Date(Date.now()-3*864e5+3600e3).toISOString();s.sessions.push(se);
 const a=ASC.gym.createSessionFromRoutine(s,s.routines[0]);s.sessions.push(a);s.activeSessionId=a.id;
 ASC.game.ensureWeek(s,D.weekStart(t),t);ASC.game.planWeek(s,D.weekStart(t),'firme',t);
 const L=ASC.progress.xp(s).level;s.progressSeen={level:L.level,rankIndex:L.rankIndex};ASC.progress.achievements(s).forEach(x=>s.achievementsSeen[x.key]=1);ASC.store.save();}"""
SHOTS=os.environ.get('SHOTS','capturas'); os.makedirs(SHOTS,exist_ok=True)
async def main():
    out={}
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=os.environ.get('CHROME') or None,args=['--no-sandbox'])
        for name,w,h,_ in SIZES:
            pg=await b.new_page(viewport={'width':w,'height':h},device_scale_factor=1, has_touch=w<1024)
            errs=[]; pg.on('pageerror',lambda e,errs=errs: errs.append(str(e)))
            await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
            await pg.goto(U); await pg.wait_for_timeout(700); await pg.evaluate(SEED); await pg.wait_for_timeout(300)
            over=[]
            for r in ROUTES:
                await pg.goto(U+r); await pg.wait_for_timeout(250)
                ow=await pg.evaluate("""()=>{const W=document.documentElement.clientWidth;const bad=[...document.querySelectorAll('#app *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.right>W+1&&!e.closest('.hscroll,.seg,.tool-row,[style*="overflow"]')}).slice(0,3).map(e=>e.className.baseVal!==undefined?e.tagName:e.tagName+'.'+e.className);return {sw:document.documentElement.scrollWidth,W,bad}}""")
                if ow['sw']>ow['W'] or ow['bad']: over.append((r,ow))
                if (name,r) in [('320','#/home'),('320','#/habits?tab=week'),('768','#/home'),('768','#/habits?tab=week'),('1024','#/home'),('1440','#/home'),('1440','#/habits?tab=week'),('1440','#/exercise/press-banca'),('1440','#/gym?tab=exercises'),('1440','#/progress?tab=general'),('1440','#/habits?tab=calendar'),('land','#/home'),('1440','#/workout'),('1024','#/habits?tab=week')]:
                    await pg.screenshot(path=SHOTS+f'/r-{name}-{r.replace("#/","").replace("?tab=","-").replace("/","-")}.png')
            # sheet as modal
            await pg.goto(U+'#/habits?tab=today'); await pg.wait_for_timeout(300)
            if not await pg.query_selector('.fab'):
                await pg.screenshot(path=SHOTS+f'/r-{name}-nofab.png'); print('NOFAB', name, (await pg.inner_text('body'))[:300])
            await pg.click('.fab', timeout=5000); await pg.wait_for_timeout(400)
            if name in ('768','1440'): await pg.screenshot(path=SHOTS+f'/r-{name}-sheet.png')
            out[name]={'overflow':over,'errors':errs}
            await pg.close()
        await b.close()
    print(json.dumps(out,indent=1,ensure_ascii=False)[:3000])
asyncio.run(main())
