// Password resets: requests from the app, and issuing a one-time code that the
// team sends to the saver (WhatsApp link pre-filled). The code is shown once;
// only its hash is stored.
import { useState } from "react";
import { issueResetCode } from "../data.js";
import { prettyCode, whatsappLink } from "../lib/resetcode.js";
import { dateTime } from "../lib/format.js";
import { Card } from "../ui.jsx";

const STATUS = {
  requested: ["warn", "Waiting for a code"],
  issued: ["info", "Code sent"],
  used: ["good", "Password changed"],
  expired: ["plain", "Expired"],
  cancelled: ["plain", "Replaced"],
};

function CodeBox({ saver, code, expiresAt, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  };
  return (
    <div style={{ textAlign: "left", whiteSpace: "normal", marginTop: 12, padding: 16, borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--line-2)" }}>
      <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Reset code for {saver.name} · shown once, valid 24 hours</div>
      <div className="num" style={{ fontSize: 34, fontWeight: 800, letterSpacing: 6, margin: "8px 0 12px" }}>{prettyCode(code)}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <a className="btn dark" href={whatsappLink(saver.phone, saver.name, code, expiresAt)} target="_blank" rel="noreferrer">Send on WhatsApp</a>
        <button className="btn" onClick={copy}>{copied ? "Copied ✓" : "Copy code"}</button>
        <button className="btn" onClick={onClose}>Done</button>
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 10, lineHeight: 1.5 }}>
        They open the app, tap <b>Forgot password?</b> → <b>I already have a code</b>, then enter this code and a new password.
      </div>
    </div>
  );
}

/** Button + code box, used in the saver drawer and the requests list. */
export function ResetButton({ saver, requestId, onIssued, label = "Create reset code" }) {
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState(null);
  const [err, setErr] = useState("");
  const go = async () => {
    if (!window.confirm(`Create a password reset code for ${saver.name}? Any earlier code stops working.`)) return;
    setBusy(true); setErr("");
    try {
      const r = await issueResetCode({ userId: saver.id, phone: saver.phone, requestId });
      setIssued(r); // refresh only once the code box is closed, so it stays on screen
    } catch (e) {
      setErr(/password_resets/.test(e.message) ? "Password resets aren't set up in the database yet (run migration 0600)." : e.message);
    } finally { setBusy(false); }
  };
  if (issued) return <CodeBox saver={saver} code={issued.code} expiresAt={issued.expiresAt} onClose={() => { setIssued(null); onIssued && onIssued(); }} />;
  return (
    <div>
      <button className="btn dark" onClick={go} disabled={busy}>{busy ? "Creating…" : label}</button>
      {err ? <div className="banner" style={{ marginTop: 10, marginBottom: 0 }}>{err}</div> : null}
    </div>
  );
}

/** List of recent requests; open ones first. Hidden when there's nothing in the last 7 days. */
export function ResetRequests({ m, onIssued, openSaver }) {
  const recent = m.resets.filter((r) => r.status === "requested" || (r.requestedAt && r.requestedAt > m.now - 7 * 864e5));
  if (!recent.length) return null;
  const open = recent.filter((r) => r.status === "requested");
  return (
    <Card flush className="mt" title="Password resets" sub={open.length ? `${open.length} saver${open.length === 1 ? "" : "s"} waiting for a code` : "Last 7 days"}>
      <div className="tbl-wrap"><table className="tbl">
        <thead><tr><th>Saver</th><th>Asked</th><th>Status</th><th /></tr></thead>
        <tbody>
          {recent.map((r) => {
            const s = m.saverById.get(r.userId) || { id: r.userId, name: "Unknown saver", phone: r.phone };
            const [tone, text] = STATUS[r.status] || ["plain", r.status];
            return (
              <tr key={r.id}>
                <td className="who"><button className="btn" style={{ height: "auto", padding: 0, border: "none", background: "none", fontWeight: 600, display: "block" }} onClick={() => openSaver(s.id)}>{s.name}</button><span className="num">{s.phone || "+" + r.phone}</span></td>
                <td className="muted">{dateTime(r.requestedAt)}</td>
                <td><span className={`pill ${tone}`}>{text}</span>{r.status === "issued" && r.expiresAt ? <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>until {dateTime(r.expiresAt)}</span> : null}</td>
                <td className="r" style={{ whiteSpace: "normal", minWidth: 180 }}>
                  {r.status === "requested" ? <ResetButton saver={s} requestId={r.id} onIssued={onIssued} /> : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
    </Card>
  );
}
