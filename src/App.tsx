import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set } from "firebase/database";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

// ─── STEP 1: REPLACE EVERYTHING BELOW WITH YOUR FIREBASE CONFIG ───────────────
const firebaseConfig = {
  apiKey: "AIzaSyCWmb-KnKYLDMfcs3xcpigKmX6gp0vcDYY",
  authDomain: "dailydrivee29.firebaseapp.com",
  databaseURL: "https://dailydrivee29-default-rtdb.firebaseio.com",
  projectId: "dailydrivee29",
  storageBucket: "dailydrivee29.firebasestorage.app",
  messagingSenderId: "475363080451",
  appId: "1:475363080451:web:bb19dcef3a4212278a9136"
};
// ─────────────────────────────────────────────────────────────────────────────

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);
const dbr = path => ref(db, `dd/${path}`);
const save = (path, val) => set(dbr(path), val);

const C = {
  bg:'#F5EFE0', card:'#EDE0C8', ring:'#E0D0B8',
  tan:'#C9A96E', br:'#7B4F2E', dk:'#4A2C14', ink:'#2C1A0E',
  mu:'#9C7A5A', so:'#D4B896',
  hi:'#8B3232', hiL:'#FDEAEA',
  md:'#7A6010', mdL:'#FEF3D0',
  lo:'#2E6E2E', loL:'#DFF0DF',
};

const PRAYERS = ['Fajr','Dhuhr','Asr','Maghrib','Isha'];
const TABS    = [{id:'daily',label:'Daily',icon:'🔁'},{id:'one-time',label:'One-Time',icon:'📌'},{id:'weekly',label:'Weekly',icon:'📅'},{id:'study',label:'Study',icon:'📚'}];
const WDAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const fmt     = (d=new Date()) => d.toISOString().split('T')[0];
const TODAY   = fmt();
const DOW     = new Date().getDay();
const pCol    = p => p==='high'?C.hi:p==='medium'?C.md:C.lo;
const pLt     = p => p==='high'?C.hiL:p==='medium'?C.mdL:C.loL;

