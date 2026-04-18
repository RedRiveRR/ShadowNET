import { useMetricsStore } from '../store/useMetricsStore';
import type { Earthquake, Flight, ISSData, Disaster, SecurityAlert, CryptoWhale, Satellite, NewsEvent, TorNode } from '../store/useMetricsStore';
import * as satellite from 'satellite.js';

// === DATA FETCHERS (V7 Clarity & Fix) ===

export const fetchEarthquakes = async () => {
  try {
    const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson');
    const data = await response.json();
    if (data.features) {
      const quakes = data.features.map((f: any) => ({
        id: f.id, 
        lat: f.geometry.coordinates[1], 
        lng: f.geometry.coordinates[0],
        mag: f.properties.mag, 
        title: f.properties.title, 
        time: f.properties.time,
      }));
      useMetricsStore.getState().setEarthquakes(quakes);
    }
  } catch (e) { console.error('Quake Error:', e); }
};

export const fetchFlights = async () => {
  try {
    const response = await fetch('/api/data/flights');
    if (!response.ok) return;
    const data = await response.json();
    if (data && data.ac) {
      // ADSB.lol Fix: COORDINATE MAPPING (Check multiple properties)
      const flights: Flight[] = data.ac
        .map((s: any) => {
          // Koordinatı lat/lon veya rr_lat/rr_lon veya lastPosition içinden çek
          let lat = s.lat;
          let lng = s.lon || s.lng;
          
          if (lat === undefined && s.rr_lat !== undefined) lat = s.rr_lat;
          if (lng === undefined && s.rr_lon !== undefined) lng = s.rr_lon;
          
          if (lat === undefined || lng === undefined) return null;

          return {
            id: s.hex || Math.random().toString(), 
            lat, lng, 
            alt: s.alt_baro || 0, 
            country: s.flight ? s.flight.trim() : 'Askeri/Özel',
          };
        })
        .filter(Boolean);
        
      useMetricsStore.getState().setFlights(flights);
    }
  } catch (e) { console.error('Flights Fix Error:', e); }
};

export const fetchSatellites = async () => {
  try {
    const response = await fetch('/api/data/satellites');
    if (!response.ok) return;
    const data = await response.json();
    if (Array.isArray(data)) {
      const sats: Satellite[] = data.map((s: any) => ({
        id: s.OBJECT_ID, name: s.OBJECT_NAME, tle1: s.TLE_LINE1, tle2: s.TLE_LINE2
      }));
      useMetricsStore.getState().setSatellites(sats);
    }
  } catch (e) {}
};

export const fetchNews = async () => {
  try {
    const response = await fetch('/api/data/news');
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        const news: NewsEvent[] = data.map((art: any, i: number) => ({
          id: `news-${i}`, title: art.title, url: art.url, source: art.source?.name || 'Reuters',
          time: Date.now(), lat: (Math.random() * 100) - 50, lng: (Math.random() * 260) - 130
        }));
        useMetricsStore.getState().setNewsEvents(news);
      }
    }
  } catch (e) {}
};

export const fetchTorNodes = async () => {
  try {
    const response = await fetch('/api/data/tor');
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        const nodes: TorNode[] = data.map((n: any) => ({
          id: n.fingerprint, nickname: n.nickname, lat: n.latitude, lng: n.longitude, country: n.country_name || 'Gizli'
        }));
        useMetricsStore.getState().setTorNodes(nodes);
      }
    }
  } catch (e) {}
};

export const fetchISS = async () => {
  try {
    const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
    const data = await res.json();
    useMetricsStore.getState().setISS({ lat: data.latitude, lng: data.longitude, velocity: data.velocity, altitude: data.altitude });
  } catch (e) {}
};

// --- ORBITAL MOTOR ---
export const propagateSatellites = () => {
  const { satellites, setSatellites } = useMetricsStore.getState();
  if (!satellites.length) return;
  const now = new Date();
  const updated = satellites.map(s => {
    try {
      const satrec = satellite.twoline2satrec(s.tle1, s.tle2);
      const posVel = satellite.propagate(satrec, now);
      const gmst = satellite.gstime(now);
      const posGd = satellite.eciToGeodetic(posVel.position as satellite.EciVec3<number>, gmst);
      return { ...s, lat: satellite.degreesLat(posGd.latitude), lng: satellite.degreesLong(posGd.longitude), alt: posGd.height / 6371 };
    } catch (e) { return s; }
  });
  setSatellites(updated);
};

// --- BOOTSTRAP ---
export const startDataStreams = () => {
  fetchEarthquakes(); fetchFlights(); fetchISS(); fetchSatellites(); fetchNews(); fetchTorNodes();
  setInterval(fetchEarthquakes, 60000);
  setInterval(fetchFlights, 10000);
  setInterval(fetchISS, 3000);
  setInterval(fetchSatellites, 300000); 
  setInterval(fetchNews, 60000);
  setInterval(fetchTorNodes, 120000);
  setInterval(propagateSatellites, 1000);
  setInterval(() => useMetricsStore.getState().clearOldCryptoWhales(), 1000);
};
