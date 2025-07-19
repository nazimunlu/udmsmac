import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const FinancialOverview = ({ transactions, isDataHidden, formatCurrency }) => {
    const PIE_COLORS = {
        'income-group': '#3b82f6', // blue-500
        'income-tutoring': '#10b981', // emerald-500
        'expense-business': '#ef4444', // red-500
        'expense-personal': '#f59e0b', // amber-500
    };
    
    const incomeSourceColors = [PIE_COLORS['income-group'], PIE_COLORS['income-tutoring']];
    const expenseBreakdownColors = [PIE_COLORS['expense-business'], PIE_COLORS['expense-personal']];

    const processedData = useMemo(() => {
        let totalIncome = 0;
        let totalExpenses = 0;
        const incomeSources = { 'income-group': 0, 'income-tutoring': 0 };
        const expenseBreakdown = { 'expense-business': 0, 'expense-personal': 0 };
        const monthlySummary = {};

        transactions.forEach(t => {
            const amount = t.amount || 0;
            const month = t.date.toDate().toLocaleString('en-US', { month: 'short', year: 'numeric' });
            
            if (!monthlySummary[month]) {
                monthlySummary[month] = { name: month, income: 0, expenses: 0 };
            }

            if (t.type.startsWith('income')) {
                totalIncome += amount;
                incomeSources[t.type] = (incomeSources[t.type] || 0) + amount;
                monthlySummary[month].income += amount;
            } else if (t.type.startsWith('expense')) {
                totalExpenses += amount;
                expenseBreakdown[t.type] = (expenseBreakdown[t.type] || 0) + amount;
                monthlySummary[month].expenses += amount;
            }
        });

        const incomeSourceData = Object.entries(incomeSources)
            .map(([key, value]) => ({ name: key === 'income-group' ? 'Group' : 'Tutoring', value }))
            .filter(d => d.value > 0);

        const expenseBreakdownData = Object.entries(expenseBreakdown)
            .map(([key, value]) => ({ name: key === 'expense-business' ? 'Business' : 'Personal', value }))
            .filter(d => d.value > 0);

        return {
            totalIncome,
            totalExpenses,
            incomeSourceData,
            expenseBreakdownData,
            monthlySummaryData: Object.values(monthlySummary).reverse(),
        };
    }, [transactions]);

    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }) => {
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-bold">
                {`${name} (${(percent * 100).toFixed(0)}%)`}
            </text>
        );
    };

    return (
        <div className="space-y-8 p-4 bg-gray-50 rounded-lg shadow-inner">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="bg-white p-6 rounded-xl shadow-lg text-center transform transition duration-300 hover:scale-105 border-b-4 border-green-500">
                    <h3 className="text-gray-600 text-base font-semibold uppercase mb-2">Total Income</h3>
                    <p className="text-3xl font-extrabold text-green-700">{formatCurrency(processedData.totalIncome)}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg text-center transform transition duration-300 hover:scale-105 border-b-4 border-red-500">
                    <h3 className="text-gray-600 text-base font-semibold uppercase mb-2">Total Expenses</h3>
                    <p className="text-3xl font-extrabold text-red-700">{formatCurrency(processedData.totalExpenses)}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg text-center transform transition duration-300 hover:scale-105 border-b-4 border-blue-500">
                    <h3 className="text-gray-600 text-base font-semibold uppercase mb-2">Net Profit</h3>
                    <p className={`text-3xl font-extrabold ${processedData.totalIncome - processedData.totalExpenses >= 0 ? 'text-blue-700' : 'text-yellow-700'}`}>
                        {formatCurrency(processedData.totalIncome - processedData.totalExpenses)}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="font-semibold mb-4 text-gray-800">Income Sources</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={processedData.incomeSourceData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                innerRadius={50}
                                fill="#8884d8"
                                labelLine={false}
                                label={renderCustomizedLabel}
                                stroke="#fff"
                                strokeWidth={3}
                            >
                                {processedData.incomeSourceData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={incomeSourceColors[index % incomeSourceColors.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="font-semibold mb-4 text-gray-800">Expense Breakdown</h3>
                     <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={processedData.expenseBreakdownData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                innerRadius={50}
                                fill="#82ca9d"
                                labelLine={false}
                                label={renderCustomizedLabel}
                                stroke="#fff"
                                strokeWidth={3}
                            >
                                {processedData.expenseBreakdownData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={expenseBreakdownColors[index % expenseBreakdownColors.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="font-semibold mb-4 text-gray-800">Monthly Summary</h3>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={processedData.monthlySummaryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} padding={{ left: 20, right: 20 }} />
                        <YAxis tickFormatter={(value) => formatCurrency(value)} axisLine={false} tickLine={false} />
                        <Tooltip formatter={(value) => formatCurrency(value)} cursor={{ fill: 'rgba(0,0,0,0.1)' }} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="income" fill="#10b981" name="Income" barSize={30} radius={[10, 10, 0, 0]} />
                        <Bar dataKey="expenses" fill="#ef4444" name="Expenses" barSize={30} radius={[10, 10, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default FinancialOverview;