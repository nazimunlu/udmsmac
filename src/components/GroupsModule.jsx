import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import { Icon, ICONS } from './Icons';
import GroupFormModal from './GroupFormModal';
import GroupDetailsModal from './GroupDetailsModal';
import ConfirmationModal from './ConfirmationModal';
import { useNotification } from '../contexts/NotificationContext';
import { formatDate } from '../utils/formatDate';
import { useAppContext } from '../contexts/AppContext';
import { generateGroupLessons } from '../utils/lessonCalculator';
import Modal from './Modal'; // Added Modal import

const GroupsModule = () => {
    const { showNotification } = useNotification();
    const { groups, students, lessons, fetchData, loading } = useAppContext();
    
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [groupToEdit, setGroupToEdit] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [groupToDelete, setGroupToDelete] = useState(null);
    const [showArchivedGroups, setShowArchivedGroups] = useState(false);
    const [isLessonGenerationModalOpen, setIsLessonGenerationModalOpen] = useState(false);
    const [selectedGroupsForLessons, setSelectedGroupsForLessons] = useState(new Set());
    const [isGeneratingLessons, setIsGeneratingLessons] = useState(false);
    
    // Lesson generation progress state
    const [generationProgress, setGenerationProgress] = useState({
        current: 0,
        total: 0,
        currentGroup: '',
        status: ''
    });
    
    // Lesson deletion progress state
    const [deletionProgress, setDeletionProgress] = useState({
        current: 0,
        total: 0,
        status: ''
    });
    
    // Lesson management modal state
    const [lessonModalTab, setLessonModalTab] = useState('generate'); // 'generate' or 'delete'
    const [selectedGroupsForDeletion, setSelectedGroupsForDeletion] = useState(new Set());
    const [isDeletingLessons, setIsDeletingLessons] = useState(false);
    const [lessonDeletionOptions, setLessonDeletionOptions] = useState({
        deleteByDateRange: false,
        deleteByGroup: false,
        startDate: '',
        endDate: ''
    });

    // Lesson warning calculations
    const getOverdueLessons = () => {
        const now = new Date();
        return lessons?.filter(lesson => {
            const lessonEndDateTime = new Date(`${lesson.lessonDate}T${lesson.endTime || '10:00'}`);
            return lessonEndDateTime < now && lesson.status === 'Complete' && (!lesson.attendance || Object.keys(lesson.attendance).length === 0);
        }) || [];
    };

    const getTodayLessons = () => {
        const now = new Date();
        const today = new Date().toISOString().split('T')[0];
        return lessons?.filter(lesson => {
            const lessonDate = new Date(lesson.lessonDate).toISOString().split('T')[0];
            const lessonEndDateTime = new Date(`${lesson.lessonDate}T${lesson.endTime || '10:00'}`);
            return lessonDate === today && lessonEndDateTime < now && lesson.status === 'Complete' && (!lesson.attendance || Object.keys(lesson.attendance).length === 0);
        }) || [];
    };

    const getUpcomingLessons = () => {
        const now = new Date();
        const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        return lessons?.filter(lesson => {
            const lessonDateTime = new Date(`${lesson.lessonDate}T${lesson.startTime || '09:00'}`);
            return lessonDateTime > now && lessonDateTime <= next24Hours && lesson.status === 'Complete' && (!lesson.attendance || Object.keys(lesson.attendance).length === 0);
        }) || [];
    };

    const getLessonStatus = (lesson) => {
        const now = new Date();
        const lessonDateTime = new Date(`${lesson.lessonDate}T${lesson.startTime || '09:00'}`);
        const timeDiff = lessonDateTime - now;
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        if (lesson.status === 'Complete') {
            return { status: 'completed', text: 'Completed', color: 'green' };
        } else if (timeDiff < 0) {
            const daysOverdue = Math.abs(Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
            if (daysOverdue === 0) {
                return { status: 'overdue', text: 'Overdue Today', color: 'red' };
            } else {
                return { status: 'overdue', text: `${daysOverdue} Day${daysOverdue > 1 ? 's' : ''} Overdue`, color: 'red' };
            }
        } else if (hoursDiff <= 24) {
            return { status: 'upcoming', text: 'Today', color: 'orange' };
        } else {
            const daysUntil = Math.ceil(hoursDiff / 24);
            return { status: 'upcoming', text: `In ${daysUntil} Day${daysUntil > 1 ? 's' : ''}`, color: 'blue' };
        }
    };

    // Compute archived groups from the groups array
    const archivedGroups = groups?.filter(g => g.isArchived) || [];
    const activeGroups = groups?.filter(g => !g.isArchived) || [];

    // Function to convert hex color to gradient background
    const getGroupGradient = (hexColor) => {
        // Convert hex to RGB and create a lighter version for gradient
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        // Create a lighter version (80% opacity)
        const lightR = Math.round(r + (255 - r) * 0.8);
        const lightG = Math.round(g + (255 - g) * 0.8);
        const lightB = Math.round(b + (255 - b) * 0.8);
        
        return `from-[rgb(${lightR},${lightG},${lightB})] to-white`;
    };

    // Function to get border color from hex
    const getGroupBorder = (hexColor) => {
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        // Create a lighter version for border (20% opacity)
        const lightR = Math.round(r + (255 - r) * 0.8);
        const lightG = Math.round(g + (255 - g) * 0.8);
        const lightB = Math.round(b + (255 - b) * 0.8);
        
        return `rgb(${lightR},${lightG},${lightB})`;
    };

    

    const openAddModal = () => {
        setGroupToEdit(null);
        setIsFormModalOpen(true);
    };

    const openEditModal = (group) => {
        setGroupToEdit(group);
        setIsFormModalOpen(true);
    };

    const openDetailsModal = (group) => {
        setSelectedGroup(group);
        setIsDetailsModalOpen(true);
    };

    const openDeleteConfirmation = (group) => {
        setGroupToDelete(group);
        setIsConfirmModalOpen(true);
    };

    const handleDeleteGroup = async () => {
        if (!groupToDelete) return;
        try {
            // Delete all lessons associated with this group
            const allLessons = await apiClient.getAll('lessons');
            const groupLessons = allLessons.filter(lesson => lesson.groupId === groupToDelete.id);
            
            // Delete lessons in batches to avoid overwhelming the server
            const batchSize = 10;
            for (let i = 0; i < groupLessons.length; i += batchSize) {
                const batch = groupLessons.slice(i, i + batchSize);
                await Promise.all(batch.map(lesson => apiClient.delete('lessons', lesson.id)));
            }
            
            if (showArchivedGroups) {
                await apiClient.delete('groups', groupToDelete.id);
                showNotification('Group and all associated lessons permanently deleted!', 'success');
            } else {
                await apiClient.update('groups', groupToDelete.id, { isArchived: true });
                showNotification('Group archived and all associated lessons deleted!', 'success');
            }
            
            // Unassign students from this group
            const studentsInGroup = students.filter(s => s.groupId === groupToDelete.id);
            for (const student of studentsInGroup) {
                await apiClient.update('students', student.id, { groupId: null });
            }
            fetchData();

        } catch (error) {
            console.error("Error deleting/archiving group:", error);
            showNotification('Error processing group deletion/archiving.', 'error');
        } finally {
            setIsConfirmModalOpen(false);
            setGroupToDelete(null);
        }
    };

    const handleArchiveGroup = async (groupToDelete) => {
        try {
            await apiClient.update('groups', groupToDelete.id, { isArchived: true });
            fetchData();
        } catch (error) {
            console.error('Error archiving group:', error);
        }
    };

    const handleUnarchiveGroup = async (group) => {
        try {
            await apiClient.update('groups', group.id, { isArchived: false });
            showNotification('Group unarchived successfully!', 'success');
            fetchData();
        } catch (error) {
            console.error("Error unarchiving group:", error);
            showNotification('Error unarchiving group.', 'error');
        }
    };

    const studentCount = (groupId) => {
        return students?.filter(s => s.groupId === groupId)?.length || 0;
    };

    const handleGroupSelectionForLessons = (groupId, isSelected) => {
        const newSelected = new Set(selectedGroupsForLessons);
        if (isSelected) {
            newSelected.add(groupId);
        } else {
            newSelected.delete(groupId);
        }
        setSelectedGroupsForLessons(newSelected);
    };

    const selectAllGroupsForLessons = () => {
        const allGroupIds = activeGroups.map(group => group.id);
        setSelectedGroupsForLessons(new Set(allGroupIds));
    };

    const clearAllLessonSelections = () => {
        setSelectedGroupsForLessons(new Set());
    };

    const handleGenerateLessons = async () => {
        if (selectedGroupsForLessons.size === 0) {
            showNotification('Please select at least one group to generate lessons for.', 'warning');
            return;
        }

        setIsGeneratingLessons(true);
        let createdCount = 0;

        try {
            const selectedGroupsData = activeGroups.filter(group => selectedGroupsForLessons.has(group.id));
            
            // Calculate total lessons to be created for progress tracking
            let totalLessons = 0;
            for (const group of selectedGroupsData) {
                const endDate = group.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                const lessons = generateGroupLessons(group, group.startDate, endDate);
                totalLessons += lessons.length;
            }
            
            setGenerationProgress({
                current: 0,
                total: totalLessons,
                currentGroup: '',
                status: 'Starting lesson generation...'
            });
            
            for (const group of selectedGroupsData) {
                setGenerationProgress(prev => ({
                    ...prev,
                    currentGroup: group.groupName,
                    status: `Generating lessons for ${group.groupName}...`
                }));
                
                const endDate = group.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                
                const lessons = generateGroupLessons(
                    group,
                    group.startDate,
                    endDate
                );
                
                for (const lesson of lessons) {
                    try {
                        await apiClient.create('lessons', lesson);
                        createdCount++;
                        setGenerationProgress(prev => ({
                            ...prev,
                            current: createdCount,
                            status: `Created lesson ${createdCount} of ${totalLessons}`
                        }));
                    } catch (error) {
                        console.error('Error creating lesson:', error);
                    }
                }
            }

            setGenerationProgress(prev => ({
                ...prev,
                status: 'Lesson generation completed!'
            }));

            showNotification(`Successfully generated ${createdCount} lessons!`, 'success');
            setIsLessonGenerationModalOpen(false);
            setSelectedGroupsForLessons(new Set());
            fetchData();
        } catch (error) {
            console.error('Error generating lessons:', error);
            showNotification('Failed to generate lessons. Please try again.', 'error');
        } finally {
            setIsGeneratingLessons(false);
            setGenerationProgress({
                current: 0,
                total: 0,
                currentGroup: '',
                status: ''
            });
        }
    };

    // Lesson deletion functions
    const handleGroupSelectionForDeletion = (groupId, isSelected) => {
        setSelectedGroupsForDeletion(prev => {
            const newSet = new Set(prev);
            if (isSelected) {
                newSet.add(groupId);
            } else {
                newSet.delete(groupId);
            }
            return newSet;
        });
    };

    const selectAllGroupsForDeletion = () => {
        setSelectedGroupsForDeletion(new Set(activeGroups.map(g => g.id)));
    };

    const clearAllDeletionSelections = () => {
        setSelectedGroupsForDeletion(new Set());
        setLessonDeletionOptions({
            deleteByDateRange: false,
            deleteByGroup: false,
            startDate: '',
            endDate: ''
        });
    };

    const handleCloseLessonModal = () => {
        setIsLessonGenerationModalOpen(false);
        setLessonModalTab('generate'); // Reset to generate tab
        clearAllLessonSelections();
        clearAllDeletionSelections();
        setGenerationProgress({
            current: 0,
            total: 0,
            currentGroup: '',
            status: ''
        });
        setDeletionProgress({
            current: 0,
            total: 0,
            status: ''
        });
    };

    const getLessonsToDelete = () => {
        if (!lessonDeletionOptions.deleteByGroup && !lessonDeletionOptions.deleteByDateRange) {
            return [];
        }

        let filteredLessons = [...lessons];

        // Filter by selected groups
        if (lessonDeletionOptions.deleteByGroup && selectedGroupsForDeletion.size > 0) {
            filteredLessons = filteredLessons.filter(lesson => 
                lesson.groupId && selectedGroupsForDeletion.has(lesson.groupId)
            );
        }

        // Filter by date range
        if (lessonDeletionOptions.deleteByDateRange && lessonDeletionOptions.startDate && lessonDeletionOptions.endDate) {
            const startDate = new Date(lessonDeletionOptions.startDate);
            const endDate = new Date(lessonDeletionOptions.endDate);
            filteredLessons = filteredLessons.filter(lesson => {
                const lessonDate = new Date(lesson.lessonDate);
                return lessonDate >= startDate && lessonDate <= endDate;
            });
        }

        return filteredLessons;
    };

    const handleDeleteLessons = async () => {
        const lessonsToDelete = getLessonsToDelete();
        
        if (lessonsToDelete.length === 0) {
            showNotification('No lessons match the selected criteria.', 'warning');
            return;
        }

        setIsDeletingLessons(true);
        
        // Initialize progress
        setDeletionProgress({
            current: 0,
            total: lessonsToDelete.length,
            status: 'Starting lesson deletion...'
        });
        
        try {
            let deletedCount = 0;
            const totalLessons = lessonsToDelete.length;
            
            // Delete lessons in batches
            const batchSize = 10;
            for (let i = 0; i < lessonsToDelete.length; i += batchSize) {
                const batch = lessonsToDelete.slice(i, i + batchSize);
                
                setDeletionProgress(prev => ({
                    ...prev,
                    status: `Deleting batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(totalLessons / batchSize)}...`
                }));
                
                for (const lesson of batch) {
                    try {
                        await apiClient.delete('lessons', lesson.id);
                        deletedCount++;
                        setDeletionProgress(prev => ({
                            ...prev,
                            current: deletedCount,
                            status: `Deleted lesson ${deletedCount} of ${totalLessons}`
                        }));
                    } catch (error) {
                        console.error('Error deleting lesson:', error);
                    }
                }
                
                // Small delay between batches
                if (i + batchSize < lessonsToDelete.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            
            setDeletionProgress(prev => ({
                ...prev,
                status: 'Lesson deletion completed!'
            }));

            showNotification(`Successfully deleted ${deletedCount} out of ${totalLessons} lessons!`, 'success');
            setIsLessonGenerationModalOpen(false); // Close the modal after deletion
            setSelectedGroupsForDeletion(new Set());
            setLessonDeletionOptions({
                deleteByDateRange: false,
                deleteByGroup: false,
                startDate: '',
                endDate: ''
            });
            fetchData();
        } catch (error) {
            console.error('Error deleting lessons:', error);
            showNotification('Failed to delete lessons. Please try again.', 'error');
        } finally {
            setIsDeletingLessons(false);
            setDeletionProgress({
                current: 0,
                total: 0,
                status: ''
            });
        }
    };

    const filteredGroups = showArchivedGroups ? archivedGroups : activeGroups;

    return (
        <div className="relative p-4 md:p-8 bg-gray-50 rounded-lg shadow-lg">
            {/* Simple Premium Header */}
            <div className="mb-8">
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
                    <div className="flex items-center">
                        <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center shadow-sm mr-4">
                            <Icon path={ICONS.GROUPS} className="w-7 h-7 text-white"/>
                        </div>
                        <div>
                            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">Groups</h2>
                            <p className="text-gray-600 text-sm lg:text-base">Manage student groups and schedules</p>
                        </div>
                    </div>
                    <div className="flex space-x-3">
                        <button onClick={openAddModal} className="flex items-center px-6 py-3 rounded-lg text-white bg-purple-600 hover:bg-purple-700 transition-all duration-300 shadow-sm">
                            <Icon path={ICONS.ADD} className="w-5 h-5 mr-2"/>
                            <span className="font-semibold">Add Group</span>
                        </button>
                        <button onClick={() => setIsLessonGenerationModalOpen(true)} className="flex items-center px-6 py-3 rounded-lg text-white bg-teal-600 hover:bg-teal-700 transition-all duration-300 shadow-sm">
                            <Icon path={ICONS.LESSON} className="w-5 h-5 mr-2"/>
                            <span className="font-semibold">Manage Lessons</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Lesson Warnings Banner */}
            {(() => {
                const overdueLessons = getOverdueLessons();
                const todayLessons = getTodayLessons();
                
                if (overdueLessons.length > 0 || todayLessons.length > 0) {
                    return (
                        <div className="mb-6 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-start">
                                <Icon path={ICONS.WARNING} className="w-6 h-6 text-red-600 mr-3 mt-0.5" />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-red-900 mb-2">Lesson Attendance Required</h3>
                                    <div className="space-y-2 text-sm">
                                        {overdueLessons.length > 0 && (
                                            <div className="space-y-2">
                                                <div className="flex items-center text-red-800">
                                                    <Icon path={ICONS.CLOCK} className="w-4 h-4 mr-2" />
                                                    <span className="font-medium">{overdueLessons.length} completed lesson(s) missing attendance</span>
                                                </div>
                                                <div className="ml-6 space-y-1">
                                                    {overdueLessons.slice(0, 3).map((lesson, index) => {
                                                        const group = groups?.find(g => g.id === lesson.groupId);
                                                        return (
                                                            <div key={index} className="text-xs text-red-700 bg-red-100 px-2 py-1 rounded">
                                                                • {group?.groupName || 'Unknown Group'} - {lesson.topic} ({formatDate(lesson.lessonDate)})
                                                            </div>
                                                        );
                                                    })}
                                                    {overdueLessons.length > 3 && (
                                                        <div className="text-xs text-red-700 bg-red-100 px-2 py-1 rounded">
                                                            • ... and {overdueLessons.length - 3} more lessons missing attendance
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {todayLessons.length > 0 && (
                                            <div className="space-y-2">
                                                <div className="flex items-center text-orange-800">
                                                    <Icon path={ICONS.CALENDAR} className="w-4 h-4 mr-2" />
                                                    <span className="font-medium">{todayLessons.length} completed lesson(s) from today missing attendance</span>
                                                </div>
                                                <div className="ml-6 space-y-1">
                                                    {todayLessons.slice(0, 3).map((lesson, index) => {
                                                        const group = groups?.find(g => g.id === lesson.groupId);
                                                        return (
                                                            <div key={index} className="text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded">
                                                                • {group?.groupName || 'Unknown Group'} - {lesson.topic} ({lesson.startTime || 'TBD'})
                                                            </div>
                                                        );
                                                    })}
                                                    {todayLessons.length > 3 && (
                                                        <div className="text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded">
                                                            • ... and {todayLessons.length - 3} more today missing attendance
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                }
                return null;
            })()}
            
            <div className="mb-6 bg-white rounded-lg p-1 shadow-sm">
                <nav className="flex space-x-1" aria-label="Tabs">
                    <button onClick={() => setShowArchivedGroups(false)} className={`flex-1 px-4 py-3 font-medium text-sm rounded-lg transition-all duration-300 ${!showArchivedGroups ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`}>Active Groups ({activeGroups.length})</button>
                    <button onClick={() => setShowArchivedGroups(true)} className={`flex-1 px-4 py-3 font-medium text-sm rounded-lg transition-all duration-300 ${showArchivedGroups ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`}>Archived Groups ({archivedGroups.length})</button>
                </nav>
            </div>
            {loading ? (
                <p className="text-center text-gray-500">Loading groups...</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredGroups.length > 0 ? (
                        filteredGroups.map(group => (
                            <div key={group.id} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 group cursor-pointer">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300" style={{backgroundColor: group.color}}>
                                        <Icon path={ICONS.GROUPS} className="w-7 h-7 text-white" />
                                    </div>
                                </div>
                                
                                <h3 className="text-2xl font-bold text-gray-900 mb-3">{group.groupName}</h3>
                                
                                <div className="space-y-3 mb-6">
                                    {group.schedule && group.schedule.days && group.schedule.days.length > 0 && (
                                        <div className="flex items-center text-sm text-gray-700">
                                            <Icon path={ICONS.CALENDAR} className="w-4 h-4 mr-2 text-gray-600" />
                                            <span>{group.schedule.days.join(', ')}: {group.schedule.startTime} - {group.schedule.endTime}</span>
                                        </div>
                                    )}
                                    {group.startDate && group.endDate && (
                                        <div className="flex items-center text-sm text-gray-700">
                                            <Icon path={ICONS.CALENDAR_CHECK} className="w-4 h-4 mr-2 text-gray-600" />
                                            <span>{formatDate(group.startDate)} - {formatDate(group.endDate)}</span>
                                    </div>
                                    )}
                                </div>
                                
                                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                                    <div className="flex items-center text-sm text-gray-700">
                                        <Icon path={ICONS.USERS} className="w-4 h-4 mr-2" />
                                        <span className="font-medium">{studentCount(group.id)} Student{studentCount(group.id) !== 1 ? 's' : ''}</span>
                                    </div>
                                    
                                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <button onClick={(e) => { e.stopPropagation(); openDetailsModal(group); }} className="p-2 text-gray-600 hover:text-blue-800 rounded-full hover:bg-blue-50 transition-colors">
                                            <Icon path={ICONS.INFO} className="w-5 h-5" />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); openEditModal(group); }} className="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-50 transition-colors">
                                            <Icon path={ICONS.EDIT} className="w-5 h-5" />
                                        </button>
                                        {!showArchivedGroups && (
                                            <button onClick={(e) => { e.stopPropagation(); openDeleteConfirmation(group); }} className="p-2 text-orange-600 hover:text-orange-800 rounded-full hover:bg-orange-50 transition-colors">
                                                <Icon path={ICONS.ARCHIVE} className="w-5 h-5" />
                                            </button>
                                        )}
                                        {showArchivedGroups && (
                                            <button onClick={(e) => { e.stopPropagation(); handleUnarchiveGroup(group); }} className="p-2 text-green-600 hover:text-green-800 rounded-full hover:bg-green-50 transition-colors">
                                                <Icon path={ICONS.BOX_OPEN} className="w-5 h-5" />
                                            </button>
                                        )}
                                        {showArchivedGroups && (
                                            <button onClick={(e) => { e.stopPropagation(); openDeleteConfirmation(group); }} className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50 transition-colors">
                                                <Icon path={ICONS.TRASH} className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500 col-span-full">No groups found in this category.</p>
                    )}
                </div>
            )}
            <GroupFormModal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} groupToEdit={groupToEdit} />
            {selectedGroup && <GroupDetailsModal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} group={selectedGroup} students={students.filter(s => s.groupId === selectedGroup.id)} />}
            {groupToDelete && (
                <ConfirmationModal
                    isOpen={isConfirmModalOpen}
                    onClose={() => setIsConfirmModalOpen(false)}
                    onConfirm={handleDeleteGroup}
                    title="Delete Group"
                    message={`Are you sure you want to ${showArchivedGroups ? 'permanently delete' : 'archive'} the group "${groupToDelete.groupName}"? ${!showArchivedGroups ? 'This will also unassign all students from this group.' : 'This action cannot be undone.'}`}
                />
            )}

            {/* Manage Lessons Modal */}
            {isLessonGenerationModalOpen && (
                <Modal
                    isOpen={isLessonGenerationModalOpen}
                    onClose={handleCloseLessonModal}
                    title="Manage Lessons"
                    headerStyle={{ backgroundColor: lessonModalTab === 'generate' ? '#0D9488' : '#DC2626' }}
                >
                    <div className="space-y-6">
                        {/* Tab Navigation */}
                        <div className="flex space-x-4 mb-4">
                            <button
                                onClick={() => setLessonModalTab('generate')}
                                className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${lessonModalTab === 'generate' ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`}
                            >
                                Generate Lessons
                            </button>
                            <button
                                onClick={() => setLessonModalTab('delete')}
                                className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${lessonModalTab === 'delete' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`}
                            >
                                Delete Lessons
                            </button>
                        </div>

                        {/* Generate Lessons Tab */}
                        {lessonModalTab === 'generate' && (
                            <div className="space-y-6">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-start">
                                        <Icon path={ICONS.INFO} className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                                        <div>
                                            <h4 className="font-medium text-blue-900 mb-1">Generate Lessons</h4>
                                            <p className="text-sm text-blue-800">
                                                This will automatically generate lessons for selected groups based on their existing schedules. 
                                                Lessons will be created from the group's start date until their end date (or 3 months from now if no end date is set).
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900">Select Groups</h3>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={selectAllGroupsForLessons}
                                                className="px-3 py-1 text-sm bg-teal-100 text-teal-700 rounded-md hover:bg-teal-200 transition-colors"
                                            >
                                                Select All
                                            </button>
                                            <button
                                                onClick={clearAllLessonSelections}
                                                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                    </div>

                                    <div className="max-h-60 overflow-y-auto space-y-2">
                                        {activeGroups.map(group => (
                                            <label key={group.id} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedGroupsForLessons.has(group.id)}
                                                    onChange={(e) => handleGroupSelectionForLessons(group.id, e.target.checked)}
                                                    className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                                                />
                                                <div className="ml-3 flex-1">
                                                    <div className="flex items-center">
                                                        <span className="font-medium text-gray-900">{group.groupName}</span>
                                                    </div>
                                                    <div className="text-sm text-gray-600">
                                                        {group.schedule?.days?.join(', ')} • {group.schedule?.startTime} - {group.schedule?.endTime}
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Progress indicator during generation */}
                                {isGeneratingLessons && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-medium text-blue-900">Generating Lessons</h4>
                                                <span className="text-sm text-blue-700">
                                                    {generationProgress.current} / {generationProgress.total}
                                                </span>
                                            </div>
                                            
                                            {/* Progress bar */}
                                            <div className="w-full bg-blue-200 rounded-full h-2">
                                                <div 
                                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                    style={{ 
                                                        width: generationProgress.total > 0 
                                                            ? `${(generationProgress.current / generationProgress.total) * 100}%` 
                                                            : '0%' 
                                                    }}
                                                ></div>
                                            </div>
                                            
                                            {/* Status messages */}
                                            <div className="text-sm text-blue-800">
                                                <p className="font-medium">{generationProgress.status}</p>
                                                {generationProgress.currentGroup && (
                                                    <p className="text-blue-700 mt-1">Current group: {generationProgress.currentGroup}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Lesson count indicator */}
                                {selectedGroupsForLessons.size > 0 && !isGeneratingLessons && (
                                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                                        <div className="flex items-start">
                                            <Icon path={ICONS.INFO} className="w-5 h-5 text-teal-600 mr-3 mt-0.5" />
                                            <div>
                                                <h4 className="font-medium text-teal-900 mb-1">Lesson Count</h4>
                                                <p className="text-sm text-teal-800">
                                                    {(() => {
                                                        let totalLessons = 0;
                                                        activeGroups.forEach(group => {
                                                            if (selectedGroupsForLessons.has(group.id)) {
                                                                // Calculate estimated lessons for this group
                                                                const startDate = group.startDate ? new Date(group.startDate) : new Date();
                                                                const endDate = group.endDate ? new Date(group.endDate) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 3 months from now
                                                                const scheduleDays = group.schedule?.days || [];
                                                                
                                                                if (scheduleDays.length > 0) {
                                                                    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                                                                    const weeks = Math.ceil(daysDiff / 7);
                                                                    const lessonsPerWeek = scheduleDays.length;
                                                                    totalLessons += weeks * lessonsPerWeek;
                                                                }
                                                            }
                                                        });
                                                        return totalLessons;
                                                    })()} lessons will be generated for {selectedGroupsForLessons.size} selected group{selectedGroupsForLessons.size > 1 ? 's' : ''}.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end space-x-4 pt-4">
                                    {!isGeneratingLessons && (
                                        <button
                                            onClick={handleCloseLessonModal}
                                            className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    <button
                                        onClick={handleGenerateLessons}
                                        disabled={isGeneratingLessons || selectedGroupsForLessons.size === 0}
                                        className="px-6 py-2 rounded-lg text-white bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                                    >
                                        {isGeneratingLessons && <Icon path={ICONS.LOADING} className="w-4 h-4 animate-spin" />}
                                        <span>
                                            {isGeneratingLessons 
                                                ? `Generating... (${generationProgress.current}/${generationProgress.total})` 
                                                : 'Generate Lessons'
                                            }
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Delete Lessons Tab */}
                        {lessonModalTab === 'delete' && (
                            <div className="space-y-6">
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <div className="flex items-start">
                                        <Icon path={ICONS.WARNING} className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
                                        <div>
                                            <h4 className="font-medium text-red-900 mb-1">Delete Lessons</h4>
                                            <p className="text-sm text-red-800">
                                                This will permanently delete lessons based on your selected criteria. 
                                                This action cannot be undone.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={lessonDeletionOptions.deleteByGroup}
                                                onChange={(e) => setLessonDeletionOptions(prev => ({
                                                    ...prev,
                                                    deleteByGroup: e.target.checked
                                                }))}
                                                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                                            />
                                            <span className="ml-2 text-sm font-medium text-gray-900">Delete by Group</span>
                                        </label>
                                        
                                        {lessonDeletionOptions.deleteByGroup && (
                                            <div className="mt-4 ml-6">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h4 className="text-sm font-medium text-gray-900">Select Groups</h4>
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={selectAllGroupsForDeletion}
                                                            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                                                        >
                                                            Select All
                                                        </button>
                                                        <button
                                                            onClick={clearAllDeletionSelections}
                                                            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                                                        >
                                                            Clear All
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="max-h-40 overflow-y-auto space-y-2">
                                                    {activeGroups.map(group => (
                                                        <label key={group.id} className="flex items-center p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedGroupsForDeletion.has(group.id)}
                                                                onChange={(e) => handleGroupSelectionForDeletion(group.id, e.target.checked)}
                                                                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                                                            />
                                                            <div className="ml-2 flex-1">
                                                                <div className="flex items-center">
                                                                    <span className="text-sm font-medium text-gray-900">{group.groupName}</span>
                                                                </div>
                                                            </div>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={lessonDeletionOptions.deleteByDateRange}
                                                onChange={(e) => setLessonDeletionOptions(prev => ({
                                                    ...prev,
                                                    deleteByDateRange: e.target.checked
                                                }))}
                                                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                                            />
                                            <span className="ml-2 text-sm font-medium text-gray-900">Delete by Date Range</span>
                                        </label>
                                        
                                        {lessonDeletionOptions.deleteByDateRange && (
                                            <div className="mt-4 ml-6 space-y-3">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                                    <input
                                                        type="date"
                                                        value={lessonDeletionOptions.startDate}
                                                        onChange={(e) => setLessonDeletionOptions(prev => ({
                                                            ...prev,
                                                            startDate: e.target.value
                                                        }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                                    <input
                                                        type="date"
                                                        value={lessonDeletionOptions.endDate}
                                                        onChange={(e) => setLessonDeletionOptions(prev => ({
                                                            ...prev,
                                                            endDate: e.target.value
                                                        }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Preview of lessons to be deleted */}
                                {(() => {
                                    const lessonsToDelete = getLessonsToDelete();
                                    if (lessonsToDelete.length > 0) {
                                        return (
                                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                                <div className="flex items-start">
                                                    <Icon path={ICONS.INFO} className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
                                                    <div>
                                                        <h4 className="font-medium text-yellow-900 mb-1">Lessons to be deleted</h4>
                                                        <p className="text-sm text-yellow-800">
                                                            {lessonsToDelete.length} lesson(s) will be deleted based on your criteria.
                                                        </p>
                                                        {lessonDeletionOptions.deleteByGroup && selectedGroupsForDeletion.size > 0 && (
                                                            <p className="text-sm text-yellow-800 mt-1">
                                                                Groups: {selectedGroupsForDeletion.size} selected
                                                            </p>
                                                        )}
                                                        {lessonDeletionOptions.deleteByDateRange && lessonDeletionOptions.startDate && lessonDeletionOptions.endDate && (
                                                            <p className="text-sm text-yellow-800 mt-1">
                                                                Date range: {lessonDeletionOptions.startDate} to {lessonDeletionOptions.endDate}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

                                {/* Progress indicator during deletion */}
                                {isDeletingLessons && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-medium text-red-900">Deleting Lessons</h4>
                                                <span className="text-sm text-red-700">
                                                    {deletionProgress.current} / {deletionProgress.total}
                                                </span>
                                            </div>
                                            
                                            {/* Progress bar */}
                                            <div className="w-full bg-red-200 rounded-full h-2">
                                                <div 
                                                    className="bg-red-600 h-2 rounded-full transition-all duration-300"
                                                    style={{ 
                                                        width: deletionProgress.total > 0 
                                                            ? `${(deletionProgress.current / deletionProgress.total) * 100}%` 
                                                            : '0%' 
                                                    }}
                                                ></div>
                                            </div>
                                            
                                            {/* Status messages */}
                                            <div className="text-sm text-red-800">
                                                <p className="font-medium">{deletionProgress.status}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end space-x-4 pt-4">
                                    {!isDeletingLessons && (
                                        <button
                                            onClick={() => setIsLessonGenerationModalOpen(false)}
                                            className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    <button
                                        onClick={handleDeleteLessons}
                                        disabled={isDeletingLessons || getLessonsToDelete().length === 0}
                                        className="px-6 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                                    >
                                        {isDeletingLessons && <Icon path={ICONS.LOADING} className="w-4 h-4 animate-spin" />}
                                        <span>
                                            {isDeletingLessons 
                                                ? `Deleting... (${deletionProgress.current}/${deletionProgress.total})` 
                                                : 'Delete Lessons'
                                            }
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default GroupsModule;