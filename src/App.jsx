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

  const handleLogout = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      showNotification(error.message, 'error');
    } else {
      showNotification('Logged out successfully.', 'info');
    }
    setLoading(false);
  };

  return (
    <AppProvider>
      <ErrorBoundary>
        {!session ? (
          <Auth />
        ) : (
          <div className="relative">
            <button
              onClick={handleLogout}
              className="absolute top-4 right-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              disabled={loading}
            >
              {loading ? 'Logging out...' : 'Logout'}
            </button>
            <Dashboard />
          </div>
        )}
      </ErrorBoundary>
      <Notification />
    </AppProvider>
  );
}

export default App;
