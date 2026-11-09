"use strict";
/* ---------- parameter list ---------- */
function paramListHtml() {
  const m = S.model, q = S.pq.trim().toLowerCase();
  let ps = D[m].P.filter(p => (!S.pgroup || gKey(p[0]) === S.pgroup) && (!q || p[0].toLowerCase().startsWith(q) || p[1].toLowerCase().includes(q) || (q.length > 3 && p[3].toLowerCase().includes(q))));
  const capped = ps.length > 300; if (capped) ps = ps.slice(0, 300);
  let last = "";
  const html = ps.map(p => { const g = groupName(m, p[0]); const h = g !== last ? `<div class="g">${esc(g)}</div>` : ""; last = g; return h + `<button type="button" data-p="${esc(p[0])}"><span class="pno">${esc(p[0])}</span><span>${esc(p[1])}</span><span class="dv">${esc(p[2] && p[2] !== "-" ? p[2] : "")}</span></button>`; }).join("");
  return (html || `<div class="empty">ไม่พบ</div>`) + (capped ? `<div class="empty">แสดง 300 ตัวแรก – พิมพ์เพิ่มหรือเลือกกลุ่ม</div>` : "");
}
function renderParam() {
  const m = S.model, groups = Object.entries(D[m].groups).sort((a, b) => +a[0] - +b[0]);
  $("#main").innerHTML = `<section class="card"><div class="hd"><button class="btn sm" type="button" data-tab="set">‹ ตั้งค่าไดร์ฟ</button><h2>รายการพารามิเตอร์ – ${m}</h2><span class="muted" style="font-size:13px">${D[m].P.length} ตัว · ค่าโรงงานอยู่ทางขวา</span></div>
    <div class="filters"><input class="input" id="pq" type="search" placeholder="เลขหรือชื่อ เช่น 22.11, acceleration" value="${esc(S.pq)}" aria-label="ค้นหาพารามิเตอร์">
      <select class="input" id="pgroup" style="flex:1 1 220px" aria-label="กลุ่ม"><option value="">ทุกกลุ่ม</option>${groups.map(([k, v]) => `<option value="${k}" ${S.pgroup === k ? "selected" : ""}>${k.padStart(2, "0")} ${esc(v)}</option>`).join("")}</select></div>
    <div class="list p" id="plist">${paramListHtml()}</div></section>`;
  const inp = $("#pq"); inp.addEventListener("input", () => { S.pq = inp.value; $("#plist").innerHTML = paramListHtml(); });
  $("#pgroup").addEventListener("change", e => { S.pgroup = e.target.value; $("#plist").innerHTML = paramListHtml(); });
}
function openParam(m, n) {
  const p = pOf(m, n); if (!p) { toast(`ไม่พบ ${n} ใน ${m}`); return; }
  const used = RECIPES.filter(r => (r.steps[fam(m)] || []).some(st => st.p === n));
  $("#drawer-root").innerHTML = `<div class="scrim" data-close></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="${esc(n)} ${esc(p[1])}">
    <header><span class="pno big">${esc(n)}</span><div style="min-width:0"><h2>${esc(p[1])}</h2><div class="muted" style="font-size:13px">${esc(m)} · ${esc(groupName(m, n))}</div></div><button class="x" type="button" data-close>ปิด</button></header>
    <div class="content">
      <dl class="kv">${fam(m) === "a" && n.includes(".") ? `<dt>บนจอ</dt><dd>${esc(n.replace(".", ""))}</dd>` : ""}<dt>ค่าโรงงาน</dt><dd><b>${esc(p[2] || "–")}</b></dd>${p[6] ? `<dt>ช่วงค่า</dt><dd>${esc(p[6])}</dd>` : ""}<dt>คู่มือ</dt><dd>${pdfLink(m, p[4])}</dd></dl>
      ${p[5].length ? `<div><div class="sub">ค่าที่เลือกได้</div><div class="scroll"><table class="otable"><thead><tr><th>ค่า</th><th>ชื่อ</th></tr></thead><tbody>${p[5].map(o => `<tr><td class="c">${esc(o[0])}</td><td><b>${esc(o[1])}</b></td></tr>`).join("")}</tbody></table></div></div>` : ""}
      <div class="muted" style="font-size:13px">คำอธิบายเต็มของพารามิเตอร์นี้อยู่ในคู่มือ ABB ตามลิงก์ด้านบน</div>
      ${used.length ? `<div><div class="sub">ใช้ในงานตั้งค่า</div><div class="chips">${used.map(r => `<button class="btn sm" type="button" data-usefn="${r.id}">${esc(r.title)}</button>`).join("")}</div></div>` : ""}
      <div style="display:flex;gap:8px;flex-wrap:wrap">${SIM_MODELS.includes(m) ? `<button class="btn pri" type="button" data-simgo="${esc(n)}">เปิดในจอจำลอง ${esc(m)}</button>` : ""}<button class="btn" type="button" data-copy="${esc(n + " " + p[1])}">คัดลอก “${esc(n)} ${esc(p[1])}”</button></div>
    </div></aside>`;
  document.body.style.overflow = "hidden";
}
function closeDrawer() { $("#drawer-root").innerHTML = ""; document.body.style.overflow = ""; }
document.addEventListener("click", e => {
  if (e.target.closest("[data-close]")) { closeDrawer(); return; }
  const u = e.target.closest("[data-usefn]"); if (u) { closeDrawer(); S.fn = u.dataset.usefn; setTab("set"); }
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && $("#drawer-root").innerHTML) closeDrawer(); });
