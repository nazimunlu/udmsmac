import React from 'react';
import { Icon, ICONS } from './Icons';

const NotificationCard = ({ message, type, onDismiss }) => {
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
        <div className={`flex items-center justify-between p-4 border rounded-lg shadow-sm ${bgColor} ${textColor}`}>
            <div className="flex items-center">
                <Icon path={iconType} className={`w-5 h-5 mr-3 ${iconColor}`} />
                <p className="font-medium text-sm">{message}</p>
            </div>
            {onDismiss && (
                <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600">
                    <Icon path={ICONS.CLOSE} className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

export default NotificationCard;