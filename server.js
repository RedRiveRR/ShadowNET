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

// --- Hybrid Support: CORS ---
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// --- Diagnostic Middleware ---
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const caches = {
  flights: { data: null, lastFetch: 0 },
  satellites: { data: [], lastFetch: 0 },
  tor: { data: [], lastFetch: 0 },
  news: { data: [], lastFetch: 0 },
  intel: { data: { topics: [] }, lastFetch: 0 }
};

// --- Robust Fetch Utility ---
async function fetchWithTimeout(url, options = {}, timeout = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

let openskyToken = { value: '', expires: 0 };
async function getOpenSkyToken() {
  const now = Date.now();
  if (openskyToken.value && openskyToken.expires > now + 60000) return openskyToken.value;
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', process.env.OPENSKY_CLIENT_ID || '');
    params.append('client_secret', process.env.OPENSKY_CLIENT_SECRET || '');
    const response = await fetchWithTimeout('https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    }, 10000);
    if (response.ok) {
      const data = await response.json();
      openskyToken = { value: data.access_token, expires: now + (data.expires_in * 1000) };
      return openskyToken.value;
    }
  } catch (e) {}
  return null;
}

// --- Background Data Collectors (Memory Optimized) ---
async function syncFlights() {
  const token = await getOpenSkyToken();
  const report = [];

  const providers = [
    { name: 'OPENSKY', url: 'https://opensky-network.org/api/states/all', auth: true, timeout: 12000 },
    { name: 'ADSB.LOL', url: 'https://api.adsb.lol/v2/all', timeout: 6000 },
    { name: 'ADSB.ONE', url: 'https://api.adsb.one/v2/all', timeout: 6000 },
    { name: 'ADSB.FI', url: 'https://opendata.adsb.fi/api/v2/all', timeout: 6000 }
  ];

  for (const p of providers) {
    try {
      const headers = { 'User-Agent': 'Mozilla/5.0' };
      if (p.auth && token) headers['Authorization'] = `Bearer ${token}`;
      
      const response = await fetchWithTimeout(p.url, { headers }, p.timeout);
      if (response.ok) {
        const rawData = await response.json();
        caches.flights.data = { ...rawData, _source: p.name, _report: report };
        caches.flights.lastFetch = Date.now();
        console.log(`[Sync] Flights refreshed via ${p.name}`);
        return true;
      } else {
        report.push({ name: p.name, status: `HTTP ${response.status}` });
      }
    } catch (e) {
      report.push({ name: p.name, status: 'TIMEOUT/ERR' });
    }
  }
  console.error(`[Sync] Flights failed: ${JSON.stringify(report)}`);
  return false;
}

async function syncSatellites() {
  const groups = ['starlink', 'gps-ops', 'stations', 'visual'];
  let allSats = [];
  for (const group of groups) {
    try {
      const response = await fetch(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`);
      if (response.ok) {
        const text = await response.text();
        const lines = text.trim().split('\n').map(l => l.trim());
        for (let i = 0; i < lines.length - 2; i += 3) {
          allSats.push({ name: lines[i], tle1: lines[i + 1], tle2: lines[i + 2], group });
        }
      }
    } catch (e) {}
  }
  if (allSats.length > 0) {
    caches.satellites.data = allSats;
    caches.satellites.lastFetch = Date.now();
    console.log(`[Sync] Satellites refreshed: ${allSats.length}`);
  }
}

async function syncIntel() {
  const topics = [
    { id: 'cyber', query: 'cyberattack OR hacking OR ransomware OR databreach' },
    { id: 'military', query: 'military OR army OR navy OR airforce OR deployment' },
    { id: 'nuclear', query: 'nuclear OR uranium OR radiation OR reactor' },
    { id: 'maritime', query: 'maritime OR shipping OR naval OR "red sea" OR blockade' },
    { id: 'conflict', query: 'war OR combat OR strike OR explosion OR invasion' },
    { id: 'diplomacy', query: 'sanctions OR treaty OR summit OR embassy' }
  ];

  let intelData = { topics: [] };

  for (const topic of topics) {
    try {
      const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(topic.query)}&mode=artlist&maxrecords=20&format=json&sort=date`;
      const response = await fetchWithTimeout(url, {}, 10000);
      if (response.ok) {
        const data = await response.json();
        intelData.topics.push({ id: topic.id, articles: data.articles || [] });
      }
    } catch (e) {
      console.error(`[Sync] Intel ${topic.id} failed/timeout`);
    }
    // Rate limit safeguard
    await new Promise(r => setTimeout(r, 500));
  }

  if (intelData.topics.length > 0) {
    caches.intel.data = intelData;
    caches.intel.lastFetch = Date.now();
    console.log(`[Sync] Categorized Intel refreshed`);
  }
}

async function syncExtra() {
  // Tor Onionoo
  try {
    const res = await fetchWithTimeout('https://onionoo.torproject.org/details?type=relay&running=true&limit=20', {}, 10000);
    if (res.ok) {
      const data = await res.json();
      const relays = (data.relays || []).filter(r => r.latitude && r.longitude);
      caches.tor.data = relays;
      if (relays.length > 0) console.log(`[Sync] Tor Nodes refreshed: ${relays.length}`);
    }
  } catch (e) { console.error('[Sync] Tor failed/timeout'); }

  // Global News (NYT)
  try {
    const res = await fetchWithTimeout('https://api.rss2json.com/v1/api.json?rss_url=https://rss.nytimes.com/services/xml/rss/nyt/World.xml', {}, 10000);
    if (res.ok) {
      const data = await res.json();
      caches.news.data = (data.items || []).map(item => ({ title: item.title, url: item.link }));
      console.log(`[Sync] World News refreshed`);
    }
  } catch (e) { console.error('[Sync] News failed/timeout'); }
}

// Initial Sync & Loops (Parallel Initial Load)
setInterval(syncFlights, 120000);
setInterval(syncSatellites, 3600000);
setInterval(syncIntel, 900000);
setInterval(syncExtra, 600000);

// Parallelizing initial loads so one slow fetch doesn't block others
setTimeout(syncFlights, 500);
setTimeout(syncSatellites, 1000);
setTimeout(syncIntel, 1500);
setTimeout(syncExtra, 2000);

// --- API Endpoints ---
app.get('/api/status', (req, res) => {
  res.json({ status: 'online', uptime: process.uptime(), providers: ['OPENSKY', 'ADSB.LOL', 'ADSB.FI'] });
});

app.get(['/api/data/flights', '/api/flights'], (req, res) => {
  res.json(caches.flights.data || { ac: [], _loading: true });
});

app.get(['/api/data/satellites', '/api/satellites'], (req, res) => res.json(caches.satellites.data));
app.get(['/api/data/intel', '/api/intel'], (req, res) => res.json(caches.intel.data));
app.get(['/api/data/tor', '/api/tor', '/api/nodes'], (req, res) => res.json(caches.tor.data));
app.get(['/api/data/news', '/api/news'], (req, res) => res.json(caches.news.data));

app.get('/api/data/otx', async (req, res) => {
  try {
    const response = await fetch('https://otx.alienvault.com/api/v1/pulses/subscribed?limit=10', {
      headers: { 'X-OTX-API-KEY': process.env.OTX_API_KEY || '' }
    });
    const data = await response.json();
    res.json(data);
  } catch (e) { res.status(500).json({ error: 'OTX failure' }); }
});

app.get('/api/data/radar', async (req, res) => {
  try {
    const response = await fetch('https://api.cloudflare.com/client/v4/radar/ranking/asn?limit=5', {
      headers: { 'Authorization': `Bearer ${process.env.CF_API_TOKEN || ''}` }
    });
    const data = await response.json();
    res.json(data);
  } catch (e) { res.status(500).json({ error: 'Radar failure' }); }
});

// --- AIS WebSocket Relay ---
const AIS = { upstream: null, clients: new Set() };
const connectUpstream = () => {
  if (AIS.upstream && AIS.upstream.readyState === 1) return;
  try {
    const upstream = new WebSocket('wss://stream.aisstream.io/v0/stream');
    upstream.on('open', () => {
      AIS.upstream = upstream;
      upstream.send(JSON.stringify({ 
        APIKey: process.env.AIS_STREAM_API_KEY || '', 
        BoundingBoxes: [[[90, -180], [-90, 180]]],
        FilterMessageTypes: ["PositionReport"]
      }));
    });
    upstream.on('message', (msg) => {
      const str = msg.toString();
      AIS.clients.forEach(c => { if (c.readyState === 1) c.send(str); });
    });
    upstream.on('close', () => { AIS.upstream = null; setTimeout(connectUpstream, 10000); });
    
    const hb = setInterval(() => {
      if (upstream.readyState === 1) upstream.send(JSON.stringify({ type: 'ping' }));
    }, 30000);
    upstream.on('close', () => clearInterval(hb));

  } catch (e) { setTimeout(connectUpstream, 10000); }
};

const wss = new WebSocketServer({ noServer: true });
server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/api/ws/ais')) {
    wss.handleUpgrade(req, socket, head, (ws) => {
      AIS.clients.add(ws);
      ws.on('close', () => AIS.clients.delete(ws));
      connectUpstream();
    });
  } else {
    socket.destroy();
  }
});
connectUpstream();

app.get('/', (req, res) => {
  res.send('ShadowNet Data Center Online. Point Vercel here.');
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`[ShadowNet Data Center] Active on port ${PORT}`);
});
