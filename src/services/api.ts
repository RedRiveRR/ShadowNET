import { useMetricsStore } from '../store/useMetricsStore';
import type { Earthquake, Flight, ISSData, Disaster, SecurityAlert, CryptoWhale } from '../store/useMetricsStore';

// === ORIGINAL APIS ===

export const fetchEarthquakes = async () => {
  try {
    const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson');
    const data = await response.json();
    if (data.features) {
      const quakes = data.features.map((f: any) => ({
        id: f.id, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0],
        mag: f.properties.mag, title: f.properties.title, time: f.properties.time,
      }));
      useMetricsStore.getState().setEarthquakes(quakes);
    }
  } catch (e) {
    console.error('Earthquake API Error:', e);
  }
};

export const fetchFlights = async () => {
  try {
    // Artık veri çekme işlemini BİZİM yazdığımız Vite Server Proxy'si yapıyor. 
    // Proxy kendi içinde 30 sn'lik Redis benzeri RAM Cache mekanizması çalıştırıyor. Yüzde 100 anti-ban sistemi!
    const response = await fetch('/api/flights');
    if (!response.ok) return;
    
    const data = await response.json();
    if (data && data.ac) {
      // ADSB.lol verileri 'ac' (aircraft) isimli array objesinden döner
      const flightsSample = data.ac.slice(0, 250).filter((s: any) => s.lat !== undefined && s.lon !== undefined);
      const flights: Flight[] = flightsSample.map((s: any) => ({
        id: s.hex || Math.random().toString(), 
        lng: s.lon, 
        lat: s.lat, 
        alt: s.alt_baro || 0, 
        country: s.flight ? s.flight.trim() : 'Unknown',
      }));
      useMetricsStore.getState().setFlights(flights);
    }
  } catch (e) {
    console.error('Flights API Error:', e);
  }
};


// === V2 APIS ===

export const fetchISS = async () => {
  try {
    const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
    const data = await res.json();
    useMetricsStore.getState().setISS({
      lat: data.latitude,
      lng: data.longitude,
      velocity: data.velocity,
      altitude: data.altitude
    });
  } catch (e) {
    console.error('ISS API Error:', e);
  }
};

export const fetchGDACS = async () => {
  try {
    // We use a CORS friendly proxy or mock if it fails since GDACS does not send CORS completely free for all domains
    const response = await fetch('https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP?alertlevel=Green,Orange,Red');
    const data = await response.json();
    // Parse GDACS response
    // But since fetch can fail by CORS on frontend, we will safely parse or fallback
    // For MVP implementation we map if it exists
    if (data && data.features) {
       const mapped: Disaster[] = data.features.map((f: any) => ({
          id: f.properties.eventid.toString(),
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
          title: f.properties.name,
          type: f.properties.eventtype,
          alertLevel: f.properties.alertlevel,
          time: new Date(f.properties.fromdate).getTime()
       }));
       useMetricsStore.getState().setDisasters(mapped);
    }
  } catch (e) {
    // Silently handle CORS or fetch errors
    console.log('GDACS CORS/Fetch error. Waiting for next cycle.');
  }
}

export const fetchNVD = async () => {
  try {
    const res = await fetch('https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=1');
    if(res.status === 200) {
      const data = await res.json();
      if(data.vulnerabilities && data.vulnerabilities.length > 0) {
        const cve = data.vulnerabilities[0].cve;
        useMetricsStore.getState().addSecurityAlert({
          id: cve.id,
          type: 'CVE',
          severity: cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseSeverity || 'HIGH',
          title: `Zafiyet Tespit Edildi: ${cve.id}`,
          time: Date.now()
        });
      }
    }
  } catch(e) {}
}


// === ALIENVAULT OTX ===

