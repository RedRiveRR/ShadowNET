import { create } from 'zustand';

export interface Earthquake {
  id: string;
  lat: number;
  lng: number;
  mag: number;
  title: string;
  time: number;
}

export interface Flight {
  id: string;
  lat: number;
  lng: number;
  alt: number;
  heading?: number; // track
  speed?: number;   // ground speed
  callsign: string;
  type?: string;    // aircraft type
  reg?: string;     // registration
  velocity_m_s?: number; // for interpolation
}

export interface CryptoWhale {
  id: string;
  value: number; // in BTC
  time: number;
  source?: string;
}

export interface ISSData {
  lat: number;
  lng: number;
  velocity: number; // km/h
  altitude: number; // km
}

export interface Disaster {
  id: string;
  lat: number;
  lng: number;
  title: string;
  type: string; 
  alertLevel: string; // Green, Orange, Red
  time: number;
}

export interface Satellite {
  id: string;
  name: string;
  tle1: string;
  tle2: string;
  lat?: number;
  lng?: number;
  alt?: number;
  noradId?: string;
  isPremium?: boolean;
  satrec?: any; // satellite.js satrec object for fast propagation
  velocityVec?: { x: number; y: number; z: number };
  path?: { lat: number; lng: number }[];
}

export interface NewsEvent {
  id: string;
  title: string;
  url: string;
  source: string;
  time: number;
  lat?: number;
  lng?: number;
}

export interface TorNode {
  id: string;
  nickname: string;
  lat: number;
  lng: number;
  country: string;
}

export interface SecurityAlert {
  id: string;
  type: 'CVE' | 'OSINT' | 'BGP' | 'CRYPTO' | 'OTX' | 'MALWARE' | 'BOTNET';
  title: string;
  severity: string;
  time: number;
  url?: string;
}

export interface ProviderStatus {
  name: string;
  status: 'OK' | 'ERR' | 'WAIT';
}

export interface IntelArticle {
  id: string;
  topicId: string;
  title: string;
  url: string;
  source: string;
  date: string;
  tone: number;
  sentimentScore?: number;  // AI tarafından atanan puan (0-1)
  sentimentLabel?: 'positive' | 'negative';  // AI etiketi
  lat?: number;
  lng?: number;
}

export interface ThreatAlert {
  id: string;
  title: string;
  topicId: string;
  severity: number;  // 0-1 arası AI güven skoru
  lat?: number;
  lng?: number;
  time: number;
}

export interface Vessel {
  id: string;
  mmsi: number;
  name: string;
  lat: number;
  lng: number;
  speed: number;
  course: number;
  type: string;
  flag: string;
  destination?: string;
  lastUpdate: number;
}

interface MetricsState {
  earthquakes: Earthquake[];
  flights: Flight[];
  cryptoWhales: CryptoWhale[];
  iss: ISSData | null;
  disasters: Disaster[];
  securityAlerts: SecurityAlert[];
  satellites: Satellite[];
  newsEvents: NewsEvent[];
  torNodes: TorNode[];
  selectedFlight: Flight | null;
  selectedSatellite: Satellite | null;
  selectedISS: boolean;
  activeView: 'GLOBE' | 'RADAR' | 'MARITIME';
  apiStatus: {
    activeProvider: string; // "OPENSKY", "ADSBFİ" vb.
    providers: ProviderStatus[];
    remainingCredits: number | null;
    currentBounds: { lamin: number; lomin: number; lamax: number; lomax: number } | null;
  };
  
  setEarthquakes: (quakes: Earthquake[]) => void;
  setActiveView: (view: 'GLOBE' | 'RADAR' | 'MARITIME') => void;
  setFlights: (flights: Flight[]) => void;
  setCryptoWhales: (whales: CryptoWhale[]) => void;
  addCryptoWhale: (whale: CryptoWhale) => void;
  clearOldCryptoWhales: () => void;
  setISS: (iss: ISSData) => void;
  setDisasters: (disasters: Disaster[]) => void;
  addSecurityAlert: (alert: SecurityAlert) => void;
  
  setSatellites: (sats: Satellite[]) => void;
  setNewsEvents: (news: NewsEvent[]) => void;
  setTorNodes: (nodes: TorNode[]) => void;
  setSelectedFlight: (flight: Flight | null) => void;
  setSelectedSatellite: (sat: Satellite | null) => void;
  setSelectedISS: (open: boolean) => void;
  setApiStatus: (status: MetricsState['apiStatus']) => void;

