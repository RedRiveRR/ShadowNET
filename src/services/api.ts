import { useMetricsStore } from '../store/useMetricsStore';
import type { Flight, Satellite, NewsEvent, TorNode, CryptoWhale } from '../store/useMetricsStore';
import * as satellite from 'satellite.js';

// === DEPREMLER ===
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
  } catch (e) { console.error('Deprem Hatası:', e); }
};

// === UÇUŞLAR (Universal Quad-Source Adapter) ===
export const fetchFlights = async (bounds?: { lamin: number; lomin: number; lamax: number; lomax: number }) => {
  try {
    let url = '/api/data/flights';
    if (bounds) {
      const params = new URLSearchParams({
        lamin: bounds.lamin.toString(),
        lomin: bounds.lomin.toString(),
        lamax: bounds.lamax.toString(),
        lomax: bounds.lomax.toString()
      });
      url += `?${params.toString()}`;
    }

    const response = await fetch(url);
    const data = await response.json();
    
    const activeSource = data._source || 'UNKNOWN';
    const report = data._report || [];
    const remainingCredits = data._credits;

    // API Durumunu Güncelle
    const currentStatus = useMetricsStore.getState().apiStatus;
    const providers = currentStatus.providers.map(p => {
      if (p.name === activeSource) return { ...p, status: 'OK' as const };
      const failEntry = report.find((r: any) => r.name === p.name);
      if (failEntry) return { ...p, status: 'ERR' as const };
      return p;
    });

    useMetricsStore.getState().setApiStatus({
      activeProvider: activeSource === 'SIMULATED' ? '⚠️ SIMULATED ⚠️' : activeSource,
      providers: providers,
      remainingCredits: remainingCredits !== undefined ? remainingCredits : currentStatus.remainingCredits
    });

    const flights: Flight[] = [];

    // --- Format Tespiti ve Parsing ---
    // ADSB-FI / ONE / LOL / SIMULATED FORMATI (ac veya aircraft dizisi)
    const acList = data.ac || data.aircraft;
    if (acList && Array.isArray(acList)) {
      for (const ac of acList) {
        if (!ac.lat || !ac.lon) continue;
        flights.push({
          id: ac.hex || Math.random().toString(36),
          lat: ac.lat,
          lng: ac.lon,
          alt: ac.alt_baro || 0,
          heading: ac.track || 0,
          speed: ac.gs || 0,
          velocity_m_s: (ac.gs || 0) * 0.514444, 
          callsign: (ac.flight || ac.callsign || 'UNK').trim(),
          type: ac.t || 'COMM'
        });
      }
    } else if (data && data.states) { // OPEN SKY FORMATI
      for (const s of data.states) {
        if (s[6] === null || s[5] === null) continue;
        flights.push({
          id: s[0], 
          lat: s[6], 
          lng: s[5], 
          alt: s[7] ? Math.round(s[7] * 3.28084) : 0,
          heading: s[10] || 0,
          speed: s[9] ? Math.round(s[9] * 1.94384) : 0,
          velocity_m_s: s[9] || 0,
          callsign: s[1] ? s[1].trim() : 'UNK',
          type: 'COMM'
        });
      }
    }

    if (flights.length > 0) {
      useMetricsStore.getState().setFlights(flights);
    }
  } catch (e) { 
    console.error('Uçuş Hatası:', e);
  }
};

// === UYDULAR ===
export const fetchSatellites = async () => {
  try {
    const response = await fetch('/api/data/satellites');
    if (!response.ok) return;
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const sats: Satellite[] = data.map((s: any, i: number) => ({
        id: `sat-${i}`, name: s.name, tle1: s.tle1, tle2: s.tle2
      }));
      useMetricsStore.getState().setSatellites(sats);
      // İlk yükleme sonrası hemen pozisyon hesapla
      propagateSatellites();
    }
  } catch (e) { console.error('Uydu Hatası:', e); }
};