export const fetchOTX = async () => {
  try {
    const key = import.meta.env.VITE_OTX_API_KEY;
    if (!key) return; 
    
    // AlienVault expects requests to its API endpoints directly with X-OTX-API-KEY
    const response = await fetch('https://otx.alienvault.com/api/v1/pulses/subscribed?limit=3', {
      headers: { 'X-OTX-API-KEY': key }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const pulse = data.results[0];
        useMetricsStore.getState().addSecurityAlert({
          id: `otx-${pulse.id}`,
          type: 'OTX',
          severity: 'CRITICAL',
          title: `[OTX] ${pulse.name.slice(0, 40)}...`,
          time: Date.now()
        });
      }
    }
  } catch(e) {
    console.error('OTX Fetch Error:', e);
  }
};

// === URLHAUS MALWARE BOTNETS ===

export const fetchURLHaus = async () => {
  try {
    // URLHaus gives recent active malware domains
    const response = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent('https://urlhaus-api.abuse.ch/v1/urls/recent/'));
    if (response.ok) {
      const wrapper = await response.json();
      if (!wrapper.contents) return;
      
      const data = JSON.parse(wrapper.contents);
      if (data.urls && data.urls.length > 0) {
         // Get a random newly active payload
         const malware = data.urls[Math.floor(Math.random() * 5)];
         useMetricsStore.getState().addSecurityAlert({
            id: `malware-${malware.id}-${Date.now()}`,
            type: 'MALWARE',
            severity: 'CRITICAL',
            title: `[URLHAUS] Yeni Zararlı Sunucu Aktif: ${malware.url.slice(0, 30)}...`,
            time: Date.now()
         });
      }
    }
  } catch(e) { console.error('URLHaus Error:', e); }
};

// === CLOUDFLARE RADAR ===

