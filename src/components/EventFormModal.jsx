import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useNotification } from '../contexts/NotificationContext';
import Modal from './Modal';
import { FormInput, FormSection, FormSelect } from './Form';
import CustomDatePicker from './CustomDatePicker';
import CustomTimePicker from './CustomTimePicker';
import { useAppContext } from '../contexts/AppContext';
import apiClient from '../apiClient';
import { Icon, ICONS } from './Icons';

const EventFormModal = ({ isOpen, onClose, eventToEdit }) => {
    const { showNotification } = useNotification();
    const { fetchData, events, lessons } = useAppContext();
    
    const timeOptions = [];
    for (let h = 9; h <= 23; h++) {
        timeOptions.push(`${h.toString().padStart(2, '0')}:00`);
        if (h < 23) timeOptions.push(`${h.toString().padStart(2, '0')}:30`);
    }

    // Event categories with colors
    const eventCategories = [
        { value: 'meeting', label: 'Meeting', color: '#3B82F6', icon: ICONS.USERS },
        { value: 'exam', label: 'Exam', color: '#EF4444', icon: ICONS.CHECK },
        { value: 'celebration', label: 'Celebration', color: '#EC4899', icon: ICONS.CAKE },
        { value: 'maintenance', label: 'Maintenance', color: '#8B5CF6', icon: ICONS.SETTINGS },
        { value: 'other', label: 'Other', color: '#6B7280', icon: ICONS.CALENDAR },
    ];



    const getSafeDateString = (dateSource) => {
        if (dateSource) {
            return new Date(dateSource).toISOString().split('T')[0];
        }
        return new Date().toISOString().split('T')[0];
    };

    const getSafeTimeString = (dateSource) => {
        if (dateSource) {
            return new Date(dateSource).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        }
        return '09:00';
    };

    const [formData, setFormData] = useState({
        eventName: '',
        category: 'meeting',
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '10:00',
        isAllDay: false,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [overlappingEvents, setOverlappingEvents] = useState([]);
    const [selectedConflicts, setSelectedConflicts] = useState([]);
    
    useEffect(() => {
        if (isOpen) {
            if (eventToEdit) {
                // Editing existing event
                setFormData({
                    eventName: eventToEdit.eventName || '',
                    category: eventToEdit.category || 'meeting',
                    date: getSafeDateString(eventToEdit.startTime),
                    startTime: getSafeTimeString(eventToEdit.startTime),
                    endTime: getSafeTimeString(eventToEdit.endTime),
                    isAllDay: eventToEdit.isAllDay || false,
                });
            } else {
                // Creating new event
                setFormData({
                    eventName: '',
                    category: 'meeting',
                    date: new Date().toISOString().split('T')[0],
                    startTime: '09:00',
                    endTime: '10:00',
                    isAllDay: false,
                });
            }
            // Clear overlapping events when modal opens
            setOverlappingEvents([]);
            setSelectedConflicts([]);
        }
    }, [isOpen, eventToEdit]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const getSelectedCategory = () => {
        return eventCategories.find(cat => cat.value === formData.category) || eventCategories[0];
    };

    // Function to handle conflict selection
    const handleConflictSelection = (conflictId, isSelected) => {
        if (isSelected) {
            setSelectedConflicts(prev => [...prev, conflictId]);
        } else {
            setSelectedConflicts(prev => prev.filter(id => id !== conflictId));
        }
    };

    // Function to check for overlapping events and lessons
    const checkForOverlappingItems = useCallback((startDateTime, endDateTime, currentEventId = null) => {
        const conflicts = [];
        
        // Check for overlapping events
        events.forEach(event => {
            // Skip the current event if editing
            if (currentEventId && event.id === currentEventId) {
                return;
            }

            const eventStart = new Date(event.startTime);
            const eventEnd = new Date(event.endTime);

            // Check for overlap: new event starts before existing event ends AND new event ends after existing event starts
            if (startDateTime < eventEnd && endDateTime > eventStart) {
                conflicts.push({
                    ...event,
                    type: 'event',
                    displayName: event.eventName,
                    category: event.category
                });
            }
        });

        // Check for overlapping lessons
        lessons.forEach(lesson => {
            // Create lesson datetime objects
            const lessonDate = new Date(lesson.lessonDate);
            const lessonStartTime = new Date(`${lesson.lessonDate}T${lesson.startTime || '09:00'}:00`);
            const lessonEndTime = new Date(`${lesson.lessonDate}T${lesson.endTime || '10:00'}:00`);

            // Check for overlap
            if (startDateTime < lessonEndTime && endDateTime > lessonStartTime) {
                conflicts.push({
                    ...lesson,
                    type: 'lesson',
                    displayName: lesson.topic,
                    category: 'lesson'
                });
            }
        });

        return conflicts;
    }, [events, lessons]);

    // Function to delete selected conflicts
    const deleteSelectedConflicts = async () => {
        const conflictsToDelete = overlappingEvents.filter(item => selectedConflicts.includes(item.id));
        
        for (const conflict of conflictsToDelete) {
            try {
                if (conflict.type === 'event') {
                    await apiClient.delete('events', conflict.id);
                } else if (conflict.type === 'lesson') {
                    await apiClient.delete('lessons', conflict.id);
                }
            } catch (error) {
                console.error(`Error deleting ${conflict.type}:`, error);
                showNotification(`Failed to delete ${conflict.type}.`, 'error');
            }
        }
        
        showNotification(`Successfully deleted ${conflictsToDelete.length} conflicting item(s).`, 'success');
        fetchData();
        setOverlappingEvents([]);
        setSelectedConflicts([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        const { eventName, category, date, startTime, endTime, isAllDay } = formData;
        
        // Handle all-day events properly
        let startDateTime, endDateTime;
        
        if (isAllDay) {
            // For all-day events, set start to 00:00 and end to 23:59 of the selected date
            const [year, month, day] = date.split('-').map(Number);
            startDateTime = new Date(year, month - 1, day, 0, 0, 0);
            endDateTime = new Date(year, month - 1, day, 23, 59, 59);
        } else {
            // For timed events, use the selected times
            const [startHour, startMinute] = startTime.split(':').map(Number);
            const [endHour, endMinute] = endTime.split(':').map(Number);
            const [year, month, day] = date.split('-').map(Number);
            
            startDateTime = new Date(year, month - 1, day, startHour, startMinute);
            endDateTime = new Date(year, month - 1, day, endHour, endMinute);
        }

        // Check for overlapping events and lessons (only if not already showing warning)
        if (overlappingEvents.length === 0) {
            const overlapping = checkForOverlappingItems(startDateTime, endDateTime, eventToEdit?.id);
            
            if (overlapping.length > 0) {
                setOverlappingEvents(overlapping);
                const eventCount = overlapping.filter(item => item.type === 'event').length;
                const lessonCount = overlapping.filter(item => item.type === 'lesson').length;
                let message = `Warning: This event overlaps with `;
                if (eventCount > 0 && lessonCount > 0) {
                    message += `${eventCount} event(s) and ${lessonCount} lesson(s).`;
                } else if (eventCount > 0) {
                    message += `${eventCount} existing event(s).`;
                } else {
                    message += `${lessonCount} existing lesson(s).`;
                }
                message += ` Please review the conflicts below.`;
                showNotification(message, 'warning');
                return;
            }
        } else {
            // If we have overlapping events but some are selected for deletion, proceed
            const remainingConflicts = overlappingEvents.filter(item => !selectedConflicts.includes(item.id));
            if (remainingConflicts.length > 0) {
                showNotification(`Please resolve all conflicts or select "Create Event Anyway" to proceed.`, 'warning');
                return;
            }
        }

        const dataToSave = {
            eventName,
            category,
            startTime: startDateTime.toISOString(),
            endTime: endDateTime.toISOString(),
            isAllDay,
        };

        console.log('Saving event data:', dataToSave); // Debug log

        try {
            if (eventToEdit) {
                await apiClient.update('events', eventToEdit.id, dataToSave);
                showNotification('Event updated successfully!', 'success');
            } else {
                await apiClient.create('events', dataToSave);
                showNotification('Event logged successfully!', 'success');
            }
            fetchData();
            onClose();
        } catch (error) {
            console.error("Error saving event:", error);
            console.error("Error details:", error.message);
            console.error("Error response:", error.response);
            console.error("Error data:", error.data);
            console.error("Error status:", error.status);
            
            // Show more specific error message
            let errorMessage = 'Failed to save event.';
            if (error.message) {
                errorMessage += ` ${error.message}`;
            }
            if (error.data && error.data.message) {
                errorMessage += ` ${error.data.message}`;
            }
            showNotification(errorMessage, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedCategory = getSelectedCategory();

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={eventToEdit ? "Edit Event" : "Log New Event"}
            headerStyle={{ backgroundColor: '#10B981' }}
        >
            <form onSubmit={handleSubmit}>
                <FormSection title="Event Details">
                    <div className="sm:col-span-6">
                        <FormInput label="Event Name" name="eventName" value={formData.eventName} onChange={handleChange} required />
                    </div>
                    
                    <div className="sm:col-span-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {eventCategories.map(category => (
                                <button
                                    key={category.value}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, category: category.value }))}
                                    className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center ${
                                        formData.category === category.value
                                            ? 'border-gray-400 bg-gray-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div 
                                        className="w-8 h-8 rounded-full flex items-center justify-center mb-2"
                                        style={{ backgroundColor: category.color }}
                                    >
                                        <Icon path={category.icon} className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="text-xs font-medium text-gray-700">{category.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="sm:col-span-3">
                        <CustomDatePicker label="Date" name="date" value={formData.date} onChange={handleChange} />
                    </div>
                    <div className="sm:col-span-3 flex items-center pt-7">
                        <input type="checkbox" id="isAllDay" name="isAllDay" checked={formData.isAllDay} onChange={handleChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                        <label htmlFor="isAllDay" className="ml-2 block text-sm text-gray-900">All-day event</label>
                    </div>
                    {!formData.isAllDay && (
                        <>
                            <div className="sm:col-span-3">
                                <CustomTimePicker label="Start Time" name="startTime" value={formData.startTime} onChange={handleChange} options={timeOptions} />
                            </div>
                            <div className="sm:col-span-3">
                                <CustomTimePicker label="End Time" name="endTime" value={formData.endTime} onChange={handleChange} options={timeOptions} />
                            </div>
                        </>
                    )}
                </FormSection>

                {/* Event Preview */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Event Preview</h4>
                    <div className="flex items-center space-x-3">
                        <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: selectedCategory.color }}
                        >
                            <Icon path={selectedCategory.icon} className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-gray-800">{formData.eventName || 'Event Name'}</p>
                            <p className="text-sm text-gray-500">
                                {formData.isAllDay ? 'All Day' : `${formData.startTime} - ${formData.endTime}`} • {selectedCategory.label}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Overlapping Events Warning */}
                {overlappingEvents.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                        <div className="flex items-start">
                            <Icon path={ICONS.WARNING} className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                            <div className="flex-1">
                                <h4 className="text-sm font-medium text-yellow-800 mb-2">
                                    Overlapping Events Detected
                                </h4>
                                <p className="text-sm text-yellow-700 mb-3">
                                    This event conflicts with the following existing items. <strong>Check the boxes next to the items you want to delete</strong> to resolve conflicts:
                                </p>
                                <div className="space-y-2">
                                    {overlappingEvents.map((item, index) => (
                                        <div key={item.id} className="flex items-center justify-between bg-white rounded-md p-3 border border-yellow-200">
                                            <div className="flex items-center space-x-3 flex-1">
                                                <div 
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                                                    style={{ 
                                                        backgroundColor: item.type === 'event' 
                                                            ? eventCategories.find(cat => cat.value === item.category)?.color || '#6B7280'
                                                            : '#3B82F6' // Blue for lessons
                                                    }}
                                                >
                                                    <Icon 
                                                        path={item.type === 'event' 
                                                            ? eventCategories.find(cat => cat.value === item.category)?.icon || ICONS.CALENDAR
                                                            : ICONS.LESSON
                                                        } 
                                                        className="w-4 h-4 text-white" 
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-gray-800">
                                                        {item.displayName}
                                                        <span className="ml-2 text-xs text-gray-500 capitalize">
                                                            ({item.type})
                                                        </span>
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {item.type === 'event' 
                                                            ? `${new Date(item.startTime).toLocaleDateString()} • ${new Date(item.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})} - ${new Date(item.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}`
                                                            : `${new Date(item.lessonDate).toLocaleDateString()} • ${item.startTime || '09:00'} - ${item.endTime || '10:00'}`
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center ml-3">
                                                <input
                                                    type="checkbox"
                                                    id={`conflict-${item.id}`}
                                                    checked={selectedConflicts.includes(item.id)}
                                                    onChange={(e) => handleConflictSelection(item.id, e.target.checked)}
                                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                />
                                                <label htmlFor={`conflict-${item.id}`} className="ml-2 text-sm text-gray-700">
                                                    Delete
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 flex space-x-3">
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            setOverlappingEvents([]);
                                            setSelectedConflicts([]);
                                        }} 
                                        className="px-4 py-2 text-sm rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 border border-gray-300"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={deleteSelectedConflicts}
                                        disabled={isSubmitting || selectedConflicts.length === 0}
                                        className="px-4 py-2 text-sm rounded-md text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed"
                                        title={selectedConflicts.length === 0 ? "Select items to delete first" : ""}
                                    >
                                        {isSubmitting ? 'Deleting...' : selectedConflicts.length === 0 ? 'Select Items to Delete' : `Delete ${selectedConflicts.length} Selected`}
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={isSubmitting}
                                        className="px-4 py-2 text-sm rounded-md text-white bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? 'Creating Event...' : 'Create Event Anyway'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end pt-8 mt-8 border-t border-gray-200 space-x-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed">{isSubmitting ? 'Saving...' : 'Save Event'}</button>
                </div>
            </form>
        </Modal>
    );
};

export default EventFormModal;
