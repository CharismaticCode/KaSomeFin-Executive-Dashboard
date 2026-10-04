import { useMemo } from "react";
import { kpis, volume, series, categories, plans, weekly, cohorts, attention } from "../lib/metrics.js";
import { money, moneyShort, int, dayLabel, dayLong } from "../lib/format.js";
import { Card, Kpi, Delta, Bars, HList, Empty } from "../ui.jsx";

const ICON = { critical: "!", warning: "•", info: "i" };

export default function Overview({ m, range, openSaver }) {
  const k = useMemo(() => kpis(m, range), [m, range]);
  const s = useMemo(() => series(m, range), [m, range]);
  const cats = useMemo(() => categories(m, range), [m, range]);
  const pl = useMemo(() => plans(m, range), [m, range]);
  const wk = useMemo(() => {
    // Start at the week of the first signup, so the chart doesn't open with empty pre-pilot weeks.
    const first = Math.min(m.today, ...m.savers.map((x) => x.joinedDay));
    const mon = (d) => d - ((d + 3) % 7);
    return weekly(m, Math.max(2, Math.min(12, (mon(m.today) - mon(first)) / 7 + 1)));
  }, [m]);
  const co = useMemo(() => cohorts(m, 6, 6), [m]);
  const att = useMemo(() => attention(m), [m]);
  const vol = volume(k.cur);
  const volPrev = k.prev ? volume(k.prev) : null;
  const vs = `vs previous ${k.window.days} days`;
  const anySweeps = m.sweeps.length > 0;
  const gaps = m.savers.filter((x) => x.viewGap != null && Math.abs(x.viewGap) >= 0.01);
  const noRoundup = m.txns.filter((t) => t.status === "none").length;

  const pts = s.points.map((p) => ({
    key: p.day, value: p.value,
    tip: <div>{s.step === 7 ? `Week of ${dayLabel(p.day)}` : dayLong(p.day)} · {p.count} round-ups · {p.savers} savers</div>,
  }));
  const first = s.points[0], last = s.points[s.points.length - 1];
  const mid = s.points[Math.floor(s.points.length / 2)];

  return (
    <>
      <div className="grid g4">
        <Kpi
          label="Held for savers"
          value={moneyShort(k.held)}
          sub={<>Round-ups {money(k.principal)} + interest {money(k.interest)} − paid out {money(k.withdrawn)}</>}
        />
        <Kpi
          label={`Saved · ${k.window.label}`}
          value={moneyShort(k.cur.saved)}
          delta={k.prev ? <Delta cur={k.cur.saved} prev={k.prev.saved} label={vs} /> : null}
          sub={<>{int(k.cur.roundups)} round-ups from {int(k.cur.payments)} payments</>}
        />
        <Kpi
          label={`Active savers · ${k.window.label}`}
          value={int(k.cur.active)}
          small={`of ${int(k.total)}`}
          delta={k.prev ? <Delta cur={k.cur.active} prev={k.prev.active} label={vs} /> : null}
          sub={<>{k.total ? Math.round((k.cur.active / k.total) * 100) : 0}% of savers pasted · {int(k.cur.joined)} joined</>}
        />
        <Kpi
          label="Waiting for sweep"
          value={moneyShort(k.pending)}
          sub={<>{int(k.pendingSavers)} savers · {anySweeps ? `${m.sweeps.length} sweeps recorded` : "no sweeps recorded yet"}</>}
        />
      </div>

      <div className="grid g21 mt">
        <Card
          title="Round-ups saved"
          sub={`${s.step === 7 ? "Per week" : "Per day"} · only round-ups that count towards balances`}
          right={<><b className="num" style={{ color: "var(--ink)", fontSize: 15 }}>{money(k.cur.saved)}</b><br />{k.window.label}</>}
        >
          {pts.some((p) => p.value > 0) ? (
            <Bars
              points={pts} height={210} format={(v) => (v >= 100 ? "K" + Math.round(v) : "K" + v.toFixed(v < 10 ? 2 : 0))}
              axis={[first && dayLabel(first.day), mid && dayLabel(mid.day), last && (last.day === m.today ? "Today" : dayLabel(last.day))]}
              highlightLast ariaLabel="Round-ups saved over time"
            />
          ) : <Empty title="No round-ups in this period">Pick a longer range to see activity.</Empty>}
        </Card>

        <Card title="Needs attention" sub={att.length ? `${att.length} item${att.length === 1 ? "" : "s"}` : "All clear"}>
          {att.length ? (
            <div className="att">
              {att.slice(0, 6).map((a, i) => (
                <button key={i} onClick={() => a.saverId && openSaver(a.saverId)}>
                  <div className={`ic ${a.level}`} aria-hidden="true">{ICON[a.level]}</div>
                  <div><div className="t">{a.title}</div><div className="d">{a.body}</div></div>
                </button>
              ))}
              {att.length > 6 ? <div className="d" style={{ paddingTop: 8, fontSize: 12, color: "var(--muted)" }}>+{att.length - 6} more on the Savers page</div> : null}
            </div>
          ) : <Empty title="Nothing to act on">No pending withdrawals, mismatches or quiet savers.</Empty>}
        </Card>
      </div>

      <Card
        className="mt"
        title="Transaction volume"
        sub={`Every pasted payment, whatever happened to its round-up · ${s.step === 7 ? "per week" : "per day"}`}
        right={<><b className="num" style={{ color: "var(--ink)", fontSize: 15 }}>{money(vol.value)}</b><br />{int(vol.payments)} payments · {k.window.label}</>}
      >
        <div className="vol">
          <div>
            {s.points.some((p) => p.spend > 0) ? (
              <Bars
                points={s.points.map((p) => ({
                  key: p.day, value: p.spend,
                  tip: <div>{s.step === 7 ? `Week of ${dayLabel(p.day)}` : dayLong(p.day)} · {p.payments} payments · {p.payers} savers</div>,
                }))}
                height={170} format={(v) => (v >= 1000 ? "K" + Number((v / 1000).toFixed(1)) + "k" : "K" + Math.round(v))}
                axis={[first && dayLabel(first.day), mid && dayLabel(mid.day), last && (last.day === m.today ? "Today" : dayLabel(last.day))]}
                highlightLast ariaLabel="Payment value over time"
              />
            ) : <Empty title="No payments in this period" />}
          </div>
          <div className="vol-stats">
            <VolStat label="Payments" value={int(vol.payments)} delta={volPrev ? <Delta cur={vol.payments} prev={volPrev.payments} label={vs} /> : null} note={`${vol.paymentsPerSaver} per active saver`} />
            <VolStat label="Value" value={moneyShort(vol.value)} delta={volPrev ? <Delta cur={vol.value} prev={volPrev.value} label={vs} /> : null} note={`${money(vol.perSaver)} per active saver`} />
            <VolStat label="Average payment" value={money(vol.avgPayment)} delta={volPrev ? <Delta cur={vol.avgPayment} prev={volPrev.avgPayment} label={vs} /> : null} />
            <VolStat label="Saved from volume" value={`${vol.saveRate.toFixed(1)}%`} note={`${money(k.cur.saved)} of ${moneyShort(vol.value)} became savings`} />
          </div>
        </div>
      </Card>

      <div className="grid g3 mt">
        <Card title="Weekly active savers" sub="Savers who pasted at least one alert that week">
          <Bars
            points={wk.map((w) => ({ key: w.from, value: w.active, tip: <div>Week of {dayLabel(w.from)} · {w.active} of {w.registered} registered{w.signups ? ` · ${w.signups} joined` : ""}</div> }))}
            height={150} format={(v) => String(Math.round(v))}
            axis={[dayLabel(wk[0].from), "This week"]} highlightLast ariaLabel="Weekly active savers"
          />
        </Card>
        <Card title="Where round-ups come from" sub={`Saved value by payment type · ${k.window.label}`}>
          {cats.length ? <HList rows={cats.slice(0, 6).map((c) => ({ name: c.name, value: c.value, note: `${c.share}%` }))} format={money} /> : <Empty title="No round-ups yet" />}
        </Card>
        <Card title="Plans" sub={`Savers on each plan · saved ${k.window.label}`}>
          <HList rows={pl.map((p) => ({ name: `${p.label} · ${p.savers} saver${p.savers === 1 ? "" : "s"}`, value: p.saved }))} format={money} />
          <div className="sub" style={{ marginTop: 16, fontSize: 12.5, color: "var(--muted)" }}>
            Average balance <b className="num" style={{ color: "var(--ink)" }}>{money(k.avgPerSaver)}</b> per saver
          </div>
        </Card>
      </div>

      <div className="grid g21 mt">
        <Card title="Retention by signup week" sub="Share of each week's new savers who pasted in each week after joining">
          {co.length ? (
            <div className="coh">
              <div />
              {["Week 1", "2", "3", "4", "5", "6"].map((h) => <div key={h} className="hd">{h}</div>)}
              {co.map((c) => (
                <Row key={c.from} c={c} />
              ))}
            </div>
          ) : <Empty title="No savers yet" />}
        </Card>
        <Card title="Ledger health" sub="Checks that should all read zero">
          <div className="hlist" style={{ gap: 12 }}>
            <Check ok={!gaps.length} label="Balances match the ledger" value={gaps.length ? `${gaps.length} mismatch${gaps.length === 1 ? "" : "es"}` : "All match"} />
            <Check ok={!k.cur.reversed} label={`Reversed round-ups · ${k.window.label}`} value={int(k.cur.reversed)} />
            <Check ok={!k.cur.skipped} warn label={`Skipped (under buffer) · ${k.window.label}`} value={`${int(k.cur.skipped)} · ${money(k.cur.skippedValue)}`} />
            <Check ok={!noRoundup} warn label="Payments with no round-up record" value={int(noRoundup)} />
          </div>
        </Card>
      </div>
    </>
  );
}

