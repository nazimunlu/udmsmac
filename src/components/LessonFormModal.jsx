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
    const { fetchData } = useAppContext();
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

    useEffect(() => {
        if (lessonToEdit) {
            setFormData({
                date: new Date(lessonToEdit.lessonDate).toISOString().split('T')[0],
                topic: lessonToEdit.topic,
                startTime: lessonToEdit.startTime || '09:00',
                endTime: lessonToEdit.endTime || '10:00',
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

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const uploadFile = async (file, path) => {
        if (!file) return null;
        const { data, error } = await supabase.storage.from('udms').upload(path, file);
        if (error) throw error;
        return supabase.storage.from('udms').getPublicUrl(path).data.publicUrl;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.date || !formData.topic) return;

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
            const sanitizedFileName = sanitizeFileName(file.name);
            const materialPath = `lesson_materials/${user.id}/${groupId}/${Date.now()}_${sanitizedFileName}`;
            materialUrl = await uploadFile(file, materialPath);
            materialName = file.name;
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
                <div className="flex justify-end pt-8 mt-8 border-t border-gray-200 space-x-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed">{isSubmitting ? 'Saving...' : 'Save Lesson'}</button>
                </div>
            </form>
        </Modal>
    );
};

export default LessonFormModal;
