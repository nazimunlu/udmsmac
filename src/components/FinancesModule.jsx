import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { ICONS, Icon } from './Icons';
import DateRangePicker from './DateRangePicker';
import PaymentModal from './PaymentModal';
import InvoiceGenerator from './InvoiceGenerator';
import BusinessExpenseForm from './BusinessExpenseForm';
import PersonalExpenseForm from './PersonalExpenseForm';
import ConfirmationModal from './ConfirmationModal';
import PaymentPlanPrint from './PaymentPlanPrint';
import { format, eachMonthOfInterval, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { useNotification } from '../contexts/NotificationContext';
import { 
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import StudentPaymentsManager from './StudentPaymentsManager';
import ExpenseManager from './ExpenseManager';
import TransactionManager from './TransactionManager';


const FinancesModule = () => {
    const { transactions, students, groups, fetchData, loading } = useAppContext();
    const { showNotification } = useNotification();
    
    const [dateRange, setDateRange] = useState('thisMonth');
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'expenses', 'transactions'
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isPersonalExpenseModalOpen, setIsPersonalExpenseModalOpen] = useState(false);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [filteredExpenses, setFilteredExpenses] = useState([]);
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    const [filteredPayments, setFilteredPayments] = useState([]);
    const [unpaidAmountInPeriod, setUnpaidAmountInPeriod] = useState(0);
    const [totalUnpaidAmount, setTotalUnpaidAmount] = useState(0);
    const [thisMonthUnpaidAmount, setThisMonthUnpaidAmount] = useState(0);
    const [overdueInstallments, setOverdueInstallments] = useState([]);
    const [upcomingInstallments, setUpcomingInstallments] = useState([]);
    const [isDataHidden, setIsDataHidden] = useState(false);
    const [selectedInstallment, setSelectedInstallment] = useState(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isPaymentPlanPrintModalOpen, setIsPaymentPlanPrintModalOpen] = useState(false);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [isBusinessExpenseModalOpen, setIsBusinessExpenseModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    useEffect(() => {
        const filterByDate = (items) => {
            if (!items || !Array.isArray(items)) return [];
            return items.filter(i => {
            const itemDate = new Date(i.transactionDate);
                const isInRange = itemDate >= dateRange.startDate && itemDate <= dateRange.endDate;
                return isInRange;
            });
        };
        
        // Filter transactions to get income (payments)
        const incomeTransactions = transactions?.filter(t => 
            t.type === 'income-group' || t.type === 'income-tutoring'
        ) || [];
        
        // Filter transactions to get expenses
        const expenseTransactions = transactions?.filter(t => 
            t.type === 'expense-business' || t.type === 'expense-personal'
        ) || [];
        
        const filteredP = filterByDate(incomeTransactions);
        const filteredE = filterByDate(expenseTransactions);
        
        setFilteredPayments(filteredP);
        setFilteredExpenses(filteredE);

        // Calculate unpaid installment amount due in the period
        let unpaidTotal = 0;
        let totalUnpaid = 0;
        let thisMonthUnpaid = 0;
        let overdue = [];
        let upcoming = [];
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        // Calculate this month's date range
        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        students?.forEach(student => {
            // Parse installments if it's a string, otherwise use as is
            let installments = student.installments;
            if (typeof installments === 'string') {
                try {
                    installments = JSON.parse(installments);
                } catch (error) {
                    console.error('Error parsing installments for student:', student.id, error);
                    installments = [];
                }
            }
            
            // Ensure installments is an array
            if (!Array.isArray(installments)) {
                installments = [];
            }

            installments.forEach(inst => {
                const dueDate = new Date(inst.dueDate);
                if (inst.status === 'Unpaid') {
                    // Total unpaid amount (all terms)
                    totalUnpaid += inst.amount;
                    
                    // This month's unpaid amount
                    if (dueDate >= thisMonthStart && dueDate <= thisMonthEnd) {
                        thisMonthUnpaid += inst.amount;
                    }
                    
                    // Selected period unpaid amount
                    if (dueDate >= dateRange.startDate && dueDate <= dateRange.endDate) {
                    unpaidTotal += inst.amount;
                    }
                    
                    if (dueDate < today) {
                        overdue.push({ ...inst, student });
                    } else if (dueDate <= nextWeek) {
                        upcoming.push({ ...inst, student });
                    }
                }
            });
        });
        
        setUnpaidAmountInPeriod(unpaidTotal);
        setTotalUnpaidAmount(totalUnpaid);
        setThisMonthUnpaidAmount(thisMonthUnpaid);
        setOverdueInstallments(overdue);
        setUpcomingInstallments(upcoming);

    }, [dateRange, transactions, students]);

    useEffect(() => {
        // Listen for payment plan print events
        const handlePrintPaymentPlan = (event) => {
            console.log('Payment plan event received:', event.detail);
            setSelectedStudent(event.detail.student);
            setIsPaymentPlanPrintModalOpen(true);
        };

        window.addEventListener('printPaymentPlan', handlePrintPaymentPlan);
        
        return () => {
            window.removeEventListener('printPaymentPlan', handlePrintPaymentPlan);
        };
    }, []);

    const openPaymentModal = (student = null) => {
        setSelectedStudent(student);
        setIsPaymentModalOpen(true);
    };

    const openInvoiceModal = (student = null) => {
        setSelectedStudent(student);
        setIsInvoiceModalOpen(true);
    };

    const handleInstallmentPayment = (installment) => {
        setSelectedInstallment(installment);
        setIsPaymentModalOpen(true);
    };

    // Calculate key metrics
    const totalIncome = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalIncome - totalExpenses;
    const businessExpenses = filteredExpenses.filter(e => e.type?.includes('business') || e.expenseType?.includes('business') || e.expense_type === 'business').reduce((sum, e) => sum + e.amount, 0);
    const personalExpenses = filteredExpenses.filter(e => e.type?.includes('personal') || e.expenseType?.includes('personal') || e.expense_type === 'personal').reduce((sum, e) => sum + e.amount, 0);

    // Income breakdown calculations
    const groupIncome = filteredPayments.filter(p => p.type === 'income-group' || p.expenseType === 'income-group').reduce((sum, p) => sum + p.amount, 0);
    const tutoringIncome = filteredPayments.filter(p => p.type === 'income-tutoring' || p.expenseType === 'income-tutoring').reduce((sum, p) => sum + p.amount, 0);

    // Chart data preparation
    const getChartData = () => {
        
        // Business expense breakdown
        const businessExpenseBreakdown = {};
        filteredExpenses.filter(e => e.type?.includes('business') || e.expenseType?.includes('business') || e.expense_type === 'business').forEach(expense => {
            const category = expense.category || 'Other';
            businessExpenseBreakdown[category] = (businessExpenseBreakdown[category] || 0) + expense.amount;
        });

        // Personal expenses as one category
        const personalExpenseTotal = filteredExpenses.filter(e => e.type?.includes('personal') || e.expenseType?.includes('personal') || e.expense_type === 'personal').reduce((sum, e) => sum + e.amount, 0);

        return {
            incomeData: [
                { name: 'Group Income', value: groupIncome, color: '#3B82F6' },
                { name: 'Tutoring Income', value: tutoringIncome, color: '#10B981' }
            ],
            expenseData: [
                ...Object.entries(businessExpenseBreakdown).map(([category, amount], index) => ({
                    name: category,
                    value: amount,
                    color: ['#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'][index % 6]
                })),
                { name: 'Personal Expenses', value: personalExpenseTotal, color: '#6B7280' }
            ],
            barData: [
                { month: 'Income', amount: totalIncome, type: 'income' },
                { month: 'Expenses', amount: totalExpenses, type: 'expense' },
                { month: 'Net Profit', amount: netProfit, type: 'profit' }
            ]
        };
    };

    const chartData = getChartData();

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
        return (
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                    <p className="font-semibold">{label}</p>
                    <p className="text-gray-600">
                        {payload[0].name}: {isDataHidden ? '***' : `${Math.round(payload[0].value)} ₺`}
                    </p>
                </div>
            );
        }
        return null;
    };

    const renderOverview = () => (
        <div className="space-y-8">
            {/* Key Financial Metrics - Enhanced Design */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {/* Total Income */}
                <div className="bg-gradient-to-br from-green-50 to-white rounded-2xl p-4 md:p-6 shadow-lg border border-green-100 hover:shadow-xl transition-all duration-300 group">
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                        <div className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <Icon path={ICONS.INCOME} className="w-5 h-5 md:w-7 md:h-7 text-white" />
                        </div>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                        {isDataHidden ? '***' : `${totalIncome.toFixed(0)} ₺`}
                    </h3>
                    <p className="text-xs md:text-sm font-medium text-green-700 mb-4 md:mb-6">Total Income</p>
                    
                    {/* Income Breakdown */}
                    <div className="space-y-2 md:space-y-3 pt-3 md:pt-4 border-t border-green-100">
                        <div className="flex justify-between items-center text-xs md:text-sm">
                            <span className="text-gray-600 font-medium">Group Classes</span>
                            <span className="font-semibold text-gray-900">{isDataHidden ? '***' : `${groupIncome.toFixed(0)} ₺`}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs md:text-sm">
                            <span className="text-gray-600 font-medium">Tutoring</span>
                            <span className="font-semibold text-gray-900">{isDataHidden ? '***' : `${tutoringIncome.toFixed(0)} ₺`}</span>
                        </div>
                    </div>
                </div>

                {/* Total Expenses */}
                <div className="bg-gradient-to-br from-red-50 to-white rounded-2xl p-4 md:p-6 shadow-lg border border-red-100 hover:shadow-xl transition-all duration-300 group">
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                        <div className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <Icon path={ICONS.BRIEFCASE} className="w-5 h-5 md:w-7 md:h-7 text-white" />
                        </div>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                        {isDataHidden ? '***' : `${totalExpenses.toFixed(0)} ₺`}
                    </h3>
                    <p className="text-xs md:text-sm font-medium text-red-700 mb-4 md:mb-6">Total Expenses</p>
                    
                    {/* Expense Breakdown */}
                    <div className="space-y-2 md:space-y-3 pt-3 md:pt-4 border-t border-red-100">
                        <div className="flex justify-between items-center text-xs md:text-sm">
                            <span className="text-gray-600 font-medium">Business</span>
                            <span className="font-semibold text-gray-900">{isDataHidden ? '***' : `${businessExpenses.toFixed(0)} ₺`}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs md:text-sm">
                            <span className="text-gray-600 font-medium">Personal</span>
                            <span className="font-semibold text-gray-900">{isDataHidden ? '***' : `${personalExpenses.toFixed(0)} ₺`}</span>
                        </div>
                    </div>
                </div>

                {/* Net Profit */}
                <div className={`bg-gradient-to-br ${netProfit >= 0 ? 'from-green-50 to-white' : 'from-red-50 to-white'} rounded-2xl p-4 md:p-6 shadow-lg border ${netProfit >= 0 ? 'border-green-100' : 'border-red-100'} hover:shadow-xl transition-all duration-300 group`}>
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                        <div className={`w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br ${netProfit >= 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                            <Icon path={ICONS.CHART_LINE} className="w-5 h-5 md:w-7 md:h-7 text-white" />
                        </div>
                    </div>
                    <h3 className={`text-2xl md:text-3xl font-bold mb-2 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {isDataHidden ? '***' : `${netProfit >= 0 ? '+' : ''}${netProfit.toFixed(0)} ₺`}
                    </h3>
                    <p className={`text-xs md:text-sm font-medium mb-4 md:mb-6 ${netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>Net Profit</p>
                    
                    {/* Profit Margin */}
                    <div className="pt-3 md:pt-4 border-t border-gray-100">
                        <div className="flex justify-between items-center text-xs md:text-sm">
                            <span className="text-gray-600 font-medium">Profit Margin</span>
                            <span className="font-semibold text-gray-900">
                                {isDataHidden ? '***' : totalIncome > 0 ? `${((netProfit / totalIncome) * 100).toFixed(1)}%` : '0%'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Outstanding Payments */}
                <div className="bg-gradient-to-br from-yellow-50 to-white rounded-2xl p-4 md:p-6 shadow-lg border border-yellow-100 hover:shadow-xl transition-all duration-300 group">
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                        <div className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <Icon path={ICONS.WALLET} className="w-5 h-5 md:w-7 md:h-7 text-white" />
                        </div>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                        {isDataHidden ? '***' : `${totalUnpaidAmount.toFixed(0)} ₺`}
                    </h3>
                    <p className="text-xs md:text-sm font-medium text-yellow-700 mb-4 md:mb-6">Outstanding</p>
                    
                    {/* Outstanding Breakdown */}
                    <div className="space-y-2 md:space-y-3 pt-3 md:pt-4 border-t border-yellow-100">
                        <div className="flex justify-between items-center text-xs md:text-sm">
                            <span className="text-gray-600 font-medium">Total Outstanding</span>
                            <span className="font-semibold text-gray-900">{isDataHidden ? '***' : `${totalUnpaidAmount.toFixed(0)} ₺`}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs md:text-sm">
                            <span className="text-gray-600 font-medium">This Month</span>
                            <span className="font-semibold text-gray-900">{isDataHidden ? '***' : `${thisMonthUnpaidAmount.toFixed(0)} ₺`}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                        onClick={() => openPaymentModal()}
                        className="flex items-center p-4 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
                    >
                        <Icon path={ICONS.WALLET} className="w-5 h-5 text-teal-600 mr-3" />
                        <span className="text-sm font-medium text-teal-900">Record Payment</span>
                    </button>
                    
                    <button
                        onClick={() => setIsBusinessExpenseModalOpen(true)}
                        className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                        <Icon path={ICONS.BRIEFCASE} className="w-5 h-5 text-blue-600 mr-3" />
                        <span className="text-sm font-medium text-blue-900">Add Business Expense</span>
                    </button>
                    
                    <button
                        onClick={() => setIsPersonalExpenseModalOpen(true)}
                        className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                    >
                        <Icon path={ICONS.USER} className="w-5 h-5 text-purple-600 mr-3" />
                        <span className="text-sm font-medium text-purple-900">Add Personal Expense</span>
                    </button>
                    
                    <button
                        onClick={() => openInvoiceModal()}
                        className="flex items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                    >
                        <Icon path={ICONS.DOCUMENTS} className="w-5 h-5 text-orange-600 mr-3" />
                        <span className="text-sm font-medium text-orange-900">Generate Invoice</span>
                    </button>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Financial Activity</h3>
                <div className="space-y-3">
                    {[...filteredPayments, ...filteredExpenses]
                        .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))
                        .slice(0, 5)
                        .map((item, index) => {
                            // Determine if this is income or expense based on transaction type
                            const isIncome = item.type?.startsWith('income') || item.expenseType?.startsWith('income');
                            const isExpense = item.type?.startsWith('expense') || item.expenseType?.startsWith('expense');
                            
                            return (
                                <div key={`${item.id}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                                            isIncome ? 'bg-green-100' : 'bg-red-100'
                                        }`}>
                                            <Icon 
                                                path={isIncome ? ICONS.INCOME : ICONS.BRIEFCASE} 
                                                className={`w-4 h-4 ${isIncome ? 'text-green-600' : 'text-red-600'}`} 
                                            />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {item.description || item.topic || 'Transaction'}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {new Date(item.transactionDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`text-sm font-semibold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                                        {isDataHidden ? '***' : `${isIncome ? '+' : '-'}${Math.abs(item.amount).toFixed(0)} ₺`}
                                    </span>
                                </div>
                            );
                        })}
                </div>
            </div>
        </div>
    );

    const renderPayments = () => (
        <StudentPaymentsManager
            students={students}
            payments={filteredPayments}
            onPaymentRecorded={fetchData}
        />
    );

    const renderExpenses = () => (
        <ExpenseManager 
            expenses={filteredExpenses}
            dateRange={dateRange}
            onExpenseAdded={fetchData}
        />
    );

    const renderTransactions = () => {
        return (
            <TransactionManager 
                transactions={transactions}
                dateRange={dateRange}
                onTransactionUpdated={fetchData}
            />
        );
    };

    return (
        <div className="relative p-4 md:p-8 bg-gray-50 rounded-lg shadow-lg">
            {/* Simple Premium Header */}
            <div className="mb-6 md:mb-8">
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
                    <div className="flex items-center">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-green-600 rounded-lg flex items-center justify-center shadow-sm mr-3 md:mr-4">
                            <Icon path={ICONS.MONEY_BILL_WAVE} className="w-5 h-5 md:w-7 md:h-7 text-white"/>
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">Financial Management</h2>
                            <p className="text-gray-600 text-sm lg:text-base">Track income, expenses, and payments</p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                        <DateRangePicker onDateChange={setDateRange} initialRange={dateRange} />
                        <button 
                            onClick={() => setIsDataHidden(!isDataHidden)} 
                            className="p-2 md:p-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-all duration-300 text-gray-700"
                            title={isDataHidden ? "Show data" : "Hide data"}
                        >
                            <Icon path={isDataHidden ? ICONS.EYE_OFF : ICONS.EYE} className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                        

                    </div>
                </div>
            </div>

            {/* Responsive Tab Navigation */}
            <div className="bg-white rounded-lg p-1 shadow-sm mb-6 overflow-x-auto">
                <div className="flex space-x-1 min-w-max">
                    {[
                        { id: 'overview', label: 'Overview', icon: ICONS.DASHBOARD, shortLabel: 'Overview' },
                        { id: 'payments', label: 'Payments', icon: ICONS.WALLET, shortLabel: 'Payments' },
                        { id: 'expenses', label: 'Expenses', icon: ICONS.BRIEFCASE, shortLabel: 'Expenses' },
                        { id: 'transactions', label: 'All Transactions', icon: ICONS.LIST, shortLabel: 'Transactions' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center px-2 sm:px-3 md:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'bg-green-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                            }`}
                        >
                            <Icon path={tab.icon} className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                            <span className="hidden sm:inline">{tab.label}</span>
                            <span className="sm:hidden">{tab.shortLabel}</span>
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <p className="text-center text-gray-500 mt-8">Loading financial data...</p>
            ) : (
                <>
                    {activeTab === 'overview' && renderOverview()}
                    {activeTab === 'payments' && renderPayments()}
                    {activeTab === 'expenses' && renderExpenses()}
                    {activeTab === 'transactions' && renderTransactions()}
                </>
            )}

            {/* Modals */}
            {isPaymentModalOpen && (
                <PaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    student={selectedStudent}
                    installment={selectedInstallment}
                    onPaymentRecorded={fetchData}
                />
            )}

            {isInvoiceModalOpen && (
                <InvoiceGenerator
                    isOpen={isInvoiceModalOpen}
                    onClose={() => setIsInvoiceModalOpen(false)}
                    student={selectedStudent}
                />
            )}

            {isBusinessExpenseModalOpen && (
                <BusinessExpenseForm
                    isOpen={isBusinessExpenseModalOpen}
                    onClose={() => setIsBusinessExpenseModalOpen(false)}
                    onExpenseAdded={fetchData}
                />
            )}

            {isPersonalExpenseModalOpen && (
                <PersonalExpenseForm
                    isOpen={isPersonalExpenseModalOpen}
                    onClose={() => setIsPersonalExpenseModalOpen(false)}
                    onExpenseAdded={fetchData}
                />
            )}

            {isConfirmModalOpen && (
                <ConfirmationModal
                    isOpen={isConfirmModalOpen}
                    onClose={() => setIsConfirmModalOpen(false)}
                    onConfirm={() => {
                        // Handle confirmation
                        setIsConfirmModalOpen(false);
                    }}
                    title="Confirm Action"
                    message="Are you sure you want to proceed with this action?"
                />
            )}

            {isPaymentPlanPrintModalOpen && selectedStudent && (
                <PaymentPlanPrint
                    onClose={() => setIsPaymentPlanPrintModalOpen(false)}
                    student={selectedStudent}
                />
            )}
        </div>
    );
};

export default FinancesModule;