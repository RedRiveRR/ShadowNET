import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';
import http from 'http';
import https from 'https';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

const sslOptions = {
  key: fs.readFileSync('c:/nginx/ssl/redriverlab.me-key.pem'),
  cert: fs.readFileSync('c:/nginx/ssl/redriverlab.me-crt.pem'),
  ca: fs.readFileSync('c:/nginx/ssl/redriverlab.me-chain-only.pem')
};

const httpServer = http.createServer(app);
const httpsServer = https.createServer(sslOptions, app);

app.use(cors({ origin: '*', methods: ['GET', 'POST'], credentials: true }));
app.use(express.json());

const labPath = join(__dirname, 'lab');
const distPath = join(__dirname, 'dist');

app.use((req, res, next) => {
  const host = req.headers.host || '';
  if (req.url.startsWith('/api')) return next();
  if (host.startsWith('shadownet')) return express.static(distPath)(req, res, next);
  if (host.includes('redriverlab.me')) return express.static(labPath)(req, res, next);
  next();
});

const caches = {
  flights: { data: { ac: [] }, lastFetch: 0 },
  satellites: { data: [], lastFetch: 0 },
  tor: { data: [], lastFetch: 0 },
  news: { data: [], lastFetch: 0 },
  intel: { data: { topics: [] }, lastFetch: 0 }
};

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

// --- Tactical Sync Functions ---
const RELAY_WORKER_URL = 'https://shadow-relay.adakizilirmak00.workers.dev';

async function syncFlights() {
  const auth = Buffer.from(`${process.env.OPENSKY_CLIENT_ID}:${process.env.OPENSKY_CLIENT_SECRET}`).toString('base64');
  
  // Ultra-Global Grid (12 Stratejik Bölge)
  const regions = [
    { name: 'NA_Central', lat: 45, lon: -100, dist: 1500 },
    { name: 'SA_Brazil', lat: -15, lon: -50, dist: 1500 },
    { name: 'Europe', lat: 50, lon: 10, dist: 1500 },
    { name: 'Africa', lat: 0, lon: 20, dist: 1500 },
    { name: 'Middle_East', lat: 35, lon: 45, dist: 1500 },
    { name: 'East_Asia', lat: 35, lon: 115, dist: 1500 },
    { name: 'SE_Asia', lat: -5, lon: 110, dist: 1500 },
    { name: 'Australia', lat: -25, lon: 135, dist: 1500 },
    { name: 'N_Atlantic', lat: 45, lon: -35, dist: 1500 },
    { name: 'N_Pacific', lat: 35, lon: -160, dist: 1500 },
    { name: 'Indian_Ocean', lat: -20, lon: 80, dist: 1500 },
    { name: 'S_Atlantic', lat: -30, lon: -15, dist: 1500 }
  ];

  let globalAircraft = [];
  const icaoSeen = new Set();

  // Paralel Chunker: Gruplar halinde çekerek hızı artırıyoruz
  const fetchRegion = async (reg) => {
    try {
      const target = `https://api.adsb.lol/v2/lat/${reg.lat}/lon/${reg.lon}/dist/${reg.dist}`;
      const relayUrl = `${RELAY_WORKER_URL}/?target=${encodeURIComponent(target)}`;
      const res = await fetchWithTimeout(relayUrl, { headers: { 'User-Agent': 'ShadowNet-Ultra-Collector/3.0' } }, 15000);
      if (res.ok) {
        const data = await res.json();
        return data.ac || data.aircraft || [];
      }
    } catch (e) { return []; }
    return [];
  };

  // 3'lü gruplar halinde paralel çekim (Worker limitlerini aşmamak için)
  for (let i = 0; i < regions.length; i += 3) {
    const batch = regions.slice(i, i + 3);
    const results = await Promise.all(batch.map(reg => fetchRegion(reg)));
    
    results.flat().forEach(ac => {
      if (ac.hex && !icaoSeen.has(ac.hex)) {
        icaoSeen.add(ac.hex);
        globalAircraft.push(ac);
      }
    });
    console.log(`[Relay] Batch ${i/3 + 1} completed. Total so far: ${globalAircraft.length}`);
    await new Promise(r => setTimeout(r, 800)); // Rate-limit koruması
  }

  // OpenSky Çeyrek Taraması (Eksik kalan okyanus rotaları için)
  const quadrants = [
    { n: 90, s: 0, e: 180, w: 0 },    // NE
    { n: 90, s: 0, e: 0, w: -180 }    // NW
  ];

  for (const q of quadrants) {
    try {
      const target = `https://opensky-network.org/api/states/all?lamin=${q.s}&lomin=${q.w}&lamax=${q.n}&lomax=${q.e}`;
      const relayUrl = `${RELAY_WORKER_URL}/?target=${encodeURIComponent(target)}`;
      const res = await fetchWithTimeout(relayUrl, {
        headers: { 'Authorization': `Basic ${auth}`, 'User-Agent': 'ShadowNet-Sky-Scanner/3.0' }
      }, 20000);
      
      if (res.ok) {
        const data = await res.json();
        if (data.states) {
          data.states.forEach(s => {
            const hex = s[0].toLowerCase();
            if (!icaoSeen.has(hex)) {
              icaoSeen.add(hex);
              globalAircraft.push({ hex, lat: s[6], lon: s[5], alt: s[7], gs: s[9], track: s[10], r: s[1], _os: true });
            }
          });
        }
      }
    } catch (e) { }
  }

  if (globalAircraft.length > 0) {
    // Ultra-Limit: 15.000 uçak (Maksimum Yoğunluk)
    caches.flights.data = { 
      ac: globalAircraft.slice(0, 15000), 
      _ts: Date.now(), 
      _source: 'ULTRA_GLOBAL_GRID_MERGE',
      _total_discovered: globalAircraft.length
    };
    console.log(`[Sync] Ultra-Global Success: ${globalAircraft.length} aircraft online`);
  }
}

