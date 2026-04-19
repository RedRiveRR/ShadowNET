import { useEffect, useRef } from 'react';
import { useMetricsStore } from './store/useMetricsStore';
import GlobeMap from './components/GlobeMap';
import RadarMap2D from './components/RadarMap2D';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import BottomDrawer from './components/BottomDrawer';
import Legend from './components/Legend';
import { startDataStreams } from './services/api';
import { Globe as GlobeIcon, Crosshair } from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';
function App() {
  const isStarted = useRef(false);
  const { activeView, setActiveView } = useMetricsStore();

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
          onClick={() => setActiveView('RADAR')}
          style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: activeView === 'RADAR' ? '#facc15' : 'transparent', color: activeView === 'RADAR' ? '#000' : '#94a3b8', cursor: 'pointer', transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '0.75rem' }}
        >
          <Crosshair size={14} /> TACTICAL RADAR
        </button>
      </div>

      {/* CONDITIONAL MAIN VIEW */}
      {activeView === 'GLOBE' ? (
        <ErrorBoundary>
          <GlobeMap />
          <LeftPanel />
          <RightPanel />
          
          <Legend />
          <BottomDrawer />
        </ErrorBoundary>
      ) : (
        <ErrorBoundary>
          <RadarMap2D />
        </ErrorBoundary>
      )}
    </div>
  );
}

export default App;
