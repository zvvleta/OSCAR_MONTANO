'use strict';


/* ───── Si ya hay una sesión abierta, ir directo al módulo ───── */
const abierta = db.users.find(x => x.u === sessionStorage.getItem('om_user'));
if (abierta) location.replace(PAGES[abierta.r]);

/* ───── Temporizador de la pausa del administrador ───── */
let tm;

// Muestra la cuenta regresiva de la pausa
const espera = u => {
  clearInterval(tm);
  const er = $('#lerr');
  const t = () => {
    const s = Math.ceil((u.until - Date.now()) / 1000);
    if (s <= 0) {
      clearInterval(tm);
      er.hidden = true;
      return;
    }
    er.hidden = false;
    er.textContent = `La cuenta está en pausa por los intentos fallidos. Podrá reintentar en ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  t();
  tm = setInterval(t, 1000);
};

// Al cambiar el usuario se limpia el aviso
$('#lu').oninput = () => {
  clearInterval(tm);
  $('#lerr').hidden = true;
};

/* ───── Envío del formulario ───── */
$('#loginForm').onsubmit = e => {
  e.preventDefault();
  const u = db.users.find(x => x.u === $('#lu').value.trim()), er = $('#lerr');
  er.hidden = false;

  // Usuario inexistente
  if (!u) {
    er.textContent = 'Usuario o contraseña incorrectos.';
    return;
  }

  const adm = u.r === 'Administrador';

  // Administrador en pausa
  if (adm && u.until > Date.now()) {
    espera(u);
    return;
  }

  // Cuenta bloqueada
  if (!adm && u.f >= MAXTRY) {
    er.textContent = 'La cuenta está bloqueada. El Administrador puede habilitarla.';
    return;
  }

  // Contraseña incorrecta
  if (u.p !== $('#lp').value) {
    u.f++;
    if (adm && u.f >= MAXTRY) {
      u.f = 0;
      u.until = Date.now() + WAIT;
      save();
      espera(u);
      return;
    }
    save();
    er.textContent = u.f >= MAXTRY ? 'La cuenta quedó bloqueada por los intentos fallidos.' : (MAXTRY - u.f === 1 ? 'La contraseña no es correcta. Queda un último intento antes del bloqueo.' : 'La contraseña no es correcta.');
    return;
  }

  // Acceso correcto
  u.f = 0;
  u.until = 0;
  save();
  clearInterval(tm);
  sessionStorage.setItem('om_user', u.u);
  location.href = PAGES[u.r];
};
