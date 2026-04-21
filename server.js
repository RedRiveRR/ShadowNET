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

let openskyToken = { value: '', expires: 0 };
async function getOpenSkyToken() {
  const now = Date.now();
  if (openskyToken.value && openskyToken.expires > now + 60000) return openskyToken.value;
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
      openskyToken = { value: data.access_token, expires: now + (data.expires_in * 1000) };
      return openskyToken.value;
    }
  } catch (e) {}
  return null;
}

// --- Background Data Collectors (Memory Optimized) ---
async function syncFlights() {
  const token = await getOpenSkyToken();
  const providers = [
    { name: 'ADSB.LOL', url: 'https://api.adsb.lol/v2/LATEST' },
    { name: 'ADSB.FI', url: 'https://api.adsb.fi/v2/all' },
    { name: 'OPENSKY', url: 'https://opensky-network.org/api/states/all', auth: true }
  ];

  for (const p of providers) {
    try {
      const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebkit/537.36' };
      if (p.auth && token) headers['Authorization'] = `Bearer ${token}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(p.url, { headers, signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const rawData = await response.json();
        caches.flights.data = { ...rawData, _source: p.name };
        caches.flights.lastFetch = Date.now();
        console.log(`[Sync] Flights refreshed via ${p.name}`);
        return true;
      }
    } catch (e) {}
  }
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
  try {
    const query = '(military OR nuclear OR cyber OR conflict OR sanctions) sourcelang:eng';
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=100&format=json&sort=date`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      caches.intel.data = { topics: [{ id: 'global', articles: data.articles || [] }] };
      caches.intel.lastFetch = Date.now();
      console.log(`[Sync] Intel refreshed: ${data.articles?.length || 0} articles`);
    }
  } catch (e) {}
}

async function syncExtra() {
  // Tor Onionoo
  try {
    const res = await fetch('https://onionoo.torproject.org/details?type=relay&running=true&limit=20');
    if (res.ok) {
      const data = await res.json();
      caches.tor.data = (data.relays || []).filter(r => r.latitude && r.longitude);
    }
  } catch (e) {}
  // News NYT
  try {
    const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://rss.nytimes.com/services/xml/rss/nyt/World.xml');
    if (res.ok) {
      const data = await res.json();
      caches.news.data = (data.items || []).map(item => ({ title: item.title, url: item.link }));
    }
  } catch (e) {}
}

// Initial Sync & Loops
setInterval(syncFlights, 120000);
setInterval(syncSatellites, 3600000);
setInterval(syncIntel, 900000);
setInterval(syncExtra, 600000);
setTimeout(() => { syncFlights(); syncSatellites(); syncIntel(); syncExtra(); }, 1000);

// --- API Endpoints ---
app.get('/api/status', (req, res) => {
  res.json({ status: 'online', uptime: process.uptime(), providers: ['OPENSKY', 'ADSB.LOL', 'ADSB.FI'] });
});

app.get('/api/data/flights', (req, res) => {
  res.json(caches.flights.data || { ac: [], _loading: true });
});

app.get('/api/data/satellites', (req, res) => res.json(caches.satellites.data));
app.get('/api/data/intel', (req, res) => res.json(caches.intel.data));
app.get('/api/data/tor', (req, res) => res.json(caches.tor.data));
app.get('/api/data/news', (req, res) => res.json(caches.news.data));

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
