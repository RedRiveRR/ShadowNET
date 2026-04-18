import { useEffect, useRef, useState } from 'react';
import { useMetricsStore } from '../store/useMetricsStore';
import { X, List } from 'lucide-react';

export default function RadarMap2D() {
  const { flights, selectedFlight, setSelectedFlight } = useMetricsStore();
  const lastUpdateRef = useRef<number>(Date.now());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // DOM ve State Referansları (Performans İçin)
  const flightRefs = useRef(new Map<string, SVGGElement>());
  const flightStateRef = useRef(new Map<string, { lat: number, lng: number }>());
  const mapGroupRef = useRef<SVGGElement>(null);
  
  // Pan-Zoom Referansları
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const isDragging = useRef(false);
  const startDrag = useRef({ x: 0, y: 0 });
  const dragDistance = useRef(0); // Tıklama sorununu çözmek için

  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sınır Çizgilerini Kontrol Eden Güvenlik (Boşluğa Düşmeyi Engeller)
  const clampTransform = () => {
    const t = transformRef.current;
    if (t.k < 1) t.k = 1; // Minimum zoom tam ekran boyutunu korur
    
    // Zoom 1 ise (k=1), hareket (pan) edemeyiz x=0, y=0 olmalı
    const minX = dimensions.width * (1 - t.k);
    const minY = dimensions.height * (1 - t.k);
    
    t.x = Math.max(minX, Math.min(0, t.x));
    t.y = Math.max(minY, Math.min(0, t.y));
  };

  // === NATIVE PAN & ZOOM LİSTENERLARI ===
  const onPointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    dragDistance.current = 0; // Mesafe sıfırlanır
    startDrag.current = { x: e.clientX - transformRef.current.x, y: e.clientY - transformRef.current.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    dragDistance.current += Math.abs(e.movementX) + Math.abs(e.movementY); // Fare hareket miktarını ölç
    transformRef.current.x = e.clientX - startDrag.current.x;
    transformRef.current.y = e.clientY - startDrag.current.y;
    clampTransform();
  };
  
  const onPointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onWheel = (e: React.WheelEvent) => {
    const { clientX, clientY, deltaY } = e;
    const factor = deltaY > 0 ? 0.85 : 1.15; // Fare tekerleği hassasiyeti
    const t = transformRef.current;
    
    // Cursor'a doğru yakınlaştırma matematiği
    t.x = clientX - (clientX - t.x) * factor;
    t.y = clientY - (clientY - t.y) * factor;
    t.k = Math.max(1, Math.min(t.k * factor, 150)); // Max 150x zoom, min 1x
    
    clampTransform();
  };

  // === 60 FPS INTERPOLATION & ZOOM LOOP ===
  useEffect(() => {
    let frameId: number;
    const animate = () => {
      const now = Date.now();
      const dt = now - lastUpdateRef.current;
      lastUpdateRef.current = now;

      // 1. Zoom/Pan arkaplana uygula
      if (mapGroupRef.current) {
        const { x, y, k } = transformRef.current;
        mapGroupRef.current.setAttribute('transform', `translate(${x}, ${y}) scale(${k})`);
      }

      // 2. Uçakların pozisyonlarını hesapla
      const currentFlights = useMetricsStore.getState().flights || [];
      const VISUAL_SPEED_MULT = 40; // Gözle görülür hareket için hız çarpanı

      currentFlights.forEach(sf => {
        let state = flightStateRef.current.get(sf.id);
        const obj = flightRefs.current.get(sf.id);
        
        if (!state) {
          state = { lat: sf.lat, lng: sf.lng };
          flightStateRef.current.set(sf.id, state);
        }

        const v = sf.velocity_m_s || 0;
        const h = (90 - (sf.heading || 0)) * (Math.PI / 180);
        // Gerçek mesafeyi görsel bir çarpana tabi tutuyoruz
        const distMeters = (v * VISUAL_SPEED_MULT) * (dt / 1000);
        const R = 6371000;
        
        const dLat = (distMeters * Math.sin(h)) / R * (180 / Math.PI);
        const dLng = (distMeters * Math.cos(h)) / (R * Math.cos(state.lat * Math.PI / 180)) * (180 / Math.PI);

        state.lat += dLat;
        state.lng += dLng;

        state.lat += (sf.lat - state.lat) * 0.05;
        state.lng += (sf.lng - state.lng) * 0.05;

        // Ekrana Çizim (Frustum Culling = Görüş Dışı Uçakları Gizle / Kasma Önleyici)
        if (obj) {
          const localX = (state.lng + 180) * (dimensions.width / 360);
          const localY = (90 - state.lat) * (dimensions.height / 180);
          
          const t = transformRef.current;
          const invScale = 1 / Math.max(0.1, t.k);
          
          // Uçağın o anki gerçek EKRAN piksel değerini bul
          const screenX = localX * t.k + t.x;
          const screenY = localY * t.k + t.y;

          // Eğer ekran sınırları dışındaysa (View Boşa ise) Gizle (Performance Boost %80)
          const isVisible = screenX > -50 && screenX < dimensions.width + 50 && screenY > -50 && screenY < dimensions.height + 50;

          if (isVisible) {
            obj.style.display = 'block';
            obj.setAttribute('transform', `translate(${localX}, ${localY}) scale(${invScale})`);
          } else {
            obj.style.display = 'none'; // Sadece bellekte yaşasın ama çizilmesin
          }
        }
      });

      // Memory Cleanup
      const currentFlightIds = new Set(currentFlights.map(f => f.id));
      for (const id of flightStateRef.current.keys()) {
        if (!currentFlightIds.has(id)) {
          flightStateRef.current.delete(id);
          flightRefs.current.delete(id);
        }
      }

      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [dimensions]);

  const getCoords = (lat: number, lng: number) => {
    const x = (lng + 180) * (dimensions.width / 360);
    const y = (90 - lat) * (dimensions.height / 180);
    return { x, y };
  };

  // Sadece tıklama (Sürükleme varsa tetiklenmez)
  const handleFlightClick = (e: any, f: any) => {
    e.stopPropagation();
    setSelectedFlight(f);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#020617', overflow: 'hidden', display: 'flex' }}>
      
      {/* ANA RADAR EKRANI */}
      <div 
        style={{ flex: 1, position: 'relative', cursor: isDragging.current ? 'grabbing' : 'crosshair' }}
      >
        <svg 
          width="100%" 
          height="100%" 
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onWheel={onWheel}
          style={{ touchAction: 'none' }} // Farenin sayfayı kaydırmasını engeller
        >
          {/* Radar Izgarası Sabit Kalır */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(56, 189, 248, 0.05)" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" pointerEvents="none" />

          {/* DÜNYA VE UÇAKLARIN OLDUĞU ZOOM GRUBU */}
          <g ref={mapGroupRef}>
            
            {/* Yüksek Çözünürlüklü Vektörel Harita (Sonsuz Zoom yapılabilir, bozulmaz) */}
            <image 
              href="https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg" 
              width={dimensions.width} 
              height={dimensions.height} 
              preserveAspectRatio="none" 
              style={{ opacity: 0.25, filter: 'invert(1) sepia(1) saturate(5) hue-rotate(180deg) brightness(0.6)' }} 
            />

            {/* Uçaklar */}
            {(flights || []).map(f => {
              const isSelected = selectedFlight?.id === f.id;
              const initialCoords = getCoords(f.lat, f.lng);
              
              return (
                <g 
                  key={f.id} 
                  className="radar-flight-node"
                  ref={el => {
                    if (el) flightRefs.current.set(f.id, el);
                    else flightRefs.current.delete(f.id);
                  }}
                  transform={`translate(${initialCoords.x}, ${initialCoords.y}) scale(1)`} 
                  onPointerDown={(e) => {
                    // Tıklamada arka plan haritasının sürüklenmeyi (pointer capture) tetiklemesini engeller
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFlight(f);
                  }}
                  style={{ cursor: 'pointer', pointerEvents: 'all' }}
                >
                  {/* Etkileşim Hitbox Alanı (Tıklama Hassasiyetini Artırır) */}
                  <circle cx="0" cy="0" r="22" fill="transparent" />

                  <g transform={`rotate(${(f.heading || 0)})`}>
                    <path d="M0 -8 L-6 6 L0 3 L6 6 Z" fill={isSelected ? "#fff" : "#facc15"} />
                  </g>
                  
                  {/* Performans için metinler sadece seçili uçakta gösterilir */}
                  {isSelected && (
                    <>
                      <text y="15" textAnchor="middle" fill="#fff" fontSize="8" style={{ fontWeight: 'bold', pointerEvents: 'none' }}>
                        {f.callsign}
                      </text>
                      <text y="24" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="7" style={{ pointerEvents: 'none' }}>
                        {Math.round(f.alt / 100)}FL
                      </text>
                    </>
                  )}
                </g>
              );
            })}
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

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .radar-flight-node { will-change: transform; transition: none; }
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
