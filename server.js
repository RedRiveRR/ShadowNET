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
  origin: '*', // Vercel ve diğer her yerden erişime izin veriyoruz
  methods: ['GET', 'POST'],
  credentials: true
}));

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
    mode: 'Hybrid Backend (Render)'
  });
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

// --- Minimalist Data Proxies ---
app.get('/api/data/flights', async (req, res) => {
  const now = Date.now();
  if (!caches.flights.data || now - caches.flights.lastFetch > 60000) {
    const token = await getOpenSkyToken();
    const providers = [
      { name: 'ADSB.LOL', url: 'https://api.adsb.lol/v2/LATEST' },
      { name: 'OPENSKY', url: 'https://opensky-network.org/api/states/all', auth: true }
    ];
    for (const p of providers) {
      try {
        const headers = { 'User-Agent': 'Mozilla/5.0' };
        if (p.auth && token) headers['Authorization'] = `Bearer ${token}`;
        const response = await fetch(p.url, { headers });
        if (response.ok) {
          const rawData = await response.json();
          caches.flights.data = { ...rawData, _source: p.name };
          caches.flights.lastFetch = now;
          break;
        }
      } catch (e) {}
    }
  }
  res.json(caches.flights.data || { ac: [], _loading: true });
});

app.get('/api/data/satellites', async (req, res) => {
  const now = Date.now();
  if (caches.satellites.data.length === 0 || now - caches.satellites.lastFetch > 3600000) {
    try {
      const response = await fetch('https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle');
      if (response.ok) {
        const text = await response.text();
        const lines = text.trim().split('\n').map(l => l.trim());
        const sats = [];
        for (let i = 0; i < lines.length - 2; i += 3) {
          sats.push({ name: lines[i], tle1: lines[i + 1], tle2: lines[i + 2] });
        }
        caches.satellites.data = sats; caches.satellites.lastFetch = now;
      }
    } catch (e) {}
  }
  res.json(caches.satellites.data);
});

app.get('/api/data/intel', async (req, res) => {
  const now = Date.now();
  if (caches.intel.data.topics.length === 0 || now - caches.intel.lastFetch > 900000) {
    try {
      const query = '(military OR nuclear OR cyber OR conflict OR sanctions) sourcelang:eng';
      const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=50&format=json&sort=date`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        caches.intel.data = { topics: [{ id: 'global', articles: data.articles || [] }] };
        caches.intel.lastFetch = now;
      }
    } catch (e) {}
  }
  res.json(caches.intel.data);
});

app.get('/api/data/tor', async (req, res) => {
  res.json([]); // Simplified for now
});

app.get('/api/data/news', async (req, res) => {
  res.json([]); // Simplified for now
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
    
    setInterval(() => {
      if (upstream.readyState === 1) upstream.send(JSON.stringify({ type: 'ping' }));
    }, 30000);

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

// --- Static Backup ---
const distPath = join(__dirname, 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  if (!req.url.startsWith('/api/')) {
    res.sendFile(join(distPath, 'index.html'));
  } else {
    res.status(404).json({ error: 'Not Found' });
  }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`[ShadowNet Hybrid Backend] Listening on port ${PORT}`);
});
