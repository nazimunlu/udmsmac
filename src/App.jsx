import React from 'react';
import { AppProvider } from './contexts/AppContext';
import Dashboard from './components/Dashboard';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <AppProvider>
      <ErrorBoundary>
        <Dashboard />
      </ErrorBoundary>
    </AppProvider>
  );
}

export default App;
