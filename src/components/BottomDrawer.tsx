import { useState } from 'react';
import { useMetricsStore } from '../store/useMetricsStore';
import { ChevronUp, ChevronDown, Newspaper, Zap, Bitcoin, ExternalLink, Activity } from 'lucide-react';

export default function BottomDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { securityAlerts, earthquakes, newsEvents, cryptoWhales, torNodes } = useMetricsStore();

  const toggle = (id: string) => setExpandedId(expandedId === id ? null : id);

  return (
    <div 
      className="bottom-drawer transition-height"
      style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: isOpen ? '45vh' : '40px', display: 'flex', flexDirection: 'column', zIndex: 20 }}
    >
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ width: '100%', height: '40px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.6)', borderTop: '1px solid var(--panel-border)' }}
      >
        {isOpen ? <ChevronDown color="var(--text-primary)" size={24} /> : <ChevronUp color="var(--text-primary)" size={24} />}
        <span className="mono" style={{ marginLeft: '10px', fontSize: '0.8rem', letterSpacing: '0.2em' }}>
          {isOpen ? 'MASTER.TERMINAL [AKTİF]' : 'MASTER.TERMINAL [BEKLEMEDE]'}
        </span>
      </div>

      <div style={{ flex: 1, display: isOpen ? 'flex' : 'none', padding: '0.8rem', gap: '0.8rem', overflow: 'hidden' }}>
        
        {/* 1. KÜRESEL HABERLER */}
        <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '4px', background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ padding: '0.6rem', borderBottom: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Newspaper color="#ef4444" size={16} />
            <h3 style={{ color: '#ef4444', fontSize: '0.85rem' }}>KÜRESEL HABERLER (SON DAKİKA)</h3>
          </div>
          <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {(newsEvents || []).length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>Yükleniyor...</p>}
            {(newsEvents || []).map((art, i) => {
              const id = `news-${i}`;
              return (
                <div key={id} onClick={() => toggle(id)} style={{ cursor: 'pointer', padding: '6px 8px', marginBottom: '3px', borderRadius: '4px', background: expandedId === id ? 'rgba(239,68,68,0.1)' : 'transparent', borderLeft: expandedId === id ? '2px solid #ef4444' : '2px solid transparent', transition: 'all 0.2s' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>{art.title}</div>
                  {expandedId === id && (
                    <div style={{ marginTop: '6px', padding: '6px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        <strong>Kaynak:</strong> {art.source}
                      </p>
                      <a href={art.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.7rem', color: '#ef4444', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        Habere Git <ExternalLink size={10} />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. SİBER ALTYAPI */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '4px', background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ padding: '0.6rem', borderBottom: '1px solid rgba(168,85,247,0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap color="#a855f7" size={16} />
            <h3 style={{ color: '#a855f7', fontSize: '0.85rem' }}>SİBER ALTYAPI & TOR</h3>
          </div>
          <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {/* Güvenlik Alertleri */}
            {(securityAlerts || []).length > 0 && (
              <>
                <p style={{ fontSize: '0.65rem', color: '#ef4444', marginBottom: '4px', fontWeight: 'bold' }}>⚠ GÜVENLİK ALARMLARI</p>
                {securityAlerts.slice(0, 8).map((alert, i) => {
                  const id = `alert-${alert.id}-${i}`;
                  const link = alert.url 
                    || (alert.type === 'CVE' ? `https://nvd.nist.gov/vuln/detail/${alert.title.replace('[CVE] ', '')}` 
                    : alert.type === 'OTX' ? 'https://otx.alienvault.com/dashboard'
                    : alert.type === 'BGP' ? 'https://radar.cloudflare.com/routing' : '#');
                  return (
                    <div key={id} onClick={() => toggle(id)} style={{ cursor: 'pointer', padding: '4px 6px', marginBottom: '2px', borderRadius: '4px', background: expandedId === id ? 'rgba(168,85,247,0.1)' : 'transparent', borderLeft: expandedId === id ? '2px solid #a855f7' : '2px solid transparent', transition: 'all 0.2s' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-primary)' }}>
                        <span style={{ color: alert.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b' }}>[{alert.type}]</span> {alert.title.slice(0, 35)}
                      </div>
                      {expandedId === id && (
                        <div style={{ marginTop: '4px', padding: '4px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                          <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                            <strong>Seviye:</strong> {alert.severity} · <strong>Tip:</strong> {alert.type} · <strong>Zaman:</strong> {new Date(alert.time).toLocaleTimeString()}
                          </p>
                          <a href={link} target="_blank" rel="noreferrer" style={{ fontSize: '0.65rem', color: '#a855f7', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            Detaya Git <ExternalLink size={9} />
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div style={{ height: '6px' }}></div>
              </>
            )}
            {/* Tor Düğümleri */}
            <p style={{ fontSize: '0.65rem', color: '#a855f7', marginBottom: '4px', fontWeight: 'bold' }}>🧅 TOR DÜĞÜMLERİ ({torNodes.length})</p>
            {(torNodes || []).slice(0, 15).map((node, i) => {
              const id = `tor-${node.id}-${i}`;
              return (
                <div key={id} onClick={() => toggle(id)} style={{ cursor: 'pointer', padding: '4px 6px', marginBottom: '2px', borderRadius: '4px', background: expandedId === id ? 'rgba(168,85,247,0.1)' : 'transparent', borderLeft: expandedId === id ? '2px solid #a855f7' : '2px solid transparent', transition: 'all 0.2s' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-primary)' }}>
                    <span style={{ color: '#a855f7' }}>[NODE]</span> {node.nickname} <span style={{ color: 'var(--text-secondary)' }}>({node.country})</span>
                  </div>
                  {expandedId === id && (
                    <div style={{ marginTop: '4px', padding: '4px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                      <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                        <strong>Konum:</strong> {node.lat?.toFixed(2)}, {node.lng?.toFixed(2)} · <strong>Ülke:</strong> {node.country}
                      </p>
                      <a href={`https://metrics.torproject.org/rs.html#search/country:${(node.country || '').toLowerCase().slice(0,2)}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.65rem', color: '#a855f7', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        Ülkedeki Relay'ler <ExternalLink size={9} />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. KRİPTO TRANSFERLERİ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid rgba(234,179,8,0.3)', borderRadius: '4px', background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ padding: '0.6rem', borderBottom: '1px solid rgba(234,179,8,0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bitcoin color="#fbbf24" size={16} />
            <h3 style={{ color: '#fbbf24', fontSize: '0.85rem' }}>KRİPTO TRANSFERLERİ</h3>
          </div>
          <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {(cryptoWhales || []).length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>Binance bağlantısı bekleniyor...</p>}
            {(cryptoWhales || []).map((whale, i) => {
              const id = `whale-${whale.id}-${i}`;
              return (
                <div key={id} onClick={() => toggle(id)} style={{ cursor: 'pointer', padding: '5px 6px', marginBottom: '2px', borderRadius: '4px', background: expandedId === id ? 'rgba(234,179,8,0.1)' : 'transparent', borderLeft: expandedId === id ? '2px solid #fbbf24' : '2px solid transparent', transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.78rem', color: '#fbbf24' }}>{whale.value.toFixed(3)} BTC</strong>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{whale.source}</span>
                  </div>
                  {expandedId === id && (
                    <div style={{ marginTop: '4px', padding: '4px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                      <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                        <strong>Zaman:</strong> {new Date(whale.time).toLocaleTimeString()} · <strong>Yön:</strong> {whale.source}
                      </p>
                      <a href="https://www.binance.com/en/trade/BTC_USDT" target="_blank" rel="noreferrer" style={{ fontSize: '0.65rem', color: '#fbbf24', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        Binance BTC/USDT <ExternalLink size={9} />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. SİSMİK KAYITLAR */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '4px', background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ padding: '0.6rem', borderBottom: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity color="#f59e0b" size={16} />
            <h3 style={{ color: '#f59e0b', fontSize: '0.85rem' }}>SİSMİK KAYITLAR</h3>
          </div>
          <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {(earthquakes || []).length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>Sismik veri bekleniyor...</p>}
            {(earthquakes || []).map((q, i) => {
              const id = `quake-${q.id}-${i}`;
              return (
                <div key={id} onClick={() => toggle(id)} style={{ cursor: 'pointer', padding: '5px 6px', marginBottom: '2px', borderRadius: '4px', background: expandedId === id ? 'rgba(245,158,11,0.1)' : 'transparent', borderLeft: expandedId === id ? '2px solid #f59e0b' : '2px solid transparent', transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>M{q.mag.toFixed(1)} - {q.title.replace(/M \d+\.\d+ - /, '').slice(0, 25)}</span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{new Date(q.time).toLocaleTimeString()}</span>
                  </div>
                  {expandedId === id && (
                    <div style={{ marginTop: '4px', padding: '4px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                      <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                        <strong>Büyüklük:</strong> {q.mag} · <strong>Konum:</strong> {q.lat.toFixed(2)}, {q.lng.toFixed(2)} · <strong>Tam Adı:</strong> {q.title}
                      </p>
                      <a href={`https://earthquake.usgs.gov/earthquakes/eventpage/${q.id}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.65rem', color: '#f59e0b', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        USGS Raporu <ExternalLink size={9} />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
