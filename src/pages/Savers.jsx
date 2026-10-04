import { useMemo, useState } from "react";
import { money, int, dateLabel, dateTime, ago, maskPhone, dayLong, dayLabel } from "../lib/format.js";
import { Card, Pill, Bars, Empty } from "../ui.jsx";

const FILTERS = [
  ["all", "All"], ["active", "Active"], ["slipping", "Slipping"], ["dormant", "Dormant"], ["never", "Not started"],
];
const COLS = [
  ["name", "Saver"], ["plan", "Plan"], ["joined", "Joined", "r"], ["balance", "Balance", "r"], ["pending", "Waiting for sweep", "r"],
  ["roundups", "Round-ups", "r"], ["days30", "Days active (30d)", "r"], ["last", "Last paste", "r"], ["status", "Status"],
];

export default function Savers({ m, reveal, openSaver }) {
  const [q, setQ] = useState("");
  const [f, setF] = useState("all");
  const [sort, setSort] = useState(["balance", -1]);

  const counts = useMemo(() => {
    const c = { all: m.savers.length };
    m.savers.forEach((s) => { const k = s.status === "new" ? "active" : s.status; c[k] = (c[k] || 0) + 1; });
    return c;
  }, [m]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = m.savers.filter((s) => (f === "all" || s.status === f || (f === "active" && s.status === "new"))
      && (!needle || s.name.toLowerCase().includes(needle) || (s.phone || "").includes(needle)));
    const [key, dir] = sort;
    const val = (s) => (key === "last" ? s.last ?? -1 : key === "name" ? s.name.toLowerCase() : key === "status" ? s.status : s[key]);
    return [...list].sort((a, b) => (val(a) > val(b) ? dir : val(a) < val(b) ? -dir : 0));
  }, [m, q, f, sort]);

  const tot = rows.reduce((a, s) => ({ bal: a.bal + s.balance, pen: a.pen + s.pending }), { bal: 0, pen: 0 });

  return (
    <>
      <div className="tools">
        <input type="search" placeholder="Search name or phone" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search savers" />
        <div className="chips" role="group" aria-label="Filter by status">
          {FILTERS.map(([id, label]) => (
            <button key={id} aria-pressed={f === id} onClick={() => setF(id)}>{label}<span>{counts[id] || 0}</span></button>
          ))}
        </div>
      </div>
      <Card flush>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                {COLS.map(([key, label, cls]) => (
                  <th key={key} className={cls} aria-sort={sort[0] === key ? (sort[1] > 0 ? "ascending" : "descending") : undefined}>
                    <button onClick={() => setSort(([k, d]) => [key, k === key ? -d : key === "name" ? 1 : -1])}>
                      {label}{sort[0] === key ? (sort[1] > 0 ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="click" onClick={() => openSaver(s.id)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && openSaver(s.id)}>
                  <td className="who"><b>{s.name}</b><span className="num">{reveal ? s.phone || "—" : maskPhone(s.phone)}</span></td>
                  <td>{s.plan === 10 ? "Zonse K10" : "Panono K5"}</td>
                  <td className="r muted">{dateLabel(s.joined)}</td>
                  <td className="r num"><b>{money(s.balance)}</b></td>
                  <td className="r num">{money(s.pending)}</td>
                  <td className="r num">{int(s.roundups)}</td>
                  <td className="r num">{s.days30}</td>
                  <td className="r muted">{ago(s.daysSince)}</td>
                  <td><Pill status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length ? <Empty title="No savers match">Try a different search or filter.</Empty> : null}
        </div>
      </Card>
      <div className="summary" style={{ marginTop: 14 }}>
        <span><b>{rows.length}</b> savers shown</span>
        <span>Balance <b className="num">{money(tot.bal)}</b></span>
        <span>Waiting for sweep <b className="num">{money(tot.pen)}</b></span>
      </div>
    </>
  );
}

export function SaverDrawer({ m, id, reveal, onClose, openLedger }) {
  const s = m.saverById.get(id);
  if (!s) return null;
  const rows = m.txns.filter((t) => t.userId === id);
  const days = [];
  for (let d = m.today - 29; d <= m.today; d++) {
    const r = rows.filter((t) => t.day === d && t.saved > 0);
    days.push({ key: d, value: r.reduce((a, t) => a + t.saved, 0), tip: <div>{dayLong(d)} · {r.length} round-ups</div> });
  }
  const goalPct = s.goal ? Math.min(100, Math.round((s.balance / s.goal.amount) * 100)) : 0;
  const w = m.withdrawals.filter((x) => x.user_id === id);
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={`${s.name} details`}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.5px" }}>{s.name}</div>
            <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
              {reveal ? s.phone || "—" : maskPhone(s.phone)} · {s.plan === 10 ? "Zonse Zonse K10" : "Panono K5"} · buffer K{s.buffer} · joined {dateLabel(s.joined)}
            </div>
            <div style={{ marginTop: 8 }}><Pill status={s.status} /> <span style={{ fontSize: 12.5, color: "var(--muted)", marginLeft: 6 }}>Last paste {ago(s.daysSince).toLowerCase()}</span></div>
          </div>
          <button className="x" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="stats" style={{ marginTop: 18 }}>
          <div className="stat"><span>Balance</span><b className="num">{money(s.balance)}</b></div>
          <div className="stat"><span>Waiting</span><b className="num">{money(s.pending)}</b></div>
          <div className="stat"><span>Swept</span><b className="num">{money(s.swept)}</b></div>
          <div className="stat"><span>Interest</span><b className="num">{money(s.interest)}</b></div>
          <div className="stat"><span>Paid out</span><b className="num">{money(s.withdrawn)}</b></div>
          <div className="stat"><span>Skipped</span><b className="num">{money(s.skippedValue)}</b></div>
        </div>

        {s.goal ? (
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <b>🎯 {s.goal.name}</b><span className="num">{money(s.balance)} of {money(s.goal.amount)} · {goalPct}%</span>
            </div>
            <div className="goal-track"><div style={{ width: `${goalPct}%` }} /></div>
          </div>
        ) : null}

        <div className="card" style={{ marginTop: 12 }}>
          <div className="card-h"><div><h2>Last 30 days</h2><p>{s.days30} active days · {int(s.roundups)} round-ups all time</p></div></div>
          <Bars points={days} height={110} format={(v) => "K" + v.toFixed(v < 10 ? 2 : 0)} axis={[dayLabel(m.today - 29), "Today"]} ariaLabel="Round-ups in the last 30 days" />
        </div>

        {w.length ? (
          <div className="card flush" style={{ marginTop: 12 }}>
            <div className="card-h"><div><h2>Withdrawals</h2></div></div>
            <div className="tbl-wrap"><table className="tbl compact"><tbody>
              {w.map((x) => (
                <tr key={x.id}><td className="muted">{dateTime(new Date(x.requested_at).getTime())}</td><td>{x.destination || "—"}</td><td className="r num">{money(x.amount)}</td><td><Pill status={x.status} /></td></tr>
              ))}
            </tbody></table></div>
          </div>
        ) : null}

        <div className="card flush" style={{ marginTop: 12 }}>
          <div className="card-h">
            <div><h2>Recent payments</h2><p>{int(rows.length)} in total</p></div>
            <button className="btn" onClick={() => openLedger(id)}>Open in ledger</button>
          </div>
          {rows.length ? (
            <div className="tbl-wrap"><table className="tbl compact"><tbody>
              {rows.slice(0, 12).map((t) => (
                <tr key={t.id}>
                  <td className="muted">{dateTime(t.at)}</td>
                  <td>{t.category}</td>
                  <td className="r num">{money(t.amount)}</td>
                  <td className={`r num ${t.saved > 0 ? "" : "strike"}`}>+{money(t.roundup)}</td>
                  <td><Pill status={t.status} /></td>
                </tr>
              ))}
            </tbody></table></div>
          ) : <Empty title="No payments yet" />}
        </div>
      </aside>
    </>
  );
}
