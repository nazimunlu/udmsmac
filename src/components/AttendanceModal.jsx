import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import Modal from './Modal';
import { FormSection } from './Form';
import { ICONS, Icon } from './Icons';
import { useAppContext } from '../contexts/AppContext';
import { generateMessage } from '../utils/messageTemplates';

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

    const generateAttendanceMessage = (student, lesson, attendanceStatus) => {
        // Only generate message for absent students
        if (attendanceStatus !== 'Absent') {
            return null;
        }

        // Fix date formatting by using lessonDate and startTime properly
        const lessonDate = new Date(lesson.lessonDate);
        const startTime = lesson.startTime || '09:00';
        
        // Format date as DD/MM/YYYY
        const formattedDate = lessonDate.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        // Format time as HH:MM
        const timeParts = startTime.split(':');
        const formattedTime = `${timeParts[0]}:${timeParts[1]}`;
        
        // Use the message template utility
        return generateMessage('absence', {
            studentName: student.fullName,
            lessonDate: formattedDate,
            lessonTime: formattedTime
        });
    };

    const handleGenerateAttendanceMessage = (student, status) => {
        const message = generateAttendanceMessage(student, lesson, status);
        navigator.clipboard.writeText(message).then(() => {
            // Show success notification using a more user-friendly approach
            const notification = document.createElement('div');
            notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
            notification.textContent = `Message copied to clipboard for ${student.fullName}`;
            document.body.appendChild(notification);
            
            // Remove notification after 3 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 3000);
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = message;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            // Show fallback notification
            const notification = document.createElement('div');
            notification.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
            notification.textContent = `Message copied to clipboard for ${student.fullName}`;
            document.body.appendChild(notification);
            
            // Remove notification after 3 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 3000);
        });
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Log Attendance"
            headerStyle={{ backgroundColor: '#2563EB' }}
        >
            <form onSubmit={handleSubmit}>
                <FormSection title="Mark Attendance">
                    <div className="sm:col-span-6 grid grid-cols-1 gap-4">
                        {studentsToDisplay.length > 0 ? (
                            studentsToDisplay.map(s => (
                                <div key={s.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
                                    <span className="font-medium text-gray-800">{s.fullName}</span>
                                    <div className="flex items-center space-x-2">
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
                                        {attendance[s.id] === 'Absent' && (
                                            <button
                                                type="button"
                                                onClick={() => handleGenerateAttendanceMessage(s, 'Absent')}
                                                className="px-2 py-1 rounded-md text-xs bg-blue-100 text-blue-700 hover:bg-blue-200"
                                                title="Generate absence message"
                                            >
                                                <Icon path={ICONS.MESSAGE} className="w-3 h-3" />
                                            </button>
                                        )}
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