async function syncIntel() {
  const queries = [
    'military+conflict+nuclear+war',
    'cyber+attack+hacking+breach',
    'space+weaponization+satellite+launch',
    'intelligence+geopolitics+espionage',
    'maritime+security+naval+conflict'
  ];
  
  try {
    let allArticles = [];
    for (const query of queries) {
      const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
      const response = await fetchWithTimeout(url, {}, 15000);
      if (response.ok) {
        const xml = await response.text();
        const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
        allArticles.push(...items.slice(0, 40));
      }
      await new Promise(r => setTimeout(r, 200));
    }

    const articles = allArticles.map((item, i) => {
      const title = (item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || 'Tactical Update').replace('<![CDATA[', '').replace(']]>', '');
      const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '#';
      const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || new Date().toISOString();
      const source = item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || 'Google News';
      
      let topicId = 'geopolitics';
      const lowerTitle = title.toLowerCase();
      if (lowerTitle.includes('cyber') || lowerTitle.includes('hacking')) topicId = 'cyber';
      if (lowerTitle.includes('nuclear') || lowerTitle.includes('atomic')) topicId = 'nuclear';
      if (lowerTitle.includes('military') || lowerTitle.includes('naval') || lowerTitle.includes('war')) topicId = 'military';
      if (lowerTitle.includes('space') || lowerTitle.includes('satellite')) topicId = 'space';
      
      return { id: `intel-${i}`, title, url: link, timestamp: pubDate, source, topicId, latitude: (Math.random() * 140 - 70), longitude: (Math.random() * 300 - 150) };
    });

    const topics = ['military', 'cyber', 'nuclear', 'space', 'geopolitics'].map(id => ({
      id, articles: articles.filter(a => a.topicId === id).slice(0, 50)
    })).filter(t => t.articles.length > 0);

    caches.news.data = articles.slice(0, 300);
    caches.intel.data = { topics };
    console.log(`[Sync] Rich Intel: ${articles.length} tactical units`);
  } catch (e) { console.error('[Sync] Intel Failed'); }
}

