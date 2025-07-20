import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import StudentPaymentDetailsModal from './StudentPaymentDetailsModal';
import StudentPaymentsView from './StudentPaymentsView';
import BusinessExpensesView from './BusinessExpensesView';
import PersonalExpensesView from './PersonalExpensesView';
import { Icon, ICONS } from './Icons';
import FinancialOverview from './FinancialOverview';
import TransactionFormModal from './TransactionFormModal';
import FinancialReports from './FinancialReports';
import Modal from './Modal';

const FinancialCard = ({ title, value, icon, onClick, isDataHidden }) => (
    <div onClick={onClick} className="bg-white p-6 rounded-lg shadow-lg border border-gray-100 flex flex-col items-center justify-center cursor-pointer transform transition duration-300 hover:scale-105 hover:shadow-xl">
        <div className="bg-blue-100 text-blue-600 rounded-full p-4 mb-4 flex items-center justify-center shadow-md">
            <Icon path={icon} className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-1">{title}</h3>
        <p className="text-2xl font-bold text-gray-900">{isDataHidden ? '₺•••,••' : value}</p>
    </div>
);

const FinancesModule = () => {
    const { transactions, students } = useAppContext();
    const [isStudentPaymentsModalOpen, setIsStudentPaymentsModalOpen] = useState(false);
    const [isBusinessExpensesModalOpen, setIsBusinessExpensesModalOpen] = useState(false);
    const [isPersonalExpensesModalOpen, setIsPersonalExpensesModalOpen] = useState(false);
    const [isFinancialReportsModalOpen, setIsFinancialReportsModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isDataHidden, setIsDataHidden] = useState(false);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

    const formatCurrency = (value) => {
        if (isDataHidden) return '₺•••,••';
        const options = {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: (value % 1 === 0) ? 0 : 2,
            maximumFractionDigits: (value % 1 === 0) ? 0 : 2,
        };
        return new Intl.NumberFormat('tr-TR', options).format(value || 0);
    };

    const totalIncome = useMemo(() => {
        return transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    }, [transactions]);

    const totalBusinessExpenses = useMemo(() => {
        return transactions.filter(t => t.type === 'expense' && t.category === 'business').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    }, [transactions]);

    const totalPersonalExpenses = useMemo(() => {
        return transactions.filter(t => t.type === 'expense' && t.category === 'personal').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    }, [transactions]);

    const netProfit = totalIncome - totalBusinessExpenses - totalPersonalExpenses;

    return (
        <>
            <div className="relative p-4 md:p-8 bg-gray-50 rounded-lg shadow-lg">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 mb-6 border-b border-gray-200">
                    <h2 className="text-4xl font-extrabold text-gray-900 flex items-center mb-4 md:mb-0"><Icon path={ICONS.FINANCES} className="w-10 h-10 mr-4 text-blue-600"/>Financial Dashboard</h2>
                    <div className="flex items-center space-x-4">
                        <button onClick={() => setIsDataHidden(!isDataHidden)} className="p-2 rounded-full hover:bg-gray-200 transition-colors duration-200">
                            <Icon path={isDataHidden ? ICONS.EYE_OFF : ICONS.EYE} className="text-gray-600 w-6 h-6" />
                        </button>
                        <button onClick={() => setIsTransactionModalOpen(true)} className="flex items-center px-5 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-lg transition-all duration-300 transform hover:scale-105">
                            <Icon path={ICONS.ADD} className="mr-2 w-5 h-5"/>Log Transaction
                        </button>
                    </div>
                </div>

                {/* Financial Cards for Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <FinancialCard
                        title="Total Income"
                        value={formatCurrency(totalIncome)}
                        icon={ICONS.INCOME}
                        onClick={() => setIsStudentPaymentsModalOpen(true)}
                        isDataHidden={isDataHidden}
                    />
                    <FinancialCard
                        title="Business Expenses"
                        value={formatCurrency(totalBusinessExpenses)}
                        icon={ICONS.BUSINESS_EXPENSE}
                        onClick={() => setIsBusinessExpensesModalOpen(true)}
                        isDataHidden={isDataHidden}
                    />
                    <FinancialCard
                        title="Personal Expenses"
                        value={formatCurrency(totalPersonalExpenses)}
                        icon={ICONS.PERSONAL_EXPENSE}
                        onClick={() => setIsPersonalExpensesModalOpen(true)}
                        isDataHidden={isDataHidden}
                    />
                    <FinancialCard
                        title="Net Profit"
                        value={formatCurrency(netProfit)}
                        icon={ICONS.PROFIT}
                        onClick={() => setIsFinancialReportsModalOpen(true)}
                        isDataHidden={isDataHidden}
                    />
                </div>

                <FinancialOverview transactions={transactions} isDataHidden={isDataHidden} formatCurrency={formatCurrency} />
            </div>

            {selectedStudent && <StudentPaymentDetailsModal isOpen={!!selectedStudent} onClose={() => setSelectedStudent(null)} student={selectedStudent} />}
            <TransactionFormModal isOpen={isTransactionModalOpen} onClose={() => setIsTransactionModalOpen(false)} />

            {/* Modals for each financial view */}
            <Modal isOpen={isStudentPaymentsModalOpen} onClose={() => setIsStudentPaymentsModalOpen(false)} title="Student Payments">
                <StudentPaymentsView onStudentSelect={setSelectedStudent} />
            </Modal>

            <Modal isOpen={isBusinessExpensesModalOpen} onClose={() => setIsBusinessExpensesModalOpen(false)} title="Business Expenses">
                <BusinessExpensesView />
            </Modal>

            <Modal isOpen={isPersonalExpensesModalOpen} onClose={() => setIsPersonalExpensesModalOpen(false)} title="Personal Expenses">
                <PersonalExpensesView />
            </Modal>

            <Modal isOpen={isFinancialReportsModalOpen} onClose={() => setIsFinancialReportsModalOpen(false)} title="Financial Reports">
                <FinancialReports formatCurrency={formatCurrency} />
            </Modal>
        </>
    );
};

export default FinancesModule;