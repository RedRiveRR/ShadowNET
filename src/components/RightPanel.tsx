import { useMetricsStore } from '../store/useMetricsStore';
import { Plane, Globe, Activity, Rocket, Newspaper } from 'lucide-react';

export default function RightPanel() {
  const { flights, earthquakes, iss, satellites, newsEvents } = useMetricsStore();

  const maxMag = (earthquakes || []).length > 0 ? Math.max(...earthquakes.map(q => q.mag)) : 0;
  
  return (
    <div className="glass-panel animate-slide-right" style={{ position: 'absolute', top: '2rem', right: '2rem', width: '310px', display: 'flex', flexDirection: 'column', gap: '1.2rem', zIndex: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--panel-border)', paddingBottom: '1rem' }}>
        <Globe color="var(--color-flight)" size={24} style={{ marginRight: '10px' }} />
        <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>DÜNYA ANALİZ MERKEZİ</h2>
      </div>

      <div style={{ padding: '1.2rem', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
        <div style={{ background: 'var(--color-flight)', padding: '10px', borderRadius: '50%', marginRight: '1rem' }}>
          <Plane size={24} color="#020617"/>
        </div>
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>TAKİPTEKİ UÇAK SAYISI</p>
          <p className="mono" style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--color-flight)' }}>{flights.length}</p>
        </div>
      </div>

      <div style={{ padding: '1.2rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
        <div style={{ background: '#ef4444', padding: '10px', borderRadius: '50%', marginRight: '1rem' }}>
          <Newspaper size={24} color="#020617"/>
        </div>
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>DÜNYADAN HABERLER</p>
          <p className="mono" style={{ fontSize: '1.4rem', fontWeight: 600, color: '#ef4444' }}>{newsEvents.length} YENİ OLAY</p>
        </div>
      </div>

      <div style={{ padding: '1.2rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
        <div style={{ background: '#fff', padding: '10px', borderRadius: '50%', marginRight: '1rem' }}>
          <Rocket size={24} color="#020617"/>
        </div>
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>GÖKYÜZÜ (UYDU VE UKS)</p>
          <p className="mono" style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff' }}>{satellites.length + (iss ? 1 : 0)} NESNE</p>
        </div>
      </div>

      <div style={{ padding: '1.2rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
        <div style={{ background: 'var(--color-nature)', padding: '10px', borderRadius: '50%', marginRight: '1rem' }}>
          <Activity size={24} color="#020617"/>
        </div>
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>DEPREM ŞİDDETİ (MAX)</p>
          <p className="mono" style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--color-nature)' }}>{maxMag.toFixed(1)} M</p>
        </div>
      </div>

      <div style={{ marginTop: '0.5rem', padding: '1rem', borderTop: '1px solid var(--panel-border)', textAlign: 'center' }}>
         <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>SHADOWNET V7 - GLOBAL GÖZETLEME</div>
      </div>
    </div>
  );
}
