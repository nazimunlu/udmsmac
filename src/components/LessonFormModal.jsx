import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Modal from './Modal';
import { FormInput, FormSection } from './Form';
import CustomDatePicker from './CustomDatePicker';
import CustomTimePicker from './CustomTimePicker';
import { Icon, ICONS } from './Icons';
import { useAppContext } from '../contexts/AppContext';
import { useNotification } from '../contexts/NotificationContext';
import apiClient from '../apiClient';
import { sanitizeFileName } from '../utils/caseConverter';

const LessonFormModal = ({ isOpen, onClose, group, lessonToEdit, student, onLessonSaved }) => {
    const { fetchData, lessons, events } = useAppContext();
    const { showNotification } = useNotification();
    
    // Time options for lesson scheduling
    const timeOptions = [];
    for (let h = 8; h <= 23; h++) {
        timeOptions.push(`${h.toString().padStart(2, '0')}:00`);
        if (h < 23) timeOptions.push(`${h.toString().padStart(2, '0')}:30`);
    }
    
    const [formData, setFormData] = useState({
        date: '',
        topic: '',
        startTime: '',
        endTime: '',
        materialUrl: '',
        materialName: '',
    });
    const [file, setFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [overlappingItems, setOverlappingItems] = useState([]);
    const [selectedConflicts, setSelectedConflicts] = useState([]);

    useEffect(() => {
        if (lessonToEdit) {
            setFormData({
                date: new Date(lessonToEdit.lessonDate).toISOString().split('T')[0],
                topic: lessonToEdit.topic,
                startTime: lessonToEdit.originalStartTime || lessonToEdit.startTime || '09:00',
                endTime: lessonToEdit.originalEndTime || lessonToEdit.endTime || '10:00',
                materialUrl: lessonToEdit.materialUrl || '',
                materialName: lessonToEdit.materialName || ''
            });
        } else {
            const schedule = student?.tutoringDetails?.schedule || group?.schedule;
            setFormData({
                date: new Date().toISOString().split('T')[0],
                topic: '',
                startTime: schedule?.startTime || '09:00',
                endTime: schedule?.endTime || '10:00',
                materialUrl: '',
                materialName: ''
            });
        }
    }, [lessonToEdit, isOpen, group, student]);

    // Debug useEffect to check if events and lessons are loaded
    useEffect(() => {
        console.log('LessonFormModal - Data loaded:', {
            lessonsCount: lessons.length,
            eventsCount: events.length,
            events: events.slice(0, 3).map(e => ({ id: e.id, name: e.eventName, start: e.startTime, end: e.endTime }))
        });
    }, [lessons, events]);

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const uploadFile = async (file, path) => {
        try {
            const { data, error } = await supabase.storage.from('udms').upload(path, file);
            if (error) throw error;
            return supabase.storage.from('udms').getPublicUrl(path).data.publicUrl;
        } catch (error) {
            console.error('File upload failed:', error);
            throw error;
        }
    };

    const generateFileName = (studentName, lessonTopic, lessonDate, originalFileName) => {
        const sanitizedName = studentName.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ\s]/g, '').trim().replace(/\s+/g, '_');
        const sanitizedTopic = lessonTopic.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ\s]/g, '').trim().replace(/\s+/g, '_');
        const fileExtension = originalFileName.split('.').pop().toLowerCase();
        const dateStr = lessonDate ? `_${lessonDate.replace(/-/g, '')}` : '';
        return `${sanitizedName}_${sanitizedTopic}${dateStr}_Material.${fileExtension}`;
    };

    const checkForOverlappingItems = (startDateTime, endDateTime, currentLessonId = null) => {
        const conflicts = [];
        
        console.log('Checking for overlaps:', {
            startDateTime: startDateTime.toISOString(),
            endDateTime: endDateTime.toISOString(),
            currentLessonId,
            totalLessons: lessons.length,
            totalEvents: events.length
        });
        
        // Check for overlapping lessons
        lessons.forEach(lesson => {
            if (currentLessonId && lesson.id === currentLessonId) return;
            
            const lessonStartTime = new Date(`${lesson.lessonDate}T${lesson.startTime || '09:00'}:00`);
            const lessonEndTime = new Date(`${lesson.lessonDate}T${lesson.endTime || '10:00'}:00`);
            
            if (startDateTime < lessonEndTime && endDateTime > lessonStartTime) {
                console.log('Found overlapping lesson:', lesson);
                conflicts.push({ 
                    ...lesson, 
                    type: 'lesson', 
                    displayName: lesson.topic, 
                    category: 'lesson',
                    startTime: lesson.startTime,
                    endTime: lesson.endTime
                });
            }
        });
        
        // Check for overlapping events
        events.forEach(event => {
            const eventStart = new Date(event.startTime);
            const eventEnd = new Date(event.endTime);
            
            // Normalize dates to the same day for comparison
            const lessonDate = new Date(startDateTime);
            const eventDate = new Date(eventStart);
            
            // Only check for overlaps if they're on the same day
            if (lessonDate.toDateString() === eventDate.toDateString()) {
                console.log('Checking event on same day:', {
                    eventName: event.eventName,
                    eventStart: eventStart.toISOString(),
                    eventEnd: eventEnd.toISOString(),
                    lessonStart: startDateTime.toISOString(),
                    lessonEnd: endDateTime.toISOString(),
                    overlaps: startDateTime < eventEnd && endDateTime > eventStart
                });
                
                if (startDateTime < eventEnd && endDateTime > eventStart) {
                    console.log('Found overlapping event:', event);
                    conflicts.push({ 
                        ...event, 
                        type: 'event', 
                        displayName: event.eventName, 
                        category: event.category 
                    });
                }
            }
        });
        
        console.log('Total conflicts found:', conflicts.length);
        return conflicts;
    };

    const handleConflictSelection = (itemId, isSelected) => {
        setSelectedConflicts(prev => 
            isSelected 
                ? [...prev, itemId]
                : prev.filter(id => id !== itemId)
        );
    };

    const deleteSelectedConflicts = async () => {
        const conflictsToDelete = overlappingItems.filter(item => selectedConflicts.includes(item.id));
        
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
        setOverlappingItems([]);
        setSelectedConflicts([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.date || !formData.topic) return;

        // Check for overlapping items
        const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`);
        const endDateTime = new Date(`${formData.date}T${formData.endTime}:00`);
        
        const conflicts = checkForOverlappingItems(startDateTime, endDateTime, lessonToEdit?.id);
        
        if (conflicts.length > 0 && overlappingItems.length === 0) {
            setOverlappingItems(conflicts);
            const eventCount = conflicts.filter(c => c.type === 'event').length;
            const lessonCount = conflicts.filter(c => c.type === 'lesson').length;
            
            let message = 'This lesson conflicts with the following existing items. Select the ones you want to delete to resolve conflicts:';
            if (eventCount > 0 && lessonCount > 0) {
                message = `This lesson conflicts with ${eventCount} event(s) and ${lessonCount} lesson(s). Select the ones you want to delete to resolve conflicts:`;
            } else if (eventCount > 0) {
                message = `This lesson conflicts with ${eventCount} event(s). Select the ones you want to delete to resolve conflicts:`;
            } else if (lessonCount > 0) {
                message = `This lesson conflicts with ${lessonCount} lesson(s). Select the ones you want to delete to resolve conflicts:`;
            }
            
            showNotification(message, 'warning');
            return;
        }
        
        // If conflicts are already displayed, check if any remain unresolved
        if (overlappingItems.length > 0) {
            const remainingConflicts = overlappingItems.filter(item => !selectedConflicts.includes(item.id));
            if (remainingConflicts.length > 0) {
                showNotification('Please resolve all conflicts before saving.', 'error');
                return;
            }
        }

        setIsSubmitting(true);
        let materialUrl = lessonToEdit?.materialUrl || '';
        let materialName = lessonToEdit?.materialName || '';

        if (file) {
            const groupId = group?.id || student?.groupId;
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                showNotification('You must be logged in to upload materials.', 'error');
                setIsSubmitting(false);
                return;
            }
            
            // Get student name for file naming
            let studentName = 'Unknown';
            if (student) {
                studentName = student.fullName;
            } else if (group) {
                studentName = group.groupName;
            }
            
            const materialFileName = generateFileName(studentName, formData.topic, formData.date, file.name);
            const materialPath = `lesson_materials/${user.id}/${groupId}/${Date.now()}_${materialFileName}`;
            materialUrl = await uploadFile(file, materialPath);
            materialName = materialFileName;
        }

        const lessonData = {
            topic: formData.topic,
            lessonDate: formData.date,
            startTime: formData.startTime,
            endTime: formData.endTime,
            materialUrl,
            materialName,
            status: 'Incomplete'
        };

        if (group) {
            lessonData.groupId = group.id;
        } else if (student) {
            lessonData.groupId = student.groupId;
            lessonData.studentId = student.id;
        }

        try {
            if (lessonToEdit) {
                await apiClient.update('lessons', lessonToEdit.id, lessonData);
            } else {
                await apiClient.create('lessons', lessonData);
            }
            fetchData();
            if (onLessonSaved) onLessonSaved();
            setOverlappingItems([]);
            setSelectedConflicts([]);
            onClose();
        } catch (error) {
            console.error("Error saving lesson: ", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={lessonToEdit ? "Edit Lesson" : "Log New Lesson"}
            headerStyle={{ backgroundColor: '#2563EB' }}
        >
            <form onSubmit={handleSubmit}>
                <FormSection title="Lesson Details">
                    <div className="sm:col-span-6"><FormInput label="Topic" name="topic" value={formData.topic} onChange={(e) => setFormData({...formData, topic: e.target.value})} required /></div>
                    <div className="sm:col-span-2"><CustomDatePicker label="Date" name="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required /></div>
                    <div className="sm:col-span-2"><CustomTimePicker label="Start Time" name="startTime" value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})} options={timeOptions} /></div>
                    <div className="sm:col-span-2"><CustomTimePicker label="End Time" name="endTime" value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} options={timeOptions} /></div>
                </FormSection>
                <FormSection title="Lesson Material">
                    <div className="sm:col-span-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Upload Material</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                <Icon path={ICONS.UPLOAD} className="mx-auto h-12 w-12 text-gray-400" />
                                <div className="flex text-sm text-gray-600">
                                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                                        <span>{file ? file.name : (formData.material_name || 'Upload a file')}</span>
                                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} />
                                    </label>
                                </div>
                                <p className="text-xs text-gray-500">PDF, DOCX, etc. up to 10MB</p>
                            </div>
                        </div>
                    </div>
                </FormSection>

                {/* Overlapping Items Warning */}
                {overlappingItems.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                        <div className="flex items-start">
                            <Icon path={ICONS.WARNING} className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                            <div className="flex-1">
                                <h4 className="text-sm font-medium text-yellow-800 mb-2">
                                    This lesson conflicts with the following existing items. Select the ones you want to delete to resolve conflicts:
                                </h4>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {overlappingItems.map(item => (
                                        <div key={item.id} className="flex items-center justify-between bg-white rounded p-2 border">
                                            <div className="flex items-center flex-1">
                                                <input
                                                    type="checkbox"
                                                    id={`conflict-${item.id}`}
                                                    checked={selectedConflicts.includes(item.id)}
                                                    onChange={(e) => handleConflictSelection(item.id, e.target.checked)}
                                                    className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500 mr-3"
                                                />
                                                <div className="flex items-center flex-1">
                                                    {item.type === 'lesson' ? (
                                                        <Icon path={ICONS.LESSON} className="w-4 h-4 text-blue-600 mr-2" />
                                                    ) : (
                                                        <Icon path={ICONS.CALENDAR} className="w-4 h-4 text-green-600 mr-2" />
                                                    )}
                                                    <span className="text-sm font-medium text-gray-700">
                                                        {item.displayName}
                                                    </span>
                                                    <span className="text-xs text-gray-500 ml-2">
                                                        ({item.type})
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {item.type === 'lesson' 
                                                    ? `${item.startTime || '09:00'} - ${item.endTime || '10:00'}`
                                                    : item.startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false, timeZone: 'Europe/Istanbul'})
                                                }
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex space-x-2 mt-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setOverlappingItems([]);
                                            setSelectedConflicts([]);
                                        }}
                                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={deleteSelectedConflicts}
                                        disabled={selectedConflicts.length === 0}
                                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:bg-gray-100 disabled:text-gray-400"
                                    >
                                        Delete {selectedConflicts.length} Selected
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setOverlappingItems([]);
                                            setSelectedConflicts([]);
                                            handleSubmit({ preventDefault: () => {} });
                                        }}
                                        className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                                    >
                                        Create Lesson Anyway
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end pt-8 mt-8 border-t border-gray-200 space-x-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed">{isSubmitting ? 'Creating Lesson...' : 'Save Lesson'}</button>
                </div>
            </form>
        </Modal>
    );
};

export default LessonFormModal;
