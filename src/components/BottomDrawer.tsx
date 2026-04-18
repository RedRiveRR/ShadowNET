import { useState } from 'react';
import { useMetricsStore } from '../store/useMetricsStore';
import { ChevronUp, ChevronDown, Newspaper, Zap, Bitcoin, ExternalLink, Activity } from 'lucide-react';

export default function BottomDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const { securityAlerts, earthquakes, newsEvents, cryptoWhales, torNodes } = useMetricsStore();

  const toggleExpand = (id: string, e: any) => {
    e.stopPropagation();
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  return (
    <div 
      className="bottom-drawer transition-height"
      style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: isOpen ? '45vh' : '40px', display: 'flex', flexDirection: 'column' }}
    >
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ width: '100%', height: '40px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.5)', borderTop: '1px solid var(--panel-border)' }}
      >
        {isOpen ? <ChevronDown color="var(--text-primary)" size={24} /> : <ChevronUp color="var(--text-primary)" size={24} />}
        <span className="mono" style={{ marginLeft: '10px', fontSize: '0.8rem', letterSpacing: '0.2em' }}>
          {isOpen ? 'MASTER.TERMINAL [AKTİF]' : 'MASTER.TERMINAL [BEKLEMEDE]'}
        </span>
      </div>

      <div style={{ flex: 1, display: isOpen ? 'flex' : 'none', padding: '0.8rem', gap: '0.8rem', overflow: 'hidden' }}>
        
        {/* 1. KÜRESEL HABERLER (BBC World) */}
        <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '4px', background: 'rgba(0,0,0,0.4)' }}>
          <div style={{ padding: '0.6rem', borderBottom: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Newspaper color="#ef4444" size={16} />
            <h3 style={{ color: '#ef4444', fontSize: '0.85rem' }}>KÜRESEL HABERLER (SON DAKİKA)</h3>
          </div>
          <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0.6rem' }}>
            {(newsEvents || []).length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Haberler yükleniyor...</p>}
            {(newsEvents || []).map((art, i) => (
              <div key={art.id + i} className="log-item attack" onClick={(e) => toggleExpand(art.id, e)} style={{ marginBottom: '4px' }}>
                <strong style={{ fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: '1.3' }}>{art.title}</strong>
                {expandedLogId === art.id && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    <p><strong>KAYNAK:</strong> {art.source}</p>
                    <a href={art.url} target="_blank" rel="noreferrer" style={{ color: '#ef4444', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Haberi Oku <ExternalLink size={10} />
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 2. SİBER ALTYAPI (Tor + CVE/Güvenlik) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '4px', background: 'rgba(0,0,0,0.4)' }}>
          <div style={{ padding: '0.6rem', borderBottom: '1px solid rgba(168,85,247,0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap color="#a855f7" size={16} />
            <h3 style={{ color: '#a855f7', fontSize: '0.85rem' }}>SİBER ALTYAPI & TOR</h3>
          </div>
          <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0.6rem' }}>
            {/* Güvenlik Alertleri */}
            {(securityAlerts || []).length > 0 && (
              <>
                <p style={{ fontSize: '0.65rem', color: '#ef4444', marginBottom: '4px', fontWeight: 'bold' }}>⚠ GÜVENLİK ALARMLARİ</p>
                {securityAlerts.slice(0, 5).map((alert, i) => (
                  <div key={alert.id + i} style={{ fontSize: '0.72rem', color: 'var(--text-primary)', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: '#ef4444' }}>[{alert.type}]</span> {alert.title.slice(0, 35)}
                  </div>
                ))}
                <div style={{ height: '8px' }}></div>
              </>
            )}
            {/* Tor Düğümleri */}
            <p style={{ fontSize: '0.65rem', color: '#a855f7', marginBottom: '4px', fontWeight: 'bold' }}>🧅 AKTİF TOR DÜĞÜMLERİ ({torNodes.length})</p>
            {(torNodes || []).length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>Tor düğümleri yükleniyor...</p>}
            {(torNodes || []).slice(0, 15).map((node, i) => (
              <div key={(node.id || i) + i} style={{ fontSize: '0.72rem', color: 'var(--text-primary)', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: '#a855f7' }}>[NODE]</span> {node.nickname} <span style={{ color: 'var(--text-secondary)' }}>({node.country})</span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. KRİPTO TRANSFERLERİ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid rgba(234,179,8,0.3)', borderRadius: '4px', background: 'rgba(0,0,0,0.4)' }}>
          <div style={{ padding: '0.6rem', borderBottom: '1px solid rgba(234,179,8,0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bitcoin color="#fbbf24" size={16} />
            <h3 style={{ color: '#fbbf24', fontSize: '0.85rem' }}>KRİPTO TRANSFERLERİ</h3>
          </div>
          <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0.6rem' }}>
            {(cryptoWhales || []).length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>Binance bağlantısı bekleniyor...</p>}
            {(cryptoWhales || []).map((whale, i) => (
              <div key={whale.id + i} className="log-item finance" style={{ marginBottom: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.78rem', color: '#fbbf24' }}>{whale.value.toFixed(3)} BTC</strong>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{whale.source}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. SİSMİK KAYITLAR (Depremler) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '4px', background: 'rgba(0,0,0,0.4)' }}>
          <div style={{ padding: '0.6rem', borderBottom: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity color="#f59e0b" size={16} />
            <h3 style={{ color: '#f59e0b', fontSize: '0.85rem' }}>SİSMİK KAYITLAR</h3>
          </div>
          <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0.6rem' }}>
            {(earthquakes || []).length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>Sismik veri bekleniyor...</p>}
            {(earthquakes || []).map((q, i) => (
              <div key={q.id + i} className="log-item nature" onClick={(e) => toggleExpand(`q-${q.id}`, e)} style={{ marginBottom: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>M{q.mag.toFixed(1)} - {q.title.slice(0, 25)}</strong>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{new Date(q.time).toLocaleTimeString()}</span>
                </div>
                {expandedLogId === `q-${q.id}` && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    <p><strong>KOORDİNAT:</strong> {q.lat.toFixed(2)}, {q.lng.toFixed(2)}</p>
                    <a href={`https://earthquake.usgs.gov/earthquakes/eventpage/${q.id}`} target="_blank" rel="noreferrer" style={{ color: '#f59e0b', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      USGS Raporu <ExternalLink size={10} />
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
