<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GeoTrack</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="style.css" />
</head>
<body>

  <!-- TELA DE LOGIN -->
  <div id="loginScreen" class="login-screen">
    <div class="login-card">
      <div class="logo">
        <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="13" stroke="#00E5A0" stroke-width="1.5"/>
          <circle cx="14" cy="14" r="4" fill="#00E5A0"/>
          <line x1="14" y1="1" x2="14" y2="7" stroke="#00E5A0" stroke-width="1.5"/>
          <line x1="14" y1="21" x2="14" y2="27" stroke="#00E5A0" stroke-width="1.5"/>
          <line x1="1" y1="14" x2="7" y2="14" stroke="#00E5A0" stroke-width="1.5"/>
          <line x1="21" y1="14" x2="27" y2="14" stroke="#00E5A0" stroke-width="1.5"/>
        </svg>
        <span>GeoTrack</span>
      </div>
      <h2>Entrar na sua conta</h2>
      <p class="login-sub">Faça login para rastrear ou monitorar localizações</p>
      <button class="btn-google" onclick="loginGoogle()">
        <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.96L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
        Entrar com Google
      </button>
      <div id="loginError" class="login-error" style="display:none"></div>
    </div>
  </div>

  <!-- APP PRINCIPAL -->
  <div id="appScreen" class="app" style="display:none">
    <aside class="sidebar">
      <div class="logo">
        <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="13" stroke="#00E5A0" stroke-width="1.5"/>
          <circle cx="14" cy="14" r="4" fill="#00E5A0"/>
          <line x1="14" y1="1" x2="14" y2="7" stroke="#00E5A0" stroke-width="1.5"/>
          <line x1="14" y1="21" x2="14" y2="27" stroke="#00E5A0" stroke-width="1.5"/>
          <line x1="1" y1="14" x2="7" y2="14" stroke="#00E5A0" stroke-width="1.5"/>
          <line x1="21" y1="14" x2="27" y2="14" stroke="#00E5A0" stroke-width="1.5"/>
        </svg>
        <span>GeoTrack</span>
      </div>

      <nav class="nav">
        <button class="nav-item active" data-tab="dashboard">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.4"/></svg>
          Meu Rastreio
        </button>
        <button class="nav-item" data-tab="admin" id="adminTab" style="display:none">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.4"/><path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
          Todos os Usuários
        </button>
        <button class="nav-item" data-tab="history">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.4"/><path d="M8 4.5V8l2.5 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
          Histórico
        </button>
      </nav>

      <div class="sidebar-bottom">
        <div class="user-info" id="userInfo">
          <img id="userAvatar" src="" alt="" width="28" height="28" style="border-radius:50%; display:none; flex-shrink:0"/>
          <div style="overflow:hidden">
            <p id="userName" style="font-size:12px; font-weight:600; margin:0; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"></p>
            <p id="userEmail" style="font-size:10px; margin:0; color:var(--text-2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"></p>
          </div>
        </div>
        <button class="btn-logout" onclick="logout()">Sair</button>
        <div class="status-pill" id="connectionStatus">
          <span class="dot"></span>
          <span id="statusText">Conectando…</span>
        </div>
      </div>
    </aside>

    <main class="main">

      <!-- Tab: Meu Rastreio -->
      <section class="tab active" id="tab-dashboard">
        <header class="page-header">
          <div>
            <h1>Meu Rastreio</h1>
            <p class="subtitle">Sua localização em tempo real</p>
          </div>
          <button class="btn-primary" id="btnTrack" onclick="toggleTracking()">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/><circle cx="7" cy="7" r="2.5" fill="currentColor"/></svg>
            Iniciar Rastreamento
          </button>
        </header>
        <div class="metrics">
          <div class="metric-card"><span class="metric-label">Latitude</span><span class="metric-value" id="metLat">—</span></div>
          <div class="metric-card"><span class="metric-label">Longitude</span><span class="metric-value" id="metLng">—</span></div>
          <div class="metric-card"><span class="metric-label">Precisão</span><span class="metric-value" id="metAcc">—</span></div>
          <div class="metric-card"><span class="metric-label">Atualizações</span><span class="metric-value" id="metCount">0</span></div>
        </div>
        <div class="map-container">
          <div class="map-header">
            <span>Mapa ao vivo</span>
            <a id="mapLink" href="#" target="_blank" class="map-ext-link" style="display:none">Abrir no Maps ↗</a>
          </div>
          <div id="mapFrame">
            <div class="map-placeholder" id="mapPlaceholder">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="18" stroke="#00E5A0" stroke-width="1.5" stroke-dasharray="4 3"/><circle cx="20" cy="20" r="5" fill="#00E5A0" opacity="0.3"/></svg>
              <p>Aguardando localização…</p>
            </div>
            <iframe id="mapIframe" style="display:none; width:100%; height:100%; border:none;" loading="lazy"></iframe>
          </div>
        </div>
        <div class="last-update"><span class="mono" id="lastUpdate">Nenhuma atualização</span></div>
      </section>

      <!-- Tab: Admin -->
      <section class="tab" id="tab-admin">
        <header class="page-header">
          <div><h1>Todos os Usuários</h1><p class="subtitle">Localizações em tempo real</p></div>
          <div class="metric-card" style="padding:8px 16px; min-width:auto; flex-shrink:0">
            <span class="metric-label">Online</span>
            <span class="metric-value" id="onlineCount">0</span>
          </div>
        </header>
        <div id="usersGrid" class="users-grid">
          <p class="empty-msg">Nenhum usuário rastreando ainda</p>
        </div>
      </section>

      <!-- Tab: Histórico -->
      <section class="tab" id="tab-history">
        <header class="page-header">
          <div><h1>Histórico</h1><p class="subtitle">Seus registros no Firebase</p></div>
          <button class="btn-ghost" onclick="clearHistory()">Limpar</button>
        </header>
        <div class="history-table-wrap">
          <table class="history-table">
            <thead><tr><th>#</th><th>Latitude</th><th>Longitude</th><th>Precisão</th><th>Horário</th><th></th></tr></thead>
            <tbody id="historyBody"><tr class="empty-row"><td colspan="6">Nenhum registro ainda</td></tr></tbody>
          </table>
        </div>
      </section>

    </main>
  </div>

  <script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-database-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-auth-compat.js"></script>
  <script src="config.js"></script>
  <script src="app.js"></script>
</body>
</html>  auth.signInWithPopup(provider).catch(err => {
    const el = document.getElementById('loginError');
    el.textContent = 'Erro ao entrar: ' + err.message;
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
