import React, { useState, useEffect } from 'react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';
import { useAppContext } from '../contexts/AppContext';
import { Icon, ICONS } from './Icons';
import StudentFormModal from './StudentFormModal';
import ConfirmationModal from './ConfirmationModal';
import StudentDetailsModal from './StudentDetailsModal';
import StudentCard from './StudentCard';
import { formatDate } from '../utils/formatDate';

const StudentsModule = () => {
    const { db, userId, appId, students, groups } = useAppContext();
    const { showNotification } = useNotification();
    const [isLoading, setIsLoading] = useState(true);
    const [activeStudentType, setActiveStudentType] = useState('all'); // 'all', 'group', 'tutoring', 'archived'
    const [searchQuery, setSearchQuery] = useState('');
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

    const filteredStudents = useMemo(() => {
        let filtered = students;
        if (activeStudentType === 'group') {
            filtered = filtered.filter(s => !s.isTutoring && !s.isArchived);
        } else if (activeStudentType === 'tutoring') {
            filtered = filtered.filter(s => s.isTutoring && !s.isArchived);
        } else if (activeStudentType === 'archived') {
            filtered = filtered.filter(s => s.isArchived);
        }

        if (searchQuery) {
            filtered = filtered.filter(s =>
                s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.studentContact.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.parentContact?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        return filtered;
    }, [students, activeStudentType, searchQuery]);
    
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

            <div className="mb-6 flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
                <input
                    type="text"
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex space-x-2">
                    <button
                        onClick={() => setActiveStudentType('all')}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${activeStudentType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >All ({students.length})</button>
                    <button
                        onClick={() => setActiveStudentType('group')}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${activeStudentType === 'group' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >Group ({groupStudents.length})</button>
                    <button
                        onClick={() => setActiveStudentType('tutoring')}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${activeStudentType === 'tutoring' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >Tutoring ({tutoringStudents.length})</button>
                    <button
                        onClick={() => setActiveStudentType('archived')}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${activeStudentType === 'archived' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >Archived ({archivedStudents.length})</button>
                </div>
            </div>

            {isLoading ? (
                <p className="text-center text-gray-500">Loading students...</p>
            ) : filteredStudents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredStudents.map(student => (
                        <StudentCard
                            key={student.id}
                            student={student}
                            groups={groups}
                            openEditModal={openEditModal}
                            openDeleteConfirmation={openDeleteConfirmation}
                            openDetailsModal={openDetailsModal}
                        />
                    ))}
                </div>
            ) : (
                <p className="text-center text-gray-500 py-8">No students found matching your criteria.</p>
            )}
            <StudentFormModal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} studentToEdit={studentToEdit} />
            <ConfirmationModal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} onConfirm={handleDeleteStudent} title="Delete Student" message={`Are you sure you want to delete ${studentToDelete?.fullName}? This action cannot be undone.`} />
            {studentToView && <StudentDetailsModal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} student={studentToView} />}
        </div>
    );
};

export default StudentsModule;