function Row({ c }) {
  return (
    <>
      <div className="lab"><b>{dayLabel(c.from)}</b>{c.size} saver{c.size === 1 ? "" : "s"}</div>
      {c.cells.map((x, i) => (
        x == null
          ? <div key={i} className="c" style={{ background: "var(--surface-2)", color: "var(--faint)" }}>—</div>
          : <div key={i} className="c num" title={`${x.active} of ${c.size} pasted${x.partial ? " (week in progress)" : ""}`}
              style={{ background: `rgba(143,163,43,${(0.08 + (x.pct / 100) * 0.62).toFixed(2)})`, color: x.pct > 55 ? "#22300A" : "var(--ink)", outline: x.partial ? "1px dashed var(--line-2)" : "none" }}>
              {x.pct}%
            </div>
      ))}
    </>
  );
}

function VolStat({ label, value, delta, note }) {
  return (
    <div className="vol-stat">
      <span>{label}</span>
      <b className="num">{value}{delta}</b>
      {note ? <small>{note}</small> : null}
    </div>
  );
}

function Check({ ok, warn, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
      <span className={`pill ${ok ? "good" : warn ? "warn" : "crit"}`} style={{ minWidth: 26, justifyContent: "center" }}>{ok ? "✓" : "!"}</span>
      <span style={{ flex: 1 }}>{label}</span>
      <b className="num">{value}</b>
    </div>
  );
}
