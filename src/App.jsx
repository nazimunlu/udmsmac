import React from 'react';
import { AppProvider } from './contexts/AppContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Notification from './components/Notification';
import Dashboard from './components/Dashboard';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <NotificationProvider>
      <AppProvider>
        <ErrorBoundary>
          <Dashboard />
        </ErrorBoundary>
        <Notification />
      </AppProvider>
    </NotificationProvider>
  );
}

export default App;
