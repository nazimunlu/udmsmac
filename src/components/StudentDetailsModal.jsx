import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import Modal from './Modal';
import { formatDate } from '../utils/formatDate';
import formatPhoneNumber from '../utils/formatPhoneNumber';
import LessonFormModal from './LessonFormModal';
import { Icon, ICONS } from './Icons';
import ConfirmationModal from './ConfirmationModal';
import { useAppContext } from '../contexts/AppContext';

const StudentDetailsModal = ({ isOpen, onClose, student: initialStudent }) => {
    const { fetchData } = useAppContext();
    const [activeTab, setActiveTab] = useState('general');
    const [lessons, setLessons] = useState([]);
    const [groups, setGroups] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLessonFormModalOpen, setIsLessonFormModalOpen] = useState(false);
    const [lessonToEdit, setLessonToEdit] = useState(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [lessonToDelete, setLessonToDelete] = useState(null);
    const [currentStudent, setCurrentStudent] = useState(initialStudent);

    const fetchLessonsForStudent = async () => {
        if (!currentStudent?.id) {
            setIsLoading(false);
            setLessons([]);
            return;
        }
        setIsLoading(true);

        let query = supabase.from('lessons');

        if (currentStudent.isTutoring) {
            query = query.select('*').eq('studentId', currentStudent.id);
        } else if (currentStudent.groupId) {
            query = query.select('*').eq('groupId', currentStudent.groupId);
        } else {
            setIsLoading(false);
            setLessons([]);
            return;
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching lessons:', error);
        } else {
            data.sort((a,b) => new Date(a.lessonDate) - new Date(b.lessonDate));
            setLessons(data.map(l => ({
                ...l,
                attendance: l.attendance ? JSON.parse(l.attendance) : {},
            })));
        }
        setIsLoading(false);
    };

    useEffect(() => {
        const safeParse = (jsonString, defaultValue) => {
            if (typeof jsonString === 'string') {
                try {
                    return JSON.parse(jsonString);
                } catch (e) {
                    return defaultValue;
                }
            }
            return jsonString || defaultValue;
        };

        setCurrentStudent({
            ...initialStudent,
            installments: safeParse(initialStudent?.installments, []),
            fee_details: safeParse(initialStudent?.fee_details, {}),
            tutoring_details: safeParse(initialStudent?.tutoring_details, {}),
            documents: safeParse(initialStudent?.documents, {}),
            document_names: safeParse(initialStudent?.document_names, {}),
        });

        if (isOpen) {
            setActiveTab('general'); // Always set General Info tab as active when modal opens
        }
    }, [initialStudent, isOpen]);

    useEffect(() => {
        if (currentStudent?.id) {
            fetchLessonsForStudent();
        }
    }, [currentStudent?.id]);

    const fetchGroups = async () => {
        const { data, error } = await supabase.from('groups').select('*');
        if (error) {
            console.error('Error fetching groups:', error);
        } else {
            setGroups(data);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    const paymentSummary = useMemo(() => {
        if (!currentStudent.installments || !Array.isArray(currentStudent.installments)) {
            return { totalPaid: 0, totalFee: 0 };
        }
        
        const totalPaid = currentStudent.installments
            .filter(i => i.status === 'Paid')
            .reduce((sum, i) => sum + i.amount, 0);

        const totalFee = currentStudent.installments
            .reduce((sum, i) => sum + i.amount, 0);

        return { totalPaid, totalFee };
    }, [currentStudent.installments]);

    const attendanceSummary = useMemo(() => {
        if (currentStudent.isTutoring || lessons.length === 0) return null;
        const presentCount = lessons.filter(l => l.attendance?.[currentStudent.id] === 'Present').length;
        const totalLessons = lessons.length;
        return { presentCount, totalLessons };
    }, [lessons, currentStudent.id]);

    const tutoringSummary = useMemo(() => {
        if (!currentStudent.isTutoring) return null;
        const completedLessons = lessons.filter(l => l.status === 'Complete').length;
        const totalLessons = lessons.length;
        return { completedLessons, totalLessons };
    }, [lessons, currentStudent.isTutoring]);
    
    const group = useMemo(() => {
        if (currentStudent?.groupId && groups.length > 0) {
            return groups.find(g => g.id === currentStudent.groupId);
        }
        return null;
    }, [currentStudent, groups]);

    const headerColor = currentStudent.isTutoring ? '#8B5CF6' : (group?.color || '#3B82F6');
    
    const groupName = group?.groupName ?? 'N/A';
    
    const getAttendanceStatus = (status) => {
        const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";
        switch(status) {
            case 'Present': return <span className={`${baseClasses} bg-green-100 text-green-800`}>Present</span>;
            case 'Absent': return <span className={`${baseClasses} bg-red-100 text-red-800`}>Absent</span>;
            default: return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>N/A</span>;
        }
    };

    const handleEditLesson = (lesson) => {
        setLessonToEdit(lesson);
        setIsLessonFormModalOpen(true);
    };

    const handleDeleteLesson = (lesson) => {
        setLessonToDelete(lesson);
        setIsConfirmModalOpen(true);
    };

    const confirmDelete = async () => {
        if (lessonToDelete) {
            const { error } = await supabase.from('lessons').delete().match({ id: lessonToDelete.id });
            if (error) {
                console.error('Error deleting lesson:', error);
            } else {
                setLessons(lessons.filter(l => l.id !== lessonToDelete.id));
                fetchData(); // Refetch global data
            }
            setLessonToDelete(null);
            setIsConfirmModalOpen(false);
        }
    };

    const handleToggleStatus = async (lesson) => {
        const newStatus = lesson.status === 'Complete' ? 'Incomplete' : 'Complete';
        const { error } = await supabase.from('lessons').update({ status: newStatus }).match({ id: lesson.id });
        if (error) {
            console.error('Error updating lesson status:', error);
        } else {
            fetchLessonsForStudent(); // Refetch lessons for this student
            fetchData(); // Refetch global data
        }
    };

    const handleTogglePaymentStatus = async (installmentNumber) => {
        const updatedInstallments = currentStudent.installments.map(inst => 
            inst.number === installmentNumber 
                ? { ...inst, status: inst.status === 'Paid' ? 'Unpaid' : 'Paid' } 
                : inst
        );
        const { error } = await supabase.from('students').update({ installments: updatedInstallments }).match({ id: currentStudent.id });
        if (error) {
            console.error('Error updating payment status:', error);
        } else {
            setCurrentStudent(prev => ({ ...prev, installments: updatedInstallments }));
            fetchData();
        }
    };

    const handleAttendanceChange = async (lesson, studentId, currentStatus) => {
        const newStatus = {
            'Present': 'Absent',
            'Absent': 'Present'
        }[currentStatus] || 'Present';

        const updatedAttendance = {
            ...lesson.attendance,
            [studentId]: newStatus
        };

        const { error } = await supabase.from('lessons').update({ attendance: updatedAttendance }).match({ id: lesson.id });
        if (error) {
            console.error('Error updating attendance:', error);
        } else {
            fetchLessonsForStudent(); // Refetch lessons for this student
            fetchData();
        }
    };

    const modalTitle = (
        <div>
            <h3 className="text-xl font-bold">{currentStudent.full_name}</h3>
            <p className="text-sm text-white/80">Student Details</p>
        </div>
    );
    
    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} headerStyle={{ backgroundColor: headerColor }}>
            <div className="mb-4 border-b border-gray-200">
                <nav className="flex space-x-4" aria-label="Tabs">
                    <button onClick={() => setActiveTab('general')} className={`-mb-px px-3 py-2 font-medium text-sm border-b-2 ${activeTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>General Info</button>
                    <button onClick={() => setActiveTab('payments')} className={`-mb-px px-3 py-2 font-medium text-sm border-b-2 ${activeTab === 'payments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Payments</button>
                    {currentStudent.isTutoring ? (
                        <button onClick={() => setActiveTab('tutoringSummary')} className={`-mb-px px-3 py-2 font-medium text-sm border-b-2 ${activeTab === 'tutoringSummary' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Tutoring Summary</button>
                    ) : (
                        <button onClick={() => setActiveTab('attendance')} className={`-mb-px px-3 py-2 font-medium text-sm border-b-2 ${activeTab === 'attendance' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Attendance</button>
                    )}
                </nav>
            </div>
            
            {activeTab === 'general' && (
                <ul className="divide-y divide-gray-200">
                    <li className="py-3 flex justify-between items-center">
                        <div>
                            <p className="font-medium text-gray-800">Student Contact</p>
                            <p className="text-sm text-gray-500">{formatPhoneNumber(currentStudent.studentContact)}</p>
                        </div>
                    </li>
                    <li className="py-3 flex justify-between items-center">
                        <div>
                            <p className="font-medium text-gray-800">Parent Contact</p>
                            <p className="text-sm text-gray-500">{formatPhoneNumber(currentStudent.parentContact) || 'N/A'}</p>
                        </div>
                    </li>
                    <li className="py-3 flex justify-between items-center">
                        <div>
                            <p className="font-medium text-gray-800">Enrollment Date</p>
                            <p className="text-sm text-gray-500">{formatDate(currentStudent.enrollment_date)}</p>
                        </div>
                    </li>
                    <li className="py-3 flex justify-between items-center">
                        <div>
                            <p className="font-medium text-gray-800">Birth Date</p>
                            <p className="text-sm text-gray-500">{currentStudent.birth_date ? formatDate(currentStudent.birth_date) : 'N/A'}</p>
                        </div>
                    </li>
                    <li className="py-3 flex justify-between items-center">
                        <div>
                            <p className="font-medium text-gray-800">Student Type</p>
                            <p className="text-sm text-gray-500">{currentStudent.isTutoring ? 'Tutoring' : 'Group'}</p>
                        </div>
                    </li>
                    {!currentStudent.isTutoring && (
                        <li className="py-3 flex justify-between items-center">
                            <div>
                                <p className="font-medium text-gray-800">Group</p>
                                <p className="text-sm text-gray-500">{groupName}</p>
                            </div>
                        </li>
                    )}
                </ul>
            )}

            {activeTab === 'payments' && (
                <div>
                    {paymentSummary && (
                        <div className="p-4 bg-blue-50 rounded-lg mb-4">
                            <div className="flex justify-between items-center mb-2">
                                <p className="font-semibold text-blue-800">Payment Summary</p>
                                <span className="font-semibold text-blue-800">{paymentSummary.totalFee > 0 ? `${((paymentSummary.totalPaid / paymentSummary.totalFee) * 100).toFixed(0)}%` : '0%'}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700">
                                <div className="bg-blue-600 h-4 rounded-full"
                                     style={{ width: `${paymentSummary.totalFee > 0 ? (paymentSummary.totalPaid / paymentSummary.totalFee) * 100 : 0}%` }}>
                                </div>
                            </div>
                            <p className="text-center text-blue-800 mt-2">₺{paymentSummary.totalPaid.toFixed(0)} paid out of ₺{paymentSummary.totalFee.toFixed(0)}</p>
                        </div>
                    )}
                    <ul className="divide-y divide-gray-200">
                        {(currentStudent.installments || []).map(inst => (
                            <li key={inst.number} className="py-3 flex justify-between items-center">
                                <div>
                                    <p className="font-medium text-gray-800">Installment #{inst.number}</p>
                                    <p className="text-sm text-gray-500">Due: {formatDate(inst.dueDate)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-gray-800">₺{inst.amount.toFixed(0)}</p>
                                    <div className="flex items-center justify-end space-x-2 mt-1">
                                        {inst.status === 'Unpaid' && new Date(inst.dueDate) < new Date() && (
                                            <Icon path={ICONS.WARNING} className="w-4 h-4 text-yellow-500" title="Payment is overdue" />
                                        )}
                                        <button onClick={() => handleTogglePaymentStatus(inst.number)} className={`px-2 py-1 text-xs font-semibold rounded-full ${inst.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {inst.status}
                                    </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                        {(currentStudent.installments || []).length === 0 && <p className="text-center text-gray-500 py-4">No payment plan found for this student.</p>}
                    </ul>
                </div>
            )}

            {activeTab === 'attendance' && !currentStudent.isTutoring && (
                 <div>
                    {attendanceSummary && (
                        <div className="p-4 bg-green-50 rounded-lg mb-4">
                            <div className="flex justify-between items-center mb-2">
                                <p className="font-semibold text-green-800">Attendance Summary</p>
                                <span className="font-semibold text-green-800">{attendanceSummary.totalLessons > 0 ? `${((attendanceSummary.presentCount / attendanceSummary.totalLessons) * 100).toFixed(0)}%` : '0%'}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700">
                                <div className="bg-green-600 h-4 rounded-full"
                                     style={{ width: `${(attendanceSummary.presentCount / attendanceSummary.totalLessons) * 100}%` }}>
                                </div>
                            </div>
                            <p className="text-center text-green-800 mt-2">{attendanceSummary.presentCount} out of {attendanceSummary.totalLessons} lessons present</p>
                        </div>
                    )}
                    {isLoading ? <p>Loading attendance...</p> :
                    <ul className="divide-y divide-gray-200">
                        {lessons.map(lesson => (
                            <li key={lesson.id} className="py-3 flex justify-between items-center">
                                <div>
                                    <p className="font-medium text-gray-800">{lesson.topic}</p>
                                    <p className="text-sm text-gray-500">{formatDate(lesson.lesson_date)}</p>
                                </div>
                                <button onClick={() => handleAttendanceChange(lesson, currentStudent.id, lesson.attendance?.[currentStudent.id])} className={`px-2 py-1 text-xs font-semibold rounded-full ${lesson.attendance?.[currentStudent.id] === 'Present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {lesson.attendance?.[currentStudent.id] || 'N/A'}
                                </button>
                            </li>
                        ))}
                        {lessons.length === 0 && <p className="text-center text-gray-500 py-4">No lessons found for this student's group.</p>}
                    </ul>}
                </div>
            )}

            {activeTab === 'tutoringSummary' && currentStudent.isTutoring && (
                <div>
                    {tutoringSummary && (
                        <div className="p-4 bg-purple-50 rounded-lg mb-4">
                            <div className="flex justify-between items-center mb-2">
                                <p className="font-semibold text-purple-800">Tutoring Progress</p>
                                <span className="font-semibold text-purple-800">{tutoringSummary.totalLessons > 0 ? `${((tutoringSummary.completedLessons / tutoringSummary.totalLessons) * 100).toFixed(0)}%` : '0%'}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700">
                                <div className="bg-purple-600 h-4 rounded-full"
                                     style={{ width: `${(tutoringSummary.completedLessons / tutoringSummary.totalLessons) * 100}%` }}>
                                </div>
                            </div>
                            <p className="text-center text-purple-800 mt-2">{tutoringSummary.completedLessons} out of {tutoringSummary.totalLessons} lessons completed</p>
                            <div className="text-center mt-4">
                                <button onClick={() => setIsLessonFormModalOpen(true)} className="flex items-center justify-center px-3 py-1.5 rounded-md text-white bg-purple-600 hover:bg-purple-700 text-sm shadow-sm mx-auto">
                                    <Icon path={ICONS.ADD} className="w-4 h-4 mr-2"/>Log Lesson
                                </button>
                            </div>
                        </div>
                    )}
                                        <ul className="divide-y divide-gray-200">
                        {lessons.map(lesson => (
                            <li key={lesson.id} className="py-3 flex justify-between items-center">
                                <div>
                                    <p className="font-medium text-gray-800">{lesson.topic}</p>
                                    <p className="text-sm text-gray-500">{formatDate(lesson.lesson_date)}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button onClick={() => handleToggleStatus(lesson)} className={`px-2 py-1 text-xs font-semibold rounded-full ${lesson.status === 'Complete' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {lesson.status}
                                    </button>
                                    <button onClick={() => handleEditLesson(lesson)} className="p-1.5 rounded-md hover:bg-gray-200">
                                        <Icon path={ICONS.EDIT} className="w-4 h-4 text-gray-600" />
                                    </button>
                                    <button onClick={() => handleDeleteLesson(lesson)} className="p-1.5 rounded-md hover:bg-gray-200">
                                        <Icon path={ICONS.DELETE} className="w-4 h-4 text-red-600" />
                                    </button>
                                </div>
                            </li>
                        ))}
                        {lessons.length === 0 && <p className="text-center text-gray-500 py-4">No lessons found for this student.</p>}
                    </ul>
                </div>
            )}
        </Modal>
        {isLessonFormModalOpen && <LessonFormModal isOpen={isLessonFormModalOpen} onClose={() => {
            setIsLessonFormModalOpen(false);
            setLessonToEdit(null);
            fetchLessonsForStudent(); // Refetch lessons after closing the form
        }} student={currentStudent} lessonToEdit={lessonToEdit} />}
        <ConfirmationModal 
            isOpen={isConfirmModalOpen}
            onClose={() => setIsConfirmModalOpen(false)}
            onConfirm={confirmDelete}
            title="Delete Lesson"
            message="Are you sure you want to delete this lesson? This action cannot be undone."
        />
        </>
    );
};

export default StudentDetailsModal;