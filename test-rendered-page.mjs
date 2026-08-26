const res = await fetch("https://kasomefin-ops-dashboard.vercel.app/support.js");
console.log("support.js status:", res.status, "content-type:", res.headers.get("content-type"), "size:", (await res.text()).length);

const htmlRes = await fetch("https://kasomefin-ops-dashboard.vercel.app/");
const html = await htmlRes.text();
console.log("index.html status:", htmlRes.status, "size:", html.length);
