import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useMetricsStore, type Vessel } from '../store/useMetricsStore';
import { Ship, X, Anchor, Navigation } from 'lucide-react';

// === GHOST ENGINE INTERFACE ===
interface GhostVessel extends Vessel {
  visualLat: number;
  visualLng: number;
  targetLat: number;
  targetLng: number;
  isGhost: boolean;
  lastSeen: number;
}

const GHOST_TURNOFF_MS = 5 * 60 * 1000; // 5 min total disappearance
const STALE_THRESHOLD_MS = 30 * 1000;  // 30 sec to become "ghost" visual

// === TACTICAL INTELLIGENCE ===
const DANGER_ZONES = [
    { name: 'RED SEA / BAB-EL-MANDEB', bounds: { minLat: 10, maxLat: 28, minLng: 32, maxLng: 52 }, severity: 'HIGH' },
    { name: 'BLACK SEA / CRIMEA', bounds: { minLat: 39, maxLat: 48, minLng: 27, maxLng: 42 }, severity: 'CRITICAL' },
    { name: 'SOUTH CHINA SEA', bounds: { minLat: -4, maxLat: 25, minLng: 105, maxLng: 122 }, severity: 'MEDIUM' },
    { name: 'STRAIT OF HORMUZ', bounds: { minLat: 24, maxLat: 28, minLng: 54, maxLng: 60 }, severity: 'CRITICAL' },
    { name: 'ISTANBUL STRAIT (BOSPHORUS)', bounds: { minLat: 40.8, maxLat: 41.3, minLng: 28.8, maxLng: 29.3 }, severity: 'MEDIUM' },
    { name: 'MALACCA STRAIT (SINGAPORE)', bounds: { minLat: 1.0, maxLat: 1.6, minLng: 102.5, maxLng: 104.8 }, severity: 'HIGH' },
    { name: 'PANAMA CANAL', bounds: { minLat: 8.8, maxLat: 9.5, minLng: -80.1, maxLng: -79.4 }, severity: 'MEDIUM' },
    { name: 'STRAIT OF GIBRALTAR', bounds: { minLat: 35.7, maxLat: 36.3, minLng: -5.8, maxLng: -5.1 }, severity: 'MEDIUM' }
];

