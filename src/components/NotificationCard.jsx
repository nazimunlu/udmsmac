import React from 'react';
import { Icon, ICONS } from './Icons';

const NotificationCard = ({ message, type, onDismiss }) => {
    const bgColor = {
        info: 'bg-blue-100 border-blue-400 text-blue-800',
        warning: 'bg-yellow-100 border-yellow-400 text-yellow-800',
        error: 'bg-red-100 border-red-400 text-red-800',
        success: 'bg-green-100 border-green-400 text-green-800',
    }[type] || 'bg-gray-100 border-gray-400 text-gray-800';

    const iconType = {
        info: ICONS.INFO,
        warning: ICONS.EXCLAMATION,
        error: ICONS.CLOSE,
        success: ICONS.CHECK,
    }[type] || ICONS.INFO;

    return (
        <div className={`flex items-center justify-between p-4 border-l-4 rounded-md shadow-md ${bgColor}`}>
            <div className="flex items-center">
                <Icon path={iconType} className="w-6 h-6 mr-3" />
                <p className="font-medium">{message}</p>
            </div>
            {onDismiss && (
                <button onClick={onDismiss} className="text-gray-500 hover:text-gray-700">
                    <Icon path={ICONS.CLOSE} className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

export default NotificationCard;