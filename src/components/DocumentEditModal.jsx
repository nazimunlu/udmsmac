import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import Modal from './Modal';
import { FormInput, FormSelect } from './Form';
import { useNotification } from '../contexts/NotificationContext';
import { useAppContext } from '../contexts/AppContext';

const DocumentEditModal = ({ isOpen, onClose, documentToEdit }) => {
    const { showNotification } = useNotification();
    const { fetchData } = useAppContext();
    const [formData, setFormData] = useState({
        name: '',
        type: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (documentToEdit) {
            setFormData({
                name: documentToEdit.name || '',
                type: documentToEdit.type || '',
            });
        }
    }, [documentToEdit]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Check if this is a virtual document (generated from transactions or students)
            if (documentToEdit.isTransactionDocument || documentToEdit.isStudentDocument) {
                showNotification('This document cannot be edited directly. Please edit the original record (business expense or student enrollment) instead.', 'info');
                onClose();
                return;
            }

            // Only update actual documents in the documents table
            await apiClient.update('documents', documentToEdit.id, { name: formData.name, type: formData.type });
            showNotification('Document updated successfully!', 'success');
            fetchData();
            onClose();
        } catch (error) {
            console.error("Error updating document:", error);
            showNotification('Failed to update document.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const documentTypes = [
        { value: 'nationalId', label: 'National ID' },
        { value: 'agreement', label: 'Agreement' },
        { value: 'certificate', label: 'Certificate' },
        { value: 'invoice', label: 'Invoice' },
        { value: 'other', label: 'Other' },
    ];

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Edit Document"
            headerStyle={{ backgroundColor: '#2563EB' }}
        >
            <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                    <FormInput label="Document Name" name="name" value={formData.name} onChange={handleChange} required />
                    <FormSelect label="Document Type" name="type" value={formData.type} onChange={handleChange} required>
                        {documentTypes.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </FormSelect>
                </div>
                <div className="flex justify-end pt-8 mt-8 border-t border-gray-200 space-x-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed">{isSubmitting ? 'Saving...' : 'Save Changes'}</button>
                </div>
            </form>
        </Modal>
    );
};

export default DocumentEditModal;
