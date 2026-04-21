import { useEffect, useRef, useState, useCallback } from 'react';
import { useMetricsStore } from '../store/useMetricsStore';
import { X, Activity, List, ChevronLeft } from 'lucide-react';

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
  lat: number;
  lng: number;
  visualHeading: number; 
  targetLat: number;
  targetLng: number;
  heading: number;
  speed: number;
  velocity_m_s: number;
  callsign: string;
  alt: number;
  type?: string;
  lastSeen: number;
  isGhost: boolean;
}

const GHOST_LIFETIME_MS = 15 * 60 * 1000;
const LIVE_TIMEOUT_MS = 5 * 60 * 1000;

export default function RadarMap2D() {
  const flights = useMetricsStore(state => state.flights) || [];
  const selectedFlight = useMetricsStore(state => state.selectedFlight);
  const setSelectedFlight = useMetricsStore(state => state.setSelectedFlight);

  const lastUpdateRef = useRef<number>(Date.now());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFeedOpen, setIsFeedOpen] = useState(true);
  const [isLegendOpen, setIsLegendOpen] = useState(true);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  const [geoData, setGeoData] = useState<any>(null);
  const [conflictData, setConflictData] = useState<Record<string, ConflictInfo>>({});
  const [selectedConflict, setSelectedConflict] = useState<ConflictInfo | null>(null);
  
  const conflictIsos = Object.keys(conflictData);
  const ghostMapRef = useRef(new Map<string, GhostFlight>());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapGroupRef = useRef<SVGGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const containerDims = useRef({ width: window.innerWidth, height: window.innerHeight });
  
  // Pan-Zoom Referansları: CENTERED ON TURKEY (ANKARA)
  const initialK = 10;
  const initTurkeyX = (35 + 180) * (window.innerWidth / 360);
  const initTurkeyY = (90 - 39) * (window.innerHeight / 180);
  
  const transformRef = useRef({ 
    x: window.innerWidth / 2 - (initTurkeyX * initialK), 
    y: window.innerHeight / 2 - (initTurkeyY * initialK), 
    k: initialK 
  });
  const isDragging = useRef(false);
  const startDrag = useRef({ x: 0, y: 0 });
  const dragDistance = useRef(0);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json')
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(err => console.error("GeoJSON Map Error:", err));

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
                if (!activeMap[iso]) activeMap[iso] = { iso, countryName: country.toUpperCase(), news: [] };
                if (!activeMap[iso].news.find((n: any) => n.title === item.title)) {
                  activeMap[iso].news.push({ title: item.title, desc: item.description, link: item.link, date: item.pubDate });
                }
              }
            });
          }
        });
        setConflictData(activeMap);
      } catch (err) {
        setConflictData(fallbackConflicts);
      }
    };
    fetchNews();
  }, []);

  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerDims.current = { width: entry.contentRect.width, height: entry.contentRect.height };
        if (canvasRef.current) {
          canvasRef.current.width = entry.contentRect.width;
          canvasRef.current.height = entry.contentRect.height;
        }
      }
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => { window.removeEventListener('resize', handleResize); ro.disconnect(); };
  }, []);

  const clampTransform = () => {
    const t = transformRef.current;
    t.k = Math.max(1, Math.min(t.k, 150));
    const minX = dimensions.width * (1 - t.k);
    const minY = dimensions.height * (1 - t.k);
    t.x = Math.max(minX, Math.min(0, t.x));
    t.y = Math.max(minY, Math.min(0, t.y));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    dragDistance.current = 0;
    startDrag.current = { x: e.clientX - transformRef.current.x, y: e.clientY - transformRef.current.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    dragDistance.current += Math.abs(e.movementX) + Math.abs(e.movementY);
    transformRef.current.x = e.clientX - startDrag.current.x;
    transformRef.current.y = e.clientY - startDrag.current.y;
    clampTransform();
  };
  const onPointerUp = () => { isDragging.current = false; };
  const onWheel = (e: React.WheelEvent) => {
    const { clientX, clientY, deltaY } = e;
    const factor = deltaY > 0 ? 0.85 : 1.15;
    const t = transformRef.current;
    const newK = Math.max(1, Math.min(t.k * factor, 150));
    const ratio = newK / t.k;
    t.x = clientX - (clientX - t.x) * ratio;
    t.y = clientY - (clientY - t.y) * ratio;
    t.k = newK;
    clampTransform();
  };

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (dragDistance.current > 5) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const t = transformRef.current;
    let closestDist = 25;
    let closestFlight = null;
    for (const ghost of ghostMapRef.current.values()) {
      const localX = (ghost.lng + 180) * (containerDims.current.width / 360);
      const localY = (90 - ghost.lat) * (containerDims.current.height / 180);
      const screenX = localX * t.k + t.x;
      const screenY = localY * t.k + t.y;
      const dist = Math.hypot(screenX - clickX, screenY - clickY);
      if (dist < closestDist) { closestDist = dist; closestFlight = ghost; }
    }
    if (closestFlight) setSelectedFlight(closestFlight);
    else setSelectedFlight(null);
  }, [setSelectedFlight]);

  useEffect(() => {
    let frameId: number;
    let isMounted = true;
    const animate = () => {
      const now = Date.now();
      const dt = now - lastUpdateRef.current;
      lastUpdateRef.current = now;

      if (mapGroupRef.current) {
        const { x, y, k } = transformRef.current;
        mapGroupRef.current.setAttribute('transform', `translate(${x}, ${y}) scale(${k})`);
      }

      const currentFlights = useMetricsStore.getState().flights || [];
      const ghostMap = ghostMapRef.current;
      const liveIds = new Set(currentFlights.map(f => f.id));
      
      currentFlights.forEach(sf => {
        const x = ghostMap.get(sf.id);
        if (x) {
          x.targetLat = sf.lat; x.targetLng = sf.lng;
          x.heading = sf.heading || x.heading; x.speed = sf.speed || x.speed;
          x.velocity_m_s = sf.velocity_m_s || x.velocity_m_s; x.alt = sf.alt;
          x.lastSeen = now; x.isGhost = false;
        } else {
          ghostMap.set(sf.id, { 
            ...sf, 
            heading: sf.heading || 0,
            speed: sf.speed || 0,
            velocity_m_s: sf.velocity_m_s || 0,
            visualHeading: sf.heading || 0, 
            targetLat: sf.lat, 
            targetLng: sf.lng, 
            lastSeen: now, 
            isGhost: false 
          });
        }
      });

      for (const [id, g] of ghostMap.entries()) {
        const timeSinceSeen = now - g.lastSeen;
        if (!liveIds.has(id)) {
          if (timeSinceSeen > LIVE_TIMEOUT_MS) g.isGhost = true;
          if (timeSinceSeen > GHOST_LIFETIME_MS) { ghostMap.delete(id); continue; }
        }
        g.lat += (g.targetLat - g.lat) * 0.08;
        g.lng += (g.targetLng - g.lng) * 0.08;
        let diff = (g.heading - g.visualHeading + 180 + 360) % 360 - 180;
        g.visualHeading += diff * 0.1;

        if (g.isGhost || timeSinceSeen > 5000) {
           const mps = g.velocity_m_s || (g.speed * 0.5144);
           const dist = mps * (dt / 1000);
           g.targetLat += (dist / 111111) * Math.cos(g.visualHeading * Math.PI / 180);
           g.targetLng += (dist / (111111 * Math.cos(g.lat * Math.PI / 180))) * Math.sin(g.visualHeading * Math.PI / 180);
        }
      }

      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        const W = canvasRef.current?.width || 0;
        const H = canvasRef.current?.height || 0;
        ctx.clearRect(0,0,W,H);
        const t = transformRef.current;
        const sID = useMetricsStore.getState().selectedFlight?.id;
        const cW = containerDims.current.width;
        const cH = containerDims.current.height;

        for (const g of ghostMap.values()) {
          const sX = (g.lng + 180) * (cW / 360) * t.k + t.x;
          const sY = (90 - g.lat) * (cH / 180) * t.k + t.y;
          if (sX < -50 || sX > W + 50 || sY < -50 || sY > H + 50) continue;
          const isSel = g.id === sID;
          const op = g.isGhost ? Math.max(0.15, 1 - (now - g.lastSeen) / GHOST_LIFETIME_MS) : 1;

          ctx.save();
          ctx.translate(sX, sY);
          ctx.rotate(g.visualHeading * Math.PI / 180);
          ctx.globalAlpha = op;
          const scale = Math.max(0.3, Math.min(t.k / 12, 1.4));
          ctx.scale(scale, scale);
          ctx.beginPath();
          ctx.moveTo(0, -10); ctx.lineTo(1, -8); ctx.lineTo(1, -2); ctx.lineTo(8, 2); ctx.lineTo(8, 4); ctx.lineTo(1, 2); ctx.lineTo(1, 7); ctx.lineTo(3, 9); ctx.lineTo(3, 10); ctx.lineTo(0, 9); ctx.lineTo(-3, 10); ctx.lineTo(-3, 9); ctx.lineTo(-1, 7); ctx.lineTo(-1, 2); ctx.lineTo(-8, 4); ctx.lineTo(-8, 2); ctx.lineTo(-1, -2); ctx.lineTo(-1, -8); ctx.closePath();
          ctx.fillStyle = isSel ? '#fff' : g.isGhost ? '#64748b' : '#facc15';
          if (isSel) { ctx.shadowBlur = 10; ctx.shadowColor = '#fff'; }
          ctx.fill();
          ctx.restore();
          if (isSel || t.k > 15) {
            ctx.fillStyle = isSel ? '#fff' : 'rgba(250, 204, 21, 0.8)';
            ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
            ctx.fillText(g.callsign || 'UNK', sX, sY + 20);
          }
        }
      }
      if (isMounted) frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => { isMounted = false; cancelAnimationFrame(frameId); };
  }, [dimensions]);

  const getCoords = (lat: number, lng: number) => {
    const { width, height } = containerDims.current;
    return { x: (lng + 180) * (width / 360), y: (90 - lat) * (height / 180) };
  };
  const createPathStr = (rings: number[][][]) => rings.map(r => "M " + r.map(c => { const p = getCoords(c[1], c[0]); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' L ') + " Z").join(' ');

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#020617', overflow: 'hidden', display: 'flex' }}>
      <div ref={containerRef} style={{ flex: 1, position: 'relative', cursor: isDragging.current ? 'grabbing' : 'crosshair' }}
           onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onWheel={onWheel}>
        <canvas ref={canvasRef} onClick={handleCanvasClick} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
        <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
          <g ref={mapGroupRef}>
            {geoData?.features.map((f: any, i: number) => {
              let d = f.geometry.type === 'Polygon' ? createPathStr(f.geometry.coordinates) : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates.map((p: any) => createPathStr(p)).join(' ') : "";
              if (!d) return null;
              const isConf = conflictIsos.includes(f.id);
              return <path key={i} d={d} fill={isConf ? "rgba(239,68,68,0.2)" : "transparent"} stroke={isConf ? "#ef4444" : "rgba(56,189,248,0.2)"} strokeWidth={isConf ? 1 : 0.5} 
                           style={{ pointerEvents: isConf ? 'auto' : 'none' }} onClick={() => isConf && setSelectedConflict(conflictData[f.id])} />;
            })}
          </g>
        </svg>

        {selectedFlight && (
          <div style={{ position: 'absolute', top: '110px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(10,15,25,0.85)', backdropFilter: 'blur(20px)', border: '1px solid #facc15', padding: '16px 24px', borderRadius: '16px', minWidth: '400px', zIndex: 1000 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#facc15', fontFamily: 'Orbitron' }}>{selectedFlight.callsign}</div>
                <button onClick={() => setSelectedFlight(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={18}/></button>
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                <Property label="ALT" value={`${selectedFlight.alt} FT`} />
                <Property label="SPD" value={`${Math.round(selectedFlight.speed || 0)} KT`} />
                <Property label="HDG" value={`${Math.round(selectedFlight.heading || 0)}°`} />
                <Property label="ICAO" value={selectedFlight.id.toUpperCase()} />
             </div>
          </div>
        )}
      </div>

      {isSidebarOpen ? (
        <div style={{ width: '360px', background: 'rgba(10,15,25,0.85)', borderLeft: '1px solid rgba(56,189,248,0.2)', backdropFilter: 'blur(30px)', display: 'flex', flexDirection: 'column', zIndex: 100 }}>
          <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(56,189,248,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: '900', fontSize: '1.2rem', color: '#fff', fontFamily: 'Orbitron' }}>ACTIVE AIRCRAFT</span>
            <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={18}/></button>
          </div>
          <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
            {flights.slice(0, 80).map(f => (
              <div key={f.id} onClick={() => setSelectedFlight(f)} style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff' }}><b>{f.callsign}</b> <span>{Math.round(f.alt/100)}FL</span></div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <button onClick={() => setIsSidebarOpen(true)} style={{ position: 'absolute', top: '100px', right: '0', background: 'rgba(10,15,25,0.9)', padding: '16px 10px', color: '#38bdf8', cursor: 'pointer', zIndex: 100, borderRadius: '12px 0 0 12px', border: '1px solid rgba(56,189,248,0.3)' }}><List size={22} /></button>
      )}

      <div style={{ position: 'absolute', bottom: '24px', left: '24px', zIndex: 100 }}>
        {!isFeedOpen ? (
          <button onClick={() => setIsFeedOpen(true)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px 15px', color: '#ef4444', cursor: 'pointer' }}><Activity size={14} /> INTEL FEED</button>
        ) : (
          <div style={{ width: '420px', background: 'rgba(10,15,25,0.85)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '16px', backdropFilter: 'blur(30px)', overflow: 'hidden' }}>
            <div style={{ background: 'rgba(239,68,68,0.15)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', color: '#f87171' }}>
              <b>{selectedConflict ? selectedConflict.countryName : 'INTEL FEED'}</b>
              <button onClick={() => setIsFeedOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><ChevronLeft size={16}/></button>
            </div>
            <div className="custom-scrollbar" style={{ padding: '16px', maxHeight: '300px', overflowY: 'auto' }}>
              {(selectedConflict ? [selectedConflict] : Object.values(conflictData)).map(c => (
                <div key={c.iso}>
                  {c.news?.map((n: any, i: number) => (
                    <div key={i} style={{ padding: '8px', borderLeft: '2px solid #ef4444', marginBottom: '8px', background: 'rgba(255,255,255,0.02)' }}>
                      <a href={n.link} target="_blank" style={{ color: '#fff', fontSize: '0.8rem', textDecoration: 'none' }}>{n.title}</a>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', top: '80px', left: '20px', zIndex: 1000 }}>
        {!isLegendOpen ? (
          <button onClick={() => setIsLegendOpen(true)} style={{ background: 'rgba(15,23,42,0.9)', padding: '8px', color: '#38bdf8', cursor: 'pointer', borderRadius: '8px', border: '1px solid #38bdf8' }}><Activity size={16} /></button>
        ) : (
          <div style={{ padding: '12px', background: 'rgba(15,23,42,0.9)', border: '1px solid #38bdf8', borderRadius: '8px', position: 'relative' }}>
            <button onClick={() => setIsLegendOpen(false)} style={{ position: 'absolute', top: '5px', right: '5px', background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer' }}><X size={12}/></button>
              <div style={{ color: '#38bdf8', marginBottom: '10px', fontWeight: 'bold', borderBottom: '1px solid rgba(56, 189, 248, 0.2)', paddingBottom: '6px', textTransform: 'uppercase', letterSpacing: '1.5px', fontSize: '0.7rem' }}>
                System Identifiers
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <LegendItem color="#facc15" label="AERIAL ENTITY (LIVE)" type="triangle" />
                <LegendItem color="#a855f7" label="SATELLITE / ISS NODE" type="square" />
                <LegendItem color="#ec4899" label="ENCRYPTED TOR ENTRY" type="pulse" />
                <LegendItem color="#ef4444" label="KINETIC CONFLICT ZONE" type="hatch" />
                <LegendItem color="#f59e0b" label="SEISMIC EVENT (QUAKE)" type="circle" />
                <LegendItem color="#22d3ee" label="MARITIME ENTITY (AIS)" type="hull" />
                <LegendItem color="#fff" label="NEURAL LINK (CORRELATION)" type="mesh" />
                <LegendItem color="#fbbf24" label="WHALE TX DETECTED" type="diamond" />
              </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LegendItem({ color, label, type }: any) {
  const getMarker = () => {
    switch(type) {
      case 'triangle': return <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: `9px solid ${color}` }} />;
      case 'square': return <div style={{ width: '8px', height: '8px', border: `1px solid ${color}`, background: `${color}40` }} />;
      case 'pulse': return <div style={{ width: '8px', height: '8px', background: color, borderRadius: '50%', boxShadow: `0 0 10px ${color}`, animation: 'pulse 1s infinite' }} />;
      case 'hatch': return <div style={{ width: '10px', height: '10px', background: `repeating-linear-gradient(45deg, ${color}20, ${color}20 2px, ${color}60 2px, ${color}60 4px)` }} />;
      case 'circle': return <div style={{ width: '8px', height: '8px', background: color, borderRadius: '50%' }} />;
      case 'hull': return <div style={{ width: '6px', height: '10px', background: color, borderRadius: '40% 40% 10% 10%' }} />;
      case 'mesh': return <div style={{ width: '10px', height: '10px', border: `1px solid ${color}`, borderRadius: '2px', opacity: 0.8 }} />;
      case 'diamond': return <div style={{ width: '7px', height: '7px', background: color, transform: 'rotate(45deg)', boxShadow: `0 0 8px ${color}` }} />;
      default: return <div style={{ width: '8px', height: '8px', background: color }} />;
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ width: '16px', display: 'flex', justifyContent: 'center' }}>{getMarker()}</div>
      <span style={{ color: '#cbd5e1', fontSize: '0.6rem', fontWeight: '500', letterSpacing: '0.5px' }}>{label}</span>
    </div>
  );
}

function Property({ label, value }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>{label}</div>
      <div style={{ fontSize: '0.95rem', fontWeight: '900', color: '#fff', fontFamily: 'Orbitron' }}>{value}</div>
    </div>
  );
}
