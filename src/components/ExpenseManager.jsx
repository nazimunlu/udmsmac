import React, { useState, useEffect, useMemo } from 'react';
import { Icon, ICONS } from './Icons';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import BusinessExpenseForm from './BusinessExpenseForm';
import PersonalExpenseForm from './PersonalExpenseForm';
import ConfirmationModal from './ConfirmationModal';
import { useNotification } from '../contexts/NotificationContext';
import apiClient from '../apiClient';

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
            type: expense.expenseType?.includes('business') ? 'business' : 'personal',
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
        const businessExpenses = filteredExpenses.filter(e => e.type === 'business');
        const personalExpenses = filteredExpenses.filter(e => e.type === 'expense-personal' || e.type === 'personal');
        
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
                business: monthExpenses.filter(e => e.type === 'business').reduce((sum, e) => sum + e.amount, 0),
                personal: monthExpenses.filter(e => e.type === 'expense-personal' || e.type === 'personal').reduce((sum, e) => sum + e.amount, 0),
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
        if (expense.type === 'business') {
            setIsBusinessExpenseModalOpen(true);
        } else if (expense.type === 'expense-personal' || expense.type === 'personal') {
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
            'Other': 'bg-gray-100 text-gray-800'
        };
        return colorMap[category] || 'bg-gray-100 text-gray-800';
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
                        <Icon path={ICONS.BUILDING} className="w-8 h-8 text-blue-200" />
                    </div>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-orange-100 text-sm font-medium">Personal</p>
                            <p className="text-2xl font-bold">{Math.round(analyticsData.personalExpenses)} ₺</p>
                        </div>
                        <Icon path={ICONS.USER} className="w-8 h-8 text-orange-200" />
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
            <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                    <div className="flex-1 max-w-md">
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
                    <div className="flex gap-4">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="all">All Categories</option>
                            {Object.keys(analyticsData.categoryBreakdown).map(category => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="all">All Types</option>
                            <option value="business">Business</option>
                            <option value="personal">Personal</option>
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
                        </select>
                    </div>
                </div>
            </div>

            {/* Expenses List */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
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
                                                {expense.invoiceName}
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
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            expense.type === 'business' 
                                                ? 'bg-blue-100 text-blue-800' 
                                                : 'bg-orange-100 text-orange-800'
                                        }`}>
                                            <Icon path={expense.type === 'business' ? ICONS.BUILDING : ICONS.USER} className="w-3 h-3 mr-1" />
                                            {expense.type.charAt(0).toUpperCase() + expense.type.slice(1)}
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
                                            >
                                                <Icon path={ICONS.EDIT} className="w-3 h-3 mr-1" />
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(expense)}
                                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
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
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-orange-600 hover:bg-orange-700"
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