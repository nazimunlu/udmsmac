import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import Modal from './Modal';
import { Icon, ICONS } from './Icons';
import StudentFormModal from './StudentFormModal';
import { useAppContext } from '../contexts/AppContext';

const AddStudentToGroupModal = ({ isOpen, onClose, group, currentStudents, onStudentAdded }) => {
    const { fetchData } = useAppContext();
    const [allStudents, setAllStudents] = useState([]);
    const [unassignedStudents, setUnassignedStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isStudentFormModalOpen, setIsStudentFormModalOpen] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState(new Set());

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const studentsData = await apiClient.getAll('students');
                setAllStudents(studentsData.map(s => ({
                    ...s,
                    installments: typeof s.installments === 'string' ? JSON.parse(s.installments) : (s.installments || []),
                    feeDetails: typeof s.feeDetails === 'string' ? JSON.parse(s.feeDetails) : (s.feeDetails || {}),
                    tutoringDetails: typeof s.tutoringDetails === 'string' ? JSON.parse(s.tutoringDetails) : (s.tutoringDetails || {}),
                    documents: typeof s.documents === 'string' ? JSON.parse(s.documents) : (s.documents || {}),
                    documentNames: typeof s.documentNames === 'string' ? JSON.parse(s.documentNames) : (s.documentNames || {}),
                })));
            } catch (error) {
                console.error('Error fetching students:', error);
            }
        };

        if (isOpen) {
            fetchStudents();
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            const filtered = allStudents.filter(s => 
                !s.groupId && 
                !s.isTutoring && 
                s.fullName.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setUnassignedStudents(filtered);
        }
    }, [isOpen, allStudents, searchTerm]);

    const handleAddStudent = async (studentId) => {
        setIsSubmitting(true);
        try {
            await apiClient.update('students', studentId, { groupId: group.id });
            await fetchData(); // Ensure data is refreshed
            setSearchTerm(''); // Clear search after adding
            onClose();
            if (onStudentAdded) {
                onStudentAdded(); // Call the prop after successful addition
            }
        } catch (error) {
            console.error("Error adding student to group: ", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Multi-select functionality
    const handleSelectAll = () => {
        if (selectedStudents.size === unassignedStudents.length) {
            setSelectedStudents(new Set());
        } else {
            setSelectedStudents(new Set(unassignedStudents.map(s => s.id)));
        }
    };

    const handleSelectStudent = (studentId) => {
        const newSelected = new Set(selectedStudents);
        if (newSelected.has(studentId)) {
            newSelected.delete(studentId);
        } else {
            newSelected.add(studentId);
        }
        setSelectedStudents(newSelected);
    };

    const handleAddSelectedStudents = async () => {
        if (selectedStudents.size === 0) {
            return;
        }

        setIsSubmitting(true);
        try {
            const promises = Array.from(selectedStudents).map(studentId =>
                apiClient.update('students', studentId, { groupId: group.id })
            );
            await Promise.all(promises);
            await fetchData(); // Ensure data is refreshed
            setSelectedStudents(new Set());
            setSearchTerm('');
            onClose();
            if (onStudentAdded) {
                onStudentAdded(); // Call the prop after successful addition
            }
        } catch (error) {
            console.error("Error adding students to group: ", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Add Students to ${group?.groupName}`}>
            <div className="p-4 space-y-6">
                {/* Search Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                        <Icon path={ICONS.SEARCH} className="w-5 h-5 mr-2 text-blue-600" />
                        Find Existing Students
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">Search and add unassigned students to this group</p>
                    <input
                        type="text"
                        placeholder="Search for a student by name..."
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                {/* Bulk Actions */}
                {selectedStudents.size > 0 && (
                    <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Icon path={ICONS.USERS} className="w-5 h-5 text-blue-600" />
                                <span className="text-blue-800 font-semibold">
                                    {selectedStudents.size} student{selectedStudents.size !== 1 ? 's' : ''} selected
                                </span>
                            </div>
                            <button
                                onClick={handleAddSelectedStudents}
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center">
                                        <Icon path={ICONS.LOADING} className="w-4 h-4 mr-2 animate-spin" />
                                        Adding...
                                    </span>
                                ) : (
                                    <span className="flex items-center">
                                        <Icon path={ICONS.ADD} className="w-4 h-4 mr-2" />
                                        Add {selectedStudents.size} Student{selectedStudents.size !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Student List */}
                <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                            <Icon path={ICONS.USERS} className="w-5 h-5 mr-2 text-gray-600" />
                            Available Students ({unassignedStudents.length})
                        </h3>
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto">
                        {unassignedStudents.length > 0 ? (
                            <>
                                {/* Select All Row */}
                                <div className="flex items-center p-3 border-b border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={selectedStudents.size === unassignedStudents.length && unassignedStudents.length > 0}
                                        onChange={handleSelectAll}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Select All Students</span>
                                </div>
                                
                                {/* Student List */}
                                {unassignedStudents.map(student => (
                                    <div key={student.id} className="flex items-center p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={selectedStudents.has(student.id)}
                                            onChange={() => handleSelectStudent(student.id)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3">
                                                <div 
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                                                    style={{ backgroundColor: student.color || '#3B82F6' }}
                                                >
                                                    {student.fullName?.charAt(0)?.toUpperCase() || 'S'}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800">{student.fullName}</p>
                                                    <p className="text-sm text-gray-500">{student.studentContact}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleAddStudent(student.id)}
                                            disabled={isSubmitting}
                                            className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 text-sm font-medium transition-colors"
                                        >
                                            {isSubmitting ? 'Adding...' : 'Add'}
                                        </button>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <div className="p-8 text-center">
                                <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                                    <Icon path={ICONS.USERS} className="w-6 h-6 text-gray-400" />
                                </div>
                                <p className="text-gray-500 font-medium">No unassigned students found</p>
                                <p className="text-sm text-gray-400 mt-1">All students are already assigned to groups</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Create New Student Section */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <Icon path={ICONS.ADD} className="w-5 h-5 text-green-600" />
                            </div>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">Create New Student</h3>
                            <p className="text-sm text-gray-600 mb-3">Enroll a completely new student and add them to this group</p>
                            <button
                                onClick={() => setIsStudentFormModalOpen(true)}
                                className="inline-flex items-center px-4 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700 shadow-sm transition-colors font-medium"
                            >
                                <Icon path={ICONS.ADD} className="w-5 h-5 mr-2"/>
                                Enroll New Student
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            {isStudentFormModalOpen && (
                <StudentFormModal
                    isOpen={isStudentFormModalOpen}
                    onClose={() => setIsStudentFormModalOpen(false)}
                />
            )}
        </Modal>
    );
};

export default AddStudentToGroupModal;