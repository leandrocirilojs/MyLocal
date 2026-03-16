/* ─────────────────────────────────────────────
   GeoTrack — app.js
   Rastreador de localização com Firebase
───────────────────────────────────────────── */

// ── Estado global
let firebaseApp = null;
let db = null;
let watchId = null;
let isTracking = false;
let updateCount = 0;
let locationHistory = [];

// ── ID único do dispositivo
const DEVICE_ID = (() => {
  let id = localStorage.getItem('geotrack_device_id');
  if (!id) {
    id = 'device_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('geotrack_device_id', id);
  }
  return id;
})();

// ── Inicialização
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('deviceIdDisplay').textContent = DEVICE_ID;
  document.getElementById('deviceName').textContent = navigator.userAgent.includes('Mobile') ? 'Celular' : 'Este dispositivo';
  setupNav();

  // Inicializa direto pelo config.js se as credenciais foram preenchidas
  if (typeof FIREBASE_CONFIG !== 'undefined' && FIREBASE_CONFIG.apiKey !== 'COLE_AQUI') {
    initFirebase(FIREBASE_CONFIG);
    document.getElementById('cfgApiKey').value      = FIREBASE_CONFIG.apiKey      || '';
    document.getElementById('cfgAuthDomain').value  = FIREBASE_CONFIG.authDomain  || '';
    document.getElementById('cfgDatabaseURL').value = FIREBASE_CONFIG.databaseURL || '';
    document.getElementById('cfgProjectId').value   = FIREBASE_CONFIG.projectId   || '';
    document.getElementById('cfgAppId').value       = FIREBASE_CONFIG.appId       || '';
  } else {
    loadConfig();
  }
});

// ── Navegação por abas
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

// ── Firebase: carregar config salva
function loadConfig() {
  const saved = localStorage.getItem('geotrack_firebase_config');
  if (!saved) return;
  try {
    const cfg = JSON.parse(saved);
    document.getElementById('cfgApiKey').value     = cfg.apiKey     || '';
    document.getElementById('cfgAuthDomain').value = cfg.authDomain || '';
    document.getElementById('cfgDatabaseURL').value = cfg.databaseURL || '';
    document.getElementById('cfgProjectId').value  = cfg.projectId  || '';
    document.getElementById('cfgAppId').value      = cfg.appId      || '';
    initFirebase(cfg);
  } catch (e) {
    console.warn('Config inválida:', e);
  }
}

// ── Firebase: salvar config
function saveConfig() {
  const cfg = {
    apiKey:      document.getElementById('cfgApiKey').value.trim(),
    authDomain:  document.getElementById('cfgAuthDomain').value.trim(),
    databaseURL: document.getElementById('cfgDatabaseURL').value.trim(),
    projectId:   document.getElementById('cfgProjectId').value.trim(),
    appId:       document.getElementById('cfgAppId').value.trim(),
  };

  if (!cfg.apiKey || !cfg.databaseURL) {
    showConfigMsg('Preencha ao menos a API Key e a Database URL.', 'error');
    return;
  }

  localStorage.setItem('geotrack_firebase_config', JSON.stringify(cfg));
  initFirebase(cfg);
  showConfigMsg('Configuração salva! Firebase inicializado.', 'success');
}

// ── Firebase: inicializar
function initFirebase(cfg) {
  try {
    if (firebaseApp) {
      firebase.app().delete();
    }
    firebaseApp = firebase.initializeApp(cfg);
    db = firebase.database();
    setConnected(true);
    monitorConnection();
  } catch (e) {
    console.error('Erro ao inicializar Firebase:', e);
    setConnected(false);
    showConfigMsg('Erro: ' + e.message, 'error');
  }
}

// ── Firebase: monitorar conexão em tempo real
function monitorConnection() {
  if (!db) return;
  const connRef = db.ref('.info/connected');
  connRef.on('value', snap => setConnected(snap.val() === true));
}

// ── Firebase: testar conexão
function testConnection() {
  if (!db) {
    showConfigMsg('Configure o Firebase primeiro.', 'error');
    return;
  }
  db.ref('.info/connected').once('value')
    .then(snap => {
      if (snap.val()) {
        showConfigMsg('Conexão bem-sucedida!', 'success');
      } else {
        showConfigMsg('Firebase inicializado, mas sem conexão ativa.', 'error');
      }
    })
    .catch(e => showConfigMsg('Falha: ' + e.message, 'error'));
}

// ── Firebase: salvar localização
function saveLocation(lat, lng, accuracy) {
  if (!db) return;

  const data = {
    lat,
    lng,
    accuracy: parseFloat(accuracy.toFixed(2)),
    timestamp: Date.now(),
    deviceId: DEVICE_ID,
  };

  // Posição atual (sobrescreve)
  db.ref('locations/' + DEVICE_ID + '/current').set(data)
    .catch(e => console.error('Erro ao salvar posição atual:', e));

  // Histórico (acumula)
  db.ref('locations/' + DEVICE_ID + '/history').push(data)
    .catch(e => console.error('Erro ao salvar histórico:', e));
}

