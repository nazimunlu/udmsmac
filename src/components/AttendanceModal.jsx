import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { useAppContext } from '../contexts/AppContext';
import Modal from './Modal';
import { formatDate } from '../utils/formatDate';

const AttendanceModal = ({ isOpen, onClose, lesson, students }) => {
    const { db, userId, appId } = useAppContext();
    const [attendance, setAttendance] = useState(lesson.attendance || {});

    const handleStatusChange = async (studentId, status) => {
        const newAttendance = { ...attendance, [studentId]: status };
        setAttendance(newAttendance);
        
        const lessonDocRef = doc(db, 'artifacts', appId, 'users', userId, 'lessons', lesson.id);
        await updateDoc(lessonDocRef, { attendance: newAttendance });

        if (status === 'absent') {
            // Send message to parent
            console.log(`Sayın Velimiz, ${student.fullName} adlı öğrenciniz ${formatDate(lesson.lessonDate)} tarihindeki derse katılamamıştır.`);
        }
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'present': return 'bg-green-500 text-white';
            case 'absent': return 'bg-red-500 text-white';
            case 'late': return 'bg-yellow-500 text-white';
            default: return 'bg-gray-200';
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Attendance for ${lesson.topic} on ${formatDate(lesson.lessonDate)}`}>
            <ul className="divide-y divide-gray-200">
                {students.map(student => (
                    <li key={student.id} className="py-4 flex items-center justify-between">
                        <span className="font-medium text-gray-800">{student.fullName}</span>
                        <div className="flex space-x-2">
                            {['present', 'absent', 'late'].map(status => (
                                <button key={status} onClick={() => handleStatusChange(student.id, status)} className={`px-3 py-1 text-sm rounded-full capitalize transition-colors ${attendance[student.id] === status ? getStatusColor(status) : 'bg-gray-200 hover:bg-gray-300'}`}>
                                    {status}
                                </button>
                            ))}
                        </div>
                    </li>
                ))}
            </ul>
        </Modal>
    );
};

export default AttendanceModal;