export default function MaritimeMap2D() {
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [geoData, setGeoData] = useState<any>(null);
  const [activeCount, setActiveCount] = useState(0);

  const { uiVisibility } = useMetricsStore();

  // High-performance refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapGroupRef = useRef<SVGGElement>(null);
  const ghostMapRef = useRef(new Map<string, GhostVessel>());
  const lastUpdateRef = useRef<number>(Date.now());
  const pulseRef = useRef(0);
  
  // Pan-Zoom State
  const transformRef = useRef({ x: 0, y: 0, k: 3 });
  const isDragging = useRef(false);
  const startDrag = useRef({ x: 0, y: 0 });
  const dragDistance = useRef(0);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json')
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(err => console.error("GeoJSON Map Error:", err));

    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const memoizedPaths = useMemo(() => {
    if (!geoData) return [];
    return geoData.features.map((f: any) => generatePath(f, dimensions.width, dimensions.height));
  }, [geoData, dimensions]);

  const updateStoreBounds = () => {
    const t = transformRef.current;
    if (t.k < 2.5) {
      useMetricsStore.getState().setApiStatus({ ...useMetricsStore.getState().apiStatus, currentBounds: null });
    } else {
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
      useMetricsStore.getState().setApiStatus({
        ...useMetricsStore.getState().apiStatus,
        currentBounds: {
          lamin: Math.max(-90, bottomRight.lat),
          lomin: Math.max(-180, topLeft.lng),
          lamax: Math.min(90, topLeft.lat),
          lomax: Math.min(180, bottomRight.lng)
        }
      });
    }
  };

  const clampTransform = () => {
    const t = transformRef.current;
    t.k = Math.max(1, Math.min(t.k, 150));
    const minX = dimensions.width * (1 - t.k);
    const minY = dimensions.height * (1 - t.k);
    t.x = Math.max(minX, Math.min(0, t.x));
    t.y = Math.max(minY, Math.min(0, t.y));
    updateStoreBounds();
  };

  // 3. Isolated Render Loop (30 FPS — optimized for performance)
  useEffect(() => {
    let frameId: number;
    const ctx = canvasRef.current?.getContext('2d');
    let lastFrame = 0;
    const FRAME_INTERVAL = 1000 / 30; // 30 FPS cap
    
    const animate = (timestamp: number) => {
      frameId = requestAnimationFrame(animate);
      if (timestamp - lastFrame < FRAME_INTERVAL) return;
      lastFrame = timestamp;

      const now = Date.now();
      const dt = (now - lastUpdateRef.current) / 1000;
      lastUpdateRef.current = now;
      pulseRef.current = (pulseRef.current + 0.05) % (Math.PI * 2);

      // Sync with Store data
      const storeVessels = useMetricsStore.getState().vessels || [];
      const ghostMap = ghostMapRef.current;

      storeVessels.forEach(v => {
        const existing = ghostMap.get(v.id);
        if (existing) {
          existing.targetLat = v.lat; existing.targetLng = v.lng;
          existing.course = v.course; existing.speed = v.speed;
          existing.name = v.name; existing.lastUpdate = v.lastUpdate;
          existing.isGhost = false;
        } else {
          ghostMap.set(v.id, {
            ...v, visualLat: v.lat, visualLng: v.lng, targetLat: v.lat, targetLng: v.lng,
            isGhost: false, lastSeen: now
          });
        }
      });

      for (const [id, gv] of ghostMap.entries()) {
        const timeSinceUpdate = now - gv.lastUpdate;
        if (timeSinceUpdate > GHOST_TURNOFF_MS) { ghostMap.delete(id); continue; }
        gv.isGhost = timeSinceUpdate > STALE_THRESHOLD_MS;

        gv.visualLat += (gv.targetLat - gv.visualLat) * 0.15;
        gv.visualLng += (gv.targetLng - gv.visualLng) * 0.15;

        if (timeSinceUpdate > 5000 && gv.speed > 2) {
            const mps = gv.speed * 0.5144;
            const courseRad = gv.course * Math.PI / 180;
            gv.targetLat += (mps * dt / 111111) * Math.cos(courseRad);
            gv.targetLng += (mps * dt / (111111 * Math.cos(gv.visualLat * Math.PI / 180))) * Math.sin(courseRad);
        }
      }

      if (ctx) {
        const { x, y, k } = transformRef.current;
        const { width, height } = dimensions;
        ctx.clearRect(0, 0, width, height);
        
        // --- DRAW DANGER ZONES ---
        DANGER_ZONES.forEach(zone => {
            const x1 = (zone.bounds.minLng + 180) * (width / 360) * k + x;
            const y1 = (90 - zone.bounds.maxLat) * (height / 180) * k + y;
            const x2 = (zone.bounds.maxLng + 180) * (width / 360) * k + x;
            const y2 = (90 - zone.bounds.minLat) * (height / 180) * k + y;
            
            ctx.fillStyle = zone.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.05)';
            ctx.strokeStyle = zone.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.2)';
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
            ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
            ctx.setLineDash([]);
            
            if (k > 5) {
                ctx.fillStyle = ctx.strokeStyle as string;
                ctx.font = 'bold 10px monospace';
                ctx.fillText(`! ${zone.name}`, x1 + 5, y1 - 5);
            }
        });

        // VIEWPORT CULLING: Only process and render what's on screen
        ghostMap.forEach(gv => {
          const localX = (gv.visualLng + 180) * (width / 360);
          const localY = (90 - gv.visualLat) * (height / 180);
          const screenX = localX * k + x;
          const screenY = localY * k + y;

          // Padding 20% for smooth entry/exit
          const padding = 150; 
          const isVisible = screenX > -padding && screenX < width + padding && screenY > -padding && screenY < height + padding;

          if (!isVisible) return;

          // Danger Detection
          const inDanger = DANGER_ZONES.find(z => 
            gv.visualLat >= z.bounds.minLat && gv.visualLat <= z.bounds.maxLat &&
            gv.visualLng >= z.bounds.minLng && gv.visualLng <= z.bounds.maxLng
          );

          const isSelected = selectedVessel?.id === gv.id;
          const opacity = gv.isGhost ? Math.max(0.1, 1 - (now - gv.lastUpdate) / GHOST_TURNOFF_MS) : 1;

          ctx.save();
          ctx.translate(screenX, screenY);
          
          const baseScale = Math.max(0.4, Math.min(k / 10, 1.5));
          ctx.scale(baseScale, baseScale);
          ctx.rotate((gv.course * Math.PI) / 180);
          ctx.globalAlpha = opacity;

          if (inDanger) {
              const pulse = Math.sin(pulseRef.current * 2) * 0.5 + 0.5;
              ctx.beginPath();
              ctx.arc(0, 0, 15 + pulse * 10, 0, Math.PI * 2);
              ctx.strokeStyle = '#ef4444';
              ctx.lineWidth = 2 / baseScale;
              ctx.stroke();
          }

          // Tactical Hull
          ctx.beginPath();
          ctx.moveTo(0, -10);
          ctx.bezierCurveTo(5, -5, 5, 5, 4, 10);
          ctx.lineTo(-4, 10);
          ctx.bezierCurveTo(-5, 5, -5, -5, 0, -10);
          ctx.closePath();
          
          ctx.fillStyle = inDanger ? '#ef4444' : isSelected ? '#38bdf8' : gv.isGhost ? '#64748b' : '#22d3ee';
          ctx.fill();
          
          if (!gv.isGhost && gv.speed > 0.5) {
            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.lineTo(0, -10 - (gv.speed * 1.5)); // Longer vectors for high speed
            ctx.strokeStyle = ctx.fillStyle as string;
            ctx.lineWidth = 2 / baseScale;
            ctx.stroke();
          }
          
          ctx.restore();

          if (k > 10 || isSelected || inDanger) {
            ctx.globalAlpha = opacity;
            ctx.fillStyle = inDanger ? '#ef4444' : isSelected ? '#fff' : 'rgba(255,255,255,0.7)';
            ctx.font = `bold ${Math.max(8, Math.min(12, k/2))}px monospace`;
            ctx.textAlign = 'center';
            const labelY = 15 * baseScale + 10;
            ctx.fillText(gv.name.toUpperCase(), screenX, screenY + labelY);
            
            if (isSelected || inDanger) {
                ctx.font = '8px monospace';
                ctx.fillText(`${gv.speed.toFixed(1)} KN | ${gv.course.toFixed(0)}°`, screenX, screenY + labelY + 10);
                if (inDanger) {
                    ctx.fillStyle = '#ef4444';
                    ctx.fillText('SIGNAL AT RISK // STRATEGIC CHOKEPOINT', screenX, screenY + labelY + 20);
                }
            }
          }
        });
      }

      if (mapGroupRef.current) {
        const { x, y, k } = transformRef.current;
        mapGroupRef.current.setAttribute('transform', `translate(${x}, ${y}) scale(${k})`);
      }

      // Update counters every ~2 seconds to avoid over-rendering
      if (now % 2000 < 50) {
        setActiveCount(ghostMap.size);
      }
    };
    
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [dimensions, selectedVessel]);

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
    const factor = deltaY > 0 ? 0.82 : 1.22; // Tactile zoom speed
    const t = transformRef.current;
    
    // Stable Pivot Zoom calculation
    const newK = Math.max(1, Math.min(t.k * factor, 150));
    const ratio = newK / t.k;
    
    // Adjust offsets to keep current cursor point stationary in screen-space
    t.x = clientX - (clientX - t.x) * ratio;
    t.y = clientY - (clientY - t.y) * ratio;
    t.k = newK;
    
    clampTransform();
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (dragDistance.current > 5) return;
    const { x, y, k } = transformRef.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    let closest: GhostVessel | null = null;
    let minDist = 25;

    ghostMapRef.current.forEach(gv => {
      const localX = (gv.visualLng + 180) * (dimensions.width / 360);
      const localY = (90 - gv.visualLat) * (dimensions.height / 180);
      const screenX = localX * k + x;
      const screenY = localY * k + y;
      const dist = Math.hypot(screenX - clickX, screenY - clickY);
      if (dist < minDist) { minDist = dist; closest = gv; }
    });
    setSelectedVessel(closest);
  };

  return (
    <div 
      className="maritime-radar-container" 
      style={{ width: '100%', height: '100vh', background: '#010409', overflow: 'hidden', position: 'relative', cursor: isDragging.current ? 'grabbing' : 'crosshair' }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onWheel={onWheel}
    >
      {/* Background Grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(56, 189, 248, 0.05) 1px, transparent 0)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />

      <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
        <g ref={mapGroupRef}>
          {memoizedPaths.map((path: string, i: number) => (
            <path key={i} d={path} fill="rgba(15, 23, 42, 0.4)" stroke="rgba(56, 189, 248, 0.08)" strokeWidth={0.3 / transformRef.current.k} />
          ))}
        </g>
      </svg>

      <canvas ref={canvasRef} width={dimensions.width} height={dimensions.height} style={{ position: 'absolute', top: 0, left: 0 }} onClick={handleCanvasClick} />

      {/* TACTICAL HUD (Linked to INTEL) */}
      {uiVisibility.leftPanel && (
        <div style={{ position: 'absolute', top: '80px', left: '24px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#22d3ee' }}>
            <div style={{ padding: '8px', background: 'rgba(34, 211, 238, 0.1)', borderRadius: '10px', border: '1px solid rgba(34, 211, 238, 0.4)', boxShadow: '0 0 15px rgba(34, 211, 238, 0.2)' }}>
              <Anchor size={24} className="animate-pulse" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', letterSpacing: '4px', fontWeight: 'bold', textShadow: '0 0 15px rgba(34, 211, 238, 0.6)' }}>SHADOWNET MARITIME</h2>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontFamily: 'monospace' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: activeCount > 0 ? '#22c55e' : '#ef4444', boxShadow: activeCount > 0 ? '0 0 8px #22c55e' : 'none' }} />
                  <span style={{ color: '#22d3ee' }}>SIGNALS DETECTED: {activeCount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFLICT ZONE DATA NOTICE (Linked to METRICS) */}
      {uiVisibility.rightPanel && (
        <div style={{ 
          position: 'absolute', 
          top: '80px', 
          right: '24px', 
          zIndex: 10, 
          maxWidth: '320px', 
          background: 'rgba(13, 17, 23, 0.85)', 
          backdropFilter: 'blur(12px)', 
          border: '1px solid #ef4444', 
          borderLeft: '4px solid #ef4444',
          borderRadius: '4px 12px 12px 4px', 
          padding: '16px',
          boxShadow: '0 10px 30px rgba(239, 68, 68, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{ width: '10px', height: '10px', background: '#ef4444', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
            <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: '900', letterSpacing: '2px' }}>CRITICAL COVERAGE WARNING</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <p style={{ color: '#fff', fontSize: '0.65rem', fontWeight: 'bold', margin: '0 0 4px 0', textTransform: 'uppercase' }}>EN: Tactical Restrictions Active</p>
              <p style={{ color: '#94a3b8', fontSize: '0.6rem', margin: 0, lineHeight: '1.4' }}>
                Conflict zone vessel tracking (Black/Red Sea) requires Tier-2 API. Direct telemetry may be spoofed or obfuscated in kinetic zones.
              </p>
            </div>
            
            <div style={{ borderTop: '1px solid rgba(239, 68, 68, 0.2)', paddingTop: '10px' }}>
              <p style={{ color: '#fff', fontSize: '0.65rem', fontWeight: 'bold', margin: '0 0 4px 0', textTransform: 'uppercase' }}>TR: Taktiksel Kısıtlama Aktif</p>
              <p style={{ color: '#94a3b8', fontSize: '0.6rem', margin: 0, lineHeight: '1.4' }}>
                Çatışma bölgesi takibi (Karadeniz/Kızıldeniz) Tier-2 API gerektirir. Sıcak bölgelerde canlı veriler gizlenmiş veya gecikmeli olabilir.
              </p>
            </div>
          </div>
        </div>
      )}

      <div style={{ position: 'absolute', bottom: '120px', left: '30px', color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div>LAT: {((90 - ( ( (dimensions.height/2) - transformRef.current.y) / transformRef.current.k) / (dimensions.height/180) )).toFixed(4)}</div>
        <div>LNG: {(( ( (dimensions.width/2) - transformRef.current.x) / transformRef.current.k) / (dimensions.width/360) - 180).toFixed(4)}</div>
      </div>

      {selectedVessel && (
        <div style={{ position: 'absolute', bottom: '100px', right: '24px', zIndex: 100, width: '320px', background: 'rgba(13, 17, 23, 0.95)', backdropFilter: 'blur(16px)', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '16px', padding: '20px', color: '#fff', boxShadow: '0 20px 50px rgba(0,0,0,0.8)', animation: 'slideIn 0.3s ease-out' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ padding: '8px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '10px' }}>
                    <Ship color="#22d3ee" size={20} />
                </div>
                <div>
                    <span style={{ fontWeight: 'bold', fontSize: '1rem', display: 'block' }}>{selectedVessel.name.toUpperCase()}</span>
                    <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>FLAG: {selectedVessel.flag || 'UNKNOWN'}</span>
                </div>
            </div>
            <button onClick={() => setSelectedVessel(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}><X size={20} /></button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '12px' }}>
            <DataField label="MMSI" value={selectedVessel.mmsi} />
            <DataField label="COURSE" value={`${selectedVessel.course}°`} icon={<Navigation size={10} style={{ transform: `rotate(${selectedVessel.course}deg)` }} />} />
            <DataField label="SPEED" value={`${selectedVessel.speed.toFixed(1)} KN`} />
            <DataField label="STATUS" value={ (Date.now() - selectedVessel.lastUpdate > 30000) ? 'SIGNAL WEAK' : 'STABLE'} color={ (Date.now() - selectedVessel.lastUpdate > 30000) ? '#f59e0b' : '#22c55e'} />
          </div>
          
          <div style={{ marginTop: '12px', fontSize: '0.65rem', color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
            Data intercepted via ShadowNet Singleton Relay V10
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
      `}</style>
    </div>
  );
}

function DataField({ label, value, icon, color = '#fff' }: any) {
    return (
        <div>
            <div style={{ color: '#94a3b8', fontSize: '0.55rem', textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '1px' }}>{label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color, fontWeight: '600' }}>{icon}{value}</div>
        </div>
    );
}

function generatePath(feature: any, width: number, height: number): string {
  if (!feature.geometry) return '';
  const { coordinates, type } = feature.geometry;
  const project = (lng: number, lat: number) => {
    const x = (lng + 180) * (width / 360);
    const y = (90 - lat) * (height / 180);
    return `${x},${y}`;
  };
  if (type === 'Polygon') {
    return coordinates.map((ring: any[]) => 'M' + ring.map((pt: any[]) => project(pt[0], pt[1])).join('L') + 'Z').join(' ');
  } else if (type === 'MultiPolygon') {
    return coordinates.map((poly: any[][]) => poly.map((ring: any[]) => 'M' + ring.map((pt: any[]) => project(pt[0], pt[1])).join('L') + 'Z').join(' ')).join(' ');
  }
  return '';
}
