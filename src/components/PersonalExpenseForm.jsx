import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Modal from './Modal';
import { FormInput, FormSelect, FormSection } from './Form';
import CustomDatePicker from './CustomDatePicker';
import { useAppContext } from '../contexts/AppContext';
import apiClient from '../apiClient';
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
        category: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

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
                category: expenseToEdit.category || ''
            });
        } else {
            setFormData({
                type: 'expense-personal',
                amount: '',
                transaction_date: new Date().toISOString().split('T')[0],
                description: '',
                category: ''
            });
        }
    }, [expenseToEdit, isOpen]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Validate required fields
            if (!formData.category) {
                showNotification('Please select a category for the expense.', 'error');
                setIsSubmitting(false);
                return;
            }

            if (!formData.amount || parseFloat(formData.amount) <= 0) {
                showNotification('Please enter a valid amount greater than 0.', 'error');
                setIsSubmitting(false);
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                showNotification('You must be logged in to save expenses.', 'error');
                setIsSubmitting(false);
                return;
            }

            let dataToSave = { ...formData };

            // Set both type and expense_type for compatibility
            dataToSave.type = 'expense-personal';
            dataToSave.expense_type = 'personal';

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
            
            // Provide more specific error messages
            if (error.message?.includes('network')) {
                showNotification('Network error. Please check your connection and try again.', 'error');
            } else if (error.message?.includes('permission')) {
                showNotification('Permission denied. Please check your login status.', 'error');
            } else {
                showNotification('Failed to save personal expense. Please try again.', 'error');
            }
        } finally {
            setIsSubmitting(false);
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
                            <p className="text-sm text-gray-600">Track your personal spending</p>
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
                            label="Amount (₺)" 
                            name="amount" 
                            type="number" 
                            step="0.01" 
                            value={formData.amount} 
                            onChange={handleChange} 
                            required
                            placeholder="Enter amount"
                        />
                    </div>

                    <div className="sm:col-span-6">
                        <FormInput 
                            label="Description" 
                            name="description" 
                            value={formData.description} 
                            onChange={handleChange} 
                            placeholder="Brief description of the expense"
                        />
                    </div>

                    <div className="sm:col-span-6">
                        <CustomDatePicker
                            label="Date"
                            name="transaction_date"
                            value={formData.transaction_date}
                            onChange={handleChange}
                            required
                        />
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