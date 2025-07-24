import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Modal from './Modal';
import ConfirmationModal from './ConfirmationModal';
import AttendanceModal from './AttendanceModal';
import LessonFormModal from './LessonFormModal';
import CustomDatePicker from './CustomDatePicker';
import AddStudentToGroupModal from './AddStudentToGroupModal';
import StudentDetailsModal from './StudentDetailsModal';
import { FormSection } from './Form';
import { Icon, ICONS } from './Icons';
import { useAppContext } from '../contexts/AppContext';
import apiClient from '../apiClient';

import { formatDate } from '../utils/formatDate';

const GroupDetailsModal = ({ isOpen, onClose, group }) => {
    const { fetchData, students: allStudents } = useAppContext();
    const [students, setStudents] = useState([]);
    const [studentToRemove, setStudentToRemove] = useState(null);
    const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
    const [studentToView, setStudentToView] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [isLessonFormModalOpen, setIsLessonFormModalOpen] = useState(false);
    const [lessonToEdit, setLessonToEdit] = useState(null);
    const [lessonToDelete, setLessonToDelete] = useState(null);
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
    const [selectedLessonForAttendance, setSelectedLessonForAttendance] = useState(null);
    const [activeTab, setActiveTab] = useState('students');

    const fetchGroupDetails = async () => {
        if (!group?.id) return;

        // Fetch lessons
        try {
            const lessonsData = await apiClient.getAll('lessons');
            const groupLessons = lessonsData.filter(l => l.groupId === group.id);
            setLessons(groupLessons.sort((a, b) => new Date(b.lessonDate) - new Date(a.lessonDate)));
        } catch (error) {
            console.error('Error fetching lessons:', error);
        }

        // Fetch students
        try {
            const studentsData = await apiClient.getAll('students');
            const groupStudents = studentsData.filter(s => s.groupId === group.id);
            setStudents(groupStudents);
        } catch (error) {
            console.error('Error fetching students:', error);
        }
    };

    useEffect(() => {
        fetchGroupDetails();
    }, [group?.id, isOpen]); // Refetch when modal opens or group changes

    const openStudentDetailsModal = (student) => {
        setStudentToView(student);
    };

    const openRemoveConfirmation = (student) => {
        setStudentToRemove(student);
    };

    const handleRemoveStudent = async () => {
        if (!studentToRemove) return;
        try {
            await apiClient.update('students', studentToRemove.id, { groupId: null });
            setStudentToRemove(null);
            fetchData(); // Global refetch
            fetchGroupDetails(); // Local refetch
        } catch (error) {
            console.error("Error removing student from group: ", error);
        }
    };

    const openLessonFormModal = (lesson) => {
        setLessonToEdit(lesson);
        setIsLessonFormModalOpen(true);
    };

    const handleDeleteLesson = async (lessonToDelete) => {
        try {
            await apiClient.delete('lessons', lessonToDelete.id);
            fetchData();
            fetchGroupDetails();
        } catch (error) {
            console.error("Error deleting lesson: ", error);
        }
    };

    const openAttendanceModal = (lesson) => {
        setSelectedLessonForAttendance(lesson);
        setIsAttendanceModalOpen(true);
    };

    const handleModalClose = () => {
        setActiveTab('students'); // Reset to default tab on close
        onClose();
    };

    const modalTitle = (
        <div>
            <h3 className="text-xl font-bold">{group?.groupName}</h3>
            <p className="text-sm text-white/80">{students.length} Students</p>
        </div>
    );

    return (
        <>
            <Modal 
                isOpen={isOpen} 
                onClose={handleModalClose} 
                title={modalTitle} 
                headerStyle={{ backgroundColor: group?.color || '#3B82F6' }}
            >
                <div className="bg-gray-50 -mx-6 -mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-6 px-6" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('students')}
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'students' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                            >
                                Students
                            </button>
                            <button
                                onClick={() => setActiveTab('lessons')}
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'lessons' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                            >
                                Lessons
                            </button>
                        </nav>
                    </div>
                    <div className="p-6">
                        {activeTab === 'students' && (
                            <div className="space-y-4">
                                <button onClick={() => setIsAddStudentModalOpen(true)} className="w-full flex items-center justify-center px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors">
                                    <Icon path={ICONS.ADD} className="w-5 h-5 mr-2"/>Add Student to Group
                                </button>
                                {students.length > 0 ? (
                                    <ul className="space-y-3">
                                        {students.map(student => (
                                            <li key={student.id} className="p-3 bg-white rounded-lg shadow-sm flex items-center justify-between border border-gray-200 hover:border-blue-400 transition-all">
                                                <div>
                                                    <p className="font-semibold text-gray-800">{student.fullName}</p>
                                                    <p className="text-sm text-gray-500">{student.studentContact}</p>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <button onClick={() => openStudentDetailsModal(student)} className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100"><Icon path={ICONS.INFO} className="w-5 h-5" /></button>
                                                    <button onClick={() => openRemoveConfirmation(student)} className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100"><Icon path={ICONS.DELETE} className="w-5 h-5" /></button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-center text-gray-500 py-8">No students in this group yet.</p>
                                )}
                            </div>
                        )}
                        {activeTab === 'lessons' && (
                            <div className="space-y-4">
                                <button onClick={() => openLessonFormModal(null)} className="w-full flex items-center justify-center px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors">
                                    <Icon path={ICONS.ADD} className="w-5 h-5 mr-2"/>Log New Lesson
                                </button>
                                {lessons.length > 0 ? (
                                    <ul className="space-y-3">
                                        {lessons.map(lesson => (
                                            <li key={lesson.id} className="p-3 bg-white rounded-lg shadow-sm flex items-center justify-between border border-gray-200 hover:border-blue-400 transition-all">
                                                <div>
                                                    <p className="font-semibold text-gray-800">{lesson.topic}</p>
                                                    <p className="text-sm text-gray-500">{formatDate(lesson.lessonDate, 'long')}</p>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <button onClick={() => openAttendanceModal(lesson)} className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">Attendance</button>
                                                    <button onClick={() => openLessonFormModal(lesson)} className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100"><Icon path={ICONS.EDIT} className="w-5 h-5" /></button>
                                                    <button onClick={() => setLessonToDelete(lesson)} className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100"><Icon path={ICONS.DELETE} className="w-5 h-5" /></button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-center text-gray-500 py-8">No lessons logged for this group yet.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {studentToRemove && <ConfirmationModal isOpen={!!studentToRemove} onClose={() => setStudentToRemove(null)} onConfirm={handleRemoveStudent} title="Remove Student" message={`Are you sure you want to remove ${studentToRemove.fullName} from this group?`} />}
            {lessonToDelete && <ConfirmationModal isOpen={!!lessonToDelete} onClose={() => setLessonToDelete(null)} onConfirm={() => handleDeleteLesson(lessonToDelete)} title="Delete Lesson" message={`Are you sure you want to delete the lesson "${lessonToDelete.topic}"? This action cannot be undone.`} />}
            
            <AddStudentToGroupModal isOpen={isAddStudentModalOpen} onClose={() => setIsAddStudentModalOpen(false)} group={group} onStudentAdded={() => { fetchData(); fetchGroupDetails(); }} />
            {studentToView && <StudentDetailsModal isOpen={!!studentToView} onClose={() => setStudentToView(null)} student={studentToView} />}
            
            <LessonFormModal isOpen={isLessonFormModalOpen} onClose={() => setIsLessonFormModalOpen(false)} lessonToEdit={lessonToEdit} group={group} onLessonSaved={fetchGroupDetails} />
            {selectedLessonForAttendance && <AttendanceModal isOpen={isAttendanceModalOpen} onClose={() => setIsAttendanceModalOpen(false)} lesson={selectedLessonForAttendance} studentsInGroup={students} onAttendanceSaved={fetchGroupDetails} />}
        </>
    );
};

export default GroupDetailsModal;