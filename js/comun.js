'use strict';

// Dibuja el menú del rol y atiende sus clics
const nav = () => {
  $('#nav').innerHTML = MENU[user.r].map(([k, t]) => `<button data-k="${k}" class="${k === sel ? 'on' : ''}">${t}</button>`).join('');
  $('#nav').onclick = e => {
    const k = e.target.dataset.k;
    if (k) go(k);
  };
};

// Abre la opción elegida del menú
const go = k => {
  sel = k;
  nav();
  ticket = null;
  V[k]();
  $('#view').focus();
};

Object.assign(V, {
  /* Consultar productos (stock bajo resaltado) */
  prod() {
    ccat = '';
    view(`<h2>Consultar productos</h2><div class="card"><div class="row"><label>Nombre o código<input id="q"></label><button class="btn" onclick="A.cons()">Buscar</button></div>
 <p class="muted" style="margin:.8rem 0 0">Categoría</p>${combo('A.cons',ccat)}<div id="res">${tabla(db.products)}</div></div>`);
  },

  /* Historial de ventas */
  hist() {
    rango('Historial de ventas', 'A.hist()');
  }
});


Object.assign(A, {
  // Abre o cierra la lista de categorías
  tog(b) {
    const l = b.nextElementSibling, o = l.hidden;
    document.querySelectorAll('.combo-list').forEach(x => x.hidden = true);
    l.hidden = !o;
    b.setAttribute('aria-expanded', String(o));
  },

  // Busca productos por texto y categoría
  cons(c) {
    const q = $('#q').value.trim();
    if (typeof c === 'string') ccat = c;
    if (!q && !ccat && typeof c !== 'string') {
      $('#res').innerHTML = msg('Falta un nombre, un código o una categoría para buscar.');
      return;
    }
    const bt = $('.combo-btn');
    bt.textContent = lab(ccat);
    bt.setAttribute('aria-expanded', 'false');
    $('.combo-list').hidden = true;
    document.querySelectorAll('.combo-list li').forEach(li => li.classList.toggle('on', li.dataset.c === ccat));
    const L = buscar(q).filter(p => !ccat || norm(p.cat) === ccat);
    $('#res').innerHTML = L.length ? tabla(L) : msg('No se encontraron resultados.', 'warn');
  },

  // Lista las ventas del rango elegido
  hist() {
    const L = periodo(user.r === 'Cajero' ? 'm' : '');
    if (!L) return;
    $('#res').innerHTML =`<div class="scroll"><table><tr><th>Comprobante</th><th>Fecha</th><th>Cajero</th><th>Cliente</th><th>Pago</th><th>Total</th><th></th></tr>${L.map(s=>`<tr><td>${s.num}${s.anulada?' <span class="chip zero">Anulada</span>':''}</td><td>${new Date(s.fecha).toLocaleString('es-PE')}</td><td>${esc(s.cajero)}</td><td>${esc(s.cliente)}</td><td>${esc((s.pago||{}).metodo||'—')}</td><td>${money(s.total)}</td><td><button class="btn sec" onclick="A.det('${s.num}')">Ver detalle</button> ${user.r==='Administrador'&&!s.anulada?`<button class="btn sec" onclick="A.anular('${s.num}')">Anular</button>`:''}</td></tr>`).join('')}</table></div><div id="dt"></div>`;
  },

  // Muestra el detalle de una venta
  det(n) {
    $('#dt').innerHTML =`<div class="card ticket"><h3>Detalle ${n}</h3>${det(db.sales.find(s=>s.num===n))}<p>Método de pago: <strong>${esc((db.sales.find(s=>s.num===n).pago||{}).metodo||'—')}</strong></p></div>`;
  }
});


// Al hacer clic fuera
document.addEventListener('click', e => {
  if (!e.target.closest('.combo')) document.querySelectorAll('.combo-list').forEach(l => l.hidden = true);
});

// Al pulsar Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.combo-list').forEach(l => l.hidden = true);
});
