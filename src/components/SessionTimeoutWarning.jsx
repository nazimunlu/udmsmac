import React, { useState, useEffect } from 'react';
import { Icon, ICONS } from './Icons';

const SessionTimeoutWarning = ({ onExtendSession, onLogout, timeLeft }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Show warning when 5 minutes or less remain
        if (timeLeft <= 5 * 60 * 1000 && timeLeft > 0) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    }, [timeLeft]);

    if (!isVisible) return null;

    const minutes = Math.floor(timeLeft / (60 * 1000));
    const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);

    return (
        <div className="fixed top-4 right-4 z-50 bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg p-4 max-w-sm">
            <div className="flex items-start">
                <div className="flex-shrink-0">
                    <Icon path={ICONS.WARNING} className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-yellow-800">
                        Session Timeout Warning
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                        <p>Your session will expire in:</p>
                        <p className="font-mono text-lg font-bold text-yellow-800">
                            {minutes}:{seconds.toString().padStart(2, '0')}
                        </p>
                    </div>
                    <div className="mt-4 flex space-x-3">
                        <button
                            onClick={onExtendSession}
                            className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 transition-colors"
                        >
                            Stay Logged In
                        </button>
                        <button
                            onClick={onLogout}
                            className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 transition-colors"
                        >
                            Logout Now
                        </button>
                    </div>
                </div>
                <button
                    onClick={() => setIsVisible(false)}
                    className="ml-3 flex-shrink-0"
                >
                    <Icon path={ICONS.CLOSE} className="h-4 w-4 text-yellow-400 hover:text-yellow-600" />
                </button>
            </div>
        </div>
    );
};

export default SessionTimeoutWarning; 