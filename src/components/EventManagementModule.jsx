import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { useAppContext } from '../contexts/AppContext';
import { Icon, ICONS } from './Icons';
import EventFormModal from './EventFormModal';
import ConfirmationModal from './ConfirmationModal';
import { formatDate } from '../utils/formatDate';
import { useNotification } from '../contexts/NotificationContext';

const EventManagementModule = () => {
    const { db, userId, appId } = useAppContext();
    const { showNotification } = useNotification();
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEventFormModalOpen, setIsEventFormModalOpen] = useState(false);
    const [eventToEdit, setEventToEdit] = useState(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [eventToDelete, setEventToDelete] = useState(null);

    useEffect(() => {
        if (!userId || !appId) return;
        const q = collection(db, 'artifacts', appId, 'users', userId, 'events');
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            eventsData.sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis());
            setEvents(eventsData);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [db, userId, appId]);

    const handleAddEvent = () => {
        setEventToEdit(null);
        setIsEventFormModalOpen(true);
    };

    const handleEditEvent = (event) => {
        setEventToEdit(event);
        setIsEventFormModalOpen(true);
    };

    const openDeleteConfirmation = (event) => {
        setEventToDelete(event);
        setIsConfirmModalOpen(true);
    };

    const handleDeleteEvent = async () => {
        if (!eventToDelete) return;
        try {
            const eventDocRef = doc(db, 'artifacts', appId, 'users', userId, 'events', eventToDelete.id);
            await deleteDoc(eventDocRef);
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
        <div className="relative p-4 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Event Management</h2>
                <button onClick={handleAddEvent} className="flex items-center px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow"><Icon path={ICONS.ADD} className="mr-2"/>Add Event</button>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Event Name</th>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Date</th>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Time</th>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Category</th>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {isLoading ? (
                                <tr><td colSpan="5" className="p-4 text-center text-gray-500">Loading events...</td></tr>
                            ) : events.length > 0 ? (
                                events.map(event => (
                                    <tr key={event.id} className="hover:bg-gray-50">
                                        <td className="p-4 text-gray-800">{event.eventName}</td>
                                        <td className="p-4 text-gray-600">{formatDate(event.startTime)}</td>
                                        <td className="p-4 text-gray-600">{event.isAllDay ? 'All Day' : `${event.startTime.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${event.endTime.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}</td>
                                        <td className="p-4 text-gray-600">{event.category}</td>
                                        <td className="p-4">
                                            <div className="flex space-x-2">
                                                <button onClick={() => handleEditEvent(event)} className="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-gray-200"><Icon path={ICONS.EDIT} className="w-5 h-5" /></button>
                                                <button onClick={() => openDeleteConfirmation(event)} className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-gray-200"><Icon path={ICONS.DELETE} className="w-5 h-5" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="5" className="p-4 text-center text-gray-500">No events found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <EventFormModal isOpen={isEventFormModalOpen} onClose={() => setIsEventFormModalOpen(false)} eventToEdit={eventToEdit} />
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

export default EventManagementModule;