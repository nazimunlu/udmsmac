import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useAppContext } from '../contexts/AppContext';

import { formatDate } from '../utils/formatDate';

const PersonalExpensesView = () => {
    const { db, userId, appId } = useAppContext();
    const [expenses, setExpenses] = useState([]);

    useEffect(() => {
        if (!userId || !appId) return;
        const q = query(collection(db, 'artifacts', appId, 'users', userId, 'transactions'), where("type", "==", "expense-personal"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const expensesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            expensesData.sort((a, b) => b.date.toMillis() - a.date.toMillis());
            setExpenses(expensesData);
        });
        return () => unsubscribe();
    }, [db, userId, appId]);

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md">
                <h3 className="font-semibold text-xl p-6 border-b border-gray-200">Logged Personal Expenses</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Date</th>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Category</th>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Description</th>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {expenses.length > 0 ? (
                                expenses.map(expense => (
                                    <tr key={expense.id} className="hover:bg-gray-50">
                                        <td className="p-4 text-gray-600">{formatDate(expense.date)}</td>
                                        <td className="p-4 text-gray-800">{expense.category}</td>
                                        <td className="p-4 text-gray-800">{expense.description}</td>
                                        <td className="p-4 text-gray-800 font-semibold text-right">₺{expense.amount.toFixed(2)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="4" className="p-4 text-center text-gray-500">No personal expenses logged yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PersonalExpensesView;