"use strict";
/* ---------- faults ---------- */
const tipFor = name => TIPS.find(t => t.rx.test(name));
const fName = f => f[2].split(" · ")[0];
function faultListHtml() {
  const m = S.model, q = S.fq.trim().toLowerCase();
  let fs = D[m].F.filter(f => (S.fk === "all" || f[0] === S.fk) && (!q || f[1].toLowerCase().includes(q) || f[2].toLowerCase().includes(q)));
  if (q) fs.sort((a, b) => (b[1].toLowerCase() === q) - (a[1].toLowerCase() === q) || b[1].toLowerCase().startsWith(q) - a[1].toLowerCase().startsWith(q));
  const cur = S.fsel;
  return fs.length ? fs.map(f => `<button type="button" data-fsel="${esc(f[1] + "|" + f[0])}" aria-current="${cur === f[1] + "|" + f[0]}"><span class="pno">${esc(f[1])}</span><span>${esc(fName(f))}</span><span class="tag ${f[0]}">${f[0] === "F" ? "Fault" : ["o", "a"].includes(fam(m)) ? "Alarm" : "Warning"}</span></button>`).join("")
    : `<div class="empty">ไม่พบรหัสนี้ใน ${m}</div>`;
}
function renderFault() {
  const m = S.model, f = S.fsel && D[m].F.find(x => x[1] + "|" + x[0] === S.fsel);
  $("#main").innerHTML = `<div class="split">
    <aside class="card side ${f ? "hide-m" : ""}"><div class="filters"><input class="input" id="fq" type="search" placeholder="รหัสหรือชื่อ เช่น 2310" value="${esc(S.fq)}" aria-label="Search code">
      <div class="seg">${[["all", "ทั้งหมด"], ["F", "Fault"], ["W", ["o", "a"].includes(fam(m)) ? "Alarm" : "Warning"]].map(([k, l]) => `<button type="button" data-fk="${k}" aria-pressed="${S.fk === k}">${l}</button>`).join("")}</div></div>
      <div class="list" id="flist">${faultListHtml()}</div></aside>
    <section class="card ${f ? "" : "hide-m"}">${f ? faultView(f) : `<div class="hd"><h2>ค้นหา Fault – ${m}</h2></div><div class="bd"><p class="muted" style="margin:0">พิมพ์โค้ดที่ขึ้นบนจอไดร์ฟ · คำแนะนำภาษาไทยเรียบเรียงโดย TG Control · สาเหตุและวิธีแก้ฉบับเต็มอยู่ในคู่มือ ${m} ของ ABB หัวข้อ Fault tracing</p></div>`}</section></div>`;
  const inp = $("#fq"); inp.addEventListener("input", () => { S.fq = inp.value; $("#flist").innerHTML = faultListHtml(); });
}
function faultView(f) {
  const m = S.model, t = tipFor(f[2]), extra = f[2].split(" · ").slice(1).join(" ");
  return `<div class="hd"><button class="back" type="button" data-fback>‹ กลับ</button></div>
  <div class="bd" style="display:grid;gap:16px">
    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span class="pno big">${esc(f[1])}</span><span class="tag ${f[0]}">${f[0] === "F" ? "FAULT" : ["o", "a"].includes(fam(m)) ? "ALARM" : "WARNING"}</span><h1 style="margin:0">${esc(fName(f))}</h1></div>
    ${extra ? `<div class="muted" style="font-size:13.5px">${esc(extra)}</div>` : ""}
    ${t ? `<div class="th"><div class="sub">สาเหตุที่พบบ่อย</div><div>${esc(t.why)}</div>
      ${t.ask.length ? `<div class="sub">ถามลูกค้า</div><ul>${t.ask.map(a => `<li>${esc(a)}</li>`).join("")}</ul>` : ""}
      ${t.do.length ? `<div class="sub">ตรวจ / แก้ไข</div><ul>${t.do.map(a => `<li>${linkify(a, m)}</li>`).join("")}</ul>` : ""}</div>` : `<div class="muted">ยังไม่มีคำแนะนำภาษาไทยสำหรับโค้ดนี้ – ดูสาเหตุและวิธีแก้ในคู่มือ ABB หัวข้อ Fault tracing</div>`}
    <div class="mref">${pdfLink(m, f[5])}</div>
    <div><button class="btn" type="button" data-copy="${esc(`${m} ${f[0] === "F" ? "Fault" : "Warning"} ${f[1]} ${fName(f)}`)}">คัดลอกรหัสและชื่อ</button></div>
  </div>`;
}
document.addEventListener("click", e => {
  if (e.target.closest("[data-fback]")) { S.fsel = null; renderFault(); return; }
  const b = e.target.closest("[data-fsel]"); if (b) { S.fsel = b.dataset.fsel; if (S.tab !== "fault") setTab("fault"); else { renderFault(); if (innerWidth <= 900) window.scrollTo(0, 0); } return; }
  const k = e.target.closest("[data-fk]"); if (k) { S.fk = k.dataset.fk; renderFault(); }
});
