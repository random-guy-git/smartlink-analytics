import React from 'react';
import AnalyticsDashboard from './AnalyticsDashboard';

function App() {
  // TEST DATA: Replace 'arun_profile' with a hubId that actually has clicks in your database
  const TEST_HUB_ID = "arun_profile"; 

  return (
    // This container simulates the full screen size
    <div style={{ width: '100vw', height: '100vh' }}>
      <AnalyticsDashboard hubId={TEST_HUB_ID} />
    </div>
  );
}

export default App;