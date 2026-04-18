import { useState } from 'react';
import { useMetricsStore } from '../store/useMetricsStore';
import { ChevronUp, ChevronDown, Terminal, ShieldAlert, Earth, Bitcoin, ExternalLink, Newspaper, Zap } from 'lucide-react';

export default function BottomDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const { securityAlerts, earthquakes, newsEvents, cryptoWhales, torNodes } = useMetricsStore();

  const handleToggle = () => setIsOpen(!isOpen);

  const toggleExpand = (id: string, e: any) => {
    e.stopPropagation();
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  return (
    <div 
      className="bottom-drawer transition-height"
      style={{ 
        position: 'absolute', bottom: 0, left: 0, width: '100%', 
        height: isOpen ? '45vh' : '40px', display: 'flex', flexDirection: 'column'
      }}
    >
      {/* Drawer Toggle Bar */}
      <div 
        onClick={handleToggle}
        style={{ 
          width: '100%', height: '40px', cursor: 'pointer', display: 'flex', 
          justifyContent: 'center', alignItems: 'center', background: 'rgba(0, 0, 0, 0.5)',
          borderTop: '1px solid var(--panel-border)'
        }}
      >
        {isOpen ? <ChevronDown color="var(--text-primary)" size={24} /> : <ChevronUp color="var(--text-primary)" size={24} />}
        <span className="mono" style={{ marginLeft: '10px', fontSize: '0.8rem', letterSpacing: '0.2em' }}>
          {isOpen ? 'MASTER.TERMINAL [AKTİF]' : 'MASTER.TERMINAL [BEKLEMEDE]'}
        </span>
      </div>

      {/* Drawer Content */}
      <div style={{ 
        flex: 1, display: isOpen ? 'flex' : 'none', padding: '1rem', gap: '1.5rem', overflow: 'hidden'
      }}>
        
        {/* COLUMN 1: NEWS (GDELT) */}
        <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '4px', background: 'rgba(0,0,0,0.4)' }}>
          <div style={{ padding: '0.8rem', borderBottom: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Newspaper color="#ef4444" size={18} />
            <h3 style={{ color: '#ef4444', fontSize: '0.9rem' }}>KÜRESEL HABER İSTİHBARATI (GDELT)</h3>
          </div>
          <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            {(newsEvents || []).map((art, i) => (
              <div key={art.id + i} className="log-item attack" onClick={(e) => toggleExpand(art.id, e)}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{art.title.slice(0, 45)}...</strong>
                </div>
                {expandedLogId === art.id && (
                  <div style={{ marginTop: '0.8rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <p><strong>KAYNAK:</strong> {art.source}</p>
                    <a href={art.url} target="_blank" rel="noreferrer" style={{ color: '#ef4444', textDecoration: 'none' }}>Haberi Oku <ExternalLink size={10} /></a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* COLUMN 2: CYBER (Security + Tor) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '4px', background: 'rgba(0,0,0,0.4)' }}>
          <div style={{ padding: '0.8rem', borderBottom: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap color="var(--color-cyber)" size={18} />
            <h3 style={{ color: 'var(--color-cyber)', fontSize: '0.9rem' }}>SİBER ALTYAPI & TOR</h3>
          </div>
          <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
             <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>SON AKTİF TOR DÜĞÜMLERİ</p>
             {torNodes.slice(0, 15).map((node, i) => (
               <div key={node.id + i} style={{ fontSize: '0.75rem', color: 'var(--text-primary)', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: '#a855f7' }}>[NODE]</span> {node.nickname} ({node.country})
               </div>
             ))}
          </div>
        </div>

        {/* COLUMN 3: FINANCE (Whales) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid rgba(234,179,8,0.3)', borderRadius: '4px', background: 'rgba(0,0,0,0.4)' }}>
          <div style={{ padding: '0.8rem', borderBottom: '1px solid rgba(234,179,8,0.3)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bitcoin color="var(--color-finance)" size={18} />
            <h3 style={{ color: 'var(--color-finance)', fontSize: '0.9rem' }}>KRİPTO TRANSFERLERİ</h3>
          </div>
          <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            {(cryptoWhales || []).map((whale, i) => (
              <div key={whale.id + i} className="log-item finance" onClick={(e) => toggleExpand(whale.id, e)}>
                 <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{whale.value.toFixed(2)} BTC</strong>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{whale.source}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
