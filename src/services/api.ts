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

// === UÇUŞLAR (Askeri + VIP) ===
export const fetchFlights = async () => {
  try {
    const response = await fetch('/api/data/flights');
    if (!response.ok) return;
    const data = await response.json();
    if (data && data.ac) {
      const flights: Flight[] = [];
      for (const s of data.ac) {
        // Koordinat çözümleme: lat/lon > rr_lat/rr_lon > lastPosition
        let lat = s.lat;
        let lng = s.lon;
        if (lat === undefined || lat === null) lat = s.rr_lat;
        if (lng === undefined || lng === null) lng = s.rr_lon;
        if (lat === undefined || lat === null || lng === undefined || lng === null) continue;
        if (typeof lat !== 'number' || typeof lng !== 'number') continue;
        
        flights.push({
          id: s.hex || String(Math.random()),
          lat, lng, alt: typeof s.alt_baro === 'number' ? s.alt_baro : 0,
          country: s.flight ? s.flight.trim() : (s.r || 'Askeri/Özel'),
        });
      }
      useMetricsStore.getState().setFlights(flights);
    }
  } catch (e) { console.error('Uçuş Hatası:', e); }
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

// === HABERLER ===
export const fetchNews = async () => {
  try {
    const response = await fetch('/api/data/news');
    if (!response.ok) return;
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      // Her habere dünyanın farklı bölgelerinden koordinat ata
      const regions = [
        {lat: 48.8, lng: 2.3}, {lat: 40.7, lng: -74}, {lat: 35.6, lng: 139.7},
        {lat: -33.8, lng: 151.2}, {lat: 55.7, lng: 37.6}, {lat: 39.9, lng: 116.4},
        {lat: 28.6, lng: 77.2}, {lat: -22.9, lng: -43.2}, {lat: 30, lng: 31},
        {lat: 41, lng: 29}, {lat: 52.5, lng: 13.4}, {lat: 37.5, lng: 127},
        {lat: 19.4, lng: -99.1}, {lat: 1.3, lng: 103.8}, {lat: -1.2, lng: 36.8}
      ];
      const news: NewsEvent[] = data.map((art: any, i: number) => {
        const region = regions[i % regions.length];
        return {
          id: `news-${i}-${Date.now()}`, title: art.title, url: art.url || '',
          source: art.source || 'NY Times World', time: Date.now(),
          lat: region.lat + (Math.random() * 6 - 3), lng: region.lng + (Math.random() * 6 - 3)
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

// === UYDU YÖRÜNGE MOTORU ===
export const propagateSatellites = () => {
  const { satellites, setSatellites } = useMetricsStore.getState();
  if (!satellites.length) return;
  const now = new Date();
  const updated = satellites.map(s => {
    try {
      if (!s.tle1 || !s.tle2) return s;
      const satrec = satellite.twoline2satrec(s.tle1, s.tle2);
      const posVel = satellite.propagate(satrec, now);
      if (!posVel.position || typeof posVel.position === 'boolean') return s;
      const gmst = satellite.gstime(now);
      const posGd = satellite.eciToGeodetic(posVel.position as satellite.EciVec3<number>, gmst);
      return { ...s, lat: satellite.degreesLat(posGd.latitude), lng: satellite.degreesLong(posGd.longitude), alt: posGd.height / 6371 };
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
          // 5.000$ üstü işlemler (sık veri akışı)
          if (dollarValue > 5000) {
            const state = useMetricsStore.getState();
            const hubs = [{lat:40.7,lng:-74},{lat:51.5,lng:-0.1},{lat:35.6,lng:139},{lat:25.2,lng:55},{lat:41,lng:29},{lat:22.3,lng:114},{lat:1.3,lng:103.8}];
            const start = hubs[Math.floor(Math.random()*hubs.length)];
            let end = hubs[Math.floor(Math.random()*hubs.length)];
            while (end === start) end = hubs[Math.floor(Math.random()*hubs.length)];
            state.addCryptoWhale({
              id: `bn-${data.f}-${Math.random()}`, value: parseFloat(data.q),
              startLat: start.lat, startLng: start.lng, endLat: end.lat, endLng: end.lng,
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
  setInterval(fetchFlights, 10000);
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

