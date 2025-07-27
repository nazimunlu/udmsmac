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
            {/* Simple Premium Header */}
            <div className="mb-8">
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
                    <div className="flex items-center">
                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm mr-4">
                            <Icon path={ICONS.STUDENTS} className="w-7 h-7 text-white"/>
                        </div>
                        <div>
                            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">Students</h2>
                            <p className="text-gray-600 text-sm lg:text-base">Manage student enrollment and progress</p>
                        </div>
                    </div>
                    <button onClick={openAddModal} className="flex items-center px-6 py-3 rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-all duration-300 shadow-sm">
                        <Icon path={ICONS.ADD} className="w-5 h-5 mr-2"/>
                        <span className="font-semibold">Add Student</span>
                    </button>
                </div>
            </div>

            <div className="mb-6 flex flex-col space-y-4">
                <input
                    type="text"
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                />
                <div className="bg-white rounded-lg p-1 shadow-sm">
                    <div className="flex flex-wrap gap-1">
                        <button
                            onClick={() => setActiveStudentType('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${activeStudentType === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`}
                        >All ({students.length})</button>
                        <button
                            onClick={() => setActiveStudentType('group')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${activeStudentType === 'group' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`}
                        >Group ({groupStudents.length})</button>
                        <button
                            onClick={() => setActiveStudentType('tutoring')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${activeStudentType === 'tutoring' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`}
                        >Tutoring ({tutoringStudents.length})</button>
                        <button
                            onClick={() => setActiveStudentType('archived')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${activeStudentType === 'archived' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`}
                        >Archived ({archivedStudents.length})</button>
                    </div>
                </div>
            </div>

            {loading ? (
                <p className="text-center text-gray-500">Loading students...</p>
            ) : filteredStudents.length > 0 ? (
                <>
                    {/* Desktop Table View (hidden on mobile) */}
                    <div className="hidden lg:block bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                        <th className="p-4 font-bold text-base text-gray-700 uppercase tracking-wide">Full Name</th>
                                        <th className="p-4 font-bold text-base text-gray-700 uppercase tracking-wide">Contact</th>
                                        <th className="p-4 font-bold text-base text-gray-700 uppercase tracking-wide">Group</th>
                                        <th className="p-4 font-bold text-base text-gray-700 uppercase tracking-wide text-center">Enrollment Date</th>
                                        <th className="p-4 font-bold text-base text-gray-700 uppercase tracking-wide text-center">Lesson Progress</th>
                                        <th className="p-4 font-bold text-base text-gray-700 uppercase tracking-wide text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredStudents.map(student => (
                                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 text-gray-800 text-base font-semibold">{student.fullName}</td>
                                            <td className="p-4 text-gray-700 text-base">{formatPhoneNumber(student.studentContact)}</td>
                                        <td className="p-4 text-gray-700">
                                            {student.isTutoring ? (
                                                    <span className="px-3 py-2 rounded-full text-sm font-semibold text-white shadow-sm" style={{backgroundColor: student.color || '#8B5CF6'}}>Tutoring</span>
                                            ) : student.groupId ? (
                                                    (() => {
                                                        const foundGroup = groups.find(g => g.id === student.groupId);
                                                        return (
                                                            <span className="px-3 py-2 rounded-full text-sm font-semibold shadow-sm" style={{backgroundColor: foundGroup?.color, color: 'white'}}>{foundGroup?.groupName || 'N/A'}</span>
                                                        );
                                                    })()
                                                ) : (
                                                    <span className="text-base text-gray-400">Unassigned</span>
                                            )}
                                        </td>
                                            <td className="p-4 text-gray-700 text-base text-center">{formatDate(student.enrollmentDate)}</td>
                                            <td className="p-4 text-gray-700 text-center">
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
                                                                <span className="px-3 py-2 rounded-full text-sm font-semibold bg-green-100 text-green-800 shadow-sm">
                                                                    Complete ({totalLessons}/{totalLessons})
                                                                </span>
                                                            );
                                                        } else if (progressPercentage >= 75) {
                                                            return (
                                                                <span className="px-3 py-2 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 shadow-sm">
                                                                    {completedLessons}/{totalLessons} ({progressPercentage}%)
                                                                </span>
                                                            );
                                                        } else if (progressPercentage >= 50) {
                                                            return (
                                                                <span className="px-3 py-2 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800 shadow-sm">
                                                                    {completedLessons}/{totalLessons} ({progressPercentage}%)
                                                                </span>
                                                            );
                                                        } else {
                                                            return (
                                                                <span className="px-3 py-2 rounded-full text-sm font-semibold bg-red-100 text-red-800 shadow-sm">
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
                                                            return <span className="text-base text-gray-400">No lessons planned</span>;
                                                        }
                                                        
                                                        const progressPercentage = Math.round((completedGroupLessons / totalGroupLessons) * 100);
                                                        
                                                        if (completedGroupLessons === totalGroupLessons) {
                                                            return (
                                                                <span className="px-3 py-2 rounded-full text-sm font-semibold bg-green-100 text-green-800 shadow-sm">
                                                                    Complete ({totalGroupLessons}/{totalGroupLessons})
                                                                </span>
                                                            );
                                                        } else if (progressPercentage >= 75) {
                                                            return (
                                                                <span className="px-3 py-2 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 shadow-sm">
                                                                    {completedGroupLessons}/{totalGroupLessons} ({progressPercentage}%)
                                                                </span>
                                                            );
                                                        } else if (progressPercentage >= 50) {
                                                            return (
                                                                <span className="px-3 py-2 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800 shadow-sm">
                                                                    {completedGroupLessons}/{totalGroupLessons} ({progressPercentage}%)
                                                                </span>
                                                            );
                                                        } else {
                                                            return (
                                                                <span className="px-3 py-2 rounded-full text-sm font-semibold bg-red-100 text-red-800 shadow-sm">
                                                                    {completedGroupLessons}/{totalGroupLessons} ({progressPercentage}%)
                                                                </span>
                                                            );
                                                        }
                                                    }
                                                })()}
                                            </td>
                                            <td className="p-4 text-gray-700 text-center">
                                                <div className="flex items-center justify-center space-x-2">
                                                    <button onClick={() => openDetailsModal(student)} className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-full transition-colors" title="View Details">
                                                        <Icon path={ICONS.EYE} className="w-5 h-5" />
                                                    </button>
                                                    <button onClick={() => openEditModal(student)} className="p-2 text-green-600 hover:text-green-800 rounded-full hover:bg-green-50 transition-colors" title="Edit">
                                                        <Icon path={ICONS.EDIT} className="w-5 h-5" />
                                                    </button>
                                                    <button onClick={() => { setStudentToPrint(student); setIsPaymentPlanPrintOpen(true); }} className="p-2 text-purple-600 hover:text-purple-800 rounded-full hover:bg-purple-50 transition-colors" title="Print Payment Plan">
                                                        <Icon path={ICONS.PRINT} className="w-5 h-5" />
                                                    </button>
                                                    {activeStudentType === 'archived' ? (
                                                        <button onClick={() => handleUnarchiveStudent(student)} className="p-2 text-green-600 hover:text-green-800 rounded-full hover:bg-green-50 transition-colors" title="Unarchive">
                                                            <Icon path={ICONS.BOX_OPEN} className="w-5 h-5" />
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => openDeleteConfirmation(student)} className="p-2 text-orange-600 hover:text-orange-800 rounded-full hover:bg-orange-50 transition-colors" title="Archive">
                                                            <Icon path={ICONS.ARCHIVE} className="w-5 h-5" />
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
                    <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredStudents.map(student => (
                            <div key={student.id} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 group">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                        <Icon path={ICONS.STUDENTS} className="w-7 h-7 text-white" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-3">{student.fullName}</h3>
                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center text-sm text-gray-700">
                                        <Icon path={ICONS.PHONE} className="w-4 h-4 mr-2 text-gray-600" />
                                        <span>{formatPhoneNumber(student.studentContact)}</span>
                                    </div>
                                    <div className="flex items-center text-sm text-gray-700">
                                        <Icon path={ICONS.GROUPS} className="w-4 h-4 mr-2 text-gray-600" />
                                        <span>
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
                                                <span className="text-gray-400">Unassigned</span>
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex items-center text-sm text-gray-700">
                                        <Icon path={ICONS.CALENDAR} className="w-4 h-4 mr-2 text-gray-600" />
                                        <span>Enrolled: {formatDate(student.enrollmentDate)}</span>
                                    </div>
                                    <div className="flex items-center text-sm text-gray-700">
                                        <Icon path={ICONS.CHART_LINE} className="w-4 h-4 mr-2 text-gray-600" />
                                        <span>
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
                                                        return <span className="text-gray-400">No lessons planned</span>;
                                                    }
                                                    
                                                    const progressPercentage = Math.round((completedGroupLessons / totalGroupLessons) * 100);
                                                    
                                                    if (completedGroupLessons === totalGroupLessons) {
                                                        return (
                                                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                                                Complete ({totalGroupLessons}/{totalGroupLessons})
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
                                
                                <div className="flex items-center justify-center space-x-2 pt-4 border-t border-gray-200">
                                    <button onClick={() => openDetailsModal(student)} className="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-50 transition-colors" title="View Details">
                                        <Icon path={ICONS.EYE} className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => openEditModal(student)} className="p-2 text-green-600 hover:text-green-800 rounded-full hover:bg-green-50 transition-colors" title="Edit">
                                        <Icon path={ICONS.EDIT} className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => { setStudentToPrint(student); setIsPaymentPlanPrintOpen(true); }} className="p-2 text-purple-600 hover:text-purple-800 rounded-full hover:bg-purple-50 transition-colors" title="Print Payment Plan">
                                        <Icon path={ICONS.PRINT} className="w-5 h-5" />
                                    </button>
                                    {activeStudentType === 'archived' ? (
                                        <button onClick={() => handleUnarchiveStudent(student)} className="p-2 text-green-600 hover:text-green-800 rounded-full hover:bg-green-50 transition-colors" title="Unarchive">
                                            <Icon path={ICONS.BOX_OPEN} className="w-5 h-5" />
                                        </button>
                                    ) : (
                                        <button onClick={() => openDeleteConfirmation(student)} className="p-2 text-orange-600 hover:text-orange-800 rounded-full hover:bg-orange-50 transition-colors" title="Archive">
                                            <Icon path={ICONS.ARCHIVE} className="w-5 h-5" />
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