// Shared building blocks: cards, KPI tiles, the bar chart, pills.
import { useState } from "react";
import { change } from "./lib/metrics.js";

export function Card({ title, sub, right, children, flush, className = "" }) {
  return (
    <section className={`card ${flush ? "flush" : ""} ${className}`}>
      {title ? (
        <div className="card-h">
          <div>
            <h2>{title}</h2>
            {sub ? <p>{sub}</p> : null}
          </div>
          {right ? <div className="right">{right}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Delta({ cur, prev, label }) {
  const c = change(cur, prev);
  if (c == null) return null;
  const cls = c > 0 ? "up" : c < 0 ? "down" : "flat";
  return (
    <span className={`delta ${cls}`} title={label}>
      {c > 0 ? "▲" : c < 0 ? "▼" : "–"} {Math.abs(c)}%
    </span>
  );
}

export function Kpi({ label, value, small, sub, delta }) {
  return (
    <div className="card kpi">
      <div className="label">{label}</div>
      <div className="value num">
        {value}
        {small ? <small> {small}</small> : null}
        {delta}
      </div>
      {sub ? <div className="sub">{sub}</div> : null}
    </div>
  );
}

const TONES = {
  pending: ["info", "Pending sweep"],
  swept: ["good", "Swept"],
  skipped_buffer: ["warn", "Skipped · buffer"],
  reversed: ["crit", "Reversed"],
  none: ["plain", "No round-up"],
  active: ["good", "Active"],
  slipping: ["warn", "Slipping"],
  dormant: ["crit", "Dormant"],
  never: ["plain", "Not started"],
  new: ["info", "New"],
  requested: ["warn", "Requested"],
  processing: ["info", "Processing"],
  paid: ["good", "Paid"],
  failed: ["crit", "Failed"],
  cancelled: ["plain", "Cancelled"],
  initiated: ["info", "Initiated"],
  collected: ["good", "Collected"],
};
export function Pill({ status, children }) {
  const [tone, label] = TONES[status] || ["plain", status];
  return <span className={`pill ${tone}`}>{children || label}</span>;
}

/** Nice round top for the y-axis. */
function niceMax(v) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].map((k) => k * p).find((x) => x >= v);
}

/**
 * Single-series bar chart with a hover tooltip.
 * points: [{ key, value, label, tip }]
 */
export function Bars({ points, height = 180, format = (v) => v, axis = [], highlightLast = false, ariaLabel }) {
  const [hover, setHover] = useState(null);
  const max = niceMax(Math.max(0, ...points.map((p) => p.value)));
  const h = points.length ? points[hover ?? -1] : null;
  return (
    <div className="chart" onMouseLeave={() => setHover(null)}>
      <div className="bars" style={{ height }} role="img" aria-label={ariaLabel}>
        {[0.5, 1].map((f) => (
          <div key={f} className="grid-l" style={{ bottom: `${f * 100}%` }}><span className="num">{format(max * f)}</span></div>
        ))}
        {points.map((p, i) => (
          <div
            key={p.key}
            className={`col ${p.value <= 0 ? "zero" : ""} ${hover === i || (highlightLast && hover == null && i === points.length - 1) ? "on" : ""}`}
            onMouseEnter={() => setHover(i)}
          >
            <div className="b" style={{ height: `${(p.value / max) * 100}%` }} />
          </div>
        ))}
        {h ? (
          <div className="tip" style={{ left: `${((hover + 0.5) / points.length) * 100}%`, top: `${Math.max(8, 100 - (h.value / max) * 100)}%` }}>
            <b className="num">{format(h.value)}</b>
            {h.tip}
          </div>
        ) : null}
      </div>
      {axis.length ? <div className="axis">{axis.map((a, i) => <span key={i}>{a}</span>)}</div> : null}
    </div>
  );
}

export function HList({ rows, format }) {
  const max = Math.max(0, ...rows.map((r) => r.value)) || 1;
  return (
    <div className="hlist">
      {rows.map((r) => (
        <div className="hrow" key={r.name}>
          <div className="top"><span>{r.name}</span><span className="num">{format(r.value)}{r.note ? ` · ${r.note}` : ""}</span></div>
          <div className="track"><div className="fill" style={{ width: `${(r.value / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

export function Empty({ title, children }) {
  return <div className="empty"><b>{title}</b>{children}</div>;
}
