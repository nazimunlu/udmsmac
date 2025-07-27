import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import Modal from './Modal';
import { FormInput, FormSelect } from './Form';
import CustomDatePicker from './CustomDatePicker';
import CustomTimePicker from './CustomTimePicker';
import { useAppContext } from '../contexts/AppContext';
import { useNotification } from '../contexts/NotificationContext';
import apiClient from '../apiClient';
import { Icon, ICONS } from './Icons';

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
        groupName: groupToEdit?.groupName || '',
        schedule: groupToEdit?.schedule || { days: [], startTime: '10:00', endTime: '12:00' },
        color: groupToEdit?.color || vibrantColors[Math.floor(Math.random() * vibrantColors.length)],
        startDate: groupToEdit?.startDate ? new Date(groupToEdit.startDate).toISOString().split('T')[0] : '',
        programLength: groupToEdit?.programLength || '12', // Default to 12 weeks
        isArchived: groupToEdit?.isArchived || false,
    }), [groupToEdit]);

    const [formData, setFormData] = useState(getInitialData());
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if(isOpen) setFormData(getInitialData());
    }, [isOpen, getInitialData]);

    // Recalculate end date whenever relevant fields change
    useEffect(() => {
        const { startDate, programLength, schedule } = formData;
        if (startDate && programLength && schedule.days && schedule.days.length > 0) {
            const calculatedEndDate = calculateEndDate(startDate, programLength, schedule);
            setFormData(prev => ({ ...prev, endDate: calculatedEndDate }));
        }
    }, [formData.startDate, formData.programLength, formData.schedule.days, formData.schedule.startTime, formData.schedule.endTime]);

    // Helper function to calculate end date based on schedule and program length
    const calculateEndDate = (startDate, programLength, schedule) => {
        if (!startDate || !programLength || !schedule.days || schedule.days.length === 0) {
            return null;
        }

        const start = new Date(startDate);
        const dayMap = {
            'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
        };
        const scheduledDayNumbers = schedule.days.map(day => dayMap[day]);
        
        console.log('Calculating end date:', {
            startDate,
            programLength,
            scheduleDays: schedule.days,
            scheduledDayNumbers
        });
        
        // Calculate the end date by finding the last lesson of the program length weeks
        let currentDate = new Date(start);
        let weeksCompleted = 0;
        let lessonsInCurrentWeek = 0;
        let lastLessonDate = null;
        let totalLessons = 0;
        
        // Find the first lesson day (start date might not be a lesson day)
        while (!scheduledDayNumbers.includes(currentDate.getDay())) {
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        console.log('First lesson day:', currentDate.toISOString().split('T')[0]);
        
        // Now iterate through weeks until we reach the program length
        while (weeksCompleted < parseInt(programLength, 10)) {
            // Check if current date is a lesson day
            if (scheduledDayNumbers.includes(currentDate.getDay())) {
                lessonsInCurrentWeek++;
                lastLessonDate = new Date(currentDate);
                totalLessons++;
                console.log(`Week ${weeksCompleted + 1}, Lesson ${lessonsInCurrentWeek}: ${currentDate.toISOString().split('T')[0]}`);
                
                // If we've completed all lessons for this week, move to next week
                if (lessonsInCurrentWeek >= schedule.days.length) {
                    weeksCompleted++;
                    lessonsInCurrentWeek = 0;
                    console.log(`Completed week ${weeksCompleted}, total lessons so far: ${totalLessons}`);
                    
                    // If we haven't reached the program length, move to the next week's first lesson day
                    if (weeksCompleted < parseInt(programLength, 10)) {
                        // Find the next lesson day after the current week ends
                        let nextWeekDate = new Date(currentDate);
                        nextWeekDate.setDate(nextWeekDate.getDate() + 1);
                        
                        // Find the next scheduled lesson day
                        while (!scheduledDayNumbers.includes(nextWeekDate.getDay())) {
                            nextWeekDate.setDate(nextWeekDate.getDate() + 1);
                        }
                        currentDate = nextWeekDate;
                        continue; // Skip the automatic date increment below
                    }
                }
            }
            
            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // The end date should be the last lesson date found
        const result = lastLessonDate ? lastLessonDate.toISOString().split('T')[0] : null;
        console.log('End date calculation result:', {
            endDate: result,
            totalLessons,
            totalWeeks: weeksCompleted
        });
        
        return result;
    };

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
            // Calculate end date based on schedule and program length
            const { programLength, schedule } = formData;
            if (value && programLength && schedule.days.length > 0) {
                const calculatedEndDate = calculateEndDate(value, programLength, schedule);
                setFormData(prev => ({ ...prev, endDate: calculatedEndDate }));
            } else {
                // Fallback to simple calculation if no schedule
                const startDate = new Date(value);
                const endDate = new Date(startDate.getTime() + 12 * 7 * 24 * 60 * 60 * 1000);
                setFormData(prev => ({ ...prev, endDate: endDate.toISOString().split('T')[0] }));
            }
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

        const { startDate, programLength, schedule } = formData;
        let calculatedEndDate = null;

        if (startDate && programLength && schedule.days.length > 0) {
            calculatedEndDate = calculateEndDate(startDate, programLength, schedule);
        }

        const dataToSave = {
            groupName: formData.groupName,
            schedule: formData.schedule,
            color: formData.color,
            startDate: formData.startDate,
            endDate: calculatedEndDate,
            programLength: formData.programLength,
            isArchived: formData.isArchived,
        };

        try {
            // Check for duplicate schedules (only for new groups)
            if (!groupToEdit) {
                const allGroups = await apiClient.getAll('groups');
                const activeGroups = allGroups.filter(g => !g.isArchived);
                
                // Check for exact schedule matches
                const hasDuplicateSchedule = activeGroups.some(existingGroup => {
                    const existingSchedule = existingGroup.schedule;
                    const newSchedule = formData.schedule;
                    
                    // Check if days and times match exactly
                    return existingSchedule.days.length === newSchedule.days.length &&
                           existingSchedule.days.every(day => newSchedule.days.includes(day)) &&
                           existingSchedule.startTime === newSchedule.startTime &&
                           existingSchedule.endTime === newSchedule.endTime;
                });
                
                // Check for time overlaps on same days
                const hasTimeOverlap = activeGroups.some(existingGroup => {
                    const existingSchedule = existingGroup.schedule;
                    const newSchedule = formData.schedule;
                    
                    // Check if there are any overlapping days
                    const overlappingDays = existingSchedule.days.filter(day => newSchedule.days.includes(day));
                    
                    if (overlappingDays.length === 0) return false;
                    
                    // Check for time overlap
                    const existingStart = existingSchedule.startTime;
                    const existingEnd = existingSchedule.endTime;
                    const newStart = newSchedule.startTime;
                    const newEnd = newSchedule.endTime;
                    
                    // Convert times to minutes for easier comparison
                    const toMinutes = (time) => {
                        const [hours, minutes] = time.split(':').map(Number);
                        return hours * 60 + minutes;
                    };
                    
                    const existingStartMin = toMinutes(existingStart);
                    const existingEndMin = toMinutes(existingEnd);
                    const newStartMin = toMinutes(newStart);
                    const newEndMin = toMinutes(newEnd);
                    
                    // Check if times overlap
                    return (newStartMin < existingEndMin && newEndMin > existingStartMin);
                });
                
                if (hasDuplicateSchedule) {
                    const conflictingGroup = activeGroups.find(existingGroup => {
                        const existingSchedule = existingGroup.schedule;
                        const newSchedule = formData.schedule;
                        
                        return existingSchedule.days.length === newSchedule.days.length &&
                               existingSchedule.days.every(day => newSchedule.days.includes(day)) &&
                               existingSchedule.startTime === newSchedule.startTime &&
                               existingSchedule.endTime === newSchedule.endTime;
                    });
                    
                    showNotification(`A group with this exact schedule already exists: "${conflictingGroup.groupName}". Please choose different days or times.`, 'error');
                    setIsSubmitting(false);
                    return;
                }
                
                if (hasTimeOverlap) {
                    const conflictingGroup = activeGroups.find(existingGroup => {
                        const existingSchedule = existingGroup.schedule;
                        const newSchedule = formData.schedule;
                        
                        const overlappingDays = existingSchedule.days.filter(day => newSchedule.days.includes(day));
                        if (overlappingDays.length === 0) return false;
                        
                        const existingStart = existingSchedule.startTime;
                        const existingEnd = existingSchedule.endTime;
                        const newStart = newSchedule.startTime;
                        const newEnd = newSchedule.endTime;
                        
                        const toMinutes = (time) => {
                            const [hours, minutes] = time.split(':').map(Number);
                            return hours * 60 + minutes;
                        };
                        
                        const existingStartMin = toMinutes(existingStart);
                        const existingEndMin = toMinutes(existingEnd);
                        const newStartMin = toMinutes(newStart);
                        const newEndMin = toMinutes(newEnd);
                        
                        return (newStartMin < existingEndMin && newEndMin > existingStartMin);
                    });
                    
                    showNotification(`Time overlap detected with group "${conflictingGroup.groupName}". Please choose different times or days.`, 'error');
                    setIsSubmitting(false);
                    return;
                }
            }
            
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
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={groupToEdit ? "Edit Group" : "Add New Group"}
            headerStyle={{ backgroundColor: '#2563EB' }}
        >
            <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                    <FormInput label="Group Name" name="groupName" value={formData.groupName} onChange={handleChange} required />
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Group Color</label>
                        <div className="flex items-center space-x-3">
                            <div className="relative">
                                <input
                                    type="color"
                                    name="color"
                                    value={formData.color}
                                    onChange={handleChange}
                                    className="w-12 h-12 rounded-xl border-2 border-gray-200 cursor-pointer shadow-sm hover:shadow-md transition-shadow duration-200"
                                    title="Choose group color"
                                />
                                <div 
                                    className="absolute inset-0 rounded-xl border-2 border-white shadow-inner pointer-events-none"
                                    style={{ backgroundColor: formData.color }}
                                ></div>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                    <div 
                                        className="w-4 h-4 rounded-full border border-gray-300"
                                        style={{ backgroundColor: formData.color }}
                                    ></div>
                                    <span className="text-sm font-medium text-gray-900">{formData.color.toUpperCase()}</span>
                                </div>
                                <p className="text-xs text-gray-500">For calendar and dashboard display</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <CustomDatePicker label="Start Date" name="startDate" value={formData.startDate} onChange={(e) => handleDateChange('startDate', e.target.value)} />
                        <FormSelect label="Program Length (Weeks)" name="programLength" value={formData.programLength} onChange={handleChange}>
                            {[4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48].map(length => (
                                <option key={length} value={length}>{length} Weeks</option>
                            ))}
                        </FormSelect>
                    </div>
                    
                    {/* Display calculated end date */}
                    {formData.endDate && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center">
                                <Icon path={ICONS.CALENDAR} className="w-5 h-5 text-blue-600 mr-2" />
                                <div>
                                    <h4 className="text-sm font-medium text-blue-900">Calculated End Date</h4>
                                    <p className="text-sm text-blue-800">
                                        {new Date(formData.endDate).toLocaleDateString('tr-TR', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </p>
                                    <p className="text-xs text-blue-600 mt-1">
                                        Based on {formData.programLength} weeks, {formData.schedule.days.length} lessons per week ({formData.schedule.days.join(', ')})
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
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