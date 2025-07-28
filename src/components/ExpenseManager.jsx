import React, { useState, useEffect, useMemo } from 'react';
import { Icon, ICONS } from './Icons';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import BusinessExpenseForm from './BusinessExpenseForm';
import PersonalExpenseForm from './PersonalExpenseForm';
import ConfirmationModal from './ConfirmationModal';
import { useNotification } from '../contexts/NotificationContext';
import apiClient from '../apiClient';
import { openDocument, isValidDocumentUrl } from '../utils/documentUtils';

const ExpenseManager = ({ expenses, dateRange, onExpenseAdded }) => {
    const { showNotification } = useNotification();
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [sortBy, setSortBy] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');
    const [selectedExpense, setSelectedExpense] = useState(null);
    const [isBusinessExpenseModalOpen, setIsBusinessExpenseModalOpen] = useState(false);
    const [isPersonalExpenseModalOpen, setIsPersonalExpenseModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [actionToConfirm, setActionToConfirm] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'analytics'

    // Enhanced expense data processing
    const processedExpenses = useMemo(() => {
        return expenses.map(expense => ({
            ...expense,
            category: expense.category || 'Uncategorized',
            type: expense.type, // Keep original type for consistency
            month: format(new Date(expense.transactionDate), 'yyyy-MM'),
            year: format(new Date(expense.transactionDate), 'yyyy')
        }));
    }, [expenses]);

    // Filtered and sorted expenses
    const filteredExpenses = useMemo(() => {
        let filtered = processedExpenses.filter(expense => {
            const matchesSearch = expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                expense.category?.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
            const matchesType = typeFilter === 'all' || expense.type === typeFilter;
            
            return matchesSearch && matchesCategory && matchesType;
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
    }, [processedExpenses, searchTerm, categoryFilter, typeFilter, sortBy, sortOrder]);

    // Analytics data
    const analyticsData = useMemo(() => {
        const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
        const businessExpenses = filteredExpenses.filter(e => e.type === 'expense-business');
        const personalExpenses = filteredExpenses.filter(e => e.type === 'expense-personal');
        
        // Category breakdown
        const categoryBreakdown = filteredExpenses.reduce((acc, e) => {
            if (!acc[e.category]) {
                acc[e.category] = { amount: 0, count: 0, transactions: [] };
            }
            acc[e.category].amount += e.amount;
            acc[e.category].count += 1;
            acc[e.category].transactions.push(e);
            return acc;
        }, {});

        // Monthly trend
        const months = eachMonthOfInterval({ 
            start: subMonths(dateRange.startDate, 6), 
            end: dateRange.endDate 
        });
        const monthlyData = months.map(month => {
            const monthStr = format(month, 'yyyy-MM');
            const monthExpenses = filteredExpenses.filter(e => e.month === monthStr);
            
            return {
                month: format(month, 'MMM yyyy'),
                total: monthExpenses.reduce((sum, e) => sum + e.amount, 0),
                business: monthExpenses.filter(e => e.type === 'expense-business').reduce((sum, e) => sum + e.amount, 0),
                personal: monthExpenses.filter(e => e.type === 'expense-personal').reduce((sum, e) => sum + e.amount, 0),
                count: monthExpenses.length
            };
        });

        // Top categories
        const topCategories = Object.entries(categoryBreakdown)
            .sort(([,a], [,b]) => b.amount - a.amount)
            .slice(0, 5);

        return {
            totalExpenses,
            businessExpenses: businessExpenses.reduce((sum, e) => sum + e.amount, 0),
            personalExpenses: personalExpenses.reduce((sum, e) => sum + e.amount, 0),
            categoryBreakdown,
            monthlyData,
            topCategories,
            averageExpense: filteredExpenses.length > 0 ? totalExpenses / filteredExpenses.length : 0
        };
    }, [filteredExpenses, dateRange]);

    const handleDelete = (expense) => {
        setActionToConfirm({
            type: 'delete',
            expense,
            message: `Are you sure you want to delete the expense "${expense.description}"? This action cannot be undone.`
        });
        setIsConfirmModalOpen(true);
    };

    const handleEdit = (expense) => {
        setSelectedExpense(expense);
        if (expense.type === 'expense-business') {
            setIsBusinessExpenseModalOpen(true);
        } else if (expense.type === 'expense-personal') {
            setIsPersonalExpenseModalOpen(true);
        }
    };

    const confirmAction = async () => {
        if (actionToConfirm?.type === 'delete') {
            try {
                await apiClient.delete('transactions', actionToConfirm.expense.id);
                showNotification('Expense deleted successfully!', 'success');
                onExpenseAdded(); // Refresh data
            } catch (error) {
                console.error("Error deleting expense:", error);
                showNotification('Failed to delete expense.', 'error');
            }
        }
        setIsConfirmModalOpen(false);
        setActionToConfirm(null);
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
            'Other': ICONS.INFO
        };
        return iconMap[category] || ICONS.INFO;
    };

    const getCategoryColor = (category) => {
        // Business expense categories (blue)
        const businessCategories = ['Rent', 'Marketing', 'Equipment', 'Salaries', 'Insurance', 'Taxes'];
        // Personal expense categories (purple)
        const personalCategories = ['Food', 'Entertainment', 'Shopping', 'Healthcare', 'Housing', 'Travel'];
        // Neutral categories (gray)
        const neutralCategories = ['Transportation', 'Utilities', 'Education', 'Other'];
        
        if (businessCategories.includes(category)) {
            return 'bg-blue-100 text-blue-800';
        } else if (personalCategories.includes(category)) {
            return 'bg-purple-100 text-purple-800';
        } else {
            return 'bg-gray-100 text-gray-800';
        }
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
            'expense-business': 'bg-blue-100 text-blue-800',
            'expense-personal': 'bg-purple-100 text-purple-800'
        };
        return colorMap[type] || 'bg-gray-100 text-gray-800';
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

    const renderAnalyticsView = () => (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-red-100 text-sm font-medium">Total Expenses</p>
                            <p className="text-2xl font-bold">{Math.round(analyticsData.totalExpenses)} ₺</p>
                        </div>
                        <Icon path={ICONS.BRIEFCASE} className="w-8 h-8 text-red-200" />
                    </div>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-sm font-medium">Business</p>
                            <p className="text-2xl font-bold">{Math.round(analyticsData.businessExpenses)} ₺</p>
                        </div>
                        <Icon path={ICONS.BRIEFCASE} className="w-8 h-8 text-blue-200" />
                    </div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-purple-100 text-sm font-medium">Personal</p>
                            <p className="text-2xl font-bold">{Math.round(analyticsData.personalExpenses)} ₺</p>
                        </div>
                        <Icon path={ICONS.USER} className="w-8 h-8 text-purple-200" />
                    </div>
                </div>
            </div>

            {/* Top Categories */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6">Top Expense Categories</h3>
                <div className="space-y-4">
                    {analyticsData.topCategories.map(([category, data], index) => (
                        <div key={category} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mr-4 shadow-sm">
                                    <Icon path={getCategoryIcon(category)} className="w-5 h-5 text-gray-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-800">{category}</p>
                                    <p className="text-sm text-gray-500">{data.count} transactions</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-gray-800">{data.amount.toFixed(2)} ₺</p>
                                <p className="text-sm text-gray-500">
                                    {((data.amount / analyticsData.totalExpenses) * 100).toFixed(1)}%
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderListView = () => (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
                <div className="flex flex-col gap-4">
                    {/* Search Bar */}
                    <div className="w-full">
                        <div className="relative">
                            <Icon path={ICONS.INFO} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search expenses..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                    
                    {/* Filter Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                            <option value="all">All Categories</option>
                            {Object.keys(analyticsData.categoryBreakdown).map(category => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                            <option value="all">All Types</option>
                            <option value="expense-business">Business</option>
                            <option value="expense-personal">Personal</option>
                        </select>
                        <select
                            value={`${sortBy}-${sortOrder}`}
                            onChange={(e) => {
                                const [field, order] = e.target.value.split('-');
                                setSortBy(field);
                                setSortOrder(order);
                            }}
                            className="px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                            <option value="date-desc">Date (Newest)</option>
                            <option value="date-asc">Date (Oldest)</option>
                            <option value="amount-desc">Amount (High-Low)</option>
                            <option value="amount-asc">Amount (Low-High)</option>
                            <option value="category-asc">Category A-Z</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Expenses List */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                {/* Mobile Card View */}
                <div className="block sm:hidden">
                    {filteredExpenses.map((expense) => (
                        <div key={expense.id} className="border-b border-gray-200 p-4 hover:bg-gray-50">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1 min-w-0 pr-4">
                                    <h3 className="text-sm font-medium text-gray-900 truncate mb-1">{expense.description}</h3>
                                    {expense.invoiceName && (
                                        <div className="text-xs text-gray-500">
                                            <Icon path={ICONS.DOCUMENTS} className="w-3 h-3 inline mr-1" />
                                            {expense.invoiceUrl ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        console.log('Document clicked:', expense.invoiceName, 'URL:', expense.invoiceUrl);
                                                        if (isValidDocumentUrl(expense.invoiceUrl)) {
                                                            openDocument(expense.invoiceUrl, expense.invoiceName);
                                                        } else {
                                                            showNotification('Invalid document URL', 'error');
                                                        }
                                                    }}
                                                    className="cursor-pointer hover:underline text-blue-600 hover:text-blue-800 bg-transparent border-none p-0 text-left text-xs"
                                                    title="Click to open document"
                                                >
                                                    {expense.invoiceName}
                                                </button>
                                            ) : (
                                                <span className="text-gray-400">{expense.invoiceName}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-shrink-0">
                                    <span className="font-semibold text-red-600 text-sm">{expense.amount.toFixed(2)} ₺</span>
                                </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(expense.category)}`}>
                                        <Icon path={getCategoryIcon(expense.category)} className="w-3 h-3 mr-1" />
                                        {expense.category}
                                    </span>
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(expense.type)}`}>
                                        <Icon path={getTypeIcon(expense.type)} className="w-3 h-3 mr-1" />
                                        {getTypeLabel(expense.type)}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500">
                                    {format(new Date(expense.transactionDate), 'MMM dd, yyyy')}
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-end gap-2">
                                <button
                                    onClick={() => handleEdit(expense)}
                                    className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                                    title="Edit expense"
                                >
                                    <Icon path={ICONS.EDIT} className="w-3 h-3 mr-1" />
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(expense)}
                                    className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors"
                                    title="Delete expense"
                                >
                                    <Icon path={ICONS.TRASH} className="w-3 h-3 mr-1" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* Desktop Table View */}
                <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full min-w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredExpenses.map((expense) => (
                                <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{expense.description}</div>
                                        {expense.invoiceName && (
                                            <div className="text-sm text-gray-500">
                                                <Icon path={ICONS.DOCUMENTS} className="w-3 h-3 inline mr-1" />
                                                {expense.invoiceUrl ? (
                                                                                                    <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        console.log('Document clicked:', expense.invoiceName, 'URL:', expense.invoiceUrl);
                                                        if (isValidDocumentUrl(expense.invoiceUrl)) {
                                                            openDocument(expense.invoiceUrl, expense.invoiceName);
                                                        } else {
                                                            showNotification('Invalid document URL', 'error');
                                                        }
                                                    }}
                                                    className="cursor-pointer hover:underline text-blue-600 hover:text-blue-800 bg-transparent border-none p-0 text-left"
                                                    title="Click to open document"
                                                >
                                                    {expense.invoiceName}
                                                </button>
                                                ) : (
                                                    <span className="text-gray-400">{expense.invoiceName}</span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(expense.category)}`}>
                                            <Icon path={getCategoryIcon(expense.category)} className="w-3 h-3 mr-1" />
                                            {expense.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(expense.type)}`}>
                                            <Icon path={getTypeIcon(expense.type)} className="w-3 h-3 mr-1" />
                                            {getTypeLabel(expense.type)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <span className="font-semibold text-red-600">{expense.amount.toFixed(2)} ₺</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {format(new Date(expense.transactionDate), 'MMM dd, yyyy')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => handleEdit(expense)}
                                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                                                title="Edit expense"
                                            >
                                                <Icon path={ICONS.EDIT} className="w-3 h-3 mr-1" />
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(expense)}
                                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                                                title="Delete expense"
                                            >
                                                <Icon path={ICONS.TRASH} className="w-3 h-3 mr-1" />
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Expense Management</h2>
                        <p className="text-gray-600 mt-1">Track and analyze your business and personal expenses</p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                    viewMode === 'list'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <Icon path={ICONS.MENU} className="w-4 h-4 inline mr-2" />
                                List
                            </button>
                            <button
                                onClick={() => setViewMode('analytics')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                    viewMode === 'analytics'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <Icon path={ICONS.CHART_LINE} className="w-4 h-4 inline mr-2" />
                                Analytics
                            </button>
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setIsBusinessExpenseModalOpen(true)}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
                            >
                                <Icon path={ICONS.BRIEFCASE} className="w-4 h-4 mr-2" />
                                Business
                            </button>
                            <button
                                onClick={() => setIsPersonalExpenseModalOpen(true)}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700"
                            >
                                <Icon path={ICONS.USER} className="w-4 h-4 mr-2" />
                                Personal
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            {viewMode === 'analytics' ? renderAnalyticsView() : renderListView()}

            {/* Modals */}
            <BusinessExpenseForm
                isOpen={isBusinessExpenseModalOpen}
                onClose={() => {
                    setIsBusinessExpenseModalOpen(false);
                    setSelectedExpense(null);
                }}
                expenseToEdit={selectedExpense}
                onExpenseAdded={onExpenseAdded}
            />

            <PersonalExpenseForm
                isOpen={isPersonalExpenseModalOpen}
                onClose={() => {
                    setIsPersonalExpenseModalOpen(false);
                    setSelectedExpense(null);
                }}
                expenseToEdit={selectedExpense}
                onExpenseAdded={onExpenseAdded}
            />

            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={confirmAction}
                title="Confirm Action"
                message={actionToConfirm?.message || ''}
            />
        </div>
    );
};

export default ExpenseManager; 