// === HABERLER (Keyword-Geocoding) ===
const COUNTRY_MAP: Record<string, {lat: number, lng: number}> = {
  'USA': {lat: 37, lng: -95}, 'US': {lat: 37, lng: -95}, 'United States': {lat: 37, lng: -95},
  'Iran': {lat: 32, lng: 53}, 'Russia': {lat: 61, lng: 105}, 'Ukraine': {lat: 48, lng: 31},
  'China': {lat: 35, lng: 103}, 'Israel': {lat: 31, lng: 35}, 'Turkey': {lat: 39, lng: 35},
  'UK': {lat: 55, lng: -3}, 'Germany': {lat: 51, lng: 10}, 'France': {lat: 46, lng: 2},
  'Havana': {lat: 23, lng: -82}, 'Cuba': {lat: 21, lng: -77}, 'Kyiv': {lat: 50, lng: 30},
  'Taiwan': {lat: 23, lng: 121}, 'Japan': {lat: 36, lng: 138}, 'Gaza': {lat: 31.3, lng: 34.3}
};

export const fetchNews = async () => {
  try {
    const response = await fetch('/api/data/news');
    if (!response.ok) return;
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const news: NewsEvent[] = data.map((art: any, i: number) => {
        let lat, lng;
        // Başlıkta ülke ara
        for (const [key, coords] of Object.entries(COUNTRY_MAP)) {
          if (art.title.toLowerCase().includes(key.toLowerCase())) {
            lat = coords.lat; lng = coords.lng;
            break;
          }
        }
        return {
          id: `news-${i}-${Date.now()}`, title: art.title, url: art.url || '',
          source: art.source || 'NY Times World', time: Date.now(), lat, lng
        };
      });
      useMetricsStore.getState().setNewsEvents(news);
    }
  } catch (e) { console.error('Haber Hatası:', e); }
};

// === TOR DÜĞÜMLERİ ===
export const fetchTorNodes = async () => {
  try {
    const response = await fetch('/api/data/tor');
    if (!response.ok) return;
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const nodes: TorNode[] = data.map((n: any) => ({
        id: n.fingerprint || String(Math.random()),
        nickname: n.nickname || 'Anonim',
        lat: n.latitude, lng: n.longitude,
        country: n.country_name || 'Gizli'
      })).filter((n: TorNode) => n.lat && n.lng);
      useMetricsStore.getState().setTorNodes(nodes);
    }
  } catch (e) { console.error('Tor Hatası:', e); }
};

// === ISS ===
export const fetchISS = async () => {
  try {
    const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
    const data = await res.json();
    useMetricsStore.getState().setISS({ lat: data.latitude, lng: data.longitude, velocity: data.velocity, altitude: data.altitude });
  } catch (e) {}
};

// === UYDU YÖRÜNGE MOTORU (90dk Path) ===
export const propagateSatellites = () => {
  const { satellites, setSatellites } = useMetricsStore.getState();
  if (!satellites.length) return;
  const now = new Date();
  const updated = satellites.map(s => {
    try {
      if (!s.tle1 || !s.tle2) return s;
      const satrec = satellite.twoline2satrec(s.tle1, s.tle2);
      
      // Mevcut konum
      const posVel = satellite.propagate(satrec, now);
      if (!posVel.position || typeof posVel.position === 'boolean') return s;
      const gmst = satellite.gstime(now);
      const posGd = satellite.eciToGeodetic(posVel.position as satellite.EciVec3<number>, gmst);
      
      // 90 dakikalık yörünge yolu (Orbit Path) - 15 nokta
      const path = [];
      for (let i = 0; i < 90; i += 6) {
        const futureTime = new Date(now.getTime() + i * 60000);
        const fPosVel = satellite.propagate(satrec, futureTime);
        if (fPosVel.position && typeof fPosVel.position !== 'boolean') {
          const fGmst = satellite.gstime(futureTime);
          const fPosGd = satellite.eciToGeodetic(fPosVel.position as satellite.EciVec3<number>, fGmst);
          path.push({
            lat: satellite.degreesLat(fPosGd.latitude),
            lng: satellite.degreesLong(fPosGd.longitude)
          });
        }
      }

      return { 
        ...s, 
        lat: satellite.degreesLat(posGd.latitude), 
        lng: satellite.degreesLong(posGd.longitude), 
        alt: posGd.height / 6371,
        path 
      };
    } catch (e) { return s; }
  });
  setSatellites(updated);
};

