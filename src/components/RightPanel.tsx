import { useMetricsStore } from '../store/useMetricsStore';
import { Plane, ShieldAlert, Globe, Activity, Rocket } from 'lucide-react';

export default function RightPanel() {
  const { flights, earthquakes, iss, securityAlerts } = useMetricsStore();

  const maxMag = (earthquakes || []).length > 0 ? Math.max(...earthquakes.map(q => q.mag)) : 0;
  
  return (
    <div className="glass-panel animate-slide-right" style={{ position: 'absolute', top: '2rem', right: '2rem', width: '310px', display: 'flex', flexDirection: 'column', gap: '1.2rem', zIndex: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--panel-border)', paddingBottom: '1rem' }}>
        <Globe color="var(--color-flight)" size={24} style={{ marginRight: '10px' }} />
        <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>CANLI İSTİHBARAT AKIŞI</h2>
      </div>

      <div style={{ padding: '1.2rem', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
        <div style={{ background: 'var(--color-flight)', padding: '10px', borderRadius: '50%', marginRight: '1rem', boxShadow: '0 0 15px var(--color-flight-glow)' }}>
          <Plane size={24} color="#020617"/>
        </div>
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>KÜRESEL ASKERİ RADAR</p>
          <p className="mono" style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--color-flight)' }}>{(flights || []).length}</p>
        </div>
      </div>
      
      {iss && (
        <div style={{ padding: '1.2rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
          <div style={{ background: '#fff', padding: '10px', borderRadius: '50%', marginRight: '1rem', boxShadow: '0 0 15px rgba(255,255,255,0.5)' }}>
            <Rocket size={24} color="#020617"/>
          </div>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>ISS HIZ VE İRTİFASI</p>
            <p className="mono" style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff' }}>{iss.velocity.toFixed(0)} <span style={{fontSize:'0.8rem'}}>kmh</span></p>
            <p className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>İrtifa: {iss.altitude.toFixed(1)} km</p>
          </div>
        </div>
      )}

      <div style={{ padding: '1.2rem', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
        <div style={{ background: 'var(--color-cyber)', padding: '10px', borderRadius: '50%', marginRight: '1rem', boxShadow: '0 0 15px var(--color-cyber-glow)' }}>
          <ShieldAlert size={24} color="#020617"/>
        </div>
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>SİBER TEHDİT SEVİYESİ</p>
          <p className="mono" style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--color-cyber)' }}>
            {(securityAlerts || []).filter(a => a.type === 'OTX' || a.type === 'CVE' || a.type === 'BGP' || a.type === 'MALWARE').length > 0 ? 'AKTİF (DİKKAT)' : 'BAKIMDA'}
          </p>
        </div>
      </div>

      <div style={{ padding: '1.2rem', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
        <div style={{ background: 'var(--color-nature)', padding: '10px', borderRadius: '50%', marginRight: '1rem', boxShadow: '0 0 15px var(--color-nature-glow)' }}>
          <Activity size={24} color="#020617"/>
        </div>
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>MAKS. SİSMİK ŞİDDET</p>
          <p className="mono" style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--color-nature)' }}>{Math.max(0, maxMag).toFixed(1)} M</p>
        </div>
      </div>

      <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
         <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>KÜRESEL İSTİHBARAT AĞI - AKTİF (v4.0)</div>
         <div style={{ height: '2px', width: '40%', margin: '0.5rem auto', background: 'linear-gradient(90deg, transparent, var(--text-secondary), transparent)'}}></div>
      </div>
    </div>
  );
}
