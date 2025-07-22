import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import Modal from './Modal';
import { FormSection } from './Form';
import { ICONS, Icon } from './Icons';
import { useAppContext } from '../contexts/AppContext';

const AttendanceModal = ({ isOpen, onClose, lesson, studentsInGroup, student }) => {
    const { fetchData } = useAppContext();
    const [attendance, setAttendance] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (lesson?.attendance) {
            setAttendance(lesson.attendance);
        } else {
            const initialAttendance = {};
            if (studentsInGroup) {
                studentsInGroup.forEach(s => {
                    initialAttendance[s.id] = 'Absent'; // Default to absent
                });
            } else if (student) {
                initialAttendance[student.id] = 'Absent';
            }
            setAttendance(initialAttendance);
        }
    }, [lesson, studentsInGroup, student]);

    const handleAttendanceChange = (studentId, status) => {
        setAttendance(prev => ({
            ...prev,
            [studentId]: status
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await apiClient.update('lessons', lesson.id, { attendance: attendance });
            fetchData();
            onClose();
        } catch (error) {
            console.error("Error saving attendance: ", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const studentsToDisplay = studentsInGroup || (student ? [student] : []);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Log Attendance">
            <form onSubmit={handleSubmit}>
                <FormSection title="Mark Attendance">
                    <div className="sm:col-span-6 grid grid-cols-1 gap-4">
                        {studentsToDisplay.length > 0 ? (
                            studentsToDisplay.map(s => (
                                <div key={s.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
                                    <span className="font-medium text-gray-800">{s.fullName}</span>
                                    <div className="flex space-x-2">
                                        <button
                                            type="button"
                                            onClick={() => handleAttendanceChange(s.id, 'Present')}
                                            className={`px-3 py-1 rounded-md text-sm ${attendance[s.id] === 'Present' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                        >Present</button>
                                        <button
                                            type="button"
                                            onClick={() => handleAttendanceChange(s.id, 'Absent')}
                                            className={`px-3 py-1 rounded-md text-sm ${attendance[s.id] === 'Absent' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                        >Absent</button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500">No students to display attendance for.</p>
                        )}
                    </div>
                </FormSection>
                <div className="flex justify-end pt-8 mt-8 border-t border-gray-200 space-x-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed">{isSubmitting ? 'Saving...' : 'Save Attendance'}</button>
                </div>
            </form>
        </Modal>
    );
};

export default AttendanceModal;