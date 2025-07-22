import React, { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import Modal from './Modal';
import { FormInput } from './Form';
import { formatDate } from '../utils/formatDate';
import InvoiceGenerator from './InvoiceGenerator';
import { useAppContext } from '../contexts/AppContext';
import apiClient from '../apiClient';

const StudentPaymentDetailsModal = ({ isOpen, onClose, student, onUpdateStudent }) => {
    const { fetchData } = useAppContext();
    const [hours, setHours] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingInstallment, setEditingInstallment] = useState(null);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [selectedPaymentForInvoice, setSelectedPaymentForInvoice] = useState(null);
    const [transactions, setTransactions] = useState([]);

    if (!student) return null;

    const tutoringPayments = useMemo(() => {
        return transactions
            .filter(t => t.expenseType === 'income-tutoring' && t.studentId === student.id)
            .sort((a,b) => new Date(b.date) - new Date(a.date));
    }, [transactions, student.id]);

    const handleLogInstallmentPayment = async (installmentNumber) => {
        const updatedInstallments = student.installments.map(inst => {
            if (inst.number === installmentNumber) {
                return { ...inst, status: 'Paid', paymentDate: new Date().toISOString() };
            }
            return inst;
        });

        const installmentToLog = student.installments.find(inst => inst.number === installmentNumber);

        try {
            await apiClient.update('students', student.id, { installments: updatedInstallments });

            if (onUpdateStudent) {
                onUpdateStudent({ ...student, installments: updatedInstallments });
            }

            await apiClient.create('transactions', {
                studentId: student.id,
                studentName: student.fullName,
                amount: installmentToLog.amount,
                transactionDate: new Date().toISOString(), 
                expenseType: 'income-group',
                description: `Installment #${installmentNumber} for ${student.fullName}`,
                installmentId: `${student.id}-${installmentNumber}`
            });
            fetchData();

        } catch (error) {
            console.error("Error logging payment: ", error);
        }
    };

    const handleUnlogInstallmentPayment = async (installmentNumber) => {
        const updatedInstallments = student.installments.map(inst => {
            if (inst.number === installmentNumber) {
                return { ...inst, status: 'Unpaid', paymentDate: null };
            }
            return inst;
        });

        try {
            await apiClient.update('students', student.id, { installments: updatedInstallments });

            if (onUpdateStudent) {
                onUpdateStudent({ ...student, installments: updatedInstallments });
            }

            // Delete the transaction
            await apiClient.delete('transactions', `${student.id}-${installmentNumber}`);
            fetchData();

        } catch (error) {
            console.error("Error unlogging payment: ", error);
        }
    };

    const handleEditInstallment = (installment) => {
        setEditingInstallment({ ...installment, dueDate: new Date(installment.dueDate).toISOString().split('T')[0] });
    };

    const handleSaveInstallmentEdit = async (e) => {
        e.preventDefault();
        if (!editingInstallment) return;

        const updatedInstallments = student.installments.map(inst => {
            if (inst.number === editingInstallment.number) {
                return {
                    ...inst,
                    amount: parseFloat(editingInstallment.amount),
                    dueDate: new Date(editingInstallment.dueDate).toISOString(),
                };
            }
            return inst;
        });

        try {
            await apiClient.update('students', student.id, { installments: updatedInstallments });
            setEditingInstallment(null);
            if (onUpdateStudent) {
                onUpdateStudent({ ...student, installments: updatedInstallments });
            }
            fetchData();
        } catch (error) {
            console.error("Error saving installment edit: ", error);
        }
    };
    
    const handleLogTutoringPayment = async () => {
        if (!hours || hours <= 0) {
            alert("Please enter a valid number of hours.");
            setIsSubmitting(true);
            return;
        }

        const hourlyRate = student.tutoringDetails?.hourlyRate;
        if (!hourlyRate || hourlyRate <= 0) {
            alert("Please enter a valid hourly rate and number of hours.");
            setIsSubmitting(false);
            return;
        }

        const totalAmount = hourlyRate * hours;

        try {
            await apiClient.create('transactions', {
                studentId: student.id,
                studentName: student.fullName,
                amount: totalAmount,
                transactionDate: new Date().toISOString(),
                expenseType: 'income-tutoring',
                description: `Tutoring payment for ${hours} hour(s).`
            });
            setHours(1);
            fetchData();
        } catch (error) {
            console.error("Error logging tutoring payment: ", error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const modalTitle = (
        <div>
            <h3 className="text-xl font-bold">{student.fullName}</h3>
            <p className="text-sm text-white/80">Payment Details</p>
        </div>
    );
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
            {student.isTutoring ? (
                <div className="space-y-6">
                    <div>
                        <h4 className="font-semibold text-lg mb-2">Log New Tutoring Payment</h4>
                        <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                            <p><span className="font-medium">Hourly Rate:</span> ₺{student.tutoringDetails?.hourlyRate || 'N/A'}</p>
                            <div className="flex items-end gap-4">
                                <FormInput 
                                    label="Number of Hours/Sessions" 
                                    type="number" 
                                    value={hours} 
                                    onChange={(e) => setHours(e.target.value)} 
                                    min="1"
                                />
                                <button 
                                    onClick={handleLogTutoringPayment} 
                                    disabled={isSubmitting}
                                    className="px-4 py-2 h-10 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400"
                                >
                                    {isSubmitting ? 'Logging...' : 'Log Payment'}
                                </button>
                            </div>
                            <p className="text-lg font-bold">Total: ₺{((student.tutoringDetails?.hourlyRate || 0) * (hours || 0)).toFixed(2)}</p>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold text-lg mb-2">Payment History</h4>
                        {tutoringPayments.length > 0 ? (
                            <ul className="divide-y divide-gray-200 border-t border-b">
                                {tutoringPayments.map(payment => (
                                    <li key={payment.id} className="py-3 flex justify-between items-center">
                                        <div>
                                            <p className="font-medium text-gray-800">{payment.description}</p>
                                            <p className="text-sm text-gray-500">{formatDate(payment.date)}</p>
                                        </div>
                                        <p className="font-semibold text-green-600">₺{payment.amount.toFixed(2)}</p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-gray-500 py-4">No tutoring payments logged yet.</p>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <h4 className="font-semibold">Installment Plan</h4>
                     <ul className="divide-y divide-gray-200">
                        {(student.installments || []).map(inst => (
                            <li key={inst.number} className="py-3 flex justify-between items-center">
                                {editingInstallment?.number === inst.number ? (
                                    <form onSubmit={handleSaveInstallmentEdit} className="flex items-center space-x-2 w-full">
                                        <FormInput
                                            name="amount"
                                            type="number"
                                            value={editingInstallment.amount}
                                            onChange={(e) => setEditingInstallment(prev => ({ ...prev, amount: e.target.value }))}
                                            className="w-24"
                                        />
                                        <CustomDatePicker
                                            name="dueDate"
                                            value={editingInstallment.dueDate}
                                            onChange={(e) => setEditingInstallment(prev => ({ ...prev, dueDate: e.target.value }))}
                                        />
                                        <button type="submit" className="px-3 py-1 text-sm rounded-lg text-white bg-green-600 hover:bg-green-700">Save</button>
                                        <button type="button" onClick={() => setEditingInstallment(null)} className="px-3 py-1 text-sm rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300">Cancel</button>
                                    </form>
                                ) : (
                                    <>
                                        <div>
                                            <p className="font-medium text-gray-800">Installment #{inst.number}</p>
                                            <p className="text-sm text-gray-500">Due: {formatDate(inst.dueDate)}</p>
                                            {inst.paymentDate && <p className="text-xs text-gray-500">Paid on: {formatDate(inst.paymentDate)}</p>}
                                        </div>
                                        <div className="text-right flex items-center space-x-4">
                                            <div>
                                                <p className="font-semibold text-gray-800">₺{inst.amount.toFixed(2)}</p>
                                                {inst.status === 'Paid' ? (
                                                     <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">Paid</span>
                                                ) : (
                                                     <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full">Unpaid</span>
                                                )}
                                            </div>
                                            {inst.status === 'Unpaid' ? (
                                                <div className="flex space-x-2">
                                                    <button onClick={() => handleLogInstallmentPayment(inst.number)} className="px-3 py-1 text-sm rounded-lg text-white bg-blue-600 hover:bg-blue-700">
                                                        Log Payment
                                                    </button>
                                                    <button onClick={() => handleEditInstallment(inst)} className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-200">Edit</button>
                                                    <button onClick={() => handleGenerateInvoice(inst)} className="px-3 py-1 text-sm rounded-lg text-white bg-purple-600 hover:bg-purple-700">Invoice</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleUnlogInstallmentPayment(inst.number)} className="px-3 py-1 text-sm rounded-lg text-white bg-yellow-600 hover:bg-yellow-700">
                                                    Undo Payment
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {showInvoiceModal && selectedPaymentForInvoice && (
                <Modal isOpen={showInvoiceModal} onClose={() => setShowInvoiceModal(false)} title="Invoice Preview">
                    <InvoiceGenerator student={student} payment={selectedPaymentForInvoice} />
                    <div className="flex justify-end mt-4">
                        <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Print Invoice</button>
                    </div>
                </Modal>
            )}
        </Modal>
    );
};

export default StudentPaymentDetailsModal;
