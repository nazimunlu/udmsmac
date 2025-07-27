import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Modal from './Modal';
import { FormInput, FormSelect, FormSection } from './Form';
import CustomDatePicker from './CustomDatePicker';
import { useAppContext } from '../contexts/AppContext';
import apiClient from '../apiClient';
import { sanitizeFileName } from '../utils/caseConverter';
import { Icon, ICONS } from './Icons';
import { useNotification } from '../contexts/NotificationContext';

const BusinessExpenseForm = ({ isOpen, onClose, expenseToEdit, onExpenseAdded }) => {
    const { fetchData } = useAppContext();
    const { showNotification } = useNotification();
    const [formData, setFormData] = useState({
        type: 'expense-business',
        amount: '',
        transaction_date: new Date().toISOString().split('T')[0],
        description: '',
        category: '',
        invoice_url: '',
        invoice_name: ''
    });
    const [invoiceFile, setInvoiceFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const businessCategories = [
        { value: 'Rent', label: 'Rent & Utilities', icon: ICONS.BUILDING, color: 'bg-red-100 text-red-800' },
        { value: 'Materials', label: 'Teaching Materials', icon: ICONS.BOOK_OPEN, color: 'bg-blue-100 text-blue-800' },
        { value: 'Bills', label: 'Utility Bills', icon: ICONS.BOLT, color: 'bg-yellow-100 text-yellow-800' },
        { value: 'Salaries', label: 'Employee Salaries', icon: ICONS.USERS, color: 'bg-green-100 text-green-800' },
        { value: 'Marketing', label: 'Marketing & Advertising', icon: ICONS.BULLHORN, color: 'bg-purple-100 text-purple-800' },
        { value: 'Equipment', label: 'Equipment & Technology', icon: ICONS.TOOLS, color: 'bg-indigo-100 text-indigo-800' },
        { value: 'Insurance', label: 'Insurance', icon: ICONS.SHIELD, color: 'bg-pink-100 text-pink-800' },
        { value: 'Taxes', label: 'Taxes & Licenses', icon: ICONS.CALCULATOR, color: 'bg-gray-100 text-gray-800' },
        { value: 'Travel', label: 'Travel & Transportation', icon: ICONS.CAR, color: 'bg-orange-100 text-orange-800' },
        { value: 'Other', label: 'Other Business Expenses', icon: ICONS.INFO, color: 'bg-gray-100 text-gray-800' }
    ];



    useEffect(() => {
        if (expenseToEdit) {
            // Safely convert transaction date to YYYY-MM-DD format
            let dateString = '';
            try {
                const transactionDate = expenseToEdit.transaction_date;
                if (transactionDate) {
                    const date = new Date(transactionDate);
                    if (!isNaN(date.getTime())) {
                        dateString = date.toISOString().split('T')[0];
                    } else {
                        dateString = new Date().toISOString().split('T')[0];
                    }
                } else {
                    dateString = new Date().toISOString().split('T')[0];
                }
            } catch (error) {
                console.warn('Error parsing transaction date:', error);
                dateString = new Date().toISOString().split('T')[0];
            }

            setFormData({
                type: 'expense-business',
                amount: expenseToEdit.amount || '',
                transaction_date: dateString,
                description: expenseToEdit.description || '',
                category: expenseToEdit.category || '',
                invoice_url: expenseToEdit.invoice_url || '',
                invoice_name: expenseToEdit.invoice_name || ''
            });
        } else {
            setFormData({
                type: 'expense-business',
                amount: '',
                transaction_date: new Date().toISOString().split('T')[0],
                description: '',
                category: '',
                invoice_url: '',
                invoice_name: ''
            });
        }
        setInvoiceFile(null);
        setUploadProgress(0);
    }, [expenseToEdit, isOpen]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: type === 'checkbox' ? checked : value 
        }));
    };

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setInvoiceFile(e.target.files[0]);
            setFormData(prev => ({ ...prev, invoice_name: e.target.files[0].name }));
        }
    };

    const uploadFile = async (file, path) => {
        try {
            const { data, error } = await supabase.storage
                .from('udms')
                .upload(path, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error('Storage upload error:', error);
                throw new Error('Storage access denied. Please check your permissions or try again.');
            }

            return supabase.storage.from('udms').getPublicUrl(path).data.publicUrl;
        } catch (error) {
            console.error('File upload failed:', error);
            throw error;
        }
    };

    const generateFileName = (description, amount, originalFileName) => {
        const sanitizedDescription = description.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ\s]/g, '').trim().replace(/\s+/g, '_');
        const fileExtension = originalFileName.split('.').pop().toLowerCase();
        const amountStr = amount ? `_${amount}TL` : '';
        return `${sanitizedDescription}${amountStr}_Invoice.${fileExtension}`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setUploadProgress(0);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                showNotification('You must be logged in to save expenses.', 'error');
                return;
            }

            let dataToSave = { ...formData };

            // Set both type and expense_type for compatibility
            dataToSave.type = 'expense-business';
            dataToSave.expense_type = 'business';

            // Upload invoice if provided
            if (invoiceFile) {
                const invoiceFileName = generateFileName(formData.description, formData.amount, invoiceFile.name);
                const invoicePath = `business_expenses/${user.id}/${Date.now()}_${invoiceFileName}`;
                dataToSave.invoice_url = await uploadFile(invoiceFile, invoicePath);
                dataToSave.invoice_name = invoiceFileName;
            }

            // Convert amount to number
            dataToSave.amount = parseFloat(formData.amount);

            console.log('Saving business expense data:', JSON.stringify(dataToSave, null, 2));

            if (expenseToEdit) {
                const result = await apiClient.update('transactions', expenseToEdit.id, dataToSave);
                console.log('Update result:', result);
                showNotification('Business expense updated successfully!', 'success');
            } else {
                const result = await apiClient.create('transactions', dataToSave);
                console.log('Create result:', result);
                showNotification('Business expense logged successfully!', 'success');
            }

            console.log('Expense saved successfully, refreshing data...');
            await fetchData();
            onExpenseAdded?.();
            onClose();
        } catch (error) {
            console.error("Error saving business expense:", error);
            console.error("Error details:", error.message);
            console.error("Error response:", error.response);
            showNotification(`Failed to save business expense: ${error.message}`, 'error');
        } finally {
            setIsSubmitting(false);
            setUploadProgress(0);
        }
    };

    const getCategoryIcon = (category) => {
        if (!category) return ICONS.INFO;
        const found = businessCategories.find(cat => cat.value === category);
        return found ? found.icon : ICONS.INFO;
    };

    const getCategoryColor = (category) => {
        if (!category) return 'bg-gray-100 text-gray-800';
        const found = businessCategories.find(cat => cat.value === category);
        return found ? found.color : 'bg-gray-100 text-gray-800';
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Log Business Expense" 
            size="lg"
            headerStyle={{ backgroundColor: '#2563EB' }}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                            <Icon path={ICONS.BRIEFCASE} className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800">Business Expense</h3>
                            <p className="text-sm text-gray-600">Track your business-related expenses for tax and accounting purposes</p>
                        </div>
                    </div>
                </div>

                {/* Basic Information */}
                <FormSection title="Expense Details">
                    <div className="sm:col-span-6">
                        <FormSelect 
                            label="Category" 
                            name="category" 
                            value={formData.category} 
                            onChange={handleChange} 
                            required
                        >
                            <option value="">Select a business category</option>
                            {businessCategories.map(cat => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                        </FormSelect>
                    </div>

                    <div className="sm:col-span-6">
                        <FormInput 
                            label="Description" 
                            name="description" 
                            value={formData.description} 
                            onChange={handleChange}
                            placeholder="Brief description of the expense..."
                            required
                        />
                    </div>

                    <div className="sm:col-span-3">
                        <FormInput 
                            label="Amount (₺)" 
                            name="amount" 
                            type="number" 
                            step="0.01"
                            value={formData.amount} 
                            onChange={handleChange} 
                            required
                        />
                    </div>

                    <div className="sm:col-span-3">
                        <CustomDatePicker 
                            label="Date" 
                            name="transaction_date" 
                            value={formData.transaction_date} 
                            onChange={handleChange} 
                            required
                        />
                    </div>

                </FormSection>

                {/* Invoice Upload */}
                <FormSection title="Invoice & Documentation">
                    <div className="sm:col-span-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Invoice Receipt
                            <span className="text-gray-500 ml-1">(Optional but recommended)</span>
                        </label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-400 transition-colors">
                            <div className="space-y-1 text-center">
                                <Icon path={ICONS.UPLOAD} className="mx-auto h-12 w-12 text-gray-400" />
                                <div className="flex text-sm text-gray-600">
                                    <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                        <span>Upload a file</span>
                                        <input 
                                            type="file" 
                                            name="invoice" 
                                            onChange={handleFileChange}
                                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                            className="sr-only"
                                        />
                                    </label>
                                    <p className="pl-1">or drag and drop</p>
                                </div>
                                <p className="text-xs text-gray-500">PDF, JPG, PNG, DOC up to 10MB</p>
                            </div>
                        </div>
                        {invoiceFile && (
                            <div className="mt-2 flex items-center text-sm text-gray-600">
                                <Icon path={ICONS.DOCUMENTS} className="w-4 h-4 mr-1" />
                                {invoiceFile.name}
                            </div>
                        )}
                        {uploadProgress > 0 && uploadProgress < 100 && (
                            <div className="mt-2">
                                <div className="bg-gray-200 rounded-full h-2">
                                    <div 
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Uploading... {uploadProgress.toFixed(0)}%</p>
                            </div>
                        )}
                    </div>
                </FormSection>

                {/* Summary */}
                {formData.category && (
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-800 mb-2">Expense Summary</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-600">Category:</span>
                                <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(formData.category)}`}>
                                    <Icon path={getCategoryIcon(formData.category)} className="w-3 h-3 mr-1" />
                                    {businessCategories.find(cat => cat.value === formData.category)?.label}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-600">Amount:</span>
                                <span className="ml-2 font-semibold text-red-600">
                                    {formData.amount ? `${Math.round(parseFloat(formData.amount))} ₺` : 'Not set'}
                                </span>
                            </div>

                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end pt-6 border-t border-gray-200 space-x-4">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={isSubmitting} 
                        className="px-6 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSubmitting ? 'Saving...' : (expenseToEdit ? 'Update Expense' : 'Log Expense')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default BusinessExpenseForm; 