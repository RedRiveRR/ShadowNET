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
  type: string; // EQ (Earthquake), TC (Tropical Cyclone), FL (Flood)...
  alertLevel: string; // Green, Orange, Red
  time: number;
}

export interface SecurityAlert {
  id: string;
  type: 'CVE' | 'OSINT' | 'BGP' | 'CRYPTO' | 'OTX';
  title: string;
  severity: string; // HIGH, CRITICAL, INFO
  time: number;
}

interface MetricsState {
  earthquakes: Earthquake[];
  flights: Flight[];
  cryptoWhales: CryptoWhale[];
  iss: ISSData | null;
  disasters: Disaster[];
  securityAlerts: SecurityAlert[];
  
  setEarthquakes: (quakes: Earthquake[]) => void;
  setFlights: (flights: Flight[]) => void;
  
  addCryptoWhale: (whale: CryptoWhale) => void;
  clearOldCryptoWhales: () => void;
  
  setISS: (iss: ISSData) => void;
  setDisasters: (disasters: Disaster[]) => void;
  addSecurityAlert: (alert: SecurityAlert) => void;
}

export const useMetricsStore = create<MetricsState>((set) => ({
  earthquakes: [],
  flights: [],
  cryptoWhales: [],
  iss: null,
  disasters: [],
  securityAlerts: [],
  
  setEarthquakes: (quakes) => set({ earthquakes: quakes }),
  setFlights: (flights) => set({ flights }),
    
  addCryptoWhale: (whale) =>
    set((state) => ({
      cryptoWhales: [...state.cryptoWhales.slice(-19), whale],
    })),
  clearOldCryptoWhales: () =>
    set((state) => {
      const now = Date.now();
      return {
        cryptoWhales: state.cryptoWhales.filter((w) => now - w.time < 8000),
      };
    }),
    
  setISS: (iss) => set({ iss }),
  setDisasters: (disasters) => set({ disasters }),
  addSecurityAlert: (alert) =>
    set((state) => ({
      // keep max 20 latest security/osint alerts
      securityAlerts: [alert, ...state.securityAlerts].slice(0, 20),
    })),
}));
