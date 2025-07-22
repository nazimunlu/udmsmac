import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Modal from './Modal';
import { FormInput, FormSelect, FormSection } from './Form';
import CustomDatePicker from './CustomDatePicker';
import { useAppContext } from '../contexts/AppContext';
import apiClient from '../apiClient';

const TransactionFormModal = ({ isOpen, onClose, transactionToEdit, defaultCategory }) => {
    const { fetchData } = useAppContext();
    const mandatoryInvoiceCategories = ['Rent', 'Materials', 'Bills'];
    const [formData, setFormData] = useState({
        expense_type: 'income-group',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        category: '',
        invoiceUrl: '',
        invoiceName: '',
    });
    const [invoiceFile, setInvoiceFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);

    useEffect(() => {
        if (transactionToEdit) {
            setFormData({
                expense_type: transactionToEdit.expense_type || '',
                amount: transactionToEdit.amount || '',
                date: new Date(transactionToEdit.transaction_date).toISOString().split('T')[0],
                description: transactionToEdit.description || '',
                category: transactionToEdit.category || '',
                invoice_url: transactionToEdit.invoice_url || '',
                invoice_name: transactionToEdit.invoice_name || '',
            });
        } else {
            setFormData(prev => ({
                expense_type: defaultCategory ? (defaultCategory.includes('business') ? 'expense-business' : 'expense-personal') : 'income-group',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                description: '',
                category: defaultCategory || '',
                invoice_url: '',
                invoice_name: '',
            }));
        }
        setInvoiceFile(null);
        setStatusMessage(null);
    }, [transactionToEdit, isOpen, defaultCategory]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setInvoiceFile(e.target.files[0]);
            setFormData(prev => ({ ...prev, invoice_name: e.target.files[0].name }));
        }
    };

    const uploadFile = async (file, path) => {
        if (!file) return null;
        const { data, error } = await supabase.storage.from('udms').upload(path, file);
        if (error) throw error;
        return supabase.storage.from('udms').getPublicUrl(path).data.publicUrl;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatusMessage(null);

        const mandatoryInvoiceCategories = ['Rent', 'Materials', 'Bills'];
        const isBusinessExpense = formData.expense_type === 'expense-business';
        const isMandatoryCategory = mandatoryInvoiceCategories.includes(formData.category);

        if (isBusinessExpense && isMandatoryCategory && !invoiceFile && !formData.invoice_url) {
            setStatusMessage({ type: 'error', text: 'Invoice upload is mandatory for this category.' });
            return;
        }

        setIsSubmitting(true);
        let dataToSave = { ...formData };

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setStatusMessage({ type: 'error', text: 'You must be logged in to upload invoices.' });
                setIsSubmitting(false);
                return;
            }

            if (invoiceFile) {
                const invoicePath = `transactions/${user.id}/${Date.now()}_${invoiceFile.name}`;
                dataToSave.invoice_url = await uploadFile(invoiceFile, invoicePath);
            }

            dataToSave.transaction_date = new Date(formData.date).toISOString();
            dataToSave.amount = parseFloat(formData.amount);

            if (transactionToEdit) {
                await apiClient.update('transactions', transactionToEdit.id, dataToSave);
            } else {
                await apiClient.create('transactions', dataToSave);
            }
            fetchData();
            onClose();
        } catch (error) {
            console.error("Error saving transaction:", error);
            setStatusMessage({ type: 'error', text: 'Failed to save transaction. Please check console for details.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const transactionTypes = [
        { value: 'income-group', label: 'Income (Group)' },
        { value: 'income-tutoring', label: 'Income (Tutoring)' },
        { value: 'expense-business', label: 'Expense (Business)' },
        { value: 'expense-personal', label: 'Expense (Personal)' },
    ];

    const businessCategories = ['Rent', 'Materials', 'Bills', 'Salaries', 'Marketing', 'Other'];
    const personalCategories = ['Food', 'Transportation', 'Entertainment', 'Other'];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={transactionToEdit ? "Edit Transaction" : "Log New Transaction"}>
            <form onSubmit={handleSubmit}>
                <FormSection title="Transaction Details">
                    <div className="sm:col-span-6">
                        <FormSelect label="Type" name="expense_type" value={formData.expense_type} onChange={handleChange}>
                            {transactionTypes.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </FormSelect>
                    </div>
                    <div className="sm:col-span-3">
                        <FormInput label="Amount (₺)" name="amount" type="number" value={formData.amount} onChange={handleChange} required />
                    </div>
                    <div className="sm:col-span-3">
                        <CustomDatePicker label="Date" name="date" value={formData.date} onChange={handleChange} required />
                    </div>
                    <div className="sm:col-span-6">
                        <FormInput label="Description" name="description" value={formData.description} onChange={handleChange} />
                    </div>
                    {(formData.expense_type === 'expense-business' || formData.expense_type === 'expense-personal') && (
                        <div className="sm:col-span-6">
                            <FormSelect label="Category" name="category" value={formData.category} onChange={handleChange} required>
                                <option value="">Select a category</option>
                                {formData.expense_type === 'expense-business' && businessCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                                {formData.expense_type === 'expense-personal' && personalCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </FormSelect>
                        </div>
                    )}
                    {(formData.expense_type === 'expense-business' && mandatoryInvoiceCategories.includes(formData.category)) && (
                        <div className="sm:col-span-6">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice</label>
                            <input type="file" name="invoice" onChange={handleFileChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                            {formData.invoice_url && <p className="mt-2 text-sm text-gray-500">Current: <a href={formData.invoice_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{formData.invoice_name || 'View Invoice'}</a></p>}
                            {statusMessage && statusMessage.type === 'error' && <p className="mt-2 text-sm text-red-600">{statusMessage.text}</p>}
                        </div>
                    )}
                    
                </FormSection>
                <div className="flex justify-end pt-8 mt-8 border-t border-gray-200 space-x-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed">{isSubmitting ? 'Saving...' : 'Save Transaction'}</button>
                </div>
            </form>
        </Modal>
    );
};

export default TransactionFormModal;
