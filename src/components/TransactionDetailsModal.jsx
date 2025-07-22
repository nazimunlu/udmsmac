import React from 'react';
import Modal from './Modal';
import { Icon, ICONS } from './Icons';
import { formatDate } from '../utils/formatDate';

const TransactionDetailsModal = ({ isOpen, onClose, transaction, student, group }) => {
    if (!isOpen || !transaction) return null;

    const isIncome = transaction.expense_type.startsWith('income');
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
                        <p className={`text-2xl font-bold ${colorClass}`}>{transaction.amount.toFixed(2)} ₺</p>
                        <p className="text-gray-500">{formatDate(transaction.transaction_date)}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-600">Description:</span>
                        <span className="text-gray-800">{transaction.description}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-600">Category:</span>
                        <span className="text-gray-800">{transaction.category}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-600">Payment Method:</span>
                        <span className="text-gray-800">{transaction.paymentMethod}</span>
                    </div>
                    
                    {isIncome && student && (
                        <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-600">Student:</span>
                            <span className="text-gray-800">{student.full_name}</span>
                        </div>
                    )}
                    {isIncome && group && (
                         <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-600">Group:</span>
                            <span className="text-gray-800">{group.groupName}</span>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default TransactionDetailsModal;
