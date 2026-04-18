import { useEffect, useRef } from 'react';
import GlobeMap from './components/GlobeMap';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import BottomDrawer from './components/BottomDrawer';
import { startDataStreams } from './services/api';
import './App.css';

function App() {
  const isStarted = useRef(false);

  useEffect(() => {
    // Only start streams once (Strict Mode protection)
    if (!isStarted.current) {
      startDataStreams();
      isStarted.current = true;
    }
  }, []);

  return (
    <div className="app-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* 3D Globe renders in the background */}
      <GlobeMap />
      
      {/* Dashboard UI Overlay */}
      <LeftPanel />
      <RightPanel />
      <BottomDrawer />
    </div>
  );
}

export default App;
