import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// --- Backend Cache Mechanism (Otonom Proxy) ---
// Vite sunucusu arka planda çalışırken ADSB ağına bağlanır, veriyi çeker ve hafızasında tutar.
// Böylece frontend rate limit (429) veya CORS yemez.
let flightCache: any = { ac: [] };
let lastFetch = 0;

const flightProxyPlugin = () => ({
  name: 'flight-proxy',
  configureServer(server: any) {
    server.middlewares.use('/api/flights', async (req: any, res: any) => {
      const now = Date.now();
      
      // Eğer önbellek 30 saniyeden eskiyse arka plandan ADSB'yi güncelle
      if (now - lastFetch > 30000 || !flightCache.ac || flightCache.ac.length === 0) { 
         try {
            // ADSB.lol: Topluluk destekli sınırsız uçak veri sensörü
            // GLOBAL MILITARY (Askeri uçaklar) ve VIP LADD (Sansürlü Özel Jetler)
            const [milRes, laddRes] = await Promise.all([
              fetch('https://api.adsb.lol/v2/mil'),
              fetch('https://api.adsb.lol/v2/ladd')
            ]);
            
            if (milRes.ok && laddRes.ok) {
              const milData = await milRes.json();
              const laddData = await laddRes.json();
              
              let combinedAc: any[] = [];
              if (milData.ac) combinedAc = combinedAc.concat(milData.ac);
              if (laddData.ac) combinedAc = combinedAc.concat(laddData.ac);
              
              flightCache = { ac: combinedAc };
              lastFetch = now;
            } else {
               console.error('[Backend Proxy] ADSB.lol API Error');
            }
         } catch(e) {
            console.error('[Backend Proxy] Proxy hatası:', e);
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
