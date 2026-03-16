/* ─────────────────────────────────────────────
   GeoTrack — app.js
   Multi-usuário + Login Google + Painel Admin
───────────────────────────────────────────── */

let db = null;
let auth = null;
let currentUser = null;
let watchId = null;
let isTracking = false;
let updateCount = 0;
let locationHistory = [];
let usersListener = null;

// ─── Cole o seu email aqui para ter acesso de admin
const ADMIN_EMAIL = FIREBASE_CONFIG.adminEmail || '';

// ─── Init Firebase
firebase.initializeApp(FIREBASE_CONFIG);
db   = firebase.database();
auth = firebase.auth();

// ─── Observa estado de autenticação
auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    showApp(user);
  } else {
    currentUser = null;
    showLogin();
  }
});

// ─── Login Google
function loginGoogle() {
  const el = document.getElementById('loginError');
  el.style.display = 'none';

  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  auth.signInWithPopup(provider)
    .then(() => {
      // sucesso — onAuthStateChanged cuida do resto
    })
    .catch(err => {
      el.textContent = 'Erro: ' + err.message;
      el.style.display = 'block';
    });
}

// ─── Logout
function logout() {
  stopTracking();
  if (currentUser) {
    db.ref('users/' + currentUser.uid + '/online').set(false);
  }
  auth.signOut();
}

// ─── Mostra tela de login
function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('appScreen').style.display   = 'none';
}

// ─── Mostra app após login
function showApp(user) {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appScreen').style.display   = 'flex';

  // Foto e nome
  const avatar = document.getElementById('userAvatar');
  if (user.photoURL) { avatar.src = user.photoURL; avatar.style.display = 'block'; }
  document.getElementById('userName').textContent  = user.displayName || 'Usuário';
  document.getElementById('userEmail').textContent = user.email || '';

  // Salva perfil no Firebase
  db.ref('users/' + user.uid).update({
    name:   user.displayName || 'Usuário',
    email:  user.email || '',
    photo:  user.photoURL || '',
    online: true,
    lastSeen: Date.now(),
  });

  // Marca offline ao fechar
  db.ref('users/' + user.uid + '/online').onDisconnect().set(false);

  // Admin?
  const isAdmin = user.email === ADMIN_EMAIL;
  document.getElementById('adminTab').style.display = isAdmin ? 'flex' : 'none';
  if (isAdmin) listenAllUsers();

  monitorConnection();
  setupNav();
}

// ─── Monitora conexão Firebase
function monitorConnection() {
  db.ref('.info/connected').on('value', snap => setConnected(snap.val() === true));
}

// ─── Navegação
function setupNav() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + tab).classList.add('active');
    });
  });
}

// ─── Rastreamento
function toggleTracking() {
  isTracking ? stopTracking() : startTracking();
}

function startTracking() {
  if (!navigator.geolocation) { alert('GPS não disponível neste navegador.'); return; }
  isTracking = true;
  updateBtnState();
  watchId = navigator.geolocation.watchPosition(onPosition, onPositionError, {
    enableHighAccuracy: true, maximumAge: 5000, timeout: 15000,
  });
}

function stopTracking() {
  isTracking = false;
  if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  if (currentUser) db.ref('users/' + currentUser.uid + '/tracking').set(false);
  updateBtnState();
}

function onPosition(pos) {
  const { latitude: lat, longitude: lng, accuracy } = pos.coords;
  updateCount++;

  document.getElementById('metLat').textContent   = lat.toFixed(6);
  document.getElementById('metLng').textContent   = lng.toFixed(6);
  document.getElementById('metAcc').textContent   = accuracy.toFixed(1) + 'm';
  document.getElementById('metCount').textContent = updateCount;

  const now = new Date().toLocaleString('pt-BR');
  document.getElementById('lastUpdate').textContent = 'Última atualização: ' + now;

  updateMap(lat, lng);
  saveLocation(lat, lng, accuracy, now);
  addToHistory(lat, lng, accuracy, now);
}

function onPositionError(err) {
  document.getElementById('lastUpdate').textContent = 'Erro GPS: ' + err.message;
}

// ─── Salva no Firebase
function saveLocation(lat, lng, accuracy, timeStr) {
  if (!currentUser || !db) return;
  const uid = currentUser.uid;
  const data = {
    lat, lng,
    accuracy: parseFloat(accuracy.toFixed(2)),
    timestamp: Date.now(),
    time: timeStr,
    name:  currentUser.displayName || 'Usuário',
    email: currentUser.email || '',
    photo: currentUser.photoURL || '',
    tracking: true,
  };
  // Posição atual do usuário
  db.ref('users/' + uid + '/current').set(data);
  // Histórico do usuário
  db.ref('users/' + uid + '/history').push(data);
}

