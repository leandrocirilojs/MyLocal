/* ═══════════════════════════════════════════
   GeoTrack — app.js
   Rastreador Anti-Furto com Firebase
═══════════════════════════════════════════ */

let db = null;
let auth = null;
let currentUser = null;
let watchId = null;
let isTracking = false;
let updateCount = 0;
let locationHistory = [];
let usersListener = null;
let lastSavedPos = null;
let swRegistration = null;
let lastSimCard = localStorage.getItem('geotrack_simcard') || null;

const ADMIN_EMAIL = FIREBASE_CONFIG.adminEmail || '';
const UNLOCK_PIN  = FIREBASE_CONFIG.unlockPin  || '1234';
const TRACK_INTERVAL = 2 * 60 * 1000; // 2 minutos

// ── Init Firebase
firebase.initializeApp(FIREBASE_CONFIG);
db   = firebase.database();
auth = firebase.auth();

// ── Registra Service Worker (PWA + segundo plano)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(reg => {
      swRegistration = reg;
      // Escuta mensagens do SW
      navigator.serviceWorker.addEventListener('message', e => {
        if (e.data.type === 'REQUEST_LOCATION') captureAndSend();
      });
    })
    .catch(err => console.warn('SW:', err));
}

// ── Auth
auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    showApp(user);
    checkAutoTrack();
  } else {
    currentUser = null;
    showLogin();
  }
});

function loginGoogle() {
  const el = document.getElementById('loginError');
  el.style.display = 'none';
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  auth.signInWithPopup(provider).catch(err => {
    el.textContent = 'Erro: ' + err.message;
    el.style.display = 'block';
  });
}

function logout() {
  // Pede PIN antes de sair
  showPinModal('sair', () => {
    stopTracking();
    if (currentUser) db.ref('users/' + currentUser.uid + '/online').set(false);
    auth.signOut();
  });
}

function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('appScreen').style.display   = 'none';
}

function showApp(user) {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appScreen').style.display   = 'flex';

  const avatar = document.getElementById('userAvatar');
  if (user.photoURL) { avatar.src = user.photoURL; avatar.style.display = 'block'; }
  document.getElementById('userName').textContent  = user.displayName || 'Usuário';
  document.getElementById('userEmail').textContent = user.email || '';

  db.ref('users/' + user.uid).update({
    name: user.displayName || 'Usuário',
    email: user.email || '',
    photo: user.photoURL || '',
    online: true,
    lastSeen: Date.now(),
  });

  db.ref('users/' + user.uid + '/online').onDisconnect().set(false);

  const isAdmin = user.email === ADMIN_EMAIL;
  document.getElementById('adminTab').style.display = isAdmin ? 'flex' : 'none';
  if (isAdmin) listenAllUsers();

  monitorConnection();
  setupNav();
  requestNotificationPermission();
  detectSimChange();
}

// ── Auto-rastreamento ao abrir o app (se estava rastreando antes)
function checkAutoTrack() {
  const wasTracking = localStorage.getItem('geotrack_was_tracking');
  if (wasTracking === 'true') {
    setTimeout(() => startTracking(true), 1500);
  }
  // Verifica parâmetro de URL ?action=track (atalho PWA)
  if (location.search.includes('action=track')) {
    setTimeout(() => startTracking(true), 1500);
  }
}

// ── Monitorar troca de SIM
function detectSimChange() {
  if (!navigator.connection) return;
  // Heurística: se o IP/rede mudou drasticamente, alerta
  fetch('https://api.ipify.org?format=json')
    .then(r => r.json())
    .then(data => {
      const lastIP = localStorage.getItem('geotrack_lastip');
      if (lastIP && lastIP !== data.ip) {
        // IP mudou — possível troca de chip ou local diferente
        if (currentUser) {
          db.ref('users/' + currentUser.uid + '/alerts').push({
            type: 'network_change',
            message: 'Rede/IP alterado! Pode indicar troca de chip.',
            oldIP: lastIP,
            newIP: data.ip,
            timestamp: Date.now(),
          });
          showAlert('⚠️ Rede alterada! IP anterior: ' + lastIP + ' → Novo: ' + data.ip);
        }
      }
      localStorage.setItem('geotrack_lastip', data.ip);
    })
    .catch(() => {});
}

// ── Permissão de notificações
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: './icon-192.png' });
  }
}

// ── Conexão Firebase
function monitorConnection() {
  db.ref('.info/connected').on('value', snap => setConnected(snap.val() === true));
}

// ── Navegação
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

// ── Rastreamento
function toggleTracking() {
  if (isTracking) {
    showPinModal('parar o rastreamento', () => stopTracking());
  } else {
    startTracking();
  }
}