export const fetchRadar = async () => {
  try {
    const cfToken = import.meta.env.VITE_CLOUDFLARE_API_TOKEN;
    if (!cfToken) return;

    const response = await fetch('https://api.cloudflare.com/client/v4/radar/bgp/top/ases?limit=1&dateRange=1d', {
      headers: {
        'Authorization': `Bearer ${cfToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.result && data.result.top_0 && data.result.top_0.length > 0) {
        const topASN = data.result.top_0[0]; // The ASN with most BGP updates (routing anomalies/hijacks)
        
        // Randomly trigger only on major anomalies (>2.0% of global routing) to not spam
        if (parseFloat(topASN.value) > 2.0 && Math.random() > 0.4) {
          useMetricsStore.getState().addSecurityAlert({
            id: `radar-bgp-${Date.now()}`,
            type: 'BGP',
            severity: 'CRITICAL',
            title: `BGP Yönlendirme Anormalliği: ASN ${topASN.asn} (${topASN.ASName.slice(0,18)}...)`,
            time: Date.now()
          });
        }
      }
    }
  } catch (e) {
    console.error('Radar Fetch Error:', e);
  }
}

// === Kripto Balinaları (Blockchain.info + Binance Websocket) ===

const financialHubs = [
  { name: 'New York', lat: 40.7, lng: -74.0 }, { name: 'London', lat: 51.5, lng: -0.1 },
  { name: 'Tokyo', lat: 35.6, lng: 139.6 }, { name: 'Hong Kong', lat: 22.3, lng: 114.1 },
  { name: 'Singapore', lat: 1.3, lng: 103.8 }, { name: 'Frankfurt', lat: 50.1, lng: 8.6 },
  { name: 'Dubai', lat: 25.2, lng: 55.2 }, { name: 'Zurich', lat: 47.3, lng: 8.5 },
  { name: 'Istanbul', lat: 41.0, lng: 28.9 }, { name: 'San Francisco', lat: 37.7, lng: -122.4 }
];

let ws: WebSocket | null = null;
let binanceWs: WebSocket | null = null;

export const connectCryptoWebSocket = () => {
  // 1. Blockchain.info (Legacy BTC Mempool)
  try {
    if (!ws || ws.readyState === WebSocket.CLOSED) {
      ws = new WebSocket('wss://ws.blockchain.info/inv');
      ws.onopen = () => {
        ws?.send(JSON.stringify({ "op": "unconfirmed_sub" }));
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.op === 'utx' && data.x) {
          let totalValue = 0;
          data.x.out.forEach((out: any) => { totalValue += out.value; });
          const btcValue = totalValue / 100000000;
          
          if (btcValue > 5) { 
            const state = useMetricsStore.getState();
            
            const startLat = (Math.random() * 140) - 70;
            const startLng = (Math.random() * 360) - 180;
            const endLat = (Math.random() * 140) - 70;
            const endLng = (Math.random() * 360) - 180;
            
            const newWhale: CryptoWhale = {
              id: data.x.hash,
              value: btcValue,
              startLat, startLng, endLat, endLng,
              time: Date.now(),
              source: 'BTC MEMPOOL'
            };
            
            const newWhales = [newWhale, ...state.cryptoWhales].slice(0, 40);
            state.setCryptoWhales(newWhales);
          }
        }
      };
    }
  } catch (e) { console.error('Blockchain WS Error', e); }

  // 2. Binance Live AggTrade Stream (For Exact $50k+ Trades)
  try {
    if (!binanceWs || binanceWs.readyState === WebSocket.CLOSED) {
      binanceWs = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@aggTrade');
      
      binanceWs.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.e === 'aggTrade') {
          const price = parseFloat(data.p);
          const quantity = parseFloat(data.q);
          const dollarValue = price * quantity;
          
          // Eğer tekil bir işlem 50.000$ (Elli Bin Dolar) üzerindeyse!
          if (dollarValue > 50000) {
            const state = useMetricsStore.getState();
            
            // Finans merkezleri arası lazer atışı uydur (New York, Londra, Tokyo, Dubai vb coords)
            const startHub = financialHubs[Math.floor(Math.random() * financialHubs.length)];
            let endHub = financialHubs[Math.floor(Math.random() * financialHubs.length)];
            while(endHub.lat === startHub.lat) endHub = financialHubs[Math.floor(Math.random() * financialHubs.length)];
            
            const newWhale: CryptoWhale = {
              id: `binance-${data.T}-${Math.random()}`,
              value: dollarValue / price, // BTC Equivalent
              startLat: startHub.lat, 
              startLng: startHub.lng, 
              endLat: endHub.lat, 
              endLng: endHub.lng,
              time: Date.now(),
              source: `BINANCE ${data.m ? 'SELL' : 'BUY'} WALL`
            };
            
            // Lazer limitini 40'a çıkartalım, borsada çok aksiyon var!
            const newWhales = [newWhale, ...state.cryptoWhales].slice(0, 40);
            state.setCryptoWhales(newWhales);
          }
        }
      };
    }
  } catch (e) { console.error('Binance WS Error', e); }
};

// === BOOTSTRAP ===

export const startDataStreams = () => {
  // Init
  fetchEarthquakes();
  fetchFlights();
  fetchISS();
  fetchGDACS();
  fetchNVD();
  fetchOTX();
  fetchRadar();
  fetchURLHaus();
  connectCryptoWebSocket();

  // Intervals
  setInterval(fetchEarthquakes, 60000); 
  setInterval(fetchFlights, 10000); // Artık 10 saniyede bir çekebiliriz, çünkü asıl istekleri çeken proxy! 
  setInterval(fetchISS, 3000);
  setInterval(fetchGDACS, 300000); // 5 mins
  setInterval(fetchNVD, 60000); // Check NVD every minute
  setInterval(fetchOTX, 60000); // Check AlienVault every minute
  setInterval(fetchRadar, 120000); // Check Cloudflare Radar every 2 mins
  setInterval(fetchURLHaus, 120000); // Check URLHaus Malware IPs every 2 mins

  setInterval(() => {
    useMetricsStore.getState().clearOldCryptoWhales();
  }, 1000);
};
