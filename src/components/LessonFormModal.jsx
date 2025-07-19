import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, setDoc, Timestamp } from 'firebase/firestore';
import { useAppContext } from '../contexts/AppContext';
import Modal from './Modal';
import { FormInput, FormSection } from './Form';
import CustomDatePicker from './CustomDatePicker';

const LessonFormModal = ({ isOpen, onClose, group, lessonToEdit }) => {
    const { db, userId, appId } = useAppContext();
    const [formData, setFormData] = useState({ date: '', topic: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (lessonToEdit) {
            setFormData({
                date: lessonToEdit.lessonDate.toDate().toISOString().split('T')[0],
                topic: lessonToEdit.topic,
            });
        } else {
            setFormData({ date: '', topic: '' });
        }
    }, [lessonToEdit, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if(!formData.date || !formData.topic) return;
        
        const lessonData = {
            topic: formData.topic,
            groupId: group.id,
            lessonDate: Timestamp.fromDate(new Date(formData.date.replace(/-/g, '/'))),
        };

        setIsSubmitting(true);
        try {
            if (lessonToEdit) {
                const lessonDocRef = doc(db, 'artifacts', appId, 'users', userId, 'lessons', lessonToEdit.id);
                await setDoc(lessonDocRef, lessonData, { merge: true });
            } else {
                const lessonsCollectionPath = collection(db, 'artifacts', appId, 'users', userId, 'lessons');
                await addDoc(lessonsCollectionPath, {...lessonData, attendance: {}});
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
                    <div className="sm:col-span-3"><CustomDatePicker label="Date" name="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} /></div>
                    <div className="sm:col-span-3"><FormInput label="Topic" name="topic" value={formData.topic} onChange={(e) => setFormData({...formData, topic: e.target.value})} /></div>
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
