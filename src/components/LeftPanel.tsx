import { useMetricsStore } from '../store/useMetricsStore';
import { Activity, AlertTriangle, ShieldAlert, Bitcoin, ServerCrash } from 'lucide-react';

export default function LeftPanel() {
  const { earthquakes, securityAlerts, cryptoWhales } = useMetricsStore();

  const quakeCount = (earthquakes || []).filter(q => q.mag > 4.0).length;
  const cyberCount = (securityAlerts || []).filter(a => a.type === 'OTX' || a.type === 'CVE').length;
  const bgpCount = (securityAlerts || []).filter(a => a.type === 'BGP').length;
  const whaleCount = (cryptoWhales || []).length;

  return (
    <div className="glass-panel animate-slide-left" style={{ position: 'absolute', top: '2rem', left: '2rem', width: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', zIndex: 10, padding: '1rem' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <ShieldAlert color={cyberCount > 0 ? "var(--color-cyber)" : "var(--text-secondary)"} size={28} />
        <div style={{ minWidth: '80px' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>THREAT INTEL</div>
          <div className="mono" style={{ color: cyberCount > 0 ? 'var(--color-cyber)' : 'var(--text-primary)', fontSize: '1.2rem' }}>
            {cyberCount > 0 ? `${cyberCount} HIGH` : 'CLEAR'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <ServerCrash color={bgpCount > 0 ? "var(--color-cyber)" : "var(--text-secondary)"} size={28} />
        <div style={{ minWidth: '80px' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>BGP RADAR</div>
          <div className="mono" style={{ color: bgpCount > 0 ? 'var(--color-cyber)' : 'var(--text-primary)', fontSize: '1.2rem' }}>
            {bgpCount > 0 ? 'ALERT' : 'STABLE'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Bitcoin color={whaleCount > 0 ? "var(--color-finance)" : "var(--text-secondary)"} size={28} />
        <div style={{ minWidth: '80px' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>WHALE NET</div>
          <div className="mono" style={{ color: whaleCount > 0 ? 'var(--color-finance)' : 'var(--text-primary)', fontSize: '1.2rem' }}>
            {whaleCount > 0 ? `${whaleCount} TX` : 'SYNC'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <AlertTriangle color={quakeCount > 0 ? "var(--color-nature)" : "var(--text-secondary)"} size={28} />
        <div style={{ minWidth: '80px' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>SEISMIC &gt;4M</div>
          <div className="mono" style={{ color: quakeCount > 0 ? 'var(--color-nature)' : 'var(--text-primary)', fontSize: '1.2rem' }}>
            {quakeCount > 0 ? `${quakeCount} MTD` : 'ZERO'}
          </div>
        </div>
      </div>

    </div>
  );
}
