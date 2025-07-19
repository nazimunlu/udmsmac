import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [notification, setNotification] = useState(null);
    const [timeoutId, setTimeoutId] = useState(null);

    const showNotification = useCallback((message, type = 'info', duration = 3000) => {
        // Clear any existing timeout to prevent multiple notifications overlapping
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        setNotification({ message, type });

        const newTimeoutId = setTimeout(() => {
            setNotification(null);
            setTimeoutId(null);
        }, duration);
        setTimeoutId(newTimeoutId);
    }, [timeoutId]);

    const hideNotification = useCallback(() => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            setTimeoutId(null);
        }
        setNotification(null);
    }, [timeoutId]);

    return (
        <NotificationContext.Provider value={{ notification, showNotification, hideNotification }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => useContext(NotificationContext);
