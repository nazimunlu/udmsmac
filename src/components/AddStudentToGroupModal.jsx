import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Modal from './Modal';
import { Icon, ICONS } from './Icons';
import StudentFormModal from './StudentFormModal';

const AddStudentToGroupModal = ({ isOpen, onClose, group, currentStudents }) => {
    const [allStudents, setAllStudents] = useState([]);
    const [unassignedStudents, setUnassignedStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isStudentFormModalOpen, setIsStudentFormModalOpen] = useState(false);

    useEffect(() => {
        const fetchStudents = async () => {
            const { data, error } = await supabase.from('students').select('*');
            if (error) {
                console.error('Error fetching students:', error);
            } else {
                setAllStudents(data.map(s => ({
                    ...s,
                    installments: s.installments ? JSON.parse(s.installments) : [],
                    feeDetails: s.feeDetails ? JSON.parse(s.feeDetails) : {},
                    tutoringDetails: s.tutoringDetails ? JSON.parse(s.tutoringDetails) : {},
                    documents: s.documents ? JSON.parse(s.documents) : {},
                    documentNames: s.documentNames ? JSON.parse(s.documentNames) : {},
                })));
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
            const { error } = await supabase.from('students').update({ groupId: group.id }).match({ id: studentId });
            if (error) throw error;
            setSearchTerm(''); // Clear search after adding
            onClose();
        } catch (error) {
            console.error("Error adding student to group: ", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Add Student to ${group?.groupName}`}>
            <div className="p-4">
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Search for a student..."
                        className="w-full p-2 border border-gray-300 rounded-md"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="max-h-60 overflow-y-auto">
                    {unassignedStudents.length > 0 ? (
                        unassignedStudents.map(student => (
                            <div key={student.id} className="flex justify-between items-center p-2 hover:bg-gray-100 rounded-md">
                                <span>{student.fullName}</span>
                                <button
                                    onClick={() => handleAddStudent(student.id)}
                                    disabled={isSubmitting}
                                    className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                                >
                                    Add
                                </button>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500">No unassigned students found.</p>
                    )}
                </div>
                <div className="mt-4 pt-4 border-t">
                    <button
                        onClick={() => setIsStudentFormModalOpen(true)}
                        className="w-full flex items-center justify-center px-4 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700"
                    >
                        <Icon path={ICONS.ADD} className="w-5 h-5 mr-2"/>
                        Create New Student
                    </button>
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