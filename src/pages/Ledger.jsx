import { useMemo, useState } from "react";
import { rangeDays, toCsv, r2 } from "../lib/metrics.js";
import { money, int, dateTime } from "../lib/format.js";
import { Card, Pill, Empty } from "../ui.jsx";

const STATUSES = [["all", "All statuses"], ["counted", "Counts as saved"], ["pending", "Pending sweep"], ["swept", "Swept"], ["skipped_buffer", "Skipped · buffer"], ["reversed", "Reversed"], ["none", "No round-up"]];
const PAGE = 100;

export default function Ledger({ m, range, saver, setSaver, openSaver }) {
  const [status, setStatus] = useState("all");
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(PAGE);
  const w = rangeDays(m, range);

  const cats = useMemo(() => [...new Set(m.txns.map((t) => t.category))].sort(), [m]);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return m.txns.filter((t) => t.day >= w.from && t.day <= w.to
      && (saver === "all" || t.userId === saver)
      && (cat === "all" || t.category === cat)
      && (status === "all" || (status === "counted" ? t.saved > 0 : t.status === status))
      && (!needle || t.ref.toLowerCase().includes(needle) || t.amount.toFixed(2).includes(needle)));
  }, [m, w.from, w.to, saver, cat, status, q]);

  const sum = rows.reduce((a, t) => ({ spend: a.spend + t.amount, saved: a.saved + t.saved, skipped: a.skipped + (t.status === "skipped_buffer" ? 1 : 0) }), { spend: 0, saved: 0, skipped: 0 });

  const exportCsv = () => {
    const blob = new Blob([toCsv(rows, m.saverById)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kasomefin-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <>
      <div className="tools">
        <select value={saver} onChange={(e) => { setSaver(e.target.value); setShown(PAGE); }} aria-label="Saver">
          <option value="all">All savers</option>
          {[...m.savers].sort((a, b) => a.name.localeCompare(b.name)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setShown(PAGE); }} aria-label="Status">
          {STATUSES.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
        </select>
        <select value={cat} onChange={(e) => { setCat(e.target.value); setShown(PAGE); }} aria-label="Category">
          <option value="all">All types</option>
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="search" placeholder="Search ref or amount" value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE); }} aria-label="Search ref or amount" />
        <button className="btn" style={{ marginLeft: "auto" }} onClick={exportCsv} disabled={!rows.length}>⬇ Export CSV</button>
      </div>

      <div className="summary">
        <span><b>{int(rows.length)}</b> payments · {w.label.toLowerCase()}</span>
        <span>Spend <b className="num">{money(r2(sum.spend))}</b></span>
        <span>Saved <b className="num">{money(r2(sum.saved))}</b></span>
        <span>Skipped <b className="num">{int(sum.skipped)}</b></span>
      </div>

      <Card flush>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr><th>When</th><th>Saver</th><th>Ref</th><th>Type</th><th className="r">Amount</th><th className="r">Round-up</th><th>Status</th><th className="r">Wallet after</th></tr>
            </thead>
            <tbody>
              {rows.slice(0, shown).map((t) => {
                const s = m.saverById.get(t.userId);
                return (
                  <tr key={t.id}>
                    <td className="muted">{dateTime(t.at)}</td>
                    <td><button className="btn" style={{ height: "auto", padding: 0, border: "none", background: "none", fontWeight: 600 }} onClick={() => openSaver(t.userId)}>{s ? s.name : "Unknown"}</button></td>
                    <td className="muted num">{t.ref || "—"}</td>
                    <td>{t.category}</td>
                    <td className="r num">{money(t.amount)}</td>
                    <td className={`r num ${t.saved > 0 ? "" : "strike"}`}>{t.roundup ? "+" + money(t.roundup) : "—"}</td>
                    <td><Pill status={t.status} /></td>
                    <td className="r num muted">{t.balanceAfter == null ? "—" : money(t.balanceAfter)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length ? <Empty title="No payments match">Try a longer range or clear a filter.</Empty> : null}
        </div>
      </Card>
      {rows.length > shown ? (
        <div style={{ textAlign: "center", marginTop: 14 }}>
          <button className="btn" onClick={() => setShown((n) => n + PAGE)}>Show {Math.min(PAGE, rows.length - shown)} more of {int(rows.length - shown)}</button>
        </div>
      ) : null}
    </>
  );
}
