"use strict";
const D = DSG.params, RECIPES = DSG.recipes, EX = DSG.extra;
const NAV = EX.nav, XREF = EX.xref, TAGS = EX.tags, MAC = EX.macros;
const TIPS = EX.tips.map(t => Object.assign(t, { rx: new RegExp(t.re, "i") }));
const MODELS = ["ACS580", "ACH580", "ACS180", "ACS880", "ACS850", "ACS800", "ACS550", "ACH550"];
const FAMCOL = { n: 1, x: 2, e: 3, o: 4 };
for (const m of MODELS) for (const p of D[m].P) p[1] = p[1].replace(/\s+(Source defined by.*|Bit Name.*|Bit Value.*|Bit Function.*|\d{2}\.\d{2}(\s+\d{2}\.\d{2})*)$/, "").trim();
const IDX = {}; for (const m of MODELS) IDX[m] = new Map(D[m].P.map(p => [p[0], p]));
const store = {
  get(k, d) { try { const v = localStorage.getItem("dsg-" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("dsg-" + k, JSON.stringify(v)); } catch (e) {} }
};
const ICON = {
  set: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  fault: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17.5v.5"/>',
  param: '<path d="M4 5h16M4 10h16M4 15h10M4 20h7"/>',
  xref: '<path d="M4 7h13l-3-3M20 17H7l3 3"/>',
  sim: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M9 5h6v5H9zM9 14h2M13 14h2M9 18h6"/>'
};
const TABS = [["set", "Settings", "Drive settings"], ["fault", "Faults", "Faults & warnings"], ["xref", "Cross-ref", "Cross-reference"], ["sim", "Simulator", "Panel simulator"]];
// pages without a menu entry of their own: the parameter list opens from Settings (and old #param links)
const ROUTES = TABS.map(t => t[0]).concat(["param"]);
const navOf = t => t === "param" ? "set" : t;
const S = {
  model: MODELS.includes(store.get("model")) ? store.get("model") : "ACS580",
  tab: ROUTES.includes(location.hash.slice(1)) ? location.hash.slice(1) : store.get("tab", "set"),
  fn: null, done: store.get("done", {}), vars: {}, ffilter: "", wmode: store.get("wmode", "all"), wstep: 0, xa: store.get("xa", ""), xb: store.get("xb", ""), xq: "", xsec: "", cvf: "all", xmode: store.get("xmode", "cmp"), panelUi: store.get("panelui", "ip"), cvText: store.get("cvtext", ""), cvMode: "", fq: "", fk: "all", fsel: null, pq: "", pgroup: ""
};
if (!ROUTES.includes(S.tab)) S.tab = "set";

const $ = s => document.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fam = m => D[m].fam;
const pOf = (m, n) => IDX[m].get(n);
const gKey = n => (n.includes(".") ? n.split(".")[0] : n.slice(0, 2)).replace(/^0+(?=\d)/, "");
function groupName(m, n) { const k = gKey(n), g = D[m].groups[k]; return g ? (n.includes(".") ? k.padStart(2, "0") + " " + g : "Group " + k.padStart(2, "0") + ": " + g) : ""; }
// ABB's manual on the ABB library, opened at the page (page numbers refer to the revision named)
function manualUrl(m, page) { const d = D[m].doc; return `https://search.abb.com/library/Download.aspx?DocumentID=${d.id}&LanguageCode=en&DocumentPartId=&Action=Launch${page ? "#page=" + page : ""}`; }
function pdfLink(m, page) {
  if (!page) return "";
  const d = D[m].doc;
  return `<a class="mlink" href="${manualUrl(m, page)}" target="_blank" rel="noopener">คู่มือ ABB ${esc(m)} ${esc(d.id)}${d.rev ? " Rev " + esc(d.rev) : ""} · หน้า PDF ${page} ↗</a>`;
}
// write to the page only when the content really changed: the simulator refreshes 10 times a second,
// and replacing unchanged elements makes taps miss and scrolling stutter on phones
function setHTML(el, html) { if (el && el.__h !== html) { el.innerHTML = html; el.__h = html; } }
function setText(el, t) { if (el && el.textContent !== t) el.textContent = t; }
function toast(msg) { const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 1800); }
function copyText(text) {
  const done = () => toast("คัดลอกแล้ว");
  const fallback = () => {
    const ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
    try { document.execCommand("copy") ? done() : toast("คัดลอกไม่สำเร็จ"); } catch (e) { toast("คัดลอกไม่สำเร็จ"); }
    ta.remove();
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
}
function linkify(text, m) {
  const rx = fam(m) === "o" ? /\b(\d{4})\b/g : /\b(\d{2}\.\d{2,3})\b/g;
  const s = esc(text);
  return s.replace(rx, (all, n, off) => (pOf(m, n) && !/(alarm|fault|warning|code|โค้ด|aux)\s*$/i.test(s.slice(Math.max(0, off - 9), off)))
    ? `<button class="pno" type="button" data-p="${n}" title="${esc(pOf(m, n)[1])}">${n}</button>` : all);
}

/* header */
const msel = $("#model");
msel.innerHTML = MODELS.map(m => `<option value="${m}">${m}</option>`).join("");
msel.addEventListener("change", () => { S.model = msel.value; store.set("model", S.model); S.vars = {}; S.fsel = null; render(); });
function renderNav() {
  msel.value = S.model;
  const on = navOf(S.tab);
  $("#tabs").innerHTML = TABS.map(([id, , long]) => `<button type="button" role="tab" data-tab="${id}" aria-selected="${id === on}">${long}</button>`).join("");
  $("#bnav").innerHTML = TABS.map(([id, short]) => `<button type="button" data-tab="${id}" aria-selected="${id === on}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[id]}</svg>${short}</button>`).join("");
  $("#qs").placeholder = `ค้นหาใน ${S.model}: เลขพารามิเตอร์ ชื่อ หรือรหัส fault (${fam(S.model) === "o" ? "1103, 2202, 16" : "20.01, accel, 2310"})`;
}
function setTab(t) { S.tab = t; store.set("tab", t); try { history.replaceState(null, "", "#" + t); } catch (e) {} render(); window.scrollTo(0, 0); }
document.addEventListener("click", e => {
  const tb = e.target.closest("[data-tab]"); if (tb) { if (tb.dataset.tab === S.tab) { S.fsel = null; render(); } else setTab(tb.dataset.tab); return; }
  const pb = e.target.closest("[data-p]"); if (pb) { e.preventDefault(); openParam(pb.dataset.pm || S.model, pb.dataset.p); return; }
  const cp = e.target.closest("[data-copy]"); if (cp) copyText(cp.dataset.copy);
});

/* quick search */
let qsItems = [], qsSel = 0;
function searchAll(q, m) {
  q = q.trim().toLowerCase(); if (!q) return [];
  if (fam(m) === "a" && /^\d{4}$/.test(q) && !D[m].F.some(f => f[1] === q)) q = q.slice(0, 2) + "." + q.slice(2);
  const out = [];
  for (const f of D[m].F) { const c = f[1].toLowerCase(); if (c === q) out.push({ t: "f", s: 100, f }); else if (c.startsWith(q) || f[2].toLowerCase().includes(q)) out.push({ t: "f", s: c.startsWith(q) ? 60 : 30, f }); }
  for (const p of D[m].P) { const n = p[0].toLowerCase(), name = p[1].toLowerCase();
    if (n === q) out.push({ t: "p", s: 100, p }); else if (n.startsWith(q)) out.push({ t: "p", s: 70, p }); else if (name.includes(q)) out.push({ t: "p", s: 40, p }); else if (q.length > 3 && p[3].toLowerCase().includes(q)) out.push({ t: "p", s: 10, p }); }
  return out.sort((a, b) => b.s - a.s).slice(0, 30);
}
const qs = $("#qs"), qsres = $("#qsres");
qs.addEventListener("input", () => {
  qsItems = searchAll(qs.value, S.model); qsSel = 0;
  if (!qs.value.trim()) { qsres.hidden = true; return; }
  qsres.hidden = false;
  qsres.innerHTML = qsItems.length ? qsItems.map((it, i) => it.t === "p"
    ? `<button type="button" data-qi="${i}" class="${i ? "" : "sel"}"><span class="pno">${esc(it.p[0])}</span><span>${esc(it.p[1])}</span></button>`
    : `<button type="button" data-qi="${i}" class="${i ? "" : "sel"}"><span class="tag ${it.f[0]}">${it.f[0] === "F" ? "FAULT" : "WARNING"}</span><span><b>${esc(it.f[1])}</b> ${esc(it.f[2].split(" · ")[0])}</span></button>`).join("")
    : `<div class="empty">ไม่พบใน ${S.model}</div>`;
});
qs.addEventListener("keydown", e => {
  if (qsres.hidden) return;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); qsSel = Math.max(0, Math.min(qsItems.length - 1, qsSel + (e.key === "ArrowDown" ? 1 : -1))); qsres.querySelectorAll("[data-qi]").forEach((b, i) => b.classList.toggle("sel", i === qsSel)); }
  else if (e.key === "Enter" && qsItems[qsSel]) { e.preventDefault(); pickQs(qsItems[qsSel]); }
  else if (e.key === "Escape") qsres.hidden = true;
});
qsres.addEventListener("click", e => { const b = e.target.closest("[data-qi]"); if (b) pickQs(qsItems[+b.dataset.qi]); });
document.addEventListener("click", e => { if (!e.target.closest(".search")) qsres.hidden = true; });
function pickQs(it) { qsres.hidden = true; qs.value = ""; qs.blur(); if (it.t === "p") openParam(S.model, it.p[0]); else { S.fsel = it.f[1] + "|" + it.f[0]; setTab("fault"); } }
