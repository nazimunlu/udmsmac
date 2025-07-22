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
            event_name: eventToEdit?.event_name || '',
            date: getSafeDateString(eventToEdit?.start_time) || new Date().toISOString().split('T')[0],
            start_time: getSafeTimeString(eventToEdit?.start_time),
            end_time: getSafeTimeString(eventToEdit?.end_time),
            is_all_day: eventToEdit?.is_all_day || false,
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
        
        const { event_name, date, start_time, end_time, is_all_day } = formData;
        const [startHour, startMinute] = is_all_day ? [0, 0] : start_time.split(':').map(Number);
        const [endHour, endMinute] = is_all_day ? [23, 59] : end_time.split(':').map(Number);
        const [year, month, day] = date.split('-').map(Number);

        const startDateTime = new Date(year, month - 1, day, startHour, startMinute);
        const endDateTime = new Date(year, month - 1, day, endHour, endMinute);

        const dataToSave = {
            event_name,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            is_all_day,
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
                        <FormInput label="Event Name" name="event_name" value={formData.event_name} onChange={handleChange} required />
                    </div>
                    <div className="sm:col-span-3">
                        <CustomDatePicker label="Date" name="date" value={formData.date} onChange={handleChange} />
                    </div>
                    <div className="sm:col-span-3 flex items-center pt-7">
                        <input type="checkbox" id="isAllDay" name="is_all_day" checked={formData.is_all_day} onChange={handleChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                        <label htmlFor="isAllDay" className="ml-2 block text-sm text-gray-900">All-day event</label>
                    </div>
                    {!formData.is_all_day && (
                        <>
                            <div className="sm:col-span-3">
                                <CustomTimePicker label="Start Time" name="start_time" value={formData.start_time} onChange={handleChange} options={timeOptions} />
                            </div>
                            <div className="sm:col-span-3">
                                <CustomTimePicker label="End Time" name="end_time" value={formData.end_time} onChange={handleChange} options={timeOptions} />
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