async function syncNews() {
  try {
    const url = 'https://news.google.com/rss/search?q=world+news+breaking+conflict+intelligence&hl=en-US&gl=US&ceid=US:en';
    const response = await fetchWithTimeout(url, {}, 15000);
    if (response.ok) {
      const xml = await response.text();
      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
      const news = items.map((item, i) => ({
        title: (item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '').replace('<![CDATA[', '').replace(']]>', ''),
        url: item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '#',
        source: item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || 'Global News'
      }));
      // Merge with tactical intel if available
      caches.news.data = [...(caches.news.data || []), ...news].slice(0, 500);
      console.log(`[Sync] Global News: ${news.length}`);
    }
  } catch (e) { console.error('[Sync] News Failed'); }
}

async function syncSatellites() {
  const groups = ['visual', 'starlink', 'weather', 'noaa', 'active'];
  let allSats = [];

  for (const group of groups) {
    try {
      const target = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`;
      const relayUrl = `${RELAY_WORKER_URL}/?target=${encodeURIComponent(target)}`;
      const res = await fetchWithTimeout(relayUrl, {}, 15000);
      
      if (res.ok) {
        const text = await res.text();
        const lines = text.split(/\r?\n/);
        for (let i = 0; i < lines.length - 2; i += 3) {
          if (lines[i+1]?.startsWith('1 ') && lines[i+2]?.startsWith('2 ')) {
            allSats.push({ name: lines[i].trim(), tle1: lines[i+1], tle2: lines[i+2] });
          }
        }
        console.log(`[Relay] Group ${group} synced: ${allSats.length} total`);
        if (allSats.length >= 500) break; // Limit reached
      }
    } catch (e) { }
    await new Promise(r => setTimeout(r, 500));
  }

  if (allSats.length > 0) {
    caches.satellites.data = allSats.slice(0, 500);
    console.log(`[Sync] Orbital Grid: ${caches.satellites.data.length} satellites online`);
  } else {
    // Ultimate Fallback
    caches.satellites.data = (caches.satellites.data || []).slice(0, 500);
  }
}

async function syncExtra() {
  try {
    const res = await fetchWithTimeout('https://onionoo.torproject.org/details?limit=200', {}, 15000);
    if (res.ok) {
      const data = await res.json();
      caches.tor.data = (data.relays || []).map(r => ({
        ...r, latitude: r.latitude || (Math.random() * 140 - 70), longitude: r.longitude || (Math.random() * 300 - 150)
      }));
      console.log(`[Sync] Tor Nodes: ${caches.tor.data.length}`);
    }
  } catch (e) { }
}

async function syncOTX() {
  try {
    const res = await fetchWithTimeout('https://otx.alienvault.com/api/v1/pulses/subscribed?limit=10', {
      headers: { 'X-OTX-API-KEY': process.env.OTX_API_KEY }
    }, 12000);
    if (res.ok) {
      const data = await res.json();
      caches.news.data = [...(caches.news.data || []), ...(data.results || []).map(p => ({ title: `[OTX] ${p.name}`, url: `https://otx.alienvault.com/pulse/${p.id}`, source: 'AlienVault' }))].slice(0, 100);
      console.log(`[Sync] OTX Pulses: ${data.results?.length || 0}`);
    }
  } catch (e) { }
}