// === SİBER GÜVENLİK (NVD CVE) ===
export const fetchNVD = async () => {
  try {
    const res = await fetch('https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=3');
    if (res.ok) {
      const data = await res.json();
      if (data.vulnerabilities && data.vulnerabilities.length > 0) {
        const cve = data.vulnerabilities[0].cve;
        useMetricsStore.getState().addSecurityAlert({
          id: cve.id + '-' + Date.now(),
          type: 'CVE',
          severity: cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseSeverity || 'HIGH',
          title: `[CVE] ${cve.id}`,
          time: Date.now()
        });
      }
    }
  } catch (e) {}
};

// === ALIENVAULT OTX (Proxy üzerinden) ===
export const fetchOTX = async () => {
  try {
    const response = await fetch('/api/data/otx');
    if (response.ok) {
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        data.results.slice(0, 3).forEach((pulse: any) => {
          useMetricsStore.getState().addSecurityAlert({
            id: `otx-${pulse.id}-${Date.now()}-${Math.random()}`,
            type: 'OTX',
            severity: 'CRITICAL',
            title: `[OTX] ${pulse.name.slice(0, 50)}`,
            time: Date.now(),
            url: `https://otx.alienvault.com/pulse/${pulse.id}`
          });
        });
      }
    }
  } catch (e) {}
};

// === CLOUDFLARE RADAR (Proxy üzerinden) ===
export const fetchRadar = async () => {
  try {
    const response = await fetch('/api/data/radar');
    if (response.ok) {
      const data = await response.json();
      if (data.result && data.result.top_0 && data.result.top_0.length > 0) {
        const topASN = data.result.top_0[0];
        useMetricsStore.getState().addSecurityAlert({
          id: `radar-bgp-${Date.now()}`,
          type: 'BGP',
          severity: parseFloat(topASN.value) > 2.0 ? 'CRITICAL' : 'HIGH',
          title: `[BGP] ASN ${topASN.asn} (${topASN.ASName?.slice(0, 22) || 'Unknown'}) %${parseFloat(topASN.value).toFixed(1)}`,
          time: Date.now(),
          url: 'https://radar.cloudflare.com/routing'
        });
      }
    }
  } catch (e) {}
};

// === KRİPTO BALİNALAR (Binance WebSocket) ===
let binanceWs: WebSocket | null = null;
export const connectCryptoWebSocket = () => {
  try {
    if (!binanceWs || binanceWs.readyState === WebSocket.CLOSED) {
      binanceWs = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@aggTrade');
      binanceWs.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.e === 'aggTrade') {
          const dollarValue = parseFloat(data.p) * parseFloat(data.q);
          if (dollarValue > 5000) {
            useMetricsStore.getState().addCryptoWhale({
              id: `bn-${data.f}-${Math.random()}`, value: parseFloat(data.q),
              time: Date.now(), source: `BINANCE ${data.m ? 'SATIŞ' : 'ALIŞ'} $${(dollarValue/1000).toFixed(0)}K`
            });
          }
        }
      };
      binanceWs.onerror = () => { binanceWs = null; };
    }
  } catch (e) {}
};

// === SİSTEM BAŞLATICI ===
export const startDataStreams = () => {
  fetchEarthquakes();
  fetchFlights();
  fetchISS();
  fetchSatellites();
  fetchNews();
  fetchTorNodes();
  fetchNVD();
  fetchOTX();
  fetchRadar();
  connectCryptoWebSocket();

  setInterval(fetchEarthquakes, 60000);
  setInterval(() => {
    const bounds = useMetricsStore.getState().apiStatus.currentBounds;
    fetchFlights(bounds || undefined);
  }, 10000); // 10 saniyede bir proxy'den (Master Hub) filtrelenmiş veriyi çek
  setInterval(fetchISS, 3000);
  setInterval(fetchSatellites, 300000);
  setInterval(fetchNews, 120000);
  setInterval(fetchTorNodes, 120000);
  setInterval(fetchNVD, 90000);
  setInterval(fetchOTX, 60000);
  setInterval(fetchRadar, 120000);
  setInterval(propagateSatellites, 2000);
  setInterval(() => useMetricsStore.getState().clearOldCryptoWhales(), 5000);
  
  // WebSocket yeniden bağlantı
  setInterval(() => {
    if (!binanceWs || binanceWs.readyState === WebSocket.CLOSED) connectCryptoWebSocket();
  }, 5000);
};

