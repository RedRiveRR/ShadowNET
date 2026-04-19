import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { config as dotenvConfig } from 'dotenv'

// .env dosyasını sunucu tarafında yükle
dotenvConfig();

// --- ShadowNet V7 Multi-Service Proxy ---
const CACHE_TTL = 60000;
const caches: any = {
  flights: { data: { ac: [] }, lastFetch: 0 },
  satellites: { data: [], lastFetch: 0 },
  tor: { data: [], lastFetch: 0 },
  news: { data: [], lastFetch: 0 }
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
        const providerReport: any[] = [];
        const token = await getOpenSkyToken();
        const providers = [
          { name: 'OPENSKY', url: 'https://opensky-network.org/api/states/all', auth: true },
          { name: 'AIRPLANES', url: 'https://api.airplanes.live/v2/all', auth: false },
          { name: 'ADSBONE', url: 'https://api.adsb.one/v2/all', auth: false }
        ];

        for (const p of providers) {
          if (apiCooldowns[p.name] && now - apiCooldowns[p.name] < 300 * 1000) continue;

          try {
            console.log(`[MasterHub] Fetching NEW Global State from ${p.name}...`);
            const headers: any = { 'User-Agent': 'Mozilla/5.0 ShadowNet/8.0 MasterHub' };
            if (p.auth && token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(p.url, { headers });
            if (response.ok) {
              const rawData = await response.json();
              const credits = response.headers.get('X-Rate-Limit-Remaining');
              
              caches.flights.global = {
                data: { ...rawData, _source: p.name, _credits: credits ? parseInt(credits) : null },
                lastFetch: now
              };
              success = true;
              delete apiCooldowns[p.name];
              break;
            } else { apiCooldowns[p.name] = now; }
          } catch (e) { apiCooldowns[p.name] = now; }
        }

        if (!success && !caches.flights.global) {
          // Hiç veri yoksa boş bir global cache oluştur
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

    // 2. Uydular (CelesTrak TLE satırları - Uzay İstasyonları grubu)
    server.middlewares.use('/api/data/satellites', async (_req: any, res: any) => {
      const now = Date.now();
      if (now - caches.satellites.lastFetch > 3600000) {
        try {
          // TLE formatında çekiyoruz (3 satırlık klasik TLE)
          const response = await fetch('https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle');
          if (response.ok) {
            const text = await response.text();
            const lines = text.trim().split('\n').map((l: string) => l.trim());
            const sats: any[] = [];
            for (let i = 0; i < lines.length - 2; i += 3) {
              sats.push({
                name: lines[i],
                tle1: lines[i + 1],
                tle2: lines[i + 2]
              });
            }
            caches.satellites.data = sats;
            caches.satellites.lastFetch = now;
          }
        } catch (e) { console.error('[Proxy] Satellite Error:', e); }
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
          .then(data => {
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
            const data = await response.json();
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
            'Authorization': 'Bearer ' + (process.env.VITE_CLOUDFLARE_API_TOKEN || ''),
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

    // 6. AlienVault OTX (CORS bypass)
    server.middlewares.use('/api/data/otx', async (_req: any, res: any) => {
      try {
        const response = await fetch('https://otx.alienvault.com/api/v1/pulses/subscribed?limit=5', {
          headers: { 'X-OTX-API-KEY': process.env.VITE_OTX_API_KEY || '' }
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
  }
});

export default defineConfig({
  plugins: [react(), shadowProxyPlugin()],
});
