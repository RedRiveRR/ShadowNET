import { useEffect, useRef, useState, useMemo } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import { useMetricsStore } from '../store/useMetricsStore';
import { Navigation, Rocket, Zap, Crosshair, Play, Pause, X } from 'lucide-react';

// === PAYLAŞILAN 3D KAYNAKLAR ===

const satGeom = new THREE.BoxGeometry(0.3, 0.3, 0.3);
const satPanelGeom = new THREE.PlaneGeometry(1, 0.25);
const satMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8 });
const satPanelMat = new THREE.MeshBasicMaterial({ color: '#1d4ed8', side: THREE.DoubleSide });

const issTrussGeom = new THREE.CylinderGeometry(0.1, 0.1, 4, 8);
const issPanelGeom = new THREE.PlaneGeometry(0.7, 1.8);
const issMat = new THREE.MeshBasicMaterial({ color: '#fbbf24' });

export default function GlobeMap() {
  const globeRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const { 
    iss, satellites, earthquakes, newsEvents,
    setSelectedFlight,
    selectedSatellite, setSelectedSatellite,
    selectedISS, setSelectedISS
  } = useMetricsStore();
  
  const [isRotating, setIsRotating] = useState(true);



  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!globeRef.current) return;
    const controls = globeRef.current.controls();
    controls.autoRotate = isRotating;
    controls.autoRotateSpeed = 0.4;
  }, [isRotating]);



  // === 3D RENDER LİSTESİ (Sadece Global Olaylar, Uçuşlar Kaldırıldı) ===
  const objectsData = useMemo(() => {
    const data: any[] = [];
    // Uçuşlar (displayFlights) 3D ekrandan kaldırıldı.
    (satellites || []).forEach(s => {
      if (s.lat != null && s.lng != null) data.push({ ...s, __type: 'satellite' });
    });
    if (iss) data.push({ ...iss, id: 'iss-unique-id', __type: 'iss' });
    return data;
  }, [satellites, iss]);

  const objectThreeObject = (d: any) => {
    let group: THREE.Group;

    if (d.__type === 'iss') {
      group = new THREE.Group();
      const truss = new THREE.Mesh(issTrussGeom, issMat);
      truss.rotation.z = Math.PI / 2;
      group.add(truss);
      const pMat = new THREE.MeshBasicMaterial({ color: '#fbbf24', side: THREE.DoubleSide });
      for (let x of [-1.5, -0.6, 0.6, 1.5]) {
        for (let z of [1, -1]) {
          const p = new THREE.Mesh(issPanelGeom, pMat);
          p.position.set(x, 0, z); p.rotation.x = Math.PI / 2;
          group.add(p);
        }
      }
      group.scale.set(1.8, 1.8, 1.8);
    } else {
      group = new THREE.Group();
      const body = new THREE.Mesh(satGeom, satMat);
      group.add(body);
      const p1 = new THREE.Mesh(satPanelGeom, satPanelMat);
      p1.position.x = 0.65; p1.rotation.y = Math.PI/4;
      group.add(p1);
      const p2 = new THREE.Mesh(satPanelGeom, satPanelMat);
      p2.position.x = -0.65; p2.rotation.y = -Math.PI/4;
      group.add(p2);
    }

    return group;
  };

  const ringsData = useMemo(() => {
    const rings: any[] = [];
    (earthquakes || []).forEach(q => rings.push({ lat: q.lat, lng: q.lng, maxR: Math.max(q.mag * 2, 2), propagationSpeed: 2, repeatPeriod: 800, color: 'rgba(245, 158, 11, 0.7)' }));
    (newsEvents || []).forEach(n => { if (n.lat && n.lng) rings.push({ lat: n.lat, lng: n.lng, maxR: 3, propagationSpeed: 1, repeatPeriod: 2000, color: 'rgba(239, 68, 68, 0.8)' }); });
    return rings;
  }, [earthquakes, newsEvents]);

  const pathsData = useMemo(() => {
    return (satellites || []).filter(s => s.path && s.path.length > 0).map(s => ({
      coords: s.path?.map(p => [p.lat, p.lng]),
      color: 'rgba(255, 255, 255, 0.1)'
    }));
  }, [satellites]);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1, overflow: 'hidden' }}>
      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundColor="#000000"
        showAtmosphere={true}
        atmosphereColor="#4fc3f7"
        atmosphereAltitude={0.15}
        ringsData={ringsData}
        ringColor="color"
        ringMaxRadius="maxR"
        objectsData={objectsData}
        objectThreeObject={objectThreeObject}
        objectAltitude={(d: any) => d.__type === 'flight' ? 0.007 : d.__type === 'iss' ? 0.2 : (d.alt || 0.12)}
        onObjectClick={(obj: any) => {
          setSelectedFlight(null); setSelectedSatellite(null); setSelectedISS(false);
          if (obj.__type === 'flight') setSelectedFlight(obj);
          if (obj.__type === 'satellite') setSelectedSatellite(obj);
          if (obj.__type === 'iss') setSelectedISS(true);
        }}
        pathsData={pathsData}
        pathPoints="coords"
        pathColor="color"
        pathStroke={0.3}
        onGlobeClick={() => { setSelectedFlight(null); setSelectedSatellite(null); setSelectedISS(false); }}
      />

      <div style={{ position: 'absolute', bottom: '150px', left: '26rem', zIndex: 100, display: 'flex', gap: '8px' }}>
        <button onClick={() => setIsRotating(!isRotating)} style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '12px', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', cursor: 'pointer', backdropFilter: 'blur(8px)', font: 'bold 10px monospace' }}>
          {isRotating ? <Pause size={14} /> : <Play size={14} />} {isRotating ? 'DÖNÜŞÜ DURDUR' : 'DÖNÜŞÜ BAŞLAT'}
        </button>
      </div>

      <div style={{ position: 'absolute', top: '100px', left: '26rem', display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 100, pointerEvents: 'none' }}>
        {selectedSatellite && (
          <div className="intel-card" style={{ pointerEvents: 'auto', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)', border: '1px solid #3b82f6', borderRadius: '12px', padding: '16px', width: '280px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', animation: 'slideRight 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div><div style={{ fontSize: '0.6rem', color: '#3b82f6', fontWeight: 'bold' }}>SATELLITE TELEMETRY</div><div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>{selectedSatellite.name || 'SAT-ANONYMOUS'}</div></div>
              <button onClick={() => setSelectedSatellite(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <DataBlock label="NORAD ID" value={selectedSatellite.id} icon={<Crosshair size={10}/>} />
              <DataBlock label="ORBIT" value="LEO" icon={<Navigation size={10}/>} color="#3b82f6" />
              <DataBlock label="LATITUDE" value={`${selectedSatellite.lat?.toFixed(4)}°`} icon={<Crosshair size={10}/>} />
              <DataBlock label="LONGITUDE" value={`${selectedSatellite.lng?.toFixed(4)}°`} icon={<Crosshair size={10}/>} />
            </div>
          </div>
        )}

        {selectedISS && iss && (
          <div className="intel-card" style={{ pointerEvents: 'auto', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)', border: '1px solid #fbbf24', borderRadius: '12px', padding: '16px', width: '280px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', animation: 'slideRight 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div><div style={{ fontSize: '0.6rem', color: '#fbbf24', fontWeight: 'bold' }}>ORBITAL STATION</div><div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>I.S.S.</div></div>
              <button onClick={() => setSelectedISS(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <DataBlock label="VELOCITY" value={`${Math.round(iss.velocity || 27600)} km/h`} icon={<Zap size={10}/>} color="#fbbf24" />
              <DataBlock label="ALTITUDE" value={`${Math.round(iss.altitude || 408)} km`} icon={<Rocket size={10}/>} />
              <DataBlock label="LATITUDE" value={`${iss.lat?.toFixed(4)}°`} icon={<Crosshair size={10}/>} />
              <DataBlock label="LONGITUDE" value={`${iss.lng?.toFixed(4)}°`} icon={<Crosshair size={10}/>} />
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideRight { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
}

function DataBlock({ label, value, icon, color = "#fff" }: any) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ fontSize: '0.55rem', color: '#94a3b8', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>{icon} {label}</div>
      <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color }}>{value || '---'}</div>
    </div>
  );
}
