import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { config as dotenvConfig } from 'dotenv'

// .env dosyasını sunucu tarafında yükle
dotenvConfig();

// --- ShadowNet V7 Multi-Service Proxy ---
const caches: any = {
  flights: { data: { ac: [] }, lastFetch: 0 },
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
    console.log('[Proxy] Requesting NEW OpenSky OAuth2 Token...');
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
      const data: any = await response.json();
      openskyToken = {
        value: data.access_token,
        expires: now + (data.expires_in * 1000)
      };
      console.log('[Proxy] OpenSky OAuth2 Token OBTAINED.');
      return openskyToken.value;
    } else {
      console.error('[Proxy] OAuth2 Token Error:', response.status);
      return null;
    }
  } catch (e) {
    console.error('[Proxy] OAuth2 Fetch Exception:', e);
    return null;
  }
}

const shadowProxyPlugin = () => ({
  name: 'shadow-proxy',
  configureServer(server: any) {
    // --- API Cooldown Management ---
    const apiCooldowns: Record<string, number> = {};

    // 1. Uçuşlar (Sovereign Master Data Hub Mimarisi)
    server.middlewares.use('/api/data/flights', async (req: any, res: any) => {
      const now = Date.now();
      const url = new URL(req.url, `http://${req.headers.host}`);
      const lamin = url.searchParams.get('lamin');
      const lomin = url.searchParams.get('lomin');
      const lamax = url.searchParams.get('lamax');
      const lomax = url.searchParams.get('lomax');

      // MASTER HUB STRATEJİSİ:
      // Her zaman Global Cache üzerinden çalış. Eğer Global yoksa veya eskiyse çek.
      // Bu sayede 100 kullanıcı farklı yerlere baksa bile OpenSky'a sadece 1 Global istek gider.
      const GLOBAL_TTL = 90000; // 90 Saniye (4000 Kredi / 4 = 1000 istek/gün garantisi)
      
      if (!caches.flights.global || now - caches.flights.global.lastFetch > GLOBAL_TTL) {
        let success = false;
        const token = await getOpenSkyToken();
        
        // MASTER HUB PROVIDERS
        const providers = [
          { name: 'OPENSKY', url: 'https://opensky-network.org/api/states/all', type: 'GLOBAL', auth: true },
          { name: 'ADSB.LOL', url: 'https://api.adsb.lol/v2', type: 'REGIONAL', auth: false },
          { name: 'AIRPLANES', url: 'https://api.airplanes.live/v2', type: 'REGIONAL', auth: false },
          { name: 'ADSB.ONE', url: 'https://api.adsb.one/v2', type: 'REGIONAL', auth: false }
        ];

        for (const p of providers) {
          if (apiCooldowns[p.name] && now - apiCooldowns[p.name] < 120 * 1000) continue;

          try {
            let finalUrl = p.url;
            if (p.type === 'REGIONAL') {
              // Eğer bölgesel bir provider ise ve istekte koordinat varsa point query yap
              // Yoksa (Global haritadaysa) bu provider'ı atla (all desteklemiyorlar)
              if (lamin && lomin && lamax && lomax) {
                const midLat = (parseFloat(lamin) + parseFloat(lamax)) / 2;
                const midLng = (parseFloat(lomin) + parseFloat(lomax)) / 2;
                finalUrl += `/point/${midLat.toFixed(4)}/${midLng.toFixed(4)}/250`;
              } else {
                continue; 
              }
            } else {
              finalUrl = p.url; // OpenSky all
            }

            console.log(`[MasterHub] Fetching NEW State from ${p.name} -> ${finalUrl}`);
            const headers: any = { 'User-Agent': 'Mozilla/5.0 ShadowNet/11.0 MasterHub' };
            if (p.auth && token) headers['Authorization'] = `Bearer ${token}`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            const response = await fetch(finalUrl, { headers, signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.ok) {
              const rawData = (await response.json()) as any;
              const credits = response.headers.get('X-Rate-Limit-Remaining');
              
              caches.flights.global = {
                data: { ...rawData, _source: p.name, _credits: credits ? parseInt(credits) : null },
                lastFetch: now
              };
              success = true;
              delete apiCooldowns[p.name];
              console.log(`[MasterHub] Success! Source: ${p.name}`);
              break;
            } else { 
              apiCooldowns[p.name] = now; 
            }
          } catch (e: any) { 
            apiCooldowns[p.name] = now; 
          }
        }

        if (!success && !caches.flights.global) {
          caches.flights.global = { data: { ac: [], _simulated: true, _source: 'SIMULATED' }, lastFetch: now };
        }
      }

      // --- ON-THE-FLY FILTERING ---
      // İstek bölgesel ise Master Cache'den süzüp gönder
      let responseData = { ...caches.flights.global.data };

      if (lamin && lomin && lamax && lomax) {
        const blamin = parseFloat(lamin); const blomin = parseFloat(lomin);
        const blamax = parseFloat(lamax); const blomax = parseFloat(lomax);

        // OpenSky Formatı Filtrele
        if (responseData.states) {
          responseData.states = responseData.states.filter((s: any) => 
            s[6] >= blamin && s[6] <= blamax && s[5] >= blomin && s[5] <= blomax
          );
        }
        // ADSB Formatı Filtrele
        if (responseData.ac || responseData.aircraft) {
          const list = responseData.ac || responseData.aircraft;
          const filtered = list.filter((ac: any) => 
            ac.lat >= blamin && ac.lat <= blamax && ac.lon >= blomin && ac.lon <= blomax
          );
          if (responseData.ac) responseData.ac = filtered;
          else responseData.aircraft = filtered;
        }
        responseData._is_regional = true;
      }

      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(responseData));
    });

    // 2. Uydular (CelesTrak TLE - Genişletilmiş Multi-Grup)
    server.middlewares.use('/api/data/satellites', async (_req: any, res: any) => {
      const now = Date.now();
      // Cache süresi: 6 Saat (TLE verileri sık değişmez)
      if (now - caches.satellites.lastFetch > 3600000 * 6) {
        try {
          console.log('[Proxy] Starting Heavy Orbital Scan (Multi-Source)...');
          const groups = ['visual', 'science', 'weather', 'stations', 'iridium', 'gps-ops'];
          let combinedLines: string[] = [];
          
          for (const group of groups) {
            try {
              const resp = await fetch(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`);
              if (resp.ok) {
                const text = await resp.text();
                const groupLines = text.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
                combinedLines = combinedLines.concat(groupLines);
                console.log(`[Proxy] Group [${group}] ingested: ${groupLines.length / 3} sats.`);
              }
            } catch (err) {
              console.warn(`[Proxy] Group [${group}] fetch failed, skipping.`);
            }
          }
          
          const satsMap = new Map();
          for (let i = 0; i < combinedLines.length - 2; i += 3) {
            const name = combinedLines[i];
            const t1 = combinedLines[i+1];
            const t2 = combinedLines[i+2];

            // TLE Alignment Check: Line 1 starts with '1 ', Line 2 starts with '2 '
            if (t1.startsWith('1 ') && t2.startsWith('2 ')) {
              const noradId = t2.substring(2, 7).trim();
              if (!satsMap.has(noradId)) {
                satsMap.set(noradId, { name, tle1: t1, tle2: t2, noradId });
              }
            } else {
              // Misalignment detected, shift index to try to realign
              i -= 2; 
            }
          }
          
          caches.satellites.data = Array.from(satsMap.values());
          caches.satellites.lastFetch = now;
          console.log(`[Proxy] Global Orbit Registry Ready: ${caches.satellites.data.length} targets tracked.`);
        } catch (e) { 
          console.error('[Proxy] Severe Orbital Data Corruption:', e); 
        }
      }
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(caches.satellites.data));
    });

    // 3. Tor Exit Nodes (Sabit listeden başla, canlı veri gelirse güncelle)
    // Sabit listeyi hemen yükle
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
      { fingerprint: 'tor10', nickname: 'TorIstanbul', latitude: 41.0, longitude: 29.0, country_name: 'Turkey' },
      { fingerprint: 'tor11', nickname: 'RusGuard', latitude: 55.7, longitude: 37.6, country_name: 'Russia' },
      { fingerprint: 'tor12', nickname: 'TorIndia', latitude: 28.6, longitude: 77.2, country_name: 'India' },
      { fingerprint: 'tor13', nickname: 'CanadaRelay', latitude: 43.6, longitude: -79.3, country_name: 'Canada' },
      { fingerprint: 'tor14', nickname: 'SwedenNode', latitude: 59.3, longitude: 18.0, country_name: 'Sweden' },
      { fingerprint: 'tor15', nickname: 'RomaniaExit', latitude: 44.4, longitude: 26.1, country_name: 'Romania' },
    ];
    if (caches.tor.data.length === 0) {
      caches.tor.data = staticTorNodes;
      caches.tor.lastFetch = Date.now();
    }
    server.middlewares.use('/api/data/tor', async (_req: any, res: any) => {
      // Arka planda canlı güncelleme dene (bloklama yapmadan)
      if (Date.now() - caches.tor.lastFetch > 600000) {
        fetch('https://onionoo.torproject.org/details?type=relay&running=true&limit=30&fields=fingerprint,nickname,country_name,latitude,longitude')
          .then(r => r.json())
          .then((data: any) => {
            const filtered = (data.relays || []).filter((r: any) => r.latitude && r.longitude);
            if (filtered.length > 0) { caches.tor.data = filtered; caches.tor.lastFetch = Date.now(); }
          })
          .catch(() => {});
      }
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(caches.tor.data));
    });

    // 4. Haberler (İngilizce Son Dakika - RSS2JSON ücretsiz servis)
    server.middlewares.use('/api/data/news', async (_req: any, res: any) => {
      const now = Date.now();
      if (now - caches.news.lastFetch > 120000) { // 2 dk cache
        try {
          const response = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://rss.nytimes.com/services/xml/rss/nyt/World.xml');
          if (response.ok) {
            const data = (await response.json()) as any;
            if (data.items && data.items.length > 0) {
              caches.news.data = data.items.map((item: any) => ({
                title: item.title,
                url: item.link,
                source: 'NY Times World',
                pubDate: item.pubDate
              }));
              caches.news.lastFetch = now;
            }
          }
        } catch (e) { console.error('[Proxy] News Error:', e); }
      }
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(caches.news.data));
    });

    // 5. Cloudflare Radar BGP (CORS bypass)
    server.middlewares.use('/api/data/radar', async (_req: any, res: any) => {
      try {
        const response = await fetch('https://api.cloudflare.com/client/v4/radar/bgp/top/ases?limit=3&dateRange=1d', {
          headers: {
            'Authorization': 'Bearer ' + (process.env.CLOUDFLARE_API_TOKEN || ''),
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          const data = await response.json();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
          return;
        }
      } catch (e) { console.error('[Proxy] Radar Error:', e); }
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ result: null }));
    });

    // 6. GDELT Intelligence Feed (Jeopolitik İstihbarat)
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

    server.middlewares.use('/api/data/intel', async (_req: any, res: any) => {
      const now = Date.now();
      const INTEL_TTL = 900000; // 15 dakika

      if (now - caches.intel.lastFetch > INTEL_TTL) {
        caches.intel.lastFetch = now;
        
        const fetchAllTopics = async () => {
          console.log('[Proxy] Fetching GDELT Intelligence (Combined Fast-Query)...');
          try {
            const url = new URL(GDELT_API);
            // Tüm kategorileri içeren devasa tekil sorgu
            const combinedQuery = '(military OR army OR cyber OR hacking OR nuclear OR sanctions OR espionage OR maritime OR terrorism OR geopolitics OR conflict OR diplomacy OR ransomware OR finance OR energy OR election OR border OR missile OR drone) sourcelang:eng';
            url.searchParams.set('query', combinedQuery);
            url.searchParams.set('mode', 'artlist');
            url.searchParams.set('maxrecords', '250'); // Maximum volume
            url.searchParams.set('format', 'json');
            url.searchParams.set('sort', 'date');
            url.searchParams.set('timespan', '24h');

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
            
            const response = await fetch(url.toString(), {
              headers: { 'User-Agent': 'Mozilla/5.0 ShadowNet/9.0 IntelHub' },
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
              const data = (await response.json()) as any;
              const allArticles = data.articles || [];
              
              // Frontend'in beklediği topicResults formatına dönüştür ve filtreden geçir
              const topicResults = INTEL_TOPICS.map(topic => {
                const matched = allArticles.filter((a: any) => {
                  const title = String(a.title || '').toLowerCase();
                  const url = String(a.url || '').toLowerCase();
                  return topic.k.some(keyword => title.includes(keyword) || url.includes(keyword));
                }).slice(0, 25).map((a: any) => ({
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
              console.log(`[Proxy] GDELT: ${topicResults.reduce((s: number, t: any) => s + t.articles.length, 0)} articles total parsed globally.`);
            } else {
              console.warn(`[Proxy] GDELT returned HTTP ${response.status}`);
              caches.intel.lastFetch = 0; // başarısız, bir dahakine tekrar denenecek
            }
          } catch (e: any) {
            console.error(`[Proxy] GDELT Combined Error or Timeout:`, e.message);
            caches.intel.lastFetch = 0; // Hata oldu, zaman kilidini kaldır!
          }
        };

        if (caches.intel.data.topics.length === 0) {
          // Block on the very first request so UI doesn't stay empty for 15 mins
          console.log('[Proxy] Initial blocking GDELT fetch...');
          await fetchAllTopics();
        } else {
          // Fire and forget for subsequent cache refreshes
          console.log('[Proxy] Background GDELT fetch started...');
          fetchAllTopics().catch(console.error);
        }
      }
      
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(caches.intel.data || { topics: [] }));
    });

    // 7. AlienVault OTX (CORS bypass)
    server.middlewares.use('/api/data/otx', async (_req: any, res: any) => {
      try {
        const response = await fetch('https://otx.alienvault.com/api/v1/pulses/subscribed?limit=5', {
          headers: { 'X-OTX-API-KEY': process.env.OTX_API_KEY || '' }
        });
        if (response.ok) {
          const data = await response.json();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
          return;
        }
      } catch (e) { console.error('[Proxy] OTX Error:', e); }
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ results: [] }));
    });

    // 8. AIS WebSocket Relay (V10.0 Singleton)
    // Single upstream to aisstream.io shared across all browser tabs
    if (server.httpServer) {
        // Persist across HMR restarts via global
        const AIS = (global as any).__AIS_SINGLETON__ || {
            upstream: null,
            clients: new Set(),
            connecting: false,
            packetCount: 0
        };
        (global as any).__AIS_SINGLETON__ = AIS;

        const AIS_KEY = process.env.AIS_STREAM_API_KEY || '';

        const connectUpstream = async () => {
            if (AIS.connecting || (AIS.upstream && AIS.upstream.readyState === 1)) return;
            AIS.connecting = true;

            const { WebSocket: WS } = await import('ws');
            
            try {
                console.log('[AIS] Connecting single upstream to aisstream.io...');
                const upstream = new WS('wss://stream.aisstream.io/v0/stream');

                upstream.on('open', () => {
                    console.log('[AIS] Upstream CONNECTED. Broadcasting to all clients.');
                    AIS.upstream = upstream;
                    AIS.connecting = false;
                    upstream.send(JSON.stringify({
                        APIKey: AIS_KEY,
                        BoundingBoxes: [[[90, -180], [-90, 180]]],
                        FilterMessageTypes: ["PositionReport"]
                    }));
                });

                upstream.on('message', (msg: any) => {
                    AIS.packetCount++;
                    const str = msg.toString();
                    AIS.clients.forEach((c: any) => {
                        if (c.readyState === 1) c.send(str);
                    });
                });

                upstream.on('close', (code: number) => {
                    console.warn(`[AIS] Upstream closed (${code}). Reconnecting in 15s...`);
                    AIS.upstream = null;
                    AIS.connecting = false;
                    setTimeout(connectUpstream, 15000);
                });

                upstream.on('error', (err: any) => {
                    console.error(`[AIS] Upstream error: ${err.message}`);
                    AIS.connecting = false;
                    AIS.upstream = null;
                });
            } catch (e) {
                AIS.connecting = false;
                setTimeout(connectUpstream, 15000);
            }
        };

        // Traffic logger (only one globally)
        if (!(global as any).__AIS_LOGGER__) {
            (global as any).__AIS_LOGGER__ = true;
            setInterval(() => {
                if (AIS.packetCount > 0) {
                    console.log(`[AIS] Traffic: ${AIS.packetCount} pkt/min | Clients: ${AIS.clients.size}`);
                    AIS.packetCount = 0;
                }
            }, 60000);
        }

        server.httpServer.on('upgrade', (req: any, socket: any, head: any) => {
            if (req.url === '/api/ws/ais') {
                import('ws').then(({ WebSocketServer }) => {
                    const wss = new WebSocketServer({ noServer: true });
                    wss.handleUpgrade(req, socket, head, (ws: any) => {
                        AIS.clients.add(ws);
                        console.log(`[AIS] Client connected. Active: ${AIS.clients.size}`);
                        
                        ws.on('message', () => {}); // consume subscribe msg, we handle it globally
                        ws.on('close', () => {
                            AIS.clients.delete(ws);
                            console.log(`[AIS] Client disconnected. Active: ${AIS.clients.size}`);
                        });

                        // Trigger upstream connection if not already alive
                        connectUpstream();
                    });
                }).catch((err: any) => {
                    console.error('[AIS] Failed to load WS module:', err);
                    socket.destroy();
                });
            }
        });

        // Also start upstream connection immediately 
        connectUpstream();
    }
  }
});

export default defineConfig({
  plugins: [react(), shadowProxyPlugin()],
  build: {
    target: 'esnext'
  },
  worker: {
    format: 'es'
  }
});