function startTracking(silent = false) {
  if (!navigator.geolocation) { alert('GPS não disponível.'); return; }
  isTracking = true;
  lastSavedPos = null;
  localStorage.setItem('geotrack_was_tracking', 'true');
  updateBtnState();

  // Captura imediata
  captureAndSend();

  // Monitoramento contínuo
  watchId = navigator.geolocation.watchPosition(onPosition, onPositionError, {
    enableHighAccuracy: true, maximumAge: 30000, timeout: 30000,
  });

  // Dispara SW para segundo plano
  if (swRegistration && swRegistration.active) {
    swRegistration.active.postMessage({
      type: 'START_BACKGROUND_TRACKING',
      interval: TRACK_INTERVAL,
    });
  }

  if (!silent) {
    sendNotification('GeoTrack ativo', 'Rastreamento iniciado. Localização será enviada automaticamente.');
    showAlert('🔒 Rastreamento iniciado! O app continuará enviando sua localização mesmo com a tela apagada.', 'success');
  }

  // Também salva a cada 2 min via setInterval (fallback)
  if (window._trackTimer) clearInterval(window._trackTimer);
  window._trackTimer = setInterval(captureAndSend, TRACK_INTERVAL);
}

function stopTracking() {
  isTracking = false;
  localStorage.setItem('geotrack_was_tracking', 'false');
  if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  if (window._trackTimer) { clearInterval(window._trackTimer); window._trackTimer = null; }
  if (currentUser) db.ref('users/' + currentUser.uid + '/tracking').set(false);
  if (swRegistration && swRegistration.active) {
    swRegistration.active.postMessage({ type: 'STOP_BACKGROUND_TRACKING' });
  }
  updateBtnState();
}

// ── Captura e envia localização (usado pelo SW também)
function captureAndSend() {
  if (!navigator.geolocation || !currentUser) return;
  navigator.geolocation.getCurrentPosition(pos => {
    onPosition(pos);
  }, () => {}, { enableHighAccuracy: true, timeout: 15000 });
}

// ── Calcula distância (Haversine)
function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── Recebe posição GPS
function onPosition(pos) {
  const { latitude: lat, longitude: lng, accuracy } = pos.coords;

  document.getElementById('metLat').textContent = lat.toFixed(6);
  document.getElementById('metLng').textContent = lng.toFixed(6);
  document.getElementById('metAcc').textContent = accuracy.toFixed(1) + 'm';
  updateMap(lat, lng);
  getAddress(lat, lng);

  // Só salva no Firebase se moveu 50m OU se não há posição anterior
  if (lastSavedPos) {
    const dist = calcDistance(lastSavedPos.lat, lastSavedPos.lng, lat, lng);
    if (dist < 50) {
      document.getElementById('lastUpdate').textContent = 'Aguardando mover 50m… (atual: ' + Math.round(dist) + 'm)';
      return;
    }
  }

  updateCount++;
  lastSavedPos = { lat, lng };
  document.getElementById('metCount').textContent = updateCount;

  const now = new Date().toLocaleString('pt-BR');
  document.getElementById('lastUpdate').textContent = 'Salvo: ' + now;

  saveLocation(lat, lng, accuracy, now);
  addToHistory(lat, lng, accuracy, now);
  checkGeofence(lat, lng);
}

function onPositionError(err) {
  document.getElementById('lastUpdate').textContent = 'Erro GPS: ' + err.message;
}

// ── Salva no Firebase
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
    battery: null,
  };

  // Tenta pegar nível de bateria
  if (navigator.getBattery) {
    navigator.getBattery().then(bat => {
      data.battery = Math.round(bat.level * 100);
      db.ref('users/' + uid + '/current').set(data);
      db.ref('users/' + uid + '/history').push(data);
    }).catch(() => {
      db.ref('users/' + uid + '/current').set(data);
      db.ref('users/' + uid + '/history').push(data);
    });
  } else {
    db.ref('users/' + uid + '/current').set(data);
    db.ref('users/' + uid + '/history').push(data);
  }
}

