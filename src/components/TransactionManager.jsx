import React, { useState, useMemo } from 'react';
import { Icon, ICONS } from './Icons';
import { format } from 'date-fns';
import ConfirmationModal from './ConfirmationModal';
import { useNotification } from '../contexts/NotificationContext';
import apiClient from '../apiClient';

const TransactionManager = ({ transactions, dateRange, onTransactionUpdated }) => {
    const { showNotification } = useNotification();
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [sortBy, setSortBy] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [actionToConfirm, setActionToConfirm] = useState(null);

    // Enhanced transaction data processing
    const processedTransactions = useMemo(() => {
        return transactions.map(transaction => ({
            ...transaction,
            category: transaction.category || 'Uncategorized',
            type: transaction.expenseType || transaction.type,
            isIncome: (transaction.expenseType || transaction.type)?.startsWith('income'),
            month: format(new Date(transaction.transactionDate), 'yyyy-MM'),
            year: format(new Date(transaction.transactionDate), 'yyyy')
        }));
    }, [transactions]);

    // Filtered and sorted transactions
    const filteredTransactions = useMemo(() => {
        let filtered = processedTransactions.filter(transaction => {
            const matchesSearch = transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                transaction.category?.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
            const matchesCategory = categoryFilter === 'all' || transaction.category === categoryFilter;
            
            return matchesSearch && matchesType && matchesCategory;
        });

        // Sorting
        filtered.sort((a, b) => {
            let aValue, bValue;
            
            switch (sortBy) {
                case 'date':
                    aValue = new Date(a.transactionDate);
                    bValue = new Date(b.transactionDate);
                    break;
                case 'amount':
                    aValue = a.amount;
                    bValue = b.amount;
                    break;
                case 'category':
                    aValue = a.category.toLowerCase();
                    bValue = b.category.toLowerCase();
                    break;
                case 'description':
                    aValue = a.description?.toLowerCase() || '';
                    bValue = b.description?.toLowerCase() || '';
                    break;
                case 'type':
                    aValue = a.type.toLowerCase();
                    bValue = b.type.toLowerCase();
                    break;
                default:
                    aValue = new Date(a.transactionDate);
                    bValue = new Date(b.transactionDate);
            }

            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        return filtered;
    }, [processedTransactions, searchTerm, typeFilter, categoryFilter, sortBy, sortOrder]);

    // Analytics data
    const analyticsData = useMemo(() => {
        const totalIncome = filteredTransactions
            .filter(t => t.isIncome)
            .reduce((sum, t) => sum + t.amount, 0);
        
        const totalExpenses = filteredTransactions
            .filter(t => !t.isIncome)
            .reduce((sum, t) => sum + t.amount, 0);

        const categoryBreakdown = filteredTransactions.reduce((acc, t) => {
            const category = t.category;
            if (!acc[category]) {
                acc[category] = { amount: 0, count: 0, income: 0, expenses: 0 };
            }
            acc[category].amount += t.amount;
            acc[category].count += 1;
            if (t.isIncome) {
                acc[category].income += t.amount;
            } else {
                acc[category].expenses += t.amount;
            }
            return acc;
        }, {});

        const typeBreakdown = filteredTransactions.reduce((acc, t) => {
            const type = t.type;
            if (!acc[type]) {
                acc[type] = { amount: 0, count: 0 };
            }
            acc[type].amount += t.amount;
            acc[type].count += 1;
            return acc;
        }, {});

        return {
            totalIncome,
            totalExpenses,
            netProfit: totalIncome - totalExpenses,
            categoryBreakdown,
            typeBreakdown,
            totalTransactions: filteredTransactions.length,
            averageTransaction: filteredTransactions.length > 0 ? 
                (totalIncome + totalExpenses) / filteredTransactions.length : 0
        };
    }, [filteredTransactions]);

    const handleDelete = (transaction) => {
        setActionToConfirm({
            type: 'delete',
            transaction,
            message: `Are you sure you want to delete the ${transaction.isIncome ? 'income' : 'expense'} transaction "${transaction.description}"? This action cannot be undone.`
        });
        setIsConfirmModalOpen(true);
    };

    const handleEdit = (transaction) => {
        // For now, we'll show a notification that editing should be done in the respective sections
        // This maintains the edit functionality while directing users to the proper forms
        showNotification('Please edit this transaction in its respective section (Payments, Business Expenses, or Personal Expenses).', 'info');
    };

    const confirmAction = async () => {
        if (actionToConfirm?.type === 'delete') {
            try {
                await apiClient.delete('transactions', actionToConfirm.transaction.id);
                showNotification('Transaction deleted successfully!', 'success');
                onTransactionUpdated(); // Refresh data
            } catch (error) {
                console.error("Error deleting transaction:", error);
                showNotification('Failed to delete transaction.', 'error');
            }
        }
        setIsConfirmModalOpen(false);
        setActionToConfirm(null);
    };

    const getTypeIcon = (type) => {
        const iconMap = {
            'income-group': ICONS.USERS,
            'income-tutoring': ICONS.GRADUATION_CAP,
            'expense-business': ICONS.BRIEFCASE,
            'expense-personal': ICONS.USER
        };
        return iconMap[type] || ICONS.INFO;
    };

    const getTypeColor = (type) => {
        const colorMap = {
            'income-group': 'bg-green-100 text-green-800',
            'income-tutoring': 'bg-blue-100 text-blue-800',
            'expense-business': 'bg-red-100 text-red-800',
            'expense-personal': 'bg-orange-100 text-orange-800'
        };
        return colorMap[type] || 'bg-gray-100 text-gray-800';
    };

    const getCategoryIcon = (category) => {
        const iconMap = {
            'Rent': ICONS.BUILDING,
            'Food': ICONS.UTENSILS,
            'Transportation': ICONS.CAR,
            'Utilities': ICONS.BOLT,
            'Marketing': ICONS.BULLHORN,
            'Equipment': ICONS.TOOLS,
            'Salaries': ICONS.USERS,
            'Insurance': ICONS.SHIELD,
            'Taxes': ICONS.CALCULATOR,
            'Entertainment': ICONS.MUSIC,
            'Shopping': ICONS.SHOPPING_CART,
            'Healthcare': ICONS.HEART,
            'Education': ICONS.GRADUATION_CAP,
            'Housing': ICONS.HOME,
            'Travel': ICONS.PLANE,
            'Student Payment': ICONS.WALLET,
            'Other': ICONS.INFO
        };
        return iconMap[category] || ICONS.INFO;
    };

    const getCategoryColor = (category) => {
        const colorMap = {
            'Rent': 'bg-red-100 text-red-800',
            'Food': 'bg-orange-100 text-orange-800',
            'Transportation': 'bg-blue-100 text-blue-800',
            'Utilities': 'bg-yellow-100 text-yellow-800',
            'Marketing': 'bg-purple-100 text-purple-800',
            'Equipment': 'bg-green-100 text-green-800',
            'Salaries': 'bg-indigo-100 text-indigo-800',
            'Insurance': 'bg-pink-100 text-pink-800',
            'Taxes': 'bg-gray-100 text-gray-800',
            'Entertainment': 'bg-purple-100 text-purple-800',
            'Shopping': 'bg-pink-100 text-pink-800',
            'Healthcare': 'bg-red-100 text-red-800',
            'Education': 'bg-green-100 text-green-800',
            'Housing': 'bg-indigo-100 text-indigo-800',
            'Travel': 'bg-teal-100 text-teal-800',
            'Student Payment': 'bg-green-100 text-green-800',
            'Other': 'bg-gray-100 text-gray-800'
        };
        return colorMap[category] || 'bg-gray-100 text-gray-800';
    };

    const getTypeLabel = (type) => {
        const labelMap = {
            'income-group': 'Income (Group)',
            'income-tutoring': 'Income (Tutoring)',
            'expense-business': 'Expense (Business)',
            'expense-personal': 'Expense (Personal)'
        };
        return labelMap[type] || type;
    };

    const allCategories = useMemo(() => {
        const categories = new Set();
        processedTransactions.forEach(t => {
            if (t.category) categories.add(t.category);
        });
        return ['all', ...Array.from(categories).sort()];
    }, [processedTransactions]);

    const allTypes = useMemo(() => {
        const types = new Set();
        processedTransactions.forEach(t => {
            if (t.type) types.add(t.type);
        });
        return ['all', ...Array.from(types).sort()];
    }, [processedTransactions]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Transaction Management</h2>
                    <p className="text-gray-600 mt-1">View and manage all financial transactions. Add new transactions in their respective sections (Payments, Business Expenses, Personal Expenses).</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-green-100 text-sm font-medium">Total Income</p>
                            <p className="text-2xl font-bold">{analyticsData.totalIncome.toFixed(2)} ₺</p>
                        </div>
                        <Icon path={ICONS.WALLET} className="w-8 h-8 text-green-200" />
                    </div>
                </div>
                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-red-100 text-sm font-medium">Total Expenses</p>
                            <p className="text-2xl font-bold">{analyticsData.totalExpenses.toFixed(2)} ₺</p>
                        </div>
                        <Icon path={ICONS.BRIEFCASE} className="w-8 h-8 text-red-200" />
                    </div>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-sm font-medium">Net Profit</p>
                            <p className="text-2xl font-bold">{analyticsData.netProfit.toFixed(2)} ₺</p>
                        </div>
                        <Icon path={ICONS.CHART_LINE} className="w-8 h-8 text-blue-200" />
                    </div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-purple-100 text-sm font-medium">Transactions</p>
                            <p className="text-2xl font-bold">{analyticsData.totalTransactions}</p>
                        </div>
                        <Icon path={ICONS.LIST} className="w-8 h-8 text-purple-200" />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                    <div className="flex-1 max-w-md">
                        <div className="relative">
                            <Icon path={ICONS.SEARCH} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search transactions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="all">All Types</option>
                            {allTypes.slice(1).map(type => (
                                <option key={type} value={type}>{getTypeLabel(type)}</option>
                            ))}
                        </select>
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="all">All Categories</option>
                            {allCategories.slice(1).map(category => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                        <select
                            value={`${sortBy}-${sortOrder}`}
                            onChange={(e) => {
                                const [field, order] = e.target.value.split('-');
                                setSortBy(field);
                                setSortOrder(order);
                            }}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="date-desc">Date (Newest)</option>
                            <option value="date-asc">Date (Oldest)</option>
                            <option value="amount-desc">Amount (High-Low)</option>
                            <option value="amount-asc">Amount (Low-High)</option>
                            <option value="category-asc">Category A-Z</option>
                            <option value="type-asc">Type A-Z</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Transactions List */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredTransactions.map((transaction) => (
                                <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{transaction.description}</div>
                                        {transaction.invoiceName && (
                                            <div className="text-sm text-gray-500">
                                                <Icon path={ICONS.DOCUMENTS} className="w-3 h-3 inline mr-1" />
                                                {transaction.invoiceName}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(transaction.type)}`}>
                                            <Icon path={getTypeIcon(transaction.type)} className="w-3 h-3 mr-1" />
                                            {getTypeLabel(transaction.type)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(transaction.category)}`}>
                                            <Icon path={getCategoryIcon(transaction.category)} className="w-3 h-3 mr-1" />
                                            {transaction.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <span className={`font-semibold ${transaction.isIncome ? 'text-green-600' : 'text-red-600'}`}>
                                            {transaction.isIncome ? '+' : '-'}{transaction.amount.toFixed(2)} ₺
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {format(new Date(transaction.transactionDate), 'MMM dd, yyyy')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => handleEdit(transaction)}
                                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                                                title="Edit transaction in respective section"
                                            >
                                                <Icon path={ICONS.INFO} className="w-3 h-3 mr-1" />
                                                Info
                                            </button>
                                            <button
                                                onClick={() => handleDelete(transaction)}
                                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                                                title="Delete transaction"
                                            >
                                                <Icon path={ICONS.DELETE} className="w-3 h-3 mr-1" />
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredTransactions.length === 0 && (
                    <div className="text-center py-8">
                        <Icon path={ICONS.INFO} className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No transactions found for the selected filters.</p>
                    </div>
                )}
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

export default TransactionManager; 