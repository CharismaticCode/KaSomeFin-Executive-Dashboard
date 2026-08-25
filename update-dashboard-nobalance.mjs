import fs from 'fs';

const file = '/Users/mac/Desktop/Vibe Coding/SmartSave Zambia/KaSomeFin-Executive-Dashboard/index.html';
let html = fs.readFileSync(file, 'utf-8');

// 1. Remove "Balance After" from the table header grid in index.html:
const oldHeader = `<div style="display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,.8fr) minmax(0,1fr) minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.1fr);gap:12px;padding:11px 20px;background:#F7F6F1;font-size:10px;letter-spacing:1.1px;text-transform:uppercase;color:#8A8B7F;font-weight:700">
<div>Saver</div><div>Ref ID</div><div>Category</div><div>Transacted (Spent)</div><div>Round-Up Saved</div><div>Balance After</div><div>Occurred At</div>
</div>`;

const newHeader = `<div style="display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,.9fr) minmax(0,1.1fr) minmax(0,1.2fr) minmax(0,1.1fr) minmax(0,1.2fr);gap:14px;padding:11px 20px;background:#F7F6F1;font-size:10px;letter-spacing:1.1px;text-transform:uppercase;color:#8A8B7F;font-weight:700">
<div>Saver</div><div>Ref ID</div><div>Category</div><div>Transacted (Spent)</div><div>Round-Up Saved</div><div>Occurred At</div>
</div>`;

html = html.replace(oldHeader, newHeader);

// 2. Remove "Balance After" from the row items:
const oldRow = `<div style="display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,.8fr) minmax(0,1fr) minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.1fr);gap:12px;align-items:center;padding:13px 20px;border-top:1px solid #F0EEE5;font-size:13px">
<div style="min-width:0">
<div style="display:flex;align-items:center;gap:6px">
<span style="font-weight:700;color:#1C1E16;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ t.userName }}</span>
<span style="padding:1px 5px;border-radius:5px;background:rgba(28,30,22,0.06);font-family:monospace;font-size:10px;font-weight:700;color:#6E7064">{{ t.userBadge }}</span>
</div>
</div>
<div style="font-family:monospace;font-weight:700;color:#14160F">{{ t.ref }}</div>
<div><span style="display:inline-block;padding:2px 8px;border-radius:6px;background:#F4F3ED;font-size:11.5px;font-weight:600">{{ t.category }}</span></div>
<div style="font-weight:700">K{{ t.amount }}</div>
<div style="font-weight:800;color:#2B7A54">+K{{ t.roundup }}</div>
<div style="color:#6E7064">{{ t.balanceAfter }}</div>
<div style="color:#8A8B7F;font-size:11.5px">{{ t.time }}</div>
</div>`;

const newRow = `<div style="display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,.9fr) minmax(0,1.1fr) minmax(0,1.2fr) minmax(0,1.1fr) minmax(0,1.2fr);gap:14px;align-items:center;padding:13px 20px;border-top:1px solid #F0EEE5;font-size:13px">
<div style="min-width:0">
<div style="display:flex;align-items:center;gap:6px">
<span style="font-weight:700;color:#1C1E16;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ t.userName }}</span>
<span style="padding:1px 5px;border-radius:5px;background:rgba(28,30,22,0.06);font-family:monospace;font-size:10px;font-weight:700;color:#6E7064">{{ t.userBadge }}</span>
</div>
</div>
<div style="font-family:monospace;font-weight:700;color:#14160F">{{ t.ref }}</div>
<div><span style="display:inline-block;padding:2px 8px;border-radius:6px;background:#F4F3ED;font-size:11.5px;font-weight:600">{{ t.category }}</span></div>
<div style="font-weight:700">K{{ t.amount }}</div>
<div style="font-weight:800;color:#2B7A54">+K{{ t.roundup }}</div>
<div style="color:#8A8B7F;font-size:11.5px">{{ t.time }}</div>
</div>`;

html = html.replace(oldRow, newRow);

// 3. Update exportTxnsCsv to exclude balance_after:
const oldCsv = `      exportTxnsCsv: ()=>{
        const csvRows = ["Saver,Badge,Ref,Category,TransactedSpend,RoundUpSaved,BalanceAfter,OccurredAt"];
        activeFilteredTxns.forEach(t=>{
          const u = userMap[t.user_id] || { name: "Member", badge: "SV-0000" };
          csvRows.push([
            \`"\${u.name}"\`, u.badge, t.ref||"TXN", t.category||"Transfer",
            t.amount||0, t.roundup||0, t.balance_after||"", t.occurred_at||""
          ].join(","));
        });
        const blob = new Blob([csvRows.join("\\n")], {type:"text/csv"});
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = \`kasome-ledger-\${s.selectedUser === "all" ? "all-users" : activeUserName.toLowerCase().replace(/\\s+/g, "-")}.csv\`;
        a.click();
      }`;

const newCsv = `      exportTxnsCsv: ()=>{
        const csvRows = ["Saver,Badge,Ref,Category,TransactedSpend,RoundUpSaved,OccurredAt"];
        activeFilteredTxns.forEach(t=>{
          const u = userMap[t.user_id] || { name: "Member", badge: "SV-0000" };
          csvRows.push([
            \`"\${u.name}"\`, u.badge, t.ref||"TXN", t.category||"Transfer",
            t.amount||0, t.roundup||0, t.occurred_at||""
          ].join(","));
        });
        const blob = new Blob([csvRows.join("\\n")], {type:"text/csv"});
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = \`kasome-ledger-\${s.selectedUser === "all" ? "all-users" : activeUserName.toLowerCase().replace(/\\s+/g, "-")}.csv\`;
        a.click();
      }`;

html = html.replace(oldCsv, newCsv);

fs.writeFileSync(file, html);

// Validate with node --check
const scriptMatch = html.match(/<script type="text\/x-dc"[\s\S]*?>([\s\S]*?)<\/script>/);
fs.writeFileSync('/tmp/test-dashboard-component.js', scriptMatch[1]);
console.log('Executive Dashboard index.html updated: Balance After column removed!');
