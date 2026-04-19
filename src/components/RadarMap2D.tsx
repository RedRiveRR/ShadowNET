import { useEffect, useRef, useState, useCallback } from 'react';
import { useMetricsStore } from '../store/useMetricsStore';
import { X, List } from 'lucide-react';

// === OTONOM SİBER & İSTİHBARAT SÖZLÜĞÜ (AI RSS SCANNER) ===
const CONFLICT_KEYWORDS = ["war", "strike", "attack", "conflict", "clash", "missile", "drone", "killed", "troops", "invasion", "military", "fire", "assassination", "bombbardment"];
const COUNTRY_TO_ISO: Record<string, string> = {
  "ukraine": "UKR", "russia": "RUS", "israel": "ISR", "lebanon": "LBN",
  "palestine": "PSE", "gaza": "PSE", "iran": "IRN", "syria": "SYR",
  "yemen": "YEM", "sudan": "SDN", "myanmar": "MMR", "taiwan": "TWN",
  "somalia": "SOM", "haiti": "HTI", "mali": "MLI"
};

interface ConflictInfo {
  iso: string;
  countryName: string;
  news: { title: string; desc: string; link: string; date: string }[];
}

// === DEAD RECKONING (HAYALET İZ SİSTEMİ) ===
interface GhostFlight {
  id: string;
  lat: number;       // Görsel pozisyon (ekranda çizilen)
  lng: number;       // Görsel pozisyon (ekranda çizilen)
  targetLat: number; // API'den gelen son gerçek pozisyon
  targetLng: number; // API'den gelen son gerçek pozisyon
  heading: number;
  speed: number; // kt
  velocity_m_s: number;
  callsign: string;
  alt: number;
  type?: string;
  lastSeen: number;
  isGhost: boolean;
}

const GHOST_LIFETIME_MS = 10 * 60 * 1000; // 10 dakika - Haritadan tamamen silinme süresi
const LIVE_TIMEOUT_MS = 6 * 60 * 1000;   // 6 dakika (4 x 90s Scan) - Hayalet moduna geçiş süresi

