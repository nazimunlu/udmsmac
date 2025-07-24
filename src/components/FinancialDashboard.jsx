import React, { useState, useEffect, useMemo } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ComposedChart,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { Icon, ICONS } from './Icons';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths } from 'date-fns';

const FinancialDashboard = ({ payments, expenses, students, dateRange, isDataHidden }) => {
    const [selectedChart, setSelectedChart] = useState('overview');
    const [chartPeriod, setChartPeriod] = useState('month');

    // Enhanced color palette
    const COLORS = {
        primary: '#3B82F6',
        success: '#10B981',
        danger: '#EF4444',
        warning: '#F59E0B',
        info: '#06B6D4',
        purple: '#8B5CF6',
        pink: '#EC4899',
        gray: '#6B7280'
    };

    const CHART_COLORS = [
        COLORS.primary, COLORS.success, COLORS.danger, COLORS.warning,
        COLORS.info, COLORS.purple, COLORS.pink, COLORS.gray
    ];

    // Advanced data processing
    const processedData = useMemo(() => {
        const filteredPayments = payments.filter(p => {
            const date = new Date(p.transactionDate);
            return date >= dateRange.startDate && date <= dateRange.endDate;
        });

        const filteredExpenses = expenses.filter(e => {
            const date = new Date(e.transactionDate);
            return date >= dateRange.startDate && date <= dateRange.endDate;
        });

        // Income vs Expenses
        const incomeTotal = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
        const expenseTotal = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
        const netProfit = incomeTotal - expenseTotal;

        // Expense breakdown by category
        const expenseByCategory = filteredExpenses.reduce((acc, e) => {
            const category = e.category || 'Uncategorized';
            if (!acc[category]) {
                acc[category] = { amount: 0, count: 0, transactions: [] };
            }
            acc[category].amount += e.amount;
            acc[category].count += 1;
            acc[category].transactions.push(e);
            return acc;
        }, {});

        // Payment methods breakdown
        const paymentMethods = filteredPayments.reduce((acc, p) => {
            const method = p.paymentMethod || 'Unknown';
            if (!acc[method]) {
                acc[method] = { amount: 0, count: 0 };
            }
            acc[method].amount += p.amount;
            acc[method].count += 1;
            return acc;
        }, {});

        // Daily trend data
        const daysInRange = eachDayOfInterval({ start: dateRange.startDate, end: dateRange.endDate });
        const dailyData = daysInRange.map(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const dayPayments = filteredPayments.filter(p => 
                format(new Date(p.transactionDate), 'yyyy-MM-dd') === dateStr
            );
            const dayExpenses = filteredExpenses.filter(e => 
                format(new Date(e.transactionDate), 'yyyy-MM-dd') === dateStr
            );

            return {
                date: format(date, 'MMM dd'),
                fullDate: dateStr,
                income: dayPayments.reduce((sum, p) => sum + p.amount, 0),
                expenses: dayExpenses.reduce((sum, e) => sum + e.amount, 0),
                net: dayPayments.reduce((sum, p) => sum + p.amount, 0) - 
                     dayExpenses.reduce((sum, e) => sum + e.amount, 0),
                transactions: dayPayments.length + dayExpenses.length
            };
        });

        // Student payment performance
        const studentPerformance = students.map(student => {
            const studentPayments = filteredPayments.filter(p => p.studentId === student.id);
            const totalOwed = student.installments?.reduce((sum, inst) => sum + inst.amount, 0) || 0;
            const totalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
            const paymentRate = totalOwed > 0 ? (totalPaid / totalOwed) * 100 : 0;

            return {
                name: student.fullName,
                totalOwed,
                totalPaid,
                paymentRate,
                lastPayment: studentPayments.length > 0 ? 
                    format(new Date(studentPayments[studentPayments.length - 1].transactionDate), 'MMM dd') : 'Never'
            };
        }).filter(s => s.totalOwed > 0).sort((a, b) => b.paymentRate - a.paymentRate);

        return {
            incomeTotal,
            expenseTotal,
            netProfit,
            expenseByCategory,
            paymentMethods,
            dailyData,
            studentPerformance,
            totalTransactions: filteredPayments.length + filteredExpenses.length,
            averageTransaction: (incomeTotal + expenseTotal) / (filteredPayments.length + filteredExpenses.length) || 0
        };
    }, [payments, expenses, students, dateRange]);

    // Enhanced tooltip component
    const CustomTooltip = ({ active, payload, label, type = 'default' }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 rounded-lg shadow-xl border border-gray-200">
                    <p className="font-semibold text-gray-800 mb-2">{label}</p>
                    {payload.map((pld, index) => (
                        <div key={index} className="flex items-center justify-between mb-1">
                            <div className="flex items-center">
                                <div 
                                    className="w-3 h-3 rounded-full mr-2" 
                                    style={{ backgroundColor: pld.color }}
                                />
                                <span className="text-sm text-gray-600">{pld.name}:</span>
                            </div>
                            <span className="font-semibold text-gray-800">
                                {pld.value.toFixed(2)} ₺
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    // Chart components
    const renderOverviewChart = () => (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">Financial Overview</h3>
                <div className="flex space-x-2">
                    {['week', 'month', 'quarter'].map(period => (
                        <button
                            key={period}
                            onClick={() => setChartPeriod(period)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                chartPeriod === period
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {period.charAt(0).toUpperCase() + period.slice(1)}
                        </button>
                    ))}
                </div>
            </div>
            <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={processedData.dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis 
                        dataKey="date" 
                        stroke="#6B7280"
                        fontSize={12}
                    />
                    <YAxis 
                        stroke="#6B7280"
                        fontSize={12}
                        tickFormatter={(value) => `${value.toFixed(0)}₺`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area 
                        type="monotone" 
                        dataKey="income" 
                        stackId="1"
                        stroke={COLORS.success} 
                        fill={COLORS.success}
                        fillOpacity={0.3}
                        name="Income"
                    />
                    <Area 
                        type="monotone" 
                        dataKey="expenses" 
                        stackId="1"
                        stroke={COLORS.danger} 
                        fill={COLORS.danger}
                        fillOpacity={0.3}
                        name="Expenses"
                    />
                    <Line 
                        type="monotone" 
                        dataKey="net" 
                        stroke={COLORS.primary} 
                        strokeWidth={3}
                        dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
                        name="Net Profit"
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );

    const renderExpenseBreakdown = () => (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Expense Breakdown</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={Object.entries(processedData.expenseByCategory).map(([name, data]) => ({
                                name,
                                value: data.amount,
                                count: data.count
                            }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={120}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {Object.entries(processedData.expenseByCategory).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip 
                            formatter={(value, name) => [`${value.toFixed(2)} ₺`, name]}
                            contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
                <div className="space-y-4">
                    {Object.entries(processedData.expenseByCategory)
                        .sort(([,a], [,b]) => b.amount - a.amount)
                        .map(([category, data], index) => (
                            <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center">
                                    <div 
                                        className="w-4 h-4 rounded-full mr-3"
                                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                                    />
                                    <div>
                                        <p className="font-semibold text-gray-800">{category}</p>
                                        <p className="text-sm text-gray-500">{data.count} transactions</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-gray-800">{data.amount.toFixed(2)} ₺</p>
                                    <p className="text-sm text-gray-500">
                                        {((data.amount / processedData.expenseTotal) * 100).toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );

    const renderStudentPerformance = () => (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Student Payment Performance</h3>
            <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={processedData.studentPerformance.slice(0, 8)}>
                    <PolarGrid stroke="#E5E7EB" />
                    <PolarAngleAxis 
                        dataKey="name" 
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                    />
                    <PolarRadiusAxis 
                        angle={90} 
                        domain={[0, 100]}
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                        tickFormatter={(value) => `${value}%`}
                    />
                    <Radar
                        name="Payment Rate"
                        dataKey="paymentRate"
                        stroke={COLORS.primary}
                        fill={COLORS.primary}
                        fillOpacity={0.3}
                    />
                    <Tooltip 
                        formatter={(value) => [`${value.toFixed(1)}%`, 'Payment Rate']}
                        contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );

    const renderPaymentMethods = () => (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Payment Methods</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={Object.entries(processedData.paymentMethods).map(([method, data]) => ({
                    method: method.charAt(0).toUpperCase() + method.slice(1),
                    amount: data.amount,
                    count: data.count
                }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="method" stroke="#6B7280" fontSize={12} />
                    <YAxis stroke="#6B7280" fontSize={12} tickFormatter={(value) => `${value.toFixed(0)}₺`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="amount" fill={COLORS.success} name="Amount" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );

    if (isDataHidden) {
        return (
            <div className="text-center py-16">
                <Icon path={ICONS.EYE_OFF} className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-xl text-gray-500 font-medium">Financial data is hidden</p>
                <p className="text-gray-400 mt-2">Toggle visibility to view financial analytics</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Chart Navigation */}
            <div className="flex flex-wrap gap-2">
                {[
                    { id: 'overview', label: 'Overview', icon: ICONS.DASHBOARD },
                    { id: 'expenses', label: 'Expenses', icon: ICONS.BRIEFCASE },
                    { id: 'students', label: 'Students', icon: ICONS.STUDENTS },
                    { id: 'payments', label: 'Payments', icon: ICONS.WALLET }
                ].map(chart => (
                    <button
                        key={chart.id}
                        onClick={() => setSelectedChart(chart.id)}
                        className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all ${
                            selectedChart === chart.id
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                        }`}
                    >
                        <Icon path={chart.icon} className="w-4 h-4 mr-2" />
                        {chart.label}
                    </button>
                ))}
            </div>

            {/* Selected Chart */}
            {selectedChart === 'overview' && renderOverviewChart()}
            {selectedChart === 'expenses' && renderExpenseBreakdown()}
            {selectedChart === 'students' && renderStudentPerformance()}
            {selectedChart === 'payments' && renderPaymentMethods()}
        </div>
    );
};

export default FinancialDashboard; 