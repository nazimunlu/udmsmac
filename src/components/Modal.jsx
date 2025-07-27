import React, { useState, useEffect } from 'react';
import { Icon, ICONS } from './Icons';

const Modal = ({ isOpen, onClose, title, children, titleRightContent, headerStyle }) => {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setShow(true), 10); // Delay to allow CSS transition
        } else {
            setShow(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div 
            className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
            <div 
                className={`bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col transform transition-all duration-300 ${show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
                onClick={e => e.stopPropagation()}
            >
                <div 
                    className="flex items-center justify-between p-5 border-b border-gray-200 sticky top-0 z-10 rounded-t-lg text-white" 
                    style={{ backgroundColor: '#3B82F6', ...headerStyle }}
                >
                    {typeof title === 'string' ? (
                        <h3 className="text-xl font-bold">{title}</h3>
                    ) : (
                        <div>{title}</div>
                    )}
                    <div className="flex items-center space-x-4">
                        {titleRightContent}
                        <button onClick={onClose} className="p-2 rounded-full text-white/70 hover:bg-white/20 transition-colors">
                            <Icon path={ICONS.CLOSE} className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className="p-6 overflow-y-auto">{children}</div>
            </div>
        </div>
    );
};

export default Modal;