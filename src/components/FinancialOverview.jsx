import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Icon, ICONS } from './Icons';

const FinancialOverview = ({ payments, students, isDataHidden }) => {

    const { income, expenses, profit, incomeBySource, expensesByCategory } = useMemo(() => {
        const income = payments.filter(p => p.expense_type.startsWith('income')).reduce((acc, p) => acc + p.amount, 0);
        const expenses = payments.filter(p => p.expense_type.startsWith('expense')).reduce((acc, p) => acc + p.amount, 0);
        const profit = income - expenses;

        const incomeBySource = payments
            .filter(p => p.expense_type.startsWith('income'))
            .reduce((acc, p) => {
                const source = p.expense_type === 'income-group' ? 'Group' : 'Tutoring';
                acc[source] = (acc[source] || 0) + p.amount;
                return acc;
            }, {});

        const expensesByCategory = payments
            .filter(p => p.expense_type.startsWith('expense'))
            .reduce((acc, p) => {
                const category = p.category || 'Other';
                acc[category] = (acc[category] || 0) + p.amount;
                return acc;
            }, {});

        return { income, expenses, profit, incomeBySource, expensesByCategory };
    }, [payments]);

    const formatCurrency = (amount) => {
        if (isDataHidden) return '*****';
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
    };

    const pieChartData = (data) => {
        return Object.keys(data).map(key => ({ name: key, value: data[key] }));
    };

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h4 className="text-gray-500">Total Income</h4>
                    <p className="text-3xl font-bold text-green-600">{formatCurrency(income)}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h4 className="text-gray-500">Total Expenses</h4>
                    <p className="text-3xl font-bold text-red-600">{formatCurrency(expenses)}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h4 className="text-gray-500">Profit</h4>
                    <p className={`text-3xl font-bold ${profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(profit)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h4 className="font-semibold mb-4">Income Sources</h4>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={pieChartData(incomeBySource)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                                {pieChartData(incomeBySource).map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h4 className="font-semibold mb-4">Expense Breakdown</h4>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={pieChartData(expensesByCategory)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#82ca9d" label>
                                {pieChartData(expensesByCategory).map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default FinancialOverview;