import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useMetricsStore, type Vessel } from '../store/useMetricsStore';
import { Ship, X, Anchor, Navigation, Activity } from 'lucide-react';

// === GHOST ENGINE INTERFACE ===
interface GhostVessel extends Vessel {
  visualLat: number;
  visualLng: number;
  visualCourse: number; // Added for smooth rotation
  targetLat: number;
  targetLng: number;
  isGhost: boolean;
  lastSeen: number;
}

const GHOST_TURNOFF_MS = 10 * 60 * 1000; // Increased to 10 min
const STALE_THRESHOLD_MS = 60 * 1000;  // 1 min to become "ghost"

// === TACTICAL INTELLIGENCE ===
// === STRATEGIC CHOKEPOINTS (Replaces generic war zones) ===
const STRATEGIC_CHOKEPOINTS = [
    { name: 'ISTANBUL STRAIT (BOSPHORUS)', bounds: { minLat: 40.8, maxLat: 41.3, minLng: 28.8, maxLng: 29.3 }, severity: 'STRATEGIC' },
    { name: 'DARDANELLES (CANAKKALE)', bounds: { minLat: 39.8, maxLat: 40.5, minLng: 26.2, maxLng: 26.8 }, severity: 'STRATEGIC' },
    { name: 'SUEZ CANAL', bounds: { minLat: 29.8, maxLat: 31.3, minLng: 32.2, maxLng: 32.7 }, severity: 'STRATEGIC' },
    { name: 'STRAIT OF HORMUZ', bounds: { minLat: 24.0, maxLat: 28.0, minLng: 54.0, maxLng: 60.0 }, severity: 'CRITICAL' },
    { name: 'MALACCA STRAIT', bounds: { minLat: 1.0, maxLat: 1.6, minLng: 102.5, maxLng: 104.8 }, severity: 'HIGH' },
    { name: 'PANAMA CANAL', bounds: { minLat: 8.8, maxLat: 9.5, minLng: -80.1, maxLng: -79.4 }, severity: 'MEDIUM' },
    { name: 'STRAIT OF GIBRALTAR', bounds: { minLat: 35.7, maxLat: 36.3, minLng: -5.8, maxLng: -5.1 }, severity: 'HIGH' },
    { name: 'BAB-EL-MANDEB', bounds: { minLat: 12.4, maxLat: 13.5, minLng: 43.1, maxLng: 43.8 }, severity: 'CRITICAL' }
];

