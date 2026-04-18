import { useState } from 'react';
import { useMetricsStore } from '../store/useMetricsStore';
import { ChevronUp, ChevronDown, Terminal, ShieldAlert, Earth, Bitcoin, ExternalLink } from 'lucide-react';

export default function BottomDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const { securityAlerts, earthquakes, disasters, cryptoWhales } = useMetricsStore();

  const handleToggle = () => setIsOpen(!isOpen);

  const toggleExpand = (id: string, e: any) => {
    e.stopPropagation();
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  return (
    <div 
      className="bottom-drawer transition-height"
      style={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        width: '100%', 
        height: isOpen ? '45vh' : '40px',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Drawer Toggle Bar */}
      <div 
        onClick={handleToggle}
        style={{ 
          width: '100%', 
          height: '40px', 
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          borderBottom: isOpen ? '1px solid rgba(16, 185, 129, 0.2)' : 'none',
          background: 'rgba(0, 0, 0, 0.5)'
        }}
        title="Toggle Master Terminal"
      >
        {isOpen ? <ChevronDown color="var(--text-primary)" size={24} /> : <ChevronUp color="var(--text-primary)" size={24} />}
        <span className="mono" style={{ marginLeft: '10px', fontSize: '0.8rem', letterSpacing: '0.2em' }}>
          {isOpen ? 'SYS.TERMINAL [ACTIVE]' : 'SYS.TERMINAL [STANDBY]'}
        </span>
      </div>

      {/* Drawer Content */}
      <div style={{ 
        flex: 1, 
        display: isOpen ? 'flex' : 'none', 
        padding: '1rem',
        gap: '1.5rem',
        overflow: 'hidden'
      }}>
        
        {/* COLUMN 1: SECURITY (Cyber, BGP, NVD) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,0,60,0.3)', borderRadius: '4px', background: 'rgba(0,0,0,0.4)' }}>
          <div style={{ padding: '0.8rem', borderBottom: '1px solid rgba(255,0,60,0.3)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Terminal color="var(--color-cyber)" size={18} />
            <h3 style={{ color: 'var(--color-cyber)', fontSize: '0.9rem' }}>THREAT INTELLIGENCE</h3>
          </div>
          <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            {(securityAlerts || []).map((alert, i) => (
              <div key={alert.id + i} className="log-item attack" onClick={(e) => toggleExpand(alert.id, e)}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>[{alert.type}] {alert.title.slice(0, 30)}</strong>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{new Date(alert.time).toLocaleTimeString()}</span>
                </div>
                {expandedLogId === alert.id && (
                  <div style={{ marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px dashed rgba(255,0,60,0.2)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <p><strong>SEVERITY:</strong> {alert.severity}</p>
                    <p><strong>RAW LOG:</strong> Threat actor detected via {alert.type} network sensors. Automated BGP analysis or deep packet inspection flagged anomalies.</p>
                    <p><strong>ACTION:</strong> Logging to global vault.</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* COLUMN 2: FINANCE (Whales) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid rgba(234,179,8,0.3)', borderRadius: '4px', background: 'rgba(0,0,0,0.4)' }}>
          <div style={{ padding: '0.8rem', borderBottom: '1px solid rgba(234,179,8,0.3)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bitcoin color="var(--color-finance)" size={18} />
            <h3 style={{ color: 'var(--color-finance)', fontSize: '0.9rem' }}>FINANCIAL GRID</h3>
          </div>
          <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            {(cryptoWhales || []).map((whale, i) => (
              <div key={whale.id + i} className="log-item finance" onClick={(e) => toggleExpand(whale.id, e)}>
                 <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>[WHALE] {whale.value.toFixed(2)} BTC</strong>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{new Date(whale.time).toLocaleTimeString()}</span>
                </div>
                {expandedLogId === whale.id && (
                  <div style={{ marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px dashed rgba(234,179,8,0.2)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <p><strong>ROUTE:</strong> [{whale.startLat.toFixed(2)}, {whale.startLng.toFixed(2)}] &rarr; [{whale.endLat.toFixed(2)}, {whale.endLng.toFixed(2)}]</p>
                    <p><strong>NETWORK:</strong> Blockchain.info Unconfirmed Pool</p>
                    <a href="https://www.blockchain.com/explorer" target="_blank" rel="noreferrer" style={{ color: 'var(--color-finance)', display: 'inline-flex', alignItems: 'center', marginTop: '6px', textDecoration: 'none' }}>
                       View Mempool <ExternalLink size={12} style={{ marginLeft: '4px' }} />
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* COLUMN 3: NATURE (Quakes & Disasters) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '4px', background: 'rgba(0,0,0,0.4)' }}>
          <div style={{ padding: '0.8rem', borderBottom: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Earth color="var(--color-nature)" size={18} />
            <h3 style={{ color: 'var(--color-nature)', fontSize: '0.9rem' }}>GLOBAL SEISMIC</h3>
          </div>
          <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            
            {/* Map Disasters */}
            {(disasters || []).slice(0, 10).map((d, i) => (
              <div key={`d-${d.id}-${i}`} className="log-item nature" onClick={(e) => toggleExpand(`d-${d.id}`, e)}>
                 <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>[GDACS {d.type}] {d.title.slice(0, 20)}</strong>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{new Date(d.time).toLocaleTimeString()}</span>
                </div>
                {expandedLogId === `d-${d.id}` && (
                   <div style={{ marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px dashed rgba(245,158,11,0.2)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                     <p><strong>RISK RANK:</strong> {d.alertLevel}</p>
                     <p><strong>LOCATION:</strong> LAT {d.lat.toFixed(2)}, LNG {d.lng.toFixed(2)}</p>
                     <p><strong>SOURCE:</strong> UN Global Disaster Alert</p>
                   </div>
                )}
              </div>
            ))}

            {/* Map Earthquakes */}
            {(earthquakes || []).slice(0, 20).map((q, i) => (
              <div key={`q-${q.id}-${i}`} className="log-item nature" onClick={(e) => toggleExpand(`q-${q.id}`, e)}>
                 <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>[USGS M{q.mag.toFixed(1)}] {q.title.slice(0, 25)}</strong>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{new Date(q.time).toLocaleTimeString()}</span>
                </div>
                {expandedLogId === `q-${q.id}` && (
                   <div style={{ marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px dashed rgba(245,158,11,0.2)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                     <p><strong>MAGNITUDE:</strong> {q.mag}</p>
                     <p><strong>COORDINATES:</strong> {q.lat.toFixed(2)}, {q.lng.toFixed(2)}</p>
                     <p><strong>AGENCY:</strong> U.S. Geological Survey (USGS)</p>
                     <a href={`https://earthquake.usgs.gov/earthquakes/eventpage/${q.id}/executive`} target="_blank" rel="noreferrer" style={{ color: 'var(--color-nature)', display: 'inline-flex', alignItems: 'center', marginTop: '6px', textDecoration: 'none' }}>
                       View USGS Report <ExternalLink size={12} style={{ marginLeft: '4px' }} />
                     </a>
                   </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
