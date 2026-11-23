'use strict';



Object.assign(V, {
  /* Registrar venta */
  venta() {
    const { dto, total: t } = calcular();
    view(`<h2>Registrar venta</h2><div class="card"><h3>1. Productos</h3><p class="muted">¿Qué productos desea vender? Elige una categoría:</p>${combo('A.cat',catSel)}${catSel===undefined?'':tabla(db.products.filter(p=>!catSel||norm(p.cat)===catSel),1)}</div>
 <div class="card"><h3>2. Detalle</h3>${cart.length?`<div class="scroll"><table><tr><th>Prenda</th><th>Talla/Color</th><th>Precio</th><th>Cantidad</th><th>Importe</th><th></th></tr>${cart.map((l,i)=>`<tr><td>${esc(l.p.name)}</td><td>${esc(l.p.size)} / ${esc(l.p.color)}</td><td>${money(l.p.price)}</td><td><input type="number" value="${l.q}" style="width:5rem" onchange="A.qty(${i},this.value)"></td><td>${money(l.q*l.p.price)}</td><td><button class="btn sec" onclick="A.del(${i})">Quitar</button></td></tr>`).join('')}</table></div>`:'<p class="muted">Falta agregar al menos una prenda.</p>'}${dto?`<p class="muted" style="text-align:right">Descuento del 5 %: -${money(dto)}</p>`:''}<p class="total">Total ${money(t)}</p></div>
 <div class="card"><h3>3. Cliente</h3><div class="row"><label>DNI<input id="dni" maxlength="8" value="${esc(cliente?.dni||'')}" oninput="if(this.value.length===8)A.cli()"></label><button class="btn sec" onclick="A.cli()">Buscar cliente</button></div>
 <div id="cl">${cliente?panelCliente(cliente):''}</div></div>
 <div class="card"><h3>4. Pago</h3><div class="row"><label>Método<select id="met">${METODOS.map(m=>`<option>${m}</option>`).join('')}</select></label><label>Monto (S/)<input id="mon" type="number" step="0.01" value="${t||''}"></label></div>
 <div id="e"></div><button class="btn" onclick="A.confirmar()">Confirmar venta</button></div><div id="tk"></div>`);
  },

  /*  Registrar clientes */
  cli() {
    view(`<h2>Clientes</h2><form class="card" onsubmit="A.regc(event)"><div class="grid"><label>Nombres<input name="nom" oninput="this.value=this.value.replace(/\\d/g,'')"></label><label>Apellidos<input name="ape" oninput="this.value=this.value.replace(/\\d/g,'')"></label><label>DNI<input name="dni" maxlength="8"></label></div><div id="e"></div><button class="btn">Registrar cliente</button></form>
 <div class="card"><h3>Registrados</h3>${db.clients.map(c=>`<p>${esc(c.dni)} · ${esc(c.nom)} ${esc(c.ape)}</p>`).join('')}</div>`);
  },

  /* Reporte de ventas */
  repv() {
    rango('Reporte de ventas', 'A.repv()');
    $('.row').insertAdjacentHTML('beforeend', '<button class="btn sec" onclick="A.descargar()">Descargar reporte</button>');
  }
});

// Mis ventas
V.mis = () => rango('Mis ventas', 'A.hist()');