export default function RadarMap2D() {

  const { flights, selectedFlight, setSelectedFlight, apiStatus } = useMetricsStore();
  const lastUpdateRef = useRef<number>(Date.now());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  const [geoData, setGeoData] = useState<any>(null);
  const [conflictData, setConflictData] = useState<Record<string, ConflictInfo>>({});
  const [selectedConflict, setSelectedConflict] = useState<ConflictInfo | null>(null);
  
  const conflictIsos = Object.keys(conflictData);

  // Dead Reckoning Motor Durumu
  const ghostMapRef = useRef(new Map<string, GhostFlight>());

  useEffect(() => {
    // 1. Kusursuz GeoJSON Harita Altlığı
    fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json')
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(err => console.error("GeoJSON Map Error:", err));

    // 2. Otonom Haber & Tehdit Algılayıcı Ağ (BBC World RSS AI)
    const fetchNews = async () => {
      const fallbackConflicts: Record<string, ConflictInfo> = {
        'UKR': { iso: 'UKR', countryName: 'UKRAINE', news: [{ title: 'Active War Zone: Ukraine', desc: 'Ongoing high-intensity kinetic conflict and airspace restrictions.', link: '#', date: new Date().toISOString() }] },
        'ISR': { iso: 'ISR', countryName: 'ISRAEL', news: [{ title: 'Active Combat Ops: Israel', desc: 'Military operations and restricted airspace over affected regions.', link: '#', date: new Date().toISOString() }] },
        'LBN': { iso: 'LBN', countryName: 'LEBANON', news: [{ title: 'Border Hostilities', desc: 'Active security alerts and skirmishes.', link: '#', date: new Date().toISOString() }] },
        'PSE': { iso: 'PSE', countryName: 'PALESTINE', news: [{ title: 'Gaza Crisis', desc: 'Ongoing conflict and severe humanitarian emergency.', link: '#', date: new Date().toISOString() }] },
        'IRN': { iso: 'IRN', countryName: 'IRAN', news: [{ title: 'Regional Tensions', desc: 'Heightened military readiness and airspace monitoring.', link: '#', date: new Date().toISOString() }] },
        'RUS': { iso: 'RUS', countryName: 'RUSSIA', news: [{ title: 'Restricted Airspace', desc: 'Western flight bans and military operations.', link: '#', date: new Date().toISOString() }] },
        'YEM': { iso: 'YEM', countryName: 'YEMEN', news: [{ title: 'Red Sea Hostilities', desc: 'Naval disruptions and drone activity.', link: '#', date: new Date().toISOString() }] },
        'SDN': { iso: 'SDN', countryName: 'SUDAN', news: [{ title: 'Civil War', desc: 'Intense factional fighting and comprehensive airspace closure.', link: '#', date: new Date().toISOString() }] },
        'SYR': { iso: 'SYR', countryName: 'SYRIA', news: [{ title: 'Active Conflict', desc: 'Multiple faction combat operations and unstable control.', link: '#', date: new Date().toISOString() }] }
      };

      try {
        const rssUrl = "https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Ffeeds.bbci.co.uk%2Fnews%2Fworld%2Frss.xml";
        const res = await fetch(rssUrl);
        const data = await res.json();
        
        const activeMap = { ...fallbackConflicts };
        
        data.items?.forEach((item: any) => {
          const text = (item.title + " " + item.description).toLowerCase();
          const hasConflictKeyword = CONFLICT_KEYWORDS.some(kw => text.includes(kw));
          
          if (hasConflictKeyword) {
            Object.entries(COUNTRY_TO_ISO).forEach(([country, iso]) => {
              if (text.includes(country)) {
                if (!activeMap[iso]) {
                  activeMap[iso] = { iso, countryName: country.toUpperCase(), news: [] };
                }
                if (!activeMap[iso].news.find((n: any) => n.title === item.title)) {
                  activeMap[iso].news.push({ title: item.title, desc: item.description, link: item.link, date: item.pubDate });
                }
              }
            });
          }
        });
        
        setConflictData(activeMap);
      } catch (err) {
        console.error("RSS AI Scanner Error:", err);
        setConflictData(fallbackConflicts);
      }
    };
    fetchNews();
  }, []);

  // Canvas ve SVG Referansları
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapGroupRef = useRef<SVGGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const containerDims = useRef({ width: window.innerWidth, height: window.innerHeight });
  
  // Pan-Zoom Referansları
  const initialK = 10;
  const initCyprusX = (34 + 180) * (window.innerWidth / 360);
  const initCyprusY = (90 - 35) * (window.innerHeight / 180);
  const transformRef = useRef({ 
    x: window.innerWidth / 2 - (initCyprusX * initialK), 
    y: window.innerHeight / 2 - (initCyprusY * initialK), 
    k: initialK 
  });
  const isDragging = useRef(false);
  const startDrag = useRef({ x: 0, y: 0 });
  const dragDistance = useRef(0);

  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    
    // Container boyutunu izle (sidebar açık/kapalı durumunu takip eder)
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerDims.current = { width: entry.contentRect.width, height: entry.contentRect.height };
        // Canvas piksel buffer'ını da güncelle
        if (canvasRef.current) {
          canvasRef.current.width = entry.contentRect.width;
          canvasRef.current.height = entry.contentRect.height;
        }
      }
    });
    if (containerRef.current) ro.observe(containerRef.current);
    
    return () => { window.removeEventListener('resize', handleResize); ro.disconnect(); };
  }, []);

  // Sınır Çizgilerini Kontrol Eden Güvenlik (Boşluğa Düşmeyi Engeller)
  const clampTransform = () => {
    const t = transformRef.current;
    if (t.k < 1) t.k = 1;
    const minX = dimensions.width * (1 - t.k);
    const minY = dimensions.height * (1 - t.k);
    t.x = Math.max(minX, Math.min(0, t.x));
    t.y = Math.max(minY, Math.min(0, t.y));
    updateStoreBounds();
  };

  const updateStoreBounds = useCallback(() => {
    const t = transformRef.current;
    if (!t) return;

    // Screen corners to Lat/Lon
    const w = dimensions.width;
    const h = dimensions.height;

    const getCoord = (sx: number, sy: number) => {
      const lx = (sx - t.x) / t.k;
      const ly = (sy - t.y) / t.k;
      const lng = (lx / (w / 360)) - 180;
      const lat = 90 - (ly / (h / 180));
      return { lat, lng };
    };

    const topLeft = getCoord(0, 0);
    const bottomRight = getCoord(w, h);

    // Kredi tasarrufu için: Eğer zoom seviyesi çok düşükse (Global) bounds gönderme
    if (t.k < 2.5) {
      useMetricsStore.getState().setApiStatus({ ...apiStatus, currentBounds: null });
    } else {
      useMetricsStore.getState().setApiStatus({
        ...apiStatus,
        currentBounds: {
          lamin: Math.max(-90, bottomRight.lat),
          lomin: Math.max(-180, topLeft.lng),
          lamax: Math.min(90, topLeft.lat),
          lomax: Math.min(180, bottomRight.lng)
        }
      });
    }
  }, [dimensions, apiStatus]);

  // === NATIVE PAN & ZOOM LİSTENERLARI ===
  const onPointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    dragDistance.current = 0;
    startDrag.current = { x: e.clientX - transformRef.current.x, y: e.clientY - transformRef.current.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    dragDistance.current += Math.abs(e.movementX) + Math.abs(e.movementY);
    transformRef.current.x = e.clientX - startDrag.current.x;
    transformRef.current.y = e.clientY - startDrag.current.y;
    clampTransform();
  };
  
  const onPointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };

  const onWheel = (e: React.WheelEvent) => {
    const { clientX, clientY, deltaY } = e;
    const factor = deltaY > 0 ? 0.85 : 1.15;
    const t = transformRef.current;
    
    t.x = clientX - (clientX - t.x) * factor;
    t.y = clientY - (clientY - t.y) * factor;
    t.k = Math.max(1, Math.min(t.k * factor, 150));
    
    clampTransform();
  };

  // Canvas tıklama: En yakın uçağı bul
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (dragDistance.current > 5) return; // Sürükleme ise tıklama tetikleme
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const t = transformRef.current;
    
    let closestDist = 25; // Hitbox piksel yarıçapı
    let closestFlight: any = null;
    
    const ghostMap = ghostMapRef.current;
    for (const ghost of ghostMap.values()) {
      const localX = (ghost.lng + 180) * (containerDims.current.width / 360);
      const localY = (90 - ghost.lat) * (containerDims.current.height / 180);
      const screenX = localX * t.k + t.x;
      const screenY = localY * t.k + t.y;
      const dist = Math.hypot(screenX - clickX, screenY - clickY);
      if (dist < closestDist) {
        closestDist = dist;
        closestFlight = ghost;
      }
    }
    
    if (closestFlight) {
      // Store'daki flight objesini seç (eğer hala API'den geliyorsa)
      const storeFlights = useMetricsStore.getState().flights || [];
      const real = storeFlights.find(f => f.id === closestFlight.id);
      setSelectedFlight(real || {
        id: closestFlight.id,
        lat: closestFlight.lat,
        lng: closestFlight.lng,
        alt: closestFlight.alt,
        heading: closestFlight.heading,
        speed: closestFlight.speed,
        callsign: closestFlight.callsign,
        type: closestFlight.type || 'COMM',
        velocity_m_s: closestFlight.velocity_m_s
      });
    } else {
      setSelectedFlight(null);
    }
  }, [dimensions, setSelectedFlight]);

  // === 60 FPS CANVAS RENDER + DEAD RECKONING ENGINE ===
  useEffect(() => {
    let frameId: number;
    const animate = () => {
      const now = Date.now();
      const dt = now - lastUpdateRef.current;
      lastUpdateRef.current = now;

      // 1. SVG Harita Zoom/Pan uygula
      if (mapGroupRef.current) {
        const { x, y, k } = transformRef.current;
        mapGroupRef.current.setAttribute('transform', `translate(${x}, ${y}) scale(${k})`);
      }

      // 2. API uçaklarını Ghost Map'e yaz/güncelle
      const currentFlights = useMetricsStore.getState().flights || [];
      const ghostMap = ghostMapRef.current;
      const liveIds = new Set<string>();
      
      for (const sf of currentFlights) {
        liveIds.add(sf.id);
        const existing = ghostMap.get(sf.id);
        if (existing) {
          // API'den gelen hedef pozisyonu güncelle
          existing.targetLat = sf.lat;
          existing.targetLng = sf.lng;
          existing.heading = sf.heading || existing.heading;
          existing.speed = sf.speed || existing.speed;
          existing.velocity_m_s = sf.velocity_m_s || existing.velocity_m_s;
          existing.alt = sf.alt;
          existing.callsign = sf.callsign;
          existing.lastSeen = now;
          existing.isGhost = false;
        } else {
          ghostMap.set(sf.id, {
            id: sf.id,
            lat: sf.lat,
            lng: sf.lng,
            targetLat: sf.lat,
            targetLng: sf.lng,
            heading: sf.heading || 0,
            speed: sf.speed || 0,
            velocity_m_s: sf.velocity_m_s || 0,
            callsign: sf.callsign,
            alt: sf.alt,
            type: sf.type,
            lastSeen: now,
            isGhost: false
          });
        }
      }
      
      // Görsel pozisyonları güncelle (Smooth Lerp — doğrudan API konumuna akıcı geçiş)
      for (const [id, ghost] of ghostMap.entries()) {
        const timeSinceSeen = now - ghost.lastSeen;

        if (!liveIds.has(id)) {
          // Hemen ghost yapma, 4 tur (6 dk) bekle
          if (timeSinceSeen > LIVE_TIMEOUT_MS) {
            ghost.isGhost = true;
          }
          
          // 10 dakika sonunda tamamen sil
          if (timeSinceSeen > GHOST_LIFETIME_MS) {
            ghostMap.delete(id);
            continue;
          }
        } else {
          ghost.isGhost = false; // Veri geldiyse ghostluğu her zaman kaldır
        }
        
        // API konumuna doğru akıcı kayma (0.05/kare = ~1.5 saniyede %95 ulaşır)
        ghost.lat += (ghost.targetLat - ghost.lat) * 0.05;
        ghost.lng += (ghost.targetLng - ghost.lng) * 0.05;

        // Otonom İlerleme Motoru (Dead Reckoning - API verisi gelmediğinde veya Hayalet modda)
        // Bu motor, uçakların son hızı ve yönüne göre haritada yol almasını sağlar.
        if (ghost.isGhost || apiStatus.activeProvider.includes('SIMULATED')) {
          const metersPerSec = ghost.velocity_m_s || (ghost.speed * 0.5144);
          const distMeters = metersPerSec * (dt / 1000); 
          
          const deltaLat = (distMeters / 111111) * Math.cos(ghost.heading * Math.PI / 180);
          const deltaLng = (distMeters / (111111 * Math.cos(ghost.lat * Math.PI / 180))) * Math.sin(ghost.heading * Math.PI / 180);
          
          ghost.lat += deltaLat;
          ghost.lng += deltaLng;
          // Hedefi de kaydır ki titreme yapmasın
          ghost.targetLat += deltaLat;
          ghost.targetLng += deltaLng;
        }
      }

      // 3. Canvas Render (10.000+ uçak tek drawCall farkıyla tereyağı gibi)
      const canvas = canvasRef.current;
      if (!canvas) { frameId = requestAnimationFrame(animate); return; }
      const ctx = canvas.getContext('2d');
      if (!ctx) { frameId = requestAnimationFrame(animate); return; }
      
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      
      const t = transformRef.current;
      const selectedId = useMetricsStore.getState().selectedFlight?.id;
      // Koordinat hesabında gerçek container boyutunu kullan (SVG ile eşleşsin)
      const cW = containerDims.current.width;
      const cH = containerDims.current.height;

      for (const ghost of ghostMap.values()) {
        const localX = (ghost.lng + 180) * (cW / 360);
        const localY = (90 - ghost.lat) * (cH / 180);
        const screenX = localX * t.k + t.x;
        const screenY = localY * t.k + t.y;

        // Frustum Culling (ekran dışını çizme)
        if (screenX < -20 || screenX > W + 20 || screenY < -20 || screenY > H + 20) continue;

        const isSelected = ghost.id === selectedId;
        const opacity = ghost.isGhost ? Math.max(0.15, 1 - ((now - ghost.lastSeen) / GHOST_LIFETIME_MS)) : 1;

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate((ghost.heading || 0) * Math.PI / 180);
        ctx.globalAlpha = opacity;

        // Uçak şekli (üçgen ok)
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(-5, 5);
        ctx.lineTo(0, 2);
        ctx.lineTo(5, 5);
        ctx.closePath();

        if (isSelected) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 8;
        } else if (ghost.isGhost) {
          ctx.fillStyle = '#94a3b8'; // Hayalet: Gri
        } else {
          ctx.fillStyle = '#facc15'; // Normal: Sarı
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();

        // Seçili uçak etiketi
        if (isSelected) {
          ctx.save();
          ctx.globalAlpha = opacity;
          ctx.font = 'bold 11px monospace';
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.fillText(ghost.callsign, screenX, screenY + 18);
          ctx.font = '9px monospace';
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.fillText(`${Math.round(ghost.alt / 100)}FL · ${Math.round(ghost.speed)}kt`, screenX, screenY + 28);
          if (ghost.isGhost) {
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 9px monospace';
            ctx.fillText('⚠️ GHOST TRACK', screenX, screenY + 38);
            
            // Simüle edilmiş bir "parazit" çizgisi ekle
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(screenX - 15, screenY + 42);
            ctx.lineTo(screenX + 15, screenY + 42);
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [dimensions]);

  const getCoords = (lat: number, lng: number) => {
    const cW = containerDims.current.width;
    const cH = containerDims.current.height;
    const x = (lng + 180) * (cW / 360);
    const y = (90 - lat) * (cH / 180);
    return { x, y };
  };

  const createPathStr = (rings: number[][][]) => {
    return rings.map(ring => {
      return "M " + ring.map(coord => {
        const pt = getCoords(coord[1], coord[0]);
        return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      }).join(' L ') + " Z";
    }).join(' ');
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#020617', overflow: 'hidden', display: 'flex' }}>
      
      {/* ANA RADAR EKRANI */}
      <div 
        ref={containerRef}
        style={{ flex: 1, position: 'relative', cursor: isDragging.current ? 'grabbing' : 'crosshair' }}
      >
        {/* Taktik Veri Stream HUD (Quad-Source Status) */}
        <div style={{ 
          position: 'absolute', 
          bottom: '120px', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          zIndex: 999, 
          display: 'flex', 
          gap: '12px',
          background: apiStatus.activeProvider.includes('SIMULATED') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(15,23,42,0.85)',
          padding: '8px 20px',
          borderRadius: '100px',
          border: `1px solid ${apiStatus.activeProvider.includes('SIMULATED') ? '#ef4444' : 'rgba(56, 189, 248, 0.3)'}`,
          backdropFilter: 'blur(10px)',
          boxShadow: '0 0 30px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          transition: 'all 0.5s ease'
        }}>
          {apiStatus.providers.map((p, idx) => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: p.status === 'WAIT' ? 0.3 : 1 }}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: p.status === 'OK' ? '#22c55e' : p.status === 'ERR' ? '#ef4444' : '#64748b',
                boxShadow: p.status === 'OK' ? '0 0 10px #22c55e' : 'none',
                animation: p.name === apiStatus.activeProvider ? 'pulse 1.5s infinite' : 'none'
              }} />
              <span style={{ 
                color: p.name === apiStatus.activeProvider ? '#fff' : 'rgba(255,255,255,0.4)',
                fontWeight: p.name === apiStatus.activeProvider ? 'bold' : 'normal',
                letterSpacing: '0.5px'
              }}>
                {p.name}
              </span>
              {idx < apiStatus.providers.length - 1 && (
                <div style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.1)', marginLeft: '8px' }} />
              )}
            </div>
          ))}
          <div style={{ 
            marginLeft: '15px', 
            paddingLeft: '15px', 
            borderLeft: '1px solid rgba(255,255,255,0.2)', 
            color: apiStatus.activeProvider.includes('SIMULATED') ? '#ef4444' : apiStatus.activeProvider !== 'OPENSKY' ? '#facc15' : '#fff', 
            fontSize: '0.7rem',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              {apiStatus.activeProvider !== 'OPENSKY' && apiStatus.activeProvider !== 'INITIALIZING' && (
                <span style={{ 
                  background: apiStatus.activeProvider.includes('SIMULATED') ? '#ef4444' : '#facc15', 
                  color: '#000', 
                  padding: '2px 6px', 
                  borderRadius: '4px', 
                  fontSize: '0.6rem',
                  marginRight: '5px',
                  animation: 'pulse 1s infinite'
                }}>
                  {apiStatus.activeProvider.includes('SIMULATED') ? 'EMERGENCY' : 'BACKUP'}
                </span>
              )}
              {apiStatus.activeProvider.includes('ERROR') ? '⚠️ OFFLINE' : `📡 ${apiStatus.activeProvider}`}
            </div>
            
            {/* NEXT SCAN COUNTER */}
            <div style={{ fontSize: '0.6rem', color: '#38bdf8', marginTop: '2px', fontFamily: 'monospace' }}>
              SCAN CYCLE: 90s [LIVE]
            </div>

            {apiStatus.remainingCredits !== null && apiStatus.activeProvider === 'OPENSKY' && (
              <div style={{ fontSize: '0.6rem', color: '#22c55e', marginTop: '2px' }}>
                ⛽ CREDITS: {apiStatus.remainingCredits.toLocaleString()} / 4000
              </div>
            )}
          </div>
        </div>

        {/* CSS Animations (Global inject would be better but here for clarity) */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes sonarPing { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(3.5); opacity: 0; } }
          @keyframes slideRight { from { transform: translateX(-40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
          @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
        `}} />

        {/* CANVAS: Uçaklar burada çizilir (10.000+ uçak 0 kasma) */}
        <canvas
          ref={canvasRef}
          width={containerDims.current.width}
          height={containerDims.current.height}
          onClick={handleCanvasClick}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onWheel={onWheel}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', touchAction: 'none' }}
        />

        {/* SVG: Harita altlığı (Canvas'ın ÜSTÜNDE — ama sadece conflict pathlar tıklanabilir) */}
        <svg 
          width="100%" 
          height="100%" 
          style={{ position: 'absolute', top: 0, left: 0, touchAction: 'none', pointerEvents: 'none' }}
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(56, 189, 248, 0.05)" strokeWidth="0.5"/>
            </pattern>
            <pattern id="hatchRed" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(239, 68, 68, 0.4)" strokeWidth="2" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" pointerEvents="none" />

          <g ref={mapGroupRef}>
            <g>
              {geoData && geoData.features.map((feature: any, idx: number) => {
                let d = "";
                if (feature.geometry.type === 'Polygon') {
                  d = createPathStr(feature.geometry.coordinates);
                } else if (feature.geometry.type === 'MultiPolygon') {
                  d = feature.geometry.coordinates.map((polyRings: number[][][]) => createPathStr(polyRings)).join(' ');
                }
                if (!d) return null;

                const isConflict = conflictIsos.includes(feature.id);

                return (
                  <path
                    key={`${feature.id}-${idx}`}
                    d={d}
                    fill={isConflict ? "url(#hatchRed)" : "transparent"}
                    stroke={isConflict ? "#ef4444" : "rgba(56, 189, 248, 0.4)"}
                    strokeWidth={isConflict ? "1" : "0.5"}
                    opacity={isConflict ? 0.9 : 0.6}
                    style={{ pointerEvents: isConflict ? 'all' : 'none', cursor: isConflict ? 'crosshair' : 'default' }}
                    onPointerDown={(e) => {
                      if (isConflict) e.stopPropagation();
                    }}
                    onClick={(e) => {
                      if (isConflict) {
                        e.stopPropagation();
                        setSelectedConflict(conflictData[feature.id]);
                        setSelectedFlight(null);
                      }
                    }}
                  />
                );
              })}
            </g>
          </g>
        </svg>

        {/* Taktik Detay Kartı */}
        {selectedFlight && (
          <div style={{ position: 'absolute', bottom: '24px', left: '24px', background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(12px)', border: '1px solid #facc15', padding: '16px', borderRadius: '12px', minWidth: '300px', animation: 'slideUp 0.3s ease', zIndex: 10 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#facc15' }}>{selectedFlight.callsign}</div>
                <button onClick={() => setSelectedFlight(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={16}/></button>
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <Property label="ALTITUDE" value={`${selectedFlight.alt} FT`} />
                <Property label="SPEED" value={`${Math.round(selectedFlight.speed || 0)} KT`} />
                <Property label="HEADING" value={`${Math.round(selectedFlight.heading || 0)}°`} />
                <Property label="ICAO" value={selectedFlight.id.toUpperCase()} />
             </div>
             {/* Hayalet uyarısı */}
             {ghostMapRef.current.get(selectedFlight.id)?.isGhost && (
               <div style={{ marginTop: '10px', padding: '8px', background: 'rgba(239,68,68,0.15)', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', fontSize: '0.7rem', color: '#f87171', fontFamily: 'monospace', textAlign: 'center' }}>
                 ⚠ GHOST TRACK — RADAR SIGNAL LOST — DEAD RECKONING ACTIVE
               </div>
             )}
          </div>
        )}
      </div>

      {/* SAĞ LİSTE PANELİ */}
      {isSidebarOpen ? (
        <div style={{ width: '320px', background: 'rgba(15,23,42,0.95)', borderLeft: '1px solid rgba(56, 189, 248, 0.2)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(56, 189, 248, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8' }}>
              <List size={18} />
              <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>AS-TRACK</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ background: '#facc15', color: '#000', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                {(flights || []).length}
              </span>
              <button 
                onClick={() => setIsSidebarOpen(false)} 
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
            {(flights || []).slice(0, 60).map(f => (
              <div 
                key={f.id} 
                onClick={() => setSelectedFlight(f)}
                style={{ 
                  padding: '12px', 
                  borderRadius: '8px', 
                  background: selectedFlight?.id === f.id ? 'rgba(56,189,248,0.1)' : 'transparent',
                  border: selectedFlight?.id === f.id ? '1px solid rgba(56,189,248,0.3)' : '1px solid transparent',
                  cursor: 'pointer',
                  marginBottom: '4px',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', color: '#fff' }}>{f.callsign}</span>
                  <span style={{ color: '#facc15', fontSize: '0.8rem' }}>{Math.round(f.alt)} ft</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                  <span>{f.type}</span>
                  <span>{Math.round(f.speed || 0)} kt</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          style={{ position: 'absolute', top: '100px', right: '0', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(56, 189, 248, 0.4)', borderRight: 'none', borderRadius: '12px 0 0 12px', padding: '12px 8px', color: '#38bdf8', cursor: 'pointer', zIndex: 20, backdropFilter: 'blur(10px)', boxShadow: '-4px 0 15px rgba(0,0,0,0.5)' }}
        >
          <List size={20} />
        </button>
      )}

      {/* Savaş Bölgesi İstihbarat Terminali (Global & Targeted) */}
      <div style={{ 
        position: 'absolute', 
        bottom: '20px', 
        left: '20px', 
        width: '400px', 
        background: 'rgba(15,23,42,0.95)', 
        border: '1px solid rgba(239,68,68,0.5)', 
        borderRadius: '8px', 
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5), 0 0 15px rgba(239,68,68,0.2)', 
        backdropFilter: 'blur(12px)', 
        overflow: 'hidden', 
        zIndex: 100, 
        maxHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideRight 0.4s ease-out' 
      }}>
        <div style={{ background: 'rgba(239,68,68,0.15)', padding: '12px 16px', borderBottom: '1px solid rgba(239,68,68,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative', width: '8px', height: '8px' }}>
              <div style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', background: '#ef4444', animation: 'sonarPing 2s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
              <div style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', background: '#ef4444' }} />
            </div>
            <h3 style={{ color: '#f87171', fontFamily: 'monospace', fontWeight: 'bold', margin: 0, fontSize: '0.9rem', letterSpacing: '1px' }}>
              {selectedConflict ? `RESTRICTED: ${selectedConflict.countryName}` : 'GLOBAL INTELLIGENCE FEED'}
            </h3>
          </div>
          {selectedConflict && (
            <button onClick={() => setSelectedConflict(null)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center' }}>
              <X size={16} />
            </button>
          )}
        </div>
        
        <div className="custom-scrollbar" style={{ padding: '16px', overflowY: 'auto', flex: 1, pointerEvents: 'all' }}>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '4px', height: '4px', background: 'rgba(255,255,255,0.5)' }} /> 
            LATEST INTELLIGENCE INTERCEPTS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(() => {
              const dataToShow = selectedConflict ? [selectedConflict] : Object.values(conflictData).filter(c => c.news.length > 0);
              
              if (dataToShow.length === 0) {
                return (
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                    No live intercepts. Persisting baseline airspace restrictions.
                  </div>
                );
              }

              return dataToShow.map(c => (
                <div key={c.iso} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {!selectedConflict && (
                     <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 'bold', fontFamily: 'monospace' }}>
                       [{c.countryName}]
                     </div>
                  )}
                  {c.news.map((item, idx) => (
                    <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '6px', borderLeft: '2px solid rgba(239,68,68,0.5)' }}>
                      <a href={item.link} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: '600', textDecoration: 'none', display: 'block', marginBottom: '6px', lineHeight: '1.3' }}>
                        {item.title}
                      </a>
                      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
                        {item.desc}
                      </p>
                      <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: '8px', fontFamily: 'monospace' }}>
                         {new Date(item.date).toLocaleString()}
                      </div>
                    </div>
                  ))}
                  {!selectedConflict && <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', marginTop: '4px' }} />}
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

        {/* TACTICAL LEGEND (Sol Üst) */}
        <div style={{ 
          position: 'absolute', 
          top: '80px', 
          left: '20px', 
          zIndex: 1000, 
          padding: '12px', 
          background: 'rgba(15,23,42,0.9)', 
          border: '1px solid rgba(56, 189, 248, 0.3)', 
          borderRadius: '8px',
          backdropFilter: 'blur(12px)',
          fontFamily: 'monospace',
          fontSize: '0.65rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
          animation: 'slideRight 0.5s ease'
        }}>
          <div style={{ color: '#38bdf8', marginBottom: '8px', fontWeight: 'bold', borderBottom: '1px solid rgba(56, 189, 248, 0.1)', paddingBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Tactical Identifiers
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: '8px solid #facc15' }} />
              <span style={{ color: '#cbd5e1' }}>AERIAL ENTITY (LIVE)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: '8px solid #94a3b8', opacity: 0.6 }} />
              <span style={{ color: '#94a3b8' }}>GHOST TRACK (PREDICTED)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', boxShadow: '0 0 5px #22c55e' }} />
              <span style={{ color: '#cbd5e1' }}>VIP SOURCE ENCRYPTED</span>
            </div>
          </div>
        </div>


      <style>{`
        @keyframes slideRight { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes sonarPing { 75%, 100% { transform: scale(3); opacity: 0;} }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
      `}</style>
    </div>
  );
}

function Property({ label, value }: any) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '6px' }}>
      <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff' }}>{value}</div>
    </div>
  );
}
