import { useMetricsStore } from '../store/useMetricsStore';
import { Plane, ShieldAlert, Globe, Activity, Rocket, Newspaper, Share2 } from 'lucide-react';

export default function RightPanel() {
  const { flights, earthquakes, iss, securityAlerts, satellites, newsEvents, torNodes } = useMetricsStore();

  const maxMag = (earthquakes || []).length > 0 ? Math.max(...earthquakes.map(q => q.mag)) : 0;
  
  return (
    <div className="glass-panel animate-slide-right" style={{ position: 'absolute', top: '2rem', right: '2rem', width: '310px', display: 'flex', flexDirection: 'column', gap: '1.2rem', zIndex: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--panel-border)', paddingBottom: '1rem' }}>
        <Globe color="var(--color-flight)" size={24} style={{ marginRight: '10px' }} />
        <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>KÜRESEL DURUM ANALİZİ</h2>
      </div>

      {/* Satellite & Data Nodes */}
      <div className="status-grid-mini" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '8px' }}>
          <p style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>AKTİF UYDULAR</p>
          <p className="mono" style={{ fontSize: '1.2rem', color: '#f8fafc' }}>{satellites.length ? satellites.length : 'TARANIYOR'}</p>
        </div>
        <div style={{ background: 'rgba(168,85,247,0.1)', padding: '0.8rem', borderRadius: '8px' }}>
          <p style={{ fontSize: '0.6rem', color: '#a855f7' }}>TOR DÜĞÜMLERİ</p>
          <p className="mono" style={{ fontSize: '1.2rem', color: '#a855f7' }}>{torNodes.length ? torNodes.length : 'SENKRON'}</p>
        </div>
      </div>

      <div style={{ padding: '1.2rem', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
        <div style={{ background: 'var(--color-flight)', padding: '10px', borderRadius: '50%', marginRight: '1rem' }}>
          <Plane size={24} color="#020617"/>
        </div>
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>ASKERİ/VIP RADAR</p>
          <p className="mono" style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--color-flight)' }}>{flights.length}</p>
        </div>
      </div>

      <div style={{ padding: '1.2rem', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
        <div style={{ background: '#ef4444', padding: '10px', borderRadius: '50%', marginRight: '1rem' }}>
          <Newspaper size={24} color="#020617"/>
        </div>
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>GDELT HABER AKIŞI</p>
          <p className="mono" style={{ fontSize: '1.4rem', fontWeight: 600, color: '#ef4444' }}>{newsEvents.length} YENİ OLAY</p>
        </div>
      </div>

      <div style={{ padding: '1.2rem', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
        <div style={{ background: 'var(--color-nature)', padding: '10px', borderRadius: '50%', marginRight: '1rem' }}>
          <Activity size={24} color="#020617"/>
        </div>
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>SİSMİK TEHLİKE (MAX)</p>
          <p className="mono" style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--color-nature)' }}>{maxMag.toFixed(1)} M</p>
        </div>
      </div>

      <div style={{ marginTop: '0.5rem', padding: '1rem', borderTop: '1px solid var(--panel-border)' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>KÜRESEL RİSK ENDEKSİ</span>
            <span className="mono" style={{ fontSize: '0.7rem', color: newsEvents.length > 10 ? '#ef4444' : '#22c55e' }}>
              {newsEvents.length > 10 ? 'KRİTİK' : 'STABİL'}
            </span>
         </div>
         <div style={{ height: '4px', background: '#1e293b', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, newsEvents.length * 5)}%`, background: 'var(--color-cyber)' }}></div>
         </div>
      </div>
    </div>
  );
}
