import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// --- ShadowNet Multi-Service Data Cache (God Mode Backend) ---
const CACHE_TTL = 60000; // 60 seconds
const caches: any = {
  flights: { data: { ac: [] }, lastFetch: 0 },
  satellites: { data: [], lastFetch: 0 },
  fires: { data: [], lastFetch: 0 },
  tor: { data: [], lastFetch: 0 },
  news: { data: [], lastFetch: 0 }
};

const shadowProxyPlugin = () => ({
  name: 'shadow-proxy',
  configureServer(server: any) {
    // 1. Uçuşlar ve Askeri Radar (ADSB.lol)
    server.middlewares.use('/api/data/flights', async (req: any, res: any) => {
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
        } catch (e) { console.error('Flight Proxy Error:', e); }
      }
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(caches.flights.data));
    });

    // 2. Uydular (CelesTrak TLE) - Sadece en büyük/aktif olanlar
    server.middlewares.use('/api/data/satellites', async (req: any, res: any) => {
      const now = Date.now();
      if (now - caches.satellites.lastFetch > 3600000) { // 1 hour TTL
        try {
          const response = await fetch('https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json');
          if (response.ok) {
            const data = await response.json();
            // İlk 200 aktif uyduyu alalım (Performans için)
            caches.satellites.data = data.slice(0, 200);
            caches.satellites.lastFetch = now;
          }
        } catch (e) { console.error('Satellite Proxy Error:', e); }
      }
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(caches.satellites.data));
    });

    // 3. Tor Exit Nodes (Onionoo)
    server.middlewares.use('/api/data/tor', async (req: any, res: any) => {
      const now = Date.now();
      if (now - caches.tor.lastFetch > CACHE_TTL * 10) { 
        try {
          const response = await fetch('https://onionoo.torproject.org/details?type=relay&running=true&limit=250');
          if (response.ok) {
            const data = await response.json();
            caches.tor.data = data.relays || [];
            caches.tor.lastFetch = now;
          }
        } catch (e) { console.error('Tor Proxy Error:', e); }
      }
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(caches.tor.data));
    });

    // 4. Global Haberler (GDELT)
    server.middlewares.use('/api/data/news', async (req: any, res: any) => {
      const now = Date.now();
      if (now - caches.news.lastFetch > CACHE_TTL) {
        try {
          // GDELT Context API - Son 1 saatteki kritik dünya olayları
          const response = await fetch('https://api.gdeltproject.org/api/v2/doc/doc?query=tone<-5&mode=artlist&format=json&maxrecords=20');
          if (response.ok) {
            const data = await response.json();
            caches.news.data = data.articles || [];
            caches.news.lastFetch = now;
          }
        } catch (e) { console.error('News Proxy Error:', e); }
      }
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(caches.news.data));
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), shadowProxyPlugin()],
})
