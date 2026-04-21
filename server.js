import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// .env dosyasını yükle
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// --- ShadowNet Master Cache ---
const caches = {
  flights: { data: { ac: [] }, lastFetch: 0, global: null },
  satellites: { data: [], lastFetch: 0 },
  tor: { data: [], lastFetch: 0 },
  news: { data: [], lastFetch: 0 },
  intel: { data: { topics: [] }, lastFetch: 0 },
  ais: { vessels: new Map(), lastFetch: 0 }
};

// --- OpenSky OAuth2 Token Management ---
let openskyToken = { value: '', expires: 0 };

async function getOpenSkyToken() {
  const now = Date.now();
  if (openskyToken.value && openskyToken.expires > now + 60000) {
    return openskyToken.value;
  }

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', process.env.OPENSKY_CLIENT_ID || '');
    params.append('client_secret', process.env.OPENSKY_CLIENT_SECRET || '');

    const response = await fetch('https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    if (response.ok) {
      const data = await response.json();
      openskyToken = {
        value: data.access_token,
        expires: now + (data.expires_in * 1000)
      };
      console.log('[MasterHub] OpenSky OAuth2 Token OBTAINED.');
      return openskyToken.value;
    }
  } catch (e) {
    console.error('[MasterHub] OAuth2 Error:', e);
    return null;
  }
}

// --- API ROUTES ---

