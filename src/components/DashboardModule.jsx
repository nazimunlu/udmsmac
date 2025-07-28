import React, { useState, useEffect, useMemo, useContext } from 'react';
import { supabase } from '../supabaseClient';
import { Icon, ICONS } from './Icons';
import StudentFormModal from './StudentFormModal';
import EventFormModal from './EventFormModal';
import LessonFormModal from './LessonFormModal';
import ConfirmationModal from './ConfirmationModal';
import { useNotification } from '../contexts/NotificationContext';
import { formatDate } from '../utils/formatDate';
import WeeklyOverview from './WeeklyOverview';
import NotificationCard from '././NotificationCard';
import { useAppContext } from '../contexts/AppContext';
import SettingsModule from './SettingsModule';
import LoadingSpinner from './LoadingSpinner';
import TodoModule from './TodoModule';
import apiClient from '../apiClient';
import { generateAllLessons, generateGroupLessons, generateTutoringLessons } from '../utils/lessonCalculator';
import CustomDatePicker from './CustomDatePicker';
import CustomTimePicker from './CustomTimePicker';
import Modal from './Modal';
import { calculateLessonsWithinRange } from '../utils/lessonCalculator';

const DashboardModule = ({ setActiveModule }) => {
    const { students, groups, lessons, events, transactions, fetchData } = useAppContext();
    const { showNotification } = useNotification();
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [eventToEdit, setEventToEdit] = useState(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
    const [lessonToEdit, setLessonToEdit] = useState(null);
    const [todaysSchedule, setTodaysSchedule] = useState([]);
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [weekEvents, setWeekEvents] = useState([]);
    const [allEvents, setAllEvents] = useState({ lessons: [], events: [], birthdays: [] });
    const [duePayments, setDuePayments] = useState([]);
    const [isLessonGenerationModalOpen, setIsLessonGenerationModalOpen] = useState(false);
    const [lessonGenerationData, setLessonGenerationData] = useState({
        selectedGroups: [],
        selectedTutoringStudents: []
    });
    const [isGeneratingLessons, setIsGeneratingLessons] = useState(false);
    const [overlappingConflicts, setOverlappingConflicts] = useState([]);
    const [selectedConflictsToDelete, setSelectedConflictsToDelete] = useState([]);
    const [selectedConflictsToModify, setSelectedConflictsToModify] = useState([]);
    const [isModifyingConflicts, setIsModifyingConflicts] = useState(false);
    const [isDeleteAllLessonsModalOpen, setIsDeleteAllLessonsModalOpen] = useState(false);
    const [isDeletingAllLessons, setIsDeletingAllLessons] = useState(false);

    const [isSelectiveDeletionConfirmOpen, setIsSelectiveDeletionConfirmOpen] = useState(false);
    const [pendingDeletionData, setPendingDeletionData] = useState(null);
    const [lessonDeletionOptions, setLessonDeletionOptions] = useState({
        deleteAll: false,
        deleteByDateRange: false,
        deleteByGroup: false,
        deleteByStudent: false,
        deleteByStatus: false,
        selectedGroups: [],
        selectedStudents: [],
        selectedStatuses: [],
        startDate: '',
        endDate: ''
    });
    const [isLessonDeletionModalOpen, setIsLessonDeletionModalOpen] = useState(false);
    const [isDeletingLessons, setIsDeletingLessons] = useState(false);
    const [modifiedLessons, setModifiedLessons] = useState(new Map());

    // State for real-time clock
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const generateColorForString = (id) => {
        if (!id) return '#6B7280'; // default gray
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = id.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h = hash % 360;
        return `hsl(${h}, 60%, 70%)`;
    };

    useEffect(() => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
        
        // Use the same week calculation as WeeklyOverview component
        const weekStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)));
        const weekEnd = new Date(Date.UTC(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7));

        const allItems = [
            ...(lessons || []).map(l => {
                let eventName = l.topic;
                let color;
                if (l.studentId) {
                    const student = students.find(s => s.id === l.studentId);
                    if (student) {
                        eventName = `${student.fullName}: ${l.topic}`;
                        color = student.color || generateColorForString(student.id);
                    }
                } else if (l.groupId) {
                    const group = groups.find(g => g.id === l.groupId);
                    if (group) {
                        eventName = `${group.groupName}: ${l.topic}`;
                        color = group.color;
                    }
                }
                // For lessons, properly combine date with start time for accurate time calculations
                try {
                    const lessonDate = new Date(l.lessonDate);
                    const lessonStartTime = new Date(`${l.lessonDate}T${l.startTime || '09:00'}:00`);
                    
                    // Validate that both dates are valid
                    if (isNaN(lessonDate.getTime()) || isNaN(lessonStartTime.getTime())) {
                        console.warn('Invalid lesson data:', l);
                        // Return a fallback with current date/time
                        const fallbackDate = new Date();
                        return {...l, type: 'lesson', eventName, startTime: fallbackDate, originalStartTime: l.startTime, originalEndTime: l.endTime, color};
                    }
                    
                    return {...l, type: 'lesson', eventName, startTime: lessonStartTime, originalStartTime: l.startTime, originalEndTime: l.endTime, color};
                } catch (error) {
                    console.warn('Error creating lesson date:', error, l);
                    // Return a fallback with current date/time
                    const fallbackDate = new Date();
                    return {...l, type: 'lesson', eventName, startTime: fallbackDate, originalStartTime: l.startTime, originalEndTime: l.endTime, color};
                }
            }),
            ...(events || []).map(e => ({...e, type: 'event', eventName: e.eventName, startTime: new Date(e.startTime), endTime: e.endTime ? new Date(e.endTime) : null, isAllDay: e.isAllDay, color: 'rgb(16, 185, 129)', category: e.category})),
            ...(students || []).filter(s => s.birthDate).map(s => {
                const birthDate = new Date(s.birthDate);
                const today = new Date();
                const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                
                // Calculate this year's birthday
                let thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
                
                // If this year's birthday has passed, calculate next year's birthday
                let nextBirthday = thisYearBirthday;
                if (thisYearBirthday < todayStart) {
                    nextBirthday = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
                }
                
                return {
                    id: `bday-${s.id}`,
                    type: 'birthday',
                    eventName: `${s.fullName}'s Birthday`,
                    startTime: nextBirthday,
                    allDay: true,
                    color: 'rgb(236, 72, 153)',
                };
            })
        ];

        const eventsWithEndTimes = allItems.map(item => {
            let effectiveEndTime = item.startTime.getTime(); // Default to start time
            if (item.type === 'lesson') {
                // For lessons, calculate end time from original time strings
                try {
                    const lessonDate = item.startTime instanceof Date ? item.startTime : new Date(item.startTime);
                    // Check if the date is valid
                    if (isNaN(lessonDate.getTime())) {
                        console.warn('Invalid lesson date:', item);
                        effectiveEndTime = item.startTime.getTime();
                    } else {
                        const dateStr = lessonDate.toISOString().split('T')[0];
                        const endTime = new Date(`${dateStr}T${item.originalEndTime || '10:00'}:00`);
                        effectiveEndTime = endTime.getTime();
                    }
                } catch (error) {
                    console.warn('Error processing lesson date:', error, item);
                    effectiveEndTime = item.startTime.getTime();
                }
            } else if (item.type === 'event' && item.endTime) {
                effectiveEndTime = new Date(item.endTime).getTime();
            } else if (item.type === 'event' && !item.endTime) { // Default 1 hour for events if no endTime
                effectiveEndTime = item.startTime.getTime() + 1 * 60 * 60 * 1000;
            } else if (item.type === 'birthday') {
                effectiveEndTime = item.startTime.getTime() + 24 * 60 * 60 * 1000; // Birthdays are all day
            }
            return { ...item, effectiveEndTime };
        });

        setTodaysSchedule(eventsWithEndTimes.filter(item => {
            const isToday = item.startTime.getTime() >= todayStart.getTime() && item.startTime.getTime() <= todayEnd.getTime();
            if (item.allDay) {
                return isToday;
            }
            return item.effectiveEndTime >= now.getTime() && item.startTime.getTime() <= todayEnd.getTime();
        }).sort((a,b) => a.startTime.getTime() - b.startTime.getTime()));

        setUpcomingEvents(eventsWithEndTimes.filter(item => (item.type === 'event' || item.type === 'birthday' || item.type === 'lesson') && item.startTime.getTime() >= now.getTime() && item.startTime.getTime() <= now.getTime() + 30 * 24 * 60 * 60 * 1000).sort((a,b) => {
            // Put all-day events at the bottom
            if (a.isAllDay && !b.isAllDay) return 1;
            if (!a.isAllDay && b.isAllDay) return -1;
            // For non-all-day events, sort by start time
            return a.startTime.getTime() - b.startTime.getTime();
        }));

        const filteredWeekEvents = eventsWithEndTimes.filter(item => {
            // Include events that start within the week OR end within the week
            const startsInWeek = item.startTime.getTime() >= weekStart.getTime() && item.startTime.getTime() < weekEnd.getTime();
            const endsInWeek = item.effectiveEndTime >= weekStart.getTime() && item.effectiveEndTime < weekEnd.getTime();
            const spansWeek = item.startTime.getTime() < weekStart.getTime() && item.effectiveEndTime >= weekEnd.getTime();
            
            return (startsInWeek || endsInWeek || spansWeek) && item.type !== 'birthday' && !(item.type === 'event' && item.isAllDay);
        });
        setWeekEvents(filteredWeekEvents);

        const paymentsDue = [];
        (students || []).forEach(student => {
            // Parse installments if it's a string, otherwise use as is
            let installments = student.installments;
            if (typeof installments === 'string') {
                try {
                    installments = JSON.parse(installments);
                } catch (error) {
                    console.error('Error parsing installments for student:', student.id, error);
                    installments = [];
                }
            }
            
            // Ensure installments is an array
            if (!Array.isArray(installments)) {
                installments = [];
            }

            const overdueInstallments = installments.filter(
                inst => inst.status === 'Unpaid' && new Date(inst.dueDate) <= now
            );

            if (overdueInstallments && overdueInstallments.length > 0) {
                const totalDue = overdueInstallments.reduce((sum, inst) => sum + inst.amount, 0);
                const lastDueDate = overdueInstallments.reduce((latest, inst) => 
                    new Date(inst.dueDate) > new Date(latest.dueDate) ? inst : latest
                ).dueDate;

                paymentsDue.push({
                    id: `payment-${student.id}`,
                    message: `${student.fullName} has ${overdueInstallments.length} overdue payment(s) totaling ${Math.round(totalDue)} ₺.`,
                    details: `Last due date was ${formatDate(lastDueDate)}.`,
                    type: 'warning',
                    student_id: student.id,
                });
            }
        });
        setDuePayments(paymentsDue);

    }, [students, groups, lessons, events, transactions]);
    
    const EventIcon = ({type, color, category}) => {
        const iconMap = {
            lesson: { path: ICONS.LESSON, defaultColor: 'bg-blue-100 text-blue-600' },
            birthday: { path: ICONS.CAKE, defaultColor: 'bg-pink-100 text-pink-600' },
            event: { path: ICONS.CALENDAR, defaultColor: 'bg-green-100 text-green-600' },
        };
        
        // For events, use category color if available
        if (type === 'event' && category) {
            const categoryColors = {
                meeting: '#3B82F6',
                workshop: '#10B981',
                presentation: '#F59E0B',
                exam: '#EF4444',
                celebration: '#EC4899',
                maintenance: '#8B5CF6',
                other: '#6B7280',
            };
            const eventColor = categoryColors[category] || '#10B981';
            return <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-4" style={{ backgroundColor: eventColor }}><Icon path={ICONS.CALENDAR} className="w-5 h-5 text-white"/></div>;
        }
        
        const { path, defaultColor } = iconMap[type] || { path: ICONS.INFO, defaultColor: 'bg-gray-100 text-gray-600' };
        

        
        const style = color ? { backgroundColor: color, color: 'white' } : {};
        const className = color ? '' : defaultColor;

        return <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-4 ${className}`} style={style}><Icon path={path} className="w-5 h-5"/></div>
    };

    const getTimeRemaining = (item) => {
        const now = Date.now();
        const startTime = item.startTime.getTime();
        const endTime = item.effectiveEndTime;
        

    
        if (item.type === 'birthday') {
            const diff = startTime - now;
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
            return days > 0 ? `in ${days} day${days > 1 ? 's' : ''}` : 'Today';
        }
    
        if (now < startTime) {
            // Event is upcoming
            const diff = startTime - now;
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diff / (1000 * 60)) % 60);
    
            let parts = [];
            if (days > 0) parts.push(`${days}d`);
            if (hours > 0) parts.push(`${hours}h`);
            if (minutes > 0) parts.push(`${minutes}m`);

            if (parts.length === 0) return `starting now`;
            return `in ${parts.join(' ')}`;
        } else if (now >= startTime && now < endTime) {
            // Event is in progress
            const diff = endTime - now;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff / (1000 * 60)) % 60);
    
            let parts = [];
            if (hours > 0) parts.push(`${hours}h`);
            if (minutes > 0) parts.push(`${minutes}m`);

            if (parts.length === 0) return `ending now`;
            return `ends in ${parts.join(' ')}`;
        }
        return null;
    };

    const handleEditItem = (item) => {
        if (item.type === 'event') {
            setEventToEdit(item);
            setIsEventModalOpen(true);
        } else if (item.type === 'lesson') {
            setLessonToEdit(item);
            setIsLessonModalOpen(true);
        }
    };

    const openDeleteConfirmation = (item) => {
        setItemToDelete(item);
        setIsConfirmModalOpen(true);
    };

    const handleDeleteItem = async () => {
        if (!itemToDelete) return;
        
        const { type, id, eventName } = itemToDelete;
        const table = type === 'lesson' ? 'lessons' : 'events';

        try {
            await apiClient.delete(table, id);
            showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully!`, 'success');
            fetchData();
        } catch (error) {
            console.error(`Error deleting ${type}:`, error);
            showNotification(`Failed to delete ${type}.`, 'error');
        } finally {
            setIsConfirmModalOpen(false);
            setItemToDelete(null);
        }
    };

    const handleDelete = async (table, id) => {
        try {
            await apiClient.delete(table, id);
            fetchData();
        } catch (error) {
            console.error(`Error deleting from ${table}:`, error);
        }
    };

    // Lesson generation functions
    const handleLessonGenerationChange = (e) => {
        const { name, value, type, checked } = e.target;
        setLessonGenerationData(prev => ({ 
            ...prev, 
            [name]: type === 'checkbox' ? checked : value 
        }));
    };

    const handleGroupSelection = (groupId, isSelected) => {
        setLessonGenerationData(prev => ({
            ...prev,
            selectedGroups: isSelected 
                ? [...prev.selectedGroups, groupId]
                : prev.selectedGroups.filter(id => id !== groupId)
        }));
    };

    const handleTutoringStudentSelection = (studentId, isSelected) => {
        setLessonGenerationData(prev => ({
            ...prev,
            selectedTutoringStudents: isSelected 
                ? [...prev.selectedTutoringStudents, studentId]
                : prev.selectedTutoringStudents.filter(id => id !== studentId)
        }));
    };

    const selectAllGroups = () => {
        const eligibleGroups = groups.filter(g => !g.isArchived && g.schedule?.days?.length > 0);
        setLessonGenerationData(prev => ({
            ...prev,
            selectedGroups: eligibleGroups.map(g => g.id)
        }));
    };

    const selectAllTutoringStudents = () => {
        const eligibleStudents = students.filter(s => 
            s.isTutoring && !s.isArchived && s.tutoringDetails?.schedule?.days?.length > 0
        );
        setLessonGenerationData(prev => ({
            ...prev,
            selectedTutoringStudents: eligibleStudents.map(s => s.id)
        }));
    };

    const clearAllSelections = () => {
        setLessonGenerationData(prev => ({
            ...prev,
            selectedGroups: [],
            selectedTutoringStudents: []
        }));
    };

    const handleConflictSelection = (conflictId, isSelected) => {
        if (isSelected) {
            setSelectedConflictsToDelete(prev => [...prev, conflictId]);
        } else {
            setSelectedConflictsToDelete(prev => prev.filter(id => id !== conflictId));
        }
    };

    const handleConflictModificationSelection = (conflictId, isSelected) => {
        if (isSelected) {
            setSelectedConflictsToModify(prev => [...prev, conflictId]);
            // Remove from delete selection if it was there
            setSelectedConflictsToDelete(prev => prev.filter(id => id !== conflictId));
        } else {
            setSelectedConflictsToModify(prev => prev.filter(id => id !== conflictId));
        }
    };

    const modifySelectedConflicts = async () => {
        if (selectedConflictsToModify.length === 0) {
            showNotification('Please select conflicts to modify.', 'warning');
            return;
        }

        setIsModifyingConflicts(true);
        try {
            // Create a map of modified lessons
            const modifiedLessons = new Map();
            
            for (const conflictId of selectedConflictsToModify) {
                const conflict = overlappingConflicts.find(c => c.existingLesson.id === conflictId);
                if (conflict) {
                    // Modify the new lesson time to avoid conflict
                    const newLesson = conflict.newLesson;
                    const existingStart = new Date(conflict.existingLesson.startTime);
                    const existingEnd = new Date(conflict.existingLesson.endTime);
                    
                    // Try to find a better time slot
                    let newStartTime = new Date(existingEnd);
                    newStartTime.setHours(newStartTime.getHours() + 1);
                    
                    // If the new time would be after 22:00, try before the existing lesson
                    if (newStartTime.getHours() >= 22) {
                        newStartTime = new Date(existingStart);
                        newStartTime.setHours(newStartTime.getHours() - 2);
                    }
                    
                    // Ensure the time is between 8:00 and 22:00
                    if (newStartTime.getHours() < 8) {
                        newStartTime.setHours(8, 0, 0, 0);
                    }
                    
                    const newEndTime = new Date(newStartTime);
                    newEndTime.setHours(newEndTime.getHours() + 1);
                    
                    // Update the lesson time
                    const modifiedLesson = {
                        ...newLesson,
                        startTime: newStartTime.toTimeString().slice(0, 5),
                        endTime: newEndTime.toTimeString().slice(0, 5)
                    };
                    
                    modifiedLessons.set(conflictId, modifiedLesson);
                }
            }

            showNotification(`Successfully modified ${modifiedLessons.size} lesson(s) to avoid conflicts.`, 'success');
            
            // Store modified lessons for use in generation
            setModifiedLessons(modifiedLessons);
            
            // Clear conflicts and retry generation with modified lessons
            setOverlappingConflicts([]);
            setSelectedConflictsToDelete([]);
            setSelectedConflictsToModify([]);
            
            // Retry lesson generation with modified lessons
            handleGenerateLessonsWithModifications(modifiedLessons);
        } catch (error) {
            console.error('Error modifying conflicts:', error);
            showNotification('Failed to modify some conflicts. Please try again.', 'error');
        } finally {
            setIsModifyingConflicts(false);
        }
    };

    const deleteSelectedConflicts = async () => {
        if (selectedConflictsToDelete.length === 0) {
            showNotification('Please select conflicts to delete.', 'warning');
            return;
        }

        try {
            let deletedCount = 0;
            for (const conflictId of selectedConflictsToDelete) {
                const conflict = overlappingConflicts.find(c => c.existingLesson.id === conflictId);
                if (conflict) {
                    try {
                        if (conflict.existingLesson.type === 'event') {
                            await apiClient.delete('events', conflictId);
                        } else if (conflict.existingLesson.type === 'lesson') {
                            await apiClient.delete('lessons', conflictId);
                        }
                        deletedCount++;
                    } catch (error) {
                        console.error(`Error deleting ${conflict.existingLesson.type}:`, error);
                    }
                }
            }

            showNotification(`Successfully deleted ${deletedCount} conflicting item(s).`, 'success');
            fetchData();
            setOverlappingConflicts([]);
            setSelectedConflictsToDelete([]);
            
            // Retry lesson generation after conflicts are resolved
            handleGenerateLessons();
        } catch (error) {
            console.error('Error deleting conflicts:', error);
            showNotification('Failed to delete some conflicts. Please try again.', 'error');
        }
    };

    const handleGenerateLessons = async () => {
        setIsGeneratingLessons(true);
        try {
            // Filter groups and students based on selection
            const selectedGroupsData = groups.filter(g => 
                !g.isArchived && 
                g.schedule?.days?.length > 0 && 
                lessonGenerationData.selectedGroups.includes(g.id)
            );
            
            const selectedTutoringStudentsData = students.filter(s => 
                s.isTutoring && 
                !s.isArchived && 
                s.tutoringDetails?.schedule?.days?.length > 0 &&
                lessonGenerationData.selectedTutoringStudents.includes(s.id)
            );

            // Check if any groups or students are selected
            if (selectedGroupsData.length === 0 && selectedTutoringStudentsData.length === 0) {
                showNotification('Please select at least one group or tutoring student to generate lessons for.', 'warning');
                setIsGeneratingLessons(false);
                return;
            }

            const allLessons = [];
            let createdCount = 0;

            // Check for overlapping lessons before generation
            const overlappingLessons = [];
            const existingLessons = lessons.map(l => ({
                startTime: new Date(`${l.lessonDate}T${l.startTime || '09:00'}:00`),
                endTime: new Date(`${l.lessonDate}T${l.endTime || '10:00'}:00`),
                groupId: l.groupId,
                studentId: l.studentId,
                id: l.id,
                type: 'lesson'
            }));

            // Also check for overlapping events
            const existingEvents = events.map(e => ({
                startTime: new Date(e.startTime),
                endTime: new Date(e.endTime),
                id: e.id,
                type: 'event',
                eventName: e.eventName
            }));

            // Combine all existing items for overlap checking
            const allExistingItems = [...existingLessons, ...existingEvents];

            // Generate lessons for selected groups
            for (const group of selectedGroupsData) {
                const endDate = group.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                
                const lessons = generateGroupLessons(
                    group,
                    group.startDate, // Start from the group's actual start date
                    endDate
                );
                
                // Check for overlaps with existing lessons
                lessons.forEach(lesson => {
                    const lessonStart = new Date(`${lesson.lessonDate}T${lesson.startTime}:00`);
                    const lessonEnd = new Date(`${lesson.lessonDate}T${lesson.endTime}:00`);
                    
                    allExistingItems.forEach(existing => {
                        if (lessonStart < existing.endTime && lessonEnd > existing.startTime) {
                            overlappingLessons.push({
                                newLesson: lesson,
                                existingLesson: existing,
                                type: 'lesson'
                            });
                        }
                    });
                });
                
                allLessons.push(...lessons);
            }

            // Generate lessons for selected tutoring students
            for (const student of selectedTutoringStudentsData) {
                const endDate = lessonGenerationData.useIndividualEndDates && student.tutoringDetails?.endDate 
                    ? student.tutoringDetails.endDate 
                    : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 3 months from now
                
                const lessons = generateTutoringLessons(
                    student,
                    student.enrollmentDate, // Start from the student's actual enrollment date
                    endDate
                );
                
                // Check for overlaps with existing lessons
                lessons.forEach(lesson => {
                    const lessonStart = new Date(`${lesson.lessonDate}T${lesson.startTime}:00`);
                    const lessonEnd = new Date(`${lesson.lessonDate}T${lesson.endTime}:00`);
                    
                    allExistingItems.forEach(existing => {
                        if (lessonStart < existing.endTime && lessonEnd > existing.startTime) {
                            overlappingLessons.push({
                                newLesson: lesson,
                                existingLesson: existing,
                                type: 'lesson'
                            });
                        }
                    });
                });
                
                allLessons.push(...lessons);
            }

            // Show warning if overlapping lessons found
            if (overlappingLessons.length > 0) {
                setOverlappingConflicts(overlappingLessons);
                const lessonConflicts = overlappingLessons.filter(o => o.existingLesson.type === 'lesson').length;
                const eventConflicts = overlappingLessons.filter(o => o.existingLesson.type === 'event').length;
                
                let warningMessage = `Found ${overlappingLessons.length} overlapping conflicts. `;
                if (lessonConflicts > 0 && eventConflicts > 0) {
                    warningMessage += `${lessonConflicts} with existing lessons and ${eventConflicts} with existing events.`;
                } else if (lessonConflicts > 0) {
                    warningMessage += `${lessonConflicts} with existing lessons.`;
                } else if (eventConflicts > 0) {
                    warningMessage += `${eventConflicts} with existing events.`;
                }
                warningMessage += ' Please resolve conflicts before generating lessons.';
                
                showNotification(warningMessage, 'warning');
                setIsGeneratingLessons(false);
                return;
            }

            // Clear any existing conflicts if no overlaps found
            setOverlappingConflicts([]);
            setSelectedConflictsToDelete([]);

            // Create all lessons
            for (const lesson of allLessons) {
                try {
                    await apiClient.create('lessons', lesson);
                    createdCount++;
                } catch (error) {
                    console.error('Error creating lesson:', error);
                }
            }

            showNotification(`Successfully generated ${createdCount} lessons!`, 'success');
            fetchData();
            setIsLessonGenerationModalOpen(false);
        } catch (error) {
            console.error('Error generating lessons:', error);
            showNotification('Failed to generate lessons. Please try again.', 'error');
        } finally {
            setIsGeneratingLessons(false);
        }
    };



    const handleDeleteAllLessonsConfirmed = async () => {
        
        if (!lessons || lessons.length === 0) {
            showNotification('No lessons found to delete.', 'warning');
            setIsDeleteAllLessonsModalOpen(false);
            return;
        }
        
        setIsDeleteAllLessonsModalOpen(false);
        setIsDeletingAllLessons(true);
        try {
            let deletedCount = 0;
            const totalLessons = lessons.length;
            
            // Delete lessons in batches to avoid overwhelming the server
            const batchSize = 10;
            for (let i = 0; i < lessons.length; i += batchSize) {
                const batch = lessons.slice(i, i + batchSize);
                
                for (const lesson of batch) {
                    try {
                        await apiClient.delete('lessons', lesson.id);
                        deletedCount++;
                    } catch (error) {
                        console.error('Error deleting lesson:', error);
                    }
                }
                
                // Small delay between batches
                if (i + batchSize < lessons.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            
            showNotification(`Successfully deleted ${deletedCount} out of ${totalLessons} lessons!`, 'success');
            fetchData();
            setIsDeleteAllLessonsModalOpen(false);
        } catch (error) {
            console.error('Error deleting all lessons:', error);
            showNotification('Failed to delete all lessons. Please try again.', 'error');
        } finally {
            setIsDeletingAllLessons(false);
        }
    };

    const handleLessonDeletionOptionChange = (option, value) => {
        setLessonDeletionOptions(prev => ({
            ...prev,
            [option]: value
        }));
    };

    const handleGroupSelectionForDeletion = (groupId, isSelected) => {
        setLessonDeletionOptions(prev => ({
            ...prev,
            selectedGroups: isSelected 
                ? [...prev.selectedGroups, groupId]
                : prev.selectedGroups.filter(id => id !== groupId)
        }));
    };

    const handleStudentSelectionForDeletion = (studentId, isSelected) => {
        setLessonDeletionOptions(prev => ({
            ...prev,
            selectedStudents: isSelected 
                ? [...prev.selectedStudents, studentId]
                : prev.selectedStudents.filter(id => id !== studentId)
        }));
    };

    const handleStatusSelectionForDeletion = (status, isSelected) => {
        setLessonDeletionOptions(prev => ({
            ...prev,
            selectedStatuses: isSelected 
                ? [...prev.selectedStatuses, status]
                : prev.selectedStatuses.filter(s => s !== status)
        }));
    };

    const getLessonsToDelete = () => {
        let filteredLessons = [...lessons];

        // Only apply filters if the corresponding option is selected
        if (lessonDeletionOptions.deleteByDateRange && lessonDeletionOptions.startDate && lessonDeletionOptions.endDate) {
            const startDate = new Date(lessonDeletionOptions.startDate);
            const endDate = new Date(lessonDeletionOptions.endDate);
            filteredLessons = filteredLessons.filter(lesson => {
                const lessonDate = new Date(lesson.lessonDate);
                return lessonDate >= startDate && lessonDate <= endDate;
            });
        }

        if (lessonDeletionOptions.deleteByGroup && lessonDeletionOptions.selectedGroups.length > 0) {
            filteredLessons = filteredLessons.filter(lesson => 
                lesson.groupId && lessonDeletionOptions.selectedGroups.includes(lesson.groupId)
            );
        }

        if (lessonDeletionOptions.deleteByStudent && lessonDeletionOptions.selectedStudents.length > 0) {
            filteredLessons = filteredLessons.filter(lesson => 
                lesson.studentId && lessonDeletionOptions.selectedStudents.includes(lesson.studentId)
            );
        }

        if (lessonDeletionOptions.deleteByStatus && lessonDeletionOptions.selectedStatuses.length > 0) {
            filteredLessons = filteredLessons.filter(lesson => 
                lesson.status && lessonDeletionOptions.selectedStatuses.includes(lesson.status)
            );
        }

        // If no specific criteria are selected, return empty array (no lessons to delete)
        const hasAnyCriteria = lessonDeletionOptions.deleteByDateRange || 
                              lessonDeletionOptions.deleteByGroup || 
                              lessonDeletionOptions.deleteByStudent || 
                              lessonDeletionOptions.deleteByStatus;
        
        return hasAnyCriteria ? filteredLessons : [];
    };

    const handleSelectiveLessonDeletion = async () => {
        const lessonsToDelete = getLessonsToDelete();
        
        if (lessonsToDelete.length === 0) {
            showNotification('No lessons match the selected criteria.', 'warning');
            return;
        }

        // Show custom confirmation modal instead of browser confirm
        setPendingDeletionData({ lessonsToDelete, count: lessonsToDelete.length });
        setIsSelectiveDeletionConfirmOpen(true);
    };

    const handleSelectiveLessonDeletionConfirmed = async () => {
        setIsSelectiveDeletionConfirmOpen(false);
        const { lessonsToDelete } = pendingDeletionData;
        setPendingDeletionData(null);
        
        setIsDeletingLessons(true);
        try {
            let deletedCount = 0;
            const totalLessons = lessonsToDelete.length;
            
            // Delete lessons in batches
            const batchSize = 10;
            for (let i = 0; i < lessonsToDelete.length; i += batchSize) {
                const batch = lessonsToDelete.slice(i, i + batchSize);
                
                for (const lesson of batch) {
                    try {
                        await apiClient.delete('lessons', lesson.id);
                        deletedCount++;
                    } catch (error) {
                        console.error('Error deleting lesson:', error);
                    }
                }
                
                // Small delay between batches
                if (i + batchSize < lessonsToDelete.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            
            showNotification(`Successfully deleted ${deletedCount} out of ${totalLessons} lessons!`, 'success');
            fetchData();
            setIsLessonDeletionModalOpen(false);
            // Reset options
            setLessonDeletionOptions({
                deleteAll: false,
                deleteByDateRange: false,
                deleteByGroup: false,
                deleteByStudent: false,
                deleteByStatus: false,
                selectedGroups: [],
                selectedStudents: [],
                selectedStatuses: [],
                startDate: '',
                endDate: ''
            });
        } catch (error) {
            console.error('Error deleting lessons:', error);
            showNotification('Failed to delete lessons. Please try again.', 'error');
        } finally {
            setIsDeletingLessons(false);
        }
    };

    const selectAllGroupsForDeletion = () => {
        const eligibleGroups = groups.filter(g => !g.isArchived && g.schedule?.days?.length > 0);
        setLessonDeletionOptions(prev => ({
            ...prev,
            selectedGroups: eligibleGroups.map(g => g.id)
        }));
    };

    const selectAllStudentsForDeletion = () => {
        const eligibleStudents = students.filter(s => s.isTutoring && !s.isArchived);
        setLessonDeletionOptions(prev => ({
            ...prev,
            selectedStudents: eligibleStudents.map(s => s.id)
        }));
    };

    const selectAllStatusesForDeletion = () => {
        setLessonDeletionOptions(prev => ({
            ...prev,
            selectedStatuses: ['Unpaid', 'Paid', 'Overdue']
        }));
    };

    const clearAllDeletionSelections = () => {
        setLessonDeletionOptions(prev => ({
            ...prev,
            selectedGroups: [],
            selectedStudents: [],
            selectedStatuses: []
        }));
    };

    const handleGenerateLessonsWithModifications = async (modifiedLessonsMap) => {
        setIsGeneratingLessons(true);
        try {
            // Filter groups and students based on selection
            const selectedGroupsData = groups.filter(g => 
                !g.isArchived && 
                g.schedule?.days?.length > 0 && 
                lessonGenerationData.selectedGroups.includes(g.id)
            );
            
            const selectedTutoringStudentsData = students.filter(s => 
                s.isTutoring && 
                !s.isArchived && 
                s.tutoringDetails?.schedule?.days?.length > 0 &&
                lessonGenerationData.selectedTutoringStudents.includes(s.id)
            );

            // Check if any groups or students are selected
            if (selectedGroupsData.length === 0 && selectedTutoringStudentsData.length === 0) {
                showNotification('Please select at least one group or tutoring student to generate lessons for.', 'warning');
                setIsGeneratingLessons(false);
                return;
            }

            const allLessons = [];
            let createdCount = 0;

            // Generate lessons for selected groups
            for (const group of selectedGroupsData) {
                const endDate = group.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                
                const lessons = generateGroupLessons(
                    group,
                    group.startDate, // Start from the group's actual start date
                    endDate
                );
                
                // Apply modifications if any
                const modifiedGroupLessons = lessons.map(lesson => {
                    const modifiedLesson = modifiedLessonsMap.get(`${group.id}-${lesson.lessonDate}-${lesson.startTime}`);
                    return modifiedLesson || lesson;
                });
                
                allLessons.push(...modifiedGroupLessons);
            }

            // Generate lessons for selected tutoring students
            for (const student of selectedTutoringStudentsData) {
                const endDate = lessonGenerationData.useIndividualEndDates && student.tutoringDetails?.endDate 
                    ? student.tutoringDetails.endDate 
                    : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 3 months from now
                
                const lessons = generateTutoringLessons(
                    student,
                    student.enrollmentDate, // Start from the student's actual enrollment date
                    endDate
                );
                
                // Apply modifications if any
                const modifiedStudentLessons = lessons.map(lesson => {
                    const modifiedLesson = modifiedLessonsMap.get(`${student.id}-${lesson.lessonDate}-${lesson.startTime}`);
                    return modifiedLesson || lesson;
                });
                
                allLessons.push(...modifiedStudentLessons);
            }

            // Create all lessons
            for (const lesson of allLessons) {
                try {
                    await apiClient.create('lessons', lesson);
                    createdCount++;
                } catch (error) {
                    console.error('Error creating lesson:', error);
                }
            }

            showNotification(`Successfully generated ${createdCount} lessons!`, 'success');
            fetchData();
            setIsLessonGenerationModalOpen(false);
            setModifiedLessons(new Map()); // Clear modified lessons
        } catch (error) {
            console.error('Error generating lessons:', error);
            showNotification('Failed to generate lessons. Please try again.', 'error');
        } finally {
            setIsGeneratingLessons(false);
        }
    };

    // Lesson warning calculations
    const getOverdueLessons = () => {
        const now = new Date();
        return lessons?.filter(lesson => {
            const lessonDateTime = new Date(`${lesson.lessonDate}T${lesson.startTime || '09:00'}`);
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
            return lessonDateTime > now && lessonDateTime <= next24Hours && lesson.status === 'Incomplete';
        }) || [];
    };

    return (
        <div className="relative p-4 md:p-8 bg-gray-50 rounded-lg shadow-lg">
            {/* Simple Premium Header */}
            <div className="mb-8">
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
                    <div className="flex items-center">
                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm mr-4">
                            <Icon path={ICONS.DASHBOARD} className="w-7 h-7 text-white"/>
                        </div>
                        <div>
                            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">Dashboard</h2>
                            <p className="text-gray-600 text-sm lg:text-base">Welcome, Nazım!</p>
                        </div>
                    </div>
                    <div className="hidden lg:flex items-center space-x-6 text-gray-700">
                        <div className="text-right">
                            <div className="text-xl font-bold text-gray-900">{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</div>
                        </div>
                        <div className="w-px h-8 bg-gray-300"></div>
                        <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">{currentTime.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</div>
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-1">{currentTime.toLocaleDateString('en-US', { weekday: 'long' })}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
                 <div className="bg-white rounded-2xl p-4 md:p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 cursor-pointer group" onClick={() => setActiveModule('students')}>
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <Icon path={ICONS.STUDENTS} className="w-5 h-5 md:w-7 md:h-7 text-white" />
                        </div>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{students.length}</h3>
                    <p className="text-xs md:text-sm font-medium text-blue-700">Total Students</p>
                </div>
                 <div className="bg-white rounded-2xl p-4 md:p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 cursor-pointer group" onClick={() => setActiveModule('groups')}>
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <Icon path={ICONS.GROUPS} className="w-5 h-5 md:w-7 md:h-7 text-white"/>
                        </div>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{groups.length}</h3>
                    <p className="text-xs md:text-sm font-medium text-purple-700">Total Groups</p>
                </div>
                <button onClick={() => setIsStudentModalOpen(true)} className="bg-white text-gray-900 rounded-2xl p-4 md:p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 text-left group">
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <Icon path={ICONS.ADD} className="w-5 h-5 md:w-7 md:h-7 text-white"/>
                        </div>
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">Enroll Student</h3>
                    <p className="text-xs md:text-sm text-gray-600">Add a new student.</p>
                </button>
                <button onClick={() => setIsEventModalOpen(true)} className="bg-white text-gray-900 rounded-2xl p-4 md:p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 text-left group">
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <Icon path={ICONS.CALENDAR} className="w-5 h-5 md:w-7 md:h-7 text-white"/>
                        </div>
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">Log Event</h3>
                    <p className="text-xs md:text-sm text-gray-600">Add a new event.</p>
                </button>

            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6 mb-6">
                <div className="space-y-4 md:space-y-6">
                    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-lg border border-gray-200 min-h-[300px] md:min-h-[350px] flex flex-col">
                        <div className="flex items-center mb-4 md:mb-6 flex-shrink-0">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm mr-3">
                                <Icon path={ICONS.CALENDAR} className="w-4 h-4 md:w-5 md:h-5 text-white" />
                            </div>
                            <h3 className="text-lg md:text-xl font-bold text-gray-800">Today's Schedule</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {todaysSchedule.length > 0 ? (
                                <div className="max-h-80 overflow-y-auto">
                                    <ul className="space-y-3 md:space-y-4">
                                        {todaysSchedule.map(item => (
                                            <li key={item.id} className="flex items-center justify-between group p-3 rounded-xl hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center min-w-0 flex-1">
                                                    <EventIcon type={item.type} color={item.color} category={item.category} />
                                                    <div className="min-w-0 flex-1 ml-3">
                                                        <p className="font-medium text-gray-800 text-sm md:text-base truncate">{item.eventName} {getTimeRemaining(item) && <span className="text-xs md:text-sm text-gray-500">({getTimeRemaining(item)})</span>}</p>
                                                        <p className="text-xs md:text-sm text-gray-600">
                                                            {item.allDay ? 'All Day' : 
                                                             item.type === 'lesson' ? 
                                                                `${item.originalStartTime || '09:00'} - ${item.originalEndTime || '10:00'}` :
                                                                item.startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false, timeZone: 'Europe/Istanbul'})
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                                {(item.type === 'event' || item.type === 'lesson') && (
                                                    <div className="flex space-x-1 md:space-x-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                        <button onClick={() => handleEditItem(item)} className="p-1 md:p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-50 transition-colors"><Icon path={ICONS.EDIT} className="w-4 h-4 md:w-5 md:h-5" /></button>
                                                        <button onClick={() => openDeleteConfirmation(item)} className="p-1 md:p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50 transition-colors"><Icon path={ICONS.TRASH} className="w-4 h-4 md:w-5 md:h-5" /></button>
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 text-center flex-1">
                                    <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                        <Icon path={ICONS.CALENDAR} className="w-6 h-6 md:w-8 md:h-8 text-gray-400" />
                                    </div>
                                    <p className="text-gray-500 text-sm md:text-base">No events or lessons scheduled for today.</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-lg border border-gray-200 min-h-[300px] md:min-h-[350px] flex flex-col">
                        <div className="flex items-center mb-4 md:mb-6 flex-shrink-0">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-sm mr-3">
                                <Icon path={ICONS.CLOCK} className="w-4 h-4 md:w-5 md:h-5 text-white" />
                            </div>
                            <h3 className="text-lg md:text-xl font-bold text-gray-800">Upcoming Events</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {upcomingEvents.length > 0 ? (
                                <div className="max-h-80 overflow-y-auto">
                                    <ul className="space-y-3 md:space-y-4">
                                        {upcomingEvents.map((item, index) => (
                                            <li key={item.id} className={`p-3 rounded-xl flex items-center justify-between group transition-colors ${index === 0 ? 'bg-purple-50 border border-purple-200' : 'hover:bg-gray-50'}`}>
                                                <div className="flex items-center min-w-0 flex-1">
                                                    <EventIcon type={item.type} color={item.color} category={item.category} />
                                                    <div className="min-w-0 flex-1 ml-3">
                                                        <p className="font-medium text-gray-800 text-sm md:text-base truncate">{item.eventName} {getTimeRemaining(item) && <span className="text-xs md:text-sm text-gray-500">({getTimeRemaining(item)})</span>}</p>
                                                        <p className="text-xs md:text-sm text-gray-600">{formatDate(item.startTime)}</p>
                                                    </div>
                                                </div>
                                                {(item.type === 'event' || item.type === 'lesson') && (
                                                    <div className="flex space-x-1 md:space-x-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                        <button onClick={() => handleEditItem(item)} className="p-1 md:p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-50 transition-colors"><Icon path={ICONS.EDIT} className="w-4 h-4 md:w-5 md:h-5" /></button>
                                                        <button onClick={() => openDeleteConfirmation(item)} className="p-1 md:p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50 transition-colors"><Icon path={ICONS.TRASH} className="w-4 h-4 md:w-5 md:h-5" /></button>
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>

                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 text-center flex-1">
                                    <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                        <Icon path={ICONS.CLOCK} className="w-6 h-6 md:w-8 md:h-8 text-gray-400" />
                                    </div>
                                    <p className="text-gray-500 text-sm md:text-base">No upcoming events.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="min-h-[600px] md:min-h-[700px]">
                    <TodoModule />
                </div>
            </div>

            {/* Important Notifications */}
            <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl p-6 shadow-lg border border-amber-100 mb-6">
                <div className="flex items-center mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-sm mr-3">
                        <Icon path={ICONS.NOTIFICATION} className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Important Notifications</h3>
                </div>
                
                {/* Lesson Warnings */}
                {(() => {
                    const overdueLessons = getOverdueLessons();
                    const todayLessons = getTodayLessons();
                    
                    if (overdueLessons.length > 0 || todayLessons.length > 0) {
                        return (
                            <div className="mb-6">
                                <h4 className="font-semibold text-red-800 mb-3 flex items-center">
                                    <Icon path={ICONS.WARNING} className="w-5 h-5 mr-2" />
                                    Lesson Attendance Required
                                </h4>
                                <ul className="space-y-3">
                                    {overdueLessons.length > 0 && (
                                        <li className="flex items-center justify-between group p-3 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 transition-colors">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3 bg-red-500 shadow-sm">
                                                    <Icon path={ICONS.CLOCK} className="w-4 h-4 text-white"/>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-red-800">{overdueLessons.length} completed lesson(s) missing attendance</p>
                                                    <p className="text-sm text-red-600">Need immediate attention</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => setActiveModule('groups')}
                                                className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                                            >
                                                View
                                            </button>
                                        </li>
                                    )}
                                    {todayLessons.length > 0 && (
                                        <li className="flex items-center justify-between group p-3 rounded-xl bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-colors">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3 bg-orange-500 shadow-sm">
                                                    <Icon path={ICONS.CALENDAR} className="w-4 h-4 text-white"/>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-orange-800">{todayLessons.length} completed lesson(s) from today missing attendance</p>
                                                    <p className="text-sm text-orange-600">Need attendance logging</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => setActiveModule('groups')}
                                                className="px-3 py-1 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 transition-colors"
                                            >
                                                View
                                            </button>
                                        </li>
                                    )}
                                </ul>
                            </div>
                        );
                    }
                    return null;
                })()}

                {/* Payment Notifications */}
                {duePayments.length > 0 ? (
                    <ul className="space-y-4">
                        {duePayments.map(notification => (
                            <li key={notification.id} className="flex items-center justify-between group p-3 rounded-xl hover:bg-amber-50 transition-colors">
                                <div className="flex items-center">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mr-4 bg-gradient-to-br from-yellow-500 to-yellow-600 shadow-sm">
                                        <Icon path={ICONS.WALLET} className="w-5 h-5 text-white"/>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-800">{notification.message}</p>
                                        {notification.details && <p className="text-sm text-gray-600">{notification.details}</p>}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="flex items-center text-green-600 p-3 rounded-xl bg-green-50">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mr-4 bg-gradient-to-br from-green-500 to-green-600 shadow-sm">
                            <Icon path={ICONS.CHECK} className="w-5 h-5 text-white" />
                        </div>
                        <p className="font-medium">Everything is good! No overdue payments.</p>
                    </div>
                )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h3 className="font-semibold mb-4 text-gray-800">Weekly Overview</h3>
                <WeeklyOverview events={weekEvents} />
            </div>

            <StudentFormModal isOpen={isStudentModalOpen} onClose={() => setIsStudentModalOpen(false)} />
            <EventFormModal isOpen={isEventModalOpen} onClose={() => {setIsEventModalOpen(false); setEventToEdit(null);}} eventToEdit={eventToEdit} />
            <LessonFormModal isOpen={isLessonModalOpen} onClose={() => {setIsLessonModalOpen(false); setLessonToEdit(null);}} lessonToEdit={lessonToEdit} />
            
            {itemToDelete && (
                <ConfirmationModal
                    isOpen={isConfirmModalOpen}
                    onClose={() => setIsConfirmModalOpen(false)}
                    onConfirm={handleDeleteItem}
                    title={`Delete ${itemToDelete.type}`}
                    message={`Are you sure you want to delete the ${itemToDelete.type} "${itemToDelete.event_name}"? This action cannot be undone.`}
                />
            )}



            {/* Selective Lesson Deletion Confirmation Modal */}
            <ConfirmationModal
                isOpen={isSelectiveDeletionConfirmOpen}
                onClose={() => {
                    setIsSelectiveDeletionConfirmOpen(false);
                    setPendingDeletionData(null);
                }}
                onConfirm={handleSelectiveLessonDeletionConfirmed}
                title="Delete Selected Lessons"
                message={pendingDeletionData ? `Are you sure you want to delete ${pendingDeletionData.count} lessons? This action cannot be undone.` : ""}
                confirmText="Delete Selected Lessons"
                confirmStyle="bg-yellow-600 hover:bg-yellow-700"
            />

            {/* Lesson Generation Modal */}
            <Modal 
                isOpen={isLessonGenerationModalOpen} 
                onClose={() => {
                    setIsLessonGenerationModalOpen(false);
                    setOverlappingConflicts([]);
                    setSelectedConflictsToDelete([]);
                    setSelectedConflictsToModify([]);
                    setModifiedLessons(new Map());
                }} 
                title="Generate Lessons Automatically"
                headerStyle={{ backgroundColor: '#3B82F6' }}
            >
                <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start">
                            <Icon path={ICONS.INFO} className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                            <div>
                                <h4 className="text-sm font-medium text-blue-800 mb-1">
                                    Automatic Lesson Generation
                                </h4>
                                <p className="text-sm text-blue-700">
                                    This will automatically generate lessons for selected groups and tutoring students based on their existing schedules. Lessons will be created from today until their end date (or 3 months from now if no end date is set).
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Groups Selection */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium text-gray-700">Select Groups</h4>
                            <div className="flex space-x-2">
                                <button
                                    type="button"
                                    onClick={selectAllGroups}
                                    className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                >
                                    Select All
                                </button>
                                <button
                                    type="button"
                                    onClick={clearAllSelections}
                                    className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                >
                                    Clear All
                                </button>
                            </div>
                        </div>
                        <div className="max-h-32 overflow-y-auto space-y-2">
                            {groups.filter(g => !g.isArchived && g.schedule?.days?.length > 0).map(group => (
                                <div key={group.id} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id={`group-${group.id}`}
                                        checked={lessonGenerationData.selectedGroups.includes(group.id)}
                                        onChange={(e) => handleGroupSelection(group.id, e.target.checked)}
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <label htmlFor={`group-${group.id}`} className="ml-2 block text-sm text-gray-700 flex items-center">
                                        <div 
                                            className="w-3 h-3 rounded-full mr-2 border border-gray-300"
                                            style={{ backgroundColor: group.color || '#3B82F6' }}
                                        ></div>
                                        {group.groupName} ({group.schedule.days.join(', ')})
                                        {group.endDate && lessonGenerationData.useIndividualEndDates && (
                                            <span className="text-xs text-gray-500 ml-1">
                                                • Ends: {new Date(group.endDate).toLocaleDateString()}
                                            </span>
                                        )}
                                    </label>
                                </div>
                            ))}
                            {groups.filter(g => !g.isArchived && g.schedule?.days?.length > 0).length === 0 && (
                                <p className="text-sm text-gray-500 italic">No groups with schedules found.</p>
                            )}
                        </div>
                    </div>

                    {/* Tutoring Students Selection */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium text-gray-700">Select Tutoring Students</h4>
                            <div className="flex space-x-2">
                                <button
                                    type="button"
                                    onClick={selectAllTutoringStudents}
                                    className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                >
                                    Select All
                                </button>
                            </div>
                        </div>
                        <div className="max-h-32 overflow-y-auto space-y-2">
                            {students.filter(s => s.isTutoring && !s.isArchived && s.tutoringDetails?.schedule?.days?.length > 0).map(student => (
                                <div key={student.id} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id={`student-${student.id}`}
                                        checked={lessonGenerationData.selectedTutoringStudents.includes(student.id)}
                                        onChange={(e) => handleTutoringStudentSelection(student.id, e.target.checked)}
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <label htmlFor={`student-${student.id}`} className="ml-2 block text-sm text-gray-700 flex items-center">
                                        <div 
                                            className="w-3 h-3 rounded-full mr-2 border border-gray-300"
                                            style={{ backgroundColor: student.color || '#8B5CF6' }}
                                        ></div>
                                        {student.fullName} ({student.tutoringDetails.schedule.days.join(', ')})
                                        {student.tutoringDetails?.endDate && lessonGenerationData.useIndividualEndDates && (
                                            <span className="text-xs text-gray-500 ml-1">
                                                • Ends: {new Date(student.tutoringDetails.endDate).toLocaleDateString()}
                                            </span>
                                        )}
                                    </label>
                                </div>
                            ))}
                            {students.filter(s => s.isTutoring && !s.isArchived && s.tutoringDetails?.schedule?.days?.length > 0).length === 0 && (
                                <p className="text-sm text-gray-500 italic">No tutoring students with schedules found.</p>
                            )}
                        </div>
                        
                        {/* Debug section - show tutoring students that don't meet criteria */}
                        {students.filter(s => s.isTutoring && !s.isArchived).length > 0 && 
                         students.filter(s => s.isTutoring && !s.isArchived && s.tutoringDetails?.schedule?.days?.length > 0).length === 0 && (
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <h5 className="text-sm font-medium text-yellow-800 mb-2">Debug: Tutoring Students Found but No Schedules</h5>
                                <div className="text-xs text-yellow-700 space-y-1">
                                    {students.filter(s => s.isTutoring && !s.isArchived).map(student => (
                                        <div key={student.id}>
                                            <strong>{student.fullName}</strong>: 
                                            {!student.tutoringDetails ? ' No tutoringDetails' : 
                                             !student.tutoringDetails.schedule ? ' No schedule' :
                                             !student.tutoringDetails.schedule.days ? ' No days' :
                                             student.tutoringDetails.schedule.days.length === 0 ? ' Empty days array' :
                                             ` Has ${student.tutoringDetails.schedule.days.length} days: ${student.tutoringDetails.schedule.days.join(', ')}`
                                            }
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Delete All Lessons Section */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start">
                            <Icon path={ICONS.WARNING} className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                            <div className="flex-1">
                                <h4 className="text-sm font-medium text-red-800 mb-1">
                                    Delete Lessons
                                </h4>
                                <p className="text-sm text-red-700 mb-3">
                                    Choose how you want to delete lessons. You can delete all lessons or select specific criteria.
                                </p>
                                <div className="space-y-3">
                                    <button 
                                        onClick={() => setIsDeleteAllLessonsModalOpen(true)}
                                        disabled={lessons.length === 0 || isDeletingAllLessons}
                                        className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                    >
                                        <Icon path={ICONS.TRASH} className="w-4 h-4 mr-2"/>
                                        {isDeletingAllLessons ? 'Deleting...' : `Delete All Lessons (${lessons.length})`}
                                    </button>
                                    <button 
                                        onClick={() => setIsLessonDeletionModalOpen(true)}
                                        disabled={lessons.length === 0 || isDeletingLessons}
                                        className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                    >
                                        <Icon path={ICONS.SEARCH} className="w-4 h-4 mr-2"/>
                                        {isDeletingLessons ? 'Deleting...' : 'Delete Selected Lessons'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Preview Section */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Generation Preview</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Selected groups:</span>
                                <span className="font-medium text-gray-800">
                                    {lessonGenerationData.selectedGroups.length === 0 
                                        ? '0 (none selected)'
                                        : lessonGenerationData.selectedGroups.length + ' selected'
                                    }
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Selected tutoring students:</span>
                                <span className="font-medium text-gray-800">
                                    {lessonGenerationData.selectedTutoringStudents.length === 0 
                                        ? '0 (none selected)'
                                        : lessonGenerationData.selectedTutoringStudents.length + ' selected'
                                    }
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Estimated total lessons:</span>
                                <span className="font-medium text-blue-600">
                                    {(() => {
                                        const selectedGroupsData = groups.filter(g => 
                                            !g.isArchived && 
                                            g.schedule?.days?.length > 0 && 
                                            lessonGenerationData.selectedGroups.includes(g.id)
                                        );
                                        
                                        const selectedTutoringStudentsData = students.filter(s => 
                                            s.isTutoring && 
                                            !s.isArchived && 
                                            s.tutoringDetails?.schedule?.days?.length > 0 &&
                                            lessonGenerationData.selectedTutoringStudents.includes(s.id)
                                        );

                                        let totalLessons = 0;

                                        // Calculate lessons for selected groups
                                        for (const group of selectedGroupsData) {
                                            const endDate = group.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                                            
                                            const lessonCount = calculateLessonsWithinRange(
                                                group.startDate,
                                                endDate,
                                                group.schedule.days
                                            );
                                            totalLessons += lessonCount;
                                        }

                                        // Calculate lessons for selected tutoring students
                                        for (const student of selectedTutoringStudentsData) {
                                            const endDate = lessonGenerationData.useIndividualEndDates && student.tutoringDetails?.endDate 
                                                ? student.tutoringDetails.endDate 
                                                : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 3 months from now
                                            
                                            const lessonCount = calculateLessonsWithinRange(
                                                student.enrollmentDate,
                                                endDate,
                                                student.tutoringDetails.schedule.days
                                            );
                                            totalLessons += lessonCount;
                                        }

                                        return totalLessons;
                                    })()}
                                </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-2">
                                <p>• Lessons will be generated from today until each group's/student's end date</p>
                                <p>• If no end date is set, lessons will be generated for 3 months</p>
                                <p>• Times will be based on each group's/student's existing schedule</p>
                            </div>
                        </div>
                    </div>

                    {/* Conflict Management Section */}
                    {overlappingConflicts.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-start">
                                <Icon path={ICONS.WARNING} className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                                <div className="flex-1">
                                    <h4 className="text-sm font-medium text-red-800 mb-2">
                                        Overlapping Conflicts Detected
                                    </h4>
                                    <p className="text-sm text-red-700 mb-3">
                                        The following items conflict with the lessons you're trying to generate. Choose to either delete the conflicting items or modify the new lessons to avoid conflicts:
                                    </p>
                                    
                                    <div className="max-h-48 overflow-y-auto space-y-2 mb-4">
                                        {overlappingConflicts.map((conflict, index) => (
                                            <div key={index} className="p-3 bg-white rounded-lg border border-red-200">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <span className="font-medium text-gray-800">
                                                                    {conflict.existingLesson.type === 'event' 
                                                                        ? conflict.existingLesson.eventName 
                                                                        : conflict.existingLesson.topic
                                                                    }
                                                                </span>
                                                                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                                                                    conflict.existingLesson.type === 'event' 
                                                                        ? 'bg-blue-100 text-blue-800' 
                                                                        : 'bg-green-100 text-green-800'
                                                                }`}>
                                                                    {conflict.existingLesson.type}
                                                                </span>
                                                            </div>
                                                            <div className="text-sm text-gray-600">
                                                                {conflict.existingLesson.type === 'event' 
                                                                    ? new Date(conflict.existingLesson.startTime).toLocaleDateString() + ' ' +
                                                                      new Date(conflict.existingLesson.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) + ' - ' +
                                                                      new Date(conflict.existingLesson.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                                                                    : new Date(`${conflict.existingLesson.lessonDate}T${conflict.existingLesson.startTime}`).toLocaleDateString() + ' ' +
                                                                      conflict.existingLesson.startTime + ' - ' + conflict.existingLesson.endTime
                                                                }
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            New lesson: {conflict.newLesson.startTime} - {conflict.newLesson.endTime}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex space-x-4">
                                                    <label className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedConflictsToDelete.includes(conflict.existingLesson.id)}
                                                            onChange={(e) => handleConflictSelection(conflict.existingLesson.id, e.target.checked)}
                                                            className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                                                        />
                                                        <span className="ml-2 text-sm text-red-700">Delete existing</span>
                                                    </label>
                                                    <label className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedConflictsToModify.includes(conflict.existingLesson.id)}
                                                            onChange={(e) => handleConflictModificationSelection(conflict.existingLesson.id, e.target.checked)}
                                                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                        />
                                                        <span className="ml-2 text-sm text-blue-700">Modify new lesson</span>
                                                    </label>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="flex justify-between items-center">
                                        <div className="text-sm text-red-700">
                                            {selectedConflictsToDelete.length} to delete, {selectedConflictsToModify.length} to modify
                                        </div>
                                        <div className="flex space-x-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setOverlappingConflicts([]);
                                                    setSelectedConflictsToDelete([]);
                                                    setSelectedConflictsToModify([]);
                                                }}
                                                className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={modifySelectedConflicts}
                                                disabled={selectedConflictsToModify.length === 0 || isModifyingConflicts}
                                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isModifyingConflicts ? 'Modifying...' : `Modify Selected (${selectedConflictsToModify.length})`}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={deleteSelectedConflicts}
                                                disabled={selectedConflictsToDelete.length === 0}
                                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Delete Selected ({selectedConflictsToDelete.length})
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                        <button 
                            type="button" 
                            onClick={() => setIsLessonGenerationModalOpen(false)} 
                            className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                        <button 
                            type="button" 
                            onClick={handleGenerateLessons}
                            disabled={isGeneratingLessons || 
                                     (lessonGenerationData.selectedGroups.length === 0 && 
                                      lessonGenerationData.selectedTutoringStudents.length === 0) ||
                                     overlappingConflicts.length > 0}
                            className="px-6 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                            {isGeneratingLessons ? (
                                <>
                                    <Icon path={ICONS.LOADING} className="w-4 h-4 animate-spin" />
                                    Generating...
                                </>
                            ) : overlappingConflicts.length > 0 ? (
                                <>
                                    <Icon path={ICONS.WARNING} className="w-4 h-4" />
                                    Resolve Conflicts First
                                </>
                            ) : (
                                <>
                                    Generate Lessons
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete All Lessons Confirmation Modal */}
            <ConfirmationModal
                isOpen={isDeleteAllLessonsModalOpen}
                onClose={() => setIsDeleteAllLessonsModalOpen(false)}
                onConfirm={handleDeleteAllLessonsConfirmed}
                title="Delete All Lessons"
                message={`Are you sure you want to delete ALL ${lessons.length} lessons? This action cannot be undone and will remove all lessons from the system.`}
                confirmText={isDeletingAllLessons ? "Deleting..." : "Delete All Lessons"}
                confirmStyle="bg-red-600 hover:bg-red-700"
                disabled={isDeletingAllLessons}
            />

            {/* Lesson Deletion Modal */}
            <Modal
                isOpen={isLessonDeletionModalOpen}
                onClose={() => setIsLessonDeletionModalOpen(false)}
                title="Delete Selected Lessons"
                headerStyle={{ backgroundColor: '#F59E0B' }}
            >
                <div className="space-y-6">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start">
                            <Icon path={ICONS.WARNING} className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                            <div>
                                <h4 className="text-sm font-medium text-yellow-800 mb-1">
                                    Select Criteria for Deletion
                                </h4>
                                <p className="text-sm text-yellow-700">
                                    Choose which lessons to delete based on their date, group, student, or status.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="deleteByDateRange"
                                name="deleteByDateRange"
                                checked={lessonDeletionOptions.deleteByDateRange}
                                onChange={(e) => handleLessonDeletionOptionChange('deleteByDateRange', e.target.checked)}
                                className="h-4 w-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                            />
                            <label htmlFor="deleteByDateRange" className="ml-2 block text-sm text-gray-900">
                                Delete by Date Range
                            </label>
                        </div>
                        {lessonDeletionOptions.deleteByDateRange && (
                            <div className="grid grid-cols-2 gap-2">
                                <CustomDatePicker 
                                    label="Start Date" 
                                    name="startDate" 
                                    value={lessonDeletionOptions.startDate} 
                                    onChange={(e) => handleLessonDeletionOptionChange('startDate', e.target.value)} 
                                />
                                <CustomDatePicker 
                                    label="End Date" 
                                    name="endDate" 
                                    value={lessonDeletionOptions.endDate} 
                                    onChange={(e) => handleLessonDeletionOptionChange('endDate', e.target.value)} 
                                />
                            </div>
                        )}

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="deleteByGroup"
                                name="deleteByGroup"
                                checked={lessonDeletionOptions.deleteByGroup}
                                onChange={(e) => handleLessonDeletionOptionChange('deleteByGroup', e.target.checked)}
                                className="h-4 w-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                            />
                            <label htmlFor="deleteByGroup" className="ml-2 block text-sm text-gray-900">
                                Delete by Group
                            </label>
                        </div>
                        {lessonDeletionOptions.deleteByGroup && (
                            <div className="max-h-32 overflow-y-auto space-y-2">
                                <div className="flex space-x-2 mb-2">
                                    <button
                                        type="button"
                                        onClick={selectAllGroupsForDeletion}
                                        className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={clearAllDeletionSelections}
                                        className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                    >
                                        Clear All
                                    </button>
                                </div>
                                {groups.filter(g => !g.isArchived && g.schedule?.days?.length > 0).map(group => (
                                    <div key={group.id} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id={`group-${group.id}`}
                                            checked={lessonDeletionOptions.selectedGroups.includes(group.id)}
                                            onChange={(e) => handleGroupSelectionForDeletion(group.id, e.target.checked)}
                                            className="h-4 w-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                                        />
                                        <label htmlFor={`group-${group.id}`} className="ml-2 block text-sm text-gray-700 flex items-center">
                                            <div 
                                                className="w-3 h-3 rounded-full mr-2 border border-gray-300"
                                                style={{ backgroundColor: group.color || '#F59E0B' }}
                                            ></div>
                                            {group.groupName} ({group.schedule.days.join(', ')})
                                        </label>
                                    </div>
                                ))}
                                {groups.filter(g => !g.isArchived && g.schedule?.days?.length > 0).length === 0 && (
                                    <p className="text-sm text-gray-500 italic">No groups with schedules found.</p>
                                )}
                            </div>
                        )}

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="deleteByStudent"
                                name="deleteByStudent"
                                checked={lessonDeletionOptions.deleteByStudent}
                                onChange={(e) => handleLessonDeletionOptionChange('deleteByStudent', e.target.checked)}
                                className="h-4 w-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                            />
                            <label htmlFor="deleteByStudent" className="ml-2 block text-sm text-gray-900">
                                Delete by Student
                            </label>
                        </div>
                        {lessonDeletionOptions.deleteByStudent && (
                            <div className="max-h-32 overflow-y-auto space-y-2">
                                <div className="flex space-x-2 mb-2">
                                    <button
                                        type="button"
                                        onClick={selectAllStudentsForDeletion}
                                        className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={clearAllDeletionSelections}
                                        className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                    >
                                        Clear All
                                    </button>
                                </div>
                                {students.filter(s => s.isTutoring && !s.isArchived).map(student => (
                                    <div key={student.id} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id={`student-${student.id}`}
                                            checked={lessonDeletionOptions.selectedStudents.includes(student.id)}
                                            onChange={(e) => handleStudentSelectionForDeletion(student.id, e.target.checked)}
                                            className="h-4 w-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                                        />
                                        <label htmlFor={`student-${student.id}`} className="ml-2 block text-sm text-gray-700 flex items-center">
                                            <div 
                                                className="w-3 h-3 rounded-full mr-2 border border-gray-300"
                                                style={{ backgroundColor: student.color || '#F59E0B' }}
                                            ></div>
                                            {student.fullName} ({student.tutoringDetails.schedule.days.join(', ')})
                                        </label>
                                    </div>
                                ))}
                                {students.filter(s => s.isTutoring && !s.isArchived).length === 0 && (
                                    <p className="text-sm text-gray-500 italic">No tutoring students found.</p>
                                )}
                            </div>
                        )}

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="deleteByStatus"
                                name="deleteByStatus"
                                checked={lessonDeletionOptions.deleteByStatus}
                                onChange={(e) => handleLessonDeletionOptionChange('deleteByStatus', e.target.checked)}
                                className="h-4 w-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                            />
                            <label htmlFor="deleteByStatus" className="ml-2 block text-sm text-gray-900">
                                Delete by Status
                            </label>
                        </div>
                        {lessonDeletionOptions.deleteByStatus && (
                            <div className="max-h-32 overflow-y-auto space-y-2">
                                <div className="flex space-x-2 mb-2">
                                    <button
                                        type="button"
                                        onClick={selectAllStatusesForDeletion}
                                        className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={clearAllDeletionSelections}
                                        className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                    >
                                        Clear All
                                    </button>
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="status-unpaid"
                                        name="status-unpaid"
                                        checked={lessonDeletionOptions.selectedStatuses.includes('Unpaid')}
                                        onChange={(e) => handleStatusSelectionForDeletion('Unpaid', e.target.checked)}
                                        className="h-4 w-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                                    />
                                    <label htmlFor="status-unpaid" className="ml-2 block text-sm text-gray-700">
                                        Unpaid Installments
                                    </label>
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="status-paid"
                                        name="status-paid"
                                        checked={lessonDeletionOptions.selectedStatuses.includes('Paid')}
                                        onChange={(e) => handleStatusSelectionForDeletion('Paid', e.target.checked)}
                                        className="h-4 w-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                                    />
                                    <label htmlFor="status-paid" className="ml-2 block text-sm text-gray-700">
                                        Paid Installments
                                    </label>
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="status-overdue"
                                        name="status-overdue"
                                        checked={lessonDeletionOptions.selectedStatuses.includes('Overdue')}
                                        onChange={(e) => handleStatusSelectionForDeletion('Overdue', e.target.checked)}
                                        className="h-4 w-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                                    />
                                    <label htmlFor="status-overdue" className="ml-2 block text-sm text-gray-700">
                                        Overdue Installments
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Preview Section */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Deletion Preview</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Lessons to be deleted:</span>
                                <span className="font-medium text-red-600">
                                    {getLessonsToDelete().length} out of {lessons.length} total lessons
                                </span>
                            </div>
                            {(() => {
                                const hasAnyCriteria = lessonDeletionOptions.deleteByDateRange || 
                                                      lessonDeletionOptions.deleteByGroup || 
                                                      lessonDeletionOptions.deleteByStudent || 
                                                      lessonDeletionOptions.deleteByStatus;
                                
                                if (!hasAnyCriteria) {
                                    return (
                                        <div className="text-xs text-gray-500">
                                            <p>Please select at least one deletion criteria above.</p>
                                        </div>
                                    );
                                }
                                
                                if (getLessonsToDelete().length === 0) {
                                    return (
                                        <div className="text-xs text-gray-500">
                                            <p>No lessons match the selected criteria.</p>
                                        </div>
                                    );
                                }
                                
                                return (
                                    <div className="text-xs text-gray-500">
                                        <p>This will delete lessons matching your selected criteria:</p>
                                        <ul className="list-disc list-inside mt-1 space-y-1">
                                            {lessonDeletionOptions.deleteByDateRange && lessonDeletionOptions.startDate && lessonDeletionOptions.endDate && (
                                                <li>Date range: {lessonDeletionOptions.startDate} to {lessonDeletionOptions.endDate}</li>
                                            )}
                                            {lessonDeletionOptions.deleteByGroup && lessonDeletionOptions.selectedGroups.length > 0 && (
                                                <li>Groups: {lessonDeletionOptions.selectedGroups.length} selected</li>
                                            )}
                                            {lessonDeletionOptions.deleteByStudent && lessonDeletionOptions.selectedStudents.length > 0 && (
                                                <li>Students: {lessonDeletionOptions.selectedStudents.length} selected</li>
                                            )}
                                            {lessonDeletionOptions.deleteByStatus && lessonDeletionOptions.selectedStatuses.length > 0 && (
                                                <li>Statuses: {lessonDeletionOptions.selectedStatuses.join(', ')}</li>
                                            )}
                                        </ul>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                        <button 
                            type="button" 
                            onClick={() => setIsLessonDeletionModalOpen(false)} 
                            className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                        <button 
                            type="button" 
                            onClick={handleSelectiveLessonDeletion}
                            disabled={isDeletingLessons || getLessonsToDelete().length === 0 || 
                                      (!lessonDeletionOptions.deleteByDateRange && 
                                       !lessonDeletionOptions.deleteByGroup && 
                                       !lessonDeletionOptions.deleteByStudent && 
                                       !lessonDeletionOptions.deleteByStatus)}
                            className="px-6 py-2 rounded-lg text-white bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                            {isDeletingLessons ? (
                                <>
                                    <Icon path={ICONS.LOADING} className="w-4 h-4 animate-spin" />
                                    <span>Deleting...</span>
                                </>
                            ) : (
                                <>
                                    <Icon path={ICONS.TRASH} className="w-4 h-4" />
                                    <span>Delete Selected Lessons</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default DashboardModule;
