const path=require('path').join(__dirname,'..','js')+'/';
require(path+'config/xp.js');
['core/dates.js','core/store.js','core/perf.js','domain/rules.js','data/exercises.js','domain/habits.js','domain/gym.js','domain/progress.js','domain/coach.js','domain/game.js'].forEach(f=>require(path+f));
const {dates:D,habits:H,progress:P,gym:G,store:S}=globalThis.ASC;
const assert=require('assert');
let st=S.emptyState(); st.createdAt='2026-11-01T12:00:00';
// 2026-11-23 is Monday
assert.equal(D.weekday('2026-11-23'),1);
assert.equal(D.weekStart('2026-11-29'),'2026-11-23');
const daily={id:'a',name:'Leer',freqType:'daily',days:[],startDate:'2026-11-16'};
const mwf={id:'b',name:'Gym',freqType:'weekdays',days:[1,3,5],startDate:'2026-11-16'};
const wk={id:'c',name:'Correr',freqType:'weekly',timesPerWeek:2,startDate:'2026-11-09'};
st.habits=[daily,mwf,wk];
const T='2026-11-23';
['2026-11-19','2026-11-20','2026-11-21','2026-11-22'].forEach(k=>H.forceToggle(st,'a',k));
assert.deepEqual(H.currentStreak(st,daily,T),{value:4,unit:'días'}); // today pending doesn't break
H.forceToggle(st,'a',T); assert.equal(H.currentStreak(st,daily,T).value,5);
// MWF: done 16(Mon),18(Wed),20(Fri); not scheduled 17,19,21,22 -> streak 3, today Monday pending
['2026-11-16','2026-11-18','2026-11-20'].forEach(k=>H.forceToggle(st,'b',k));
assert.equal(H.currentStreak(st,mwf,T).value,3);
assert.equal(H.bestStreak(st,mwf,T).value,3);
// weekly: week of 9: start mid? started Mon 9 -> need 2. done 10,12 ; week 16: done 17,19; current week 23 pending
['2026-11-10','2026-11-12','2026-11-17','2026-11-19'].forEach(k=>H.forceToggle(st,'c',k));
assert.deepEqual(H.currentStreak(st,wk,T),{value:2,unit:'semanas'});
// range stats MWF last week: Mon16..Sun22 -> 3 scheduled 3 done
assert.deepEqual(H.habitRangeStats(st,mwf,'2026-11-16','2026-11-22'),{scheduled:3,done:3,pct:1});
// day status: Sat 21: daily done, mwf not scheduled, weekly not done -> full
assert.equal(H.dayStatus(st,'2026-11-21',T).status,'full');
// Tue 17: daily not done(started 16, done from 19), weekly done -> partial
assert.equal(H.dayStatus(st,'2026-11-17',T).status,'partial');
// consistency streak back from today
console.log('consistency',P.consistencyStreak(st,T),'best',P.bestConsistency(st,T));
console.log('xp',P.xp(st,T).total,P.xp(st,T).level);
// level math
assert.equal(P.levelInfo(0).level,1); assert.equal(P.levelInfo(50).level,2); assert.equal(P.levelInfo(124).level,2); assert.equal(P.levelInfo(125).level,3);
assert.equal(P.levelInfo(0).rank,'Idea'); assert.equal(P.levelInfo(globalThis.ASC.game.xpForLevel(51)).rank,'Disciplina pura');
// gym
st.routines=[{id:'r1',name:'Push',days:[1],items:[{id:'i',exerciseId:'press-banca',sets:3,reps:8,weight:60,rest:90}]}];
let s1=G.createSessionFromRoutine(st,st.routines[0]); s1.startedAt='2026-11-16T18:00:00'; s1.sets=null;
s1.exercises[0].sets.forEach(x=>{x.done=true}); s1.status='completed'; s1.endedAt='2026-11-16T19:00:00'; st.sessions.push(s1);
let s2=G.createSessionFromRoutine(st,st.routines[0]); s2.startedAt='2026-11-23T18:00:00';
s2.exercises[0].sets[0].weight=65; s2.exercises[0].sets[0].done=true; s2.status='completed'; s2.endedAt='2026-11-23T18:50:00'; st.sessions.push(s2);
assert.equal(G.sessionPRs(st,s2).length,1); assert.equal(G.totalPRs(st),1);
assert.equal(G.records(st,'press-banca').maxWeight.weight,65);
assert.equal(G.sessionStats(s1).volume,60*8*3);
console.log('achievements',P.achievements(st,T).filter(a=>a.unlocked).map(a=>a.key));
// biblioteca y recomendador
const X=globalThis.ASC.exerciseData, C=globalThis.ASC.coach;
const ids=new Set(X.LIBRARY.map(e=>e.id)); assert.equal(ids.size,X.LIBRARY.length,'ids duplicados');
X.LIBRARY.forEach(e=>assert.ok(X.regionLabel(e.muscle,e.region),'zona inválida '+e.id));
for(const k in C.REGIONS){C.REGIONS[k].prefer.forEach(p=>assert.ok(ids.has(p),'prefer inexistente '+p)); if(C.REGIONS[k].ev) assert.ok(C.EVIDENCE[C.REGIONS[k].ev],'evidencia inexistente '+k)}
const rb=C.recommend(st,'press-banca'); assert.equal(rb[0].ex.id,'press-inclinado-manc');
assert.equal(C.recommend(st,'ext-triceps-polea')[0].ex.id,'ext-overhead-polea');
assert.ok(C.recommend(st,'curl-femoral').some(r=>r.ex.id==='curl-femoral-sentado'));
X.LIBRARY.forEach(e=>C.recommend(st,e.id)); // no debe romper con ningún ejercicio
console.log('biblioteca',X.LIBRARY.length,'ejercicios');
// juego semanal
const GM=globalThis.ASC.game; const ws0=D.weekStart(T);
const wk0=GM.ensureWeek(st,ws0,T); assert.ok(wk0.missions.length>=2,'misiones');
const m1=JSON.stringify(wk0.missions); GM.ensureWeek(st,ws0,T); assert.equal(JSON.stringify(st.weeks[ws0].missions),m1,'misiones estables');
const plan=GM.planWeek(st,ws0,'suave',T); assert.ok(plan.target>=1 && plan.target<=plan.total);
const xpBefore=P.xp(st,T).total; st.weeks[ws0].plan.target=1; assert.ok(P.xp(st,T).total>=xpBefore+100,'desafío cumplido suma XP');
assert.equal(GM.tierFor(0).name,'Semilla'); assert.equal(GM.tierFor(100).name,'Roble');
assert.equal(GM.streakBonus(7),100);
console.log('OK');
