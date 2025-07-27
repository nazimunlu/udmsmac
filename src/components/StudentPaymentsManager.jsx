import React, { useState, useEffect, useMemo } from 'react';
import { Icon, ICONS } from './Icons';
import { format, isAfter, isBefore, addDays, differenceInDays } from 'date-fns';
import PaymentModal from './PaymentModal';
import { useNotification } from '../contexts/NotificationContext';
import apiClient from '../apiClient';

const StudentPaymentsManager = ({ students, payments, onPaymentRecorded }) => {
    const { showNotification } = useNotification();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    // Enhanced student data processing
    const processedStudents = useMemo(() => {
        return students.map(student => {
            const studentPayments = payments.filter(p => p.studentId === student.id);
            const installments = student.installments || [];
            
            const totalOwed = installments.reduce((sum, inst) => sum + inst.amount, 0);
            const totalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
            const remainingBalance = totalOwed - totalPaid;
            const paymentRate = totalOwed > 0 ? (totalPaid / totalOwed) * 100 : 0;
            
            const overdueInstallments = installments.filter(inst => 
                inst.status === 'Unpaid' && isAfter(new Date(), new Date(inst.dueDate))
            );
            const upcomingInstallments = installments.filter(inst => 
                inst.status === 'Unpaid' && 
                isBefore(new Date(), new Date(inst.dueDate)) &&
                isAfter(new Date(inst.dueDate), addDays(new Date(), 7))
            );
            
            const lastPayment = studentPayments.length > 0 ? 
                new Date(studentPayments[studentPayments.length - 1].transactionDate) : null;
            
            const daysSinceLastPayment = lastPayment ? 
                differenceInDays(new Date(), lastPayment) : null;

            return {
                ...student,
                totalOwed,
                totalPaid,
                remainingBalance,
                paymentRate,
                overdueInstallments,
                upcomingInstallments,
                lastPayment,
                daysSinceLastPayment,
                paymentHistory: studentPayments,
                status: remainingBalance > 0 ? 
                    (overdueInstallments.length > 0 ? 'overdue' : 'pending') : 'paid'
            };
        });
    }, [students, payments]);

    // Filtered students
    const filteredStudents = useMemo(() => {
        return processedStudents.filter(student => {
            const matchesSearch = student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                student.studentContact?.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
            
            return matchesSearch && matchesStatus;
        });
    }, [processedStudents, searchTerm, statusFilter]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'overdue': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'paid': return ICONS.CHECK;
            case 'pending': return ICONS.CLOCK;
            case 'overdue': return ICONS.WARNING;
            default: return ICONS.INFO;
        }
    };

    const handlePayment = (student) => {
        setSelectedStudent(student);
        setIsPaymentModalOpen(true);
    };

    const generateLatePaymentMessage = (student) => {
        const overdueAmount = student.overdueInstallments.reduce((sum, inst) => sum + inst.amount, 0);
        const overdueCount = student.overdueInstallments.length;
        
        // Get the first overdue installment for date
        const firstOverdue = student.overdueInstallments[0];
        const dueDate = firstOverdue ? new Date(firstOverdue.dueDate).toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }) : 'N/A';
        
        return `Sayın ${student.fullName}, vade tarihi ${dueDate} olan ${Math.round(overdueAmount)} ₺ tutarında ödenmemiş ${overdueCount} adet taksitiniz bulunmaktadır. Ödeme yaptıysanız lütfen bizimle iletişime geçin. Saygılarımızla. - Özel Ünlü Dil İngilizce Kursu Yönetimi.`;
    };

    const handleGenerateMessage = (student) => {
        const message = generateLatePaymentMessage(student);
        // In a real app, this would open a message composer or copy to clipboard
        navigator.clipboard.writeText(message).then(() => {
            showNotification(`Late payment message copied to clipboard for ${student.fullName}`, 'success');
        }).catch(() => {
            showNotification(`Message generated for ${student.fullName}`, 'info');
        });
    };

    const getPaymentProgressColor = (rate) => {
        if (rate >= 80) return 'bg-green-500';
        if (rate >= 50) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="space-y-6">
            {/* Header with Stats */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">
                            {processedStudents.length}
                        </div>
                        <div className="text-sm text-gray-600">Total Students</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">
                            {processedStudents.filter(s => s.status === 'paid').length}
                        </div>
                        <div className="text-sm text-gray-600">Fully Paid</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-red-600">
                            {processedStudents.filter(s => s.status === 'overdue').length}
                        </div>
                        <div className="text-sm text-gray-600">Overdue</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600">
                            {processedStudents.reduce((sum, s) => sum + s.remainingBalance, 0).toFixed(0)}₺
                        </div>
                        <div className="text-sm text-gray-600">Total Outstanding</div>
                    </div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                    <div className="flex-1 max-w-md">
                        <div className="relative">
                            <Icon path={ICONS.INFO} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search students..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="all">All Status</option>
                            <option value="paid">Fully Paid</option>
                            <option value="pending">Pending</option>
                            <option value="overdue">Overdue</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Students List */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Student
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Balance
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Payment Rate
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Installments</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Payment</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredStudents.map((student) => (
                                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                                    {student.fullName.charAt(0).toUpperCase()}
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{student.fullName}</div>
                                                <div className="text-sm text-gray-500">{student.studentContact}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            <span className="font-semibold">{student.remainingBalance.toFixed(2)} ₺</span>
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            Paid: {student.totalPaid.toFixed(2)} ₺
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                                <div 
                                                    className={`h-2 rounded-full ${getPaymentProgressColor(student.paymentRate)}`}
                                                    style={{ width: `${Math.min(student.paymentRate, 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-sm text-gray-900">{student.paymentRate.toFixed(0)}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(student.status)}`}>
                                            <Icon path={getStatusIcon(student.status)} className="w-3 h-3 mr-1" />
                                            {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <div className="flex items-center space-x-2">
                                            {student.overdueInstallments.length > 0 && (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    {student.overdueInstallments.length} overdue
                                                </span>
                                            )}
                                            {student.upcomingInstallments.length > 0 && (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {student.upcomingInstallments.length} upcoming
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {student.lastPayment ? (
                                            <div>
                                                <div>{format(student.lastPayment, 'MMM dd, yyyy')}</div>
                                                {student.daysSinceLastPayment > 0 && (
                                                    <div className="text-xs text-gray-400">
                                                        {student.daysSinceLastPayment} days ago
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">No payments</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center space-x-1">
                                            <button
                                                onClick={() => handlePayment(student)}
                                                className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                                                title="Record payment"
                                            >
                                                <Icon path={ICONS.WALLET} className="w-3 h-3" />
                                            </button>
                                            {student.status === 'overdue' && (
                                                <button
                                                    onClick={() => handleGenerateMessage(student)}
                                                    className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                                    title="Generate late payment message"
                                                >
                                                    <Icon path={ICONS.BELL} className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Payment Modal */}
            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => {
                    setIsPaymentModalOpen(false);
                    setSelectedStudent(null);
                }}
                student={selectedStudent}
                onPaymentRecorded={onPaymentRecorded}
            />


        </div>
    );
};

export default StudentPaymentsManager; 