// 1. Flights Proxy
app.get('/api/data/flights', async (req, res) => {
  const now = Date.now();
  const { lamin, lomin, lamax, lomax } = req.query;
  const GLOBAL_TTL = 90000;

  if (!caches.flights.global || now - caches.flights.global.lastFetch > GLOBAL_TTL) {
    const token = await getOpenSkyToken();
    const providers = [
      { name: 'OPENSKY', url: 'https://opensky-network.org/api/states/all', auth: true },
      { name: 'ADSB.LOL', url: 'https://api.adsb.lol/v2', auth: false }
    ];

    for (const p of providers) {
      try {
        let finalUrl = p.url;
        const headers = { 'User-Agent': 'ShadowNet-Azure' };
        if (p.auth && token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(finalUrl, { headers });
        if (response.ok) {
          const rawData = await response.json();
          caches.flights.global = { 
            data: { ...rawData, _source: p.name }, 
            lastFetch: now 
          };
          console.log(`[MasterHub] Flights updated from ${p.name}`);
          break;
        }
      } catch (e) {}
    }
  }

  let responseData = { ...caches.flights.global?.data };
  
  // Regional filtering logic
  if (lamin && lomin && lamax && lomax) {
    const blamin = parseFloat(lamin); const blomin = parseFloat(lomin);
    const blamax = parseFloat(lamax); const blomax = parseFloat(lomax);
    
    if (responseData.states) {
      responseData.states = responseData.states.filter(s => 
        s[6] >= blamin && s[6] <= blamax && s[5] >= blomin && s[5] <= blomax
      );
    }
    if (responseData.ac || responseData.aircraft) {
      const list = responseData.ac || responseData.aircraft;
      const filtered = list.filter(ac => 
        ac.lat >= blamin && ac.lat <= blamax && ac.lon >= blomin && ac.lon <= blomax
      );
      if (responseData.ac) responseData.ac = filtered;
      else responseData.aircraft = filtered;
    }
  }

  res.json(responseData);
});

// 2. Satellites Proxy
app.get('/api/data/satellites', async (req, res) => {
  const now = Date.now();
  if (now - caches.satellites.lastFetch > 3600000 * 6) {
    try {
      const groups = ['visual', 'science', 'weather', 'stations'];
      let combinedLines = [];
      for (const group of groups) {
        const resp = await fetch(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`);
        if (resp.ok) {
          const text = await resp.text();
          combinedLines = combinedLines.concat(text.trim().split('\n').map(l => l.trim()));
        }
      }
      const sats = [];
      for (let i = 0; i < combinedLines.length - 2; i += 3) {
        const name = combinedLines[i];
        const t1 = combinedLines[i+1];
        const t2 = combinedLines[i+2];
        if (t1.startsWith('1 ') && t2.startsWith('2 ')) {
          const noradId = t2.substring(2, 7).trim();
          sats.push({ name, tle1: t1, tle2: t2, noradId });
        }
      }
      caches.satellites.data = sats;
      caches.satellites.lastFetch = now;
      console.log(`[MasterHub] Satellites updated: ${sats.length} targets.`);
    } catch (e) { console.error('[MasterHub] Sat Error:', e); }
  }
  res.json(caches.satellites.data);
});

// 3. Tor Nodes Proxy
app.get('/api/data/tor', async (req, res) => {
  const now = Date.now();
  if (now - caches.tor.lastFetch > 600000 || caches.tor.data.length === 0) {
    try {
      const response = await fetch('https://onionoo.torproject.org/details?type=relay&running=true&limit=50&fields=fingerprint,nickname,country_name,latitude,longitude');
      if (response.ok) {
        const data = await response.json();
        caches.tor.data = (data.relays || []).filter(r => r.latitude && r.longitude);
        caches.tor.lastFetch = now;
      }
    } catch (e) {}
  }
  res.json(caches.tor.data);
});

// 4. News Proxy
app.get('/api/data/news', async (req, res) => {
  const now = Date.now();
  if (now - caches.news.lastFetch > 300000) {
    try {
      const response = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://rss.nytimes.com/services/xml/rss/nyt/World.xml');
      if (response.ok) {
        const data = await response.json();
        caches.news.data = (data.items || []).map(item => ({
          title: item.title, url: item.link, source: 'NY Times World'
        }));
        caches.news.lastFetch = now;
      }
    } catch (e) {}
  }
  res.json(caches.news.data);
});

// 5. GDELT Intel Proxy
const INTEL_TOPICS = [
  { id: 'military',     k: ['military', 'army', 'troops', 'airstrike', 'weapons'] },
  { id: 'cyber',        k: ['cyber', 'hacking', 'ransomware', 'data breach'] },
  { id: 'nuclear',      k: ['nuclear', 'uranium', 'iaea', 'atomic'] },
  { id: 'geopolitics',  k: ['geopolitics', 'foreign policy', 'nato', 'un'] },
  { id: 'conflict',     k: ['conflict', 'war', 'invasion', 'ceasefire'] }
];

app.get('/api/data/intel', async (req, res) => {
  const now = Date.now();
  if (now - caches.intel.lastFetch > 900000 || caches.intel.data.topics.length === 0) {
    try {
      const query = '(military OR cyber OR nuclear OR geopolitics OR conflict) sourcelang:eng';
      const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=100&format=json&sort=date`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const allArticles = data.articles || [];
        const topicResults = INTEL_TOPICS.map(topic => ({
          id: topic.id,
          articles: allArticles.filter(a => {
            const t = (a.title || '').toLowerCase();
            return topic.k.some(kw => t.includes(kw));
          }).slice(0, 20).map(a => ({
            title: a.title, url: a.url, source: a.domain, date: a.seendate, tone: a.tone
          }))
        }));
        caches.intel.data = { topics: topicResults };
        caches.intel.lastFetch = now;
      }
    } catch (e) {}
  }
  res.json(caches.intel.data);
});

// 6. OTX Proxy
app.get('/api/data/otx', async (req, res) => {
  try {
    const response = await fetch('https://otx.alienvault.com/api/v1/pulses/subscribed?limit=5', {
      headers: { 'X-OTX-API-KEY': process.env.OTX_API_KEY || '' }
    });
    const data = await response.json();
    res.json(data);
  } catch (e) { res.json({ results: [] }); }
});

// --- Static Files (Serve dist) ---
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- Start Server ---
const server = app.listen(port, () => {
  console.log(`\n🚀 ShadowNET Taktiksel Sunucu Aktif!`);
  console.log(`📡 Port: ${port}`);
  console.log(`🌐 Mod: Production\n`);
});

// --- AIS WebSocket Relay ---
const wss = new WebSocketServer({ noServer: true });
const AIS_KEY = process.env.AIS_STREAM_API_KEY || '';
let upstream = null;
const clients = new Set();

function connectAIS() {
  if (upstream || clients.size === 0) return;
  console.log('[AIS] Upstream bağlantısı başlatılıyor...');
  
  upstream = new WebSocket('wss://stream.aisstream.io/v0/stream');

  upstream.on('open', () => {
    console.log('[AIS] Upstream BAĞLANDI.');
    upstream.send(JSON.stringify({
      APIKey: AIS_KEY,
      BoundingBoxes: [[[90, -180], [-90, 180]]],
      FilterMessageTypes: ["PositionReport"]
    }));
  });

  upstream.on('message', (msg) => {
    const str = msg.toString();
    clients.forEach(c => {
      if (c.readyState === WebSocket.OPEN) c.send(str);
    });
  });

  upstream.on('close', () => {
    console.warn('[AIS] Upstream kapandı, 15sn sonra tekrar denenecek.');
    upstream = null;
    setTimeout(connectAIS, 15000);
  });

  upstream.on('error', (e) => {
    console.error('[AIS] Upstream Hatası:', e.message);
    upstream = null;
  });
}

server.on('upgrade', (request, socket, head) => {
  if (request.url === '/api/ws/ais') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      clients.add(ws);
      console.log(`[AIS] Yeni istemci bağlandı. Toplam: ${clients.size}`);
      connectAIS();
      
      ws.on('close', () => {
        clients.delete(ws);
        console.log(`[AIS] İstemci ayrıldı. Kalan: ${clients.size}`);
        if (clients.size === 0 && upstream) {
          upstream.close();
          upstream = null;
        }
      });
    });
  }
});
