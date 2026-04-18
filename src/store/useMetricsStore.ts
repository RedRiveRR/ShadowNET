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
  country: string;
}

export interface CryptoWhale {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
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
  
  setEarthquakes: (quakes: Earthquake[]) => void;
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
  
  setEarthquakes: (quakes) => set({ earthquakes: quakes }),
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
      securityAlerts: [alert, ...state.securityAlerts].slice(0, 30),
    })),

  setSatellites: (satellites) => set({ satellites }),
  setNewsEvents: (newsEvents) => set({ newsEvents }),
  setTorNodes: (torNodes) => set({ torNodes }),
}));
