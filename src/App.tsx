import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCWmb-KnKYLDMfcs3xcpigKmX6gp0vcDYY",
  authDomain: "dailydrivee29.firebaseapp.com",
  databaseURL: "https://dailydrivee29-default-rtdb.firebaseio.com",
  projectId: "dailydrivee29",
  storageBucket: "dailydrivee29.firebasestorage.app",
  messagingSenderId: "475363080451",
  appId: "1:475363080451:web:bb19dcef3a4212278a9136"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
import { useState, useEffect, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";

const C = {
  bg: "#F5EFE0",
  card: "#EDE0C8",
  card2: "#E5D5B5",
  tan: "#C9A96E",
  br: "#7B4F2E",
  dk: "#4A2C14",
  ink: "#2C1A0E",
  mu: "#9C7A5A",
  so: "#D4B896",
  hi: "#8B3232",
  hiL: "#FDEAEA",
  md: "#7A6010",
  mdL: "#FEF3D0",
  lo: "#2E6E2E",
  loL: "#DFF0DF",
};

const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
const TABS = [
  { id: "daily", label: "Daily", icon: "🔁" },
  { id: "one-time", label: "One-Time", icon: "📌" },
  { id: "weekly", label: "Weekly", icon: "📅" },
  { id: "study", label: "Study", icon: "📚" },
];
const WDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const fmt = (d = new Date()) => d.toISOString().split("T")[0];
const TODAY = fmt();
const DOW = new Date().getDay();

const ST = {
  get: async (k: string) => {
    try {
      const snap = await get(ref(db, k));
      return snap.exists() ? snap.val() : null;
    } catch { return null; }
  },
  set: async (k: string, v: any) => {
    try { await set(ref(db, k), v); }
    catch {}
  },
};
const pCol = (p) => (p === "high" ? C.hi : p === "medium" ? C.md : C.lo);
const pLt = (p) => (p === "high" ? C.hiL : p === "medium" ? C.mdL : C.loL);
const pLbl = (p) =>
  p === "high" ? "🔴 High" : p === "medium" ? "🟡 Med" : "🟢 Low";

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [nz, setNz] = useState({
    Fajr: false,
    Dhuhr: false,
    Asr: false,
    Maghrib: false,
    Isha: false,
  });
  const [qr, setQr] = useState(false);
  const [sdq, setSdq] = useState(false);
  const [stk, setStk] = useState({
    namaz: 0,
    quran: 0,
    sadaqah: 0,
    lastNz: "",
    lastQr: "",
    lastSdq: "",
  });
  const [hist, setHist] = useState({});
  const [tab, setTab] = useState("daily");
  const [form, setForm] = useState({
    title: "",
    priority: "medium",
    dueDate: "",
    weekDay: DOW,
    notes: "",
  });
  const [pom, setPom] = useState({ s: 25 * 60, mode: "work", on: false });
  const [rdy, setRdy] = useState(false);
  const isRdy = useRef(false);
  const pomRef = useRef(null);
  const inRef = useRef(null);

  // ─── LOAD ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      let t = (await ST.get("tasks_v3")) || [];
      // reset daily tasks on new day; remove completed one-time
      t = t
        .map((x) =>
          x.type === "daily" && x.doneDate !== TODAY
            ? { ...x, done: false, doneDate: null }
            : x
        )
        .filter((x) => !(x.type === "one-time" && x.done));
      const nzS = (await ST.get("nz_" + TODAY)) || {
        Fajr: false,
        Dhuhr: false,
        Asr: false,
        Maghrib: false,
        Isha: false,
      };
      const qrS = (await ST.get("qr_" + TODAY)) || false;
      const sdqS = (await ST.get("sdq_" + TODAY)) || false;
      const stkS = (await ST.get("stk_v2")) || {
        namaz: 0,
        quran: 0,
        lastNz: "",
        lastQr: "",
      };
      const hS = (await ST.get("hist_v2")) || {};
      setTasks(t);
      setNz(nzS);
      setQr(qrS);
      setSdq(sdqS);
      setStk(stkS);
      setHist(hS);
      isRdy.current = true;
      setRdy(true);
    })();
  }, []);

  // ─── PERSIST ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isRdy.current) ST.set("tasks_v3", tasks);
  }, [tasks]);
  useEffect(() => {
    if (isRdy.current) ST.set("nz_" + TODAY, nz);
  }, [nz]);
  useEffect(() => {
    if (isRdy.current) ST.set("qr_" + TODAY, qr);
  }, [qr]);
  useEffect(() => {
    if (isRdy.current) ST.set("sdq_" + TODAY, sdq);
  }, [sdq]);
  useEffect(() => {
    if (isRdy.current) ST.set("stk_v2", stk);
  }, [stk]);

  // ─── HISTORY (instant) ───────────────────────────────────────────────────────
  const calcPct = (t, n, q, s) => {
    let done =
        Object.values(n).filter(Boolean).length + (q ? 1 : 0) + (s ? 1 : 0),
      total = 7;
    t.forEach((x) => {
      if (x.type === "daily") {
        total++;
        if (x.done) done++;
      }
      if (x.type === "weekly" && x.weekDay === DOW) {
        total++;
        if (x.done) done++;
      }
      if (x.type === "study" && x.dueDate && x.dueDate <= TODAY) {
        total++;
        if (x.done) done++;
      }
    });
    return total ? Math.round((done / total) * 100) : 0;
  };
  useEffect(() => {
    if (!isRdy.current) return;
    const p = calcPct(tasks, nz, qr, sdq);
    setHist((h) => {
      const u = { ...h, [TODAY]: p };
      ST.set("hist_v2", u);
      return u;
    });
  }, [tasks, nz, qr, sdq]);

  // ─── POMODORO ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (pom.on) {
      pomRef.current = setInterval(() => {
        setPom((p) => {
          if (p.s <= 1) {
            clearInterval(pomRef.current);
            const nm = p.mode === "work" ? "break" : "work";
            return { mode: nm, s: nm === "work" ? 25 * 60 : 5 * 60, on: false };
          }
          return { ...p, s: p.s - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(pomRef.current);
  }, [pom.on]);

  // ─── ACTIONS ─────────────────────────────────────────────────────────────────
  const toggleNz = (pr) => {
    const u = { ...nz, [pr]: !nz[pr] };
    setNz(u);
    if (Object.values(u).every(Boolean) && stk.lastNz !== TODAY)
      setStk((s) => ({ ...s, namaz: s.namaz + 1, lastNz: TODAY }));
  };

  const toggleQr = () => {
    const u = !qr;
    setQr(u);
    if (u && stk.lastQr !== TODAY)
      setStk((s) => ({ ...s, quran: s.quran + 1, lastQr: TODAY }));
  };

  const toggleSdq = () => {
    const u = !sdq;
    setSdq(u);
    if (u && stk.lastSdq !== TODAY)
      setStk((s) => ({ ...s, sadaqah: s.sadaqah + 1, lastSdq: TODAY }));
  };

  const toggleTask = (id) => {
    setTasks((prev) =>
      prev
        .map((t) => {
          if (t.id !== id) return t;
          if (t.type === "one-time" && !t.done) return { ...t, done: true };
          return { ...t, done: !t.done, doneDate: !t.done ? TODAY : null };
        })
        .filter((t) => !(t.type === "one-time" && t.done))
    );
  };

  const deleteTask = (id) => setTasks((p) => p.filter((t) => t.id !== id));

  const addTask = () => {
    if (!form.title.trim()) return;
    setTasks((p) => [
      {
        id: Date.now().toString(),
        title: form.title.trim(),
        type: tab,
        priority: form.priority,
        dueDate: tab === "study" ? form.dueDate : null,
        weekDay: tab === "weekly" ? form.weekDay : null,
        notes: form.notes,
        done: false,
        doneDate: null,
        createdAt: new Date().toISOString(),
      },
      ...p,
    ]);
    setForm((f) => ({ ...f, title: "", notes: "", dueDate: "" }));
    setTimeout(() => inRef.current?.focus(), 30);
  };

  // ─── DERIVED ─────────────────────────────────────────────────────────────────
  const pct = rdy ? calcPct(tasks, nz, qr, sdq) : 0;
  const overdue = tasks.filter(
    (t) => t.type === "study" && t.dueDate && t.dueDate < TODAY && !t.done
  );
  const urgent = tasks.filter(
    (t) =>
      t.priority === "high" &&
      !t.done &&
      (t.type === "daily" ||
        (t.type === "weekly" && t.weekDay === DOW) ||
        (t.type === "study" && t.dueDate && t.dueDate <= TODAY) ||
        t.type === "one-time")
  );
  const tabTasks = tasks.filter((t) => t.type === tab);

  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    return {
      name: WDAYS[d.getDay()],
      v: hist[fmt(d)] || 0,
      isToday: fmt(d) === TODAY,
    };
  });
  const monthData = Array.from({ length: 4 }, (_, wi) => {
    let s = 0,
      c = 0;
    for (let d = 0; d < 7; d++) {
      const day = new Date();
      day.setDate(day.getDate() - 27 + wi * 7 + d);
      const k = fmt(day);
      if (hist[k] != null) {
        s += hist[k];
        c++;
      }
    }
    return { name: `W${wi + 1}`, v: c ? Math.round(s / c) : 0 };
  });

  const mm = String(Math.floor(pom.s / 60)).padStart(2, "0");
  const ss = String(pom.s % 60).padStart(2, "0");

  const scoreMsg =
    pct >= 85
      ? "🌟 Excellent!"
      : pct >= 65
      ? "👍 Good progress"
      : pct >= 40
      ? "💪 Keep going"
      : "🌅 Just starting";

  // ─── LOADING ─────────────────────────────────────────────────────────────────
  if (!rdy)
    return (
      <div
        style={{
          background: C.bg,
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: C.br,
          fontSize: 18,
          fontFamily: "Georgia,serif",
        }}
      >
        Loading…
      </div>
    );

  // ─── STYLES ──────────────────────────────────────────────────────────────────
  const card = {
    background: C.card,
    borderRadius: 12,
    padding: "13px 14px",
    marginBottom: 12,
    border: "1px solid rgba(123,79,46,0.13)",
  };

  return (
    <div
      style={{
        background: C.bg,
        minHeight: "100vh",
        maxWidth: 500,
        margin: "0 auto",
        paddingBottom: 50,
        fontFamily: '"Segoe UI",system-ui,sans-serif',
        color: C.ink,
      }}
    >
      {/* ═══ HEADER ═══════════════════════════════════════════════════════════ */}
      <div
        style={{
          background: C.dk,
          padding: "15px 16px 13px",
          position: "sticky",
          top: 0,
          zIndex: 20,
          boxShadow: "0 3px 16px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                color: C.tan,
                fontSize: 8,
                letterSpacing: 3.5,
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              System · 4th Sem
            </div>
            <div
              style={{
                color: "#fff",
                fontSize: 19,
                fontWeight: 700,
                fontFamily: "Georgia,serif",
                marginTop: 1,
                letterSpacing: "-0.3px",
              }}
            >
              Danish's Dashboard
            </div>
            <div style={{ color: C.so, fontSize: 10, marginTop: 2 }}>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </div>

          {/* Pomodoro */}
          <div
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10,
              padding: "7px 10px",
              textAlign: "center",
              minWidth: 88,
            }}
          >
            <div
              style={{
                color: pom.mode === "work" ? C.tan : "#7ECA9C",
                fontSize: 7.5,
                letterSpacing: 2.5,
                textTransform: "uppercase",
                marginBottom: 2,
                fontWeight: 700,
              }}
            >
              {pom.mode === "work" ? "🍅 Focus" : "☕ Break"}
            </div>
            <div
              style={{
                color: "#fff",
                fontSize: 23,
                fontWeight: 700,
                fontFamily: "monospace",
                letterSpacing: 3,
              }}
            >
              {mm}:{ss}
            </div>
            <div
              style={{
                display: "flex",
                gap: 4,
                marginTop: 5,
                justifyContent: "center",
              }}
            >
              <button
                onClick={() => setPom((p) => ({ ...p, on: !p.on }))}
                style={{
                  background: pom.on ? "#8B3232" : C.tan,
                  color: "#fff",
                  border: "none",
                  borderRadius: 5,
                  padding: "3px 10px",
                  fontSize: 12,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                {pom.on ? "⏸" : "▶"}
              </button>
              <button
                onClick={() => {
                  clearInterval(pomRef.current);
                  setPom({ s: 25 * 60, mode: "work", on: false });
                }}
                style={{
                  background: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 5,
                  padding: "3px 7px",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                ↺
              </button>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 11 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <span
              style={{
                color: C.so,
                fontSize: 8,
                letterSpacing: 2.5,
                textTransform: "uppercase",
              }}
            >
              Today's Progress
            </span>
            <span style={{ color: C.tan, fontSize: 11, fontWeight: 700 }}>
              {pct}%
            </span>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.08)",
              borderRadius: 99,
              height: 5,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: `linear-gradient(90deg,${C.tan},${C.br})`,
                height: "100%",
                width: `${pct}%`,
                borderRadius: 99,
                transition: "width 0.5s ease",
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ padding: "12px 14px" }}>
        {/* ═══ BANNER ═══════════════════════════════════════════════════════════ */}
        {(overdue.length > 0 || urgent.length > 0) && (
          <div
            style={{
              background: "#FFF5F0",
              border: `1px solid ${C.hi}35`,
              borderLeft: `3px solid ${C.hi}`,
              borderRadius: 10,
              padding: "10px 13px",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: 2.5,
                textTransform: "uppercase",
                color: C.hi,
                marginBottom: 7,
              }}
            >
              ⚠ Needs Attention Today
            </div>
            {overdue.map((t) => (
              <div
                key={t.id}
                style={{
                  fontSize: 12,
                  color: C.hi,
                  marginBottom: 5,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 7.5,
                    background: C.hi,
                    color: "#fff",
                    padding: "1px 5px",
                    borderRadius: 4,
                    fontWeight: 800,
                    letterSpacing: 0.5,
                    whiteSpace: "nowrap",
                  }}
                >
                  OVERDUE
                </span>
                <strong>{t.title}</strong>
                <span style={{ color: C.mu, fontSize: 10 }}>
                  since {t.dueDate}
                </span>
              </div>
            ))}
            {urgent
              .filter((t) => !overdue.find((o) => o.id === t.id))
              .map((t) => (
                <div
                  key={t.id}
                  style={{
                    fontSize: 12,
                    color: C.md,
                    marginBottom: 5,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 7.5,
                      background: C.md,
                      color: "#fff",
                      padding: "1px 5px",
                      borderRadius: 4,
                      fontWeight: 800,
                      letterSpacing: 0.5,
                      whiteSpace: "nowrap",
                    }}
                  >
                    HIGH
                  </span>
                  <strong>{t.title}</strong>
                </div>
              ))}
          </div>
        )}

        {/* ═══ NAMAZ + QURAN ════════════════════════════════════════════════════ */}
        <div style={card}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: C.dk,
                fontFamily: "Georgia,serif",
              }}
            >
              🕌 Salah
            </span>
            <span style={{ fontSize: 11, color: C.br, fontWeight: 600 }}>
              🔥 {stk.namaz} day streak
            </span>
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            {PRAYERS.map((pr) => (
              <button
                key={pr}
                onClick={() => toggleNz(pr)}
                style={{
                  flex: 1,
                  padding: "7px 2px",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 7.5,
                  fontWeight: 800,
                  letterSpacing: 0.3,
                  textTransform: "uppercase",
                  background: nz[pr] ? C.br : C.bg,
                  color: nz[pr] ? "#fff" : C.mu,
                  transition: "all 0.2s",
                  boxShadow: nz[pr] ? "0 2px 8px rgba(74,44,20,0.35)" : "none",
                }}
              >
                {pr.slice(0, 3)}
                <br />
                <span style={{ fontSize: 15 }}>{nz[pr] ? "✓" : "○"}</span>
              </button>
            ))}
          </div>
          <div
            style={{
              marginTop: 8,
              paddingTop: 8,
              borderTop: "1px solid rgba(123,79,46,0.1)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: C.dk }}>
              🤲 Sadaqah Daily
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, color: C.br }}>
                🔥 {stk.sadaqah} days
              </span>
              <button
                onClick={toggleSdq}
                style={{
                  padding: "5px 14px",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  background: sdq ? C.lo : C.bg,
                  color: sdq ? "#fff" : C.mu,
                  transition: "all 0.2s",
                  boxShadow: sdq ? "0 2px 8px rgba(46,110,46,0.3)" : "none",
                }}
              >
                {sdq ? "✓ Done" : "Mark Done"}
              </button>
            </div>
          </div>
          <div
            style={{
              marginTop: 8,
              paddingTop: 8,
              borderTop: "1px solid rgba(123,79,46,0.1)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: C.dk }}>
              📖 Quran Daily
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, color: C.br }}>
                🔥 {stk.quran} days
              </span>
              <button
                onClick={toggleQr}
                style={{
                  padding: "5px 14px",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  background: qr ? C.lo : C.bg,
                  color: qr ? "#fff" : C.mu,
                  transition: "all 0.2s",
                  boxShadow: qr ? "0 2px 8px rgba(46,110,46,0.3)" : "none",
                }}
              >
                {qr ? "✓ Done" : "Mark Done"}
              </button>
            </div>
          </div>
        </div>

        {/* ═══ TASKS ════════════════════════════════════════════════════════════ */}
        <div style={card}>
          {/* Tab bar */}
          <div
            style={{
              display: "flex",
              gap: 3,
              marginBottom: 12,
              background: C.bg,
              borderRadius: 9,
              padding: 3,
            }}
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  flex: 1,
                  padding: "5px 2px",
                  border: "none",
                  borderRadius: 7,
                  cursor: "pointer",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: 0.2,
                  lineHeight: 1.4,
                  background: tab === t.id ? C.dk : "transparent",
                  color: tab === t.id ? "#fff" : C.mu,
                  transition: "all 0.2s",
                }}
              >
                <div style={{ fontSize: 13 }}>{t.icon}</div>
                {t.label}
              </button>
            ))}
          </div>

          {/* Add form */}
          <div
            style={{
              background: C.bg,
              borderRadius: 9,
              padding: "10px",
              marginBottom: 10,
            }}
          >
            <div style={{ display: "flex", gap: 6, marginBottom: 7 }}>
              <input
                ref={inRef}
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Tab") {
                    e.preventDefault();
                    addTask();
                  }
                  if (e.key === "Enter") addTask();
                }}
                placeholder={`Add ${tab} task… Tab or ↵ to add`}
                style={{
                  flex: 1,
                  background: "#fff",
                  border: `1.5px solid ${C.so}`,
                  borderRadius: 7,
                  padding: "7px 10px",
                  fontSize: 12,
                  color: C.ink,
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
              <select
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: e.target.value }))
                }
                style={{
                  background: pLt(form.priority),
                  border: `1.5px solid ${pCol(form.priority)}60`,
                  borderRadius: 7,
                  padding: "5px 5px",
                  fontSize: 10,
                  color: pCol(form.priority),
                  fontWeight: 800,
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="high">🔴 Hi</option>
                <option value="medium">🟡 Med</option>
                <option value="low">🟢 Lo</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTask();
                }}
                placeholder="Notes (optional)"
                style={{
                  flex: 1,
                  background: "#fff",
                  border: `1.5px solid ${C.so}`,
                  borderRadius: 7,
                  padding: "6px 10px",
                  fontSize: 11,
                  color: C.ink,
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
              {tab === "study" && (
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dueDate: e.target.value }))
                  }
                  style={{
                    background: "#fff",
                    border: `1.5px solid ${C.so}`,
                    borderRadius: 7,
                    padding: "5px 7px",
                    fontSize: 11,
                    color: C.ink,
                    outline: "none",
                    cursor: "pointer",
                  }}
                />
              )}
              {tab === "weekly" && (
                <select
                  value={form.weekDay}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, weekDay: Number(e.target.value) }))
                  }
                  style={{
                    background: "#fff",
                    border: `1.5px solid ${C.so}`,
                    borderRadius: 7,
                    padding: "5px 6px",
                    fontSize: 11,
                    color: C.ink,
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  {WDAYS.map((d, i) => (
                    <option key={i} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={addTask}
                style={{
                  background: C.dk,
                  color: "#fff",
                  border: "none",
                  borderRadius: 7,
                  padding: "5px 14px",
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Task list */}
          <div
            style={{
              maxHeight: 300,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 5,
            }}
          >
            {tabTasks.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  color: C.mu,
                  fontSize: 12,
                  padding: "20px 0",
                  fontStyle: "italic",
                }}
              >
                No {tab} tasks yet — type above and press Tab
              </div>
            )}
            {tabTasks.map((t) => {
              const isOver =
                t.type === "study" && t.dueDate && t.dueDate < TODAY && !t.done;
              return (
                <div
                  key={t.id}
                  style={{
                    background: t.done ? "rgba(0,0,0,0.02)" : "#fff",
                    borderRadius: 9,
                    padding: "9px 10px",
                    border: `1px solid ${isOver ? C.hi + "55" : C.so + "60"}`,
                    opacity: t.done ? 0.5 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 9,
                    }}
                  >
                    {/* Tick */}
                    <button
                      onClick={() => toggleTask(t.id)}
                      style={{
                        marginTop: 2,
                        width: 20,
                        height: 20,
                        minWidth: 20,
                        borderRadius: "50%",
                        border: `2px solid ${t.done ? C.lo : C.so}`,
                        background: t.done ? C.lo : "transparent",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        color: "#fff",
                        transition: "all 0.2s",
                        flexShrink: 0,
                      }}
                    >
                      {t.done ? "✓" : ""}
                    </button>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          flexWrap: "wrap",
                          marginBottom: t.notes ? 3 : 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: t.done ? 400 : 600,
                            textDecoration: t.done ? "line-through" : "none",
                            color: t.done ? C.mu : C.ink,
                            wordBreak: "break-word",
                          }}
                        >
                          {t.title}
                        </span>
                        <span
                          style={{
                            fontSize: 7.5,
                            fontWeight: 800,
                            padding: "1px 5px",
                            borderRadius: 99,
                            background: pLt(t.priority),
                            color: pCol(t.priority),
                            textTransform: "uppercase",
                            letterSpacing: 0.8,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {t.priority}
                        </span>
                        {isOver && (
                          <span
                            style={{
                              fontSize: 7.5,
                              fontWeight: 800,
                              color: "#fff",
                              background: C.hi,
                              padding: "1px 5px",
                              borderRadius: 4,
                              letterSpacing: 0.5,
                            }}
                          >
                            OVERDUE
                          </span>
                        )}
                        {t.dueDate && !isOver && !t.done && (
                          <span
                            style={{
                              fontSize: 10,
                              color: C.mu,
                              whiteSpace: "nowrap",
                            }}
                          >
                            📅 {t.dueDate}
                          </span>
                        )}
                        {t.weekDay != null && (
                          <span style={{ fontSize: 10, color: C.mu }}>
                            {WDAYS[t.weekDay]}s
                          </span>
                        )}
                      </div>
                      {t.notes && (
                        <div
                          style={{
                            fontSize: 11,
                            color: C.mu,
                            fontStyle: "italic",
                          }}
                        >
                          {t.notes}
                        </div>
                      )}
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => deleteTask(t.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: C.so,
                        cursor: "pointer",
                        fontSize: 16,
                        padding: "0 2px",
                        lineHeight: 1,
                        flexShrink: 0,
                        marginTop: -1,
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ CHARTS ═══════════════════════════════════════════════════════════ */}
        <div style={card}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: C.dk,
              marginBottom: 12,
              fontFamily: "Georgia,serif",
            }}
          >
            📊 Progress Tracking
          </div>

          {/* Daily score card */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 14,
              background: C.bg,
              borderRadius: 10,
              padding: "12px 14px",
            }}
          >
            <div
              style={{
                fontSize: 40,
                fontWeight: 800,
                fontFamily: "Georgia,serif",
                lineHeight: 1,
                color: pct >= 80 ? C.lo : pct >= 50 ? C.md : C.hi,
              }}
            >
              {pct}%
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.dk }}>
                Today's Score
              </div>
              <div style={{ fontSize: 10, color: C.mu, marginTop: 2 }}>
                Salah + Quran + all tasks
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: C.br,
                  marginTop: 3,
                  fontWeight: 600,
                }}
              >
                {scoreMsg}
              </div>
            </div>
          </div>

          {/* Weekly bar */}
          <div
            style={{
              fontSize: 8.5,
              fontWeight: 700,
              letterSpacing: 2.5,
              textTransform: "uppercase",
              color: C.mu,
              marginBottom: 7,
            }}
          >
            This Week
          </div>
          <ResponsiveContainer width="100%" height={85}>
            <BarChart
              data={weekData}
              margin={{ top: 0, right: 0, bottom: 0, left: -28 }}
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: 9, fill: C.mu }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={false}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(v) => [`${v}%`, "Score"]}
                contentStyle={{
                  background: C.card,
                  border: `1px solid ${C.so}`,
                  borderRadius: 8,
                  fontSize: 11,
                  color: C.ink,
                }}
              />
              <Bar dataKey="v" radius={[4, 4, 0, 0]} maxBarSize={34}>
                {weekData.map((e, i) => (
                  <Cell
                    key={i}
                    fill={e.isToday ? C.br : C.tan}
                    opacity={e.isToday ? 1 : 0.55}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Monthly bar */}
          <div
            style={{
              fontSize: 8.5,
              fontWeight: 700,
              letterSpacing: 2.5,
              textTransform: "uppercase",
              color: C.mu,
              marginBottom: 7,
              marginTop: 13,
            }}
          >
            Monthly Avg (Per Week)
          </div>
          <ResponsiveContainer width="100%" height={72}>
            <BarChart
              data={monthData}
              margin={{ top: 0, right: 0, bottom: 0, left: -28 }}
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: 9, fill: C.mu }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={false}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(v) => [`${v}%`, "Avg"]}
                contentStyle={{
                  background: C.card,
                  border: `1px solid ${C.so}`,
                  borderRadius: 8,
                  fontSize: 11,
                  color: C.ink,
                }}
              />
              <Bar
                dataKey="v"
                fill={C.dk}
                radius={[4, 4, 0, 0]}
                opacity={0.72}
                maxBarSize={52}
              />
            </BarChart>
          </ResponsiveContainer>

          {/* Quote */}
          <div
            style={{
              marginTop: 14,
              padding: "9px 12px",
              background: C.bg,
              borderRadius: 8,
              borderLeft: `3px solid ${C.tan}`,
              textAlign: "center",
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: C.br,
                fontStyle: "italic",
                fontFamily: "Georgia,serif",
                letterSpacing: 0.3,
              }}
            >
              Persistency &gt;&gt;&gt;&gt; Consistency
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