export default function MaritimeMap2D() {
  const vessels = useMetricsStore(state => state.vessels);
  const setSelectedVesselStore = useMetricsStore(state => state.setSelectedVessel);

  const [selectedVessel, setSelectedLocal] = useState<Vessel | null>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [geoData, setGeoData] = useState<any>(null);
  const [activeCount, setActiveCount] = useState(0);

  // High-performance refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapGroupRef = useRef<SVGGElement>(null);
  const ghostMapRef = useRef(new Map<string, GhostVessel>());
  const lastUpdateRef = useRef<number>(Date.now());
  const pulseRef = useRef(0);
  
  // Pan-Zoom State: CENTERED ON BOSPHORUS / TURKEY (V12)
  const initialK = 14; 
  const initialX = (window.innerWidth / 2) - ((29 + 180) * (window.innerWidth / 360) * initialK);
  const initialY = (window.innerHeight / 2) - ((90 - 41.1) * (window.innerHeight / 180) * initialK);

  const transformRef = useRef({ x: initialX, y: initialY, k: initialK });
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

  const clampTransform = () => {
    const t = transformRef.current;
    t.k = Math.max(1, Math.min(t.k, 150));
    
    // Projeksiyon sınırlarını koru (Dinamik Pivot Clamp)
    const minX = dimensions.width * (1 - t.k);
    const minY = dimensions.height * (1 - t.k);
    t.x = Math.max(minX, Math.min(0, t.x));
    t.y = Math.max(minY, Math.min(0, t.y));
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
          existing.speed = v.speed;
          // Smooth course target adjustment
          existing.course = v.course;
          existing.name = v.name; existing.lastUpdate = v.lastUpdate;
          existing.isGhost = false;
        } else {
          // INSTANT SPAWN: First time seeing this vessel, no interpolation
          ghostMap.set(v.id, {
            ...v, visualLat: v.lat, visualLng: v.lng, visualCourse: v.course,
            targetLat: v.lat, targetLng: v.lng,
            isGhost: false, lastSeen: now
          });
        }
      });

      for (const [id, gv] of ghostMap.entries()) {
        const timeSinceUpdate = now - gv.lastUpdate;
        if (timeSinceUpdate > GHOST_TURNOFF_MS) { ghostMap.delete(id); continue; }
        gv.isGhost = timeSinceUpdate > STALE_THRESHOLD_MS;

        // Smooth Precision Interpolation (0.1 for high speed updates)
        gv.visualLat += (gv.targetLat - gv.visualLat) * 0.1;
        gv.visualLng += (gv.targetLng - gv.visualLng) * 0.1;

        // Smooth Compass Rotation (Lerp angle)
        let diff = (gv.course - gv.visualCourse + 180 + 360) % 360 - 180;
        gv.visualCourse += diff * 0.12;

        // Predictive Dead Reckoning (Glide logic)
        if (timeSinceUpdate > 3000 && gv.speed > 0.5) {
            const mps = gv.speed * 0.5144;
            const courseRad = gv.visualCourse * Math.PI / 180;
            const driftLat = (mps * dt / 111111) * Math.cos(courseRad);
            const driftLng = (mps * dt / (111111 * Math.cos(gv.visualLat * Math.PI / 180))) * Math.sin(courseRad);
            gv.targetLat += driftLat;
            gv.targetLng += driftLng;
        }
      }

      if (ctx) {
        const { x, y, k } = transformRef.current;
        const { width, height } = dimensions;
        ctx.clearRect(0, 0, width, height);
        
        // --- DRAW STRATEGIC CHOKEPOINTS ---
        STRATEGIC_CHOKEPOINTS.forEach(zone => {
            const x1 = (zone.bounds.minLng + 180) * (width / 360) * k + x;
            const y1 = (90 - zone.bounds.maxLat) * (height / 180) * k + y;
            const x2 = (zone.bounds.maxLng + 180) * (width / 360) * k + x;
            const y2 = (90 - zone.bounds.minLat) * (height / 180) * k + y;
            
            ctx.fillStyle = zone.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(34, 211, 238, 0.03)';
            ctx.strokeStyle = zone.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(34, 211, 238, 0.15)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
            ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
            
            if (k > 8) {
                ctx.fillStyle = ctx.strokeStyle as string;
                ctx.font = 'bold 9px Orbitron, monospace';
                ctx.fillText(`LOCKED // ${zone.name}`, x1 + 4, y1 - 4);
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

          // Chokepoint Detection
          const inChokepoint = STRATEGIC_CHOKEPOINTS.find(z => 
            gv.visualLat >= z.bounds.minLat && gv.visualLat <= z.bounds.maxLat &&
            gv.visualLng >= z.bounds.minLng && gv.visualLng <= z.bounds.maxLng
          );

          const isSelected = selectedVessel?.id === gv.id;
          const opacity = gv.isGhost ? Math.max(0.1, 1 - (now - gv.lastUpdate) / GHOST_TURNOFF_MS) : 1;

          // --- DRAW WAKE TRAIL ---
          if (!gv.isGhost && gv.speed > 1) {
            const wakeLen = Math.min(20, gv.speed * 2);
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(screenX, screenY);
            const wakeX = screenX - Math.sin((gv.visualCourse * Math.PI) / 180) * wakeLen * k / 10;
            const wakeY = screenY + Math.cos((gv.visualCourse * Math.PI) / 180) * wakeLen * k / 10;
            ctx.lineTo(wakeX, wakeY);
            ctx.strokeStyle = inChokepoint ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 211, 238, 0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
          }

          ctx.save();
          ctx.translate(screenX, screenY);
          
          // Adaptive Scaling: Shrink when zoomed out to prevent overlap
          const baseScale = Math.max(0.2, Math.min(k / 15, 1.2));
          ctx.scale(baseScale, baseScale);
          ctx.rotate((gv.visualCourse * Math.PI) / 180); // Using smooth visualCourse
          ctx.globalAlpha = opacity;

          if (inChokepoint) {
              const pulse = Math.sin(pulseRef.current * 3) * 0.5 + 0.5;
              ctx.beginPath();
              ctx.arc(0, 0, 12 + pulse * 6, 0, Math.PI * 2);
              ctx.strokeStyle = '#ef4444';
              ctx.lineWidth = 1 / baseScale;
              ctx.stroke();
          }

          // Tactical Hull
          ctx.beginPath();
          ctx.moveTo(0, -10);
          ctx.bezierCurveTo(5, -5, 5, 5, 4, 10);
          ctx.lineTo(-4, 10);
          ctx.bezierCurveTo(-5, 5, -5, -5, 0, -10);
          ctx.closePath();
          
          ctx.fillStyle = inChokepoint ? '#ef4444' : isSelected ? '#38bdf8' : gv.isGhost ? '#64748b' : '#22d3ee';
          ctx.shadowBlur = isSelected ? 15 : 0;
          ctx.shadowColor = ctx.fillStyle as string;
          ctx.fill();
          ctx.shadowBlur = 0;
          
          if (!gv.isGhost && gv.speed > 0.5) {
            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.lineTo(0, -10 - (gv.speed * 2)); // Longer vectors
            ctx.strokeStyle = ctx.fillStyle as string;
            ctx.lineWidth = 2 / baseScale;
            ctx.stroke();
          }
          
          ctx.restore();

          if (k > 10 || isSelected || inChokepoint) {
            ctx.globalAlpha = opacity;
            ctx.fillStyle = inChokepoint ? '#ef4444' : isSelected ? '#fff' : 'rgba(34, 211, 238, 0.7)';
            ctx.font = `bold ${Math.max(8, Math.min(11, k/3))}px monospace`;
            ctx.textAlign = 'center';
            const labelY = 18 * baseScale + 10;
            ctx.fillText(gv.name.toUpperCase(), screenX, screenY + labelY);
            
            if (isSelected || inChokepoint) {
                ctx.font = '7px monospace';
                ctx.fillText(`${gv.speed.toFixed(1)} KN | ${gv.course.toFixed(0)}°`, screenX, screenY + labelY + 10);
                if (inChokepoint) {
                    ctx.fillStyle = '#ef4444';
                    ctx.fillText('TRANSIT MONITORING ACTIVE', screenX, screenY + labelY + 20);
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
    setSelectedLocal(closest);
    setSelectedVesselStore(closest);
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAlertOpen, setIsAlertOpen] = useState(true);
  const [isLegendOpen, setIsLegendOpen] = useState(true);

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
            <path key={i} d={path} fill="rgba(10, 15, 25, 0.9)" stroke="rgba(34, 211, 238, 0.2)" strokeWidth={0.5 / transformRef.current.k} />
          ))}
        </g>
      </svg>

      <canvas ref={canvasRef} width={dimensions.width} height={dimensions.height} style={{ position: 'absolute', top: 0, left: 0 }} onClick={handleCanvasClick} />

      {/* TACTICAL HUD - PREMIUM GLASS */}
      <div style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ 
            padding: '10px', 
            background: 'rgba(34, 211, 238, 0.1)', 
            borderRadius: '12px', 
            border: '1px solid rgba(34, 211, 238, 0.3)', 
            boxShadow: '0 0 20px rgba(34, 211, 238, 0.15)',
            backdropFilter: 'blur(10px)'
          }}>
            <Anchor size={28} style={{ color: '#22d3ee' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ 
              margin: 0, 
              fontSize: '1.6rem', 
              letterSpacing: '5px', 
              fontWeight: '900', 
              color: '#fff', 
              fontFamily: 'Orbitron, sans-serif',
              textShadow: '0 0 20px rgba(34, 211, 238, 0.4)'
            }}>SHADOWNET MARITIME</h2>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontFamily: 'monospace', letterSpacing: '1px' }}>
                <Activity size={12} style={{ color: '#22d3ee' }} /> 
                <span style={{ color: '#22d3ee', fontWeight: 'bold' }}>TRACKING: {activeCount.toLocaleString()} VESSELS</span>
                <span style={{ opacity: 0.3 }}>|</span>
                <span>RELAY: ACTIVE</span>
            </div>
          </div>
        </div>
      </div>

      {/* CONFLICT ZONE DATA NOTICE - PREMIUM RED GLASS (WITH TOGGLE) */}
      <div style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
        {!isAlertOpen && (
          <button 
            onClick={() => setIsAlertOpen(true)}
            style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid rgba(239, 68, 68, 0.3)', 
              borderRadius: '8px', 
              padding: '10px 15px', 
              color: '#ef4444', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backdropFilter: 'blur(10px)',
              fontFamily: 'Orbitron',
              fontSize: '0.6rem',
              letterSpacing: '1px'
            }}
          >
            <Activity size={14} /> COVERAGE ALERT
          </button>
        )}

        {isAlertOpen && (
          <div style={{ 
            maxWidth: '340px', 
            background: 'rgba(10, 15, 25, 0.8)', 
            backdropFilter: 'blur(20px)', 
            border: '1px solid rgba(239, 68, 68, 0.3)', 
            borderLeft: '4px solid #ef4444',
            borderRadius: '8px 16px 16px 8px', 
            padding: '20px',
            boxShadow: '0 15px 40px rgba(239, 68, 68, 0.1)',
            animation: 'slideRight 0.5s ease',
            position: 'relative'
          }}>
            <button 
              onClick={() => setIsAlertOpen(false)}
              style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: 'rgba(239,68,68,0.5)', cursor: 'pointer' }}
            >
                <X size={16} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '10px', height: '10px', background: '#ef4444', borderRadius: '50%', animation: 'pulse 1s infinite', boxShadow: '0 0 10px #ef4444' }} />
              <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: '900', letterSpacing: '2px', fontFamily: 'Orbitron' }}>COVERAGE ALERT</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ position: 'relative', paddingLeft: '15px' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '1px', background: 'rgba(239, 68, 68, 0.2)' }} />
                    <p style={{ color: '#fff', fontSize: '0.65rem', fontWeight: 'bold', margin: '0 0 4px 0', letterSpacing: '0.5px' }}>EN: TACTICAL RESTRICTIONS ACTIVE</p>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6rem', margin: 0, lineHeight: '1.5' }}>
                    Direct telemetry may be spoofed or obfuscated in kinetic zones. Tier-2 sensor fusion required.
                    </p>
                </div>
                
                <div style={{ position: 'relative', paddingLeft: '15px' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '1px', background: 'rgba(239, 68, 68, 0.2)' }} />
                    <p style={{ color: '#fff', fontSize: '0.65rem', fontWeight: 'bold', margin: '0 0 4px 0', letterSpacing: '0.5px' }}>TR: TAKTİKSEL KISITLAMA AKTİF</p>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6rem', margin: 0, lineHeight: '1.5' }}>
                    Sıcak bölgelerde canlı veriler gizlenmiş veya gecikmeli olabilir. Sensör füzyonu devrededir.
                    </p>
                </div>
            </div>
          </div>
        )}
      </div>

      {/* SAĞ LİSTE PANELİ - PREMIUM GLASS (SYNCED WITH RADAR) */}
      {isSidebarOpen ? (
        <div style={{ position: 'absolute', top: '100px', right: 0, zIndex: 100, display: 'flex', alignItems: 'flex-start' }}>
          <div style={{ 
            width: '360px', 
            background: 'rgba(10, 15, 25, 0.85)', 
            borderLeft: '1px solid rgba(34, 211, 238, 0.2)', 
            backdropFilter: 'blur(30px)', 
            display: 'flex', 
            flexDirection: 'column', 
            height: 'calc(100vh - 200px)',
            borderRadius: '20px 0 0 20px',
            boxShadow: '-20px 0 50px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            animation: 'slideRight 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            position: 'relative'
          }}>
            <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(34, 211, 238, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.6rem', color: '#22d3ee', letterSpacing: '3px', fontWeight: 'bold' }}>MARITIME RADAR</span>
                <span style={{ fontWeight: '900', fontSize: '1.2rem', color: '#fff', fontFamily: 'Orbitron, sans-serif' }}>ACTIVE VESSELS</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ background: 'rgba(34, 211, 238, 0.1)', border: '1px solid rgba(34, 211, 238, 0.3)', color: '#22d3ee', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', fontFamily: 'monospace' }}>
                  {(vessels || []).length}
                </span>
                <button 
                  onClick={() => setIsSidebarOpen(false)} 
                  style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '8px', borderRadius: '50%' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
              {(vessels || []).slice(0, 100).map(v => {
                  const isSelected = selectedVessel?.id === v.id;
                  return (
                    <div 
                      key={v.id} 
                      onClick={() => { setSelectedLocal(v); setSelectedVesselStore(v); }}
                      style={{ 
                        padding: '14px', 
                        borderRadius: '12px', 
                        background: isSelected ? 'rgba(34,211,238,0.1)' : 'rgba(255,255,255,0.02)',
                        border: isSelected ? '1px solid rgba(34,211,238,0.5)' : '1px solid rgba(255,255,255,0.05)',
                        cursor: 'pointer',
                        marginBottom: '8px',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 'bold', color: isSelected ? '#fff' : 'rgba(255,255,255,0.8)', fontSize: '0.9rem', fontFamily: 'monospace' }}>{v.name.toUpperCase()}</span>
                        <span style={{ color: '#22d3ee', fontSize: '0.7rem', fontWeight: 'bold' }}>{v.speed.toFixed(1)} KN</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        <span>MMSI: {v.mmsi}</span>
                        <span>HDG: {v.course.toFixed(0)}°</span>
                      </div>
                    </div>
                  );
              })}
            </div>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          style={{ 
            position: 'absolute', top: '100px', right: '0', 
            background: 'rgba(10, 15, 25, 0.9)', 
            border: '1px solid rgba(56, 189, 248, 0.3)', 
            borderRight: 'none', 
            borderRadius: '12px 0 0 12px', 
            padding: '16px 10px', 
            color: '#38bdf8', 
            cursor: 'pointer', 
            zIndex: 100, 
            backdropFilter: 'blur(10px)', 
            boxShadow: '-10px 0 30px rgba(0,0,0,0.5)', 
            transition: 'all 0.3s ease' 
          }}
        >
          <Navigation size={22} />
        </button>
      )}

      {/* VESSEL DETAIL CARD - PREMIUM TOP-CENTER */}
      {selectedVessel && (
        <div style={{ 
          position: 'absolute', 
          top: '110px', 
          left: '50%', 
          transform: 'translateX(-50%)',
          width: '420px', 
          background: 'rgba(10, 15, 25, 0.85)', 
          backdropFilter: 'blur(30px)', 
          border: '1px solid rgba(34, 211, 238, 0.3)', 
          borderRadius: '20px', 
          padding: '24px', 
          color: '#fff', 
          boxShadow: '0 30px 60px rgba(0,0,0,0.7), 0 0 20px rgba(34, 211, 238, 0.1)', 
          animation: 'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          zIndex: 1000 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <div style={{ padding: '10px', background: 'rgba(34, 211, 238, 0.1)', borderRadius: '12px' }}>
                    <Ship color="#22d3ee" size={24} />
                </div>
                <div>
                    <span style={{ fontSize: '0.6rem', color: 'rgba(34, 211, 238, 0.7)', letterSpacing: '2px', fontWeight: 'bold' }}>VESSEL IDENTIFIED</span>
                    <span style={{ fontWeight: '900', fontSize: '1.3rem', display: 'block', fontFamily: 'Orbitron, sans-serif', color: '#fff' }}>{selectedVessel.name.toUpperCase()}</span>
                </div>
            </div>
            <button onClick={() => { setSelectedLocal(null); setSelectedVesselStore(null); }} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '8px', borderRadius: '50%' }}><X size={20} /></button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <DataField label="MMSI" value={selectedVessel.mmsi} />
            <DataField label="COURSE" value={`${selectedVessel.course}°`} />
            <DataField label="SPEED" value={`${selectedVessel.speed.toFixed(1)} KN`} />
          </div>

          {Date.now() - selectedVessel.lastUpdate > 60000 && (
              <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)', fontSize: '0.7rem', color: '#f59e0b', fontFamily: 'monospace', textAlign: 'center', letterSpacing: '1px', fontWeight: 'bold' }}>
                ALERT: SIGNAL PERSISTENCE LOW
              </div>
          )}
        </div>
      )}

      {/* TACTICAL LEGEND (Sol Alt) */}
      <div style={{ position: 'absolute', bottom: '24px', left: '24px', zIndex: 1000 }}>
        {!isLegendOpen ? (
          <button 
            onClick={() => setIsLegendOpen(true)}
            style={{ 
              background: 'rgba(10, 15, 25, 0.9)', 
              padding: '10px', 
              color: '#38bdf8', 
              cursor: 'pointer', 
              borderRadius: '8px', 
              border: '1px solid rgba(56, 189, 248, 0.3)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 0 15px rgba(56, 189, 248, 0.2)'
            }}
          >
            <Activity size={18} />
          </button>
        ) : (
          <div style={{ 
            padding: '16px', 
            background: 'rgba(10, 15, 25, 0.9)', 
            border: '1px solid rgba(56, 189, 248, 0.3)', 
            borderRadius: '12px', 
            position: 'relative',
            backdropFilter: 'blur(15px)',
            width: '240px',
            animation: 'slideUp 0.4s ease-out'
          }}>
            <button 
              onClick={() => setIsLegendOpen(false)} 
              style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer' }}
            >
              <X size={14}/>
            </button>
            <div style={{ color: '#38bdf8', fontWeight: 'bold', marginBottom: '12px', borderBottom: '1px solid rgba(56, 189, 248, 0.2)', paddingBottom: '6px', fontSize: '0.75rem', letterSpacing: '1px' }}>
              SYSTEM IDENTIFIERS
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

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
      `}</style>
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

function DataField({ label, value, color = '#fff' }: any) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.55rem', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}>{label}</div>
            <div style={{ color, fontWeight: '900', fontSize: '0.9rem', fontFamily: 'Orbitron, monospace' }}>{value}</div>
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
