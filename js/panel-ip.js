"use strict";
/* ---- ACS180 integrated panel (ACS180 firmware manual, chapter 2 "Control panel") ----
   Keys: Back (Options menu / back), OK (Main menu / select / save), four arrows, Stop, Start, status light.
   Home view: control location, local start/stop, direction, local reference + target speed, actual speed.
   Options menu: control location, rotation direction, active faults, reference speed, active warnings.
   Main menu: Motor data, Motor control, Control macros, Diagnostics, Parameters. */
const IPMODE = () => SM === "ACS180" && S.panelUi !== "ap";
const IPI = {
  md: '<rect x="5" y="7" width="12" height="10" rx="1"/><path d="M17 10h3v4h-3M2 10h3v4H2M8 7V5h6v2"/>',
  mc: '<path d="M3 18h18M4 18V6M6 17l5-7h4l4 7z" fill="currentColor" stroke="none" opacity=".75"/>',
  cm: '<text x="1" y="16" font-size="10" font-weight="700" fill="currentColor" stroke="none">I/O</text><path d="M17 8h5v4h-5zM16 14h3v3h-3zM20 14h3v3h-3z"/>',
  dg: '<path d="M5 4v6a4 4 0 0 0 8 0V4M9 14v2a4 4 0 0 0 8 0v-2"/><circle cx="17" cy="11" r="2"/>',
  pa: '<circle cx="7" cy="12" r="3"/><path d="M7 6v2M7 16v2M1 12h2M11 12h2M13 7h9M13 12h9M13 17h9"/>',
  opt: '<path d="M3 7h10M17 7h4M3 17h4M11 17h10"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  back: '<path d="M9 7 4 12l5 5"/><path d="M4 12h11a5 5 0 0 1 0 10h-2"/>',
  ok: '<path d="m5 12 5 5 9-10"/>' };