Object.assign(A, {
  // Elige la categoría de la venta
  cat(c) {
    catSel = c;
    V.venta();
  },

  // Agrega una prenda al detalle
  add(id) {
    const p = db.products.find(x => x.id === id), l = cart.find(x => x.p.id === id);
    if (l) {
      if (l.q + 1 > p.stock) return toast('No quedan más unidades de esa prenda.');
      l.q++;
    } else {
      cart.push({ p, q: 1 });
    }
    V.venta();
  },

  // Cambia la cantidad de una prenda
  qty(i, v) {
    const l = cart[i], n = +v;
    if (!(n > 0) || !Number.isInteger(n)) {
      toast('La cantidad debe ser mayor a cero.');
      return V.venta();
    }
    if (n > l.p.stock) {
      toast(`Solo quedan ${l.p.stock} unidades disponibles.`);
      return V.venta();
    }
    l.q = n;
    V.venta();
  },

  // Quita una prenda del detalle
  del(i) {
    if (!confirm('¿Se quita la prenda del detalle?')) return;
    cart.splice(i, 1);
    V.venta();
  },

  // Busca el cliente por DNI
  cli() {
    const d = $('#dni').value.trim(), c = db.clients.find(x => x.dni === d);
    cliente = c || null;
    descuento = false;
    $('#cl').innerHTML = c ? panelCliente(c) : !/^\d{8}$/.test(d) ? msg('El DNI aún está incompleto.') : msg('El cliente aún no está registrado. Sus datos se completan aquí:', 'warn') + `<div class="row"><label>Nombres<input id="rn" oninput="this.value=this.value.replace(/\\d/g,'')"></label><label>Apellidos<input id="ra" oninput="this.value=this.value.replace(/\\d/g,'')"></label><button class="btn sec" onclick="A.rapido()">Registrar y usar</button></div>`;
  },

  // Registra al cliente desde la venta y lo usa
  rapido() {
    const d = $('#dni').value.trim(), n = $('#rn').value.trim(), a = $('#ra').value.trim();
    if (!n || !a) {
      $('#cl').insertAdjacentHTML('beforeend', msg('Faltan los nombres y apellidos.'));
      return;
    }
    if (/\d/.test(n + a)) {
      $('#cl').insertAdjacentHTML('beforeend', msg('No se admiten números en nombres ni apellidos.'));
      return;
    }
    descuento = false;
    cliente = { dni: d, nom: n, ape: a };
    db.clients.push(cliente);
    save();
    toast('Cliente registrado.');
    V.venta();
  },

  // Registra un cliente desde el módulo Clientes
  regc(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target)), er = $('#e');
    if (Object.values(f).some(v => !v.trim())) {
      er.innerHTML = msg('Faltan datos obligatorios por completar.');
      return;
    }
    if (/\d/.test(f.nom + f.ape)) {
      er.innerHTML = msg('No se admiten números en nombres ni apellidos.');
      return;
    }
    if (!/^\d{8}$/.test(f.dni)) {
      er.innerHTML = msg('El DNI no tiene un formato válido.');
      return;
    }
    if (db.clients.some(c => c.dni === f.dni)) {
      er.innerHTML = msg('Ese DNI ya está registrado.');
      return;
    }
    db.clients.push({ dni: f.dni, nom: f.nom.trim(), ape: f.ape.trim() });
    save();
    toast('Cliente registrado.');
    V.cli();
  },

  // Confirma la venta
  confirmar() {
    const er = $('#e'), { dto, total: t } = calcular(), m = $('#met').value, mon = +$('#mon').value;
    if (!cart.length) {
      er.innerHTML = msg('Falta agregar al menos una prenda.');
      return;
    }
    if (cart.some(l => l.q <= 0 || l.q > l.p.stock)) {
      er.innerHTML = msg('Hay cantidades inválidas o sin stock suficiente.');
      return;
    }
    if (!cliente) {
      er.innerHTML = msg('Falta asociar un cliente a la venta.');
      return;
    }
    if (!METODOS.includes(m) || Math.abs(mon - t) > 0.005) {
      er.innerHTML = msg('El pago no es válido: el monto debe coincidir con el total.');
      return;
    }
    if (!confirm('¿Se confirma la venta por ' + money(t) + '?')) return;

    const bak = JSON.stringify(db); // todo o nada: si algo falla, se restaura y no se descuenta stock
    try {
      const n = db.seq++, num = 'B001-' + String(n).padStart(6, '0'), bajos = [];
      cart.forEach(l => {
        const p = db.products.find(x => x.id === l.p.id);
        p.stock -= l.q;
        if (p.stock < LOW) bajos.push(`${p.name} ${p.size}/${p.color}: ${p.stock}`);
      });
      const s = {
        num,
        fecha: new Date().toISOString(),
        cajero: user.u,
        cliente: `${cliente.nom} ${cliente.ape}`,
        total: t,
        dto,
        dni: cliente.dni,
        pago: { metodo: m, monto: mon },
        items: cart.map(l => ({ id: l.p.id, name: l.p.name, size: l.p.size, color: l.p.color, q: l.q, pu: l.p.price }))
      };
      db.sales.push(s);
      save();
      ticket = s;
      cart = [];
      cliente = null;
      descuento = false;
      V.venta();
      $('#tk').innerHTML = `<div class="card ticket"><h3>Comprobante ${s.num}</h3><p>${new Date(s.fecha).toLocaleString('es-PE')} · Cajero ${esc(s.cajero)} · ${esc(s.cliente)}</p>${det(s)}<p>Pago: ${m} · <strong>${money(t)}</strong></p></div>${bajos.length ? msg('Quedan pocas unidades de: ' + bajos.join(' · '), 'warn') : ''}`;
      toast('Venta registrada.');
    } catch {
      db = JSON.parse(bak);
      er.innerHTML = msg('La venta no se pudo registrar y el stock no cambió.');
    }
  },

  // Reporte de ventas por fecha y tipo de pago
  repv() {
    const L = periodo('v');
    if (!L) return;
    const mt = s => (s.pago || {}).metodo || '—', por = {};
    L.forEach(s => {
      const k = day(s.fecha) + '|' + mt(s), r = por[k] = por[k] || { d: day(s.fecha), m: mt(s), n: 0, t: 0 };
      r.n++;
      r.t += s.total;
    });
    const filas = Object.values(por).sort((a, b) => a.d.localeCompare(b.d) || METODOS.indexOf(a.m) - METODOS.indexOf(b.m)), total = L.reduce((t, s) => t + s.total, 0);
    $('#res').innerHTML = `<div class="scroll"><table><tr><th>Fecha</th><th>Tipo de pago</th><th>Ventas</th><th>Total</th></tr>${filas.map(r => `<tr><td>${r.d}</td><td>${esc(r.m)}</td><td>${r.n}</td><td>${money(r.t)}</td></tr>`).join('')}<tr><th>Total</th><th></th><th>${L.length}</th><th>${money(total)}</th></tr></table></div><p class="total">Total del periodo ${money(total)}</p>`;
  }
});

