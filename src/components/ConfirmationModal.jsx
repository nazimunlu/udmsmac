import React from 'react';
import Modal from './Modal';

const ConfirmationModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    confirmText = "Confirm", 
    confirmStyle = "bg-red-600 hover:bg-red-700",
    disabled = false 
}) => {
    if (!isOpen) return null;
    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={title}
            headerStyle={{ backgroundColor: '#DC2626' }}
        >
            <p className="text-gray-700 mb-6">{message}</p>
            <div className="flex justify-end space-x-4">
                <button 
                    onClick={onClose} 
                    disabled={disabled}
                    className="px-4 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Cancel
                </button>
                <button 
                    onClick={onConfirm} 
                    disabled={disabled}
                    className={`px-4 py-2 rounded-lg text-white ${confirmStyle} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {confirmText}
                </button>
            </div>
        </Modal>
    );
};

export default ConfirmationModal;