import React, { useState, useEffect, useMemo } from 'react';
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
import { generateAllLessons } from '../utils/lessonCalculator';
import CustomDatePicker from './CustomDatePicker';
import CustomTimePicker from './CustomTimePicker';

const DashboardModule = ({ setActiveModule }) => {
    const { showNotification } = useNotification();
    const { students, groups, lessons, events, payments, fetchData } = useAppContext();
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
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '10:00'
    });
    const [isGeneratingLessons, setIsGeneratingLessons] = useState(false);

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
        
        const weekStart = new Date(todayStart);
        const dayOfWeek = weekStart.getDay();
        const weekStartUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)));
        const weekEnd = new Date(Date.UTC(weekStartUTC.getFullYear(), weekStartUTC.getMonth(), weekStartUTC.getDate() + 7));

        const allItems = [
            ...(lessons || []).map(l => {
                let eventName = l.topic;
                let color;
                if (l.studentId) {
                    const student = students.find(s => s.id === l.studentId);
                    if (student) {
                        eventName = `${student.fullName}: ${l.topic}`;
                        color = generateColorForString(student.id);
                    }
                } else if (l.groupId) {
                    const group = groups.find(g => g.id === l.groupId);
                    if (group) {
                        eventName = `${group.groupName}: ${l.topic}`;
                        color = group.color;
                    }
                }
                // For lessons, properly combine date with start time for accurate time calculations
                const lessonDate = new Date(l.lessonDate);
                const lessonStartTime = new Date(`${l.lessonDate}T${l.startTime || '09:00'}:00`);
                return {...l, type: 'lesson', eventName, startTime: lessonStartTime, originalStartTime: l.startTime, originalEndTime: l.endTime, color};
            }),
            ...(events || []).map(e => ({...e, type: 'event', eventName: e.eventName, startTime: new Date(e.startTime), endTime: e.endTime ? new Date(e.endTime) : null, isAllDay: e.isAllDay, color: 'rgb(16, 185, 129)', category: e.category})),
            ...(students || []).filter(s => s.birthDate).map(s => {
                const birthDate = new Date(s.birthDate);
                let nextBirthday = new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate());
                if (nextBirthday < now) {
                    nextBirthday.setFullYear(now.getFullYear() + 1);
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
                const lessonDate = item.startTime instanceof Date ? item.startTime : new Date(item.startTime);
                const dateStr = lessonDate.toISOString().split('T')[0];
                const endTime = new Date(`${dateStr}T${item.originalEndTime || '10:00'}:00`);
                effectiveEndTime = endTime.getTime();
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

        setUpcomingEvents(eventsWithEndTimes.filter(item => (item.type === 'event' || item.type === 'birthday' || item.type === 'lesson') && item.startTime.getTime() >= now.getTime() && item.startTime.getTime() <= now.getTime() + 30 * 24 * 60 * 60 * 1000).sort((a,b) => a.startTime.getTime() - b.startTime.getTime()));

        const filteredWeekEvents = eventsWithEndTimes.filter(item => item.startTime.getTime() >= weekStart.getTime() && item.startTime.getTime() < weekEnd.getTime() && item.type !== 'birthday' && !(item.type === 'event' && item.isAllDay));
        setWeekEvents(filteredWeekEvents);

        const paymentsDue = [];
        (students || []).forEach(student => {
            const overdueInstallments = student.installments?.filter(
                inst => inst.status === 'Unpaid' && new Date(inst.dueDate) <= now
            );

            if (overdueInstallments && overdueInstallments.length > 0) {
                const totalDue = overdueInstallments.reduce((sum, inst) => sum + inst.amount, 0);
                const lastDueDate = overdueInstallments.reduce((latest, inst) => 
                    new Date(inst.dueDate) > new Date(latest.dueDate) ? inst : latest
                ).dueDate;

                paymentsDue.push({
                    id: `payment-${student.id}`,
                    message: `${student.fullName} has ${overdueInstallments.length} overdue payment(s) totaling ${totalDue.toFixed(2)} ₺.`,
                    details: `Last due date was ${formatDate(lastDueDate)}.`,
                    type: 'warning',
                    student_id: student.id,
                });
            }
        });
        setDuePayments(paymentsDue);

    }, [students, groups, lessons, events, payments]);
    
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

    return (
        <div className="relative p-4 md:p-8 bg-gray-50 rounded-lg shadow-lg">
            <div className="flex justify-between items-center pb-4 mb-8 border-b border-gray-200">
                <h2 className="text-3xl font-bold text-gray-800 flex items-center"><Icon path={ICONS.DASHBOARD} className="w-8 h-8 mr-3"/>Dashboard</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                 <div className="bg-white p-6 rounded-lg shadow-md flex items-center cursor-pointer" onClick={() => setActiveModule('students')}>
                    <div className="bg-gray-100 text-blue-600 rounded-full p-3 mr-4 flex items-center justify-center"><Icon path={ICONS.STUDENTS} className="w-6 h-6" /></div>
                    <div>
                        <h3 className="text-gray-500 text-sm font-medium">Total Students</h3>
                        <p className="text-3xl font-bold text-gray-800">{students.length}</p>
                    </div>
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-md flex items-center cursor-pointer" onClick={() => setActiveModule('groups')}>
                    <div className="bg-gray-100 text-green-600 rounded-full p-3 mr-4 flex items-center justify-center"><Icon path={ICONS.GROUPS} className="w-6 h-6"/></div>
                    <div>
                        <h3 className="text-gray-500 text-sm font-medium">Total Groups</h3>
                        <p className="text-3xl font-bold text-gray-800">{groups.length}</p>
                    </div>
                </div>
                <button onClick={() => setIsStudentModalOpen(true)} className="bg-blue-600 text-white p-6 rounded-lg shadow-md hover:bg-blue-700 transition-colors text-left flex items-center">
                    <Icon path={ICONS.ADD} className="w-8 h-8 mr-4"/>
                    <div>
                        <h3 className="text-lg font-semibold">Enroll Student</h3>
                        <p className="text-sm opacity-80">Add a new student.</p>
                    </div>
                </button>
                <button onClick={() => setIsEventModalOpen(true)} className="bg-green-600 text-white p-6 rounded-lg shadow-md hover:bg-green-700 transition-colors text-left flex items-center">
                     <Icon path={ICONS.CALENDAR} className="w-8 h-8 mr-4"/>
                    <div>
                        <h3 className="text-lg font-semibold">Log Event</h3>
                        <p className="text-sm opacity-80">Add a new event.</p>
                    </div>
                </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="font-semibold mb-4 text-gray-800">Today's Schedule</h3>
                        {todaysSchedule.length > 0 ? (
                            <ul className="space-y-4">
                                {todaysSchedule.map(item => (
                                    <li key={item.id} className="flex items-center justify-between group">
                                        <div className="flex items-center">
                                            <EventIcon type={item.type} color={item.color} category={item.category} />
                                            <div>
                                                <p className="font-medium text-gray-800">{item.eventName} {getTimeRemaining(item) && <span className="text-sm text-gray-500">({getTimeRemaining(item)})</span>}</p>
                                                <p className="text-sm text-gray-500">
                                                    {item.allDay ? 'All Day' : 
                                                     item.type === 'lesson' ? 
                                                        `${item.originalStartTime || '09:00'} - ${item.originalEndTime || '10:00'}` :
                                                        item.startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false, timeZone: 'Europe/Istanbul'})
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                        {(item.type === 'event' || item.type === 'lesson') && (
                                            <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEditItem(item)} className="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-gray-200"><Icon path={ICONS.EDIT} className="w-5 h-5" /></button>
                                                <button onClick={() => openDeleteConfirmation(item)} className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-gray-200"><Icon path={ICONS.DELETE} className="w-5 h-5" /></button>
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500 text-center py-4">No events or lessons scheduled for today.</p>
                        )}
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="font-semibold mb-4 text-gray-800">Upcoming Events</h3>
                        {upcomingEvents.length > 0 ? (
                            <ul className="space-y-4">
                                {upcomingEvents.slice(0, 5).map((item, index) => (
                                    <li key={item.id} className={`p-3 rounded-lg flex items-center justify-between group ${index === 0 ? 'bg-blue-50' : ''}`}>
                                        <div className="flex items-center">
                                            <EventIcon type={item.type} color={item.color} category={item.category} />
                                            <div>
                                                <p className="font-medium text-gray-800">{item.eventName} {getTimeRemaining(item) && <span className="text-sm text-gray-500">({getTimeRemaining(item)})</span>}</p>
                                                <p className="text-sm text-gray-500">{formatDate(item.startTime)}</p>
                                            </div>
                                        </div>
                                        {(item.type === 'event' || item.type === 'lesson') && (
                                            <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEditItem(item)} className="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-gray-200"><Icon path={ICONS.EDIT} className="w-5 h-5" /></button>
                                                <button onClick={() => openDeleteConfirmation(item)} className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-gray-200"><Icon path={ICONS.DELETE} className="w-5 h-5" /></button>
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500 text-center py-4">No upcoming events.</p>
                        )}
                    </div>
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <TodoModule />
                </div>
            </div>

            {/* Important Notifications */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h3 className="font-semibold mb-4 text-gray-800">Important Notifications</h3>
                {duePayments.length > 0 ? (
                    <ul className="space-y-4">
                        {duePayments.map(notification => (
                            <li key={notification.id} className="flex items-center justify-between group">
                                <div className="flex items-center">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-4 bg-yellow-100 text-yellow-600">
                                        <Icon path={ICONS.WALLET} className="w-5 h-5"/>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-800">{notification.message}</p>
                                        {notification.details && <p className="text-sm text-gray-500">{notification.details}</p>}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="flex items-center text-green-600">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-4 bg-green-100 text-green-600">
                            <Icon path={ICONS.CHECK} className="w-5 h-5"/>
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
        </div>
    );
};

export default DashboardModule;