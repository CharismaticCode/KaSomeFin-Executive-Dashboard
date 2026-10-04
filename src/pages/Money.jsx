import { useMemo } from "react";
import { kpis, interestRuns } from "../lib/metrics.js";
import { money, moneyShort, int, dateTime, dateLabel } from "../lib/format.js";
import { Card, Kpi, Pill, Empty } from "../ui.jsx";

const t = (s) => (s ? new Date(s).getTime() : null);

export default function Money({ m, openSaver }) {
  const k = useMemo(() => kpis(m, "all"), [m]);
  const runs = useMemo(() => interestRuns(m), [m]);
  const open = m.withdrawals.filter((w) => w.status === "requested" || w.status === "processing");
  const name = (id) => m.saverById.get(id)?.name || "Unknown";
  const r = m.rate;

  return (
    <>
      <div className="grid g4">
        <Kpi label="Held for savers" value={moneyShort(k.held)} sub="Round-ups + interest − paid out" />
        <Kpi label="Waiting for sweep" value={moneyShort(k.pending)} sub={`${int(k.pendingSavers)} savers · recorded, not yet collected`} />
        <Kpi label="Interest credited" value={moneyShort(k.interest)} sub={runs.length ? `${runs.length} run${runs.length === 1 ? "" : "s"} · latest ${runs[0].asOf}` : "No interest runs yet"} />
        <Kpi label="Paid out" value={moneyShort(k.withdrawn)} sub={open.length ? `${open.length} withdrawal${open.length === 1 ? "" : "s"} waiting` : "No withdrawals waiting"} />
      </div>

      <div className="grid g21 mt">
        <Card flush title="Withdrawals" sub={`${int(m.withdrawals.length)} request${m.withdrawals.length === 1 ? "" : "s"} · ${money(open.reduce((a, w) => a + w.amount, 0))} waiting`}>
          {m.withdrawals.length ? (
            <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>Requested</th><th>Saver</th><th>Destination</th><th className="r">Amount</th><th>Status</th><th>Settled</th></tr></thead>
              <tbody>
                {m.withdrawals.map((w) => (
                  <tr key={w.id} className="click" onClick={() => openSaver(w.user_id)}>
                    <td className="muted">{dateTime(t(w.requested_at))}</td>
                    <td><b>{name(w.user_id)}</b></td>
                    <td>{w.destination || "—"}</td>
                    <td className="r num">{money(w.amount)}</td>
                    <td><Pill status={w.status} /></td>
                    <td className="muted">{w.settled_at ? dateTime(t(w.settled_at)) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          ) : <div style={{ padding: "0 20px 8px" }}><Empty title="No withdrawals yet" /></div>}
        </Card>

        <Card title="Savers' rate" sub={r ? `In effect since ${dateLabel(t(r.effective_date))}` : "No rate set"}>
          {r ? (
            <>
              <div style={{ display: "flex", gap: 22 }}>
                <div><div className="kpi"><div className="label">Paid to savers</div></div><div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-1px" }} className="num">{Number(r.user_rate_annual)}%</div></div>
                {r.gross_yield_annual != null ? <div><div className="kpi"><div className="label">Gross yield</div></div><div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-1px", color: "var(--muted)" }} className="num">{Number(r.gross_yield_annual)}%</div></div> : null}
              </div>
              <div className="hlist" style={{ marginTop: 18 }}>
                {[["91-day T-bills", r.tbill_91_pct], ["Longer T-bills", r.tbill_long_pct], ["Call deposit", r.call_deposit_pct]].filter(([, v]) => v != null).map(([l, v]) => (
                  <div className="hrow" key={l}><div className="top"><span>{l}</span><span className="num">{Number(v)}%</span></div><div className="track"><div className="fill" style={{ width: `${Number(v)}%` }} /></div></div>
                ))}
              </div>
              {r.note ? <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 0 }}>{r.note}</p> : null}
            </>
          ) : <Empty title="No portfolio rate recorded" />}
        </Card>
      </div>

      <div className="grid g11 mt">
        <Card flush title="Sweeps" sub="Weekly collections of pending round-ups into the trust account">
          {m.sweeps.length ? (
            <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>Period</th><th>Saver</th><th className="r">Amount</th><th>Status</th><th>Collected</th></tr></thead>
              <tbody>
                {m.sweeps.map((s) => (
                  <tr key={s.id}><td className="muted">{s.period_start} → {s.period_end}</td><td>{name(s.user_id)}</td><td className="r num">{money(s.amount)}</td><td><Pill status={s.status} /></td><td className="muted">{s.collected_at ? dateTime(t(s.collected_at)) : "—"}</td></tr>
                ))}
              </tbody>
            </table></div>
          ) : (
            <div style={{ padding: "0 20px 8px" }}>
              <Empty title="No sweeps recorded yet">{money(k.pending)} in round-ups is recorded and waiting for the first collection.</Empty>
            </div>
          )}
        </Card>
        <Card flush title="Interest runs" sub="Interest credited to savers, by date">
          {runs.length ? (
            <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>As of</th><th className="r">Savers</th><th className="r">Credited</th></tr></thead>
              <tbody>{runs.map((x) => <tr key={x.asOf}><td>{x.asOf}</td><td className="r num">{x.savers}</td><td className="r num"><b>{money(x.amount)}</b></td></tr>)}</tbody>
            </table></div>
          ) : <div style={{ padding: "0 20px 8px" }}><Empty title="No interest credited yet" /></div>}
        </Card>
      </div>
    </>
  );
}
