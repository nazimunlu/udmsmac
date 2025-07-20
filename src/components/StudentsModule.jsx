import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useNotification } from '../contexts/NotificationContext';
import { Icon, ICONS } from './Icons';
import StudentFormModal from './StudentFormModal';
import ConfirmationModal from './ConfirmationModal';
import StudentDetailsModal from './StudentDetailsModal';
import { formatDate } from '../utils/formatDate';
import formatPhoneNumber from '../utils/formatPhoneNumber';

const StudentsModule = () => {
    const { showNotification } = useNotification();
    const [students, setStudents] = useState([]);
    const [groups, setGroups] = useState([]);
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
        const fetchStudents = async () => {
            const { data, error } = await supabase.from('students').select('*');
            if (error) {
                console.error('Error fetching students:', error);
            } else {
                setStudents(data.map(s => ({
                    ...s,
                    installments: s.installments ? JSON.parse(s.installments) : [],
                    feeDetails: s.feeDetails ? JSON.parse(s.feeDetails) : {},
                    tutoringDetails: s.tutoringDetails ? JSON.parse(s.tutoringDetails) : {},
                    documents: s.documents ? JSON.parse(s.documents) : {},
                    documentNames: s.documentNames ? JSON.parse(s.documentNames) : {},
                })));
            }
            setIsLoading(false);
        };

        const fetchGroups = async () => {
            const { data, error } = await supabase.from('groups').select('*');
            if (error) {
                console.error('Error fetching groups:', error);
            } else {
                setGroups(data.map(g => ({
                    ...g,
                    schedule: g.schedule ? JSON.parse(g.schedule) : {},
                })));
            }
        };

        fetchStudents();
        fetchGroups();
    }, []);

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
        try {
            if (activeStudentType === 'archived') {
                const { error } = await supabase.from('students').delete().match({ id: studentToDelete.id });
                if (error) throw error;
                showNotification('Student permanently deleted!', 'success');
            } else {
                const { error } = await supabase.from('students').update({ isArchived: true }).match({ id: studentToDelete.id });
                if (error) throw error;
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
            const { error } = await supabase.from('students').update({ isArchived: false }).match({ id: student.id });
            if (error) throw error;
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
                                        <td className="p-4 text-gray-800">{student.fullName}</td>
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
            <ConfirmationModal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} onConfirm={handleDeleteStudent} title="Delete Student" message={`Are you sure you want to delete ${studentToDelete?.fullName}? This action cannot be undone.`} />
            {studentToView && <StudentDetailsModal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} student={studentToView} />}
        </div>
    );
};

export default StudentsModule;