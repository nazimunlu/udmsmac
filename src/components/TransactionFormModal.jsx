import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, setDoc, Timestamp } from 'firebase/firestore';
import { useAppContext } from '../contexts/AppContext';
import Modal from './Modal';
import { FormInput, FormSelect, FormSection } from './Form';
import CustomDatePicker from './CustomDatePicker';

const TransactionFormModal = ({ isOpen, onClose, transactionToEdit }) => {
    const { db, userId, appId } = useAppContext();
    const mandatoryInvoiceCategories = ['Rent', 'Materials', 'Bills'];
    const [formData, setFormData] = useState({
        type: 'income-group',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        category: '',
        invoiceUrl: '',
        invoiceName: '',
    });
    const [invoiceFile, setInvoiceFile] = useState(null);

    useEffect(() => {
        if (transactionToEdit) {
            setFormData({
                type: transactionToEdit.type || '',
                amount: transactionToEdit.amount || '',
                date: transactionToEdit.date.toDate().toISOString().split('T')[0],
                description: transactionToEdit.description || '',
                category: transactionToEdit.category || '',
                invoiceUrl: transactionToEdit.invoiceUrl || '',
                invoiceName: transactionToEdit.invoiceName || '',
            });
        } else {
            setFormData({
                type: 'income-group',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                description: '',
                category: '',
                invoiceUrl: '',
                invoiceName: '',
            });
        }
        setInvoiceFile(null);
        setStatusMessage(null);
    }, [transactionToEdit, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatusMessage(null);

        const mandatoryInvoiceCategories = ['Rent', 'Materials', 'Bills'];
        const isBusinessExpense = formData.type === 'expense-business';
        const isMandatoryCategory = mandatoryInvoiceCategories.includes(formData.category);

        setIsSubmitting(true);
        let dataToSave = { ...formData };

        try {
            dataToSave.date = Timestamp.fromDate(new Date(formData.date.replace(/-/g, '/')));
            dataToSave.amount = parseFloat(formData.amount);

            if (transactionToEdit) {
                const transactionDocRef = doc(db, 'artifacts', appId, 'users', userId, 'transactions', transactionToEdit.id);
                await setDoc(transactionDocRef, dataToSave, { merge: true });
            } else {
                const transactionsCollectionPath = collection(db, 'artifacts', appId, 'users', userId, 'transactions');
                await addDoc(transactionsCollectionPath, dataToSave);
            }
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
                        <FormSelect label="Type" name="type" value={formData.type} onChange={handleChange}>
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
                    {(formData.type === 'expense-business' || formData.type === 'expense-personal') && (
                        <div className="sm:col-span-6">
                            <FormSelect label="Category" name="category" value={formData.category} onChange={handleChange} required>
                                <option value="">Select a category</option>
                                {formData.type === 'expense-business' && businessCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                                {formData.type === 'expense-personal' && personalCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </FormSelect>
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