  // V9.0 Intel
  intelEvents: IntelArticle[];
  threatAlerts: ThreatAlert[];
  aiStatus: 'idle' | 'loading' | 'ready' | 'processing' | 'error';
  setIntelEvents: (events: IntelArticle[]) => void;
  addThreatAlert: (alert: ThreatAlert) => void;
  setAiStatus: (status: MetricsState['aiStatus']) => void;
  setIntelSentiment: (results: { articleId: string; label: string; score: number }[]) => void;

  // V10.0 Maritime
  vessels: Vessel[];
  selectedVessel: Vessel | null;
  setVessels: (vessels: Vessel[]) => void;
  setSelectedVessel: (vessel: Vessel | null) => void;
  resetStore: () => void;
}

export const useMetricsStore = create<MetricsState>((set) => ({
  earthquakes: [],
  flights: [],
  cryptoWhales: [],
  iss: null,
  disasters: [],
  securityAlerts: [],
  satellites: [],
  newsEvents: [],
  torNodes: [],
  selectedFlight: null,
  selectedSatellite: null,
  selectedISS: false,
  activeView: 'GLOBE',
  apiStatus: {
    activeProvider: 'INITIALIZING',
    providers: [
      { name: 'OPENSKY', status: 'WAIT' },
      { name: 'AIRPLANES', status: 'WAIT' },
      { name: 'ADSB.ONE', status: 'WAIT' }
    ],
    remainingCredits: 4000,
    currentBounds: null
  },
  
  setEarthquakes: (quakes) => set({ earthquakes: quakes }),
  setActiveView: (view) => set({ activeView: view }),
  setFlights: (flights) => set({ flights }),
  setCryptoWhales: (whales) => set({ cryptoWhales: whales }),
  addCryptoWhale: (whale) =>
    set((state) => ({
      cryptoWhales: [...state.cryptoWhales.slice(-39), whale],
    })),
  clearOldCryptoWhales: () =>
    set((state) => {
      const now = Date.now();
      return {
        cryptoWhales: state.cryptoWhales.filter((w) => now - w.time < 60000),
      };
    }),
    
  setISS: (iss) => set({ iss }),
  setDisasters: (disasters) => set({ disasters }),
  addSecurityAlert: (alert) =>
    set((state) => ({
      securityAlerts: [alert, ...state.securityAlerts].slice(0, 50),
    })),

  setSatellites: (satellites) => set({ satellites }),
  setNewsEvents: (newsEvents) => set({ newsEvents }),
  setTorNodes: (torNodes) => set({ torNodes }),
  setSelectedFlight: (flight) => set({ selectedFlight: flight }),
  setSelectedSatellite: (sat) => set({ selectedSatellite: sat }),
  setSelectedISS: (open) => set({ selectedISS: open }),
  setApiStatus: (status) => set({ apiStatus: status }),

  // V9.0 Intel
  intelEvents: [],
  threatAlerts: [],
  aiStatus: 'idle',
  setIntelEvents: (events) => set({ intelEvents: events }),
  addThreatAlert: (alert) =>
    set((state) => ({
      threatAlerts: [alert, ...state.threatAlerts].slice(0, 100),
    })),
  setAiStatus: (status) => set({ aiStatus: status }),
  setIntelSentiment: (results) => set((state) => ({
    intelEvents: state.intelEvents.map(event => {
      const result = results.find(r => r.articleId === event.id);
      if (result) {
        return { 
          ...event, 
          sentimentLabel: (result.label as 'positive' | 'negative') || 'negative', 
          sentimentScore: result.score 
        };
      }
      return event;
    }).slice(0, 300) // Ensure intel list doesn't bloat
  })),

  // V10.0 Maritime
  vessels: [],
  selectedVessel: null,
  setVessels: (vessels) => set({ vessels }),
  setSelectedVessel: (vessel) => set({ selectedVessel: vessel }),

  resetStore: () => set({
    earthquakes: [],
    flights: [],
    satellites: [],
    intelEvents: [],
    threatAlerts: [],
    vessels: [],
    cryptoWhales: [],
    aiStatus: 'loading',
    selectedFlight: null,
    selectedSatellite: null,
    selectedISS: false,
    selectedVessel: null
  }),
}));
