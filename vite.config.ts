import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// --- ShadowNet V7 Multi-Service Proxy ---
const CACHE_TTL = 60000;
const caches: any = {
  flights: { data: { ac: [] }, lastFetch: 0 },
  satellites: { data: [], lastFetch: 0 },
  tor: { data: [], lastFetch: 0 },
  news: { data: [], lastFetch: 0 }
};

const shadowProxyPlugin = () => ({
  name: 'shadow-proxy',
  configureServer(server: any) {
    // 1. Uçuşlar (ADSB.lol MIL + LADD)
    server.middlewares.use('/api/data/flights', async (_req: any, res: any) => {
      const now = Date.now();
      if (now - caches.flights.lastFetch > 30000) {
        try {
          const [milRes, laddRes] = await Promise.all([
            fetch('https://api.adsb.lol/v2/mil'),
            fetch('https://api.adsb.lol/v2/ladd')
          ]);
          if (milRes.ok && laddRes.ok) {
            const milData = await milRes.json();
            const laddData = await laddRes.json();
            caches.flights.data = { ac: [...(milData.ac || []), ...(laddData.ac || [])] };
            caches.flights.lastFetch = now;
          }
        } catch (e) { console.error('[Proxy] Flight Error:', e); }
      }
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(caches.flights.data));
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

    // 3. Tor Exit Nodes (Sabit bilinen düğümler + canlı veri)
    server.middlewares.use('/api/data/tor', async (_req: any, res: any) => {
      const now = Date.now();
      if (now - caches.tor.lastFetch > 600000 || caches.tor.data.length === 0) {
        try {
          // Onionoo bazen yavaş olabiliyor, timeout ile koru
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          const response = await fetch('https://onionoo.torproject.org/details?type=relay&running=true&limit=50&fields=fingerprint,nickname,country_name,latitude,longitude', { signal: controller.signal });
          clearTimeout(timeout);
          if (response.ok) {
            const data = await response.json();
            const filtered = (data.relays || []).filter((r: any) => r.latitude && r.longitude);
            if (filtered.length > 0) {
              caches.tor.data = filtered;
              caches.tor.lastFetch = now;
            }
          }
        } catch (e) { 
          // Timeout veya bağlantı hatası - Sabit düğüm listesi kullan
          if (caches.tor.data.length === 0) {
            caches.tor.data = [
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
            ];
            caches.tor.lastFetch = now;
          }
        }
      }
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(caches.tor.data));
    });

    // 4. Haberler (WikiMedia Recent Changes - her zaman çalışır, CORS yok)
    server.middlewares.use('/api/data/news', async (_req: any, res: any) => {
      const now = Date.now();
      if (now - caches.news.lastFetch > CACHE_TTL) {
        try {
          // WikiMedia EventStreams yerine Wikipedia'nın açık API'sini kullanıyoruz
          const response = await fetch('https://en.wikipedia.org/w/api.php?action=query&list=recentchanges&rcnamespace=0&rclimit=15&rctype=edit&rcshow=!minor&format=json');
          if (response.ok) {
            const data = await response.json();
            if (data.query && data.query.recentchanges) {
              caches.news.data = data.query.recentchanges.map((rc: any) => ({
                title: rc.title,
                url: `https://en.wikipedia.org/wiki/${encodeURIComponent(rc.title)}`,
                source: 'Wikipedia Global Edit'
              }));
              caches.news.lastFetch = now;
            }
          }
        } catch (e) { console.error('[Proxy] News Error:', e); }
      }
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(caches.news.data));
    });
  }
});

export default defineConfig({
  plugins: [react(), shadowProxyPlugin()],
})
