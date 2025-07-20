import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Icon, ICONS } from './Icons';
import GroupFormModal from './GroupFormModal';
import GroupDetailsModal from './GroupDetailsModal';
import ConfirmationModal from './ConfirmationModal';
import { useNotification } from '../contexts/NotificationContext';
import { formatDate } from '../utils/formatDate';
import { useAppContext } from '../contexts/AppContext';

const GroupsModule = () => {
    const { showNotification } = useNotification();
    const { groups, students, fetchData, loading } = useAppContext();
    
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [groupToEdit, setGroupToEdit] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [groupToDelete, setGroupToDelete] = useState(null);
    const [showArchivedGroups, setShowArchivedGroups] = useState(false);

    

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
            if (showArchivedGroups) {
                const { error } = await supabase.from('groups').delete().match({ id: groupToDelete.id });
                if (error) throw error;
                showNotification('Group permanently deleted!', 'success');
            } else {
                const { error } = await supabase.from('groups').update({ isArchived: true }).match({ id: groupToDelete.id });
                if (error) throw error;
                showNotification('Group archived successfully!', 'success');
            }
            // Unassign students from this group
            const { error: updateError } = await supabase.from('students').update({ groupId: null }).eq('groupId', groupToDelete.id);
            if (updateError) throw updateError;
            fetchData();

        } catch (error) {
            console.error("Error deleting/archiving group:", error);
            showNotification('Error processing group deletion/archiving.', 'error');
        } finally {
            setIsConfirmModalOpen(false);
            setGroupToDelete(null);
        }
    };

    const handleUnarchiveGroup = async (group) => {
        try {
            const { error } = await supabase.from('groups').update({ isArchived: false }).match({ id: group.id });
            if (error) throw error;
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

    const filteredGroups = groups.filter(group => showArchivedGroups ? group.isArchived : !group.isArchived);

    return (
        <div className="relative p-4 md:p-8 bg-gray-50 rounded-lg shadow-lg">
            <div className="flex justify-between items-center pb-4 mb-6 border-b border-gray-200">
                <h2 className="text-3xl font-bold text-gray-800 flex items-center"><Icon path={ICONS.GROUPS} className="w-8 h-8 mr-3"/>Groups</h2>
                <button onClick={openAddModal} className="flex items-center px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow"><Icon path={ICONS.ADD} className="mr-2"/>Add Group</button>
            </div>
            <div className="mb-4 border-b border-gray-200">
                <nav className="flex space-x-4" aria-label="Tabs">
                    <button onClick={() => setShowArchivedGroups(false)} className={`px-3 py-2 font-medium text-sm rounded-t-lg ${!showArchivedGroups ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Active Groups</button>
                    <button onClick={() => setShowArchivedGroups(true)} className={`px-3 py-2 font-medium text-sm rounded-t-lg ${showArchivedGroups ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Archived Groups</button>
                </nav>
            </div>
            {isLoading ? (
                <p className="text-center text-gray-500">Loading groups...</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredGroups.length > 0 ? (
                        filteredGroups.map(group => (
                            <div key={group.id} className="bg-white rounded-lg shadow-md p-6 flex flex-col group" style={{borderTop: `5px solid ${group.color}`}}>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">{group.groupName}</h3>
                                <div className="text-gray-600 mb-4">
                                    {group.schedule && group.schedule.days && group.schedule.days.length > 0 && (
                                        <div>{group.schedule.days.join(', ')}: {group.schedule.startTime} - {group.schedule.endTime}</div>
                                    )}
                                    <div className="text-sm text-gray-500 mt-2">
                                        {group.startDate && group.endDate && 
                                            <span>{formatDate(group.startDate)} - {formatDate(group.endDate)}</span>
                                        }
                                    </div>
                                </div>
                                <div className="flex-grow"></div>
                                <div className="flex justify-between items-center mt-4">
                                    <span className="text-sm text-gray-500">{studentCount(group.id)} Students</span>
                                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openDetailsModal(group)} className="p-2 text-gray-600 hover:text-blue-800 rounded-full hover:bg-gray-200"><Icon path={ICONS.INFO} className="w-5 h-5" /></button>
                                        <button onClick={() => openEditModal(group)} className="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-gray-200"><Icon path={ICONS.EDIT} className="w-5 h-5" /></button>
                                        <button onClick={() => openDeleteConfirmation(group)} className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-gray-200"><Icon path={ICONS.DELETE} className="w-5 h-5" /></button>
                                        {showArchivedGroups && (
                                            <button onClick={() => handleUnarchiveGroup(group)} className="p-2 text-green-600 hover:text-green-800 rounded-full hover:bg-gray-200"><Icon path={ICONS.UPLOAD} className="w-5 h-5" /></button>
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