/* Descarga del reporte de ventas del rango elegido (archivo de Excel) */
A.descargar = () => {
  const L = periodo('v');                       // muestra el mensaje si no hay ventas o el rango no es válido
  if (!L) return;
  const a = $('#d1').value, b = $('#d2').value || a;
  const filas = [
    ['Comprobante', 'Fecha', 'Cajero', 'Cliente', 'Método de pago', 'Total (S/)'],
    ...L.map(s => [s.num, new Date(s.fecha).toLocaleString('es-PE'), s.cajero, s.cliente, s.pago.metodo, s.total]),
    ['', '', '', '', 'Total del periodo', Math.round(L.reduce((t, s) => t + s.total, 0) * 100) / 100]
  ];
  descargarExcel(`reporte-ventas_${a}_${b}.xlsx`, 'Ventas', filas);
  toast('El reporte se descargó correctamente.');
};

/* ───── Descuento del 5 % para clientes frecuentes (requiere autorización del Administrador) ───── */
const frecuente = c => db.sales.filter(s => !s.anulada && (s.dni ? s.dni === c.dni : s.cliente === `${c.nom} ${c.ape}`)).length >= COMPRAS;

const panelCliente = c => msg(`Cliente: ${c.nom} ${c.ape}`, 'ok') + (!frecuente(c) ? '' : descuento
  ? msg('Descuento del 5 % autorizado por el Administrador.', 'ok')
  : msg('El cliente es frecuente y le corresponde un 5 % de descuento.', 'warn') +
    `<div class="row"><label>Administrador<input id="au" autocomplete="off"></label><label>Contraseña<input id="ap" type="password"></label><button class="btn sec" onclick="A.autorizar()">Solicitar autorización</button></div>`);

A.autorizar = () => {
  const adm = db.users.find(x => x.u === $('#au').value.trim() && x.r === 'Administrador');
  if (!adm || adm.p !== $('#ap').value) {
    $('#cl').insertAdjacentHTML('beforeend', msg('La autorización no es válida. El total se mantiene sin descuento.'));
    return;
  }
  descuento = true;
  toast('El Administrador autorizó el descuento.');
  V.venta();
};
