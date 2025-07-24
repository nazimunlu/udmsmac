import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { FormInput, FormSelect, FormSection } from './Form';
import CustomDatePicker from './CustomDatePicker';
import { useNotification } from '../contexts/NotificationContext';
import { useAppContext } from '../contexts/AppContext';
import apiClient from '../apiClient';
import { Icon, ICONS } from './Icons';

const PaymentModal = ({ isOpen, onClose, student, installment, onPaymentRecorded }) => {
    const { showNotification } = useNotification();
    const { students, fetchData } = useAppContext();
    const [formData, setFormData] = useState({
        studentId: '',
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
        description: '',
        installmentNumber: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentInstallments, setStudentInstallments] = useState([]);

    useEffect(() => {
        if (isOpen) {
            if (student) {
                setFormData(prev => ({ ...prev, studentId: student.id }));
                setSelectedStudent(student);
                setStudentInstallments(student.installments || []);
            } else if (installment) {
                setFormData(prev => ({ 
                    ...prev, 
                    studentId: installment.student.id,
                    amount: installment.amount.toString(),
                    installmentNumber: installment.number.toString(),
                    description: `Payment for installment ${installment.number}`
                }));
                setSelectedStudent(installment.student);
                setStudentInstallments(installment.student.installments || []);
            } else {
                setFormData({
                    studentId: '',
                    amount: '',
                    paymentDate: new Date().toISOString().split('T')[0],
                    paymentMethod: 'cash',
                    description: '',
                    installmentNumber: ''
                });
                setSelectedStudent(null);
                setStudentInstallments([]);
            }
        }
    }, [isOpen, student, installment]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        if (name === 'studentId') {
            const selectedStudentData = students.find(s => s.id === value);
            setSelectedStudent(selectedStudentData);
            setStudentInstallments(selectedStudentData?.installments || []);
        } else if (name === 'installmentNumber' && value) {
            // Auto-fill amount when installment is selected
            const selectedInstallment = studentInstallments.find(inst => inst.number === parseInt(value));
            if (selectedInstallment) {
                setFormData(prev => ({ 
                    ...prev, 
                    amount: selectedInstallment.amount.toString(),
                    description: `Payment for installment ${selectedInstallment.number}`
                }));
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Determine the amount to use
            let paymentAmount = parseFloat(formData.amount);
            
            // If installment is selected, use its amount
            if (formData.installmentNumber) {
                const selectedInstallment = studentInstallments.find(inst => inst.number === parseInt(formData.installmentNumber));
                if (selectedInstallment) {
                    paymentAmount = selectedInstallment.amount;
                }
            }

            // Validate amount
            if (!paymentAmount || paymentAmount <= 0) {
                showNotification('Please enter a valid payment amount.', 'error');
                return;
            }

            // Create the payment transaction with correct field names
            const paymentData = {
                amount: paymentAmount,
                type: 'income-group',
                description: formData.description || `Payment from ${selectedStudent?.fullName}`,
                transaction_date: formData.paymentDate,
                category: 'Student Payment',
                expense_type: 'income-group',
                student_id: formData.studentId
            };

            await apiClient.create('transactions', paymentData);

            // Update installment status if specific installment is being paid
            if (formData.installmentNumber && selectedStudent) {
                const updatedInstallments = [...studentInstallments];
                const installmentIndex = updatedInstallments.findIndex(inst => inst.number === parseInt(formData.installmentNumber));
                
                if (installmentIndex !== -1) {
                    updatedInstallments[installmentIndex] = {
                        ...updatedInstallments[installmentIndex],
                        status: 'Paid',
                        paidDate: formData.paymentDate
                    };

                    await apiClient.update('students', selectedStudent.id, {
                        installments: JSON.stringify(updatedInstallments)
                    });
                }
            }

            showNotification('Payment recorded successfully!', 'success');
            onPaymentRecorded();
            onClose();
        } catch (error) {
            console.error("Error recording payment:", error);
            showNotification('Failed to record payment. Please check the console for details.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getUnpaidInstallments = () => {
        return studentInstallments.filter(inst => inst.status === 'Unpaid');
    };

    const getTotalOwed = () => {
        return studentInstallments.reduce((sum, inst) => sum + inst.amount, 0);
    };

    const getTotalPaid = () => {
        return studentInstallments.filter(inst => inst.status === 'Paid').reduce((sum, inst) => sum + inst.amount, 0);
    };

    const getRemainingBalance = () => {
        return getTotalOwed() - getTotalPaid();
    };

    const isAmountRequired = () => {
        // Amount is required only if no specific installment is selected
        return !formData.installmentNumber;
    };

    const getSelectedInstallmentAmount = () => {
        if (formData.installmentNumber) {
            const selectedInstallment = studentInstallments.find(inst => inst.number === parseInt(formData.installmentNumber));
            return selectedInstallment ? selectedInstallment.amount : 0;
        }
        return 0;
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Record Payment"
            headerStyle={{ backgroundColor: '#10B981' }}
        >
            <form onSubmit={handleSubmit}>
                <FormSection title="Payment Details">
                    <div className="sm:col-span-6">
                        <FormSelect 
                            label="Student" 
                            name="studentId" 
                            value={formData.studentId} 
                            onChange={handleChange}
                            required
                            disabled={!!student || !!installment}
                        >
                            <option value="">Select a student</option>
                            {students.map(s => (
                                <option key={s.id} value={s.id}>{s.fullName}</option>
                            ))}
                        </FormSelect>
                    </div>

                    {selectedStudent && (
                        <div className="sm:col-span-6 p-4 bg-blue-50 rounded-lg">
                            <h4 className="font-semibold text-gray-800 mb-2">Student Financial Summary</h4>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-600">Total Owed</p>
                                    <p className="font-bold text-blue-800">{getTotalOwed().toFixed(2)} ₺</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Total Paid</p>
                                    <p className="font-bold text-green-600">{getTotalPaid().toFixed(2)} ₺</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Remaining</p>
                                    <p className="font-bold text-red-600">{getRemainingBalance().toFixed(2)} ₺</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {getUnpaidInstallments().length > 0 && (
                        <div className="sm:col-span-6">
                            <FormSelect 
                                label="Pay for Installment (Optional)" 
                                name="installmentNumber" 
                                value={formData.installmentNumber} 
                                onChange={handleChange}
                            >
                                <option value="">General payment</option>
                                {getUnpaidInstallments().map(inst => (
                                    <option key={inst.number} value={inst.number}>
                                        Installment {inst.number} - {inst.amount.toFixed(2)} ₺ (Due: {new Date(inst.dueDate).toLocaleDateString()})
                                    </option>
                                ))}
                            </FormSelect>
                        </div>
                    )}

                    <div className="sm:col-span-3">
                        <FormInput 
                            label={`Amount (₺) ${formData.installmentNumber ? '(Auto-filled)' : ''}`}
                            name="amount" 
                            type="number" 
                            step="0.01"
                            value={formData.amount} 
                            onChange={handleChange} 
                            required={isAmountRequired()}
                            disabled={!!formData.installmentNumber}
                            placeholder={formData.installmentNumber ? getSelectedInstallmentAmount().toFixed(2) : "Enter amount"}
                        />
                        {formData.installmentNumber && (
                            <p className="text-sm text-gray-500 mt-1">
                                Amount will be set to {getSelectedInstallmentAmount().toFixed(2)} ₺ for this installment
                            </p>
                        )}
                    </div>

                    <div className="sm:col-span-3">
                        <CustomDatePicker 
                            label="Payment Date" 
                            name="paymentDate" 
                            value={formData.paymentDate} 
                            onChange={handleChange} 
                            required 
                        />
                    </div>

                    <div className="sm:col-span-6">
                        <FormSelect 
                            label="Payment Method" 
                            name="paymentMethod" 
                            value={formData.paymentMethod} 
                            onChange={handleChange}
                            required
                        >
                            <option value="cash">Cash</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="credit_card">Credit Card</option>
                            <option value="check">Check</option>
                            <option value="other">Other</option>
                        </FormSelect>
                    </div>

                    <div className="sm:col-span-6">
                        <FormInput 
                            label="Description" 
                            name="description" 
                            value={formData.description} 
                            onChange={handleChange}
                            placeholder="Payment description..."
                        />
                    </div>
                </FormSection>

                <div className="flex justify-end pt-8 mt-8 border-t border-gray-200 space-x-4">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={isSubmitting} 
                        className="px-6 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Recording...' : 'Record Payment'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default PaymentModal; 