const ipIcon = (k, cls = "") => `<svg class="ipi ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IPI[k]}</svg>`;
const IP_MAIN = [["md", "Motor data"], ["mc", "Motor control"], ["cm", "Control macros"], ["dg", "Diagnostics"], ["pa", "Parameters"]];
const SHORT = { "Asynchronous motor": "AsynM", "Permanent magnet motor": "PMSM", "Synchronous reluctance motor": "SynRM" };
const ipVal = n => { const m = simMeta(n); if (!m) return "-"; const t = fmtV(n); return SHORT[t] || t.replace(/\s+(?=[A-Za-z%°·]+$)/, ""); };
// Motor data / Motor control / Control macros / Diagnostics / Parameters submenus (manual pages 18-20)
function ipSub(id) {
  const c = chain();
  if (id === "md") return { title: "Motor data", items: () => [
    ...["99.03", "99.04", "99.10", "99.06", "99.07", "99.08", "99.09", "99.12", "99.16", "99.11"].filter(n => SROW.has(n)).map(n => ({ label: nameOf(n), value: ipVal(n), p: n })),
    { label: "Unit selection", value: SIM.us ? "60 Hz, hp, °F" : "50 Hz, kW, °C", act: () => STK.push({ t: "ipgrid", title: "Unit selection", i: SIM.us ? 1 : 0, items: () => [
      { label: "SI units", value: "50 Hz, kW, °C", act: () => { SIM.us = false; simLog("Unit selection: SI units"); STK.pop(); } },
      { label: "US units", value: "60 Hz, hp, °F", act: () => { SIM.us = true; simLog("Unit selection: US units"); STK.pop(); } }] }) }] };
  if (id === "mc") {
    const startP = V("99.04") === 1 ? "21.19" : "21.01";
    const stopNowF = () => V("21.03") === 0 ? "Coast" : (V("21.08") & 1) ? "DC hold" : "Ramp";
    const stopSet = (k) => { setV("21.03", k === "Coast" ? 0 : 1); setV("21.08", k === "DC hold" ? (V("21.08") | 1) : (V("21.08") & ~1)); simLog(`Stop mode: ${k} (21.03${k === "DC hold" ? ", 21.08 bit 0" : ""})`); STK.pop(); };
    return { title: "Motor control", items: () => [
      { label: `Start mode (${startP})`, value: ipVal(startP), p: startP },
      { label: "Stop mode (21.03)", value: stopNowF(), act: () => STK.push({ t: "ipgrid", title: "Stop mode", i: ["Coast", "Ramp", "DC hold"].indexOf(stopNowF()), items: () => ["Coast", "Ramp", "DC hold"].map(k => ({ label: k, value: k, act: () => stopSet(k) })) }) },
      { label: `Acceleration time (${c.a1})`, value: ipVal(c.a1), p: c.a1 }, { label: `Deceleration time (${c.d1})`, value: ipVal(c.d1), p: c.d1 },
      { label: `Maximum allowed speed (${c.mx})`, value: "Max " + ipVal(c.mx), p: c.mx }, { label: "Maximum allowed current (30.17)", value: "Max " + ipVal("30.17"), p: "30.17" },
      { label: `Minimum allowed speed (${c.mn})`, value: "Min " + ipVal(c.mn), p: c.mn }] };
  }
  if (id === "cm") return { title: "Control macros", items: () => simMeta("96.04").opts.filter(o => o[0] > 0).map(o => ({ label: o[1], value: o[1] + (SIM.macro === o[1] ? " ◉" : ""), act: () => { applyMacro(o[0]); flashMsg(o[1] + " selected"); STK.pop(); } })) };
  if (id === "dg") return { title: "Diagnostics", items: () => [
    { label: "Active fault", value: SIM.fault ? "✕ " + SIM.fault : "✕ –", act: () => STK.push({ t: "msg", title: "Active fault", text: SIM.fault ? `${SIM.fault} ${faultName(SIM.fault)}` : "No active fault" }) },
    { label: "Fault history", value: "≡ " + SIM.log.filter(l => /Fault \w{4} /.test(l)).length, act: () => STK.push({ t: "msg", title: "Fault history", text: SIM.log.filter(l => /Fault \w{4} /.test(l)).join("\n") || "Empty" }) },
    { label: "Active warnings", value: "⚠ " + (SIM.warn[0] || "–"), act: () => STK.push({ t: "msg", title: "Active warnings", text: SIM.warn.map(w => w + " " + faultName(w)).join("\n") || "No active warnings" }) },
    { label: "Connection status", value: "I/O", act: () => STK.push({ t: "msg", title: "Connection status", text: `DI1…DI${CFG().di}: ${SIM.di.map(x => x ? 1 : 0).join("")}\nAI1 ${SIM.ai[0].toFixed(2)} ${aiUnit(0)}  AI2 ${SIM.ai[1].toFixed(2)} ${aiUnit(1)}\n` + CFG().ro.map((n, i) => `RO${i + 1} ${roState(V(n)) ? 1 : 0}`).join("  ") + "\n" + CFG().ao.map((n, i) => `AO${i + 1} ${aoValue(i)}`).join("  ") + "\nFieldbus: not connected" }) }] };
  return { title: "Parameters", items: () => [
    { label: "Complete parameter list", value: "All", act: () => STK.push({ t: "list", title: "Complete list", i: 0, items: () => GROUPS().map(([k, v]) => ({ label: k.padStart(2, "0") + " " + v, arrow: true, g: k })), onSel: g => pushParamList(g.label, pInGroup(g.g).map(p => p[0])) }) },
    { label: "Modified parameter list", value: "Δ " + Object.keys(SIMV).filter(isMod).length, act: () => pushParamList("Modified", () => Object.keys(SIMV).filter(isMod).sort()) },
    { label: "Parameter restore", value: "Factory", act: () => STK.push({ t: "ipgrid", title: "Parameter restore", i: 1, items: () => [
      { label: "Restore defaults", value: "Yes", act: () => { restoreDefaults(); flashMsg("Factory defaults restored"); STK.pop(); } }, { label: "Cancel", value: "No", act: () => STK.pop() }] }) }] };
}
function ipOptions() {
  const c = chain();
  return [{ k: "loc", label: "Control location" }, { k: "dir", label: "Rotation direction" }, { k: "flt", label: "Active faults" }, { k: "ref", label: "Reference speed" }, { k: "wrn", label: "Active warnings" }];
}
// what the small LCD shows
function screenIP() {
  const s = top_(), c = chain(), fl = flash && Date.now() - flashT < 1800 ? `<div class="ipflash">${esc(flash)}</div>` : "";
  const rev = SIM.f < 0 || (SIM.f === 0 && (SIM.local ? SIM.panelRef * SIM.panelDir : refUsed) < 0);
  const arrow = `<span class="${SIM.run ? "spin " + (rev ? "ccw" : "cw") : ""}">${rev ? "↺" : "↻"}</span>`;
  const tgt = (SIM.local ? SIM.panelRef * SIM.panelDir : (c.vec ? refUsed * nomRpm() / nomHz() : refUsed)).toFixed(c.vec ? 0 : 2);
  const top = `<div class="ipt"><span>${SIM.local ? "Loc" : "Rem"}${SIM.local ? ' <i class="iploc">⊕</i>' : ""}</span>${arrow}<span class="ipref">${SIM.local || panelRefActive() ? "⬍" : ""}${tgt}${c.vec ? "rpm" : "Hz"}</span></div>`;
  if (SIM.fault && !SIM.faultHidden) return `${top}<div class="ipmsg"><b>⊗${esc(SIM.fault)}</b><span>Reset?</span></div>${fl}`;
  if (s.t === "home") {
    const act = c.vec ? (SIM.f * nomRpm() / nomHz()).toFixed(2) : SIM.f.toFixed(2);
    return `${top}<div class="iphome"><b>${act}</b></div><div class="ipbot">${ipIcon("opt")}<span>${c.vec ? "rpm" : "Hz"}</span>${ipIcon("menu")}</div>${fl}`;
  }
  if (s.t === "ipopt") {
    const it = ipOptions(), cell = (i, html) => `<div class="ipc ${s.i === i ? "sel" : ""}">${html}</div>`;
    return `<div class="ipgrid">
      ${cell(0, `<span class="${SIM.local ? "on" : ""}">Loc</span> <span class="${SIM.local ? "" : "on"}">Rem</span>`)}
      ${cell(1, `<span class="${SIM.panelDir > 0 ? "on" : ""}">↻</span> <span class="${SIM.panelDir < 0 ? "on" : ""}">↺</span>`)}
      ${cell(2, `⊗ ${SIM.fault ? 1 : 0}`)}${cell(3, `${(SIM.panelRef * SIM.panelDir).toFixed(c.vec ? 0 : 1)}${c.u}`)}${cell(4, `⚠ ${SIM.warn.length}`)}</div>
      <div class="iplab">${esc(it[s.i].label)}</div>${fl}`;
  }
  if (s.t === "ipmenu") {
    const st = Math.max(0, Math.min(s.i - 1, IP_MAIN.length - 3));
    return `<div class="ipmenu">${IP_MAIN.slice(st, st + 3).map(([k, l], j) => `<div class="ipr ${st + j === s.i ? "sel" : ""}">${ipIcon(k)}<span>${l}</span></div>`).join("")}</div>${fl}`;
  }
  if (s.t === "ipgrid") {
    const items = s.items(); s.i = Math.max(0, Math.min(items.length - 1, s.i));
    if (!items.length) return `<div class="iplist"><div class="iph">${esc(s.title || "")}</div><div class="iptext">–</div></div>${fl}`;
    const rowsVis = 3, row = Math.floor(s.i / 2), st = Math.max(0, Math.min(row - 1, Math.ceil(items.length / 2) - rowsVis)) * 2;
    return `<div class="ipgrid">${items.slice(st, st + rowsVis * 2).map((it, j) => `<div class="ipc ${st + j === s.i ? "sel" : ""}">${esc(it.value)}</div>`).join("")}</div><div class="iplab">${esc(items[s.i].label)}</div>${fl}`;
  }
  if (s.t === "list" || s.t === "menu") {
    const items = s.items(); s.i = Math.max(0, Math.min(items.length - 1, s.i));
    if (!items.length) return `<div class="iplist"><div class="iph">${esc(s.title || "")}</div><div class="iptext">No parameters</div></div>${fl}`;
    const st = Math.max(0, Math.min(s.i - 1, items.length - 3));
    return `<div class="iplist"><div class="iph">${esc(s.title || "")}</div>${items.slice(st, st + 3).map((it, j) => `<div class="ipr ${st + j === s.i ? "sel" : ""}"><span>${esc(it.label)}</span>${it.value != null && it.value !== "" ? `<em>${esc(it.value)}</em>` : ""}</div>`).join("")}</div>${fl}`;
  }
  if (s.t === "edit") {
    const m = simMeta(s.p), title = s.p === "REF" ? "Reference" : s.p;
    if (m.t === "opt") { const st = Math.max(0, Math.min(s.i - 1, m.opts.length - 3)); return `<div class="iplist"><div class="iph">${esc(title)}</div>${m.opts.slice(st, st + 3).map((o, j) => `<div class="ipr ${st + j === s.i ? "sel" : ""}"><span><b class="ipcode">${esc(o[0])} =</b> ${esc(o[1])}</span>${o[0] === V(s.p) ? "<em>◉</em>" : ""}</div>`).join("")}</div>${fl}`; }
    if (m.t === "num") return `<div class="iplist"><div class="iph">${esc(title)}</div><div class="ipnum">${numHtml(s, m)}<small>${esc(m.unit || "")}</small></div></div>${fl}`;
    const scr = editScr(s);
    return `<div class="iplist"><div class="iph">${esc(title)}</div><div class="ipany">${scr.body}</div></div>${fl}`;
  }
  return `<div class="iplist"><div class="iph">${esc(s.title || "")}</div><div class="iptext">${esc(s.text || "")}</div></div>${fl}`;
}
// key handling: Back and OK replace the two softkeys
function keyIP(k) {
  const s = top_();
  if (k === "start" || k === "stop") return key(k);
  if (SIM.fault && !SIM.faultHidden && s.t !== "help") return key(k === "ok" ? "rsoft" : k === "back" ? "lsoft" : k);
  if (s.t === "home") {
    if (k === "back") STK.push({ t: "ipopt", title: "Options", i: 0 });
    else if (k === "ok") STK.push({ t: "ipmenu", title: "Main menu", i: 0 });
    else if (k === "up" || k === "down") key(k);
    return;
  }
  if (s.t === "ipopt") {
    if (k === "back") { STK.pop(); return; }
    if (k === "left" || k === "right") s.i = wrapI(s.i, k === "left" ? -1 : 1, 5);
    else if (k === "up" || k === "down") s.i = Math.max(0, Math.min(4, s.i + (k === "up" ? -2 : 2)));
    else if (k === "ok") {
      const id = ipOptions()[s.i].k;
      if (id === "loc") key("locrem");
      else if (id === "dir") { SIM.panelDir = -SIM.panelDir; simLog("Direction " + (SIM.panelDir > 0 ? "forward" : "reverse")); }
      else if (id === "flt") STK.push({ t: "msg", title: "Active faults", text: SIM.fault ? `${SIM.fault} ${faultName(SIM.fault)}` : "No active faults" });
      else if (id === "ref") openEdit("REF");
      else STK.push({ t: "msg", title: "Active warnings", text: SIM.warn.map(w => w + " " + faultName(w)).join("\n") || "No active warnings" });
    }
    return;
  }
  if (s.t === "ipmenu") {
    if (k === "back") STK.pop();
    else if (k === "up" || k === "down") s.i = wrapI(s.i, k === "up" ? -1 : 1, IP_MAIN.length);
    else if (k === "ok" || k === "right") { const sub = ipSub(IP_MAIN[s.i][0]); STK.push({ t: "ipgrid", title: sub.title, i: 0, items: sub.items }); }
    return;
  }
  if (s.t === "ipgrid") {
    const items = s.items();
    if (k === "back") STK.pop();
    else if (k === "left" || k === "right") s.i = wrapI(s.i, k === "left" ? -1 : 1, items.length);
    else if (k === "up" || k === "down") s.i = Math.max(0, Math.min(items.length - 1, s.i + (k === "up" ? -2 : 2)));
    else if (k === "ok") { const it = items[s.i]; if (!it) return; if (it.act) it.act(); else if (it.p) openEdit(it.p); }
    return;
  }
  key(k === "ok" ? "rsoft" : k === "back" ? "lsoft" : k);
}
const press = k => (IPMODE() ? keyIP(k) : key(k));
const SVG_IPSTOP = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="#e0302a" stroke-width="2"/><path d="M8 9h8l-4 7z" fill="#e0302a"/></svg>';
const SVG_IPSTART = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 2.5 21.5 12 12 21.5 2.5 12z" fill="none" stroke="#2f9a3a" stroke-width="2"/><path d="M10 8.5v7l5-3.5z" fill="#2f9a3a"/></svg>';
function panelIP() {
  const b = (k, cls, html, lab) => `<button class="ipk ${cls}" type="button" data-k="${k}" aria-label="${lab}">${html}</button>`;
  return `<div class="ipdev"><span class="led" id="led"></span>
    <div class="iplcdw"><div class="iplcd" id="lcd"></div></div>
    <span class="ipbr l"></span><span class="ipbr r"></span>
    <div class="ipkeys">
      ${b("back", "back", ipIcon("back") + "<span>Back</span>", "Back")}
      <div class="iparr">${b("left", "ar l", '<i class="tri l"></i>', "Left")}<div class="ipud">${b("up", "ar u", '<i class="tri u"></i>', "Up")}${b("down", "ar d", '<i class="tri d"></i>', "Down")}</div>${b("right", "ar r", '<i class="tri r"></i>', "Right")}</div>
      ${b("ok", "ok", ipIcon("ok") + "<span>OK</span>", "OK")}
      ${b("stop", "stop", SVG_IPSTOP + "<span>Stop</span>", "Stop")}
      <span></span>
      ${b("start", "start", SVG_IPSTART + "<span>Start</span>", "Start")}
    </div></div>`;
}

