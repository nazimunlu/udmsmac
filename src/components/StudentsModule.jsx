import React, { useState, useEffect } from 'react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';
import { useAppContext } from '../contexts/AppContext';
import { Icon, ICONS } from './Icons';
import StudentFormModal from './StudentFormModal';
import ConfirmationModal from './ConfirmationModal';
import StudentDetailsModal from './StudentDetailsModal';
import { formatDate } from '../utils/formatDate';

const StudentTypeCard = ({ title, count, icon, onClick }) => (
    <div onClick={onClick} className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center justify-center cursor-pointer transform transition duration-300 hover:scale-105">
        <div className="bg-gray-100 text-blue-600 rounded-full p-3 mb-4 flex items-center justify-center">
            <Icon path={icon} className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
        <p className="text-gray-500 text-sm">{count} Students</p>
    </div>
);

const StudentsModule = () => {
    const { db, userId, appId, students, groups } = useAppContext();
    const { showNotification } = useNotification();
    const [isLoading, setIsLoading] = useState(true);
    const [activeStudentType, setActiveStudentType] = useState('group'); // 'group', 'tutoring', 'archived'
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [studentToEdit, setStudentToEdit] = useState(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [studentToView, setStudentToView] = useState(null);

    useEffect(() => {
        if (students) {
            setIsLoading(false);
        }
    }, [students]);

    const groupStudents = students.filter(s => !s.isTutoring && !s.isArchived);
    const tutoringStudents = students.filter(s => s.isTutoring && !s.isArchived);
    const archivedStudents = students.filter(s => s.isArchived);

    const displayedStudents = activeStudentType === 'group'
        ? groupStudents
        : activeStudentType === 'tutoring'
            ? tutoringStudents
            : archivedStudents;
    
    const openDeleteConfirmation = (student) => {
        setStudentToDelete(student);
        setIsConfirmModalOpen(true);
    };

    const handleDeleteStudent = async () => {
        if (!studentToDelete) return;
        console.log("Attempting to delete/archive student:", studentToDelete.id, "Active student type:", activeStudentType);
        try {
            const studentDocRef = doc(db, 'artifacts', appId, 'users', userId, 'students', studentToDelete.id);
            if (activeStudentType === 'archived') {
                await deleteDoc(studentDocRef); // Permanently delete if from archived
                showNotification('Student permanently deleted!', 'success');
            } else {
                await updateDoc(studentDocRef, { isArchived: true }); // Archive if from active lists
                showNotification('Student archived successfully!', 'success');
            }
        } catch (error) {
            console.error("Error deleting/archiving student:", error);
            showNotification('Error processing student deletion/archiving.', 'error');
        } finally {
            setIsConfirmModalOpen(false);
            setStudentToDelete(null);
        }
    };

    const handleUnarchiveStudent = async (student) => {
        try {
            const studentDocRef = doc(db, 'artifacts', appId, 'users', userId, 'students', student.id);
            await updateDoc(studentDocRef, { isArchived: false });
            showNotification('Student unarchived successfully!', 'success');
        } catch (error) {
            console.error("Error unarchiving student:", error);
            showNotification('Error unarchiving student.', 'error');
        }
    };

    const openAddModal = () => { setStudentToEdit(null); setIsFormModalOpen(true); };
    const openEditModal = (student) => { setStudentToEdit(student); setIsFormModalOpen(true); };
    const openDetailsModal = (student) => { setStudentToView(student); setIsDetailsModalOpen(true); };

    return (
        <div className="relative p-4 md:p-8 bg-gray-50 rounded-lg shadow-lg">
            <div className="flex justify-between items-center pb-4 mb-6 border-b border-gray-200">
                <h2 className="text-3xl font-bold text-gray-800 flex items-center"><Icon path={ICONS.STUDENTS} className="w-8 h-8 mr-3"/>Students</h2>
                <button onClick={openAddModal} className="flex items-center px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow"><Icon path={ICONS.ADD} className="mr-2"/>Add Student</button>
            </div>

            {/* Student Type Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StudentTypeCard
                    title="Group Students"
                    count={groupStudents.length}
                    icon={ICONS.GROUPS}
                    onClick={() => setActiveStudentType('group')}
                />
                <StudentTypeCard
                    title="Tutoring Students"
                    count={tutoringStudents.length}
                    icon={ICONS.LESSON}
                    onClick={() => setActiveStudentType('tutoring')}
                />
                <StudentTypeCard
                    title="Archived Students"
                    count={archivedStudents.length}
                    icon={ICONS.ARCHIVE}
                    onClick={() => setActiveStudentType('archived')}
                />
            </div>

            {/* Student Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
                    <div className="bg-blue-100 text-blue-600 rounded-full p-3 mr-4 flex items-center justify-center"><Icon path={ICONS.STUDENTS} className="w-6 h-6" /></div>
                    <div>
                        <h3 className="text-gray-500 text-sm font-medium">Total Students</h3>
                        <p className="text-3xl font-bold text-gray-800">{students.length}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
                    <div className="bg-green-100 text-green-600 rounded-full p-3 mr-4 flex items-center justify-center"><Icon path={ICONS.GROUPS} className="w-6 h-6" /></div>
                    <div>
                        <h3 className="text-gray-500 text-sm font-medium">Group Students</h3>
                        <p className="text-3xl font-bold text-gray-800">{groupStudents.length}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
                    <div className="bg-yellow-100 text-yellow-600 rounded-full p-3 mr-4 flex items-center justify-center"><Icon path={ICONS.LESSON} className="w-6 h-6" /></div>
                    <div>
                        <h3 className="text-gray-500 text-sm font-medium">Tutoring Students</h3>
                        <p className="text-3xl font-bold text-gray-800">{tutoringStudents.length}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
                    <div className="bg-red-100 text-red-600 rounded-full p-3 mr-4 flex items-center justify-center"><Icon path={ICONS.ARCHIVE} className="w-6 h-6" /></div>
                    <div>
                        <h3 className="text-gray-500 text-sm font-medium">Archived Students</h3>
                        <p className="text-3xl font-bold text-gray-800">{archivedStudents.length}</p>
                    </div>
                </div>
            </div>

            {/* Student List */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Full Name</th>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Contact</th>
                                {activeStudentType === 'group' && <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Group</th>}
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Enrollment Date</th>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {isLoading ? (
                                <tr><td colSpan="5" className="p-4 text-center text-gray-500">Loading students...</td></tr>
                            ) : displayedStudents.length > 0 ? (
                                displayedStudents.map(student => (
                                    <tr key={student.id} className="hover:bg-gray-50">
                                        <td className="p-4 text-gray-800">{student.fullName}</td>
                                        <td className="p-4 text-gray-600">{student.studentContact}</td>
                                        {activeStudentType === 'group' && <td className="p-4 text-gray-600"><span className="px-2 py-1 rounded-full text-xs font-semibold" style={{backgroundColor: groups.find(g => g.id === student.groupId)?.color, color: 'white'}}>{groups.find(g => g.id === student.groupId)?.groupName || 'N/A'}</span></td>}
                                        <td className="p-4 text-gray-600">{formatDate(student.enrollmentDate)}</td>
                                        <td className="p-4">
                                            <div className="flex space-x-2">
                                                <button onClick={() => openDetailsModal(student)} className="p-2 text-gray-600 hover:text-blue-800 rounded-full hover:bg-gray-200"><Icon path={ICONS.INFO} className="w-5 h-5" /></button>
                                                <button onClick={() => openEditModal(student)} className="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-gray-200"><Icon path={ICONS.EDIT} className="w-5 h-5" /></button>
                                                <button onClick={() => openDeleteConfirmation(student)} className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-gray-200"><Icon path={ICONS.DELETE} className="w-5 h-5" /></button>
                                                {activeStudentType === 'archived' && (
                                                    <button onClick={() => handleUnarchiveStudent(student)} className="p-2 text-green-600 hover:text-green-800 rounded-full hover:bg-gray-200"><Icon path={ICONS.UPLOAD} className="w-5 h-5" /></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="5" className="p-4 text-center text-gray-500">No students found in this category.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <StudentFormModal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} studentToEdit={studentToEdit} />
            <ConfirmationModal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} onConfirm={handleDeleteStudent} title="Delete Student" message={`Are you sure you want to delete ${studentToDelete?.fullName}? This action cannot be undone.`} />
            {studentToView && <StudentDetailsModal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} student={studentToView} />}
        </div>
    );
};

export default StudentsModule;