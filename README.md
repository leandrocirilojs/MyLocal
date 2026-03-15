# GeoTrack — Rastreador de Localização com Firebase

App web completo para rastrear a localização do celular em tempo real, com banco de dados no Firebase Realtime Database.

## Arquivos

```
location-tracker/
├── index.html   → Estrutura e layout
├── style.css    → Estilos (tema escuro, responsivo)
├── app.js       → Lógica de rastreamento + Firebase
└── README.md    → Este arquivo
```

## Como usar

### 1. Configurar o Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Crie um novo projeto
3. Clique em **Adicionar app → Web**
4. Copie as credenciais (apiKey, authDomain, etc.)
5. Ative o **Realtime Database** no menu lateral
6. Cole as credenciais na aba **Configurar** do app

### 2. Regras de segurança (Firebase Console → Realtime Database → Regras)

```json
{
  "rules": {
    "locations": {
      "$deviceId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

> Para produção, use autenticação e restrinja as regras.

### 3. Executar

Abra o `index.html` em um servidor local (ex: Live Server no VS Code) ou hospede no Firebase Hosting.

```bash
# Com Python
python3 -m http.server 8080

# Com Node.js
npx serve .
```

> Não abra o arquivo diretamente com `file://` — a API de geolocalização exige HTTPS ou localhost.

## Estrutura dos dados no Firebase

```
locations/
  device_abc123/
    current/
      lat: -23.5505
      lng: -46.6333
      accuracy: 12.5
      timestamp: 1710509400000
      deviceId: "device_abc123"
    history/
      -NxABC.../
        lat: ...
        lng: ...
        accuracy: ...
        timestamp: ...
```

## Funcionalidades

- Rastreamento GPS em tempo real com `watchPosition`
- Salva posição atual e histórico no Firebase
- Mapa ao vivo via OpenStreetMap (iframe)
- Histórico local com até 100 registros
- Múltiplos dispositivos (cada um tem ID único)
- Tema escuro responsivo
- Configuração sem código (pelo painel)

## Tecnologias

- HTML5 / CSS3 / JavaScript puro
- Firebase Realtime Database (SDK v10 compat)
- OpenStreetMap para visualização do mapa
- Google Fonts: Syne + DM Mono