// ─── Mapa
function updateMap(lat, lng) {
  document.getElementById('mapPlaceholder').style.display = 'none';
  const iframe = document.getElementById('mapIframe');
  iframe.style.display = 'block';
  iframe.src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.005},${lat-0.005},${lng+0.005},${lat+0.005}&layer=mapnik&marker=${lat},${lng}`;
  const ml = document.getElementById('mapLink');
  ml.href = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
  ml.style.display = 'inline';
}

// ─── Admin: escuta todos os usuários
function listenAllUsers() {
  if (usersListener) return;
  usersListener = db.ref('users').on('value', snap => {
    const data = snap.val() || {};
    renderUsersGrid(data);
  });
}

function renderUsersGrid(data) {
  const grid = document.getElementById('usersGrid');
  const users = Object.entries(data);
  const active = users.filter(([, u]) => u.current && u.tracking);

  document.getElementById('onlineCount').textContent = active.length;

  if (!users.length) {
    grid.innerHTML = '<p class="empty-msg">Nenhum usuário cadastrado ainda</p>';
    return;
  }

  grid.innerHTML = users.map(([uid, u]) => {
    const cur = u.current;
    const hasLoc = cur && cur.lat;
    const isOnline = u.online && u.tracking;
    const initials = (u.name || 'U').split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase();
    const mapsUrl = hasLoc ? `https://www.openstreetmap.org/?mlat=${cur.lat}&mlon=${cur.lng}#map=16/${cur.lat}/${cur.lng}` : '#';

    return `
      <div class="user-card ${isOnline ? 'user-online' : ''}">
        <div class="user-card-top">
          ${u.photo
            ? `<img src="${u.photo}" class="user-avatar" alt="" />`
            : `<div class="user-avatar-initials">${initials}</div>`
          }
          <div class="user-card-info">
            <span class="user-card-name">${u.name || 'Usuário'}</span>
            <span class="user-card-email">${u.email || ''}</span>
          </div>
          <span class="user-badge ${isOnline ? 'badge-on' : 'badge-off'}">${isOnline ? 'Ativo' : 'Offline'}</span>
        </div>
        ${hasLoc ? `
          <div class="user-card-coords">
            <span class="mono">${parseFloat(cur.lat).toFixed(5)}, ${parseFloat(cur.lng).toFixed(5)}</span>
            <span class="user-card-time">${cur.time || ''}</span>
          </div>
          <a href="${mapsUrl}" target="_blank" class="user-card-map">Ver no mapa ↗</a>
        ` : `<p class="user-card-noloc">Sem localização ainda</p>`}
      </div>
    `;
  }).join('');
}

// ─── Histórico local
function addToHistory(lat, lng, accuracy, time) {
  locationHistory.unshift({ index: updateCount, lat: lat.toFixed(6), lng: lng.toFixed(6), acc: accuracy.toFixed(1), time });
  if (locationHistory.length > 100) locationHistory.pop();
  renderHistory();
}

function renderHistory() {
  const tbody = document.getElementById('historyBody');
  if (!locationHistory.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Nenhum registro ainda</td></tr>';
    return;
  }
  tbody.innerHTML = locationHistory.map(e => `
    <tr>
      <td>${e.index}</td><td>${e.lat}</td><td>${e.lng}</td>
      <td>${e.acc}m</td><td>${e.time}</td>
      <td><button class="map-btn" onclick="openMapRow('${e.lat}','${e.lng}')">Ver mapa</button></td>
    </tr>`).join('');
}

function openMapRow(lat, lng) {
  window.open(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`, '_blank');
}

function clearHistory() {
  locationHistory = [];
  updateCount = 0;
  document.getElementById('metCount').textContent = '0';
  renderHistory();
  if (currentUser && db) db.ref('users/' + currentUser.uid + '/history').remove();
}

// ─── UI helpers
function updateBtnState() {
  const btn = document.getElementById('btnTrack');
  if (isTracking) {
    btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="4" height="10" rx="1" fill="currentColor"/><rect x="8" y="2" width="4" height="10" rx="1" fill="currentColor"/></svg> Parar Rastreamento`;
    btn.classList.add('danger');
  } else {
    btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/><circle cx="7" cy="7" r="2.5" fill="currentColor"/></svg> Iniciar Rastreamento`;
    btn.classList.remove('danger');
  }
}

function setConnected(connected) {
  const pill = document.getElementById('connectionStatus');
  const text = document.getElementById('statusText');
  pill.classList.toggle('connected', connected);
  text.textContent = connected ? 'Firebase OK' : 'Desconectado';
}
