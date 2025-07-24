import React, { useState, useEffect } from 'react';
import { AppProvider } from './contexts/AppContext';
import Notification from './components/Notification';
import Dashboard from './components/Dashboard';
import ErrorBoundary from './components/ErrorBoundary';
import Auth from './components/Auth';
import { supabase } from './supabaseClient';
import { useNotification } from './contexts/NotificationContext';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
      if (_event === 'SIGNED_IN') {
        // showNotification('Welcome!', 'success');
      } else if (_event === 'SIGNED_OUT') {
        showNotification('Logged out successfully.', 'info');
      }
    });

    return () => subscription.unsubscribe();
  }, [showNotification]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading app...</div>;
  }



  return (
    <AppProvider>
      <ErrorBoundary>
        {!session ? (
          <Auth />
        ) : (
          <Dashboard />
        )}
      </ErrorBoundary>
      <Notification />
    </AppProvider>
  );
}

export default App;
