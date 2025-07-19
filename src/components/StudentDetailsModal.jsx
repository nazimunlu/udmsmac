import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useAppContext } from '../contexts/AppContext';
import Modal from './Modal';
import { formatDate } from '../utils/formatDate';

const StudentDetailsModal = ({ isOpen, onClose, student }) => {
    const { db, userId, appId, groups } = useAppContext();
    const [activeTab, setActiveTab] = useState('general');
    const [lessons, setLessons] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!student?.groupId) {
            setIsLoading(false);
            setLessons([]);
            return;
        }
        setIsLoading(true);
        const lessonsQuery = query(collection(db, 'artifacts', appId, 'users', userId, 'lessons'), where("groupId", "==", student.groupId));
        const unsubscribe = onSnapshot(lessonsQuery, (snapshot) => {
            const lessonsData = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
            lessonsData.sort((a,b) => a.lessonDate.toMillis() - b.lessonDate.toMillis());
            setLessons(lessonsData);
            setIsLoading(false);
        });
        return unsubscribe;
    }, [db, userId, appId, student?.groupId]);

    const paymentSummary = useMemo(() => {
        if (student.isTutoring || !student.installments) return null;
        const totalPaid = student.installments
            .filter(i => i.status === 'Paid')
            .reduce((sum, i) => sum + i.amount, 0);
        const totalFee = parseFloat(student.feeDetails?.totalFee) || 0;
        return { totalPaid, totalFee };
    }, [student]);

    const attendanceSummary = useMemo(() => {
        if (student.isTutoring || lessons.length === 0) return null;
        const presentCount = lessons.filter(l => l.attendance?.[student.id] === 'present').length;
        const totalLessons = lessons.length;
        return { presentCount, totalLessons };
    }, [lessons, student.id]);
    
    const groupName = student.groupId ? groups.find(g => g.id === student.groupId)?.groupName : 'N/A';
    
    const getAttendanceStatus = (status) => {
        const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";
        switch(status) {
            case 'present': return <span className={`${baseClasses} bg-green-100 text-green-800`}>Present</span>;
            case 'absent': return <span className={`${baseClasses} bg-red-100 text-red-800`}>Absent</span>;
            case 'late': return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Late</span>;
            default: return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>N/A</span>;
        }
    };

    const modalTitle = (
        <div>
            <h3 className="text-xl font-bold">{student.fullName}</h3>
            <p className="text-sm text-white/80">Student Details</p>
        </div>
    );
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
            <div className="mb-4 border-b border-gray-200">
                <nav className="flex space-x-4" aria-label="Tabs">
                    <button onClick={() => setActiveTab('general')} className={`-mb-px px-3 py-2 font-medium text-sm border-b-2 ${activeTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>General Info</button>
                    <button onClick={() => setActiveTab('payments')} className={`-mb-px px-3 py-2 font-medium text-sm border-b-2 ${activeTab === 'payments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Payments</button>
                    <button onClick={() => setActiveTab('attendance')} className={`-mb-px px-3 py-2 font-medium text-sm border-b-2 ${activeTab === 'attendance' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Attendance</button>
                </nav>
            </div>
            
            {activeTab === 'general' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="font-medium text-gray-500">Student Contact:</div><div className="text-gray-800">{student.studentContact}</div>
                    <div className="font-medium text-gray-500">Parent Contact:</div><div className="text-gray-800">{student.parentContact || 'N/A'}</div>
                    <div className="font-medium text-gray-500">Enrollment Date:</div><div className="text-gray-800">{formatDate(student.enrollmentDate)}</div>
                    <div className="font-medium text-gray-500">Birth Date:</div><div className="text-gray-800">{student.birthDate ? formatDate(student.birthDate) : 'N/A'}</div>
                    <div className="font-medium text-gray-500">Student Type:</div><div className="text-gray-800">{student.isTutoring ? 'Tutoring' : 'Group'}</div>
                    {!student.isTutoring && <><div className="font-medium text-gray-500">Group:</div><div className="text-gray-800">{groupName}</div></>}
                </div>
            )}

            {activeTab === 'payments' && (
                <div>
                    {paymentSummary && (
                        <div className="p-4 bg-blue-50 rounded-lg mb-4 text-center">
                            <p className="font-semibold text-blue-800">
                                Total Paid: ₺{paymentSummary.totalPaid.toFixed(2)} / ₺{paymentSummary.totalFee.toFixed(2)}
                            </p>
                        </div>
                    )}
                    <ul className="divide-y divide-gray-200">
                        {(student.installments || []).map(inst => (
                            <li key={inst.number} className="py-3 flex justify-between items-center">
                                <div>
                                    <p className="font-medium text-gray-800">Installment #{inst.number}</p>
                                    <p className="text-sm text-gray-500">Due: {formatDate(inst.dueDate)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-gray-800">₺{inst.amount.toFixed(2)}</p>
                                    {inst.status === 'Paid' ? (
                                        <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">Paid</span>
                                    ) : (
                                        <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full">Unpaid</span>
                                    )}
                                </div>
                            </li>
                        ))}
                        {(student.installments || []).length === 0 && <p className="text-center text-gray-500 py-4">No payment plan found for this student.</p>}
                    </ul>
                </div>
            )}

            {activeTab === 'attendance' && (
                 <div>
                    {attendanceSummary && (
                        <div className="p-4 bg-green-50 rounded-lg mb-4 text-center">
                            <p className="font-semibold text-green-800">
                                Attendance: {attendanceSummary.presentCount} / {attendanceSummary.totalLessons} lessons present
                            </p>
                        </div>
                    )}
                    {isLoading ? <p>Loading attendance...</p> :
                    <ul className="divide-y divide-gray-200">
                        {lessons.map(lesson => (
                            <li key={lesson.id} className="py-3 flex justify-between items-center">
                                <div>
                                    <p className="font-medium text-gray-800">{lesson.topic}</p>
                                    <p className="text-sm text-gray-500">{formatDate(lesson.lessonDate)}</p>
                                </div>
                                {getAttendanceStatus(lesson.attendance?.[student.id])}
                            </li>
                        ))}
                        {lessons.length === 0 && <p className="text-center text-gray-500 py-4">No lessons found for this student's group.</p>}
                    </ul>}
                </div>
            )}
        </Modal>
    );
};

export default StudentDetailsModal;