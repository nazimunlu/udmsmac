import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Icon, ICONS } from './Icons';
import DateRangePicker from './DateRangePicker';
import { startOfMonth, endOfMonth } from 'date-fns';
import FinancialCharts from './FinancialCharts';
import FinanceDetailsModal from './FinanceDetailsModal';
import StudentPaymentsDetailModal from './StudentPaymentsDetailModal';
import TransactionFormModal from './TransactionFormModal';

const FinancesModule = () => {
    const { payments, expenses, students, groups, loading } = useAppContext();
    const [dateRange, setDateRange] = useState({
        startDate: startOfMonth(new Date()),
        endDate: endOfMonth(new Date()),
    });
    const [isDataHidden, setIsDataHidden] = useState(false);
    
    const [isExpenseDetailsModalOpen, setIsExpenseDetailsModalOpen] = useState(false);
    const [isStudentPaymentsModalOpen, setIsStudentPaymentsModalOpen] = useState(false);
    
    const [modalContent, setModalContent] = useState({ title: '', transactions: [] });
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);

    const [filteredPayments, setFilteredPayments] = useState([]);
    const [filteredExpenses, setFilteredExpenses] = useState([]);
    const [unpaidAmountInPeriod, setUnpaidAmountInPeriod] = useState(0);

    useEffect(() => {
        const filterByDate = (items) => items.filter(i => {
            const itemDate = new Date(i.transactionDate);
            return itemDate >= dateRange.startDate && itemDate <= dateRange.endDate;
        });
        setFilteredPayments(filterByDate(payments));
        setFilteredExpenses(filterByDate(expenses));

        // Calculate unpaid installment amount due in the period
        let unpaidTotal = 0;
        students.forEach(student => {
            student.installments?.forEach(inst => {
                const dueDate = new Date(inst.dueDate);
                if (inst.status === 'Unpaid' && dueDate >= dateRange.startDate && dueDate <= dateRange.endDate) {
                    unpaidTotal += inst.amount;
                }
            });
        });
        setUnpaidAmountInPeriod(unpaidTotal);

    }, [dateRange, payments, expenses, students]);

    const openExpenseDetailsModal = (title, transactions) => {
        setModalContent({ title, transactions });
        setIsExpenseDetailsModalOpen(true);
    };

    const SummaryCard = ({ title, transactions, icon, color, onClick, subtext }) => {
        const total = transactions.reduce((sum, item) => sum + item.amount, 0);
        const count = transactions.length;

        return (
            <div 
                className="bg-white p-6 rounded-lg shadow-md flex flex-col cursor-pointer hover:shadow-xl transition-shadow"
                onClick={onClick}
            >
                <div className="flex items-center mb-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 bg-${color}-100 text-${color}-600`}>
                        <Icon path={icon} className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                </div>
                <div className="flex-grow">
                    <p className="text-3xl font-bold text-gray-900">
                        {isDataHidden ? '***' : `${total.toFixed(2)} ₺`}
                    </p>
                    <p className="text-gray-500">{subtext !== undefined ? subtext : `${count} transactions`}</p>
                </div>
            </div>
        );
    };

    return (
        <div className="relative p-4 md:p-8 bg-gray-50 rounded-lg shadow-lg">
            <div className="flex justify-between items-center pb-4 mb-6 border-b border-gray-200">
                <h2 className="text-3xl font-bold text-gray-800 flex items-center">
                    <Icon path={ICONS.FINANCES} className="w-8 h-8 mr-3" />
                    Finances
                </h2>
                <div className="flex items-center space-x-2">
                    <button onClick={() => setIsFormModalOpen(true)} className="flex items-center px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow"><Icon path={ICONS.ADD} className="mr-2"/>Add Expense</button>
                    <button onClick={() => setIsDataHidden(!isDataHidden)} className="p-2 rounded-full hover:bg-gray-200">
                        <Icon path={isDataHidden ? ICONS.EYE_OFF : ICONS.EYE} className="w-6 h-6 text-gray-600" />
                    </button>
                </div>
            </div>

            <DateRangePicker onDateChange={setDateRange} initialRange={dateRange} />

            {loading ? (
                <p className="text-center text-gray-500 mt-8">Loading financial data...</p>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                        <SummaryCard 
                            title="Student Payments"
                            transactions={filteredPayments}
                            icon={ICONS.WALLET}
                            color="green"
                            onClick={() => setIsStudentPaymentsModalOpen(true)}
                            subtext={`${unpaidAmountInPeriod.toFixed(2)} ₺ remaining`}
                        />
                        <SummaryCard 
                            title="Business Expenses"
                            transactions={filteredExpenses.filter(e => e.expenseType === 'business')}
                            icon={ICONS.BRIEFCASE}
                            color="red"
                            onClick={() => openExpenseDetailsModal('Business Expenses', filteredExpenses.filter(e => e.expenseType === 'business'))}
                        />
                        <SummaryCard 
                            title="Personal Expenses"
                            transactions={filteredExpenses.filter(e => e.expenseType === 'personal')}
                            icon={ICONS.USER}
                            color="orange"
                            onClick={() => openExpenseDetailsModal('Personal Expenses', filteredExpenses.filter(e => e.expenseType === 'personal'))}
                        />
                    </div>

                    <FinancialCharts payments={filteredPayments} expenses={filteredExpenses} isDataHidden={isDataHidden} />
                </>
            )}

            <FinanceDetailsModal 
                isOpen={isExpenseDetailsModalOpen}
                onClose={() => setIsExpenseDetailsModalOpen(false)}
                title={modalContent.title}
                transactions={modalContent.transactions}
                students={students}
                groups={groups}
            />

            <StudentPaymentsDetailModal
                isOpen={isStudentPaymentsModalOpen}
                onClose={() => setIsStudentPaymentsModalOpen(false)}
                students={students}
                payments={filteredPayments}
            />

            <TransactionFormModal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                isExpenseOnly={true}
            />
        </div>
    );
};

export default FinancesModule;