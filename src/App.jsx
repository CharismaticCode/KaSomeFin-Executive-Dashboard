import { useCallback, useEffect, useMemo, useState } from "react";
import { buildModel, RANGES, attention } from "./lib/metrics.js";
import { clock, dateLabel } from "./lib/format.js";
import { loadAll, saveCache, loadCache, snapshotText, parseSnapshot, unreachable } from "./data.js";
import { MASTER_PASSWORD, AUTH_KEY } from "./config.js";
import Overview from "./pages/Overview.jsx";
import Savers, { SaverDrawer } from "./pages/Savers.jsx";
import Ledger from "./pages/Ledger.jsx";
import Money from "./pages/Money.jsx";

const PAGES = [
  ["overview", "Overview", "How the pilot is doing"],
  ["savers", "Savers", "Everyone in the pilot, their balance and activity"],
  ["ledger", "Ledger", "Every pasted payment and what happened to its round-up"],
  ["money", "Money", "Balances held, sweeps, withdrawals and interest"],
];
const REFRESH_MS = 60000;
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* private mode */ } },
};

function Login({ onOk }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  return (
    <div className="login">
      <form onSubmit={(e) => { e.preventDefault(); if (pw === MASTER_PASSWORD) onOk(); else setErr("Incorrect password."); }}>
        <div className="brand"><div className="brand-mark"><i /><i /></div><div><b>KaSome<span>.Fin</span></b><small>Operations</small></div></div>
        <h1>Operations dashboard</h1>
        <p>Enter the team password to continue.</p>
        <input type="password" autoFocus value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }} placeholder="Password" aria-label="Password" />
        <button type="submit">Unlock</button>
        {err ? <div className="err" role="alert">{err}</div> : null}
      </form>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(() => store.get(AUTH_KEY) === "true");
  const [page, setPage] = useState(() => (location.hash.slice(1) && PAGES.some(([p]) => p === location.hash.slice(1)) ? location.hash.slice(1) : "overview"));
  const [range, setRange] = useState(() => store.get("ksf_ops_range") || "30d");
  const [reveal, setReveal] = useState(false);
  const [raw, setRaw] = useState(null);
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);
  const [syncedAt, setSyncedAt] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [drawer, setDrawer] = useState(null);
  const [ledgerSaver, setLedgerSaver] = useState("all");

  const [copyAt, setCopyAt] = useState(null); // set when showing a saved copy instead of live data

  const showCopy = useCallback((copy, why) => {
    setRaw(copy.raw); setCopyAt(copy.at || Date.now()); setSyncedAt(copy.at || null);
    setNow(Date.now()); setErrors(why ? [why] : []);
  }, []);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const { raw: r, errors: e } = await loadAll();
      if (unreachable(e)) {
        const cached = loadCache();
        if (cached) showCopy(cached, "Can't reach the database right now, so this is the last saved copy.");
        else setErrors(["Can't reach the database right now. Check the internet connection, or open a saved copy."]);
        return;
      }
      const at = Date.now();
      setRaw(r); setErrors(e); setSyncedAt(at); setNow(at); setCopyAt(null);
      saveCache(r, at);
    } catch (e) {
      setErrors([e.message || String(e)]);
    } finally {
      setBusy(false);
    }
  }, [showCopy]);

  const saveCopy = () => {
    if (!raw) return;
    const blob = new Blob([snapshotText(raw, syncedAt || Date.now())], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kasomefin-ops-copy-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const openCopy = (file) => {
    if (!file) return;
    file.text().then((t) => {
      let copy = null;
      try { copy = parseSnapshot(t); } catch { /* not JSON */ }
      if (copy) showCopy(copy, ""); else setErrors(["That file isn't a KaSomeFin dashboard copy."]);
    });
  };

  useEffect(() => {
    if (!authed) return undefined;
    const first = setTimeout(refresh, 0);
    const id = setInterval(() => { if (document.visibilityState === "visible") refresh(); }, REFRESH_MS);
    return () => { clearTimeout(first); clearInterval(id); };
  }, [authed, refresh]);

  useEffect(() => { history.replaceState(null, "", "#" + page); }, [page]);
  useEffect(() => { store.set("ksf_ops_range", range); }, [range]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setDrawer(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const m = useMemo(() => (raw ? buildModel(raw, now) : null), [raw, now]);
  const attCount = useMemo(() => (m ? attention(m).filter((a) => a.level === "critical").length : 0), [m]);

  if (!authed) return <Login onOk={() => { store.set(AUTH_KEY, "true"); setAuthed(true); }} />;

  const [, title, sub] = PAGES.find(([p]) => p === page);
  const openSaver = (id) => setDrawer(id);
  const openLedger = (id) => { setLedgerSaver(id); setDrawer(null); setPage("ledger"); };
  const showRange = page === "overview" || page === "ledger";

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><div className="brand-mark"><i /><i /></div><div><b>KaSome<span>.Fin</span></b><small>Operations</small></div></div>
        <nav className="nav" aria-label="Sections">
          {PAGES.map(([id, label]) => (
            <button key={id} aria-current={page === id ? "page" : undefined} onClick={() => setPage(id)}>
              <span className="dot" />{label}
              {m && id === "savers" ? <span className="count">{m.savers.length}</span> : null}
              {m && id === "ledger" ? <span className="count">{m.txns.length.toLocaleString("en-US")}</span> : null}
              {id === "overview" && attCount ? <span className="count" style={{ color: "#F0A08C" }}>{attCount} !</span> : null}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <div className="sync">
            <b><i className={busy ? "busy" : copyAt ? "err" : errors.length ? "err" : ""} />{busy ? "Syncing…" : copyAt ? "Saved copy" : errors.length ? "Sync problem" : "Live"}</b>
            {copyAt ? `Data from ${dateLabel(copyAt)}, ${clock(copyAt)}` : syncedAt ? `Updated ${clock(syncedAt)} · every minute` : "Connecting…"}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="lock" onClick={saveCopy} disabled={!raw}>Save a copy</button>
            <label className="lock" style={{ cursor: "pointer" }}>
              Open a copy
              <input type="file" accept="application/json,.json" style={{ display: "none" }} onChange={(e) => { openCopy(e.target.files[0]); e.target.value = ""; }} />
            </label>
          </div>
          <button className="lock" onClick={() => { store.set(AUTH_KEY, null); setAuthed(false); }}>Lock dashboard</button>
        </div>
      </aside>

      <main className="main">
        <header className="head">
          <div>
            <h1>{title}</h1>
            <p>{sub} · all amounts in Kwacha, times in Lusaka</p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {page === "savers" ? <button className="btn" aria-pressed={reveal} onClick={() => setReveal((v) => !v)}>{reveal ? "Hide phone numbers" : "Show phone numbers"}</button> : null}
            {showRange ? (
              <div className="seg" role="group" aria-label="Date range">
                {RANGES.map((r) => <button key={r.id} aria-pressed={range === r.id} onClick={() => setRange(r.id)}>{r.label}</button>)}
              </div>
            ) : null}
            <button className="btn" onClick={refresh} disabled={busy} aria-label="Refresh data">↻ Refresh</button>
          </div>
        </header>

        {copyAt ? (
          <div className="banner" role="status" style={{ background: "var(--warn-bg)", color: "var(--warn)" }}>
            {errors[0] ? errors[0] + " " : ""}Showing data from {dateLabel(copyAt)} at {clock(copyAt)}. Press Refresh to try for live data.
          </div>
        ) : errors.length ? (
          <div className="banner" role="alert">
            {/^(Can't reach|That file)/.test(errors[0]) ? errors.join(" ") : <>Some data couldn't load: {errors.join("; ")}. Figures that depend on it may be incomplete.</>}
          </div>
        ) : null}

        {!m ? (
          <div className="grid g4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" />)}</div>
        ) : page === "overview" ? <Overview m={m} range={range} openSaver={openSaver} />
          : page === "savers" ? <Savers m={m} reveal={reveal} openSaver={openSaver} refresh={refresh} />
          : page === "ledger" ? <Ledger m={m} range={range} saver={ledgerSaver} setSaver={setLedgerSaver} openSaver={openSaver} />
          : <Money m={m} openSaver={openSaver} />}
      </main>

      {m && drawer ? <SaverDrawer m={m} id={drawer} reveal={reveal} onClose={() => setDrawer(null)} openLedger={openLedger} refresh={refresh} /> : null}
    </div>
  );
}
