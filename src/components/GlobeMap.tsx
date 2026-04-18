import { useEffect, useRef, useState, useMemo } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import { useMetricsStore } from '../store/useMetricsStore';

export default function GlobeMap() {
  const globeRef = useRef<any>();
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const { earthquakes, flights, iss, cryptoWhales, satellites, newsEvents, torNodes } = useMetricsStore();
  const [zoomLevel, setZoomLevel] = useState(400);

  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    const zoomTracker = setInterval(() => {
      if (globeRef.current) setZoomLevel(globeRef.current.controls().getDistance());
    }, 500);
    return () => { window.removeEventListener('resize', handleResize); clearInterval(zoomTracker); };
  }, []);

  useEffect(() => {
    if (!globeRef.current) return;
    const controls = globeRef.current.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;
    controls.enableDamping = true;
    controls.minDistance = 150;
    controls.maxDistance = 700;
  }, []);

  // === DEPREM HALKALARI ===
  const ringsData = useMemo(() => {
    return (earthquakes || []).map(q => ({
      lat: q.lat, lng: q.lng,
      maxR: Math.max(q.mag * 2, 2),
      propagationSpeed: 2,
      repeatPeriod: 800,
      color: () => `rgba(245, 158, 11, ${0.5 + Math.random() * 0.3})`
    }));
  }, [earthquakes]);

  // === TÜM NOKTALAR (Uçak + Uydu + Tor) ===
  const pointsData = useMemo(() => {
    const pts: any[] = [];

    // Uçaklar (Mavi - her zaman göster, renderı performanslı)
    (flights || []).forEach(f => {
      pts.push({ lat: f.lat, lng: f.lng, altitude: 0.01, color: '#38bdf8', radius: zoomLevel < 250 ? 0.3 : 0.15 });
    });

    // Uydular (Beyaz)
    (satellites || []).forEach(s => {
      if (s.lat != null && s.lng != null) {
        pts.push({ lat: s.lat, lng: s.lng, altitude: s.alt || 0.08, color: '#e2e8f0', radius: 0.06 });
      }
    });

    // Tor Düğümleri (Mor - yakınlaşınca)
    if (zoomLevel < 350) {
      (torNodes || []).forEach(n => {
        if (n.lat && n.lng) pts.push({ lat: n.lat, lng: n.lng, altitude: 0.005, color: '#a855f7', radius: 0.1 });
      });
    }

    return pts;
  }, [flights, satellites, torNodes, zoomLevel]);

  // === KRİPTO BALINAKLARI ===
  const arcsData = useMemo(() => {
    return (cryptoWhales || []).map(w => ({
      startLat: w.startLat, startLng: w.startLng, endLat: w.endLat, endLng: w.endLng,
      color: '#fbbf24', altitude: 0.4, stroke: 1.5
    }));
  }, [cryptoWhales]);

  // === HTML İŞARETÇİLER (ISS + Haberler) ===
  const htmlData = useMemo(() => {
    const list: any[] = [];
    if (iss) list.push({ lat: iss.lat, lng: iss.lng, type: 'iss', label: 'UKS (ISS)' });
    (newsEvents || []).forEach(n => {
      list.push({ lat: n.lat, lng: n.lng, type: 'news', label: n.title?.slice(0, 30) + '...' });
    });
    return list;
  }, [iss, newsEvents]);

  const renderHtmlElement = (d: any) => {
    const el = document.createElement('div');
    if (d.type === 'iss') {
      el.innerHTML = `<div style="background:white;border-radius:4px;padding:2px 6px;box-shadow:0 0 15px #fff;border:1px solid #38bdf8;font:bold 9px monospace;color:#000;white-space:nowrap;">${d.label}</div>`;
    } else {
      el.innerHTML = `<div style="width:8px;height:8px;background:#ef4444;border-radius:50%;box-shadow:0 0 12px #ef4444;"></div>`;
    }
    return el;
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1 }}>
      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="#000000"
        showAtmosphere={true}
        atmosphereColor="#4fc3f7"
        atmosphereAltitude={0.18}

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
        pointTransitionDuration={9000}

        arcsData={arcsData}
        arcColor="color"
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={800}
        arcAltitude="altitude"
        arcStroke="stroke"

        htmlElementsData={htmlData}
        htmlElement={renderHtmlElement}
        htmlAltitude={(d: any) => d.type === 'iss' ? 0.35 : 0.03}
      />
    </div>
  );
}
