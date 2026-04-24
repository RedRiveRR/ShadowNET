import { useEffect, useRef } from 'react';
import { useMetricsStore } from './store/useMetricsStore';
import GlobeMap from './components/GlobeMap';
import RadarMap2D from './components/RadarMap2D';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import BottomDrawer from './components/BottomDrawer';
import { startDataStreams } from './services/api';
import { Globe as GlobeIcon, Crosshair, Ship } from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary';
import MaritimeMap2D from './components/MaritimeMap2D';
import './App.css';
function App() {
  const isStarted = useRef(false);
  const { activeView, setActiveView, uiVisibility, setUIVisibility, isBottomDrawerOpen } = useMetricsStore();

  useEffect(() => {
    if (!isStarted.current) {
      startDataStreams();
      isStarted.current = true;
    }
  }, []);

  return (
    <div className="app-container" style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}>
      {/* TOP COMMAND TABS */}
      <div style={{ position: 'absolute', top: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, display: 'flex', gap: '4px', background: 'rgba(15, 23, 42, 0.8)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.2)', backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
        <button 
          onClick={() => setActiveView('GLOBE')}
          style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: activeView === 'GLOBE' ? '#38bdf8' : 'transparent', color: activeView === 'GLOBE' ? '#000' : '#94a3b8', cursor: 'pointer', transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '0.75rem' }}
        >
          <GlobeIcon size={14} /> GLOBAL ANALYTICS
        </button>
        <button 
          onClick={() => setActiveView('MARITIME')}
          style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: activeView === 'MARITIME' ? '#22d3ee' : 'transparent', color: activeView === 'MARITIME' ? '#000' : '#94a3b8', cursor: 'pointer', transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '0.75rem' }}
        >
          <Ship size={14} /> MARITIME RADAR
        </button>
        <button 
          onClick={() => setActiveView('RADAR')}
          style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: activeView === 'RADAR' ? '#facc15' : 'transparent', color: activeView === 'RADAR' ? '#000' : '#94a3b8', cursor: 'pointer', transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '0.75rem' }}
        >
          <Crosshair size={14} /> TACTICAL RADAR
        </button>
      </div>

      {/* HUD TOGGLES (Fixed Controls - Only in GLOBE, MARITIME and RADAR views) */}
      {(activeView === 'GLOBE' || activeView === 'MARITIME' || activeView === 'RADAR') && (
        <>
          <div style={{ position: 'absolute', bottom: isBottomDrawerOpen ? '46vh' : '48px', left: '24px', zIndex: 1100, display: 'flex', gap: '8px', transition: 'bottom 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
            <HudButton 
              active={uiVisibility.leftPanel} 
              onClick={() => setUIVisibility({ leftPanel: !uiVisibility.leftPanel })} 
              label="INTEL" 
            />
            <HudButton 
              active={uiVisibility.bottomDrawer} 
              onClick={() => setUIVisibility({ bottomDrawer: !uiVisibility.bottomDrawer })} 
              label="TERMINAL" 
            />
          </div>

          <div style={{ position: 'absolute', bottom: isBottomDrawerOpen ? '46vh' : '48px', right: '24px', zIndex: 1100, display: 'flex', gap: '8px', transition: 'bottom 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
            <HudButton 
              active={uiVisibility.rightPanel} 
              onClick={() => setUIVisibility({ rightPanel: !uiVisibility.rightPanel })} 
              label="METRICS" 
            />
          </div>
        </>
      )}

      {/* CONDITIONAL MAIN VIEW */}
      {activeView === 'GLOBE' ? (
        <ErrorBoundary>
          <GlobeMap />
        </ErrorBoundary>
      ) : activeView === 'MARITIME' ? (
        <ErrorBoundary>
          <MaritimeMap2D />
        </ErrorBoundary>
      ) : (
        <ErrorBoundary>
          <RadarMap2D />
        </ErrorBoundary>
      )}

      {/* SHARED HUD OVERLAYS (Filtered by View) */}
      {activeView === 'GLOBE' && (
        <>
          {uiVisibility.leftPanel && <LeftPanel />}
          {uiVisibility.rightPanel && <RightPanel />}
        </>
      )}
      {uiVisibility.bottomDrawer && <BottomDrawer hideBar={activeView !== 'GLOBE'} />}
    </div>
  );
}

function HudButton({ active, onClick, label }: any) {
  return (
    <button 
      onClick={onClick}
      style={{
        padding: '6px 12px',
        borderRadius: '6px',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        background: active ? 'rgba(56, 189, 248, 0.2)' : 'rgba(15, 23, 42, 0.6)',
        color: active ? '#38bdf8' : '#94a3b8',
        cursor: 'pointer',
        fontSize: '0.6rem',
        fontWeight: '900',
        letterSpacing: '1px',
        backdropFilter: 'blur(8px)',
        transition: 'all 0.2s ease'
      }}
    >
      {label} {active ? '[ON]' : '[OFF]'}
    </button>
  );
}
export default App;
