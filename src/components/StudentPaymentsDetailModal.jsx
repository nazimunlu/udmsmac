import React, { useState } from 'react';
import Modal from './Modal';
import { Icon, ICONS } from './Icons';
import { formatDate } from '../utils/formatDate';

const StudentPaymentsDetailModal = ({ isOpen, onClose, students, payments }) => {
    const [selectedStudent, setSelectedStudent] = useState(null);

    if (!isOpen) return null;

    const handleSelectStudent = (student) => {
        setSelectedStudent(student);
    };

    const handleClose = () => {
        setSelectedStudent(null);
        onClose();
    }

    const renderStudentList = () => (
        <div className="p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Select a Student</h3>
            <ul className="space-y-2 h-96 overflow-y-auto">
                {students.map(student => (
                    <li 
                        key={student.id} 
                        className="p-3 bg-gray-100 rounded-lg cursor-pointer hover:bg-blue-100"
                        onClick={() => handleSelectStudent(student)}
                    >
                        {student.fullName}
                    </li>
                ))}
            </ul>
        </div>
    );

    const renderStudentDetails = () => {
        const installments = selectedStudent.installments || [];
        const totalOwed = installments.reduce((sum, i) => sum + i.amount, 0);
        
        // Total paid across all time for remaining balance calculation
        const totalPaidAllTime = installments.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.amount, 0);
        const remainingBalance = totalOwed - totalPaidAllTime;

        // Total paid within the selected date range from FinancesModule
        const totalPaidInPeriod = (payments || [])
            .filter(p => p.studentId === selectedStudent.id)
            .reduce((sum, p) => sum + p.amount, 0);

        return (
            <div className="p-6">
                <button onClick={() => setSelectedStudent(null)} className="flex items-center text-blue-600 mb-4">
                    <Icon path={ICONS.ARROW_LEFT} className="w-4 h-4 mr-2" />
                    Back to Student List
                </button>
                <div className="flex items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800">{selectedStudent.fullName}</h3>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-blue-50 rounded-lg text-center">
                    <div>
                        <p className="text-sm text-gray-600">Total Owed</p>
                        <p className="text-xl font-bold text-blue-800">{totalOwed.toFixed(2)} ₺</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Paid (in range)</p>
                        <p className="text-xl font-bold text-green-600">{totalPaidInPeriod.toFixed(2)} ₺</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Remaining</p>
                        <p className="text-xl font-bold text-red-600">{remainingBalance.toFixed(2)} ₺</p>
                    </div>
                </div>
                <h4 className="font-semibold text-gray-700 mb-2">All Installments</h4>
                <ul className="space-y-2 h-72 overflow-y-auto">
                    {installments.length > 0 ? installments.map((installment, index) => (
                        <li key={index} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                            <div>
                                <p className="font-medium">Installment {index + 1}</p>
                                <p className="text-sm text-gray-500">Due: {formatDate(installment.dueDate)}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold">{installment.amount.toFixed(2)} ₺</p>
                                <p className={`font-semibold text-sm ${installment.status === 'Paid' ? 'text-green-600' : 'text-red-600'}`}>
                                    {installment.status}
                                </p>
                            </div>
                        </li>
                    )) : (
                        <p className="text-center text-gray-500 py-4">No installments found for this student.</p>
                    )}
                </ul>
            </div>
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Student Payment Details">
            {selectedStudent ? renderStudentDetails() : renderStudentList()}
        </Modal>
    );
};

export default StudentPaymentsDetailModal;