// ─── DONUT CHART ──────────────────────────────────────────────────────────────
function Donut({ val, max, label, color }) {
  const data = [{ v: val }, { v: Math.max(0, max - val) }];
  return (
    <div style={{ textAlign:'center', position:'relative', width:72 }}>
      <PieChart width={72} height={72}>
        <Pie data={data} innerRadius={24} outerRadius={32}
          startAngle={90} endAngle={-270} dataKey="v" strokeWidth={0}>
          <Cell fill={color || C.br} />
          <Cell fill={C.ring} />
        </Pie>
      </PieChart>
      <div style={{ position:'absolute', top:0, left:0, width:72, height:72,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontSize:14, fontWeight:800, color:C.dk, lineHeight:1 }}>{val}</span>
        <span style={{ fontSize:7, color:C.mu, lineHeight:1.3 }}>/{max}</span>
      </div>
      <div style={{ fontSize:8, color:C.mu, fontWeight:700, letterSpacing:0.5,
        textTransform:'uppercase', marginTop:-3 }}>{label}</div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tasks, setTasks] = useState([]);
  const [nz,    setNz]    = useState({ Fajr:false, Dhuhr:false, Asr:false, Maghrib:false, Isha:false });
  const [qr,    setQr]    = useState(false);
  const [sdq,   setSdq]   = useState(false);
  const [stk,   setStk]   = useState({ namaz:0, quran:0, sadaqah:0, lastNz:'', lastQr:'', lastSdq:'' });
  const [hist,  setHist]  = useState({});
  const [tab,   setTab]   = useState('daily');
  const [form,  setForm]  = useState({ title:'', priority:'medium', dueDate:'', weekDay:DOW, notes:'' });
  const [pom,   setPom]   = useState({ s:25*60, mode:'work', on:false });
  const [rdy,   setRdy]   = useState(false);

  const pomRef  = useRef(null);
  const inRef   = useRef(null);
  const writing = useRef(false);

  // ─── FIREBASE LISTENER ─────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onValue(ref(db, 'dd'), snap => {
      if (writing.current) return;
      const d = snap.val() || {};
      let t = Object.values(d.tasks || {});
      t = t.map(x => x.type==='daily' && x.doneDate!==TODAY ? {...x, done:false, doneDate:null} : x)
           .filter(x => !(x.type==='one-time' && x.done));
      setTasks(t);
      setNz(d['nz_'+TODAY]  || { Fajr:false, Dhuhr:false, Asr:false, Maghrib:false, Isha:false });
      setQr(d['qr_'+TODAY]  || false);
      setSdq(d['sdq_'+TODAY] || false);
      setStk(d.stk  || { namaz:0, quran:0, sadaqah:0, lastNz:'', lastQr:'', lastSdq:'' });
      setHist(d.hist || {});
      setRdy(true);
    });
    return () => unsub();
  }, []);

  const write = async (path, val) => {
    writing.current = true;
    await save(path, val);
    setTimeout(() => { writing.current = false; }, 600);
  };

  // ─── CALC PCT ──────────────────────────────────────────────────────────────
  const calcPct = (t, n, q, s) => {
    let done  = Object.values(n).filter(Boolean).length + (q?1:0) + (s?1:0);
    let total = 7;
    t.forEach(x => {
      if (x.type==='daily') { total++; if(x.done) done++; }
      if (x.type==='weekly' && x.weekDay===DOW) { total++; if(x.done) done++; }
      if (x.type==='study' && x.dueDate && x.dueDate<=TODAY) { total++; if(x.done) done++; }
    });
    return total ? Math.round(done/total*100) : 0;
  };

  // ─── HISTORY UPDATE (instant on every tick) ────────────────────────────────
  useEffect(() => {
    if (!rdy) return;
    const p = calcPct(tasks, nz, qr, sdq);
    setHist(h => { const u = {...h, [TODAY]:p}; write('hist', u); return u; });
  }, [tasks, nz, qr, sdq, rdy]); // eslint-disable-line

  // ─── POMODORO ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (pom.on) {
      pomRef.current = setInterval(() => {
        setPom(p => {
          if (p.s <= 1) {
            clearInterval(pomRef.current);
            const nm = p.mode==='work' ? 'break' : 'work';
            return { mode:nm, s:nm==='work'?25*60:5*60, on:false };
          }
          return { ...p, s:p.s-1 };
        });
      }, 1000);
    }
    return () => clearInterval(pomRef.current);
  }, [pom.on]);

  // ─── TOGGLE ACTIONS ────────────────────────────────────────────────────────
  const toggleNz = pr => {
    const u = { ...nz, [pr]: !nz[pr] };
    setNz(u); write('nz_'+TODAY, u);
    if (Object.values(u).every(Boolean) && stk.lastNz!==TODAY) {
      const ns = { ...stk, namaz:stk.namaz+1, lastNz:TODAY };
      setStk(ns); write('stk', ns);
    }
  };
  const toggleQr = () => {
    const u = !qr; setQr(u); write('qr_'+TODAY, u);
    if (u && stk.lastQr!==TODAY) { const ns={...stk,quran:stk.quran+1,lastQr:TODAY}; setStk(ns); write('stk',ns); }
  };
  const toggleSdq = () => {
    const u = !sdq; setSdq(u); write('sdq_'+TODAY, u);
    if (u && stk.lastSdq!==TODAY) { const ns={...stk,sadaqah:stk.sadaqah+1,lastSdq:TODAY}; setStk(ns); write('stk',ns); }
  };

  // ─── TASK ACTIONS ──────────────────────────────────────────────────────────
  const syncTasks = arr => {
    setTasks(arr);
    write('tasks', Object.fromEntries(arr.map(t=>[t.id, t])));
  };
  const toggleTask = id => {
    syncTasks(
      tasks.map(t => {
        if (t.id!==id) return t;
        if (t.type==='one-time' && !t.done) return {...t, done:true};
        return {...t, done:!t.done, doneDate:!t.done?TODAY:null};
      }).filter(t => !(t.type==='one-time' && t.done))
    );
  };
  const deleteTask = id => syncTasks(tasks.filter(t=>t.id!==id));
  const addTask = () => {
    if (!form.title.trim()) return;
    const t = {
      id: Date.now().toString(), title:form.title.trim(), type:tab,
      priority:form.priority, dueDate:tab==='study'?form.dueDate:null,
      weekDay:tab==='weekly'?form.weekDay:null,
      notes:form.notes, done:false, doneDate:null,
      createdAt:new Date().toISOString()
    };
    syncTasks([t, ...tasks]);
    setForm(f=>({...f, title:'', notes:'', dueDate:''}));
    setTimeout(()=>inRef.current?.focus(), 30);
  };

  // ─── DERIVED ───────────────────────────────────────────────────────────────
  const pct      = rdy ? calcPct(tasks, nz, qr, sdq) : 0;
  const nzDone   = Object.values(nz).filter(Boolean).length;
  const todayT   = tasks.filter(t =>
    t.type==='daily' || t.type==='one-time' ||
    (t.type==='weekly' && t.weekDay===DOW) ||
    (t.type==='study' && t.dueDate && t.dueDate<=TODAY)
  );
  const todayDone = todayT.filter(t=>t.done).length;
  const overdue  = tasks.filter(t=>t.type==='study'&&t.dueDate&&t.dueDate<TODAY&&!t.done);
  const urgent   = tasks.filter(t=>t.priority==='high'&&!t.done&&(
    t.type==='daily'||(t.type==='weekly'&&t.weekDay===DOW)||
    (t.type==='study'&&t.dueDate&&t.dueDate<=TODAY)||t.type==='one-time'
  ));
  const tabTasks = tasks.filter(t=>t.type===tab);
  const weekData = Array.from({length:7}, (_,i) => {
    const d = new Date(); d.setDate(d.getDate()-6+i);
    return { name:WDAYS[d.getDay()], v:hist[fmt(d)]||0, isToday:fmt(d)===TODAY };
  });

  const mm   = String(Math.floor(pom.s/60)).padStart(2,'0');
  const ss   = String(pom.s%60).padStart(2,'0');
  const msg  = pct>=85?'🌟 Excellent!':pct>=65?'👍 Good':pct>=40?'💪 Keep going':'🌅 Starting up';
  const card = { background:C.card, borderRadius:14, padding:'13px 15px', marginBottom:10, border:'1px solid rgba(123,79,46,0.13)' };

  // ─── LOADING ───────────────────────────────────────────────────────────────
  if (!rdy) return (
    <div style={{ background:C.bg, height:'100vh', display:'flex', alignItems:'center',
      justifyContent:'center', flexDirection:'column', gap:12 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width:34, height:34, borderRadius:'50%',
        border:`3px solid ${C.tan}`, borderTopColor:'transparent',
        animation:'spin 0.8s linear infinite' }}/>
      <div style={{ color:C.br, fontSize:13, fontFamily:'Georgia,serif' }}>Loading DailyDrive…</div>
    </div>
  );

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background:C.bg, minHeight:'100vh', maxWidth:820,
      margin:'0 auto', paddingBottom:50,
      fontFamily:'"Segoe UI",system-ui,sans-serif', color:C.ink }}>

      {/* ══ HEADER ══ */}
      <div style={{ background:C.dk, padding:'14px 20px 12px', position:'sticky', top:0, zIndex:20,
        boxShadow:'0 3px 18px rgba(0,0,0,0.3)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:14 }}>
          <div style={{ flex:1 }}>
            <div style={{ color:C.tan, fontSize:7.5, letterSpacing:3.5, textTransform:'uppercase', fontWeight:700 }}>
              DailyDrive · VTU CSE 4th Sem
            </div>
            <div style={{ color:'#fff', fontSize:20, fontWeight:700, fontFamily:'Georgia,serif', marginTop:1 }}>
              Danish's Dashboard
            </div>
            <div style={{ color:C.so, fontSize:10, marginTop:2 }}>
              {new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}
            </div>
          </div>
          {/* Pomodoro */}
          <div style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)',
            borderRadius:11, padding:'7px 12px', textAlign:'center', minWidth:95 }}>
            <div style={{ color:pom.mode==='work'?C.tan:'#7ECA9C', fontSize:7.5,
              letterSpacing:2.5, textTransform:'uppercase', marginBottom:2, fontWeight:700 }}>
              {pom.mode==='work'?'🍅 Focus':'☕ Break'}
            </div>
            <div style={{ color:'#fff', fontSize:24, fontWeight:700, fontFamily:'monospace', letterSpacing:3 }}>
              {mm}:{ss}
            </div>
            <div style={{ display:'flex', gap:4, marginTop:5, justifyContent:'center' }}>
              <button onClick={()=>setPom(p=>({...p,on:!p.on}))}
                style={{ background:pom.on?'#8B3232':C.tan, color:'#fff', border:'none',
                  borderRadius:5, padding:'3px 12px', fontSize:13, cursor:'pointer', fontWeight:700 }}>
                {pom.on?'⏸':'▶'}
              </button>
              <button onClick={()=>{clearInterval(pomRef.current);setPom({s:25*60,mode:'work',on:false});}}
                style={{ background:'rgba(255,255,255,0.12)', color:'#fff', border:'none',
                  borderRadius:5, padding:'3px 8px', fontSize:13, cursor:'pointer' }}>↺</button>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ marginTop:11 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
            <span style={{ color:C.so, fontSize:8, letterSpacing:2.5, textTransform:'uppercase' }}>Today's Score</span>
            <span style={{ color:C.tan, fontSize:12, fontWeight:700 }}>{pct}% · {msg}</span>
          </div>
          <div style={{ background:'rgba(255,255,255,0.08)', borderRadius:99, height:5, overflow:'hidden' }}>
            <div style={{ background:`linear-gradient(90deg,${C.tan},${C.br})`, height:'100%',
              width:`${pct}%`, borderRadius:99, transition:'width 0.45s ease' }}/>
          </div>
        </div>
      </div>

      <div style={{ padding:'12px 18px' }}>

        {/* ══ BANNER ══ */}
        {(overdue.length>0 || urgent.length>0) && (
          <div style={{ background:C.hiL, border:`1px solid ${C.hi}40`, borderLeft:`3px solid ${C.hi}`,
            borderRadius:10, padding:'10px 13px', marginBottom:10 }}>
            <div style={{ fontSize:8, fontWeight:700, letterSpacing:2.5, textTransform:'uppercase',
              color:C.hi, marginBottom:6 }}>⚠ Needs Attention Today</div>
            {overdue.map(t=>(
              <div key={t.id} style={{ fontSize:12, color:C.hi, marginBottom:4, display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:7.5, background:C.hi, color:'#fff', padding:'1px 5px', borderRadius:4, fontWeight:800 }}>OVERDUE</span>
                <strong>{t.title}</strong>
                <span style={{ color:C.mu, fontSize:10 }}>since {t.dueDate}</span>
              </div>
            ))}
            {urgent.filter(t=>!overdue.find(o=>o.id===t.id)).map(t=>(
              <div key={t.id} style={{ fontSize:12, color:C.md, marginBottom:4, display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:7.5, background:C.md, color:'#fff', padding:'1px 5px', borderRadius:4, fontWeight:800 }}>HIGH</span>
                <strong>{t.title}</strong>
              </div>
            ))}
          </div>
        )}

        {/* ══ DONUT OVERVIEW ══ */}
        <div style={{ ...card, padding:'14px 18px' }}>
          <div style={{ fontSize:8.5, fontWeight:700, letterSpacing:2.5, textTransform:'uppercase',
            color:C.mu, marginBottom:13 }}>Today's Overview</div>
          <div style={{ display:'flex', justifyContent:'space-around', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
            <Donut val={nzDone} max={5} label="Salah" color={C.br}/>
            <Donut val={qr?1:0} max={1} label="Quran" color="#2E6E2E"/>
            <Donut val={sdq?1:0} max={1} label="Sadaqah" color="#5A7A2E"/>
            <Donut val={todayDone} max={Math.max(todayT.length,1)} label="Tasks" color={C.tan}/>
            <div style={{ textAlign:'center', width:72, paddingTop:8 }}>
              <div style={{ fontSize:28, fontWeight:800, lineHeight:1,
                color:pct>=80?C.lo:pct>=50?C.md:C.hi }}>{pct}%</div>
              <div style={{ fontSize:9, color:C.mu, marginTop:4, fontWeight:600 }}>Overall</div>
              <div style={{ fontSize:7.5, color:C.br, fontWeight:700, marginTop:1, letterSpacing:0.5 }}>{msg}</div>
            </div>
          </div>
        </div>

        {/* ══ SALAH + QURAN + SADAQAH ══ */}
        <div style={card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <span style={{ fontSize:13, fontWeight:700, color:C.dk, fontFamily:'Georgia,serif' }}>🕌 Salah</span>
            <span style={{ fontSize:11, color:C.br, fontWeight:600 }}>🔥 {stk.namaz} day streak</span>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            {PRAYERS.map(pr=>(
              <button key={pr} onClick={()=>toggleNz(pr)} style={{
                flex:1, padding:'8px 2px', border:'none', borderRadius:9, cursor:'pointer',
                fontSize:7.5, fontWeight:800, letterSpacing:0.3, textTransform:'uppercase',
                background:nz[pr]?C.br:C.bg, color:nz[pr]?'#fff':C.mu,
                transition:'all 0.2s', boxShadow:nz[pr]?'0 2px 8px rgba(74,44,20,0.35)':'none'
              }}>
                {pr.slice(0,3)}<br/>
                <span style={{ fontSize:16 }}>{nz[pr]?'✓':'○'}</span>
              </button>
            ))}
          </div>
          {[
            { icon:'📖', label:'Quran Daily',   streak:stk.quran,   done:qr,  toggle:toggleQr  },
            { icon:'🤲', label:'Sadaqah Daily', streak:stk.sadaqah, done:sdq, toggle:toggleSdq },
          ].map(row=>(
            <div key={row.label} style={{ marginTop:9, paddingTop:9,
              borderTop:'1px solid rgba(123,79,46,0.1)',
              display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:12, fontWeight:700, color:C.dk }}>{row.icon} {row.label}</span>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:10, color:C.br }}>🔥 {row.streak} days</span>
                <button onClick={row.toggle} style={{
                  padding:'5px 14px', border:'none', borderRadius:8, cursor:'pointer',
                  fontSize:12, fontWeight:700,
                  background:row.done?C.lo:C.bg, color:row.done?'#fff':C.mu,
                  transition:'all 0.2s', boxShadow:row.done?'0 2px 8px rgba(46,110,46,0.28)':'none'
                }}>{row.done?'✓ Done':'Mark Done'}</button>
              </div>
            </div>
          ))}
        </div>

        {/* ══ TASKS ══ */}
        <div style={card}>
          {/* Tabs */}
          <div style={{ display:'flex', gap:3, marginBottom:11, background:C.bg, borderRadius:9, padding:3 }}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{
                flex:1, padding:'5px 2px', border:'none', borderRadius:7, cursor:'pointer',
                fontSize:9, fontWeight:700, lineHeight:1.4,
                background:tab===t.id?C.dk:'transparent',
                color:tab===t.id?'#fff':C.mu, transition:'all 0.2s'
              }}>
                <div style={{ fontSize:13 }}>{t.icon}</div>{t.label}
              </button>
            ))}
          </div>
          {/* Add form */}
          <div style={{ background:C.bg, borderRadius:9, padding:10, marginBottom:10 }}>
            <div style={{ display:'flex', gap:6, marginBottom:7 }}>
              <input ref={inRef} value={form.title}
                onChange={e=>setForm(f=>({...f,title:e.target.value}))}
                onKeyDown={e=>{ if(e.key==='Tab'){e.preventDefault();addTask();} if(e.key==='Enter')addTask(); }}
                placeholder={`Add ${tab} task… Tab or ↵ to add`}
                style={{ flex:1, background:'#fff', border:`1.5px solid ${C.so}`, borderRadius:7,
                  padding:'7px 10px', fontSize:12, color:C.ink, outline:'none', fontFamily:'inherit' }}
              />
              <select value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}
                style={{ background:pLt(form.priority), border:`1.5px solid ${pCol(form.priority)}60`,
                  borderRadius:7, padding:'5px', fontSize:10, color:pCol(form.priority),
                  fontWeight:800, cursor:'pointer', outline:'none' }}>
                <option value="high">🔴 Hi</option>
                <option value="medium">🟡 Med</option>
                <option value="low">🟢 Lo</option>
              </select>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
                onKeyDown={e=>{ if(e.key==='Enter')addTask(); }}
                placeholder="Notes (optional)"
                style={{ flex:1, background:'#fff', border:`1.5px solid ${C.so}`, borderRadius:7,
                  padding:'6px 10px', fontSize:11, color:C.ink, outline:'none', fontFamily:'inherit' }}
              />
              {tab==='study' && (
                <input type="date" value={form.dueDate}
                  onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))}
                  style={{ background:'#fff', border:`1.5px solid ${C.so}`, borderRadius:7,
                    padding:'5px 7px', fontSize:11, color:C.ink, outline:'none', cursor:'pointer' }}
                />
              )}
              {tab==='weekly' && (
                <select value={form.weekDay} onChange={e=>setForm(f=>({...f,weekDay:Number(e.target.value)}))}
                  style={{ background:'#fff', border:`1.5px solid ${C.so}`, borderRadius:7,
                    padding:'5px 6px', fontSize:11, color:C.ink, outline:'none', cursor:'pointer' }}>
                  {WDAYS.map((d,i)=><option key={i} value={i}>{d}</option>)}
                </select>
              )}
              <button onClick={addTask}
                style={{ background:C.dk, color:'#fff', border:'none', borderRadius:7,
                  padding:'5px 15px', fontSize:17, fontWeight:700, cursor:'pointer' }}>+</button>
            </div>
          </div>
          {/* List */}
          <div style={{ maxHeight:340, overflowY:'auto', display:'flex', flexDirection:'column', gap:5 }}>
            {tabTasks.length===0 && (
              <div style={{ textAlign:'center', color:C.mu, fontSize:12, padding:'22px 0', fontStyle:'italic' }}>
                No {tab} tasks yet — type above and press Tab
              </div>
            )}
            {tabTasks.map(t => {
              const isOver = t.type==='study' && t.dueDate && t.dueDate<TODAY && !t.done;
              return (
                <div key={t.id} style={{
                  background:t.done?'rgba(0,0,0,0.02)':'#fff', borderRadius:9, padding:'9px 10px',
                  border:`1px solid ${isOver?C.hi+'55':C.so+'60'}`,
                  opacity:t.done?0.5:1, transition:'opacity 0.2s'
                }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:9 }}>
                    <button onClick={()=>toggleTask(t.id)} style={{
                      marginTop:2, width:20, height:20, minWidth:20, borderRadius:'50%',
                      border:`2px solid ${t.done?C.lo:C.so}`, background:t.done?C.lo:'transparent',
                      cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:11, color:'#fff', transition:'all 0.2s', flexShrink:0
                    }}>{t.done?'✓':''}</button>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap', marginBottom:t.notes?3:0 }}>
                        <span style={{ fontSize:12, fontWeight:t.done?400:600,
                          textDecoration:t.done?'line-through':'none',
                          color:t.done?C.mu:C.ink, wordBreak:'break-word' }}>{t.title}</span>
                        <span style={{ fontSize:7.5, fontWeight:800, padding:'1px 5px', borderRadius:99,
                          background:pLt(t.priority), color:pCol(t.priority),
                          textTransform:'uppercase', letterSpacing:0.8, whiteSpace:'nowrap' }}>{t.priority}</span>
                        {isOver && <span style={{ fontSize:7.5, fontWeight:800, color:'#fff',
                          background:C.hi, padding:'1px 5px', borderRadius:4 }}>OVERDUE</span>}
                        {t.dueDate&&!isOver&&!t.done && <span style={{ fontSize:10, color:C.mu }}>📅 {t.dueDate}</span>}
                        {t.weekDay!=null && <span style={{ fontSize:10, color:C.mu }}>{WDAYS[t.weekDay]}s</span>}
                      </div>
                      {t.notes && <div style={{ fontSize:11, color:C.mu, fontStyle:'italic' }}>{t.notes}</div>}
                    </div>
                    <button onClick={()=>deleteTask(t.id)}
                      style={{ background:'none', border:'none', color:C.so,
                        cursor:'pointer', fontSize:18, padding:'0 2px', lineHeight:1,
                        flexShrink:0, marginTop:-1 }}>×</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ══ CHARTS ══ */}
        <div style={card}>
          <div style={{ fontSize:13, fontWeight:700, color:C.dk, marginBottom:13, fontFamily:'Georgia,serif' }}>
            📈 7-Day Progress Trend
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={weekData} margin={{ top:5, right:8, bottom:0, left:-25 }}>
              <XAxis dataKey="name" tick={{ fontSize:9, fill:C.mu }} axisLine={false} tickLine={false}/>
              <YAxis domain={[0,100]} tick={false} axisLine={false} tickLine={false}/>
              <Tooltip
                formatter={v=>[`${v}%`, 'Score']}
                contentStyle={{ background:C.card, border:`1px solid ${C.so}`, borderRadius:8, fontSize:11 }}
              />
              <Line type="monotone" dataKey="v" stroke={C.br} strokeWidth={2.5}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  return <circle key={`dot-${cx}`} cx={cx} cy={cy}
                    r={payload.isToday ? 5 : 3}
                    fill={payload.isToday ? C.br : C.tan}
                    strokeWidth={payload.isToday ? 2 : 0}
                    stroke="#fff"/>;
                }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ marginTop:14, padding:'9px 13px', background:C.bg,
            borderRadius:8, borderLeft:`3px solid ${C.tan}`, textAlign:'center' }}>
            <span style={{ fontSize:11, color:C.br, fontStyle:'italic', fontFamily:'Georgia,serif' }}>
              Persistency &gt;&gt;&gt;&gt; Consistency
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
