import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { useAppContext } from '../contexts/AppContext';
import Modal from './Modal';
import { Icon, ICONS } from './Icons';
import StudentFormModal from './StudentFormModal';

const AddStudentToGroupModal = ({ isOpen, onClose, group, currentStudents }) => {
    const { db, userId, appId, students: allStudents } = useAppContext();
    const [unassignedStudents, setUnassignedStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isStudentFormModalOpen, setIsStudentFormModalOpen] = useState(false);

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
            const studentDocRef = doc(db, 'artifacts', appId, 'users', userId, 'students', studentId);
            await updateDoc(studentDocRef, { groupId: group.id });
            setSearchTerm(''); // Clear search after adding
            onClose();
        } catch (error) {
            console.error("Error adding student to group: ", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Add Students to ${group.groupName}`}>
            <div className="p-4">
                <input
                    type="text"
                    placeholder="Search students..."
                    className="w-full p-2 border border-gray-300 rounded-md mb-4 focus:ring-blue-500 focus:border-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button
                    onClick={() => setIsStudentFormModalOpen(true)}
                    className="w-full flex items-center justify-center px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 mb-4"
                >
                    <Icon path={ICONS.ADD} className="w-5 h-5 mr-2" />Add New Student
                </button>
                {unassignedStudents.length > 0 ? (
                    <ul className="divide-y divide-gray-200 max-h-80 overflow-y-auto">
                        {unassignedStudents.map(student => (
                            <li key={student.id} className="py-3 flex justify-between items-center">
                                <span className="font-medium text-gray-800">{student.fullName}</span>
                                <button
                                    onClick={() => handleAddStudent(student.id)}
                                    disabled={isSubmitting}
                                    className="px-3 py-1 text-sm rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400"
                                >
                                    {isSubmitting ? 'Adding...' : 'Add'}
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-center text-gray-500">No unassigned students found.</p>
                )}
            </div>
            <StudentFormModal 
                isOpen={isStudentFormModalOpen} 
                onClose={() => {
                    setIsStudentFormModalOpen(false);
                    // Refresh the list of unassigned students after a new student is potentially added
                    const filtered = allStudents.filter(s => 
                        !s.groupId && 
                        !s.isTutoring && 
                        s.fullName.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                    setUnassignedStudents(filtered);
                }}
            />
        </Modal>
    );
};

export default AddStudentToGroupModal;
