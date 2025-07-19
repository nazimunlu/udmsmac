import React from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { Icon, ICONS } from './Icons';

const Notification = () => {
    const { notifications, dismissNotification } = useNotification();

    return (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
            {notifications.map(notification => {
                const bgColor = {
                    info: 'bg-blue-500',
                    success: 'bg-green-500',
                    warning: 'bg-yellow-500',
                    error: 'bg-red-500',
                }[notification.type] || 'bg-gray-500';

                const iconType = {
                    info: ICONS.INFO,
                    success: ICONS.CHECK,
                    warning: ICONS.EXCLAMATION,
                    error: ICONS.CLOSE,
                }[notification.type] || ICONS.INFO;

                return (
                    <div
                        key={notification.id}
                        className={`p-4 rounded-lg shadow-lg text-white flex items-center space-x-3 ${bgColor}`}
                        role="alert"
                    >
                        <Icon path={iconType} className="w-6 h-6" />
                        <p>{notification.message}</p>
                        <button onClick={() => dismissNotification(notification.id)} className="ml-auto p-1 rounded-full hover:bg-white hover:bg-opacity-20">
                            <Icon path={ICONS.CLOSE} className="w-5 h-5" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default Notification;
