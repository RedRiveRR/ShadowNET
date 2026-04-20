import { useMetricsStore } from '../store/useMetricsStore';
import { Plane, Activity, Rocket, Newspaper } from 'lucide-react';
import { APP_NAME, APP_VERSION } from '../config';

export default function RightPanel() {
  const { flights, earthquakes, iss, satellites, newsEvents } = useMetricsStore();

  const maxMag = (earthquakes || []).length > 0 ? Math.max(...earthquakes.map(q => q.mag)) : 0;
  
  return (
    <div className="glass-panel animate-slide-right" style={{ position: 'absolute', top: '2rem', right: '2rem', width: '300px', display: 'flex', flexDirection: 'column', gap: '1rem', zIndex: 10, padding: '1.25rem', background: 'rgba(10,15,25,0.95)', border: '1px solid rgba(56,189,248,0.25)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid rgba(56, 189, 248, 0.1)', paddingBottom: '0.75rem', marginBottom: '0.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Activity color="#38bdf8" size={18} style={{ marginRight: '10px' }} />
          <h2 style={{ fontSize: '0.9rem', color: '#fff', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase' }}>DEEP TELEMETRY HUB</h2>
        </div>
        <div style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
        <MetricCard 
          icon={<Plane size={16} />} 
          label="AERIAL ASSETS (ADS-B)" 
          value={flights.length} 
          color="#38bdf8" 
          bg="rgba(56, 189, 248, 0.05)"
        />
        <MetricCard 
          icon={<Newspaper size={16} />} 
          label="INTEL INCIDENTS (GDELT)" 
          value={newsEvents.length} 
          suffix="EVENTS"
          color="#ef4444" 
          bg="rgba(239, 68, 68, 0.05)"
        />
        <MetricCard 
          icon={<Rocket size={16} />} 
          label="SPACEBORNE ASSETS" 
          value={satellites.length + (iss ? 1 : 0)} 
          suffix="OBJECTS"
          color="#a855f7" 
          bg="rgba(168, 85, 247, 0.05)"
        />
        <MetricCard 
          icon={<Activity size={16} />} 
          label="KINETIC MAGNITUDE (USGS)" 
          value={maxMag.toFixed(1)} 
          suffix="MAG"
          color="#22c55e" 
          bg="rgba(34, 197, 94, 0.05)"
        />
      </div>

      <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.5rem', color: '#64748b' }}>SYSTEM SECURITY</span>
            <span style={{ fontSize: '0.5rem', color: '#22c55e' }}>ENCRYPTED</span>
         </div>
         <div className="mono" style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 'bold', letterSpacing: '1px' }}>
           {APP_NAME} // CORE v{APP_VERSION}
         </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, color, bg, suffix = '' }: any) {
  return (
    <div style={{ padding: '0.75rem 1rem', background: bg, borderRadius: '8px', border: `1px solid ${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ color: color, opacity: 0.8 }}>{icon}</div>
        <span style={{ fontSize: '0.55rem', color: '#94a3b8', fontWeight: '900', letterSpacing: '1px' }}>{label}</span>
      </div>
      <div style={{ textAlign: 'right' }}>
        <span className="mono" style={{ fontSize: '1.2rem', fontWeight: '900', color: color }}>{value}</span>
        {suffix && <span style={{ fontSize: '0.5rem', color: '#64748b', marginLeft: '4px' }}>{suffix}</span>}
      </div>
    </div>
  );
}

