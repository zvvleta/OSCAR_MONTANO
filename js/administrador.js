'use strict';
/* MÓDULO ADMINISTRADOR · CU-008 Historial de ventas (en comun.js), Cuentas de trabajadores y Anular venta */


// Cuentas de trabajadores
V.cuentas = () => {
  const L = db.users.filter(u => u.r !== 'Administrador');
  view(`<h2>Cuentas de trabajadores</h2><div class="card"><div class="scroll"><table><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th></th></tr>${L.map(u=>{const b=u.f>=MAXTRY;return `<tr><td>${esc(u.u)}</td><td>${esc(u.r)}</td><td>${b?'<span class="chip zero">Bloqueada</span>':'<span class="chip">Activa</span>'}</td><td>${b?`<button class="btn sec" onclick="A.unlock('${esc(u.u)}')">Desbloquear</button>`:''}</td></tr>`}).join('')}</table></div></div>`);
};


// Anula una venta y devuelve el stock
A.anular = n => {
  const s = db.sales.find(x => x.num === n);
  if (!s || s.anulada || !confirm('¿Se desea anular la venta ' + n + '? El stock volverá al inventario.')) return;
  s.items.forEach(i => {
    const p = db.products.find(x => x.id === i.id);
    if (p) p.stock += i.q;
  });
  s.anulada = true;
  save();
  toast('Venta anulada. El stock volvió al inventario.');
  A.hist();
};

// Desbloquea una cuenta
A.unlock = n => {
  const u = db.users.find(x => x.u === n && x.r !== 'Administrador');
  if (!u) return;
  u.f = 0;
  save();
  toast('La cuenta de ' + n + ' quedó habilitada.');
  V.cuentas();
};
