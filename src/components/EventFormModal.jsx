import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useNotification } from '../contexts/NotificationContext';
import Modal from './Modal';
import { FormInput, FormSection } from './Form';
import CustomDatePicker from './CustomDatePicker';
import CustomTimePicker from './CustomTimePicker';
import { useAppContext } from '../contexts/AppContext';

const EventFormModal = ({ isOpen, onClose, eventToEdit }) => {
    const { showNotification } = useNotification();
    const { fetchData } = useAppContext();
    
    const timeOptions = [];
    for (let h = 9; h <= 23; h++) {
        timeOptions.push(`${h.toString().padStart(2, '0')}:00`);
        if (h < 23) timeOptions.push(`${h.toString().padStart(2, '0')}:30`);
    }

    const getInitialFormData = useCallback(() => {
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

        return {
            eventName: eventToEdit?.eventName || '',
            date: getSafeDateString(eventToEdit?.startTime) || new Date().toISOString().split('T')[0],
            startTime: getSafeTimeString(eventToEdit?.startTime),
            endTime: getSafeTimeString(eventToEdit?.endTime),
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
        
        const { eventName, date, startTime, endTime, isAllDay } = formData;
        const [startHour, startMinute] = isAllDay ? [0, 0] : startTime.split(':').map(Number);
        const [endHour, endMinute] = isAllDay ? [23, 59] : endTime.split(':').map(Number);
        const [year, month, day] = date.split('-').map(Number);

        const startDateTime = new Date(year, month - 1, day, startHour, startMinute);
        const endDateTime = new Date(year, month - 1, day, endHour, endMinute);

        const dataToSave = {
            eventName,
            startTime: startDateTime.toISOString(),
            endTime: endDateTime.toISOString(),
            isAllDay,
        };

        try {
            if (eventToEdit) {
                const { error } = await supabase.from('events').update(dataToSave).match({ id: eventToEdit.id });
                if (error) throw error;
                showNotification('Event updated successfully!', 'success');
            } else {
                const { error } = await supabase.from('events').insert([dataToSave]);
                if (error) throw error;
                showNotification('Event logged successfully!', 'success');
            }
            fetchData();
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
                    <div className="sm:col-span-6">
                        <FormInput label="Event Name" name="eventName" value={formData.eventName} onChange={handleChange} required />
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
                <div className="flex justify-end pt-8 mt-8 border-t border-gray-200 space-x-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed">{isSubmitting ? 'Saving...' : 'Save Event'}</button>
                </div>
            </form>
        </Modal>
    );
};

export default EventFormModal;
