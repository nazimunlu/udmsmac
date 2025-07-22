import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import Modal from './Modal';
import { FormInput, FormSelect } from './Form';
import CustomDatePicker from './CustomDatePicker';
import CustomTimePicker from './CustomTimePicker';
import { useAppContext } from '../contexts/AppContext';
import { useNotification } from '../contexts/NotificationContext';
import apiClient from '../apiClient';

const GroupFormModal = ({ isOpen, onClose, groupToEdit }) => {
    const { fetchData } = useAppContext();
    const { showNotification } = useNotification();
    const timeOptions = [];
    for (let h = 9; h <= 23; h++) {
        timeOptions.push(`${h.toString().padStart(2, '0')}:00`);
        timeOptions.push(`${h.toString().padStart(2, '0')}:30`);
    }
    timeOptions.push('00:00');

    const vibrantColors = [
        '#FF6B6B', // Red-Orange
        '#4ECDC4', // Turquoise
        '#45B7D1', // Sky Blue
        '#FED766', // Yellow
        '#FFA07A', // Light Salmon
        '#98D8AA', // Mint Green
        '#A28089', // Muted Rose
        '#6A057F', // Deep Purple
        '#FFD166', // Sunny Yellow
        '#06D6A0', // Emerald
        '#1B9AAA', // Teal
        '#EF476F', // Raspberry
        '#073B4C', // Dark Teal (for contrast)
        '#F78C6B', // Coral
        '#70C1B7', // Seafoam Green
    ];

    const getInitialData = useCallback(() => ({
        group_name: groupToEdit?.group_name || '',
        schedule: groupToEdit?.schedule || { days: [], startTime: '10:00', endTime: '12:00' },
        color: groupToEdit?.color || vibrantColors[Math.floor(Math.random() * vibrantColors.length)],
        start_date: groupToEdit?.start_date ? new Date(groupToEdit.start_date).toISOString().split('T')[0] : '',
        program_length: groupToEdit?.program_length || '12', // Default to 12 weeks
        is_archived: groupToEdit?.is_archived || false,
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

        const { start_date, program_length, schedule } = formData;
        let calculatedEndDate = null;

        if (start_date && program_length && schedule.days.length > 0) {
            const start = new Date(start_date);
            let current = new Date(start);
            let weeksCounted = 0;
            let daysInWeek = 0;

            const dayMap = {
                'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
            };
            const scheduledDayNumbers = schedule.days.map(day => dayMap[day]);

            while (weeksCounted < parseInt(program_length, 10)) {
                if (scheduledDayNumbers.includes(current.getDay())) {
                    daysInWeek++;
                }
                current.setDate(current.getDate() + 1);
                if (current.getDay() === dayMap['Sun']) { // Assuming week starts on Sunday for counting weeks
                    weeksCounted++;
                    daysInWeek = 0; // Reset for next week
                }
            }
            // Go back one day to get the last day of the last counted week
            current.setDate(current.getDate() - 1);
            calculatedEndDate = current;
        }

        const dataToSave = {
            ...formData,
            is_archived: formData.is_archived || false,
            schedule: JSON.stringify(formData.schedule),
            start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
            endDate: calculatedEndDate ? calculatedEndDate.toISOString() : null,
        };

        try {
            if (groupToEdit) {
                await apiClient.update('groups', groupToEdit.id, dataToSave);
            } else {
                await apiClient.create('groups', dataToSave);
                showNotification('Group added successfully!', 'success');
            }
            fetchData();
            onClose();
        } catch (error) {
            console.error("Error saving group:", error);
            showNotification('Failed to save group.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={groupToEdit ? "Edit Group" : "Add New Group"}>
            <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                    <FormInput label="Group Name" name="group_name" value={formData.group_name} onChange={handleChange} required />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <CustomDatePicker label="Start Date" name="start_date" value={formData.start_date} onChange={(e) => handleDateChange('start_date', e.target.value)} />
                        <FormSelect label="Program Length (Weeks)" name="program_length" value={formData.program_length} onChange={handleChange}>
                            {[4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48].map(length => (
                                <option key={length} value={length}>{length} Weeks</option>
                            ))}
                        </FormSelect>
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