// ── Busca endereço por extenso (reverse geocoding)
function getAddress(lat, lng) {
  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=pt-BR`)
    .then(r => r.json())
    .then(data => {
      const addr = data.display_name || '';
      const short = addr.split(',').slice(0,3).join(',');
      document.getElementById('metAddress').textContent = short || '—';
      if (currentUser) {
        db.ref('users/' + currentUser.uid + '/current/address').set(short);
      }
    })
    .catch(() => {});
}

// ── Cerca virtual (Geofence)
let geofenceCenter = JSON.parse(localStorage.getItem('geotrack_geofence') || 'null');
let geofenceRadius = parseInt(localStorage.getItem('geotrack_geofence_radius') || '500');
let geofenceInside = true;

function checkGeofence(lat, lng) {
  if (!geofenceCenter) return;
  const dist = calcDistance(geofenceCenter.lat, geofenceCenter.lng, lat, lng);
  const outside = dist > geofenceRadius;

  if (outside && geofenceInside) {
    geofenceInside = false;
    const msg = '🚨 ALERTA: Saiu da área segura! (' + Math.round(dist) + 'm do centro)';
    sendNotification('GeoTrack — Alerta!', msg);
    showAlert(msg, 'danger');
    if (currentUser) {
      db.ref('users/' + currentUser.uid + '/alerts').push({
        type: 'geofence_exit',
        message: msg,
        lat, lng, dist: Math.round(dist),
        timestamp: Date.now(),
      });
    }
  } else if (!outside && !geofenceInside) {
    geofenceInside = true;
  }

  // Atualiza display da distância na aba geofence
  const el = document.getElementById('geofenceDist');
  if (el) el.textContent = Math.round(dist) + 'm do centro';
}

function saveGeofence() {
  if (!lastSavedPos) { showAlert('Inicie o rastreamento primeiro para definir o centro.', 'danger'); return; }
  const radius = parseInt(document.getElementById('geofenceRadius').value) || 500;
  geofenceCenter = { lat: lastSavedPos.lat, lng: lastSavedPos.lng };
  geofenceRadius = radius;
  localStorage.setItem('geotrack_geofence', JSON.stringify(geofenceCenter));
  localStorage.setItem('geotrack_geofence_radius', radius);
  showAlert('✅ Cerca virtual definida! Raio: ' + radius + 'm a partir da sua posição atual.', 'success');
  document.getElementById('geofenceStatus').textContent = 'Ativa — raio ' + radius + 'm';
}

function clearGeofence() {
  geofenceCenter = null;
  localStorage.removeItem('geotrack_geofence');
  localStorage.removeItem('geotrack_geofence_radius');
  document.getElementById('geofenceStatus').textContent = 'Desativada';
  document.getElementById('geofenceDist').textContent = '—';
  showAlert('Cerca virtual removida.', 'success');
}

// ── Mapa
function updateMap(lat, lng) {
  document.getElementById('mapPlaceholder').style.display = 'none';
  const iframe = document.getElementById('mapIframe');
  iframe.style.display = 'block';
  iframe.src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.005},${lat-0.005},${lng+0.005},${lat+0.005}&layer=mapnik&marker=${lat},${lng}`;
  const ml = document.getElementById('mapLink');
  ml.href = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
  ml.style.display = 'inline';
}

// ── Admin: todos os usuários
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
    grid.innerHTML = '<p class="empty-msg">Nenhum usuário ainda</p>';
    return;
  }

  grid.innerHTML = users.map(([uid, u]) => {
    const cur = u.current;
    const hasLoc = cur && cur.lat;
    const isOnline = u.online && u.tracking;
    const initials = (u.name || 'U').split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase();
    const mapsUrl = hasLoc ? `https://www.openstreetmap.org/?mlat=${cur.lat}&mlon=${cur.lng}#map=16/${cur.lat}/${cur.lng}` : '#';
    const battery = cur && cur.battery !== null && cur.battery !== undefined ? cur.battery + '%' : '—';
    const batteryColor = cur && cur.battery < 20 ? 'var(--red)' : 'var(--accent)';
    const lastSeen = u.lastSeen ? new Date(u.lastSeen).toLocaleString('pt-BR') : '—';
    const alerts = u.alerts ? Object.values(u.alerts).length : 0;

    return `
      <div class="user-card ${isOnline ? 'user-online' : ''}">
        <div class="user-card-top">
          ${u.photo ? `<img src="${u.photo}" class="user-avatar" alt=""/>` : `<div class="user-avatar-initials">${initials}</div>`}
          <div class="user-card-info">
            <span class="user-card-name">${u.name || 'Usuário'}</span>
            <span class="user-card-email">${u.email || ''}</span>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
            <span class="user-badge ${isOnline ? 'badge-on' : 'badge-off'}">${isOnline ? 'Ativo' : 'Offline'}</span>
            ${cur && cur.battery !== undefined ? `<span style="font-size:10px;font-family:var(--font-mono);color:${batteryColor}">🔋 ${battery}</span>` : ''}
          </div>
        </div>
        ${hasLoc ? `
          <div class="user-card-coords">
            <span class="mono">${parseFloat(cur.lat).toFixed(5)}, ${parseFloat(cur.lng).toFixed(5)}</span>
            <span class="user-card-time">${cur.time || ''}</span>
          </div>
          ${cur.address ? `<div style="font-size:11px;color:var(--text-2);margin-top:4px">📍 ${cur.address}</div>` : ''}
          <div style="display:flex;gap:8px;margin-top:8px;align-items:center">
            <a href="${mapsUrl}" target="_blank" class="user-card-map">Ver no mapa ↗</a>
            ${alerts > 0 ? `<span style="font-size:11px;background:var(--red-dim);color:var(--red);padding:2px 8px;border-radius:10px;font-family:var(--font-mono)">⚠ ${alerts} alerta${alerts>1?'s':''}</span>` : ''}
          </div>
        ` : `<p class="user-card-noloc">Sem localização ainda</p>`}
        ${!isOnline ? `<div style="font-size:10px;color:var(--text-3);margin-top:6px;font-family:var(--font-mono)">Última vez: ${lastSeen}</div>` : ''}
        <div style="display:flex;gap:6px;margin-top:8px">
          <button class="map-btn" onclick="removeUser('${uid}')">Remover</button>
          <button class="map-btn" onclick="viewUserHistory('${uid}', '${u.name || 'Usuário'}')">Histórico</button>
        </div>
      </div>`;
  }).join('');
}

