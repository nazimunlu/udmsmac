import React, { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, doc, setDoc, Timestamp } from 'firebase/firestore';
import { useAppContext } from '../contexts/AppContext';
import Modal from './Modal';
import { FormInput, FormSelect, FormSection } from './Form';
import CustomDatePicker from './CustomDatePicker';
import CustomTimePicker from './CustomTimePicker';

const EventFormModal = ({ isOpen, onClose, eventToEdit }) => {
    const { db, userId, appId } = useAppContext();
    
    const timeOptions = [];
    for (let h = 9; h <= 23; h++) {
        timeOptions.push(`${h.toString().padStart(2, '0')}:00`);
        if (h < 23) timeOptions.push(`${h.toString().padStart(2, '0')}:30`);
    }

    const getInitialFormData = useCallback(() => {
        const getSafeDateString = (dateSource) => {
            if (dateSource && typeof dateSource.toDate === 'function') {
                return dateSource.toDate().toISOString().split('T')[0];
            }
            if (typeof dateSource === 'string' && dateSource) {
                return dateSource;
            }
            return '';
        };

        const getSafeTimeString = (dateSource) => {
            if (dateSource && typeof dateSource.toDate === 'function') {
                return dateSource.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            return '09:00';
        };

        return {
            eventName: eventToEdit?.eventName || '',
            date: getSafeDateString(eventToEdit?.startTime) || new Date().toISOString().split('T')[0],
            startTime: getSafeTimeString(eventToEdit?.startTime),
            endTime: getSafeTimeString(eventToEdit?.endTime),
            description: eventToEdit?.description || '',
            category: eventToEdit?.category || 'lesson',
            isAllDay: eventToEdit?.isAllDay || false,
        };
    }, [eventToEdit]);

    const [formData, setFormData] = useState(getInitialFormData());
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    useEffect(() => {
        if (isOpen) {
            setFormData(getInitialFormData());
        }
    }, [isOpen, getInitialFormData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        const { eventName, date, startTime, endTime, description, category, isAllDay } = formData;
        const [startHour, startMinute] = isAllDay ? [0, 0] : startTime.split(':').map(Number);
        const [endHour, endMinute] = isAllDay ? [23, 59] : endTime.split(':').map(Number);
        const [year, month, day] = date.split('-').map(Number);

        const startDateTime = new Date(year, month - 1, day, startHour, startMinute);
        const endDateTime = new Date(year, month - 1, day, endHour, endMinute);

        const dataToSave = {
            eventName,
            description,
            startTime: Timestamp.fromDate(startDateTime),
            endTime: Timestamp.fromDate(endDateTime),
            category,
            isAllDay,
        };

        try {
            if (eventToEdit) {
                const eventDocRef = doc(db, 'artifacts', appId, 'users', userId, 'events', eventToEdit.id);
                await setDoc(eventDocRef, dataToSave, { merge: true });
            } else {
                const eventCollectionPath = collection(db, 'artifacts', appId, 'users', userId, 'events');
                await addDoc(eventCollectionPath, dataToSave);
            }
            onClose();
        } catch (error) {
            console.error("Error saving event:", error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={eventToEdit ? "Edit Event" : "Log New Event"}>
            <form onSubmit={handleSubmit}>
                <FormSection title="Event Details">
                    <div className="sm:col-span-6"><FormInput label="Event Name" name="eventName" value={formData.eventName} onChange={handleChange} required /></div>
                    <div className="sm:col-span-6"><FormInput label="Description" name="description" value={formData.description} onChange={handleChange} /></div>
                    <div className="sm:col-span-3"><FormSelect label="Category" name="category" value={formData.category} onChange={handleChange}>
                        <option value="lesson">Lesson</option>
                        <option value="meeting">Meeting</option>
                        <option value="other">Other</option>
                    </FormSelect></div>
                    <div className="sm:col-span-3 flex items-center justify-end pt-5">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" name="isAllDay" checked={formData.isAllDay} onChange={handleChange} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            <span className="ml-3 text-sm font-medium text-gray-900">All-day</span>
                        </label>
                    </div>
                    <div className="sm:col-span-2"><CustomDatePicker label="Date" name="date" value={formData.date} onChange={handleChange} /></div>
                    {!formData.isAllDay && <><div className="sm:col-span-2"><CustomTimePicker label="Start Time" name="startTime" value={formData.startTime} onChange={handleChange} options={timeOptions}/></div>
                    <div className="sm:col-span-2"><CustomTimePicker label="End Time" name="endTime" value={formData.endTime} onChange={handleChange} options={timeOptions}/></div></>} 
                </FormSection>
                <div className="flex justify-end pt-8 mt-8 border-t border-gray-200 space-x-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed">{isSubmitting ? 'Saving...' : 'Save Event'}</button>
                </div>
            </form>
        </Modal>
    );
};

export default EventFormModal;