async function syncRadar() {
  try {
    const res = await fetchWithTimeout('https://api.cloudflare.com/client/v4/radar/ranking/top?limit=10', {
      headers: { 'Authorization': `Bearer ${process.env.CF_API_TOKEN}` }
    }, 12000);
    if (res.ok) {
      const data = await res.json();
      caches.tor.data = [...(caches.tor.data || []), ...(data.result?.top_0 || []).map(r => ({ nickname: `ASN-${r.asn}`, country: 'BGP_ANOMALY', latitude: 0, longitude: 0 }))].slice(0, 300);
      console.log('[Sync] CF Radar Integrated');
    }
  } catch (e) { }
}

setInterval(syncFlights, 60000);
setInterval(syncSatellites, 300000);
setInterval(syncIntel, 600000);
setInterval(syncExtra, 600000);
setInterval(syncNews, 600000);
setInterval(syncOTX, 900000);
setInterval(syncRadar, 900000);

setTimeout(syncFlights, 1000);
setTimeout(syncSatellites, 3000);
setTimeout(syncIntel, 5000);
setTimeout(syncExtra, 7000);
setTimeout(syncNews, 8000);
setTimeout(syncOTX, 10000);
setTimeout(syncRadar, 12000);

app.get('/api/data/flights', (req, res) => res.json(caches.flights.data));
app.get('/api/data/satellites', (req, res) => res.json(caches.satellites.data));
app.get('/api/data/intel', (req, res) => res.json(caches.intel.data));
app.get('/api/data/tor', (req, res) => res.json(caches.tor.data));
app.get('/api/data/news', (req, res) => res.json(caches.news.data));
app.get('/api/data/otx', (req, res) => res.json({ results: caches.news.data.filter(n => n.source === 'AlienVault') }));
app.get('/api/data/radar', (req, res) => res.json({ result: { top_0: caches.tor.data.filter(t => t.country === 'BGP_ANOMALY') } }));

const AIS = { upstream: null, clients: new Set() };
const connectUpstream = () => {
  if (AIS.upstream?.readyState === 1) return;
  const upstream = new WebSocket('wss://stream.aisstream.io/v0/stream', {
    rejectUnauthorized: false
  });
  upstream.on('open', () => {
    AIS.upstream = upstream;
    console.log('[AIS] Connected, subscribing...');
    setTimeout(() => {
      if (upstream.readyState === 1) {
        upstream.send(JSON.stringify({
          APIKey: process.env.AIS_STREAM_API_KEY,
          BoundingBoxes: [[[-90, -180], [90, 180]]],
          FilterMessageTypes: ["PositionReport"]
        }));
      }
    }, 2000);
  });
  let msgCount = 0;
  upstream.on('message', (msg) => {
    msgCount++;
    if (msgCount % 100 === 0) console.log(`[AIS] Received ${msgCount} messages`);
    const str = msg.toString();
    AIS.clients.forEach(c => { if (c.readyState === 1) c.send(str); });
  });
  upstream.on('error', (err) => console.error('[AIS] Stream Error:', err.message));
  upstream.on('close', (code, reason) => {
    console.warn(`[AIS] Stream Closed. Code: ${code}, Reason: ${reason}`);
    setTimeout(connectUpstream, 10000);
  });
};

const wss = new WebSocketServer({ noServer: true });
const upgradeHandler = (req, socket, head) => {
  if (req.url.startsWith('/api/ws/ais')) {
    wss.handleUpgrade(req, socket, head, (ws) => {
      AIS.clients.add(ws);
      ws.on('close', () => AIS.clients.delete(ws));
      connectUpstream();
    });
  } else { socket.destroy(); }
};

httpServer.on('upgrade', upgradeHandler);
httpsServer.on('upgrade', upgradeHandler);

app.use((req, res, next) => {
  const host = req.headers.host || '';
  if (req.url.startsWith('/api')) return next();
  const file = host.startsWith('shadownet') ? join(distPath, 'index.html') : join(labPath, 'index.html');
  res.sendFile(file);
});

httpServer.listen(process.env.PORT || 80, '0.0.0.0');
httpsServer.listen(443, '0.0.0.0', () => console.log('System FINAL NOMINAL'));
