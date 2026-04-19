import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useMetricsStore, type Vessel } from '../store/useMetricsStore';
import { Ship, X, Anchor, Navigation } from 'lucide-react';

export default function MaritimeMap2D() {
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [geoData, setGeoData] = useState<any>(null);

  // Refs for extreme performance (Bypasses React re-renders)
  const vesselsRef = useRef<Vessel[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapGroupRef = useRef<SVGGElement>(null);
  
  // Pan-Zoom State
  const transformRef = useRef({ x: 0, y: 0, k: 2 });
  const isDragging = useRef(false);
  const startDrag = useRef({ x: 0, y: 0 });
  const dragDistance = useRef(0);

  // 1. Subscribe to store WITHOUT triggering re-renders
  useEffect(() => {
    const unsub = useMetricsStore.subscribe((state) => {
      vesselsRef.current = state.vessels || [];
    });
    
    fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json')
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(err => console.error("GeoJSON Map Error:", err));

    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    
    return () => { unsub(); window.removeEventListener('resize', handleResize); };
  }, []);

  // 2. Memoize Geographic Paths (CRITICAL FOR PERFORMANCE)
  const memoizedPaths = useMemo(() => {
    if (!geoData) return [];
    return geoData.features.map((f: any) => generatePath(f, dimensions.width, dimensions.height));
  }, [geoData, dimensions]);

  const clampTransform = () => {
    const t = transformRef.current;
    if (t.k < 1) t.k = 1;
    if (t.k > 100) t.k = 100;
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
    const factor = deltaY > 0 ? 0.9 : 1.1;
    const t = transformRef.current;
    t.x = clientX - (clientX - t.x) * factor;
    t.y = clientY - (clientY - t.y) * factor;
    t.k = Math.max(1, Math.min(t.k * factor, 100));
    clampTransform();
  };

  // 3. Isolated Render Loop (60 FPS)
  useEffect(() => {
    let frameId: number;
    const ctx = canvasRef.current?.getContext('2d');
    
    const animate = () => {
      if (ctx) {
        const { x, y, k } = transformRef.current;
        const { width, height } = dimensions;
        
        ctx.clearRect(0, 0, width, height);
        
        vesselsRef.current.forEach(vessel => {
          const localX = (vessel.lng + 180) * (width / 360);
          const localY = (90 - vessel.lat) * (height / 180);
          const screenX = localX * k + x;
          const screenY = localY * k + y;

          if (screenX < -20 || screenX > width + 20 || screenY < -20 || screenY > height + 20) return;

          ctx.save();
          ctx.translate(screenX, screenY);
          ctx.rotate((vessel.course * Math.PI) / 180);
          ctx.beginPath();
          ctx.moveTo(0, -6); ctx.lineTo(4, 6); ctx.lineTo(-4, 6); ctx.closePath();
          
          const isSelected = selectedVessel?.id === vessel.id;
          ctx.fillStyle = isSelected ? '#38bdf8' : '#22d3ee';
          ctx.shadowBlur = isSelected ? 15 : 5;
          ctx.shadowColor = isSelected ? '#38bdf8' : '#22d3ee';
          ctx.fill();
          ctx.restore();

          if (k > 5) {
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.font = '9px monospace';
            ctx.fillText(vessel.name.slice(0, 15), screenX + 8, screenY + 4);
          }
        });
      }

      if (mapGroupRef.current) {
        const { x, y, k } = transformRef.current;
        mapGroupRef.current.setAttribute('transform', `translate(${x}, ${y}) scale(${k})`);
      }
      frameId = requestAnimationFrame(animate);
    };
    
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [dimensions, selectedVessel]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (dragDistance.current > 5) return;
    const { x, y, k } = transformRef.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    let closest: Vessel | null = null;
    let minDist = 20;

    vesselsRef.current.forEach(v => {
      const localX = (v.lng + 180) * (dimensions.width / 360);
      const localY = (90 - v.lat) * (dimensions.height / 180);
      const screenX = localX * k + x;
      const screenY = localY * k + y;
      const dist = Math.hypot(screenX - clickX, screenY - clickY);
      if (dist < minDist) { minDist = dist; closest = v; }
    });
    setSelectedVessel(closest);
  };

  return (
    <div 
      className="maritime-radar-container" 
      style={{ width: '100%', height: '100vh', background: '#020617', overflow: 'hidden', position: 'relative', cursor: isDragging.current ? 'grabbing' : 'crosshair' }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onWheel={onWheel}
    >
      <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
        <g ref={mapGroupRef}>
          {memoizedPaths.map((path: string, i: number) => (
            <path key={i} d={path} fill="rgba(15, 23, 42, 0.8)" stroke="rgba(56, 189, 248, 0.15)" strokeWidth={0.5 / transformRef.current.k} />
          ))}
        </g>
      </svg>

      <canvas ref={canvasRef} width={dimensions.width} height={dimensions.height} style={{ position: 'absolute', top: 0, left: 0 }} onClick={handleCanvasClick} />

      <div style={{ position: 'absolute', top: '80px', left: '24px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#22d3ee' }}>
          <Anchor size={20} />
          <h2 style={{ margin: 0, fontSize: '1.2rem', letterSpacing: '2px', fontWeight: 'bold' }}>MARITIME COMMAND</h2>
        </div>
        <div style={{ fontSize: '0.65rem', color: '#94a3b8', background: 'rgba(15, 23, 42, 0.6)', padding: '4px 8px', borderRadius: '4px', borderLeft: '2px solid #22d3ee' }}>
          AIS STREAM LIVE RADAR // 60 FPS OPTIMIZED
        </div>
      </div>

      {selectedVessel && (
        <div style={{ position: 'absolute', bottom: '24px', right: '24px', zIndex: 100, width: '300px', background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '12px', padding: '16px', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><Ship color="#22d3ee" size={18} /><span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{selectedVessel.name}</span></div>
            <button onClick={() => setSelectedVessel(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={16} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.75rem' }}>
            <div><div style={{ color: '#94a3b8', fontSize: '0.6rem', textTransform: 'uppercase' }}>MMSI</div><div>{selectedVessel.mmsi}</div></div>
            <div><div style={{ color: '#94a3b8', fontSize: '0.6rem', textTransform: 'uppercase' }}>Heading</div><div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Navigation size={10} style={{ transform: `rotate(${selectedVessel.course}deg)` }} />{selectedVessel.course}°</div></div>
            <div><div style={{ color: '#94a3b8', fontSize: '0.6rem', textTransform: 'uppercase' }}>Speed</div><div>{selectedVessel.speed ? selectedVessel.speed.toFixed(1) : 0} kn</div></div>
            <div><div style={{ color: '#94a3b8', fontSize: '0.6rem', textTransform: 'uppercase' }}>Position</div><div>{selectedVessel.lat.toFixed(3)}, {selectedVessel.lng.toFixed(3)}</div></div>
          </div>
        </div>
      )}
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
