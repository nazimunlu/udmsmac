import React from 'react';
import Modal from './Modal';
import { Icon, ICONS } from './Icons';
import { formatDate } from '../utils/formatDate';

const TransactionDetailsModal = ({ isOpen, onClose, transaction, onTransactionUpdated }) => {
    if (!isOpen || !transaction) return null;

    const isIncome = (transaction.type || transaction.expenseType || '').startsWith('income');
    const title = isIncome ? 'Income Details' : 'Expense Details';
    const colorClass = isIncome ? 'text-green-600' : 'text-red-600';
    const bgColorClass = isIncome ? 'bg-green-100' : 'bg-red-100';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="p-6">
                <div className="flex items-center mb-6">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${bgColorClass} ${colorClass}`}>
                        <Icon path={isIncome ? ICONS.WALLET : ICONS.SHOPPING_CART} className="w-6 h-6" />
                    </div>
                    <div>
                        <p className={`text-2xl font-bold ${colorClass}`}>{Math.round(transaction.amount)} ₺</p>
                        <p className="text-gray-500">{formatDate(transaction.transactionDate || transaction.transaction_date)}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-600">Description:</span>
                        <span className="text-gray-800">{transaction.description}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-600">Category:</span>
                        <span className="text-gray-800">{transaction.category || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-600">Type:</span>
                        <span className="text-gray-800">{transaction.type || transaction.expenseType || 'N/A'}</span>
                    </div>
                    
                    {transaction.studentId && (
                        <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-600">Student ID:</span>
                            <span className="text-gray-800">{transaction.studentId}</span>
                        </div>
                    )}
                    
                    {transaction.invoiceName && (
                        <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-600">Invoice:</span>
                            <span className="text-gray-800">{transaction.invoiceName}</span>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default TransactionDetailsModal;
