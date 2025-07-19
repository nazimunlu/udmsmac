import React, { useState, useEffect } from 'react';
import { Icon, ICONS } from './Icons';

const Modal = ({ isOpen, onClose, title, children }) => {
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
            className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 to-slate-700/50 backdrop-blur-sm"></div>
            <div 
                className={`bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col transform transition-all duration-300 ${show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-5 border-b border-gray-200 sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white z-10 rounded-t-lg">
                    {typeof title === 'string' ? (
                        <h3 className="text-2xl font-bold">{title}</h3>
                    ) : (
                        <div>{title}</div>
                    )}
                    <button onClick={onClose} className="p-2 rounded-full text-white/70 hover:bg-white/20 transition-colors"><Icon path={ICONS.CLOSE} className="w-5 h-5" /></button>
                </div>
                <div className="p-6 overflow-y-auto">{children}</div>
            </div>
        </div>
    );
};

export default Modal;