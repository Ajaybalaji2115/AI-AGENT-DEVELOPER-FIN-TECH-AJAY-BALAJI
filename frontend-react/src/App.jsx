import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Layout from './Layout';
import ChatView from './ChatView';
import DataView from './DataView';
import SecurityView from './SecurityView';
import LearningView from './LearningView';
import TraceView from './TraceView';
import WhatIfView from './WhatIfView';
import AccessView from './AccessView';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<Layout />}>
          <Route index element={<ChatView />} />
          <Route path="data" element={<DataView />} />
          <Route path="security" element={<SecurityView />} />
          <Route path="learning" element={<LearningView />} />
          <Route path="trace" element={<TraceView />} />
          <Route path="whatif" element={<WhatIfView />} />
          <Route path="access" element={<AccessView />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
