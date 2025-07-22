import React, { useState } from 'react';
import Modal from './Modal';
import { Icon, ICONS } from './Icons';
import { formatDate } from '../utils/formatDate';

const FinanceDetailsModal = ({ isOpen, onClose, title, transactions, students, groups }) => {
    const [activeTab, setActiveTab] = useState('transactions');

    if (!isOpen) return null;

    const getStudentName = (studentId) => students.find(s => s.id === studentId)?.fullName || 'N/A';
    const getGroupName = (groupId) => groups.find(g => g.id === groupId)?.group_name || 'N/A';

    const renderTransactions = () => (
        <div className="mt-4 space-y-2">
            {transactions.map(t => (
                <div key={t.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                    <div>
                        <p className="font-medium">{t.description}</p>
                        <p className="text-sm text-gray-500">{t.category}</p>
                        {t.studentId && <p className="text-xs text-gray-400">Student: {getStudentName(t.studentId)}</p>}
                        {t.groupId && <p className="text-xs text-gray-400">Group: {getGroupName(t.groupId)}</p>}
                    </div>
                    <div className="text-right">
                        <p className={`font-bold ${t.expense_type.startsWith('income') ? 'text-green-600' : 'text-red-600'}`}>
                            {t.amount.toFixed(2)} ₺
                        </p>
                        <p className="text-sm text-gray-500">{formatDate(t.transaction_date)}</p>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderSummary = () => {
        const total = transactions.reduce((sum, t) => sum + t.amount, 0);
        const count = transactions.length;
        const average = count > 0 ? total / count : 0;

        const categoryBreakdown = transactions.reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {});

        return (
            <div className="mt-4 space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-bold text-lg text-blue-800">Summary</h4>
                    <div className="flex justify-around mt-2">
                        <div className="text-center">
                            <p className="text-2xl font-bold">{total.toFixed(2)} ₺</p>
                            <p className="text-sm text-gray-600">Total Amount</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold">{count}</p>
                            <p className="text-sm text-gray-600">Total Transactions</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold">{average.toFixed(2)} ₺</p>
                            <p className="text-sm text-gray-600">Average Amount</p>
                        </div>
                    </div>
                </div>
                <div>
                    <h4 className="font-bold text-lg text-gray-800">Category Breakdown</h4>
                    <ul className="mt-2 space-y-1">
                        {Object.entries(categoryBreakdown).map(([category, amount]) => (
                            <li key={category} className="flex justify-between p-2 bg-gray-50 rounded">
                                <span>{category}</span>
                                <span className="font-medium">{amount.toFixed(2)} ₺</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="p-6">
                <div className="border-b border-gray-200">
                    <nav className="flex space-x-4" aria-label="Tabs">
                        <button onClick={() => setActiveTab('summary')} className={`px-3 py-2 font-medium text-sm rounded-t-lg ${activeTab === 'summary' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Summary</button>
                        <button onClick={() => setActiveTab('transactions')} className={`px-3 py-2 font-medium text-sm rounded-t-lg ${activeTab === 'transactions' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>All Transactions</button>
                    </nav>
                </div>
                {activeTab === 'summary' ? renderSummary() : renderTransactions()}
            </div>
        </Modal>
    );
};

export default FinanceDetailsModal;
