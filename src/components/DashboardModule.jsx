import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Icon, ICONS } from './Icons';
import StudentFormModal from './StudentFormModal';
import EventFormModal from './EventFormModal';
import ConfirmationModal from './ConfirmationModal';
import { useNotification } from '../contexts/NotificationContext';
import { formatDate } from '../utils/formatDate';
import WeeklyOverview from './WeeklyOverview';
import NotificationCard from './NotificationCard';

const DashboardModule = ({ setActiveModule }) => {
    const { showNotification } = useNotification();
    const [students, setStudents] = useState([]);
    const [groups, setGroups] = useState([]);
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [eventToEdit, setEventToEdit] = useState(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [eventToDelete, setEventToDelete] = useState(null);
    const [todaysSchedule, setTodaysSchedule] = useState([]);
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [weekEvents, setWeekEvents] = useState([]);
    const [allEvents, setAllEvents] = useState({ lessons: [], events: [], birthdays: [] });
    const [duePayments, setDuePayments] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            const { data: studentsData, error: studentsError } = await supabase.from('students').select('*');
            if (studentsError) console.error('Error fetching students:', studentsError);
            else {
                const parsedStudentsData = studentsData.map(s => ({
                    ...s,
                    installments: s.installments ? JSON.parse(s.installments) : [],
                    feeDetails: s.feeDetails ? JSON.parse(s.feeDetails) : {},
                    tutoringDetails: s.tutoringDetails ? JSON.parse(s.tutoringDetails) : {},
                    documents: s.documents ? JSON.parse(s.documents) : {},
                    documentNames: s.documentNames ? JSON.parse(s.documentNames) : {},
                }));
                setStudents(parsedStudentsData);

                const { data: groupsData, error: groupsError } = await supabase.from('groups').select('*');
                if (groupsError) console.error('Error fetching groups:', groupsError);
                else setGroups(groupsData);

                const { data: lessonsData, error: lessonsError } = await supabase.from('lessons').select('*').gte('lessonDate', todayStart.toISOString());
                if (lessonsError) console.error('Error fetching lessons:', lessonsError);
                else setAllEvents(prev => ({ ...prev, lessons: lessonsData.map(l => ({...l, type: 'lesson', eventName: l.topic, startTime: new Date(l.lessonDate)})) }));

                const { data: eventsData, error: eventsError } = await supabase.from('events').select('*').gte('startTime', todayStart.toISOString());
                if (eventsError) console.error('Error fetching events:', eventsError);
                else setAllEvents(prev => ({ ...prev, events: eventsData.map(e => ({...e, type: 'event', startTime: new Date(e.startTime)})) }));

                const currentYear = new Date().getFullYear();
                const birthdays = parsedStudentsData.filter(s => s.birthDate).map(s => {
                    const birthDate = new Date(s.birthDate);
                    let nextBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
                    if (nextBirthday < todayStart) {
                        nextBirthday.setFullYear(currentYear + 1);
                    }
                    return {
                        id: `bday-${s.id}`,
                        type: 'birthday',
                        eventName: `${s.fullName}'s Birthday`,
                        startTime: nextBirthday
                    };
                });
                setAllEvents(prev => ({ ...prev, birthdays }));

                const payments = [];
                parsedStudentsData.forEach(student => {
                    student.installments?.forEach(installment => {
                        if (installment.status === 'Unpaid' && new Date(installment.dueDate) <= now) {
                            payments.push({
                                id: `${student.id}-${installment.number}`,
                                message: `${student.fullName} has an installment of ${installment.amount} ₺ due since ${formatDate(installment.dueDate)}.`, 
                                type: 'warning',
                                studentId: student.id,
                                installmentNumber: installment.number
                            });
                        }
                    });
                });
                setDuePayments(payments);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
        
        const weekStart = new Date(todayStart);
        const dayOfWeek = weekStart.getDay();
        const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); 
        weekStart.setDate(diff);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        const getSortableTime = (item) => (item.startTime)?.getTime() || 0;

        const processAllEvents = () => {
            const allItems = [...allEvents.lessons, ...allEvents.events, ...allEvents.birthdays];

            const eventsWithEndTimes = allItems.map(item => {
                let effectiveEndTime = item.startTime.getTime(); // Default to start time
                if (item.type === 'lesson') {
                    effectiveEndTime = item.startTime.getTime() + 2 * 60 * 60 * 1000; // 2 hours for lessons
                } else if (item.type === 'event' && item.endTime) {
                    effectiveEndTime = new Date(item.endTime).getTime();
                } else if (item.type === 'event') { // Default 1 hour for events if no endTime
                    effectiveEndTime = item.startTime.getTime() + 1 * 60 * 60 * 1000;
                }
                return { ...item, effectiveEndTime };
            });

            setTodaysSchedule(eventsWithEndTimes.filter(item =>
                item.effectiveEndTime >= now.getTime() && // Event ends after or at current time
                item.startTime.getTime() <= todayEnd.getTime() // Event started before or at end of today
            ).sort((a,b) => a.startTime.getTime() - b.startTime.getTime())); // Sort by start time

            setUpcomingEvents(eventsWithEndTimes.filter(item => (item.type === 'event' || item.type === 'birthday') && item.startTime.getTime() >= now.getTime() && item.startTime.getTime() <= now.getTime() + 30 * 24 * 60 * 60 * 1000).sort((a,b) => a.startTime.getTime() - b.startTime.getTime()));

            setWeekEvents(eventsWithEndTimes.filter(item => item.startTime.getTime() >= weekStart.getTime() && item.startTime.getTime() < weekEnd.getTime()));
        };

        processAllEvents();
    }, [allEvents]);
    
    const EventIcon = ({type}) => {
        const iconMap = {
            lesson: { path: ICONS.LESSON, color: 'bg-blue-100 text-blue-600' },
            birthday: { path: ICONS.CAKE, color: 'bg-pink-100 text-pink-600' },
            event: { path: ICONS.CALENDAR, color: 'bg-green-100 text-green-600' },
        };
        const { path, color } = iconMap[type] || { path: ICONS.INFO, color: 'bg-gray-100 text-gray-600' }; // Default to ICONS.INFO
        return <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-4 ${color}`}><Icon path={path} className="w-5 h-5"/></div>
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
            const minutes = Math.floor((diff / (1000 * 60)) % 60);
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));

            let timeString = '';
            if (days > 0) timeString += `${days}d `;
            if (hours > 0) timeString += `${hours}h `;
            timeString += `${minutes}m`;
            return `starts in ${timeString.trim()}`;
        } else if (now >= startTime && now < endTime) {
            // Event is in progress
            const diff = endTime - now;
            const minutes = Math.floor((diff / (1000 * 60)) % 60);
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);

            let timeString = '';
            if (hours > 0) timeString += `${hours}h `;
            timeString += `${minutes}m`;
            return `ends in ${timeString.trim()}`;
        }
        return null;
    };

    const handleEditEvent = (event) => {
        setEventToEdit(event);
        setIsEventModalOpen(true);
    };

    const openDeleteConfirmation = (event) => {
        setEventToDelete(event);
        setIsConfirmModalOpen(true);
    };

    const handleDeleteEvent = async () => {
        if (!eventToDelete) return;
        try {
            const { error } = await supabase.from('events').delete().match({ id: eventToDelete.id });
            if (error) throw error;
            showNotification('Event deleted successfully!', 'success');
        } catch (error) {
            console.error("Error deleting event:", error);
            showNotification('Failed to delete event.', 'error');
        } finally {
            setIsConfirmModalOpen(false);
            setEventToDelete(null);
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
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
                    <h3 className="font-semibold mb-4 text-gray-800">Today's Schedule</h3>
                    {todaysSchedule.length > 0 ? (
                        <ul className="space-y-4">
                            {todaysSchedule.map(item => (
                                <li key={item.id} className="flex items-center justify-between group">
                                    <div className="flex items-center">
                                        <EventIcon type={item.type} />
                                        <div>
                                            <p className="font-medium text-gray-800">{item.eventName} {getTimeRemaining(item) && <span className="text-sm text-gray-500">({getTimeRemaining(item)})</span>}</p>
                                            <p className="text-sm text-gray-500">{item.startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                        </div>
                                    </div>
                                    {item.type === 'event' && (
                                        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEditEvent(item)} className="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-gray-200"><Icon path={ICONS.EDIT} className="w-5 h-5" /></button>
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
                <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
                     <h3 className="font-semibold mb-4 text-gray-800">Upcoming Events</h3>
                     {upcomingEvents.length > 0 ? (
                        <ul className="space-y-4">
                            {upcomingEvents.slice(0, 5).map((item, index) => (
                                <li key={item.id} className={`p-3 rounded-lg flex items-center justify-between group ${index === 0 ? 'bg-blue-50' : ''}`}>
                                     <div className="flex items-center">
                                        <EventIcon type={item.type} />
                                        <div>
                                            <p className="font-medium text-gray-800">{item.eventName} {getTimeRemaining(item) && <span className="text-sm text-gray-500">({getTimeRemaining(item)})</span>}</p>
                                            <p className="text-sm text-gray-500">{formatDate(item.startTime)}</p>
                                        </div>
                                     </div>
                                     {item.type === 'event' && (
                                        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEditEvent(item)} className="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-gray-200"><Icon path={ICONS.EDIT} className="w-5 h-5" /></button>
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
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                    <h3 className="font-semibold mb-4 text-gray-800">Weekly Overview</h3>
                    <WeeklyOverview events={weekEvents} />
                </div>
            </div>

            {/* Important Notifications */}
            {duePayments.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                    <h3 className="font-semibold mb-4 text-gray-800">Important Notifications</h3>
                    <div className="space-y-3">
                        {duePayments.map(notification => (
                            <NotificationCard 
                                key={notification.id} 
                                message={notification.message} 
                                type={notification.type} 
                                // You might want to add an onDismiss prop here if notifications can be dismissed
                            />
                        ))}
                    </div>
                </div>
            )}
            <StudentFormModal isOpen={isStudentModalOpen} onClose={() => setIsStudentModalOpen(false)} />
            <EventFormModal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} eventToEdit={eventToEdit} />
            {eventToDelete && (
                <ConfirmationModal
                    isOpen={isConfirmModalOpen}
                    onClose={() => setIsConfirmModalOpen(false)}
                    onConfirm={handleDeleteEvent}
                    title="Delete Event"
                    message={`Are you sure you want to delete the event "${eventToDelete.eventName}"? This action cannot be undone.`}
                />
            )}
        </div>
    );
};

export default DashboardModule;