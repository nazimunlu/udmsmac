import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { formatDate } from '../utils/formatDate';
import CustomDatePicker from './CustomDatePicker';
import { FormSelect } from './Form';
import { useAppContext } from '../contexts/AppContext';
import ConfirmationModal from './ConfirmationModal';
import { Icon, ICONS } from './Icons';
import { useNotification } from '../contexts/NotificationContext';
import apiClient from '../apiClient';

const FinancialReports = ({ formatCurrency }) => {
    // Override formatCurrency to remove decimals
    const formatCurrencyNoDecimals = (amount) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };
    const { transactions } = useAppContext();
    const { showNotification } = useNotification();
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        type: 'all',
        category: 'all',
    });
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [actionToConfirm, setActionToConfirm] = useState(null);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const transactionDate = new Date(t.date);
            const start = filters.startDate ? new Date(filters.startDate) : null;
            const end = filters.endDate ? new Date(filters.endDate) : null;

            if (start && transactionDate < start) return false;
            if (end && transactionDate > end) return false;
            if (filters.type !== 'all' && t.expense_type !== filters.type) return false;
            if (filters.category !== 'all' && t.category !== filters.category) return false;

            return true;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [transactions, filters]);

    const totalIncome = filteredTransactions
        .filter(t => t.expense_type.startsWith('income'))
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = filteredTransactions
        .filter(t => t.expense_type.startsWith('expense'))
        .reduce((sum, t) => sum + t.amount, 0);

    const allCategories = useMemo(() => {
        const categories = new Set();
        transactions.forEach(t => {
            if (t.category) categories.add(t.category);
        });
        return ['all', ...Array.from(categories)];
    }, [transactions]);

    const handleEdit = (transaction) => {
        // For now, we'll show a notification that editing should be done in the respective sections
        // This maintains the edit functionality while directing users to the proper forms
        showNotification('Please edit this transaction in its respective section (Payments, Business Expenses, or Personal Expenses).', 'info');
    };

    const handleDelete = (transaction) => {
        setActionToConfirm({
            type: 'delete',
            transaction,
            message: `Are you sure you want to delete the transaction "${transaction.description}"? This action cannot be undone.`
        });
        setIsConfirmModalOpen(true);
    };

    const confirmAction = async () => {
        if (actionToConfirm?.type === 'delete') {
            try {
                await apiClient.delete('transactions', actionToConfirm.transaction.id);
                showNotification('Transaction deleted successfully!', 'success');
                // Refresh data by calling the parent's fetchData
                window.location.reload(); // Simple refresh for now
            } catch (error) {
                console.error("Error deleting transaction:", error);
                showNotification('Failed to delete transaction.', 'error');
            }
        }
        setIsConfirmModalOpen(false);
        setActionToConfirm(null);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-lg shadow-md">
                <CustomDatePicker label="Start Date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
                <CustomDatePicker label="End Date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
                <FormSelect label="Type" name="type" value={filters.type} onChange={handleFilterChange}>
                    <option value="all">All Types</option>
                    <option value="income-group">Income (Group)</option>
                    <option value="income-tutoring">Income (Tutoring)</option>
                    <option value="expense-business">Expense (Business)</option>
                    <option value="expense-personal">Expense (Personal)</option>
                </FormSelect>
                <FormSelect label="Category" name="category" value={filters.category} onChange={handleFilterChange}>
                    {allCategories.map(cat => (
                        <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
                    ))}
                </FormSelect>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-md text-center">
                    <h3 className="text-gray-600 text-sm font-semibold uppercase">Total Income</h3>
                    <p className="text-2xl font-bold text-green-700">{formatCurrency(totalIncome)}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md text-center">
                    <h3 className="text-gray-600 text-sm font-semibold uppercase">Total Expenses</h3>
                    <p className="text-2xl font-bold text-red-700">{formatCurrency(totalExpenses)}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md text-center">
                    <h3 className="text-gray-600 text-sm font-semibold uppercase">Net Profit</h3>
                    <p className={`text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? 'text-blue-700' : 'text-yellow-700'}`}>
                        {formatCurrency(totalIncome - totalExpenses)}
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-3 font-semibold text-gray-600 uppercase">Date</th>
                                <th className="p-3 font-semibold text-gray-600 uppercase">Type</th>
                                <th className="p-3 font-semibold text-gray-600 uppercase">Category</th>
                                <th className="p-3 font-semibold text-gray-600 uppercase">Description</th>
                                <th className="p-3 font-semibold text-gray-600 uppercase text-right">Amount</th>
                                <th className="p-3 font-semibold text-gray-600 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredTransactions.length > 0 ? (
                                filteredTransactions.map(t => (
                                    <tr key={t.id} className="hover:bg-gray-50">
                                        <td className="p-3 text-gray-800">{formatDate(t.date)}</td>
                                        <td className="p-3 text-gray-800">{t.expense_type}</td>
                                        <td className="p-3 text-gray-800">{t.category || 'N/A'}</td>
                                        <td className="p-3 text-gray-800">{t.description || 'N/A'}</td>
                                        <td className={`p-3 text-right font-semibold ${t.expense_type.startsWith('income') ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(t.amount)}</td>
                                        <td className="p-3 text-gray-800">
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => handleEdit(t)}
                                                    className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                                                    title="Edit transaction in respective section"
                                                >
                                                    <Icon path={ICONS.INFO} className="w-3 h-3 mr-1" />
                                                    Info
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(t)}
                                                    className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                                                    title="Delete transaction"
                                                >
                                                    <Icon path={ICONS.DELETE} className="w-3 h-3 mr-1" />
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="6" className="p-3 text-center text-gray-500">No transactions found for the selected filters.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

                    {/* Modals */}
        <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={confirmAction}
                title="Confirm Deletion"
                message={actionToConfirm?.message}
                confirmText="Delete"
                cancelText="Cancel"
                confirmButtonStyle="bg-red-600 hover:bg-red-700"
            />
        </div>
    );
};

export default FinancialReports;
