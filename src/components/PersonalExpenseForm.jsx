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

const PersonalExpenseForm = ({ isOpen, onClose, expenseToEdit, onExpenseAdded }) => {
    const { fetchData } = useAppContext();
    const { showNotification } = useNotification();
    const [formData, setFormData] = useState({
        type: 'expense-personal',
        amount: '',
        transaction_date: new Date().toISOString().split('T')[0],
        description: '',
        category: '',
        receipt_url: '',
        receipt_name: ''
    });
    const [receiptFile, setReceiptFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const personalCategories = [
        { value: 'Food', label: 'Food & Dining', icon: ICONS.UTENSILS, color: 'bg-orange-100 text-orange-800' },
        { value: 'Transportation', label: 'Transportation', icon: ICONS.CAR, color: 'bg-blue-100 text-blue-800' },
        { value: 'Entertainment', label: 'Entertainment', icon: ICONS.MUSIC, color: 'bg-purple-100 text-purple-800' },
        { value: 'Shopping', label: 'Shopping & Retail', icon: ICONS.SHOPPING_CART, color: 'bg-pink-100 text-pink-800' },
        { value: 'Healthcare', label: 'Healthcare', icon: ICONS.HEART, color: 'bg-red-100 text-red-800' },
        { value: 'Education', label: 'Education & Learning', icon: ICONS.GRADUATION_CAP, color: 'bg-green-100 text-green-800' },
        { value: 'Housing', label: 'Housing & Rent', icon: ICONS.HOME, color: 'bg-indigo-100 text-indigo-800' },
        { value: 'Utilities', label: 'Utilities & Bills', icon: ICONS.BOLT, color: 'bg-yellow-100 text-yellow-800' },
        { value: 'Travel', label: 'Travel & Vacation', icon: ICONS.PLANE, color: 'bg-teal-100 text-teal-800' },
        { value: 'Other', label: 'Other Personal', icon: ICONS.INFO, color: 'bg-gray-100 text-gray-800' }
    ];

    const budgetCategories = [
        { value: 'essential', label: 'Essential Expenses' },
        { value: 'discretionary', label: 'Discretionary Spending' },
        { value: 'luxury', label: 'Luxury & Treats' },
        { value: 'investment', label: 'Investment in Self' }
    ];

    const paymentMethods = [
        { value: 'cash', label: 'Cash', icon: ICONS.MONEY_BILL_WAVE },
        { value: 'credit_card', label: 'Credit Card', icon: ICONS.WALLET },
        { value: 'debit_card', label: 'Debit Card', icon: ICONS.CREDIT_CARD },
        { value: 'bank_transfer', label: 'Bank Transfer', icon: ICONS.BUILDING },
        { value: 'mobile_payment', label: 'Mobile Payment', icon: ICONS.MOBILE }
    ];

    const recurringFrequencies = [
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' },
        { value: 'quarterly', label: 'Quarterly' },
        { value: 'yearly', label: 'Yearly' }
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
                type: 'expense-personal',
                amount: expenseToEdit.amount || '',
                transaction_date: dateString,
                description: expenseToEdit.description || '',
                category: expenseToEdit.category || '',
                receipt_url: expenseToEdit.receipt_url || '',
                receipt_name: expenseToEdit.receipt_name || ''
            });
        } else {
            setFormData({
                type: 'expense-personal',
                amount: '',
                transaction_date: new Date().toISOString().split('T')[0],
                description: '',
                category: '',
                receipt_url: '',
                receipt_name: ''
            });
        }
        setReceiptFile(null);
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
            setReceiptFile(e.target.files[0]);
            setFormData(prev => ({ ...prev, receipt_name: e.target.files[0].name }));
        }
    };

    const uploadFile = async (file, path) => {
        if (!file) return null;
        
        const { data, error } = await supabase.storage
            .from('udms')
            .upload(path, file, {
                onUploadProgress: (progress) => {
                    setUploadProgress((progress.loaded / progress.total) * 100);
                }
            });
            
        if (error) throw error;
        return supabase.storage.from('udms').getPublicUrl(path).data.publicUrl;
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
            dataToSave.type = 'expense-personal';
            dataToSave.expense_type = 'personal';

            // Upload receipt if provided
            if (receiptFile) {
                const sanitizedFileName = sanitizeFileName(receiptFile.name);
                const receiptPath = `personal_expenses/${user.id}/${Date.now()}_${sanitizedFileName}`;
                dataToSave.receipt_url = await uploadFile(receiptFile, receiptPath);
            }

            // Convert amount to number
            dataToSave.amount = parseFloat(formData.amount);

            if (expenseToEdit) {
                await apiClient.update('transactions', expenseToEdit.id, dataToSave);
                showNotification('Personal expense updated successfully!', 'success');
            } else {
                await apiClient.create('transactions', dataToSave);
                showNotification('Personal expense logged successfully!', 'success');
            }

            fetchData();
            onExpenseAdded?.();
            onClose();
        } catch (error) {
            console.error("Error saving personal expense:", error);
            showNotification('Failed to save personal expense. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
            setUploadProgress(0);
        }
    };

    const getCategoryIcon = (category) => {
        if (!category) return ICONS.INFO;
        const found = personalCategories.find(cat => cat.value === category);
        return found ? found.icon : ICONS.INFO;
    };

    const getCategoryColor = (category) => {
        if (!category) return 'bg-gray-100 text-gray-800';
        const found = personalCategories.find(cat => cat.value === category);
        return found ? found.color : 'bg-gray-100 text-gray-800';
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Log Personal Expense" 
            size="lg"
            headerStyle={{ backgroundColor: '#8B5CF6' }}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                            <Icon path={ICONS.USER} className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800">Personal Expense</h3>
                            <p className="text-sm text-gray-600">Track your personal spending for better financial management</p>
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
                            <option value="">Select a personal category</option>
                            {personalCategories.map(cat => (
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
                            placeholder="What did you spend money on?"
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

                    <div className="sm:col-span-6">
                        <FormInput 
                            label="Location/Store" 
                            name="location" 
                            value={formData.location} 
                            onChange={handleChange}
                            placeholder="Where did you make this purchase?"
                        />
                    </div>
                </FormSection>

                {/* Budget & Payment Information */}
                <FormSection title="Budget & Payment">
                    <div className="sm:col-span-6">
                        <FormSelect 
                            label="Budget Category" 
                            name="budget_category" 
                            value={formData.budget_category} 
                            onChange={handleChange}
                        >
                            <option value="">Select budget category</option>
                            {budgetCategories.map(cat => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                        </FormSelect>
                    </div>

                    <div className="sm:col-span-6">
                        <FormSelect 
                            label="Payment Method" 
                            name="payment_method" 
                            value={formData.payment_method} 
                            onChange={handleChange}
                            required
                        >
                            {paymentMethods.map(method => (
                                <option key={method.value} value={method.value}>{method.label}</option>
                            ))}
                        </FormSelect>
                    </div>

                    <div className="sm:col-span-6">
                        <div className="flex items-center space-x-4">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="essential"
                                    checked={formData.essential}
                                    onChange={handleChange}
                                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">Essential Expense</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="recurring"
                                    checked={formData.recurring}
                                    onChange={handleChange}
                                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">Recurring Expense</span>
                            </label>
                        </div>
                    </div>

                    {formData.recurring && (
                        <div className="sm:col-span-6">
                            <FormSelect 
                                label="Recurring Frequency" 
                                name="recurring_frequency" 
                                value={formData.recurring_frequency} 
                                onChange={handleChange}
                            >
                                {recurringFrequencies.map(freq => (
                                    <option key={freq.value} value={freq.value}>{freq.label}</option>
                                ))}
                            </FormSelect>
                        </div>
                    )}
                </FormSection>

                {/* Receipt Upload */}
                <FormSection title="Receipt">
                    <div className="sm:col-span-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Receipt Photo
                            <span className="text-gray-500 ml-1">(Optional)</span>
                        </label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-orange-400 transition-colors">
                            <div className="space-y-1 text-center">
                                <Icon path={ICONS.CAMERA} className="mx-auto h-12 w-12 text-gray-400" />
                                <div className="flex text-sm text-gray-600">
                                    <label className="relative cursor-pointer bg-white rounded-md font-medium text-orange-600 hover:text-orange-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-orange-500">
                                        <span>Upload a photo</span>
                                        <input 
                                            type="file" 
                                            name="receipt" 
                                            onChange={handleFileChange}
                                            accept=".jpg,.jpeg,.png,.pdf"
                                            className="sr-only"
                                        />
                                    </label>
                                    <p className="pl-1">or drag and drop</p>
                                </div>
                                <p className="text-xs text-gray-500">JPG, PNG, PDF up to 10MB</p>
                            </div>
                        </div>
                        {receiptFile && (
                            <div className="mt-2 flex items-center text-sm text-gray-600">
                                <Icon path={ICONS.DOCUMENTS} className="w-4 h-4 mr-1" />
                                {receiptFile.name}
                            </div>
                        )}
                        {uploadProgress > 0 && uploadProgress < 100 && (
                            <div className="mt-2">
                                <div className="bg-gray-200 rounded-full h-2">
                                    <div 
                                        className="bg-orange-600 h-2 rounded-full transition-all duration-300"
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
                                    {personalCategories.find(cat => cat.value === formData.category)?.label}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-600">Amount:</span>
                                <span className="ml-2 font-semibold text-red-600">
                                    {formData.amount ? `${parseFloat(formData.amount).toFixed(2)} ₺` : 'Not set'}
                                </span>
                            </div>
                            {formData.essential && (
                                <div className="col-span-2">
                                    <span className="text-orange-600 text-xs">✓ Essential expense</span>
                                </div>
                            )}
                            {formData.budget_category && (
                                <div className="col-span-2">
                                    <span className="text-blue-600 text-xs">📊 {budgetCategories.find(cat => cat.value === formData.budget_category)?.label}</span>
                                </div>
                            )}
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
                        className="px-6 py-2 rounded-lg text-white bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSubmitting ? 'Saving...' : (expenseToEdit ? 'Update Expense' : 'Log Expense')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default PersonalExpenseForm; 