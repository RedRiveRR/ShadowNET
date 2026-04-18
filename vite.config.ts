import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// --- Backend Cache Mechanism (Otonom Proxy) ---
// Vite sunucusu arka planda çalışırken OpenSky ağına bağlanır, veriyi çeker ve 20 saniye hafızasında tutar.
// Böylece frontend rate limit (429) veya CORS yemez.
let flightCache = { states: null };
let lastFetch = 0;

const flightProxyPlugin = () => ({
  name: 'flight-proxy',
  configureServer(server: any) {
    server.middlewares.use('/api/flights', async (req: any, res: any) => {
      const now = Date.now();
      
      // Eğer önbellek 30 saniyeden eskiyse arka plandan OpenSky'ı güncelle
      if (now - lastFetch > 30000 || !flightCache.states) { 
         try {
            // ADSB.lol: Topluluk destekli sınırsız uçak veri sensörü
            // Avrupa hava sahasındaki (LATS 50, LONS 10 merkezli 250 mil çapındaki) uçuşlar
            const openSkyUrl = 'https://api.adsb.lol/v2/point/50/10/250';
            const req = await fetch(openSkyUrl);
            
            if (req.ok) {
              const data = await req.json();
              if (data && data.ac) {
                 flightCache = data;
                 lastFetch = now;
              }
            } else {
               console.error('[Backend Proxy] ADSB.lol reddetti. Status:', req.status);
            }
         } catch(e) {
            console.error('[Backend Proxy] OpenSky bağlantı hatası:', e);
         }
      }
      
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(flightCache));
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), flightProxyPlugin()],
})
