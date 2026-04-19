import { useMetricsStore } from '../store/useMetricsStore';
import { Plane, Globe, Activity, Rocket, Newspaper } from 'lucide-react';

export default function RightPanel() {
  const { flights, earthquakes, iss, satellites, newsEvents } = useMetricsStore();

  const maxMag = (earthquakes || []).length > 0 ? Math.max(...earthquakes.map(q => q.mag)) : 0;
  
  return (
    <div className="glass-panel animate-slide-right" style={{ position: 'absolute', top: '2rem', right: '2rem', width: '310px', display: 'flex', flexDirection: 'column', gap: '1.2rem', zIndex: 10, padding: '1.5rem', background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(56,189,248,0.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(56, 189, 248, 0.2)', paddingBottom: '1rem' }}>
        <Globe color="#38bdf8" size={24} style={{ marginRight: '10px' }} />
        <h2 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 'bold', letterSpacing: '1px' }}>HUB ANALYTICS</h2>
      </div>

      <div style={{ padding: '1.2rem', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center' }}>
        <div style={{ background: '#38bdf8', padding: '10px', borderRadius: '8px', marginRight: '1rem' }}>
          <Plane size={24} color="#020617"/>
        </div>
        <div>
          <p style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}>AERIAL TRAFFIC</p>
          <p className="mono" style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#38bdf8' }}>{flights.length}</p>
        </div>
      </div>

      <div style={{ padding: '1.2rem', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center' }}>
        <div style={{ background: '#ef4444', padding: '10px', borderRadius: '8px', marginRight: '1rem' }}>
          <Newspaper size={24} color="#020617"/>
        </div>
        <div>
          <p style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}>SITUATIONAL AWARENESS</p>
          <p className="mono" style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#ef4444' }}>{newsEvents.length} INCIDENTS</p>
        </div>
      </div>

      <div style={{ padding: '1.2rem', background: 'rgba(168, 85, 247, 0.08)', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.1)', display: 'flex', alignItems: 'center' }}>
        <div style={{ background: '#a855f7', padding: '10px', borderRadius: '8px', marginRight: '1rem' }}>
          <Rocket size={24} color="#020617"/>
        </div>
        <div>
          <p style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}>ORBITAL ASSETS</p>
          <p className="mono" style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#a855f7' }}>{satellites.length + (iss ? 1 : 0)} OBJECTS</p>
        </div>
      </div>

      <div style={{ padding: '1.2rem', background: 'rgba(34, 197, 94, 0.08)', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center' }}>
        <div style={{ background: '#22c55e', padding: '10px', borderRadius: '8px', marginRight: '1rem' }}>
          <Activity size={24} color="#020617"/>
        </div>
        <div>
          <p style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}>SEISMIC MAGNITUDE</p>
          <p className="mono" style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#22c55e' }}>{maxMag.toFixed(1)} M</p>
        </div>
      </div>

      <div style={{ marginTop: '0.5rem', padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
         <div className="mono" style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 'bold', letterSpacing: '1px' }}>SHADOWNET V8.0 // MASTER SYSTEMS</div>
      </div>
    </div>
  );
}
