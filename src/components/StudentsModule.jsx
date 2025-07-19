import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { useAppContext } from '../contexts/AppContext';
import { Icon, ICONS } from './Icons';
import StudentFormModal from './StudentFormModal';
import ConfirmationModal from './ConfirmationModal';
import StudentDetailsModal from './StudentDetailsModal';
import { formatDate } from '../utils/formatDate';

const StudentsModule = () => {
    const { db, userId, appId, students, groups } = useAppContext();
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('group');
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
    
    const openDeleteConfirmation = (student) => {
        setStudentToDelete(student);
        setIsConfirmModalOpen(true);
    };

    const handleDeleteStudent = async () => {
        if (!studentToDelete) return;
        try {
            const studentDocRef = doc(db, 'artifacts', appId, 'users', userId, 'students', studentToDelete.id);
            await deleteDoc(studentDocRef);
        } catch (error) {
            console.error("Error deleting student:", error);
        } finally {
            setIsConfirmModalOpen(false);
            setStudentToDelete(null);
        }
    };

    const openAddModal = () => { setStudentToEdit(null); setIsFormModalOpen(true); };
    const openEditModal = (student) => { setStudentToEdit(student); setIsFormModalOpen(true); };
    const openDetailsModal = (student) => { setStudentToView(student); setIsDetailsModalOpen(true); };
    const filteredStudents = students.filter(s => activeTab === 'group' ? !s.isTutoring : s.isTutoring);

    return (
        <div className="relative p-4 md:p-8 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Students</h2>
                <button onClick={openAddModal} className="flex items-center px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow"><Icon path={ICONS.ADD} className="mr-2"/>Add Student</button>
            </div>
            <div className="mb-4 border-b border-gray-200">
                <nav className="flex space-x-4" aria-label="Tabs">
                    <button onClick={() => setActiveTab('group')} className={`px-3 py-2 font-medium text-sm rounded-t-lg ${activeTab === 'group' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Group Students</button>
                    <button onClick={() => setActiveTab('tutoring')} className={`px-3 py-2 font-medium text-sm rounded-t-lg ${activeTab === 'tutoring' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Tutoring Students</button>
                </nav>
            </div>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Full Name</th>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Contact</th>
                                {activeTab === 'group' && <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Group</th>}
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Enrollment Date</th>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {isLoading ? (
                                <tr><td colSpan="4" className="p-4 text-center text-gray-500">Loading students...</td></tr>
                            ) : filteredStudents.length > 0 ? (
                                filteredStudents.map(student => (
                                    <tr key={student.id} className="hover:bg-gray-50">
                                        <td className="p-4 text-gray-800">{student.fullName}</td>
                                        <td className="p-4 text-gray-600">{student.studentContact}</td>
                                        {activeTab === 'group' && <td className="p-4 text-gray-600"><span className="px-2 py-1 rounded-full text-xs font-semibold" style={{backgroundColor: groups.find(g => g.id === student.groupId)?.color, color: 'white'}}>{groups.find(g => g.id === student.groupId)?.groupName || 'N/A'}</span></td>}
                                        <td className="p-4 text-gray-600">{formatDate(student.enrollmentDate)}</td>
                                        <td className="p-4">
                                            <div className="flex space-x-2">
                                                <button onClick={() => openDetailsModal(student)} className="p-2 text-gray-600 hover:text-blue-800 rounded-full hover:bg-gray-200"><Icon path={ICONS.INFO} className="w-5 h-5" /></button>
                                                <button onClick={() => openEditModal(student)} className="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-gray-200"><Icon path={ICONS.EDIT} className="w-5 h-5" /></button>
                                                <button onClick={() => openDeleteConfirmation(student)} className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-gray-200"><Icon path={ICONS.DELETE} className="w-5 h-5" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="4" className="p-4 text-center text-gray-500">No students found in this category.</td></tr>
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