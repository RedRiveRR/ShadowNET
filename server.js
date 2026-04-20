import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// --- Diagnostic Middleware ---
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'online', 
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// --- ShadowNet V7 Multi-Service Proxy ---
const caches = {
  flights: { data: { ac: [] }, lastFetch: 0 },
  satellites: { data: [], lastFetch: 0 },
  tor: { data: [], lastFetch: 0 },
  news: { data: [], lastFetch: 0 },
  intel: { data: { topics: [] }, lastFetch: 0 },
  ais: { vessels: new Map(), lastFetch: 0 }
};

let openskyToken = { value: '', expires: 0 };
const apiCooldowns = {};

async function getOpenSkyToken() {
  const now = Date.now();
  if (openskyToken.value && openskyToken.expires > now + 60000) return openskyToken.value;
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', process.env.OPENSKY_CLIENT_ID || '');
    params.append('client_secret', process.env.OPENSKY_CLIENT_SECRET || '');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch('https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      openskyToken = { value: data.access_token, expires: now + (data.expires_in * 1000) };
      return openskyToken.value;
    }
  } catch (e) {}
  return null;
}

app.get('/api/data/flights', async (req, res) => {
  const now = Date.now();
  const lamin = req.query.lamin;
  const lomin = req.query.lomin;
  const lamax = req.query.lamax;
  const lomax = req.query.lomax;
  const GLOBAL_TTL = 90000;
  
  if (!caches.flights.global || now - caches.flights.global.lastFetch > GLOBAL_TTL) {
    let success = false;
    const token = await getOpenSkyToken();
    const flightErrors = [];
    const providers = [
      { name: 'OPENSKY', url: 'https://opensky-network.org/api/states/all', auth: true },
      { name: 'ADSB.LOL', url: 'https://api.adsb.lol/v2/all', auth: false },
      { name: 'ADSB.FI', url: 'https://api.adsb.fi/v2/all', auth: false }
    ];
    for (const p of providers) {
      if (apiCooldowns[p.name] && now - apiCooldowns[p.name] < 120 * 1000) continue;
      try {
        const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebkit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' };
        if (p.auth && token) headers['Authorization'] = `Bearer ${token}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout for Render

        const response = await fetch(p.url, { headers, signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          const rawData = await response.json();
          caches.flights.global = {
            data: { ...rawData, _source: p.name, _ts: now },
            lastFetch: now
          };
          success = true; delete apiCooldowns[p.name]; break;
        } else { 
          flightErrors.push(`${p.name}: ${response.status}`);
          apiCooldowns[p.name] = now; 
        }
      } catch (e) { 
        flightErrors.push(`${p.name} Error: ${e.message}`);
        apiCooldowns[p.name] = now; 
      }
    }
    if (!success && !caches.flights.global) {
      caches.flights.global = { data: { ac: [], states: [], _simulated: true, _errors: flightErrors }, lastFetch: now };
    }
  }

  let responseData = { ...caches.flights.global.data };
  if (lamin && lomin && lamax && lomax) {
    const blamin = parseFloat(lamin); const blomin = parseFloat(lomin);
    const blamax = parseFloat(lamax); const blomax = parseFloat(lomax);
    if (responseData.states) {
      responseData.states = responseData.states.filter(s => s[6] >= blamin && s[6] <= blamax && s[5] >= blomin && s[5] <= blomax);
    }
    if (responseData.ac || responseData.aircraft) {
      const list = responseData.ac || responseData.aircraft;
      const filtered = list.filter(ac => ac.lat >= blamin && ac.lat <= blamax && ac.lon >= blomin && ac.lon <= blomax);
      if (responseData.ac) responseData.ac = filtered;
      else responseData.aircraft = filtered;
    }
    responseData._is_regional = true;
  }
  res.json(responseData);
});

app.get('/api/data/satellites', async (req, res) => {
  const now = Date.now();
  if (now - caches.satellites.lastFetch > 3600000) {
    try {
      // Çoklu uydu grupları (Starlink, GPS, Stations ve Visual) çekiyoruz
      const groups = ['starlink', 'gps-ops', 'stations', 'visual'];
      let allSats = [];
      for (const group of groups) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          const response = await fetch(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (response.ok) {
            const text = await response.text();
            const lines = text.trim().split('\n').map(l => l.trim());
            for (let i = 0; i < lines.length - 2; i += 3) {
              allSats.push({ name: lines[i], tle1: lines[i + 1], tle2: lines[i + 2], group });
            }
          }
        } catch (ee) {}
      }
      if (allSats.length > 0) {
        caches.satellites.data = allSats; caches.satellites.lastFetch = now;
      }
    } catch (e) {
      console.error('[Satellite Fetch Error]', e.message);
    }
  }
  res.json(caches.satellites.data);
});

const staticTorNodes = [
  { fingerprint: 'tor1', nickname: 'TorBerlin', latitude: 52.5, longitude: 13.4, country_name: 'Germany' },
  { fingerprint: 'tor2', nickname: 'LibreRelay', latitude: 48.8, longitude: 2.3, country_name: 'France' },
  { fingerprint: 'tor3', nickname: 'DigitalOcean1', latitude: 40.7, longitude: -74, country_name: 'United States' },
  { fingerprint: 'tor4', nickname: 'AmsRelay', latitude: 52.3, longitude: 4.9, country_name: 'Netherlands' },
  { fingerprint: 'tor5', nickname: 'TorSwiss', latitude: 47.3, longitude: 8.5, country_name: 'Switzerland' },
  { fingerprint: 'tor6', nickname: 'TorJapan', latitude: 35.6, longitude: 139.7, country_name: 'Japan' },
  { fingerprint: 'tor7', nickname: 'TorSingapore', latitude: 1.3, longitude: 103.8, country_name: 'Singapore' },
  { fingerprint: 'tor8', nickname: 'TorBrazil', latitude: -23.5, longitude: -46.6, country_name: 'Brazil' },
  { fingerprint: 'tor9', nickname: 'TorAustralia', latitude: -33.8, longitude: 151.2, country_name: 'Australia' },
  { fingerprint: 'tor10', nickname: 'TorIstanbul', latitude: 41.0, longitude: 29.0, country_name: 'Turkey' }
];
if (caches.tor.data.length === 0) { caches.tor.data = staticTorNodes; caches.tor.lastFetch = Date.now(); }

app.get('/api/data/tor', async (req, res) => {
  if (Date.now() - caches.tor.lastFetch > 600000) {
    fetch('https://onionoo.torproject.org/details?type=relay&running=true&limit=30&fields=fingerprint,nickname,country_name,latitude,longitude')
      .then(r => r.json()).then(data => {
        const filtered = (data.relays || []).filter(r => r.latitude && r.longitude);
        if (filtered.length > 0) { caches.tor.data = filtered; caches.tor.lastFetch = Date.now(); }
      }).catch(() => {});
  }
  res.json(caches.tor.data);
});

app.get('/api/data/news', async (req, res) => {
  const now = Date.now();
  if (now - caches.news.lastFetch > 120000) {
    try {
      const response = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://rss.nytimes.com/services/xml/rss/nyt/World.xml');
      if (response.ok) {
        const data = await response.json();
        if (data.items) {
          caches.news.data = data.items.map(item => ({ title: item.title, url: item.link, source: 'NY Times World', pubDate: item.pubDate }));
          caches.news.lastFetch = now;
        }
      }
    } catch (e) {}
  }
  res.json(caches.news.data);
});

app.get('/api/data/radar', async (req, res) => {
  try {
    const response = await fetch('https://api.cloudflare.com/client/v4/radar/bgp/top/ases?limit=3&dateRange=1d', {
      headers: { 'Authorization': 'Bearer ' + (process.env.CLOUDFLARE_API_TOKEN || ''), 'Content-Type': 'application/json' }
    });
    if (response.ok) return res.json(await response.json());
  } catch (e) {}
  res.json({ result: null });
});

// FULL CAPACITY GDELT INTEL RESTORED
const GDELT_API = 'https://api.gdeltproject.org/api/v2/doc/doc';
const INTEL_TOPICS = [
  { id: 'military',     k: ['military', 'army', 'troops', 'airstrike', 'weapons', 'defense'] },
  { id: 'cyber',        k: ['cyber', 'hacking', 'ransomware', 'data breach', 'malware', 'cybersecurity'] },
  { id: 'nuclear',      k: ['nuclear', 'uranium', 'iaea', 'atomic', 'nuclear weapon', 'missile'] },
  { id: 'sanctions',    k: ['sanctions', 'embargo', 'tariff', 'trade war', 'economic pressure'] },
  { id: 'intelligence', k: ['espionage', 'spy', 'intelligence', 'surveillance', 'cia', 'mi6', 'mossad'] },
  { id: 'maritime',     k: ['navy', 'warship', 'maritime', 'piracy', 'south china sea', 'submarine'] },
  { id: 'terrorism',    k: ['terrorism', 'terrorist', 'extremism', 'isis', 'al qaeda', 'bombing'] },
  { id: 'geopolitics',  k: ['geopolitics', 'foreign policy', 'nato', 'g7', 'united nations', 'summit'] },
  { id: 'conflict',     k: ['conflict', 'war', 'invasion', 'ceasefire', 'casualties', 'genocide'] },
  { id: 'diplomacy',    k: ['diplomacy', 'treaty', 'ambassador', 'peace talks', 'negotiations', 'alliance'] },
];

app.get('/api/data/intel', async (req, res) => {
  const now = Date.now();
  const INTEL_TTL = 900000;
  if (now - caches.intel.lastFetch > INTEL_TTL) {
    caches.intel.lastFetch = now;
    const fetchAllTopics = async () => {
      try {
        const url = new URL(GDELT_API);
        const combinedQuery = '(military OR army OR cyber OR hacking OR nuclear OR sanctions OR espionage OR maritime OR terrorism OR geopolitics OR conflict OR diplomacy OR ransomware OR finance OR energy OR election OR border OR missile OR drone) sourcelang:eng';
        url.searchParams.set('query', combinedQuery);
        url.searchParams.set('mode', 'artlist');
        url.searchParams.set('maxrecords', '250');
        url.searchParams.set('format', 'json');
        url.searchParams.set('sort', 'date');
        url.searchParams.set('timespan', '24h');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const response = await fetch(url.toString(), {
          headers: { 'User-Agent': 'Mozilla/5.0 ShadowNet/9.0 IntelHub' },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const allArticles = data.articles || [];
          const topicResults = INTEL_TOPICS.map(topic => {
            const matched = allArticles.filter(a => {
              const title = String(a.title || '').toLowerCase();
              const url = String(a.url || '').toLowerCase();
              return topic.k.some(keyword => title.includes(keyword) || url.includes(keyword));
            }).slice(0, 25).map(a => ({
              title: String(a.title || '').slice(0, 300),
              url: a.url || '',
              source: String(a.domain || '').slice(0, 100),
              date: a.seendate || '',
              tone: typeof a.tone === 'number' ? a.tone : 0,
              language: a.language || 'English',
              image: a.socialimage || '',
            }));
            return { id: topic.id, articles: matched, fetchedAt: new Date().toISOString() };
          });
          caches.intel.data = { topics: topicResults, fetchedAt: new Date().toISOString() };
        } else { caches.intel.lastFetch = 0; }
      } catch (e) { caches.intel.lastFetch = 0; }
    };
    if (caches.intel.data.topics.length === 0) await fetchAllTopics();
    else fetchAllTopics().catch(() => {});
  }
  res.json(caches.intel.data || { topics: [] });
});

app.get('/api/data/otx', async (req, res) => {
  try {
    const response = await fetch('https://otx.alienvault.com/api/v1/pulses/subscribed?limit=5', {
      headers: { 'X-OTX-API-KEY': process.env.OTX_API_KEY || '' }
    });
    if (response.ok) return res.json(await response.json());
  } catch (e) {}
  res.json({ results: [] });
});

// FULL CAPACITY AIS WEBSOCKET RESTORED
const AIS = { upstream: null, clients: new Set(), connecting: false, packetCount: 0 };
const AIS_KEY = process.env.AIS_STREAM_API_KEY || '';

const connectUpstream = async () => {
  if (AIS.connecting || (AIS.upstream && AIS.upstream.readyState === 1)) return;
  AIS.connecting = true;
  try {
    const upstream = new WebSocket('wss://stream.aisstream.io/v0/stream');
    upstream.on('open', () => {
      AIS.upstream = upstream; AIS.connecting = false;
      upstream.send(JSON.stringify({ APIKey: AIS_KEY, BoundingBoxes: [[[90, -180], [-90, 180]]], FilterMessageTypes: ["PositionReport"] }));
    });
    upstream.on('message', (msg) => {
      AIS.packetCount++; const str = msg.toString();
      AIS.clients.forEach(c => { if (c.readyState === 1) c.send(str); });
    });
    upstream.on('close', () => { AIS.upstream = null; AIS.connecting = false; setTimeout(connectUpstream, 15000); });
    upstream.on('error', () => { AIS.connecting = false; AIS.upstream = null; });
    
    // Heartbeat to keep Render connection alive
    const hb = setInterval(() => {
      if (upstream.readyState === 1) upstream.send(JSON.stringify({ type: 'ping' }));
    }, 30000);
    upstream.on('close', () => clearInterval(hb));

  } catch (e) { AIS.connecting = false; setTimeout(connectUpstream, 15000); }
};

const wss = new WebSocketServer({ noServer: true });
server.on('upgrade', (req, socket, head) => {
  // Ensure we match the exact request URL sent by the frontend
  if (req.url === '/api/ws/ais' || req.url === '/api/ws/ais/') {
    wss.handleUpgrade(req, socket, head, (ws) => {
      AIS.clients.add(ws);
      ws.on('message', () => {}); // Handle incoming blank messages if any
      ws.on('close', () => AIS.clients.delete(ws));
      connectUpstream();
    });
  } else {
    socket.destroy();
  }
});
connectUpstream();

Array.prototype.push.apply(setInterval(() => {
  if (AIS.packetCount > 0) { AIS.packetCount = 0; }
}, 60000));

const distPath = join(__dirname, 'dist');
app.use(express.static(distPath));

app.use((req, res) => {
  // If request is for an API that hasn't been handled, return JSON error instead of HTML
  if (req.url.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found', url: req.url });
  }
  res.sendFile(join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`[ShadowNet Server] Running on port ${PORT}`);
});
