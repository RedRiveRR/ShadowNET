import { useMetricsStore } from '../store/useMetricsStore';
import type { Flight, Satellite, NewsEvent, TorNode } from '../store/useMetricsStore';
import type { IntelArticle } from '../store/useMetricsStore';
import { initMLWorker, analyzeIntelSentiment } from './ml-manager';
import { aisService } from './ais-service';
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
      remainingCredits: remainingCredits !== undefined ? remainingCredits : currentStatus.remainingCredits,
      currentBounds: currentStatus.currentBounds
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

// === GDELT İSTİHBARAT VERİSİ ===
export const fetchIntelEvents = async () => {
  try {
    const response = await fetch('/api/data/intel');
    if (response.ok) {
      const data = await response.json();
      const articleMap = new Map<string, IntelArticle>();

      if (data.topics && Array.isArray(data.topics)) {
        // V10.2: Genişletilmiş ve Dengelenmiş Konu Önceliği
        const priorityOrder = [
          'cyber', 'nuclear', 'sanctions', 'terrorism', 
          'geopolitics', 'military', 'maritime', 'intelligence', 
          'conflict', 'diplomacy'
        ];
        
        const sortedTopics = [...data.topics].sort((a, b) => {
          const indexA = priorityOrder.indexOf(a.id);
          const indexB = priorityOrder.indexOf(b.id);
          return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
        });

        for (const topic of sortedTopics) {
          if (topic.articles && Array.isArray(topic.articles)) {
            for (const article of topic.articles) {
              const rawTitle = article.title || '';
              const rawUrl = article.url || '';
              
              const cleanTitle = rawTitle.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 100);
              const cleanUrl = rawUrl.toLowerCase().split('?')[0].replace(/\/$/, '');
              
              const uniqueKey = cleanUrl || cleanTitle;
              if (!uniqueKey || articleMap.has(uniqueKey)) continue;

              const GEO = {
                'iran':[32.4279,53.688],'israel':[31.0461,34.8516],'gaza':[31.3268,34.3015],
                'palestine':[31.9522,35.2332],'russia':[61.524,105.3188],'ukraine':[48.3794,31.1656],
                'moscow':[55.7558,37.6173],'kyiv':[50.4501,30.5234],'taiwan':[23.6978,120.9605],
                'china':[35.8617,104.1954],'beijing':[39.9042,116.4074],'usa':[37.0902,-95.7129],
                'washington':[38.9072,-77.0369],'syria':[34.8021,38.9968],'yemen':[15.5527,48.5164],
                'lebanon':[33.8547,35.8623],'korea':[37.665,127.0264],'japan':[36.2048,138.2529],
                'germany':[51.1657,10.4515],'france':[46.2276,2.2137],'uk':[55.3781,-3.436],
                'london':[51.5074,-0.1278],'turkey':[38.9637,35.2433],'egypt':[26.8206,30.8025],
                'india':[20.5937,78.9629],'pakistan':[30.3753,69.3451],'afghanistan':[33.9391,67.7099],
                'africa':[8.7832,34.5085], 'europe':[54.5260,15.2551], 'nato':[50.8503,4.3517],
                'us':[37.0902,-95.7129], 'iraq':[33.2232,43.6793]
              };
              let finalLat, finalLng;
              const searchTitle = rawTitle.toLowerCase();
              const searchUrl = cleanUrl;
              for(const [k, v] of Object.entries(GEO)) {
                // Word boundary check to avoid "house" matching "us"
                const regex = new RegExp(`\\b${k}\\b`, 'i');
                if(regex.test(searchTitle) || searchUrl.includes(k)) {
                  finalLat = v[0]; finalLng = v[1]; break;
                }
              }

              articleMap.set(uniqueKey, {
                id: `intel-${btoa(encodeURIComponent(uniqueKey)).slice(0, 16)}`,
                topicId: topic.id,
                title: rawTitle.trim(),
                url: rawUrl,
                source: article.source || '',
                date: article.date || '',
                tone: article.tone || 0,
                ...(finalLat ? {lat: finalLat, lng: finalLng} : {})
              });
            }
          }
        }
      }

      const allArticles = Array.from(articleMap.values());
      useMetricsStore.getState().setIntelEvents(allArticles);
      
      if (allArticles.length === 0) {
        console.warn('[Intel] 0 makale alındı. Ağ hatası olabilir, 15 saniye sonra tekrar deneniyor...');
        setTimeout(fetchIntelEvents, 15000);
        return;
      }

      console.log(`[Intel] ${allArticles.length} özgün makale yüklendi, AI analizine gönderiliyor...`);

      // Yapay Zeka Duygu Analizi ve Konumlandırma (Harita uyarıları için gerekli)
      if (allArticles.length > 0) {
        analyzeIntelSentiment(allArticles).catch((e) =>
          console.warn('[Intel] AI analiz hatası:', e)
        );
      }
    } else {
      console.warn('[Intel] Proxy geçersiz veri döndürdü, 15 saniye sonra tekrar denenecek...');
      setTimeout(fetchIntelEvents, 15000);
    }
  } catch (e) {
    console.error('[Intel] GDELT/Proxy Hatası:', e);
    setTimeout(fetchIntelEvents, 15000);
  }
};

// === SİSTEM KONTROL VE REBOOT ===
let activeIntervals: number[] = [];

export const stopDataStreams = () => {
  activeIntervals.forEach(clearInterval);
  activeIntervals = [];
  aisService.stop();
  if (binanceWs) {
    binanceWs.close();
    binanceWs = null;
  }
  console.log('[System] Veri akışları durduruldu.');
};

export const rebootSystem = async () => {
  console.log('[System] Taktiksel Reboot başlatılıyor...');
  
  // 1. Akışları Durdur
  stopDataStreams();
  
  // 2. State Temizle
  useMetricsStore.getState().resetStore();
  
  // 3. AI Motorunu Kapat
  const { terminateMLWorker } = await import('./ml-manager');
  terminateMLWorker();
  
  // 4. Yeniden Başlat
  setTimeout(() => {
    startDataStreams();
    console.log('[System] Reboot tamamlandı. Sistem NOMINAL.');
  }, 1000);
};

// === SİSTEM BAŞLATICI ===
export const startDataStreams = () => {
  // Mevcut akışlar varsa temizle (Double-start önlemi)
  stopDataStreams();

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
  aisService.start();

  activeIntervals.push(window.setInterval(fetchEarthquakes, 60000));
  activeIntervals.push(window.setInterval(() => {
    const bounds = useMetricsStore.getState().apiStatus.currentBounds;
    fetchFlights(bounds || undefined);
  }, 10000));
  activeIntervals.push(window.setInterval(fetchISS, 3000));
  activeIntervals.push(window.setInterval(fetchSatellites, 300000));
  activeIntervals.push(window.setInterval(fetchNews, 120000));
  activeIntervals.push(window.setInterval(fetchTorNodes, 120000));
  activeIntervals.push(window.setInterval(fetchNVD, 90000));
  activeIntervals.push(window.setInterval(fetchOTX, 60000));
  activeIntervals.push(window.setInterval(fetchRadar, 120000));
  activeIntervals.push(window.setInterval(propagateSatellites, 2000));
  activeIntervals.push(window.setInterval(() => useMetricsStore.getState().clearOldCryptoWhales(), 5000));
  
  activeIntervals.push(window.setInterval(() => {
    if (!binanceWs || binanceWs.readyState === WebSocket.CLOSED) connectCryptoWebSocket();
  }, 5000));

  initMLWorker();
  fetchIntelEvents();
  activeIntervals.push(window.setInterval(fetchIntelEvents, 900000));
};

