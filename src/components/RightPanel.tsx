import { useState } from 'react';
import { useMetricsStore } from '../store/useMetricsStore';
import { Plane, Activity, Rocket, ChevronRight, BarChart3, Ship } from 'lucide-react';
import { APP_NAME, APP_VERSION } from '../config';

export default function RightPanel() {
  const { flights, earthquakes, iss, satellites, vessels } = useMetricsStore();
  const [isOpen, setIsOpen] = useState(true);

  const maxMag = (earthquakes || []).length > 0 ? Math.max(...earthquakes.map(q => q.mag)) : 0;
  
  return (
    <div style={{ position: 'absolute', top: '110px', right: 0, zIndex: 100, display: 'flex', alignItems: 'flex-start' }}>
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          style={{ 
            background: 'rgba(10, 15, 25, 0.9)', 
            border: '1px solid rgba(56, 189, 248, 0.3)', 
            borderRight: 'none', 
            borderRadius: '12px 0 0 12px', 
            padding: '16px 10px', 
            color: '#38bdf8', 
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
            transition: 'all 0.3s ease'
          }}
        >
          <BarChart3 size={22} />
        </button>
      )}

      {isOpen && (
        <div className="glass-panel animate-slide-right" style={{ 
          width: '320px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px', 
          padding: '24px', 
          background: 'rgba(10, 15, 25, 0.85)', 
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRight: 'none',
          borderRadius: '20px 0 0 20px',
          boxShadow: '-20px 25px 60px rgba(0,0,0,0.6)'
        }}>
          
          {/* ANALYTICS HEADER */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid rgba(56, 189, 248, 0.1)', paddingBottom: '12px' }}>
            <button onClick={() => setIsOpen(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px', borderRadius: '50%' }}>
                <ChevronRight size={18} />
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                <div style={{ fontSize: '0.6rem', color: '#38bdf8', letterSpacing: '3px', fontWeight: 'bold' }}>HUB ANALYTICS</div>
                <div style={{ fontSize: '1rem', fontWeight: '900', color: '#fff', fontFamily: 'Orbitron, sans-serif' }}>CORE SYSTEMS</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <AnalyticCell 
              icon={<Plane size={20} />} 
              label="AERIAL ENTITY (LIVE)" 
              value={flights.length} 
              subText="LIVE TRANSPONDER FEEDS"
              color="#facc15"
            />

            <AnalyticCell 
              icon={<Ship size={20} />} 
              label="MARITIME ENTITY (AIS)" 
              value={vessels.length} 
              subText="LIVE VESSEL TRACKING"
              color="#22d3ee"
            />

            <AnalyticCell 
              icon={<Rocket size={20} />} 
              label="SATELLITE / ISS NODE" 
              value={satellites.length + (iss ? 1 : 0)} 
              subText="FLIGHT PATHS CALCULATED"
              color="#a855f7"
            />

            <AnalyticCell 
              icon={<Activity size={20} />} 
              label="SEISMIC EVENT (QUAKE)" 
              value={`${maxMag.toFixed(1)} M`} 
              subText="STABILITY: NOMINAL"
              color="#f59e0b"
            />
          </div>

          <div style={{ marginTop: '12px', padding: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
             <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.2)', fontWeight: 'bold', letterSpacing: '2px', fontFamily: 'monospace' }}>
               {APP_NAME} // V{APP_VERSION} 
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalyticCell({ icon, label, value, subText, color }: any) {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '14px', 
      padding: '14px', 
      background: 'rgba(255,255,255,0.02)', 
      borderRadius: '14px', 
      border: '1px solid rgba(255,255,255,0.05)'
    }}>
      <div style={{ 
        background: `${color}15`, 
        padding: '10px', 
        borderRadius: '10px', 
        border: `1px solid ${color}30`,
        color: color 
      }}>
        {icon}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', letterSpacing: '1px' }}>{label}</div>
        <div style={{ color: '#fff', fontSize: '1.2rem', fontWeight: '900', fontFamily: 'Orbitron, sans-serif' }}>{value}</div>
        <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.2)', marginTop: '2px', fontFamily: 'monospace' }}>{subText}</div>
      </div>
    </div>
  );
}

