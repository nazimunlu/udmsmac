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
        <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
                <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: group?.color || '#3B82F6' }}
                >
                    <Icon path={ICONS.GROUPS} className="w-6 h-6" />
                </div>
            </div>
            <div>
                <h3 className="text-2xl font-bold text-white">{group?.groupName}</h3>
                <div className="flex items-center space-x-4 text-white/90 text-sm">
                    <span className="flex items-center">
                        <Icon path={ICONS.USERS} className="w-4 h-4 mr-1" />
                        {students.length} Student{students.length !== 1 ? 's' : ''}
                    </span>
                    {group?.schedule && (
                        <span className="flex items-center">
                            <Icon path={ICONS.CALENDAR} className="w-4 h-4 mr-1" />
                            {group.schedule.days?.join(', ')} • {group.schedule.startTime} - {group.schedule.endTime}
                        </span>
                    )}
                </div>
            </div>
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
                <div className="bg-white">
                    {/* Enhanced Tab Navigation */}
                    <div className="border-b border-gray-200 bg-gray-50">
                        <nav className="flex space-x-8 px-6" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('students')}
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === 'students' 
                                        ? 'border-blue-500 text-blue-600' 
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center space-x-2">
                                    <Icon path={ICONS.USERS} className="w-4 h-4" />
                                    <span>Students ({students.length})</span>
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveTab('lessons')}
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === 'lessons' 
                                        ? 'border-blue-500 text-blue-600' 
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center space-x-2">
                                    <Icon path={ICONS.CALENDAR_CHECK} className="w-4 h-4" />
                                    <span>Lessons ({lessons.length})</span>
                                </div>
                            </button>
                        </nav>
                    </div>

                    <div className="p-6">
                        {activeTab === 'students' && (
                            <div className="space-y-6">
                                {/* Enhanced Add Student Button */}
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-lg font-semibold text-gray-800 mb-1">Add Students</h4>
                                            <p className="text-sm text-gray-600">Add new students to this group or create new ones</p>
                                        </div>
                                        <button 
                                            onClick={() => setIsAddStudentModalOpen(true)} 
                                            className="flex items-center px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all duration-200 hover:shadow-md"
                                        >
                                            <Icon path={ICONS.ADD} className="w-5 h-5 mr-2"/>
                                            Add Student
                                        </button>
                                    </div>
                                </div>

                                {/* Enhanced Student List */}
                                {students.length > 0 ? (
                                    <div className="space-y-3">
                                        <h4 className="text-lg font-semibold text-gray-800 mb-4">Group Members</h4>
                                        <div className="grid gap-3">
                                            {students.map(student => (
                                                <div key={student.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all duration-200">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-3">
                                                            <div 
                                                                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                                                                style={{ backgroundColor: student.color || '#3B82F6' }}
                                                            >
                                                                {student.fullName?.charAt(0)?.toUpperCase() || 'S'}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-gray-800 text-base">{student.fullName}</p>
                                                                <div className="flex items-center space-x-4 text-sm text-gray-500">
                                                                    <span className="flex items-center">
                                                                        <Icon path={ICONS.PHONE} className="w-3 h-3 mr-1" />
                                                                        {student.studentContact}
                                                                    </span>
                                                                    {student.nationalId && (
                                                                        <span className="flex items-center">
                                                                            <Icon path={ICONS.ID_CARD} className="w-3 h-3 mr-1" />
                                                                            {student.nationalId}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <button 
                                                                onClick={() => openStudentDetailsModal(student)} 
                                                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                                                                title="View Details"
                                                            >
                                                                <Icon path={ICONS.EYE} className="w-5 h-5" />
                                                            </button>
                                                            <button 
                                                                onClick={() => openRemoveConfirmation(student)} 
                                                                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Remove from Group"
                                                            >
                                                                <Icon path={ICONS.USER_MINUS} className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                                            <Icon path={ICONS.USERS} className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <h4 className="text-lg font-semibold text-gray-800 mb-2">No Students Yet</h4>
                                        <p className="text-gray-500 mb-4">This group doesn't have any students yet. Add some students to get started!</p>
                                        <button 
                                            onClick={() => setIsAddStudentModalOpen(true)} 
                                            className="inline-flex items-center px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
                                        >
                                            <Icon path={ICONS.ADD} className="w-5 h-5 mr-2"/>
                                            Add First Student
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'lessons' && (
                            <div className="space-y-6">
                                {/* Enhanced Add Lesson Button */}
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-lg font-semibold text-gray-800 mb-1">Manage Lessons</h4>
                                            <p className="text-sm text-gray-600">Log new lessons or manage existing ones</p>
                                        </div>
                                        <button 
                                            onClick={() => openLessonFormModal(null)} 
                                            className="flex items-center px-4 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700 shadow-sm transition-all duration-200 hover:shadow-md"
                                        >
                                            <Icon path={ICONS.ADD} className="w-5 h-5 mr-2"/>
                                            Log New Lesson
                                        </button>
                                    </div>
                                </div>

                                {/* Enhanced Lesson List */}
                                {lessons.length > 0 ? (
                                    <div className="space-y-3">
                                        <h4 className="text-lg font-semibold text-gray-800 mb-4">Recent Lessons</h4>
                                        <div className="grid gap-3">
                                            {lessons.map(lesson => (
                                                <div key={lesson.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-green-300 hover:shadow-sm transition-all duration-200">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-3">
                                                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                                                <Icon path={ICONS.CALENDAR_CHECK} className="w-5 h-5 text-green-600" />
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-gray-800 text-base">{lesson.topic}</p>
                                                                <div className="flex items-center space-x-4 text-sm text-gray-500">
                                                                    <span className="flex items-center">
                                                                        <Icon path={ICONS.CALENDAR} className="w-3 h-3 mr-1" />
                                                                        {formatDate(lesson.lessonDate, 'long')}
                                                                    </span>
                                                                    {lesson.startTime && lesson.endTime && (
                                                                        <span className="flex items-center">
                                                                            <Icon path={ICONS.CLOCK} className="w-3 h-3 mr-1" />
                                                                            {lesson.startTime} - {lesson.endTime}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <button 
                                                                onClick={() => openAttendanceModal(lesson)} 
                                                                className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                                                            >
                                                                Attendance
                                                            </button>
                                                            <button 
                                                                onClick={() => openLessonFormModal(lesson)} 
                                                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                                                                title="Edit Lesson"
                                                            >
                                                                <Icon path={ICONS.EDIT} className="w-5 h-5" />
                                                            </button>
                                                            <button 
                                                                onClick={() => setLessonToDelete(lesson)} 
                                                                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Delete Lesson"
                                                            >
                                                                <Icon path={ICONS.TRASH} className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                                            <Icon path={ICONS.CALENDAR_CHECK} className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <h4 className="text-lg font-semibold text-gray-800 mb-2">No Lessons Yet</h4>
                                        <p className="text-gray-500 mb-4">This group doesn't have any lessons logged yet. Start by logging your first lesson!</p>
                                        <button 
                                            onClick={() => openLessonFormModal(null)} 
                                            className="inline-flex items-center px-4 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700 shadow-sm transition-colors"
                                        >
                                            <Icon path={ICONS.ADD} className="w-5 h-5 mr-2"/>
                                            Log First Lesson
                                        </button>
                                    </div>
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