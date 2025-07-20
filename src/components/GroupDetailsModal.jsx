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

import { formatDate } from '../utils/formatDate';

const GroupDetailsModal = ({ isOpen, onClose, group }) => {
    const { fetchData } = useAppContext();
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

    useEffect(() => {
        if (!group?.id) return;

        const fetchLessons = async () => {
            const { data, error } = await supabase.from('lessons').select('*').eq('groupId', group.id);
            if (error) console.error('Error fetching lessons:', error);
            else {
                data.sort((a,b) => new Date(a.lessonDate) - new Date(b.lessonDate));
                setLessons(data.map(l => ({
                    ...l,
                    attendance: l.attendance ? JSON.parse(l.attendance) : {},
                })) || []);
            }
        };

        const fetchStudents = async () => {
            const { data, error } = await supabase.from('students').select('*').eq('groupId', group.id);
            if (error) console.error('Error fetching students:', error);
            else setStudents(data.map(s => ({
                ...s,
                installments: s.installments ? JSON.parse(s.installments) : [],
                feeDetails: s.feeDetails ? JSON.parse(s.feeDetails) : {},
                tutoringDetails: s.tutoringDetails ? JSON.parse(s.tutoringDetails) : {},
                documents: s.documents ? JSON.parse(s.documents) : {},
                documentNames: s.documentNames ? JSON.parse(s.documentNames) : {},
            })) || []);
        };

        fetchLessons();
        fetchStudents();
    }, [group.id]);

    const openStudentDetailsModal = (student) => {
        setStudentToView(student);
    };

    const openRemoveConfirmation = (student) => {
        setStudentToRemove(student);
    };

    const handleRemoveStudent = async () => {
        if (!studentToRemove) return;
        try {
            const { error } = await supabase.from('students').update({ groupId: null }).match({ id: studentToRemove.id });
            if (error) throw error;
            setStudentToRemove(null);
            fetchData();
        } catch (error) {
            console.error("Error removing student from group: ", error);
        }
    };

    const openLessonFormModal = (lesson) => {
        setLessonToEdit(lesson);
        setIsLessonFormModalOpen(true);
    };

    const handleDeleteLesson = async () => {
        if (!lessonToDelete) return;
        try {
            const { error } = await supabase.from('lessons').delete().match({ id: lessonToDelete.id });
            if (error) throw error;
            setLessonToDelete(null);
            fetchData();
        } catch (error) {
            console.error("Error deleting lesson: ", error);
        }
    };

    const openAttendanceModal = (lesson) => {
        setSelectedLessonForAttendance(lesson);
        setIsAttendanceModalOpen(true);
    };

    const modalTitle = (
        <div>
            <h3 className="text-xl font-bold">{group?.groupName}</h3>
            <p className="text-sm text-white/80">Group Details</p>
        </div>
    );

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
                <div className="space-y-6">
                     <FormSection title="Lessons Log" titleRightContent={
                        <button onClick={() => openLessonFormModal(null)} className="flex items-center px-3 py-1.5 rounded-md text-white bg-blue-600 hover:bg-blue-700 text-sm shadow-sm">
                            <Icon path={ICONS.ADD} className="w-4 h-4 mr-2"/>Log Lesson
                        </button>
                    }>
                        <div className="sm:col-span-6">
                             {lessons.length > 0 ? (
                                <ul className="divide-y divide-gray-200">
                                    {lessons.map(lesson => (
                                        <li key={lesson.id} className="py-3 flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-800">{lesson.topic}</p>
                                                <p className="text-sm text-gray-500">{formatDate(lesson.lessonDate)}</p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <button onClick={() => openAttendanceModal(lesson)} className="text-sm text-gray-500 hover:text-gray-700">Attendance</button>
                                                <button onClick={() => openLessonFormModal(lesson)} className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-200"><Icon path={ICONS.EDIT} className="w-4 h-4" /></button>
                                                <button onClick={() => setLessonToDelete(lesson)} className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-200"><Icon path={ICONS.DELETE} className="w-4 h-4" /></button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                             ) : (
                                <p className="text-center text-gray-500 py-4">No lessons scheduled for this group yet.</p>
                             )}
                        </div>
                    </FormSection>
                    <FormSection title="Students in this Group">
                        <div className="sm:col-span-6">
                            <button onClick={() => setIsAddStudentModalOpen(true)} className="mb-4 w-full flex items-center justify-center px-4 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700"><Icon path={ICONS.ADD} className="w-5 h-5 mr-2"/>Add Student</button>
                            {students.length > 0 ? (
                                <ul className="divide-y divide-gray-200">
                                    {students.map(student => (
                                        <li key={student.id} className="py-3 flex items-center justify-between">
                                            <span className="text-gray-800">{student.fullName}</span>
                                            <div className="flex items-center space-x-2">
                                                <button onClick={() => openStudentDetailsModal(student)} className="text-sm text-blue-600 hover:text-blue-800 py-1">Details</button>
                                                <button onClick={() => openRemoveConfirmation(student)} className="text-sm text-red-600 hover:text-red-800 py-1">Remove</button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500">No students assigned to this group yet.</p>
                            )}
                        </div>
                    </FormSection>
                </div>
                {studentToRemove && (
                    <ConfirmationModal
                        isOpen={!!studentToRemove}
                        onClose={() => setStudentToRemove(null)}
                        onConfirm={handleRemoveStudent}
                        title="Remove Student"
                        message={`Are you sure you want to remove ${studentToRemove.fullName} from this group?`}
                    />
                )}
                {lessonToDelete && (
                     <ConfirmationModal
                        isOpen={!!lessonToDelete}
                        onClose={() => setLessonToDelete(null)}
                        onConfirm={handleDeleteLesson}
                        title="Delete Lesson"
                        message={`Are you sure you want to delete the lesson "${lessonToDelete.topic}"?`}
                    />
                )}
                {selectedLessonForAttendance && (
                    <AttendanceModal
                        isOpen={isAttendanceModalOpen}
                        onClose={() => setIsAttendanceModalOpen(false)}
                        lesson={selectedLessonForAttendance}
                        studentsInGroup={students}
                    />
                )}
                <LessonFormModal isOpen={isLessonFormModalOpen} onClose={() => setIsLessonFormModalOpen(false)} group={group} lessonToEdit={lessonToEdit} students={students} />
                <AddStudentToGroupModal
                    isOpen={isAddStudentModalOpen}
                    onClose={() => setIsAddStudentModalOpen(false)}
                    group={group}
                    currentStudents={students}
                />
            </Modal>
            {studentToView && (
                <StudentDetailsModal
                    isOpen={!!studentToView}
                    onClose={() => setStudentToView(null)}
                    student={studentToView}
                />
            )}
        </>
    );
};

export default GroupDetailsModal;