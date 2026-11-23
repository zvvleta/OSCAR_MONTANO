'use strict';



const KEY = 'om_v1';     
const LOW = 10;          
const MAXTRY = 3;        
const WAIT = 5000;        
const COMPRAS = 5;        
const DESC = 0.05;        
const METODOS = ['Efectivo', 'Yape', 'Plin', 'Tarjeta'];


const MENU = {
  Administrador: [
    ['prod', 'Consultar productos'],
    ['hist', 'Historial de ventas'],
    ['cuentas', 'Cuentas']
  ],
  Cajero: [
    ['prod', 'Consultar productos'],
    ['venta', 'Registrar venta'],
    ['cli', 'Clientes'],
    ['repv', 'Reporte de ventas'],
    ['mis', 'Mis ventas']
  ],
  'Encargado del almacén': [
    ['prod', 'Consultar productos'],
    ['regp', 'Registrar productos'],
    ['reab', 'Reabastecer'],
    ['repi', 'Reporte de inventario']
  ]
};
const PAGES = { Administrador: 'administrador.html', Cajero: 'cajero.html', 'Encargado del almacén': 'encargado.html' };


// Selector corto
const $ = (s, e = document) => e.querySelector(s);

// Escapa texto para insertarlo en HTML
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));

// Formato de moneda
const money = n => 'S/ ' + Number(n).toFixed(2);

// Fecha en formato AAAA-MM-DD
const day = d => {
  const t = new Date(d);
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
};



const seed = () => ({
  seq: 1,
  users: [
    { u: 'admin', p: 'admin123', r: 'Administrador', f: 0 },
    { u: 'cajero', p: 'cajero123', r: 'Cajero', f: 0 },
    { u: 'encargado', p: 'encargado123', r: 'Encargado del almacén', f: 0 }
  ],
  products: [
    ['POL-M-NEG', 'Polo básico', 'Polos', 'Algodón pima', 'M', 'Negro', 35, 24],
    ['POL-L-NEG', 'Polo básico', 'Polos', 'Algodón pima', 'L', 'Negro', 35, 9],
    ['JEA-32-AZU', 'Jean recto', 'Pantalones', 'Denim azul', '32', 'Azul', 89.9, 12],
    ['JEA-34-AZU', 'Jean recto', 'Pantalones', 'Denim azul', '34', 'Azul', 89.9, 6],
    ['CAS-M-VER', 'Casaca ligera', 'Casacas', 'Impermeable', 'M', 'Verde', 129, 15],
    ['VES-S-ROJ', 'Vestido corto', 'Vestidos', 'Tela fluida', 'S', 'Rojo', 99, 0]
  ].map(([code, name, cat, desc, size, color, price, stock], i) => ({ id: i + 1, code, name, cat, desc, size, color, price, stock })),
  clients: [{ dni: '12345678', nom: 'Rosa', ape: 'Quispe' }],
  sales: []
});


let db;                    
let user = null;           
let cart = [];             
let cliente = null;        
let ticket = null;         
let descuento = false;     
let sel = 'prod';          
let catSel;                
let ccat = '';             

// Carga los datos (o los datos iniciales)
const load = () => {
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch {}
  if (!db) db = seed();
};

// Guarda los datos
const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {}
};


// Aviso temporal
const toast = t => {
  const e = $('#toast');
  e.textContent = t;
  e.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => e.hidden = true, 3500);
};

// Mensaje dentro de la página
const msg = (t, k = 'err') => `<p class="msg ${k}">${esc(t)}</p>`;

// Etiqueta de stock
const chip = s => `<span class="chip ${s === 0 ? 'zero' : s < LOW ? 'low' : ''}">${s}</span>`;

// Dibuja una vista
const view = h => $('#view').innerHTML = h;

// Busca productos por nombre, código o categoría
const buscar = q => {
  q = q.trim().toLowerCase();
  return db.products.filter(p => [p.name, p.code, p.cat].some(x => x.toLowerCase().includes(q)));
};

// Normaliza una categoría
const norm = c => String(c).trim().toLowerCase();

// Texto visible de una categoría
const lab = c => c === undefined ? 'Selecciona una categoría' : c ? c[0].toUpperCase() + c.slice(1) : 'Todas las categorías';

// Categorías existentes ('' = todas)
const cats = () => ['', ...new Set(db.products.map(p => norm(p.cat)))];

// Lista desplegable de categorías
const combo = (fn, cur) => `<div class="combo"><button type="button" class="combo-btn" onclick="A.tog(this)" aria-haspopup="listbox" aria-expanded="false">${esc(lab(cur))}</button><ul class="combo-list" role="listbox" hidden>${cats().map(c => `<li role="option" tabindex="0" data-c="${esc(c)}" class="${cur === c ? 'on' : ''}" onclick="${fn}('${esc(c)}')" onkeydown="if(event.key==='Enter')this.click()">${esc(lab(c))}</li>`).join('')}</ul></div>`;

