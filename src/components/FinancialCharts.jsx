import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const FinancialCharts = ({ payments, expenses, isDataHidden }) => {
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    // 1. Income vs. Expense Chart Data
    const incomeTotal = payments.reduce((acc, p) => acc + p.amount, 0);
    const expenseTotal = expenses.reduce((acc, e) => acc + e.amount, 0);
    const incomeVsExpenseData = [
        { name: 'Total Finances', income: incomeTotal, expenses: expenseTotal },
    ];

    // 2. Expense Breakdown by Category
    const expenseByCategory = expenses.reduce((acc, e) => {
        const category = e.category || 'Uncategorized';
        if (!acc[category]) {
            acc[category] = 0;
        }
        acc[category] += e.amount;
        return acc;
    }, {});
    const expenseBreakdownData = Object.keys(expenseByCategory).map(key => ({
        name: key,
        value: expenseByCategory[key],
    }));

    // 3. Monthly/Daily Trend Data (assuming transactionDate exists)
    const trendData = [...payments, ...expenses]
        .sort((a, b) => new Date(a.transactionDate) - new Date(b.transactionDate))
        .reduce((acc, t) => {
            const date = new Date(t.transactionDate).toLocaleDateString();
            if (!acc[date]) {
                acc[date] = { date, income: 0, expenses: 0 };
            }
            if (t.expense_type.startsWith('income')) {
                acc[date].income += t.amount;
            } else {
                acc[date].expenses += t.amount;
            }
            return acc;
        }, {});
    const financialTrendData = Object.values(trendData);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="p-2 bg-white border rounded-lg shadow-md">
                    <p className="label">{`${label}`}</p>
                    {payload.map((pld, index) => (
                        <p key={index} style={{ color: pld.color }}>{`${pld.name}: ${pld.value.toFixed(2)} ₺`}</p>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (isDataHidden) {
        return (
            <div className="text-center text-gray-500 py-10">
                Financial data is hidden.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            {/* Income vs Expense Bar Chart */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="font-semibold text-gray-800 mb-4">Income vs. Expenses</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={incomeVsExpenseData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="income" fill="#10B981" name="Income" />
                        <Bar dataKey="expenses" fill="#EF4444" name="Expenses" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Expense Breakdown Pie Chart */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="font-semibold text-gray-800 mb-4">Expense Breakdown</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={expenseBreakdownData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                            {expenseBreakdownData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value.toFixed(2)} ₺`} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Financial Trend Line Chart */}
            <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-2">
                <h3 className="font-semibold text-gray-800 mb-4">Financial Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={financialTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line type="monotone" dataKey="income" stroke="#10B981" name="Income" />
                        <Line type="monotone" dataKey="expenses" stroke="#EF4444" name="Expenses" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default FinancialCharts;