// ── Rastreamento: iniciar/parar
function toggleTracking() {
  if (isTracking) {
    stopTracking();
  } else {
    startTracking();
  }
}

function startTracking() {
  if (!navigator.geolocation) {
    alert('Geolocalização não suportada neste navegador.');
    return;
  }

  isTracking = true;
  updateBtnState();

  watchId = navigator.geolocation.watchPosition(
    onPosition,
    onPositionError,
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 15000,
    }
  );
}

function stopTracking() {
  isTracking = false;
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  updateBtnState();
}

// ── Callback: posição recebida
function onPosition(position) {
  const { latitude, longitude, accuracy } = position.coords;
  updateCount++;

  // UI métricas
  document.getElementById('metLat').textContent   = latitude.toFixed(6);
  document.getElementById('metLng').textContent   = longitude.toFixed(6);
  document.getElementById('metAcc').textContent   = accuracy.toFixed(1) + 'm';
  document.getElementById('metCount').textContent = updateCount;

  // Última atualização
  const now = new Date().toLocaleString('pt-BR');
  document.getElementById('lastUpdate').textContent = 'Última atualização: ' + now;

  // Mapa (OpenStreetMap via iframe embed)
  updateMap(latitude, longitude);

  // Firebase
  saveLocation(latitude, longitude, accuracy);

  // Histórico local
  addToHistory(latitude, longitude, accuracy, now);
}

function onPositionError(err) {
  console.warn('Erro de geolocalização:', err.message);
  document.getElementById('lastUpdate').textContent = 'Erro: ' + err.message;
}

// ── Mapa: atualizar iframe (OpenStreetMap)
function updateMap(lat, lng) {
  const placeholder = document.getElementById('mapPlaceholder');
  const iframe = document.getElementById('mapIframe');
  const mapLink = document.getElementById('mapLink');

  const zoom = 16;
  const url = `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.005},${lat-0.005},${lng+0.005},${lat+0.005}&layer=mapnik&marker=${lat},${lng}`;

  placeholder.style.display = 'none';
  iframe.style.display = 'block';
  iframe.src = url;

  mapLink.href = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`;
  mapLink.style.display = 'inline';
}

// ── Histórico local
function addToHistory(lat, lng, accuracy, time) {
  const entry = {
    index: updateCount,
    lat: lat.toFixed(6),
    lng: lng.toFixed(6),
    acc: accuracy.toFixed(1),
    time,
  };
  locationHistory.unshift(entry);
  if (locationHistory.length > 100) locationHistory.pop();
  renderHistory();
}

function renderHistory() {
  const tbody = document.getElementById('historyBody');
  if (!locationHistory.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Nenhum registro ainda</td></tr>';
    return;
  }
  tbody.innerHTML = locationHistory.map(entry => `
    <tr>
      <td>${entry.index}</td>
      <td>${entry.lat}</td>
      <td>${entry.lng}</td>
      <td>${entry.acc}m</td>
      <td>${entry.time}</td>
      <td>
        <button class="map-btn" onclick="openMapRow('${entry.lat}','${entry.lng}')">Ver mapa</button>
      </td>
    </tr>
  `).join('');
}

function openMapRow(lat, lng) {
  window.open(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`, '_blank');
}

function clearHistory() {
  locationHistory = [];
  updateCount = 0;
  document.getElementById('metCount').textContent = '0';
  renderHistory();

  // Remove histórico do Firebase também
  if (db) {
    db.ref('locations/' + DEVICE_ID + '/history').remove()
      .catch(e => console.error('Erro ao limpar Firebase:', e));
  }
}

// ── UI helpers
function updateBtnState() {
  const btn = document.getElementById('btnTrack');
  if (isTracking) {
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="2" y="2" width="4" height="10" rx="1" fill="currentColor"/>
        <rect x="8" y="2" width="4" height="10" rx="1" fill="currentColor"/>
      </svg>
      Parar Rastreamento
    `;
    btn.classList.add('danger');
  } else {
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/>
        <circle cx="7" cy="7" r="2.5" fill="currentColor"/>
      </svg>
      Iniciar Rastreamento
    `;
    btn.classList.remove('danger');
  }
}

function setConnected(connected) {
  const pill = document.getElementById('connectionStatus');
  const text = document.getElementById('statusText');
  if (connected) {
    pill.classList.add('connected');
    text.textContent = 'Firebase OK';
  } else {
    pill.classList.remove('connected');
    text.textContent = 'Desconectado';
  }
}

function showConfigMsg(msg, type) {
  const el = document.getElementById('configMsg');
  el.textContent = msg;
  el.className = 'config-msg ' + type;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

function copyRules() {
  const text = document.getElementById('rulesCode').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('.copy-btn');
    btn.textContent = 'Copiado!';
    setTimeout(() => btn.textContent = 'Copiar', 2000);
  });
     }
