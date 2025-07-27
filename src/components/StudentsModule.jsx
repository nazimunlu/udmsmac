import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '../apiClient';
import { useNotification } from '../contexts/NotificationContext';
import { Icon, ICONS } from './Icons';
import StudentFormModal from './StudentFormModal';
import ConfirmationModal from './ConfirmationModal';
import StudentDetailsModal from './StudentDetailsModal';
import PaymentPlanPrint from './PaymentPlanPrint';
import { formatDate } from '../utils/formatDate';
import formatPhoneNumber from '../utils/formatPhoneNumber';
import { useAppContext } from '../contexts/AppContext';

const StudentsModule = () => {
    const { showNotification } = useNotification();
    const { students, archivedStudents, groups, lessons, fetchData, loading } = useAppContext();
    
    const [activeStudentType, setActiveStudentType] = useState('all'); // 'all', 'group', 'tutoring', 'archived'
    const [searchQuery, setSearchQuery] = useState('');
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [studentToEdit, setStudentToEdit] = useState(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [studentToView, setStudentToView] = useState(null);
    const [isPaymentPlanPrintOpen, setIsPaymentPlanPrintOpen] = useState(false);
    const [studentToPrint, setStudentToPrint] = useState(null);

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
            studentsToDisplay = studentsToDisplay.filter(s =>
                s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.studentContact?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.parentName?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        
        return [...studentsToDisplay].sort((a, b) => a.fullName.localeCompare(b.fullName));
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
                await apiClient.update('students', studentToDelete.id, { isArchived: true });
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

    const handleArchiveStudent = async (studentToDelete) => {
        try {
            await apiClient.update('students', studentToDelete.id, { isArchived: true });
            fetchData();
        } catch (error) {
            console.error('Error archiving student:', error);
        }
    };

    const handleUnarchiveStudent = async (student) => {
        try {
            await apiClient.update('students', student.id, { isArchived: false });
            fetchData();
        } catch (error) {
            console.error('Error unarchiving student:', error);
        }
    };

    const openAddModal = () => { setStudentToEdit(null); setIsFormModalOpen(true); };
    const openEditModal = (student) => { setStudentToEdit(student); setIsFormModalOpen(true); };
    const openDetailsModal = (student) => { setStudentToView(student); setIsDetailsModalOpen(true); };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center pb-4 mb-6 border-b border-gray-200">
                <h2 className="text-3xl font-bold text-gray-800 flex items-center"><Icon path={ICONS.STUDENTS} className="w-8 h-8 mr-3"/>Students</h2>
                <button onClick={openAddModal} className="flex items-center px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow"><Icon path={ICONS.ADD} className="mr-2"/>Add Student</button>
            </div>

            <div className="mb-6 flex flex-col space-y-4">
                <input
                    type="text"
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                />
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setActiveStudentType('all')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeStudentType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >All ({students.length})</button>
                    <button
                        onClick={() => setActiveStudentType('group')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeStudentType === 'group' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >Group ({groupStudents.length})</button>
                    <button
                        onClick={() => setActiveStudentType('tutoring')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeStudentType === 'tutoring' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >Tutoring ({tutoringStudents.length})</button>
                    <button
                        onClick={() => setActiveStudentType('archived')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeStudentType === 'archived' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >Archived ({archivedStudents.length})</button>
                </div>
            </div>

            {loading ? (
                <p className="text-center text-gray-500">Loading students...</p>
            ) : filteredStudents.length > 0 ? (
                <>
                    {/* Desktop Table View (hidden on mobile) */}
                    <div className="hidden lg:block bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50">
                                <tr>
                                        <th className="p-4 font-semibold text-base text-gray-600 uppercase">Full Name</th>
                                        <th className="p-4 font-semibold text-base text-gray-600 uppercase">Contact</th>
                                        <th className="p-4 font-semibold text-base text-gray-600 uppercase">Group</th>
                                        <th className="p-4 font-semibold text-base text-gray-600 uppercase">Enrollment Date</th>
                                        <th className="p-4 font-semibold text-base text-gray-600 uppercase">Lesson Progress</th>
                                        <th className="p-4 font-semibold text-base text-gray-600 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredStudents.map(student => (
                                    <tr key={student.id} className="hover:bg-gray-50">
                                            <td className="p-4 text-gray-800 text-base font-medium">{student.fullName}</td>
                                            <td className="p-4 text-gray-600 text-base">{formatPhoneNumber(student.studentContact)}</td>
                                        <td className="p-4 text-gray-600">
                                            {student.isTutoring ? (
                                                    <span className="px-3 py-2 rounded-full text-sm font-semibold text-white" style={{backgroundColor: student.color || '#8B5CF6'}}>Tutoring</span>
                                            ) : student.groupId ? (
                                                    (() => {
                                                        const foundGroup = groups.find(g => g.id === student.groupId);
                                                        return (
                                                            <span className="px-3 py-2 rounded-full text-sm font-semibold" style={{backgroundColor: foundGroup?.color, color: 'white'}}>{foundGroup?.groupName || 'N/A'}</span>
                                                        );
                                                    })()
                                                ) : (
                                                    <span className="text-base text-gray-400">N/A</span>
                                            )}
                                        </td>
                                            <td className="p-4 text-gray-600 text-base">{formatDate(student.enrollmentDate)}</td>
                                            <td className="p-4 text-gray-600">
                                                {(() => {
                                                    if (student.isTutoring) {
                                                        // For tutoring students, use tutoring details
                                                        const tutoringDetails = student.tutoringDetails || {};
                                                        const totalLessons = tutoringDetails.numberOfLessons || 0;
                                                        const completedLessons = lessons.filter(l => 
                                                            l.studentId === student.id && l.status === 'Complete'
                                                        ).length;
                                                        
                                                        if (totalLessons === 0) {
                                                            return <span className="text-base text-gray-400">No lessons planned</span>;
                                                        }
                                                        
                                                        const progressPercentage = Math.round((completedLessons / totalLessons) * 100);
                                                        const remainingLessons = totalLessons - completedLessons;
                                                        
                                                        if (completedLessons === totalLessons) {
                                                            return (
                                                                <span className="px-3 py-2 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                                                                    Complete ({totalLessons}/{totalLessons})
                                                                </span>
                                                            );
                                                        } else if (progressPercentage >= 75) {
                                                            return (
                                                                <span className="px-3 py-2 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                                                                    {completedLessons}/{totalLessons} ({progressPercentage}%)
                                                                </span>
                                                            );
                                                        } else if (progressPercentage >= 50) {
                                                            return (
                                                                <span className="px-3 py-2 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800">
                                                                    {completedLessons}/{totalLessons} ({progressPercentage}%)
                                                                </span>
                                                            );
                                                        } else {
                                                            return (
                                                                <span className="px-3 py-2 rounded-full text-sm font-semibold bg-red-100 text-red-800">
                                                                    {completedLessons}/{totalLessons} ({progressPercentage}%)
                                                                </span>
                                                            );
                                                        }
                                                    } else {
                                                        // For group students, count lessons in their group
                                                        const groupLessons = lessons.filter(l => l.groupId === student.groupId);
                                                        const totalGroupLessons = groupLessons.length;
                                                        const completedGroupLessons = groupLessons.filter(l => l.status === 'Complete').length;
                                                        
                                                        if (totalGroupLessons === 0) {
                                                            return <span className="text-base text-gray-400">No lessons scheduled</span>;
                                                        }
                                                        
                                                        const progressPercentage = Math.round((completedGroupLessons / totalGroupLessons) * 100);
                                                        
                                                        if (completedGroupLessons === totalGroupLessons) {
                                                            return (
                                                                <span className="px-3 py-2 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                                                                    Complete ({completedGroupLessons}/{totalGroupLessons})
                                                                </span>
                                                            );
                                                        } else if (progressPercentage >= 75) {
                                                            return (
                                                                <span className="px-3 py-2 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                                                                    {completedGroupLessons}/{totalGroupLessons} ({progressPercentage}%)
                                                                </span>
                                                            );
                                                        } else if (progressPercentage >= 50) {
                                                            return (
                                                                <span className="px-3 py-2 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800">
                                                                    {completedGroupLessons}/{totalGroupLessons} ({progressPercentage}%)
                                                                </span>
                                                            );
                                                        } else {
                                                            return (
                                                                <span className="px-3 py-2 rounded-full text-sm font-semibold bg-red-100 text-red-800">
                                                                    {completedGroupLessons}/{totalGroupLessons} ({progressPercentage}%)
                                                                </span>
                                                            );
                                                        }
                                                    }
                                                })()}
                                            </td>
                                            <td className="p-4 text-gray-600">
                                                <div className="flex space-x-3">
                                                    <button
                                                        onClick={() => openDetailsModal(student)}
                                                        className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Icon path={ICONS.EYE} className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => openEditModal(student)}
                                                        className="text-green-600 hover:text-green-800 p-2 hover:bg-green-50 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Icon path={ICONS.EDIT} className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setStudentToPrint(student);
                                                            setIsPaymentPlanPrintOpen(true);
                                                        }}
                                                        className="text-purple-600 hover:text-purple-800 p-2 hover:bg-purple-50 rounded-lg transition-colors"
                                                        title="Print Payment Plan"
                                                    >
                                                        <Icon path={ICONS.PRINT} className="w-5 h-5" />
                                                    </button>
                                                    {activeStudentType === 'archived' ? (
                                                        <button
                                                            onClick={() => handleUnarchiveStudent(student)}
                                                            className="text-green-600 hover:text-green-800 p-2 hover:bg-green-50 rounded-lg transition-colors"
                                                            title="Unarchive"
                                                        >
                                                            <Icon path={ICONS.BOX_OPEN} className="w-5 h-5" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => openDeleteConfirmation(student)}
                                                            className="text-orange-600 hover:text-orange-800 p-2 hover:bg-orange-50 rounded-lg transition-colors"
                                                            title="Archive"
                                                        >
                                                            <Icon path={ICONS.ARCHIVE} className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                {activeStudentType === 'archived' && (
                                                        <button
                                                            onClick={() => openDeleteConfirmation(student)}
                                                            className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Permanently Delete"
                                                        >
                                                            <Icon path={ICONS.TRASH} className="w-5 h-5" />
                                                        </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                    {/* Mobile Card View (hidden on desktop) */}
                    <div className="lg:hidden space-y-4">
                        {filteredStudents.map(student => (
                            <div key={student.id} className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-gray-800 mb-1">{student.fullName}</h3>
                                        <p className="text-sm text-gray-600">{formatPhoneNumber(student.studentContact)}</p>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => openDetailsModal(student)}
                                            className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="View Details"
                                        >
                                            <Icon path={ICONS.EYE} className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => openEditModal(student)}
                                            className="text-green-600 hover:text-green-800 p-2 hover:bg-green-50 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <Icon path={ICONS.EDIT} className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="space-y-2 mb-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-500">Group:</span>
                                        <span className="text-sm">
                                            {student.isTutoring ? (
                                                <span className="px-2 py-1 rounded-full text-xs font-semibold text-white" style={{backgroundColor: student.color || '#8B5CF6'}}>Tutoring</span>
                                            ) : student.groupId ? (
                                                (() => {
                                                    const foundGroup = groups.find(g => g.id === student.groupId);
                                                    return (
                                                        <span className="px-2 py-1 rounded-full text-xs font-semibold" style={{backgroundColor: foundGroup?.color, color: 'white'}}>{foundGroup?.groupName || 'N/A'}</span>
                                                    );
                                                })()
                                            ) : (
                                                <span className="text-gray-400">N/A</span>
                                            )}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-500">Enrollment:</span>
                                        <span className="text-sm text-gray-700">{formatDate(student.enrollmentDate)}</span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-500">Progress:</span>
                                        <span className="text-sm">
                                            {(() => {
                                                if (student.isTutoring) {
                                                    const tutoringDetails = student.tutoringDetails || {};
                                                    const totalLessons = tutoringDetails.numberOfLessons || 0;
                                                    const completedLessons = lessons.filter(l => 
                                                        l.studentId === student.id && l.status === 'Complete'
                                                    ).length;
                                                    
                                                    if (totalLessons === 0) {
                                                        return <span className="text-gray-400">No lessons planned</span>;
                                                    }
                                                    
                                                    const progressPercentage = Math.round((completedLessons / totalLessons) * 100);
                                                    
                                                    if (completedLessons === totalLessons) {
                                                        return (
                                                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                                                Complete ({totalLessons}/{totalLessons})
                                                            </span>
                                                        );
                                                    } else if (progressPercentage >= 75) {
                                                        return (
                                                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                                                {completedLessons}/{totalLessons} ({progressPercentage}%)
                                                            </span>
                                                        );
                                                    } else if (progressPercentage >= 50) {
                                                        return (
                                                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                                                                {completedLessons}/{totalLessons} ({progressPercentage}%)
                                                            </span>
                                                        );
                                                    } else {
                                                        return (
                                                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                                                {completedLessons}/{totalLessons} ({progressPercentage}%)
                                                            </span>
                                                        );
                                                    }
                                                } else {
                                                    const groupLessons = lessons.filter(l => l.groupId === student.groupId);
                                                    const totalGroupLessons = groupLessons.length;
                                                    const completedGroupLessons = groupLessons.filter(l => l.status === 'Complete').length;
                                                    
                                                    if (totalGroupLessons === 0) {
                                                        return <span className="text-gray-400">No lessons scheduled</span>;
                                                    }
                                                    
                                                    const progressPercentage = Math.round((completedGroupLessons / totalGroupLessons) * 100);
                                                    
                                                    if (completedGroupLessons === totalGroupLessons) {
                                                        return (
                                                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                                                Complete ({completedGroupLessons}/{totalGroupLessons})
                                                            </span>
                                                        );
                                                    } else if (progressPercentage >= 75) {
                                                        return (
                                                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                                                {completedGroupLessons}/{totalGroupLessons} ({progressPercentage}%)
                                                            </span>
                                                        );
                                                    } else if (progressPercentage >= 50) {
                                                        return (
                                                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                                                                {completedGroupLessons}/{totalGroupLessons} ({progressPercentage}%)
                                                            </span>
                                                        );
                                                    } else {
                                                        return (
                                                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                                                {completedGroupLessons}/{totalGroupLessons} ({progressPercentage}%)
                                                            </span>
                                                        );
                                                    }
                                                }
                                            })()}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                    <button
                                        onClick={() => {
                                            setStudentToPrint(student);
                                            setIsPaymentPlanPrintOpen(true);
                                        }}
                                        className="text-purple-600 hover:text-purple-800 p-2 hover:bg-purple-50 rounded-lg transition-colors"
                                        title="Print Payment Plan"
                                    >
                                        <Icon path={ICONS.PRINT} className="w-4 h-4" />
                                    </button>
                                    
                                    {activeStudentType === 'archived' ? (
                                        <button
                                            onClick={() => handleUnarchiveStudent(student)}
                                            className="text-green-600 hover:text-green-800 p-2 hover:bg-green-50 rounded-lg transition-colors"
                                            title="Unarchive"
                                        >
                                            <Icon path={ICONS.BOX_OPEN} className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => openDeleteConfirmation(student)}
                                            className="text-orange-600 hover:text-orange-800 p-2 hover:bg-orange-50 rounded-lg transition-colors"
                                            title="Archive"
                                        >
                                            <Icon path={ICONS.ARCHIVE} className="w-4 h-4" />
                                        </button>
                                    )}
                                    
                                    {activeStudentType === 'archived' && (
                                        <button
                                            onClick={() => openDeleteConfirmation(student)}
                                            className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Permanently Delete"
                                        >
                                            <Icon path={ICONS.TRASH} className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="text-center py-8">
                    <p className="text-gray-500">No students found.</p>
                </div>
            )}

            {/* Modals */}
            {isFormModalOpen && (
                <StudentFormModal
                    isOpen={isFormModalOpen}
                    studentToEdit={studentToEdit}
                    onClose={() => setIsFormModalOpen(false)}
                    onSave={() => {
                        setIsFormModalOpen(false);
                        fetchData();
                    }}
                />
            )}

            {isConfirmModalOpen && (
                <ConfirmationModal
                    isOpen={isConfirmModalOpen}
                    onClose={() => setIsConfirmModalOpen(false)}
                    onConfirm={handleDeleteStudent}
                    title={activeStudentType === 'archived' ? "Permanently Delete Student" : "Archive Student"}
                    message={
                        activeStudentType === 'archived' 
                            ? `⚠️ WARNING: You are about to PERMANENTLY DELETE "${studentToDelete?.fullName}". This action cannot be undone and will remove all student data including payments, lessons, and documents. Are you absolutely sure you want to proceed?`
                            : `Are you sure you want to archive "${studentToDelete?.fullName}"? The student will be moved to the archived section and can be restored later.`
                    }
                    confirmText={activeStudentType === 'archived' ? 'Delete Permanently' : 'Archive'}
                    confirmStyle={activeStudentType === 'archived' ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"}
                />
            )}

            {isDetailsModalOpen && (
                <StudentDetailsModal
                    isOpen={isDetailsModalOpen}
                    student={studentToView}
                    onClose={() => setIsDetailsModalOpen(false)}
                    onEdit={() => {
                        setIsDetailsModalOpen(false);
                        openEditModal(studentToView);
                    }}
                />
            )}

            {isPaymentPlanPrintOpen && (
                <PaymentPlanPrint
                    isOpen={isPaymentPlanPrintOpen}
                    student={studentToPrint}
                    onClose={() => setIsPaymentPlanPrintOpen(false)}
                />
            )}
        </div>
    );
};

export default StudentsModule;