import React from 'react';
import { Icon, ICONS } from './Icons';

const NotificationCard = ({ message, details, type, onDismiss }) => {
    const bgColor = {
        info: 'bg-blue-50 border-blue-200',
        warning: 'bg-yellow-50 border-yellow-200',
        error: 'bg-red-50 border-red-200',
        success: 'bg-green-50 border-green-200',
    }[type] || 'bg-gray-50 border-gray-200';

    const textColor = {
        info: 'text-blue-800',
        warning: 'text-yellow-800',
        error: 'text-red-800',
        success: 'text-green-800',
    }[type] || 'text-gray-800';

    const iconColor = {
        info: 'text-blue-500',
        warning: 'text-yellow-500',
        error: 'text-red-500',
        success: 'text-green-500',
    }[type] || 'text-gray-500';

    const iconType = {
        info: ICONS.INFO,
        warning: ICONS.EXCLAMATION,
        error: ICONS.CLOSE,
        success: ICONS.CHECK,
    }[type] || ICONS.INFO;

    return (
        <div className={`p-4 border rounded-lg shadow-sm ${bgColor} ${textColor}`}>
            <div className="flex items-start">
                <Icon path={iconType} className={`w-5 h-5 mr-3 mt-1 flex-shrink-0 ${iconColor}`} />
                <div>
                    <p className="font-semibold text-sm">{message}</p>
                    {details && <p className="text-xs mt-1">{details}</p>}
                </div>
            </div>
            {onDismiss && (
                <button onClick={onDismiss} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
                    <Icon path={ICONS.CLOSE} className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

export default NotificationCard;