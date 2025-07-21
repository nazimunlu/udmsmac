import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Icon, ICONS } from './Icons';
import StudentPaymentDetailsModal from './StudentPaymentDetailsModal';

const StudentPaymentsView = () => {
    const { students } = useAppContext();
    const [selectedStudent, setSelectedStudent] = useState(null);

    const { groupStudents, tutoringStudents } = useMemo(() => {
        const groupStudents = students.filter(s => !s.isTutoring && s.groupId);
        const tutoringStudents = students.filter(s => s.isTutoring);
        return { groupStudents, tutoringStudents };
    }, [students]);

    const StudentList = ({ title, students }) => (
        <div className="bg-white rounded-lg shadow-md">
            <h3 className="font-semibold text-xl p-6 border-b border-gray-200">{title}</h3>
            <ul className="divide-y divide-gray-200">
                {students.map(student => (
                    <li key={student.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                        <div>
                            <p className="font-medium text-gray-800">{student.fullName}</p>
                            <p className="text-sm text-gray-500">{student.studentContact}</p>
                        </div>
                        <button 
                            onClick={() => setSelectedStudent(student)}
                            className="p-2 rounded-full hover:bg-gray-200"
                            title="View Payment Details"
                        >
                            <Icon path={ICONS.WALLET} className="w-6 h-6 text-blue-600" />
                        </button>
                    </li>
                ))}
                 {students.length === 0 && (
                    <p className="p-4 text-center text-gray-500">No students in this category.</p>
                )}
            </ul>
        </div>
    );

    return (
        <div className="space-y-6">
            <StudentList title="Group Students" students={groupStudents} />
            <StudentList title="Tutoring Students" students={tutoringStudents} />

            {selectedStudent && (
                <StudentPaymentDetailsModal
                    isOpen={!!selectedStudent}
                    onClose={() => setSelectedStudent(null)}
                    student={selectedStudent}
                />
            )}
        </div>
    );
};

export default StudentPaymentsView;