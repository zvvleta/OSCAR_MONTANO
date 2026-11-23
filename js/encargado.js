'use strict';



Object.assign(V, {
  /* CU-002 · Registrar productos */
  regp() {
    view(`<h2>Registrar productos</h2><form class="card" onsubmit="A.regp(event)"><div class="grid">
 <label>Nombre<input name="name" oninput="this.value=this.value.replace(/\\d/g,'')"></label><label>Código<input name="code"></label><label>Categoría<input name="cat"></label>
 <label>Talla<input name="size"></label><label>Color<input name="color" oninput="this.value=this.value.replace(/\\d/g,'')"></label><label>Precio (S/)<input name="price" type="number" step="0.01"></label><label>Cantidad inicial<input name="stock" type="number"></label></div>
 <div id="e"></div><button class="btn">Registrar producto</button></form>`);
  },

  /* CU-007 · Reporte de inventario */
  repi() {
    const c = cats().slice(1);
    view(`<h2>Reporte de inventario</h2><div class="card"><div class="row"><label>Categoría<select id="fc"><option value="">Todas</option>${c.map(x=>`<option value="${esc(x)}">${esc(lab(x))}</option>`).join('')}</select></label><label>Talla<input id="ft"></label><label>Color<input id="fk"></label><button class="btn" onclick="A.repi()">Generar reporte</button><button class="btn sec" onclick="A.descargarInv()">Descargar reporte</button></div><div id="res"></div></div>`);
  }
});

// Reabastecer
V.reab = () => {
  const bajos = db.products.filter(p => p.stock < LOW);
  view(`<h2>Reabastecer</h2><form class="card" onsubmit="A.reab(event)"><div class="grid"><label>Producto<select name="id">${db.products.map(p=>`<option value="${p.id}">${esc(p.code)} · ${esc(p.name)} ${esc(p.size)}/${esc(p.color)} (stock ${p.stock})</option>`).join('')}</select></label><label>Cantidad a reponer<input name="q" type="number"></label></div><div id="e"></div><button class="btn">Registrar reabastecimiento</button></form>
 <div class="card"><h3>Productos con poco stock</h3>${bajos.length?tabla(bajos):'<p class="muted">Ninguna variante con stock bajo.</p>'}</div>`);
};


Object.assign(A, {
  // Registra un producto nuevo
  regp(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target)), er = $('#e');
    if (Object.values(f).some(v => !String(v).trim())) {
      er.innerHTML = msg('Faltan datos obligatorios por completar.');
      return;
    }
    if (/\d/.test(f.name)) {
      er.innerHTML = msg('El nombre no admite números.');
      return;
    }
    if (/\d/.test(f.color)) {
      er.innerHTML = msg('El color no admite números.');
      return;
    }
    if (db.products.some(p => p.code.toLowerCase() === f.code.trim().toLowerCase())) {
      er.innerHTML = msg('El producto ya está registrado con ese código.');
      return;
    }
    const pr = +f.price, st = +f.stock;
    if (pr <= 0 || st < 0 || !Number.isInteger(st) || pr !== pr) {
      er.innerHTML = msg('El precio debe ser mayor a cero y la cantidad no puede ser negativa.');
      return;
    }
    if (st > 10000) {
      er.innerHTML = msg('La cantidad inicial es demasiado alta.');
      return;
    }
    db.products.push({ id: Math.max(0, ...db.products.map(p => p.id)) + 1, code: f.code.trim(), name: f.name.trim(), cat: f.cat.trim(), desc: '', size: f.size.trim(), color: f.color.trim(), price: pr, stock: st });
    save();
    toast('Producto registrado.');
    e.target.reset();
    er.innerHTML = '';
  },

  // Genera el reporte de inventario filtrado
  repi() {
    let L = db.products;
    const c = $('#fc').value, t = $('#ft').value.trim().toLowerCase(), k = $('#fk').value.trim().toLowerCase();
    L = L.filter(p => (!c || norm(p.cat) === c) && (!t || p.size.toLowerCase() === t) && (!k || p.color.toLowerCase().includes(k)));
    $('#res').innerHTML = L.length ? tabla(L) : msg('Ninguna prenda coincide con los filtros.', 'warn');
  }
});

// Registra un reabastecimiento
A.reab = e => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target)), q = +f.q;
  if (!Number.isInteger(q) || q <= 0) {
    $('#e').innerHTML = msg('La cantidad debe ser un número entero mayor a cero.');
    return;
  }
  if (q > 10000) {
    $('#e').innerHTML = msg('La cantidad ingresada es demasiado alta.');
    return;
  }
  const p = db.products.find(x => x.id === +f.id), antes = p.stock;
  p.stock += q;
  (db.reabs = db.reabs || []).push({ fecha: new Date().toISOString(), enc: user.u, id: p.id, q });
  save();
  toast(`${p.name} ${p.size}/${p.color}: stock ${antes} → ${p.stock}`);
  V.reab();
};

/* Descarga del reporte de inventario con los filtros elegidos (archivo de Excel) */
A.descargarInv = () => {
  const c = $('#fc').value, t = $('#ft').value.trim().toLowerCase(), k = $('#fk').value.trim().toLowerCase();
  const L = db.products.filter(p => (!c || norm(p.cat) === c) && (!t || p.size.toLowerCase() === t) && (!k || p.color.toLowerCase().includes(k)));
  if (!L.length) { $('#res').innerHTML = msg('No hay prendas para descargar con esos filtros.', 'warn'); return; }
  descargarExcel(`reporte-inventario_${day(new Date().toISOString())}.xlsx`, 'Inventario', [
    ['Código', 'Prenda', 'Categoría', 'Talla', 'Color', 'Precio (S/)', 'Stock', 'Estado'],
    ...L.map(p => [p.code, p.name, lab(norm(p.cat)), p.size, p.color, p.price, p.stock, p.stock < LOW ? 'Poco stock' : 'Normal'])
  ]);
  toast('El reporte de inventario se descargó correctamente.');
};
