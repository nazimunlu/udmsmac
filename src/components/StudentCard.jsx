import React from 'react';
import { Icon, ICONS } from './Icons';
import { formatDate } from '../utils/formatDate';

const StudentCard = ({ student, groups, openEditModal, openDeleteConfirmation, openDetailsModal }) => {
    const studentGroup = groups.find(g => g.id === student.groupId);

    return (
        <div className="bg-white rounded-lg shadow-md p-6 flex flex-col justify-between transform transition duration-300 hover:scale-105">
            <div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{student.fullName}</h3>
                <p className="text-gray-600 text-sm mb-1"><Icon path={ICONS.PHONE} className="w-4 h-4 inline-block mr-1"/> {student.studentContact}</p>
                {student.parentContact && (
                    <p className="text-gray-600 text-sm mb-1"><Icon path={ICONS.PHONE} className="w-4 h-4 inline-block mr-1"/> {student.parentContact} (Parent)</p>
                )}
                <p className="text-gray-600 text-sm mb-1"><Icon path={ICONS.CALENDAR} className="w-4 h-4 inline-block mr-1"/> Enrolled: {formatDate(student.enrollmentDate)}</p>
                
                {student.isTutoring ? (
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">Tutoring Student</span>
                ) : (
                    studentGroup ? (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold text-white" style={{backgroundColor: studentGroup.color}}>{studentGroup.groupName}</span>
                    ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">No Group Assigned</span>
                    )
                )}
            </div>
            <div className="flex justify-end space-x-2 mt-4">
                <button onClick={() => openDetailsModal(student)} className="p-2 text-gray-600 hover:text-blue-800 rounded-full hover:bg-gray-200"><Icon path={ICONS.INFO} className="w-5 h-5" /></button>
                <button onClick={() => openEditModal(student)} className="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-gray-200"><Icon path={ICONS.EDIT} className="w-5 h-5" /></button>
                <button onClick={() => openDeleteConfirmation(student)} className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-gray-200"><Icon path={ICONS.DELETE} className="w-5 h-5" /></button>
            </div>
        </div>
    );
};

export default StudentCard;