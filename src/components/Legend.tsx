import React from 'react';

export default function Legend() {
  return (
    <div className="glass-panel animate-slide-up" style={{ 
      position: 'absolute', 
      bottom: '100px', 
      right: '2rem', 
      padding: '1.2rem', 
      zIndex: 20,
      width: '240px',
      fontSize: '0.75rem',
      background: 'rgba(15, 23, 42, 0.9)',
      border: '1px solid rgba(56, 189, 248, 0.3)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
      backdropFilter: 'blur(12px)'
    }}>
      <h3 style={{ marginBottom: '12px', fontSize: '0.8rem', color: '#38bdf8', borderBottom: '1px solid rgba(56, 189, 248, 0.2)', paddingBottom: '6px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>
        System Identifiers
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#facc15', boxShadow: '0 0 8px #facc15' }}></div>
          <span style={{ color: '#cbd5e1' }}>AERIAL ENTITY (LIVE)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 8px #38bdf8' }}></div>
          <span style={{ color: '#cbd5e1' }}>SATELLITE / ISS NODE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '1px', background: '#a855f7', boxShadow: '0 0 8px #a855f7' }}></div>
          <span style={{ color: '#cbd5e1' }}>ENCRYPTED TOR ENTRY</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '12px', height: '2px', background: '#ef4444', boxShadow: '0 0 8px #ef4444' }}></div>
          <span style={{ color: '#cbd5e1' }}>KINETIC CONFLICT ZONE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', boxShadow: '0 0 8px #22c55e' }}></div>
          <span style={{ color: '#cbd5e1' }}>SEISMIC EVENT (QUAKE)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px', marginTop: '4px' }}>
          <div style={{ width: '15px', height: '2px', background: '#fbbf24', boxShadow: '0 0 8px #fbbf24' }}></div>
          <span style={{ color: '#fbbf24', fontSize: '0.65rem', fontWeight: 'bold' }}>WHALE TX DETECTED</span>
        </div>
      </div>
    </div>
  );
}
