import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import { useMetricsStore } from '../store/useMetricsStore';
import { Navigation, Rocket, Zap, Crosshair, Play, Pause, X, ExternalLink, Database, Activity } from 'lucide-react';

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
    iss, satellites, earthquakes, newsEvents, intelEvents,
    setSelectedFlight,
    selectedSatellite, setSelectedSatellite,
    selectedISS, setSelectedISS,
    threatAlerts, aiStatus,
    vessels, selectedVessel, setSelectedVessel
  } = useMetricsStore();
  
  const [isRotating, setIsRotating] = useState(true);
  const [selectedThreat, setSelectedThreat] = useState<any>(null);
  const [selectedEarthquake, setSelectedEarthquake] = useState<any>(null);
  const [selectedNews, setSelectedNews] = useState<any>(null);
  const [selectedIntel, setSelectedIntel] = useState<any>(null);



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

  const objectThreeObject = useCallback((d: any) => {
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
  }, []);

  const ringsData = useMemo(() => {
    const rings: any[] = [];
    (earthquakes || []).forEach(q => rings.push({ lat: q.lat, lng: q.lng, maxR: Math.max(q.mag * 2, 2), propagationSpeed: 2, repeatPeriod: 800, color: 'rgba(245, 158, 11, 0.7)' }));
    (newsEvents || []).forEach(n => { if (n.lat && n.lng) rings.push({ lat: n.lat, lng: n.lng, maxR: 3, propagationSpeed: 1, repeatPeriod: 2000, color: 'rgba(239, 68, 68, 0.8)' }); });

    // V9.0: AI Tehdit Halkaları
    // Koordinat haritası: topic -> yaklaşık bölge merkezi
    const topicCoords: Record<string, { lat: number; lng: number }> = {
      military:      { lat: 35.0, lng: 39.0 },   // Orta Doğu
      cyber:         { lat: 39.9, lng: 116.4 },   // Pekin
      nuclear:       { lat: 35.7, lng: 51.4 },    // Tahran
      sanctions:     { lat: 55.7, lng: 37.6 },    // Moskova
      intelligence:  { lat: 38.9, lng: -77.0 },   // Washington DC
      maritime:      { lat: 10.0, lng: 114.0 },    // Güney Çin Denizi
    };
    (threatAlerts || []).forEach(t => {
      const dbLat = (t as any).lat;
      const dbLng = (t as any).lng;
      const coords = topicCoords[t.topicId];
      const finalLat = dbLat !== undefined ? dbLat : coords?.lat;
      const finalLng = dbLng !== undefined ? dbLng : coords?.lng;
      
      if (finalLat !== undefined && finalLng !== undefined) {
        rings.push({
          ...t, // Orijinal veriyi taşı (tıklama için)
          lat: finalLat,
          lng: finalLng,
          maxR: Math.max(t.severity * 8, 3),
          propagationSpeed: 3,
          repeatPeriod: 600,
          color: `rgba(239, 68, 68, ${Math.min(t.severity, 0.95)})`,
        });
      }
    });

    return rings;
  }, [earthquakes, newsEvents, threatAlerts]);

  const pathsData = useMemo(() => {
    return (satellites || []).filter(s => s.path && s.path.length > 0).map(s => ({
      coords: s.path?.map(p => [p.lat, p.lng]),
      color: 'rgba(255, 255, 255, 0.1)'
    }));
  }, [satellites]);

  // V9.1: Tıklama yakalamak için görünmez/yarı-saydam noktalar
  const pointsData = useMemo(() => {
    const topicCoords: Record<string, { lat: number; lng: number }> = {
      military:      { lat: 35.0, lng: 39.0 },
      cyber:         { lat: 39.9, lng: 116.4 },
      nuclear:       { lat: 35.7, lng: 51.4 },
      sanctions:     { lat: 55.7, lng: 37.6 },
      intelligence:  { lat: 38.9, lng: -77.0 },
      maritime:      { lat: 10.0, lng: 114.0 },
    };

    const topicColors: Record<string, string> = {
      military: '#ef4444', cyber: '#a855f7', nuclear: '#f59e0b',
      sanctions: '#3b82f6', intelligence: '#06b6d4', maritime: '#22d3ee',
      terrorism: '#dc2626', geopolitics: '#fbbf24', conflict: '#f97316',
      diplomacy: '#60a5fa'
    };

    // 0. Intel Noktaları
    const intelPoints = (intelEvents || []).map(i => {
      const dbLat = (i as any).lat;
      const dbLng = (i as any).lng;
      const fallback = topicCoords[i.topicId];
      const finalLat = dbLat !== undefined ? dbLat : fallback?.lat;
      const finalLng = dbLng !== undefined ? dbLng : fallback?.lng;
      
      return {
        ...i,
        lat: finalLat, lng: finalLng,
        size: 0.5, color: topicColors[i.topicId] || '#94a3b8', __type: 'intel'
      };
    }).filter((p: any) => p.lat != null && p.lng != null);

    // 1. Tehdit Noktaları
    const threatPoints = (threatAlerts || []).map(t => {
      const dbLat = (t as any).lat;
      const dbLng = (t as any).lng;
      const coords = topicCoords[t.topicId];
      const finalLat = dbLat !== undefined ? dbLat : (coords?.lat || 0);
      const finalLng = dbLng !== undefined ? dbLng : (coords?.lng || 0);
      return { ...t, lat: finalLat, lng: finalLng, size: 0.6, color: '#ef4444', __type: 'threat' };
    }).filter(p => p.lat !== 0);

    // 2. Deprem Noktaları
    const quakePoints = (earthquakes || []).map(q => ({
      ...q, size: 0.8, color: '#facc15', __type: 'earthquake'
    }));

    // 3. Haber Noktaları
    const newsPoints = (newsEvents || []).map(n => ({
      ...n, size: 0.5, color: '#ef4444', __type: 'news'
    })).filter(p => p.lat != null && p.lng != null);

    // 4. Gemi (Maritime) Noktaları (V10.0)
    const vesselPoints = (vessels || []).map(v => ({
      ...v, size: 0.4, color: '#2dd4bf', __type: 'vessel'
    }));

    return [...intelPoints, ...threatPoints, ...quakePoints, ...newsPoints, ...vesselPoints];
  }, [threatAlerts, earthquakes, newsEvents, intelEvents, vessels]);


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
        pointsData={pointsData}
        pointColor="color"
        pointRadius="size"
        pointAltitude={0.01}
        onPointClick={(pt: any) => {
          setSelectedFlight(null);
          setSelectedSatellite(null);
          setSelectedISS(false);
          setSelectedThreat(null);
          setSelectedEarthquake(null);
          setSelectedNews(null);
          setSelectedVessel(null);
          setSelectedIntel(null);

          if (pt.__type === 'threat') setSelectedThreat(pt);
          if (pt.__type === 'earthquake') setSelectedEarthquake(pt);
          if (pt.__type === 'news') setSelectedNews(pt);
          if (pt.__type === 'vessel') setSelectedVessel(pt);
          if (pt.__type === 'intel') setSelectedIntel(pt);
        }}
        onGlobeClick={() => { 
          setSelectedFlight(null); 
          setSelectedSatellite(null); 
          setSelectedISS(false); 
          setSelectedThreat(null);
          setSelectedEarthquake(null);
          setSelectedNews(null);
          setSelectedVessel(null);
          setSelectedIntel(null);
        }}
      />

      <div style={{ position: 'absolute', bottom: '150px', left: '26rem', zIndex: 100, display: 'flex', gap: '8px' }}>
        <button onClick={() => setIsRotating(!isRotating)} style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '12px', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', cursor: 'pointer', backdropFilter: 'blur(8px)', font: 'bold 10px monospace' }}>
          {isRotating ? <Pause size={14} /> : <Play size={14} />} {isRotating ? 'DÖNÜŞÜ DURDUR' : 'DÖNÜŞÜ BAŞLAT'}
        </button>
      </div>

      {/* V9.0: AI Durum Göstergesi */}
      <div style={{
        position: 'absolute', top: '20px', right: '26rem', zIndex: 100,
        background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)',
        border: `1px solid ${aiStatus === 'ready' ? 'rgba(34, 197, 94, 0.5)' : aiStatus === 'processing' ? 'rgba(234, 179, 8, 0.5)' : aiStatus === 'error' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(100, 116, 139, 0.3)'}`,
        borderRadius: '12px', padding: '10px 16px', font: 'bold 10px monospace', color: '#94a3b8'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: aiStatus === 'ready' ? '#22c55e' : aiStatus === 'processing' ? '#eab308' : aiStatus === 'loading' ? '#3b82f6' : aiStatus === 'error' ? '#ef4444' : '#475569',
            boxShadow: aiStatus === 'ready' ? '0 0 8px #22c55e' : aiStatus === 'processing' ? '0 0 8px #eab308' : 'none',
            animation: (aiStatus === 'loading' || aiStatus === 'processing') ? 'pulse 1.5s infinite' : 'none'
          }} />
          <span style={{ color: '#e2e8f0', letterSpacing: '1px' }}>
            AI ENGINE: {aiStatus === 'ready' ? 'OPERATIONAL' : aiStatus === 'loading' ? 'LOADING MODEL...' : aiStatus === 'processing' ? 'ANALYZING...' : aiStatus === 'error' ? 'OFFLINE' : 'STANDBY'}
          </span>
        </div>
        {threatAlerts.length > 0 && (
          <div style={{ marginTop: '6px', color: '#ef4444', fontSize: '9px' }}>
            ⚠ {threatAlerts.length} THREAT{threatAlerts.length > 1 ? 'S' : ''} DETECTED
          </div>
        )}
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

        {selectedThreat && (
          <div className="intel-card" style={{ 
            pointerEvents: 'auto', 
            background: 'rgba(127, 29, 29, 0.85)', 
            backdropFilter: 'blur(12px)', 
            border: '1px solid #ef4444', 
            borderRadius: '12px', 
            padding: '16px', 
            width: '320px', 
            boxShadow: '0 8px 32px rgba(239, 68, 68, 0.3)', 
            animation: 'slideRight 0.3s ease-out' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '0.6rem', color: '#fca5a5', fontWeight: 'bold', letterSpacing: '1px' }}>
                  AI THREAT IDENTIFIED: {selectedThreat.topicId.toUpperCase()}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff', marginTop: '4px', lineHeight: '1.4' }}>
                  {selectedThreat.title}
                </div>
              </div>
              <button 
                onClick={() => setSelectedThreat(null)} 
                style={{ background: 'transparent', border: 'none', color: '#fecaca', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.6rem', color: '#fca5a5' }}>RISK SCORE</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#ef4444' }}>%{Math.round(selectedThreat.severity * 100)}</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.6rem', color: '#fca5a5' }}>TIMESTAMP</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#fff' }}>
                  {new Date(selectedThreat.time).toLocaleTimeString()}
                </div>
              </div>
            </div>
            
            <div style={{ 
              marginTop: '12px', 
              fontSize: '0.65rem', 
              color: '#fecaca', 
              fontStyle: 'italic',
              borderTop: '1px solid rgba(239, 68, 68, 0.2)',
              paddingTop: '8px'
            }}>
              Autonomous analysis performed by local ONNX engine. Severity level constitutes a critical anomalous baseline.
            </div>
          </div>
        )}

        {selectedEarthquake && (
          <div className="intel-card" style={{ pointerEvents: 'auto', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)', border: '1px solid #facc15', borderRadius: '12px', padding: '16px', width: '280px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', animation: 'slideRight 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div><div style={{ fontSize: '0.6rem', color: '#facc15', fontWeight: 'bold' }}>SEISMIC ACTIVITY</div><div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff' }}>Magnitude {selectedEarthquake.mag}</div></div>
              <button onClick={() => setSelectedEarthquake(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '12px' }}>{selectedEarthquake.title}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <DataBlock label="LATITUDE" value={`${selectedEarthquake.lat?.toFixed(2)}°`} icon={<Crosshair size={10}/>} />
              <DataBlock label="LONGITUDE" value={`${selectedEarthquake.lng?.toFixed(2)}°`} icon={<Crosshair size={10}/>} />
              <DataBlock label="TIME" value={new Date(selectedEarthquake.time).toLocaleTimeString()} icon={<Zap size={10}/>} />
              <DataBlock label="DEPTH" value="N/A" icon={<Navigation size={10}/>} />
            </div>
          </div>
        )}

        {selectedIntel && (
          <div className="intel-card" style={{ pointerEvents: 'auto', background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)', border: '1px solid #06b6d4', borderRadius: '12px', padding: '16px', width: '320px', boxShadow: '0 8px 32px rgba(6, 182, 212, 0.2)', animation: 'slideRight 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '0.6rem', color: '#22d3ee', fontWeight: 'bold', letterSpacing: '1px' }}>
                  GEOPOLITICAL INTEL: {selectedIntel.topicId?.toUpperCase()}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff', marginTop: '4px', lineHeight: '1.4' }}>
                  {selectedIntel.source}
                </div>
              </div>
              <button onClick={() => setSelectedIntel(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '12px', lineHeight: '1.4' }}>
              {selectedIntel.title}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{selectedIntel.date}</span>
              {selectedIntel.url && (
                <a href={selectedIntel.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.7rem', color: '#38bdf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Kaynak <ExternalLink size={10} />
                </a>
              )}
            </div>
          </div>
        )}

        {selectedNews && (
          <div className="intel-card" style={{ pointerEvents: 'auto', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)', border: '1px solid #ef4444', borderRadius: '12px', padding: '16px', width: '300px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', animation: 'slideRight 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div><div style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: 'bold' }}>GLOBAL INCIDENT</div><div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#fff' }}>{selectedNews.source}</div></div>
              <button onClick={() => setSelectedNews(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#fff', marginBottom: '12px', lineHeight: '1.4' }}>{selectedNews.title}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
              <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>{new Date(selectedNews.time).toLocaleString()}</span>
              {selectedNews.url && (
                <a href={selectedNews.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.7rem', color: '#38bdf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Detaya Git <ExternalLink size={10} />
                </a>
              )}
            </div>
          </div>
        )}

        {selectedVessel && (
          <div className="intel-card" style={{ pointerEvents: 'auto', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)', border: '1px solid #2dd4bf', borderRadius: '12px', padding: '16px', width: '280px', boxShadow: '0 8px 32px rgba(45, 212, 191, 0.2)', animation: 'slideRight 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div><div style={{ fontSize: '0.6rem', color: '#2dd4bf', fontWeight: 'bold' }}>MARITIME ASSET</div><div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>{selectedVessel.name.slice(0, 15)}</div></div>
              <button onClick={() => setSelectedVessel(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <DataBlock label="MMSI" value={selectedVessel.mmsi} icon={<Database size={10}/>} color="#2dd4bf" />
              <DataBlock label="SPEED" value={`${selectedVessel.speed} kn`} icon={<Zap size={10}/>} />
              <DataBlock label="COURSE" value={`${selectedVessel.course}°`} icon={<Navigation size={10}/>} />
              <DataBlock label="LAST SEE" value={new Date(selectedVessel.lastUpdate).toLocaleTimeString()} icon={<Activity size={10}/>} />
            </div>
            <div style={{ marginTop: '10px', fontSize: '0.65rem', color: '#94a3b8', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '4px' }}>
              FLAG: {selectedVessel.flag} // AIS STREAM: POSITION_REPORT
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
