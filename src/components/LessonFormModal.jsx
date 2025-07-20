import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, setDoc, Timestamp } from 'firebase/firestore';
import { supabase } from '../supabaseClient';
import { useAppContext } from '../contexts/AppContext';
import Modal from './Modal';
import { FormInput, FormSection } from './Form';
import CustomDatePicker from './CustomDatePicker';
import CustomTimePicker from './CustomTimePicker';
import { Icon, ICONS } from './Icons';

const LessonFormModal = ({ isOpen, onClose, group, lessonToEdit, student }) => {
    const { db, userId, appId } = useAppContext();
        const [formData, setFormData] = useState({
        date: '',
        topic: '',
        startTime: '',
        endTime: '',
        attendance: {},
        materialUrl: '',
        materialName: '',
    });
    const [file, setFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const timeOptions = [];
    for (let h = 9; h <= 23; h++) {
        for (let m = 0; m < 60; m += 30) {
            timeOptions.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
    }

    useEffect(() => {
        let initialAttendance = {};
        if (group && students) {
            initialAttendance = students.reduce((acc, s) => {
                acc[s.id] = lessonToEdit?.attendance?.[s.id] || false;
                return acc;
            }, {});
        } else if (student) {
            initialAttendance[student.id] = lessonToEdit?.attendance?.[student.id] || false;
        }

        if (lessonToEdit) {
            setFormData({
                date: lessonToEdit.lessonDate.toDate().toISOString().split('T')[0],
                topic: lessonToEdit.topic,
                startTime: lessonToEdit.startTime || '09:00',
                endTime: lessonToEdit.endTime || '10:00',
                attendance: initialAttendance,
                materialUrl: lessonToEdit.materialUrl || '',
                materialName: lessonToEdit.materialName || ''
            });
        } else {
            setFormData({
                date: new Date().toISOString().split('T')[0],
                topic: '',
                startTime: group?.schedule?.startTime || '09:00',
                endTime: group?.schedule?.endTime || '10:00',
                attendance: initialAttendance,
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

    const handleAttendanceChange = (studentId) => {
        setFormData(prev => ({
            ...prev,
            attendance: {
                ...prev.attendance,
                [studentId]: !prev.attendance[studentId]
            }
        }));
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
            const materialPath = `lesson_materials/${userId}/${groupId}/${Date.now()}_${file.name}`;
            materialUrl = await uploadFile(file, materialPath);
            materialName = file.name;
            // Add to documents collection for centralized management
            await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'documents'), {
                name: materialName,
                url: materialUrl,
                type: 'lessonMaterial',
                uploadDate: Timestamp.now(),
                groupId: groupId,
            });
        }

        const lessonData = {
            topic: formData.topic,
            lessonDate: Timestamp.fromDate(new Date(formData.date.replace(/-/g, '/'))),
            startTime: formData.startTime,
            endTime: formData.endTime,
            materialUrl,
            materialName,
            status: 'Incomplete'
        };

        if (group) {
            lessonData.groupId = group.id;
            lessonData.attendance = formData.attendance;
        } else if (student) {
            lessonData.groupId = student.groupId;
            lessonData.studentId = student.id;
            lessonData.attendance = { [student.id]: true }; // Mark tutoring student as present by default
        }

        try {
            if (lessonToEdit) {
                const lessonDocRef = doc(db, 'artifacts', appId, 'users', userId, 'lessons', lessonToEdit.id);
                await setDoc(lessonDocRef, lessonData, { merge: true });
            } else {
                const lessonsCollectionPath = collection(db, 'artifacts', appId, 'users', userId, 'lessons');
                await addDoc(lessonsCollectionPath, lessonData);
            }
            onClose();
        } catch (error) {
            console.error("Error saving lesson: ", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={lessonToEdit ? "Edit Lesson" : "Log New Lesson"}>
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
                                        <span>{file ? file.name : (formData.materialName || 'Upload a file')}</span>
                                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} />
                                    </label>
                                </div>
                                <p className="text-xs text-gray-500">PDF, DOCX, etc. up to 10MB</p>
                            </div>
                        </div>
                    </div>
                </FormSection>
                {group && students && (
                    <FormSection title="Quick Attendance">
                        <div className="sm:col-span-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                            {students.map(s => (
                                <label key={s.id} className="flex items-center space-x-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={formData.attendance?.[s.id] || false}
                                        onChange={() => handleAttendanceChange(s.id)}
                                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-gray-700">{s.fullName}</span>
                                </label>
                            ))}
                        </div>
                    </FormSection>
                )}
                <div className="flex justify-end pt-8 mt-8 border-t border-gray-200 space-x-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed">{isSubmitting ? 'Saving...' : 'Save Lesson'}</button>
                </div>
            </form>
        </Modal>
    );
};

export default LessonFormModal;
