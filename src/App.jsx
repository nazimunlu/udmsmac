import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppProvider } from './contexts/AppContext';
import Notification from './components/Notification';
import Dashboard from './components/Dashboard';
import ErrorBoundary from './components/ErrorBoundary';
import Auth from './components/Auth';
import SessionTimeoutWarning from './components/SessionTimeoutWarning';
import { supabase } from './supabaseClient';
import { useNotification } from './contexts/NotificationContext';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();
  const logoutTimerRef = useRef(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60 * 60 * 1000); // 1 hour in milliseconds

  // Auto-logout functionality
  const resetLogoutTimer = useCallback(() => {
    if (session) {
      const now = Date.now();
      setSessionStartTime(now);
      setTimeLeft(60 * 60 * 1000); // Reset to 1 hour
      
      // Clear existing timer
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
      }
      
      const timer = setTimeout(() => {
        showNotification('Session expired due to inactivity. Please log in again.', 'warning');
        supabase.auth.signOut();
      }, 60 * 60 * 1000); // 1 hour in milliseconds
      
      logoutTimerRef.current = timer;
    }
  }, [session, showNotification]);

  // Update time left every second
  useEffect(() => {
    if (session && sessionStartTime) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - sessionStartTime;
        const remaining = Math.max(0, 60 * 60 * 1000 - elapsed);
        setTimeLeft(remaining);
        
        if (remaining <= 0) {
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [session, sessionStartTime]);

  const handleExtendSession = useCallback(() => {
    resetLogoutTimer();
    showNotification('Session extended!', 'success');
  }, [resetLogoutTimer, showNotification]);

  const handleLogoutNow = useCallback(() => {
    supabase.auth.signOut();
  }, []);

  // Activity listeners
  useEffect(() => {
    if (session) {
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      
      const handleActivity = () => {
        resetLogoutTimer();
      };

      events.forEach(event => {
        document.addEventListener(event, handleActivity, true);
      });

      // Initial timer setup
      resetLogoutTimer();

      return () => {
        events.forEach(event => {
          document.removeEventListener(event, handleActivity, true);
        });
        if (logoutTimerRef.current) {
          clearTimeout(logoutTimerRef.current);
        }
      };
    }
  }, [session, resetLogoutTimer]);

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
        // Clear any existing logout timer
        if (logoutTimerRef.current) {
          clearTimeout(logoutTimerRef.current);
          logoutTimerRef.current = null;
        }
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
          <>
            <Dashboard />
            <SessionTimeoutWarning
              timeLeft={timeLeft}
              onExtendSession={handleExtendSession}
              onLogout={handleLogoutNow}
            />
          </>
        )}
      </ErrorBoundary>
      <Notification />
    </AppProvider>
  );
}

export default App;
