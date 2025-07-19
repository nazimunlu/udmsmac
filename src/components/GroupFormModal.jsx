import React, { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { useAppContext } from '../contexts/AppContext';
import Modal from './Modal';
import { FormInput } from './Form';
import CustomDatePicker from './CustomDatePicker';
import CustomTimePicker from './CustomTimePicker';

const GroupFormModal = ({ isOpen, onClose, groupToEdit }) => {
    const { db, userId, appId } = useAppContext();
    const timeOptions = [];
    for (let h = 9; h <= 23; h++) {
        timeOptions.push(`${h.toString().padStart(2, '0')}:00`);
        timeOptions.push(`${h.toString().padStart(2, '0')}:30`);
    }
    timeOptions.push('00:00');

    const getInitialData = useCallback(() => ({
        groupName: groupToEdit?.groupName || '',
        schedule: groupToEdit?.schedule || { days: [], startTime: '10:00', endTime: '12:00' },
        color: groupToEdit?.color || '#3b82f6',
        startDate: groupToEdit?.startDate ? groupToEdit.startDate.toDate().toISOString().split('T')[0] : '',
        endDate: groupToEdit?.endDate ? groupToEdit.endDate.toDate().toISOString().split('T')[0] : '',
    }), [groupToEdit]);

    const [formData, setFormData] = useState(getInitialData());
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if(isOpen) setFormData(getInitialData());
    }, [isOpen, getInitialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleScheduleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, schedule: {...prev.schedule, [name]: value} }));
    };

    const handleDateChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'startDate') {
            const startDate = new Date(value);
            const endDate = new Date(startDate.getTime() + 12 * 7 * 24 * 60 * 60 * 1000);
            setFormData(prev => ({ ...prev, endDate: endDate.toISOString().split('T')[0] }));
        }
    };

    const toggleScheduleDay = (day) => {
        const currentDays = formData.schedule.days;
        const newDays = currentDays.includes(day)
            ? currentDays.filter(d => d !== day)
            : [...currentDays, day];
        setFormData(prev => ({...prev, schedule: {...prev.schedule, days: newDays}}));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const dataToSave = {
            ...formData,
            startDate: formData.startDate ? Timestamp.fromDate(new Date(formData.startDate)) : null,
            endDate: formData.endDate ? Timestamp.fromDate(new Date(formData.endDate)) : null,
        };

        try {
            if (groupToEdit) {
                const groupDocRef = doc(db, 'artifacts', appId, 'users', userId, 'groups', groupToEdit.id);
                await setDoc(groupDocRef, dataToSave, { merge: true });
            } else {
                const groupsCollectionPath = collection(db, 'artifacts', appId, 'users', userId, 'groups');
                await addDoc(groupsCollectionPath, dataToSave);
            }
            onClose();
        } catch (error) {
            console.error("Error saving group:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={groupToEdit ? "Edit Group" : "Add New Group"}>
            <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                    <FormInput label="Group Name" name="groupName" value={formData.groupName} onChange={handleChange} required />
                    <div className="flex items-center">
                        <label htmlFor="color" className="block text-sm font-medium text-gray-700 mr-4">Group Color</label>
                        <input type="color" id="color" name="color" value={formData.color} onChange={handleChange} className="w-10 h-10 rounded-full" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <CustomDatePicker label="Start Date" name="startDate" value={formData.startDate} onChange={(e) => handleDateChange('startDate', e.target.value)} />
                        <CustomDatePicker label="End Date" name="endDate" value={formData.endDate} onChange={(e) => handleDateChange('endDate', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Schedule</label>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <button type="button" key={day} onClick={() => toggleScheduleDay(day)} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${formData.schedule.days.includes(day) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                                    {day}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex-1"><CustomTimePicker label="Start Time" name="startTime" value={formData.schedule.startTime} onChange={handleScheduleChange} options={timeOptions}/></div>
                            <div className="pt-6 text-gray-500">-</div>
                            <div className="flex-1"><CustomTimePicker label="End Time" name="endTime" value={formData.schedule.endTime} onChange={handleScheduleChange} options={timeOptions}/></div>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end pt-8 mt-8 border-t border-gray-200 space-x-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed">{isSubmitting ? 'Saving...' : 'Save Group'}</button>
                </div>
            </form>
        </Modal>
    );
};

export default GroupFormModal;