function removeUser(uid) {
  if (!confirm('Remover este usuário do painel?')) return;
  db.ref('users/' + uid).remove();
}

function viewUserHistory(uid, name) {
  db.ref('users/' + uid + '/history').limitToLast(20).once('value', snap => {
    const data = snap.val() || {};
    const entries = Object.values(data).reverse();
    const modal = document.getElementById('historyModal');
    const title = document.getElementById('historyModalTitle');
    const body  = document.getElementById('historyModalBody');
    title.textContent = 'Histórico — ' + name;
    body.innerHTML = entries.length ? entries.map((e, i) => `
      <div style="padding:8px 0;border-bottom:0.5px solid var(--border);font-size:12px;font-family:var(--font-mono)">
        <div style="color:var(--text)">${e.lat?.toFixed(5)}, ${e.lng?.toFixed(5)}</div>
        ${e.address ? `<div style="color:var(--text-2);font-size:11px">📍 ${e.address}</div>` : ''}
        <div style="color:var(--text-3)">${e.time || ''} · ${e.accuracy}m · 🔋${e.battery ?? '—'}%</div>
        <a href="https://www.openstreetmap.org/?mlat=${e.lat}&mlon=${e.lng}#map=17/${e.lat}/${e.lng}" target="_blank" style="color:var(--accent);font-size:11px">Ver no mapa ↗</a>
      </div>`).join('') : '<p style="color:var(--text-3);text-align:center;padding:20px">Sem registros</p>';
    modal.style.display = 'flex';
  });
}

function closeHistoryModal() {
  document.getElementById('historyModal').style.display = 'none';
}

// ── Modal de PIN (proteção para sair/parar rastreamento)
function showPinModal(action, callback) {
  const modal = document.getElementById('pinModal');
  const label = document.getElementById('pinLabel');
  label.textContent = 'Digite o PIN para ' + action + ':';
  document.getElementById('pinInput').value = '';
  modal.style.display = 'flex';
  window._pinCallback = callback;
}

function confirmPin() {
  const pin = document.getElementById('pinInput').value;
  if (pin === UNLOCK_PIN) {
    document.getElementById('pinModal').style.display = 'none';
    if (window._pinCallback) window._pinCallback();
    window._pinCallback = null;
  } else {
    document.getElementById('pinError').style.display = 'block';
    setTimeout(() => document.getElementById('pinError').style.display = 'none', 2000);
  }
}

function cancelPin() {
  document.getElementById('pinModal').style.display = 'none';
  window._pinCallback = null;
}

// ── Histórico local
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
      <td><button class="map-btn" onclick="openMapRow('${e.lat}','${e.lng}')">Ver</button></td>
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

// ── Alert banner
function showAlert(msg, type = 'info') {
  const el = document.getElementById('alertBanner');
  el.textContent = msg;
  el.className = 'alert-banner alert-' + type;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 5000);
}

// ── UI helpers
function updateBtnState() {
  const btn = document.getElementById('btnTrack');
  if (isTracking) {
    btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="4" height="10" rx="1" fill="currentColor"/><rect x="8" y="2" width="4" height="10" rx="1" fill="currentColor"/></svg> <span>Parar</span>`;
    btn.classList.add('danger');
  } else {
    btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/><circle cx="7" cy="7" r="2.5" fill="currentColor"/></svg> <span>Rastrear</span>`;
    btn.classList.remove('danger');
  }
}

function setConnected(connected) {
  const pill = document.getElementById('connectionStatus');
  const text = document.getElementById('statusText');
  pill.classList.toggle('connected', connected);
  text.textContent = connected ? 'Firebase OK' : 'Desconectado';
}

// ── Instalar PWA
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  document.getElementById('btnInstall').style.display = 'flex';
});

function installPWA() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.then(() => {
    deferredInstallPrompt = null;
    document.getElementById('btnInstall').style.display = 'none';
  });
}
