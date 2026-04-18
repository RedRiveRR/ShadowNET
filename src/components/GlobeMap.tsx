import { useEffect, useRef, useState, useMemo } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import { useMetricsStore } from '../store/useMetricsStore';

export default function GlobeMap() {
  const globeRef = useRef<any>();
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  const { earthquakes, flights, iss, disasters, cryptoWhales, satellites, newsEvents, torNodes } = useMetricsStore();

  const [zoomLevel, setZoomLevel] = useState(400);

  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    const interval = setInterval(() => {
      if (globeRef.current) {
        setZoomLevel(globeRef.current.controls().getDistance());
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
      controls.minDistance = 150;
      controls.maxDistance = 700;
      
      // Işıklandırma ayarları: Karanlık ülkeleri görünür kılmak için
      const scene = globeRef.current.scene();
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Genel aydınlatma
      scene.add(ambientLight);
      
      const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
      mainLight.position.set(1, 1, 1);
      scene.add(mainLight);
    }
  }, []);

  // 1. Depremler (Halkalar) - ONARILDI: Animasyon parametreleri eklendi
  const ringsData = useMemo(() => {
    return (earthquakes || []).map(q => ({
      lat: q.lat, 
      lng: q.lng, 
      maxR: q.mag * 2, 
      propagationSpeed: 1, 
      repeatPeriod: 1000, 
      color: 'rgba(245, 158, 11, 0.8)'
    }));
  }, [earthquakes]);

  // 2. Noktalar (Uçaklar, Uydular, Tor)
  const pointsData = useMemo(() => {
    const data: any[] = [];

    // Uçaklar (Geri Geldi)
    if (zoomLevel < 400) {
      flights.forEach(f => data.push({ lat: f.lat, lng: f.lng, color: '#38bdf8', radius: zoomLevel < 250 ? 0.25 : 0.15, type: 'flight' }));
    }

    // Tor Düğümleri
    if (zoomLevel < 300) {
      torNodes.forEach(n => data.push({ lat: n.lat, lng: n.lng, color: '#a855f7', radius: 0.1, type: 'tor' }));
    }

    // Uydular
    satellites.forEach(s => {
      if (s.lat !== undefined) {
        data.push({ lat: s.lat, lng: s.lng, altitude: s.alt || 0.1, color: '#f8fafc', radius: 0.08, type: 'satellite' });
      }
    });

    return data;
  }, [flights, torNodes, satellites, zoomLevel]);

  // 3. Yaylar (Bitcoin)
  const arcsData = useMemo(() => {
    return (cryptoWhales || []).map(w => ({
      startLat: w.startLat, startLng: w.startLng, endLat: w.endLat, endLng: w.endLng,
      color: '#fbbf24', altitude: 0.5, stroke: 1.2
    }));
  }, [cryptoWhales]);

  // 4. HTML Sinyaller (Haberler)
  const htmlData = useMemo(() => {
    const list = (newsEvents || []).map(n => ({ lat: n.lat, lng: n.lng, name: n.title, type: 'news' }));
    if (iss) list.push({ lat: iss.lat, lng: iss.lng, name: 'UKS (ISS)', type: 'iss' });
    return list;
  }, [newsEvents, iss]);

  const renderHtmlElement = (d: any) => {
    const el = document.createElement('div');
    if (d.type === 'iss') {
      el.innerHTML = `<div style="background: white; border-radius: 4px; padding: 2px 6px; box-shadow: 0 0 10px #fff; border: 1px solid #38bdf8; font-size: 9px; font-weight: bold; color: #000;">${d.name}</div>`;
    } else {
      el.innerHTML = `<div class="pulse-marker" style="width: 10px; height: 10px; background: #ef4444; border-radius: 50%; box-shadow: 0 0 15px #ef4444;"></div>`;
    }
    return el;
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1 }}>
      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        // Yüksek çözünürlüklü ve Premium Gece Dokusu
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="#000000"
        
        // Atmosfer ayarları (Karanlıkta sınırların belli olması için)
        showAtmosphere={true}
        atmosphereColor="#38bdf8"
        atmosphereAltitude={0.2}

        ringsData={ringsData}
        ringColor="color"
        ringMaxRadius="maxR"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod"
        
        pointsData={pointsData}
        pointColor="color"
        pointAltitude="altitude"
        pointRadius="radius"
        pointsMerge={false}
        pointTransitionDuration={1000}

        arcsData={arcsData}
        arcColor="color"
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={1000}
        arcAltitude="altitude"
        arcStroke="stroke"

        htmlElementsData={htmlData}
        htmlElement={renderHtmlElement}
        htmlAltitude={d => d.type === 'iss' ? 0.35 : 0.05}
      />
    </div>
  );
}