// Tabla de productos (acc: con botón Agregar)
const tabla = (L, acc) => `<div class="scroll"><table><tr><th>Código</th><th>Prenda</th><th>Categoría</th><th>Talla</th><th>Color</th><th>Precio</th><th>Stock</th>${acc?'<th></th>':''}</tr>${L.map(p=>`<tr><td>${esc(p.code)}</td><td>${esc(p.name)}</td><td>${esc(lab(norm(p.cat)))}</td><td>${esc(p.size)}</td><td>${esc(p.color)}</td><td>${money(p.price)}</td><td>${chip(p.stock)}</td>${acc?`<td>${p.stock>0?`<button class="btn sec" onclick="A.add(${p.id})">Agregar</button>`:'Sin stock'}</td>`:''}</tr>`).join('')}</table></div>`;


// Formulario de rango de fechas
const rango = (t, fn) => view(`<h2>${t}</h2><div class="card"><div class="row"><label>Desde<input id="d1" type="date"></label><label>Hasta<input id="d2" type="date"></label><button class="btn" onclick="${fn}">Consultar</button></div><div id="res"></div></div>`);
// Ventas del rango elegido (m: 'v' sin anuladas, 'm' solo del cajero)
const periodo = m => {
  const a = $('#d1').value, b = $('#d2').value;
  if (!a || (b && b < a)) {
    $('#res').innerHTML = msg('El rango de fechas no es válido.');
    return null;
  }
  const L = db.sales.filter(s => day(s.fecha) >= a && day(s.fecha) <= (b || a) && (m !== 'v' || !s.anulada) && (m !== 'm' || s.cajero === user.u));
  if (!L.length) {
    $('#res').innerHTML = msg('No hay ventas en el periodo.', 'warn');
    return null;
  }
  return L;
};

// Detalle de un comprobante
const det = s => `<div class="scroll"><table><tr><th>Prenda</th><th>Talla</th><th>Color</th><th>Cant.</th><th>P. unit.</th><th>Importe</th></tr>${s.items.map(i=>`<tr><td>${esc(i.name)}</td><td>${esc(i.size)}</td><td>${esc(i.color)}</td><td>${i.q}</td><td>${money(i.pu)}</td><td>${money(i.q*i.pu)}</td></tr>`).join('')}</table></div>${s.dto?`<p class="muted" style="text-align:right">Descuento del 5 %: -${money(s.dto)}</p>`:''}<p class="total">Total ${money(s.total)}</p>`;


const calcular = () => {
  const bruto = cart.reduce((s, l) => s + l.q * l.p.price, 0);
  const dto = descuento ? Math.round(bruto * DESC * 100) / 100 : 0;
  return { dto, total: Math.round((bruto - dto) * 100) / 100 };
};


// Tabla para calcular el CRC-32
const CRC = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

// Suma de verificación de un archivo
const crc32 = b => {
  let c = 0xFFFFFFFF;
  for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
};


const zipSinCompresion = archivos => {
  const enc = new TextEncoder(), partes = [], central = []; let pos = 0;
  const u16 = n => [n & 255, n >> 8 & 255], u32 = n => [n & 255, n >> 8 & 255, n >> 16 & 255, n >>> 24];
  for (const [nombre, texto] of archivos) {
    const nom = enc.encode(nombre), dat = enc.encode(texto), crc = crc32(dat);
    const cab = [...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(dat.length), ...u32(dat.length), ...u16(nom.length), ...u16(0)];
    partes.push(new Uint8Array(cab), nom, dat);
    central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(dat.length), ...u32(dat.length), ...u16(nom.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(pos)]), nom);
    pos += cab.length + nom.length + dat.length;
  }
  const tam = central.reduce((s, p) => s + p.length, 0);
  return new Blob([...partes, ...central, new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(archivos.length), ...u16(archivos.length), ...u32(tam), ...u32(pos), ...u16(0)])]);
};

/* filas: arreglo de arreglos; la primera fila es el encabezado (en negrita) */
const descargarExcel = (nombre, hoja, filas) => {
  const xml = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const celdas = filas.map((f, i) => `<row r="${i + 1}">` + f.map((v, j) => {
    const ref = String.fromCharCode(65 + j) + (i + 1), est = i === 0 ? ' s="1"' : '';
    return typeof v === 'number' ? `<c r="${ref}"${est}><v>${v}</v></c>` : `<c r="${ref}"${est} t="inlineStr"><is><t>${xml(v)}</t></is></c>`;
  }).join('') + '</row>').join('');
  const cab = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const ns = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
  const rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const pkg = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const ct = 'application/vnd.openxmlformats-officedocument.spreadsheetml';
  const archivos = [
    ['[Content_Types].xml', `${cab}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="${ct}.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="${ct}.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="${ct}.styles+xml"/></Types>`],
    ['_rels/.rels', `${cab}<Relationships xmlns="${pkg}"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', `${cab}<workbook ${ns} xmlns:r="${rel}"><sheets><sheet name="${xml(hoja)}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', `${cab}<Relationships xmlns="${pkg}"><Relationship Id="rId1" Type="${rel}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${rel}/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', `${cab}<styleSheet ${ns}><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`],
    ['xl/worksheets/sheet1.xml', `${cab}<worksheet ${ns}><cols><col min="1" max="${filas[0].length}" width="20" customWidth="1"/></cols><sheetData>${celdas}</sheetData></worksheet>`]
  ];
  const url = URL.createObjectURL(zipSinCompresion(archivos));
  const a = document.createElement('a');
  a.href = url; a.download = nombre; a.click();
  URL.revokeObjectURL(url);
};


const V = {};
const A = {};
window.A = A;
load();