function renderSim() {
  if (!SIM_MODELS.includes(S.model)) {
    $("#main").innerHTML = `<section class="card"><div class="hd"><h2>จอจำลอง</h2></div><div class="bd"><p class="muted" style="margin-top:0">มีจอจำลองสำหรับ ${SIM_MODELS.join(", ")} – เลือกรุ่น</p><div class="row" style="display:flex;gap:8px;flex-wrap:wrap">${SIM_MODELS.map(m => `<button class="btn pri" type="button" data-tosim="${m}">${m}</button>`).join("")}</div></div></section>`;
    document.querySelectorAll("[data-tosim]").forEach(b => b.addEventListener("click", () => { S.model = b.dataset.tosim; store.set("model", S.model); render(); }));
    return;
  }
  if (S.model !== SM) useSimModel(S.model);
  $("#main").innerHTML = `<div class="simwrap">
    <div class="simleft">
      <div class="dev2">
        ${SM === "ACS180" ? `<div class="seg ipsel"><button type="button" data-pui="ip" aria-pressed="${IPMODE()}">Integrated panel</button><button type="button" data-pui="ap" aria-pressed="${!IPMODE()}">Assistant panel (ACS-AP-x)</button></div>` : ""}
        ${IPMODE() ? panelIP() : `<div class="d2clip" aria-hidden="true"></div>${panel5()}`}
      </div>
    </div>
    <div class="simright">
      <div class="card simtools">
        <div class="tool"><div class="sub">ลำดับการกด</div><div class="crumb" id="crumb"></div><button class="btn sm" type="button" id="crumbcp">คัดลอก</button></div>
        <div class="tool" id="typebox" hidden><div class="sub">พิมพ์ค่า</div><div class="row"><input class="input" id="typev" inputmode="decimal" placeholder="ค่า"><button class="btn pri" type="button" id="typeok">บันทึก</button></div></div>
        <div class="tool"><div class="sub">ความเร็วอ้างอิง (Local / จอ) – ค่าลบ = กลับทาง</div><div class="row"><input class="input" id="refv" inputmode="text" placeholder="เช่น 35 หรือ -20"><span id="refu" class="muted"></span><button class="btn" type="button" id="refok">ตั้ง</button></div></div>
        <div class="tool"><div class="sub">ไปที่พารามิเตอร์</div><div class="row"><input class="input" id="gotoP" placeholder="เช่น 28.11"><button class="btn" type="button" id="gotoB">ไป</button></div></div>
      </div>
      <div id="simio"></div>
    </div>
  </div>
  <section class="card" style="margin-top:16px"><div class="hd"><h2>บันทึกเหตุการณ์</h2></div><pre id="simlog" class="slog"></pre></section>`;
  document.querySelectorAll("[data-pui]").forEach(b => b.addEventListener("click", () => { S.panelUi = b.dataset.pui; store.set("panelui", S.panelUi); STK = [{ t: "home" }]; renderSim(); }));
  const go = () => { gotoParam($("#gotoP").value.trim()); drawSim(); };
  $("#gotoB").addEventListener("click", go); $("#gotoP").addEventListener("keydown", e => { if (e.key === "Enter") go(); });
  $("#crumbcp").addEventListener("click", () => copyText(crumbs()));
  const setRef = () => { const v = parseFloat($("#refv").value); if (isNaN(v)) { toast("ใส่ตัวเลข"); return; } const c = chain(), [lo, hi] = refLimits(); SIM.panelRef = Math.max(lo, Math.min(hi, v)); if (v < 0 && revBlocked()) { toast(revBlocked()); flashMsg(revBlocked()); } simLog(`Reference = ${SIM.panelRef} ${c.u}`); $("#refv").value = ""; drawSim(); };
  $("#refok").addEventListener("click", setRef); $("#refv").addEventListener("keydown", e => { if (e.key === "Enter") setRef(); });
  const typeOk = () => { const s = top_(); if (s.t !== "edit") return; const t = simMeta(s.p).t; if (t === "num") saveNum(s, parseFloat($("#typev").value)); else if (t === "time") saveTime(s, $("#typev").value); else return; $("#typev").value = ""; drawSim(); };
  $("#typeok").addEventListener("click", typeOk); $("#typev").addEventListener("keydown", e => { if (e.key === "Enter") typeOk(); });
  buildIO(); drawSim();
  if (!simTimer) simTimer = setInterval(() => { simTick(0.1); if (S.tab === "sim" && S.model === SM && document.getElementById("lcd")) drawSim(); }, 100);
}
function buildIO() {
  $("#simio").innerHTML = `<section class="card iob"><div class="hd"><h2>อินพุตดิจิทัล (DI)</h2><span class="muted" style="font-size:12.5px">DI1…DI${CFG().di} · แตะเพื่อสลับ</span></div><div class="bd"><div id="dis"></div></div></section>
    <section class="card iob"><div class="hd"><h2>อินพุตอนาล็อก (AI)</h2><span class="muted" style="font-size:12.5px">AI1 ขั้ว 2 · AI2 ขั้ว 5</span></div><div class="bd">
      ${[0, 1].map(i => `<div class="aiw"><div class="aitop"><b>AI${i + 1}</b><span id="aiv${i}"></span><input class="input aiin" id="ain${i}" inputmode="decimal" aria-label="AI${i + 1} value"></div><input type="range" id="ai${i}" min="0" max="20" step="0.1" value="${SIM.ai[i]}"><div class="aisc" id="ais${i}"></div></div>`).join("")}</div></section>
    <section class="card iob"><div class="hd"><h2>เอาต์พุต</h2><span class="muted" style="font-size:12.5px">รีเลย์ ${CFG().ro.length} · อนาล็อก ${CFG().ao.length}</span></div><div class="bd" id="ros"></div></section>
    <section class="card iob"><div class="hd"><h2>STO / ทดสอบ Fault</h2></div><div class="bd" style="display:grid;gap:10px">
      <label class="sw"><input type="checkbox" id="sto" ${SIM.sto ? "checked" : ""}> <span>วงจร STO ปิด – ปกติ (X4 ขั้ว 34–38)</span></label>
      <div class="row"><select class="input" id="fsel" aria-label="Fault">${["2310", "3210", "3220", "2330", "4310", "7081"].map(c => `<option value="${c}">${c} ${esc(faultName(c))}</option>`).join("")}</select><button class="btn" type="button" id="fgo">สั่ง Trip</button></div>
      <div><button class="btn" type="button" id="simreset">รีเซ็ตจอจำลอง (ค่าโรงงาน)</button></div></div></section>
    <section class="card iob"><div class="hd"><h2>สถานะ</h2></div><div class="bd sst" id="sst"></div></section>`;
  [0, 1].forEach(i => {
    $("#ai" + i).addEventListener("input", e => { SIM.ai[i] = parseFloat(e.target.value); });
    $("#ain" + i).addEventListener("change", e => { const v = parseFloat(e.target.value); if (!isNaN(v)) { SIM.ai[i] = Math.max(0, Math.min(aiUnit(i) === "V" ? 10 : 20, v)); $("#ai" + i).value = SIM.ai[i]; } e.target.value = ""; });
  });
  $("#sto").addEventListener("change", e => { SIM.sto = e.target.checked; simLog(SIM.sto ? "STO closed" : "STO open"); });
  $("#fgo").addEventListener("click", () => trip($("#fsel").value));
  let armed = false;
  $("#simreset").addEventListener("click", e => {
    if (!armed) { armed = true; e.target.textContent = "กดอีกครั้งเพื่อยืนยัน"; setTimeout(() => { armed = false; if (e.target.isConnected) e.target.textContent = "รีเซ็ตจอจำลอง (ค่าโรงงาน)"; }, 3000); return; }
    restoreDefaults(); Object.assign(SIM, { di: Array(CFG().di).fill(false), ai: [0, 4], sto: true, local: false, panelRun: false, f: 0, fault: null, latch: false, pidI: 0, sleep: false, log: [] }); resetHome(); STK = [{ t: "home" }]; buildIO(); drawSim();
  });
}
// control location text at the top left: ACH-AP-H shows Off / Hand / Auto, the ACS-AP shows Local / Remote
const locText = () => CFG().hoa ? ({ off: "Off ◇", hand: "Hand ◇", auto: "Auto" }[SIM.hoa] || "Auto") : SIM.local ? "Local ◇" : "Remote";
function drawSim() {
  const sc = screen(), c = chain();
  // the rotation arrow follows the actual direction (reverse = counter-clockwise), or the requested one while starting
  const rev = SIM.f < 0 || (SIM.f === 0 && refUsed < 0);
  const st = SIM.fault ? '<b class="blink">✕</b>' : SIM.run ? `<span class="spin ${rev ? "ccw" : "cw"}">${rev ? "↺" : "↻"}</span>` : SIM.startPending ? `<b class="blink">${rev ? "↺" : "↻"}</b>` : "";
  const refShown = (SIM.local ? SIM.panelRef * SIM.panelDir : (c.vec ? refUsed * nomRpm() / nomHz() : refUsed)).toFixed(c.vec ? 0 : 1) + " " + c.u;
  const fl = flash && Date.now() - flashT < 1800 ? `<div class="lflash">${esc(flash)}</div>` : "";
  if (IPMODE()) setHTML($("#lcd"), screenIP()); else setHTML($("#lcd"), `<div class="lt"><span class="lloc">${locText()}</span><span class="lst">${st}</span><span class="lname">${SM}</span><span class="lref">${(CFG().hoa ? SIM.hoa === "hand" : SIM.local) ? "⬍" : ""}${refShown}</span></div>
    ${sc.title ? `<div class="lti"><span>${esc(sc.title)}</span></div>` : ""}<div class="lc ${sc.home ? "home" : ""}">${sc.body}${fl}</div>
    <div class="lbt"><b>${esc(sc.l || "")}</b><span>${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span><b>${esc(sc.r || "")}</b></div>`);
  $("#led").className = "led " + (SIM.fault ? "red" : SIM.warn.length ? "amber blink" : "green");
  setText($("#crumb"), crumbs());
  const tb = $("#typebox"), s = top_(), tm = s.t === "edit" ? simMeta(s.p) : null; tb.hidden = !(tm && (tm.t === "num" || tm.t === "time") && !(SIM.fault && !SIM.faultHidden));
  if (!tb.hidden) { $("#typev").placeholder = `${s.p === "REF" ? "Reference" : s.p} – ${tm.t === "time" ? tm.fmt : tm.unit || "value"}`; $("#typev").inputMode = tm.t === "time" ? "text" : "decimal"; }
  setText($("#refu"), c.u);
  if ($("#dis")) setHTML($("#dis"), SIM.di.map((v, i) => { const u = diUsers(i); return `<button type="button" class="dibtn ${v ? "on" : ""}" data-di="${i}"><span class="dot"></span><b>DI${i + 1}</b><em>${v ? "1" : "0"}</em><span class="du">${esc(u.join(" · ") || "Not used")}</span></button>`; }).join(""));
  if ($("#ai0")) [0, 1].forEach(i => { const u = aiUnit(i), sl = $("#ai" + i); sl.max = u === "V" ? 10 : 20; setText($("#aiv" + i), SIM.ai[i].toFixed(2) + " " + u); $("#ain" + i).placeholder = "พิมพ์ค่า " + u; setText($("#ais" + i), `ค่าหลังสเกล ${aiScaled(i).toFixed(2)}  (${i ? "12.29…12.30" : "12.19…12.20"})`); });
  if ($("#ros")) setHTML($("#ros"), CFG().ro.map((n, i) => { const on = roState(V(n)); return `<div class="ro ${on ? "on" : ""}"><span class="lamp"></span><b>RO${i + 1}</b><span>${n} ${esc(fmtV(n))}</span><em>${on ? "Energized" : "–"}</em></div>`; }).join("") +
    CFG().ao.map((n, i) => `<div class="ro"><span class="lamp ao"></span><b>AO${i + 1}</b><span>${n} ${esc(fmtV(n))}</span><em>${aoValue(i)}</em></div>`).join(""));
  setHTML($("#sst"), `<div><b>${SIM.fault ? "Faulted " + SIM.fault : SIM.jogRun ? "Jogging " + SIM.jog : SIM.run ? "Running" : SIM.sleep ? "PID sleep" : "Stopped"}</b> · ${CFG().hoa ? locText() : SIM.local ? "Local" : "Remote"}${SIM.local ? "" : " " + (srcB(V("19.11")) ? "EXT2" : "EXT1")} · ${SIM.f.toFixed(2)} Hz</div>
    <div>Start/stop: ${esc(cmdInfo)}</div><div>Reference: ${esc(refInfo)} → ${refUsed.toFixed(2)} Hz</div>
    ${V("40.07") ? `<div>Process PID: setpoint ${(SIM.pidSp || 0).toFixed(2)} · feedback ${(SIM.pidFb || 0).toFixed(2)} · output 40.01 = ${SIM.pid.toFixed(2)} ${chain().u}${SIM.sleep ? " · sleep" : ""}</div>` : ""}
    ${SIM.pfcOn ? `<div>PFC: ${SIM.run ? 1 + SIM.pfcAux : 0} motor(s) running – PFC1${SIM.pfcAux ? "…PFC" + (1 + SIM.pfcAux) : ""}</div>` : ""}
    ${SIM.warn.length ? `<div class="sw-w">Warnings: ${SIM.warn.map(w => esc(w + " " + faultName(w))).join(", ")}</div>` : ""}
    ${SIM.inhibit.length ? `<div class="sw-i">Start inhibited: ${SIM.inhibit.map(esc).join(" · ")}</div>` : ""}`);
  setText($("#simlog"), SIM.log.join("\n") || "No events");
}
let holdT = null;
document.addEventListener("pointerdown", e => {
  const b = e.target.closest("[data-k]");
  if (b) { e.preventDefault(); holdN = 0; press(b.dataset.k); drawSim(); clearInterval(holdT); if (["up", "down"].includes(b.dataset.k)) { const k = b.dataset.k; let n = 0; holdT = setInterval(() => { if (++n > 4) { holdN++; press(k); drawSim(); } }, 90); } return; }
  const d = e.target.closest("[data-di]"); if (d) { e.preventDefault(); const i = +d.dataset.di; SIM.di[i] = !SIM.di[i]; simLog(`DI${i + 1} = ${SIM.di[i] ? 1 : 0}`); drawSim(); }
});
["pointerup", "pointercancel", "blur"].forEach(ev => (ev === "blur" ? window : document).addEventListener(ev, () => { clearInterval(holdT); holdN = 0; }));
document.addEventListener("click", e => { const g = e.target.closest("[data-simgo]"); if (g) { closeDrawer(); if (!SIM_MODELS.includes(S.model)) { S.model = "ACS580"; store.set("model", S.model); } if (S.model !== SM) useSimModel(S.model); gotoParam(g.dataset.simgo); setTab("sim"); } });
document.addEventListener("keydown", e => {
  if (S.tab !== "sim" || S.model !== SM || /input|select|textarea/i.test(document.activeElement.tagName)) return;
  const map = IPMODE() ? { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", Enter: "ok", Escape: "back", Backspace: "back" }
                       : { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", Enter: "rsoft", Escape: "lsoft" };
  if (map[e.key]) { e.preventDefault(); press(map[e.key]); drawSim(); }
});
