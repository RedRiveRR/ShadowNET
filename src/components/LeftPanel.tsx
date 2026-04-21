import { useState } from 'react';
import { ShieldAlert, Bitcoin, SearchCode, Globe2, ChevronLeft, Activity } from 'lucide-react';
import { useMetricsStore } from '../store/useMetricsStore';

export default function LeftPanel() {
  const { earthquakes, securityAlerts, cryptoWhales } = useMetricsStore();
  const [isOpen, setIsOpen] = useState(true);

  const quakeCount = (earthquakes || []).filter(q => q.mag > 4.0).length;
  const cyberCount = (securityAlerts || []).filter(a => a.type === 'OTX' || a.type === 'CVE' || a.type === 'MALWARE').length;
  const bgpCount = (securityAlerts || []).filter(a => a.type === 'BGP').length;
  const whaleCount = (cryptoWhales || []).length;

  return (
    <div style={{ position: 'absolute', top: '110px', left: 0, zIndex: 100, display: 'flex', alignItems: 'flex-start' }}>
      {isOpen ? (
        <div className="glass-panel animate-slide-left" style={{ 
          width: '320px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px', 
          padding: '24px', 
          background: 'rgba(10, 15, 25, 0.85)', 
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderLeft: 'none',
          borderRadius: '0 20px 20px 0',
          boxShadow: '20px 25px 60px rgba(0,0,0,0.6)'
        }}>
          {/* SYSTEM IDENTIFIERS */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid rgba(56, 189, 248, 0.1)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '0.6rem', color: '#38bdf8', letterSpacing: '3px', fontWeight: 'bold' }}>SYSTEM IDENTIFIERS</div>
                <div style={{ fontSize: '1rem', fontWeight: '900', color: '#fff', fontFamily: 'Orbitron, sans-serif' }}>CORE STATUS</div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px', borderRadius: '50%' }}>
                <ChevronLeft size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <MetricCell 
              icon={<ShieldAlert size={20} />} 
              label="KINETIC CONFLICT ZONE" 
              value={cyberCount > 0 ? `${cyberCount} INCIDENTS` : 'SECURED'} 
              subText="REAL-TIME OSINT MONITORING"
              color={cyberCount > 0 ? "#ef4444" : "#22c55e"}
            />

            <MetricCell 
              icon={<Globe2 size={20} />} 
              label="ENCRYPTED TOR ENTRY" 
              value={bgpCount > 0 ? `${bgpCount} NODES DETECTED` : 'OPTIMIZED'} 
              subText="PEERING STATUS: SYNCED"
              color={bgpCount > 0 ? "#ec4899" : "#38bdf8"}
            />

            <MetricCell 
              icon={<Bitcoin size={20} />} 
              label="WHALE TX DETECTED" 
              value={whaleCount > 0 ? `${whaleCount} ACTIVE OPS` : 'STANDBY'} 
              subText="ENCRYPTED NODE MONITORING"
              color="#fbbf24"
            />

            <MetricCell 
              icon={<SearchCode size={20} />} 
              label="NEURAL LINK (CORRELATION)" 
              value={quakeCount > 0 ? "88% SYNCED" : "AI OPTIMIZED"} 
              subText="NEURAL NETWORK STABILITY"
              color="#fff"
            />
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          style={{ 
            background: 'rgba(10, 15, 25, 0.9)', 
            border: '1px solid rgba(56, 189, 248, 0.3)', 
            borderLeft: 'none', 
            borderRadius: '0 12px 12px 0', 
            padding: '16px 10px', 
            color: '#38bdf8', 
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            boxShadow: '10px 0 30px rgba(0,0,0,0.5)',
            transition: 'all 0.3s ease'
          }}
        >
          <Activity size={22} />
        </button>
      )}
    </div>
  );
}

function MetricCell({ icon, label, value, subText, color }: any) {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '14px', 
      padding: '14px', 
      background: 'rgba(255,255,255,0.02)', 
      borderRadius: '14px', 
      border: '1px solid rgba(255,255,255,0.05)',
      transition: 'all 0.2s ease'
    }}>
      <div style={{ 
        background: `${color}15`, 
        padding: '10px', 
        borderRadius: '10px', 
        border: `1px solid ${color}30`,
        color: color 
      }}>
        {icon}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', letterSpacing: '1px' }}>{label}</div>
        <div style={{ color: color, fontSize: '0.95rem', fontWeight: '900', fontFamily: 'Orbitron, sans-serif' }}>{value}</div>
        <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.2)', marginTop: '2px', fontFamily: 'monospace' }}>{subText}</div>
      </div>
    </div>
  );
}
