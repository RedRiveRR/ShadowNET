import { useMetricsStore, type Vessel } from '../store/useMetricsStore';

class AISService {
  private socket: WebSocket | null = null;
  private reconnectTimeout: any = null;

  start() {
    this.connect();
  }

  private connect() {
    if (this.socket) this.socket.close();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws/ais`;

    console.log(`[AIS] Connecting to ShadowNet AIS Relay: ${wsUrl}`);
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log('[AIS] Connected to relay. Sending subscription...');
      this.socket?.send(JSON.stringify({ 
        type: 'subscribe',
        boundingBoxes: [[[90, -180], [-90, 180]]] // Global
      }));
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.processAISMessage(data);
      } catch (e) {
        // Ignored
      }
    };

    this.socket.onclose = (event) => {
      console.warn(`[AIS] Connection closed. Code: ${event.code}, Reason: ${event.reason || 'None'}`);
      this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
    };

    this.socket.onerror = (err) => {
      console.error('[AIS] WebSocket Error Detected. Terminal check recommended.', err);
    };
  }

  private processAISMessage(msg: any) {
    if (msg.MessageType === 'PositionReport') {
      const { Message, MetaData } = msg;
      if (!Message || !MetaData) return;

      const vessel: Vessel = {
        id: `vessel-${MetaData.MMSI}`,
        mmsi: MetaData.MMSI,
        name: MetaData.VesselName.trim() || `Vessel ${MetaData.MMSI}`,
        lat: MetaData.latitude,
        lng: MetaData.longitude,
        speed: Message.Sog || 0,
        course: Message.Cog || 0,
        type: 'General', // Simplified for now
        flag: 'Unknown',
        lastUpdate: Date.now()
      };

      this.updateStore(vessel);
    }
  }

  private updateStore(vessel: Vessel) {
    const { vessels, setVessels } = useMetricsStore.getState();
    const index = vessels.findIndex(v => v.id === vessel.id);
    
    if (index > -1) {
      const updated = [...vessels];
      updated[index] = { ...vessels[index], ...vessel };
      setVessels(updated);
    } else {
      // Limit total vessels to 200 for performance
      setVessels([...vessels.slice(-199), vessel]);
    }
  }

  stop() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.socket) this.socket.close();
  }
}

export const aisService = new AISService();
