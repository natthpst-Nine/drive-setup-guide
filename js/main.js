"use strict";
function render() {
  renderNav();
  ({ set: renderSettings, fault: renderFault, param: renderParam, xref: renderXref, sim: renderSim })[S.tab]();
}
window.addEventListener("hashchange", () => { const t = location.hash.slice(1); if (ROUTES.includes(t) && t !== S.tab) { S.tab = t; render(); } });
render();
