import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import { Icon, ICONS } from './Icons';
import GroupFormModal from './GroupFormModal';
import GroupDetailsModal from './GroupDetailsModal';
import ConfirmationModal from './ConfirmationModal';
import { useNotification } from '../contexts/NotificationContext';
import { formatDate } from '../utils/formatDate';
import { useAppContext } from '../contexts/AppContext';

const GroupsModule = () => {
    const { showNotification } = useNotification();
    const { groups, archivedGroups, students, fetchData, loading } = useAppContext();
    
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [groupToEdit, setGroupToEdit] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [groupToDelete, setGroupToDelete] = useState(null);
    const [showArchivedGroups, setShowArchivedGroups] = useState(false);

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
        return students.filter(s => s.groupId === groupId).length;
    };

    const filteredGroups = showArchivedGroups ? archivedGroups : groups;

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
                    <button onClick={openAddModal} className="flex items-center px-6 py-3 rounded-lg text-white bg-purple-600 hover:bg-purple-700 transition-all duration-300 shadow-sm">
                        <Icon path={ICONS.ADD} className="w-5 h-5 mr-2"/>
                        <span className="font-semibold">Add Group</span>
                    </button>
                </div>
            </div>
            
            <div className="mb-6 bg-white rounded-lg p-1 shadow-sm">
                <nav className="flex space-x-1" aria-label="Tabs">
                    <button onClick={() => setShowArchivedGroups(false)} className={`flex-1 px-4 py-3 font-medium text-sm rounded-lg transition-all duration-300 ${!showArchivedGroups ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`}>Active Groups ({groups.length})</button>
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
                                            <Icon path={ICONS.CLOCK} className="w-4 h-4 mr-2 text-gray-600" />
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
        </div>
    );
};

export default GroupsModule;