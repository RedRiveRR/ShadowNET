import React from 'react';

export default function Legend() {
  return (
    <div className="glass-panel animate-slide-up" style={{ 
      position: 'absolute', 
      bottom: '50px', 
      right: '2rem', 
      padding: '1rem', 
      zIndex: 20,
      width: '200px',
      fontSize: '0.75rem'
    }}>
      <h3 style={{ marginBottom: '10px', fontSize: '0.8rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--panel-border)', paddingBottom: '5px' }}>
        SİMGE AÇIKLAMALARI
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 5px #38bdf8' }}></div>
          <span>ASKERİ / ÖZEL UÇAK</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f8fafc', boxShadow: '0 0 5px #f8fafc' }}></div>
          <span>AKTİF UYDULAR</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 5px #a855f7' }}></div>
          <span>TOR GİZLİ DÜĞÜM</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '10px', height: '2px', background: 'rgba(245, 158, 11, 0.8)', boxShadow: '0 0 5px orange' }}></div>
          <span>DEPREM (DALGA)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 10px #ef4444' }}></div>
          <span>ANLIK HABER / OLAY</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '20px', height: '2px', background: '#fbbf24', boxShadow: '0 0 5px #fbbf24' }}></div>
          <span>BÜYÜK KRİPTO TRANSFERİ</span>
        </div>
      </div>
    </div>
  );
}
