'use strict';


const ROL = document.body.dataset.rol;
user = db.users.find(x => x.u === sessionStorage.getItem('om_user'));

if (!user || user.r !== ROL) {
  location.replace('inicio-de-sesion.html');
} else {
  $('#who').textContent = `${user.u} · ${user.r}`;
  $('#logout').onclick = () => {
    sessionStorage.removeItem('om_user');
    location.href = 'inicio-de-sesion.html';
  };
  sel = MENU[ROL][0][0];
  nav();
  go(sel);
}
