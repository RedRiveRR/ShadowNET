// React import removed because it's not used.

export default function Legend() {
  return (
    <div className="glass-panel animate-slide-up" style={{ 
      position: 'absolute', 
      bottom: '100px', 
      right: '2rem', 
      padding: '1.2rem', 
      zIndex: 20,
      width: '260px',
      fontSize: '0.75rem',
      background: 'rgba(15, 23, 42, 0.9)',
      border: '1px solid rgba(56, 189, 248, 0.3)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
      backdropFilter: 'blur(12px)',
      borderRadius: '12px'
    }}>
      <h3 style={{ 
        marginBottom: '14px', 
        fontSize: '0.8rem', 
        color: '#38bdf8', 
        borderBottom: '1px solid rgba(56, 189, 248, 0.2)', 
        paddingBottom: '8px', 
        fontWeight: 'bold', 
        letterSpacing: '1.5px', 
        textTransform: 'uppercase' 
      }}>
        System Identifiers
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <LegendItem color="#facc15" label="AERIAL ENTITY (LIVE)" type="triangle" />
        <LegendItem color="#a855f7" label="SATELLITE / ISS NODE" type="square" />
        <LegendItem color="#ec4899" label="ENCRYPTED TOR ENTRY" type="pulse" />
        <LegendItem color="#ef4444" label="KINETIC CONFLICT ZONE" type="hatch" />
        <LegendItem color="#f59e0b" label="SEISMIC EVENT (QUAKE)" type="circle" />
        <LegendItem color="#22d3ee" label="MARITIME ENTITY (AIS)" type="hull" />
        <LegendItem color="#fff" label="NEURAL LINK (CORRELATION)" type="mesh" />
        <LegendItem color="#fbbf24" label="WHALE TX DETECTED" type="diamond" />
      </div>
    </div>
  );
}

function LegendItem({ color, label, type }: { color: string, label: string, type: string }) {
  const getMarker = () => {
    switch(type) {
      case 'triangle': return <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: `9px solid ${color}` }} />;
      case 'square': return <div style={{ width: '8px', height: '8px', border: `1px solid ${color}`, background: `${color}40` }} />;
      case 'pulse': return <div style={{ width: '8px', height: '8px', background: color, borderRadius: '50%', boxShadow: `0 0 10px ${color}`, animation: 'pulse 1s infinite' }} />;
      case 'hatch': return <div style={{ width: '10px', height: '10px', background: `repeating-linear-gradient(45deg, ${color}20, ${color}20 2px, ${color}60 2px, ${color}60 4px)` }} />;
      case 'circle': return <div style={{ width: '8px', height: '8px', background: color, borderRadius: '50%' }} />;
      case 'hull': return <div style={{ width: '6px', height: '10px', background: color, borderRadius: '40% 40% 10% 10%' }} />;
      case 'mesh': return <div style={{ width: '10px', height: '10px', border: `1px solid ${color}`, borderRadius: '2px', opacity: 0.8 }} />;
      case 'diamond': return <div style={{ width: '7px', height: '7px', background: color, transform: 'rotate(45deg)', boxShadow: `0 0 8px ${color}` }} />;
      default: return <div style={{ width: '8px', height: '8px', background: color }} />;
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
      <div style={{ width: '20px', display: 'flex', justifyContent: 'center' }}>{getMarker()}</div>
      <span style={{ color: '#cbd5e1', fontSize: '0.65rem', fontWeight: '500', letterSpacing: '0.5px' }}>{label}</span>
    </div>
  );
}
