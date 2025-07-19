import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Icon, ICONS } from './Icons';
import GroupFormModal from './GroupFormModal';
import GroupDetailsModal from './GroupDetailsModal';

const GroupsModule = () => {
    const { groups, students, isLoading } = useAppContext();
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [groupToEdit, setGroupToEdit] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);

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

    const studentCount = (groupId) => {
        return students.filter(s => s.groupId === groupId).length;
    };

    return (
        <div className="relative p-4 md:p-8 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Groups</h2>
                <button onClick={openAddModal} className="flex items-center px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow"><Icon path={ICONS.ADD} className="mr-2"/>Add Group</button>
            </div>
            {isLoading ? (
                <p className="text-center text-gray-500">Loading groups...</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups.map(group => (
                        <div key={group.id} className="bg-white rounded-lg shadow-md p-6 flex flex-col" style={{borderTop: `5px solid ${group.color}`}}>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">{group.groupName}</h3>
                            <div className="text-gray-600 mb-4">
                                {group.schedule && group.schedule.days && group.schedule.days.length > 0 && (
                                    <div>{group.schedule.days.join(', ')}: {group.schedule.startTime} - {group.schedule.endTime}</div>
                                )}
                                <div className="text-sm text-gray-500 mt-2">
                                    {group.startDate && <span>Starts: {formatDate(group.startDate)}</span>}
                                    {group.endDate && <span className="ml-4">Ends: {formatDate(group.endDate)}</span>}
                                </div>
                            </div>
                            <div className="flex-grow"></div>
                            <div className="flex justify-between items-center mt-4">
                                <span className="text-sm text-gray-500">{studentCount(group.id)} Students</span>
                                <div className="flex items-center">
                                    <button onClick={() => openDetailsModal(group)} className="text-sm font-medium text-blue-600 hover:underline mr-4">Details</button>
                                    <button onClick={() => openEditModal(group)} className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-200"><Icon path={ICONS.EDIT} className="w-5 h-5" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <GroupFormModal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} groupToEdit={groupToEdit} />
            {selectedGroup && <GroupDetailsModal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} group={selectedGroup} students={students.filter(s => s.groupId === selectedGroup.id)} />}
        </div>
    );
};

export default GroupsModule;