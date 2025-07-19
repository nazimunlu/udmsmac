import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { useAppContext } from '../contexts/AppContext';
import { Icon, ICONS } from './Icons';
import StudentFormModal from './StudentFormModal';
import EventFormModal from './EventFormModal';
import { formatDate } from '../utils/formatDate';
import WeeklyOverview from './WeeklyOverview';

const DashboardModule = ({ setActiveModule }) => {
    const { students, groups, db, userId, appId } = useAppContext();
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [todaysSchedule, setTodaysSchedule] = useState([]);
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [weekEvents, setWeekEvents] = useState([]);

    useEffect(() => {
        if (!userId || !appId) return;

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
        
        const weekStart = new Date(todayStart);
        const dayOfWeek = weekStart.getDay();
        const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); 
        weekStart.setDate(diff);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        const getSortableTime = (item) => (item.startTime)?.toMillis() || 0;

        const processAllEvents = () => {
            const allItems = [...(window.lessons || []), ...(window.events || []), ...(window.birthdays || [])];

            const eventsWithEndTimes = allItems.map(item => {
                let effectiveEndTime = item.startTime.toMillis(); // Default to start time
                if (item.type === 'lesson') {
                    effectiveEndTime = item.startTime.toMillis() + 2 * 60 * 60 * 1000; // 2 hours for lessons
                } else if (item.type === 'event' && item.endTime) {
                    effectiveEndTime = item.endTime.toMillis();
                } else if (item.type === 'event') { // Default 1 hour for events if no endTime
                    effectiveEndTime = item.startTime.toMillis() + 1 * 60 * 60 * 1000;
                }
                return { ...item, effectiveEndTime };
            });

            setTodaysSchedule(eventsWithEndTimes.filter(i =>
                i.effectiveEndTime >= now.getTime() && // Event ends after or at current time
                i.startTime.toMillis() <= todayEnd.getTime() // Event started before or at end of today
            ).sort((a,b) => a.startTime.toMillis() - b.startTime.toMillis())); // Sort by start time

            setUpcomingEvents(eventsWithEndTimes.filter(i => i.startTime.toMillis() >= now.getTime()).sort((a,b) => i.startTime.toMillis() - b.startTime.toMillis()));

            setWeekEvents(eventsWithEndTimes.filter(i => i.startTime.toMillis() >= weekStart.getTime() && i.startTime.toMillis() < weekEnd.getTime()));
        };

        const unsubLessons = onSnapshot(query(collection(db, 'artifacts', appId, 'users', userId, 'lessons'), where("lessonDate", ">=", todayStart)), (snapshot) => {
            window.lessons = snapshot.docs.map(doc => ({id: doc.id, type: 'lesson', eventName: doc.data().topic, startTime: doc.data().lessonDate }));
            processAllEvents();
        });

        const unsubEvents = onSnapshot(query(collection(db, 'artifacts', appId, 'users', userId, 'events'), where("startTime", ">=", todayStart)), (snapshot) => {
            window.events = snapshot.docs.map(doc => ({id: doc.id, type: 'event', ...doc.data()}));
            processAllEvents();
        });
        
        const currentYear = new Date().getFullYear();
        window.birthdays = students.filter(s => s.birthDate).map(s => {
            const birthDate = s.birthDate.toDate();
            let nextBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
            if (nextBirthday < todayStart) {
                nextBirthday.setFullYear(currentYear + 1);
            }
            return {
                id: `bday-${s.id}`,
                type: 'birthday',
                eventName: `${s.fullName}'s Birthday`,
                startTime: Timestamp.fromDate(nextBirthday)
            };
        });
        processAllEvents();


        return () => {
            unsubLessons();
            unsubEvents();
        }

    }, [db, userId, appId, students]);
    
    const EventIcon = ({type}) => {
        const iconMap = {
            lesson: { path: ICONS.LESSON, color: 'bg-blue-100 text-blue-600' },
            birthday: { path: ICONS.CAKE, color: 'bg-pink-100 text-pink-600' },
            event: { path: ICONS.CALENDAR, color: 'bg-green-100 text-green-600' },
        };
        const { path, color } = iconMap[type] || iconMap.event;
        return <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-4 ${color}`}><Icon path={path} className="w-5 h-5"/></div>
    };

    const getTimeRemaining = (item) => {
        const now = Date.now();
        const startTime = item.startTime.toMillis();
        const endTime = item.effectiveEndTime;

        if (item.type === 'birthday') return null; // Birthdays don't have time remaining

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

    return (
        <div className="relative p-4 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg shadow-lg">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                 <div className="bg-white p-6 rounded-lg shadow-md flex items-center cursor-pointer" onClick={() => setActiveModule('students')}>
                    <div className="bg-blue-100 text-blue-600 rounded-full p-3 mr-4 flex items-center justify-center"><Icon path={ICONS.STUDENTS} className="w-6 h-6" /></div>
                    <div>
                        <h3 className="text-gray-500 text-sm font-medium">Total Students</h3>
                        <p className="text-3xl font-bold text-gray-800">{students.length}</p>
                    </div>
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-md flex items-center cursor-pointer" onClick={() => setActiveModule('groups')}>
                    <div className="bg-green-100 text-green-600 rounded-full p-3 mr-4 flex items-center justify-center"><Icon path={ICONS.GROUPS} className="w-6 h-6"/></div>
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
                                <li key={item.id} className="flex items-center">
                                    <EventIcon type={item.type} />
                                    <div>
                                        <p className="font-medium text-gray-800">{item.eventName} {getTimeRemaining(item) && <span className="text-sm text-gray-500">({getTimeRemaining(item)})</span>}</p>
                                        <p className="text-sm text-gray-500">{item.startTime.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                    </div>
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
                                <li key={item.id} className={`p-3 rounded-lg flex items-center ${index === 0 ? 'bg-blue-50' : ''}`}>
                                     <EventIcon type={item.type} />
                                    <div>
                                        <p className="font-medium text-gray-800">{item.eventName} {getTimeRemaining(item) && <span className="text-sm text-gray-500">({getTimeRemaining(item)})</span>}</p>
                                        <p className="text-sm text-gray-500">{formatDate(item.startTime.toDate())}</p>
                                    </div>
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
            <StudentFormModal isOpen={isStudentModalOpen} onClose={() => setIsStudentModalOpen(false)} />
            <EventFormModal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} />
        </div>
    );
};

export default DashboardModule;