import { useMetricsStore, type Vessel } from '../store/useMetricsStore';

class AISService {
  private socket: WebSocket | null = null;
  private reconnectTimeout: any = null;
  private vesselCache = new Map<string, Vessel>();
  private flushInterval: any = null;

  start() {
    this.connect();
    this.startFlushInterval();
  }

  private startFlushInterval() {
    if (this.flushInterval) clearInterval(this.flushInterval);
    
    // Flush updates to store every 1000ms to prevent flickering
    this.flushInterval = setInterval(() => {
      this.flushBuffer();
    }, 1000);
  }

  private flushBuffer() {
    const { setVessels } = useMetricsStore.getState();
    const now = Date.now();
    const TTL_MS = 10 * 60 * 1000; // 10 minutes

    // 1. Cleanup stale vessels from cache
    for (const [id, v] of this.vesselCache.entries()) {
      if (now - v.lastUpdate > TTL_MS) {
        this.vesselCache.delete(id);
      }
    }

    // 2. Conver Map to Array and Limit if needed (up to 2000 for stability)
    const updatedArray = Array.from(this.vesselCache.values())
      .sort((a, b) => b.lastUpdate - a.lastUpdate)
      .slice(0, 2000);

    // 3. Update store only if count or data significant (or just do it every sec)
    setVessels(updatedArray);
  }

  private connect() {
    if (this.socket) this.socket.close();

    const isProd = import.meta.env.PROD;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = isProd 
      ? `${protocol}//${window.location.host}/api/ws/ais`
      : `ws://${window.location.hostname}:8080/api/ws/ais`;

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
        if (!Message?.PositionReport || !MetaData) return;

        const pos = Message.PositionReport;
        const vessel: Vessel = {
          id: `vessel-${MetaData.MMSI}`,
          mmsi: MetaData.MMSI,
          name: (MetaData.ShipName || '').trim() || `Vessel ${MetaData.MMSI}`,
          lat: MetaData.latitude || pos.Latitude,
          lng: MetaData.longitude || pos.Longitude,
          speed: pos.Sog || 0,
          course: pos.Cog || 0,
          type: 'General', 
          flag: (MetaData.Flag || 'Unknown'),
          lastUpdate: Date.now()
        };

        if (isNaN(vessel.lat) || isNaN(vessel.lng)) return;

      // Update internal cache only, don't trigger store/react yet
      this.vesselCache.set(vessel.id, vessel);
    }
  }

  stop() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.flushInterval) clearInterval(this.flushInterval);
    if (this.socket) this.socket.close();
  }
}

export const aisService = new AISService();
