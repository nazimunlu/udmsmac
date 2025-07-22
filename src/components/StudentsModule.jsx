import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '../apiClient';
import { useNotification } from '../contexts/NotificationContext';
import { Icon, ICONS } from './Icons';
import StudentFormModal from './StudentFormModal';
import ConfirmationModal from './ConfirmationModal';
import StudentDetailsModal from './StudentDetailsModal';
import { formatDate } from '../utils/formatDate';
import formatPhoneNumber from '../utils/formatPhoneNumber';
import { useAppContext } from '../contexts/AppContext';

const StudentsModule = () => {
    const { showNotification } = useNotification();
    const { students, archivedStudents, groups, fetchData, loading } = useAppContext();
    
    const [activeStudentType, setActiveStudentType] = useState('all'); // 'all', 'group', 'tutoring', 'archived'
    const [searchQuery, setSearchQuery] = useState('');
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [studentToEdit, setStudentToEdit] = useState(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [studentToView, setStudentToView] = useState(null);

    const groupStudents = useMemo(() => students.filter(s => !s.isTutoring), [students]);
    const tutoringStudents = useMemo(() => students.filter(s => s.isTutoring), [students]);

    const filteredStudents = useMemo(() => {
        let sourceStudents;
        switch (activeStudentType) {
            case 'group':
                sourceStudents = groupStudents;
                break;
            case 'tutoring':
                sourceStudents = tutoringStudents;
                break;
            case 'archived':
                sourceStudents = archivedStudents;
                break;
            default:
                sourceStudents = students;
        }

        let studentsToDisplay = sourceStudents;
        if (searchQuery) {
            studentsToDisplay = sourceStudents.filter(s =>
                s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.studentContact.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.parentContact?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        
        return [...studentsToDisplay].sort((a, b) => a.full_name.localeCompare(b.full_name));
    }, [students, archivedStudents, activeStudentType, searchQuery, groupStudents, tutoringStudents]);
    
    const openDeleteConfirmation = (student) => {
        setStudentToDelete(student);
        setIsConfirmModalOpen(true);
    };

    const handleDeleteStudent = async () => {
        if (!studentToDelete) return;
        try {
            if (activeStudentType === 'archived') {
                await apiClient.delete('students', studentToDelete.id);
                showNotification('Student permanently deleted!', 'success');
            } else {
                await apiClient.update('students', studentToDelete.id, { is_archived: true });
                showNotification('Student archived successfully!', 'success');
            }
            fetchData();
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
            await apiClient.update('students', student.id, { is_archived: false });
            showNotification('Student unarchived successfully!', 'success');
            fetchData();
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

            {loading ? (
                <p className="text-center text-gray-500">Loading students...</p>
            ) : filteredStudents.length > 0 ? (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Full Name</th>
                                    <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Contact</th>
                                    <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Group</th>
                                    <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Enrollment Date</th>
                                    <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredStudents.map(student => (
                                    <tr key={student.id} className="hover:bg-gray-50">
                                        <td className="p-4 text-gray-800">{student.full_name}</td>
                                        <td className="p-4 text-gray-600">{formatPhoneNumber(student.studentContact)}</td>
                                        <td className="p-4 text-gray-600">
                                            {student.isTutoring ? (
                                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-500 text-white">Tutoring</span>
                                            ) : student.groupId ? (
                                                <span className="px-2 py-1 rounded-full text-xs font-semibold" style={{backgroundColor: groups.find(g => g.id === student.groupId)?.color, color: 'white'}}>{groups.find(g => g.id === student.groupId)?.groupName || 'N/A'}</span>
                                            ) : (
                                                'N/A'
                                            )}
                                        </td>
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
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <p className="text-center text-gray-500 py-8">No students found matching your criteria.</p>
            )}
            <StudentFormModal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} studentToEdit={studentToEdit} />
            <ConfirmationModal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} onConfirm={handleDeleteStudent} title="Delete Student" message={`Are you sure you want to delete ${studentToDelete?.full_name}? This action cannot be undone.`} />
            {studentToView && <StudentDetailsModal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} student={studentToView} />}
        </div>
    );
};

export default StudentsModule;