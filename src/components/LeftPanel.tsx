import { useMetricsStore } from '../store/useMetricsStore';
import { ShieldAlert, Bitcoin, SearchCode, Globe2 } from 'lucide-react';

export default function LeftPanel() {
  const { earthquakes, securityAlerts, cryptoWhales } = useMetricsStore();

  const quakeCount = (earthquakes || []).filter(q => q.mag > 4.0).length;
  const cyberCount = (securityAlerts || []).filter(a => a.type === 'OTX' || a.type === 'CVE' || a.type === 'MALWARE').length;
  const bgpCount = (securityAlerts || []).filter(a => a.type === 'BGP').length;
  const whaleCount = (cryptoWhales || []).length;

  return (
    <div className="glass-panel animate-slide-left" style={{ position: 'absolute', top: '2rem', left: '2rem', width: 'auto', display: 'flex', flexDirection: 'column', gap: '1.2rem', zIndex: 10, padding: '1.2rem', background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(56,189,248,0.2)' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <ShieldAlert color={cyberCount > 0 ? "#ef4444" : "#64748b"} size={26} />
        <div style={{ minWidth: '100px' }}>
          <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 'bold', letterSpacing: '0.5px' }}>THREAT INTEL</div>
          <div className="mono" style={{ color: cyberCount > 0 ? '#ef4444' : '#fff', fontSize: '1.1rem', fontWeight: 'bold' }}>
            {cyberCount > 0 ? `${cyberCount} ALERTS` : 'PROTECTED'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Globe2 color={bgpCount > 0 ? "#facc15" : "#64748b"} size={26} />
        <div style={{ minWidth: '100px' }}>
          <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 'bold', letterSpacing: '0.5px' }}>BGP ROUTING</div>
          <div className="mono" style={{ color: bgpCount > 0 ? '#facc15' : '#fff', fontSize: '1.1rem', fontWeight: 'bold' }}>
            {bgpCount > 0 ? 'ANOMALY' : 'STABLE'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Bitcoin color={whaleCount > 0 ? "#fbbf24" : "#64748b"} size={26} />
        <div style={{ minWidth: '100px' }}>
          <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 'bold', letterSpacing: '0.5px' }}>WHALE REGISTRY</div>
          <div className="mono" style={{ color: whaleCount > 0 ? '#fbbf24' : '#fff', fontSize: '1.1rem', fontWeight: 'bold' }}>
            {whaleCount > 0 ? `${whaleCount} OPS` : 'SYNCED'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <SearchCode color={quakeCount > 0 ? "#22c55e" : "#64748b"} size={26} />
        <div style={{ minWidth: '100px' }}>
          <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 'bold', letterSpacing: '0.5px' }}>SEISMIC FEED</div>
          <div className="mono" style={{ color: quakeCount > 0 ? '#22c55e' : '#fff', fontSize: '1.1rem', fontWeight: 'bold' }}>
            {quakeCount > 0 ? `${quakeCount} EVENTS` : 'STABLE'}
          </div>
        </div>
      </div>

    </div>
  );
}
