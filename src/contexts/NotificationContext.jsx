import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [notification, setNotification] = useState(null);
    const [timeoutId, setTimeoutId] = useState(null);

    const showNotification = useCallback((message, type = 'info', duration = 3000) => {
        // Clear any existing timeout to prevent multiple notifications overlapping
        setTimeoutId(prevTimeoutId => {
            if (prevTimeoutId) {
                clearTimeout(prevTimeoutId);
            }
            return null;
        });

        setNotification({ message, type });

        const newTimeoutId = setTimeout(() => {
            setNotification(null);
            setTimeoutId(null);
        }, duration);
        setTimeoutId(newTimeoutId);
    }, []); // Empty dependency array for stability

    const hideNotification = useCallback(() => {
        setTimeoutId(prevTimeoutId => {
            if (prevTimeoutId) {
                clearTimeout(prevTimeoutId);
            }
            return null;
        });
        setNotification(null);
    }, []); // Empty dependency array for stability

    return (
        <NotificationContext.Provider value={{ notification, showNotification, hideNotification }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => useContext(NotificationContext);
