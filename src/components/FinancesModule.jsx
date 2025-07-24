import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Icon, ICONS } from './Icons';
import DateRangePicker from './DateRangePicker';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { 
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import StudentPaymentsManager from './StudentPaymentsManager';
import ExpenseManager from './ExpenseManager';
import TransactionManager from './TransactionManager';
import BusinessExpenseForm from './BusinessExpenseForm';
import PersonalExpenseForm from './PersonalExpenseForm';
import PaymentModal from './PaymentModal';
import InvoiceGenerator from './InvoiceGenerator';
import ConfirmationModal from './ConfirmationModal';

const FinancesModule = () => {
    const { payments, expenses, transactions, students, groups, fetchData, loading } = useAppContext();
    const [dateRange, setDateRange] = useState({
        startDate: startOfMonth(new Date()),
        endDate: endOfMonth(new Date()),
    });
    const [isDataHidden, setIsDataHidden] = useState(true); // Hidden by default
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'payments', 'expenses', 'transactions', 'reports'
    
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [isBusinessExpenseModalOpen, setIsBusinessExpenseModalOpen] = useState(false);
    const [isPersonalExpenseModalOpen, setIsPersonalExpenseModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedInstallment, setSelectedInstallment] = useState(null);

    const [filteredPayments, setFilteredPayments] = useState([]);
    const [filteredExpenses, setFilteredExpenses] = useState([]);
    const [unpaidAmountInPeriod, setUnpaidAmountInPeriod] = useState(0);
    const [overdueInstallments, setOverdueInstallments] = useState([]);
    const [upcomingInstallments, setUpcomingInstallments] = useState([]);

    useEffect(() => {
        console.log('Date range:', dateRange);
        console.log('All expenses:', expenses);
        
        const filterByDate = (items) => items.filter(i => {
            const itemDate = new Date(i.transactionDate);
            const isInRange = itemDate >= dateRange.startDate && itemDate <= dateRange.endDate;
            console.log(`Item date: ${itemDate}, In range: ${isInRange}`, i);
            return isInRange;
        });
        
        const filteredP = filterByDate(payments);
        const filteredE = filterByDate(expenses);
        
        console.log('Filtered expenses:', filteredE);
        
        setFilteredPayments(filteredP);
        setFilteredExpenses(filteredE);

        // Calculate unpaid installment amount due in the period
        let unpaidTotal = 0;
        let overdue = [];
        let upcoming = [];
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        students.forEach(student => {
            student.installments?.forEach(inst => {
                const dueDate = new Date(inst.dueDate);
                if (inst.status === 'Unpaid') {
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
        setOverdueInstallments(overdue);
        setUpcomingInstallments(upcoming);

    }, [dateRange, payments, expenses, students]);

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
                        {payload[0].name}: {isDataHidden ? '***' : `${payload[0].value.toFixed(2)} ₺`}
                    </p>
                </div>
            );
        }
        return null;
    };

    const renderOverview = () => (
        <div className="space-y-8">
            {/* Key Metrics - Cleaner Design */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Income Card */}
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-green-100 text-sm font-medium">Total Income</p>
                            <p className="text-3xl font-bold mt-1">
                                {isDataHidden ? '***' : `${totalIncome.toFixed(2)} ₺`}
                            </p>
                        </div>
                        <div className="w-16 h-16 bg-green-400 bg-opacity-30 rounded-full flex items-center justify-center">
                            <Icon path={ICONS.INCOME} className="w-8 h-8" />
                        </div>
                    </div>
                    
                    {/* Income Breakdown */}
                    <div className="space-y-2">
                        {/* Group Income */}
                        <div className="flex items-center justify-between p-2 bg-green-400 bg-opacity-20 rounded-lg">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
                                <span className="text-sm text-green-100">Group Classes</span>
                            </div>
                            <span className="text-sm font-semibold text-green-100">
                                {isDataHidden ? '***' : `${groupIncome.toFixed(0)}₺`}
                            </span>
                        </div>
                        
                        {/* Tutoring Income */}
                        <div className="flex items-center justify-between p-2 bg-green-400 bg-opacity-20 rounded-lg">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-emerald-300 rounded-full"></div>
                                <span className="text-sm text-green-100">Tutoring</span>
                            </div>
                            <span className="text-sm font-semibold text-green-100">
                                {isDataHidden ? '***' : `${tutoringIncome.toFixed(0)}₺`}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Expenses Card */}
                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-red-100 text-sm font-medium">Total Expenses</p>
                            <p className="text-3xl font-bold mt-1">
                                {isDataHidden ? '***' : `${totalExpenses.toFixed(2)} ₺`}
                            </p>
                        </div>
                        <div className="w-16 h-16 bg-red-400 bg-opacity-30 rounded-full flex items-center justify-center">
                            <Icon path={ICONS.BRIEFCASE} className="w-8 h-8" />
                        </div>
                    </div>
                    
                    {/* Expense Breakdown */}
                    <div className="space-y-2">
                        {/* Business Expenses */}
                        <div className="flex items-center justify-between p-2 bg-red-400 bg-opacity-20 rounded-lg">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
                                <span className="text-sm text-red-100">Business</span>
                            </div>
                            <span className="text-sm font-semibold text-red-100">
                                {isDataHidden ? '***' : `${businessExpenses.toFixed(0)}₺`}
                            </span>
                        </div>
                        
                        {/* Personal Expenses */}
                        <div className="flex items-center justify-between p-2 bg-red-400 bg-opacity-20 rounded-lg">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-purple-300 rounded-full"></div>
                                <span className="text-sm text-red-100">Personal</span>
                            </div>
                            <span className="text-sm font-semibold text-red-100">
                                {isDataHidden ? '***' : `${personalExpenses.toFixed(0)}₺`}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Net Profit Card */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-blue-100 text-sm font-medium">Net Profit</p>
                            <p className="text-3xl font-bold mt-1">
                                {isDataHidden ? '***' : `${netProfit.toFixed(2)} ₺`}
                            </p>
                        </div>
                        <div className="w-16 h-16 bg-blue-400 bg-opacity-30 rounded-full flex items-center justify-center">
                            <Icon path={ICONS.PROFIT} className="w-8 h-8" />
                        </div>
                    </div>
                    
                    {/* Profit Breakdown */}
                    <div className="space-y-2">
                        {/* Total Income */}
                        <div className="flex items-center justify-between p-2 bg-blue-400 bg-opacity-20 rounded-lg">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                                <span className="text-sm text-blue-100">Total Income</span>
                            </div>
                            <span className="text-sm font-semibold text-blue-100">
                                {isDataHidden ? '***' : `${totalIncome.toFixed(0)}₺`}
                            </span>
                        </div>
                        
                        {/* Total Expenses */}
                        <div className="flex items-center justify-between p-2 bg-blue-400 bg-opacity-20 rounded-lg">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-red-300 rounded-full"></div>
                                <span className="text-sm text-blue-100">Total Expenses</span>
                            </div>
                            <span className="text-sm font-semibold text-blue-100">
                                {isDataHidden ? '***' : `${totalExpenses.toFixed(0)}₺`}
                            </span>
                        </div>
                        
                        {/* Profit Margin */}
                        <div className="flex items-center justify-between p-2 bg-blue-400 bg-opacity-30 rounded-lg border border-blue-300">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-yellow-300 rounded-full"></div>
                                <span className="text-sm font-medium text-blue-100">Profit Margin</span>
                            </div>
                            <span className="text-sm font-bold text-blue-100">
                                {isDataHidden ? '***' : `${totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : 0}%`}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                        onClick={() => openPaymentModal()}
                        className="flex items-center justify-center p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors group"
                    >
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-green-200">
                            <Icon path={ICONS.WALLET} className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="text-left">
                            <p className="font-semibold text-gray-800">Record Payment</p>
                            <p className="text-sm text-gray-600">Student payments</p>
                        </div>
                    </button>

                    <button
                        onClick={() => setIsBusinessExpenseModalOpen(true)}
                        className="flex items-center justify-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors group"
                    >
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-200">
                            <Icon path={ICONS.BRIEFCASE} className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="text-left">
                            <p className="font-semibold text-gray-800">Business Expense</p>
                            <p className="text-sm text-gray-600">Tax deductible</p>
                        </div>
                    </button>

                    <button
                        onClick={() => setIsPersonalExpenseModalOpen(true)}
                        className="flex items-center justify-center p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors group"
                    >
                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-orange-200">
                            <Icon path={ICONS.USER} className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="text-left">
                            <p className="font-semibold text-gray-800">Personal Expense</p>
                            <p className="text-sm text-gray-600">Personal spending</p>
                        </div>
                    </button>

                    <button
                        onClick={() => openInvoiceModal()}
                        className="flex items-center justify-center p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors group"
                    >
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-purple-200">
                            <Icon path={ICONS.DOCUMENTS} className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="text-left">
                            <p className="font-semibold text-gray-800">Generate Invoice</p>
                            <p className="text-sm text-gray-600">For students</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Income Breakdown - Donut Chart */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-6">Income Breakdown</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData.incomeData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {chartData.incomeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Expense Breakdown - Pie Chart */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-6">Expense Breakdown</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData.expenseData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {chartData.expenseData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Financial Comparison - Bar Chart */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6">Financial Overview</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.barData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar 
                                dataKey="amount" 
                                fill={(entry) => {
                                    if (entry.type === 'income') return '#10B981';
                                    if (entry.type === 'expense') return '#EF4444';
                                    return '#3B82F6';
                                }}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Alerts Section */}
            {(overdueInstallments.length > 0 || upcomingInstallments.length > 0) && (
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-6">Payment Alerts</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {overdueInstallments.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                <div className="flex items-center mb-3">
                                    <Icon path={ICONS.WARNING} className="w-5 h-5 text-red-600 mr-2" />
                                    <h4 className="font-semibold text-red-800">Overdue Installments</h4>
                                </div>
                                <p className="text-red-700 text-sm mb-3">
                                    {overdueInstallments.length} student(s) have overdue payments
                                </p>
                                <button
                                    onClick={() => setActiveTab('payments')}
                                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                                >
                                    View Details →
                                </button>
                            </div>
                        )}

                        {upcomingInstallments.length > 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <div className="flex items-center mb-3">
                                    <Icon path={ICONS.CALENDAR} className="w-5 h-5 text-blue-600 mr-2" />
                                    <h4 className="font-semibold text-blue-800">Upcoming Payments</h4>
                                </div>
                                <p className="text-blue-700 text-sm mb-3">
                                    {upcomingInstallments.length} payment(s) due in the next 7 days
                                </p>
                                <button
                                    onClick={() => setActiveTab('payments')}
                                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                >
                                    View Details →
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    const renderPayments = () => (
        <StudentPaymentsManager 
            students={students}
            payments={payments}
            onPaymentRecorded={fetchData}
        />
    );

    const renderExpenses = () => (
        <ExpenseManager 
            expenses={expenses}
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

    const renderReports = () => (
        <div className="mt-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Financial Summary</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Total Income:</span>
                            <span className="font-semibold text-green-600">
                                {isDataHidden ? '***' : `${totalIncome.toFixed(2)} ₺`}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Total Expenses:</span>
                            <span className="font-semibold text-red-600">
                                {isDataHidden ? '***' : `${totalExpenses.toFixed(2)} ₺`}
                            </span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                            <span className="text-gray-800 font-semibold">Net Profit:</span>
                            <span className="font-bold text-blue-600">
                                {isDataHidden ? '***' : `${netProfit.toFixed(2)} ₺`}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Invoice Generation</h3>
                    <div className="space-y-3">
                        <button 
                            onClick={() => openInvoiceModal()}
                            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <Icon path={ICONS.DOCUMENTS} className="w-5 h-5 mr-2" />
                            Generate Invoice
                        </button>
                        <p className="text-sm text-gray-600 text-center">
                            Create professional invoices for students
                        </p>
                    </div>
                </div>
            </div>

            {/* Detailed Reports */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6">Detailed Reports</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <Icon path={ICONS.STUDENTS} className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                        <h4 className="font-semibold text-gray-800">Student Payment Report</h4>
                        <p className="text-sm text-gray-600 mt-1">
                            {students.length} students with payment history
                        </p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <Icon path={ICONS.BRIEFCASE} className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <h4 className="font-semibold text-gray-800">Expense Analysis</h4>
                        <p className="text-sm text-gray-600 mt-1">
                            {filteredExpenses.length} transactions analyzed
                        </p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <Icon path={ICONS.CHART_LINE} className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                        <h4 className="font-semibold text-gray-800">Financial Trends</h4>
                        <p className="text-sm text-gray-600 mt-1">
                            Monthly and yearly comparisons
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="relative p-4 md:p-8 bg-gray-50 rounded-lg shadow-lg">
            <div className="flex justify-between items-center pb-4 mb-6 border-b border-gray-200">
                <h2 className="text-3xl font-bold text-gray-800 flex items-center">
                    <Icon path={ICONS.FINANCES} className="w-8 h-8 mr-3" />
                    Financial Management
                </h2>
                <div className="flex items-center space-x-4">
                    <DateRangePicker onDateChange={setDateRange} initialRange={dateRange} />
                    <button 
                        onClick={() => setIsDataHidden(!isDataHidden)} 
                        className="p-2 rounded-full hover:bg-gray-200 transition-colors"
                        title={isDataHidden ? "Show data" : "Hide data"}
                    >
                        <Icon path={isDataHidden ? ICONS.EYE_OFF : ICONS.EYE} className="w-6 h-6 text-gray-600" />
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm mb-6">
                {[
                    { id: 'overview', label: 'Overview', icon: ICONS.DASHBOARD },
                    { id: 'payments', label: 'Payments', icon: ICONS.WALLET },
                    { id: 'expenses', label: 'Expenses', icon: ICONS.BRIEFCASE },
                    { id: 'transactions', label: 'All Transactions', icon: ICONS.LIST },
                    { id: 'reports', label: 'Reports', icon: ICONS.CHART_LINE }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            activeTab === tab.id
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                        }`}
                    >
                        <Icon path={tab.icon} className="w-4 h-4 mr-2" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <p className="text-center text-gray-500 mt-8">Loading financial data...</p>
            ) : (
                <>
                    {activeTab === 'overview' && renderOverview()}
                    {activeTab === 'payments' && renderPayments()}
                    {activeTab === 'expenses' && renderExpenses()}
                    {activeTab === 'transactions' && renderTransactions()}
                    {activeTab === 'reports' && renderReports()}
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
        </div>
    );
};

export default FinancesModule;