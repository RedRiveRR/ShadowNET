
export default function Legend() {
  return (
    <div className="glass-panel animate-slide-up" style={{ 
      position: 'absolute', 
      bottom: '100px', 
      right: '2rem', 
      padding: '1rem', 
      zIndex: 20,
      width: '240px',
      background: 'rgba(10, 15, 25, 0.95)',
      border: '1px solid rgba(56, 189, 248, 0.2)',
      boxShadow: '0 15px 40px rgba(0,0,0,0.6)',
      backdropFilter: 'blur(16px)',
      borderRadius: '4px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid rgba(56, 189, 248, 0.1)', paddingBottom: '6px' }}>
        <div style={{ width: '4px', height: '12px', background: '#38bdf8' }} />
        <h3 style={{ margin: 0, fontSize: '0.65rem', color: '#fff', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase' }}>
          SIGNAL CLASSIFICATION
        </h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <LegendItem color="#facc15" label="SIGINT: AERIAL (LIVE)" />
        <LegendItem color="#38bdf8" label="ELINT: SPACEBORNE" />
        <LegendItem color="#a855f7" label="CYBER: ONION RELAY" isSquare={true} />
        <LegendItem color="#22c55e" label="GEO: SEISMIC EVENT" />
        <LegendItem color="#2dd4bf" label="SIGINT: MARITIME (LIVE)" />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '16px' }}>
          <div style={{ width: '12px', height: '2px', background: '#ef4444', boxShadow: '0 0 5px #ef4444' }}></div>
          <span style={{ color: '#94a3b8', fontSize: '0.55rem', fontWeight: '800' }}>OBS: CONFLICT ZONE</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '16px' }}>
          <div style={{ width: '12px', height: '1px', background: '#3b82f6', opacity: 0.6 }}></div>
          <span style={{ color: '#64748b', fontSize: '0.55rem', fontWeight: '800' }}>DATALINK: CORRELATION</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', marginTop: '2px' }}>
          <div style={{ width: '12px', height: '2px', background: '#fbbf24', animation: 'pulse 1s infinite' }}></div>
          <span style={{ color: '#fbbf24', fontSize: '0.55rem', fontWeight: '900', letterSpacing: '1px' }}>FININT: WHALE ALERT</span>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label, isSquare = false }: any) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ 
        width: '6px', 
        height: '6px', 
        borderRadius: isSquare ? '1px' : '50%', 
        background: color, 
        boxShadow: `0 0 8px ${color}` 
      }}></div>
      <span style={{ color: '#cbd5e1', fontSize: '0.55rem', fontWeight: '800', letterSpacing: '0.5px' }}>{label}</span>
    </div>
  );
}
