import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import StudentPaymentDetailsModal from './StudentPaymentDetailsModal';
import StudentPaymentsView from './StudentPaymentsView';
import BusinessExpensesView from './BusinessExpensesView';
import PersonalExpensesView from './PersonalExpensesView';
import { Icon, ICONS } from './Icons';
import FinancialOverview from './FinancialOverview';
import TransactionFormModal from './TransactionFormModal';

const FinancesModule = () => {
    const { transactions } = useAppContext();
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isDataHidden, setIsDataHidden] = useState(false);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

    const formatCurrency = (value) => {
        if (isDataHidden) return '₺•••,••';
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0);
    };

    return (
        <>
            <div className="relative p-4 md:p-8 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg shadow-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-gray-800">Finances</h2>
                    <div className="flex items-center space-x-4">
                        <button onClick={() => setIsDataHidden(!isDataHidden)} className="p-2 rounded-full hover:bg-gray-200">
                            <Icon path={isDataHidden ? ICONS.EYE_OFF : ICONS.EYE} className="text-gray-600" />
                        </button>
                        <button onClick={() => setIsTransactionModalOpen(true)} className="flex items-center px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow">
                            <Icon path={ICONS.ADD} className="mr-2"/>Log Transaction
                        </button>
                    </div>
                </div>

                <div className="mb-4 border-b border-gray-200">
                    <nav className="flex space-x-4" aria-label="Tabs">
                        <button onClick={() => setActiveTab('overview')} className={`px-3 py-2 font-medium text-sm rounded-t-lg ${activeTab === 'overview' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Overview</button>
                        <button onClick={() => setActiveTab('studentPayments')} className={`px-3 py-2 font-medium text-sm rounded-t-lg ${activeTab === 'studentPayments' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Student Payments</button>
                        <button onClick={() => setActiveTab('businessExpenses')} className={`px-3 py-2 font-medium text-sm rounded-t-lg ${activeTab === 'businessExpenses' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Business Expenses</button>
                        <button onClick={() => setActiveTab('personalExpenses')} className={`px-3 py-2 font-medium text-sm rounded-t-lg ${activeTab === 'personalExpenses' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Personal Expenses</button>
                    </nav>
                </div>

                <div>
                    {activeTab === 'overview' && <FinancialOverview transactions={transactions} isDataHidden={isDataHidden} formatCurrency={formatCurrency} />}
                    {activeTab === 'studentPayments' && <StudentPaymentsView onStudentSelect={setSelectedStudent} />}
                    {activeTab === 'businessExpenses' && <BusinessExpensesView />}
                    {activeTab === 'personalExpenses' && <PersonalExpensesView />}
                </div>
            </div>

            {selectedStudent && <StudentPaymentDetailsModal isOpen={!!selectedStudent} onClose={() => setSelectedStudent(null)} student={selectedStudent} />}
            <TransactionFormModal isOpen={isTransactionModalOpen} onClose={() => setIsTransactionModalOpen(false)} />
        </>
    );
};

export default FinancesModule;