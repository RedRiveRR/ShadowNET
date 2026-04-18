import { useEffect, useRef, useState, useMemo } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import { useMetricsStore } from '../store/useMetricsStore';

export default function GlobeMap() {
  const globeRef = useRef<any>();
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  const { earthquakes, flights, iss, disasters, cryptoWhales } = useMetricsStore();

  const [zoomLevel, setZoomLevel] = useState(400);

  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    
    // Zoom takibi için interval (Controls'tan mesafeyi çeker)
    const interval = setInterval(() => {
      if (globeRef.current) {
        const dist = globeRef.current.controls().getDistance();
        setZoomLevel(dist);
      }
    }, 500);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (globeRef.current) {
      const controls = globeRef.current.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5; 
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 150;
      controls.maxDistance = 600;
    }
  }, []);

  // UseMemo protects against constant recreation of massive loops
  const combinedRingsData = useMemo(() => {
    const qRings = (earthquakes || []).map(q => ({
      lat: q.lat,
      lng: q.lng,
      maxR: (q.mag || 1) * 1.5,
      propagationSpeed: 1,
      repeatPeriod: 800 + Math.random() * 1000,
      color: () => `rgba(245, 158, 11, ${0.4 + Math.random() * 0.4})` // Amber
    }));

    const dRings = (disasters || []).map(d => ({
      lat: d.lat,
      lng: d.lng,
      maxR: 8,
      propagationSpeed: 0.5,
      repeatPeriod: 1200,
      // Red for dangerous, green for low risk
      color: () => d.alertLevel === 'Red' ? 'rgba(239, 68, 68, 0.8)' : d.alertLevel === 'Orange' ? 'rgba(245, 158, 11, 0.8)' : 'rgba(34, 197, 94, 0.8)'
    }));

    return [...qRings, ...dRings];
  }, [earthquakes, disasters]);

    // Performans ve kullanıcı isteği: Çok uzaktayken uçakları gizle veya küçült
    // Sadece kamera 350 birimden daha yakınsa uçakları göster
    if (zoomLevel > 350) return [];

    return (flights || []).map(f => ({
      lat: f.lat,
      lng: f.lng,
      altitude: 0.01 + Math.random() * 0.01, 
      color: '#38bdf8', 
      radius: zoomLevel < 200 ? 0.25 : 0.12 // Yakınlaştıkça ikonlar büyüsün
    }));
  }, [flights, zoomLevel]);

  const attackArcs = useMemo(() => {
    return (cryptoWhales || []).map(w => ({
      startLat: w.startLat,
      startLng: w.startLng,
      endLat: w.endLat,
      endLng: w.endLng,
      color: '#fbbf24', // Golden color for Bitcoin whales
      altitude: 0.4, // Higher arcs
      stroke: 1.2
    }));
  }, [cryptoWhales]);

  const issDataArray = useMemo(() => {
    if (iss) return [{ lat: iss.lat, lng: iss.lng, altitude: 0.25 }];
    return [];
  }, [iss]);

  const issHtmlElement = () => {
    const el = document.createElement('div');
    el.innerHTML = `
      <div style="background: white; border-radius: 5px; padding: 2px 6px; box-shadow: 0 0 20px #fff; transform: translate(-50%, -50%); border: 2px solid #38bdf8; white-space: nowrap;">
        <span style="font-size: 10px; font-weight: 800; color: #020617; font-family: monospace;">UKS (ISS)</span>
      </div>
    `;
    return el;
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1, pointerEvents: 'auto' }}>
      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="#000000"
        
        ringsData={combinedRingsData}
        ringColor="color"
        ringMaxRadius="maxR"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod"

        pointsData={flightPoints}
        pointColor="color"
        pointAltitude="altitude"
        pointRadius="radius"
        pointsMerge={true} 

        arcsData={attackArcs}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor="color"
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={800}
        arcAltitude="altitude"
        arcStroke="stroke"

        htmlElementsData={issDataArray}
        htmlElement={issHtmlElement}
        htmlAltitude="altitude"
      />
    </div>
  );
}
