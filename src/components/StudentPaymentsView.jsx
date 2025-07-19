import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';

const StudentPaymentsView = ({ onStudentSelect }) => {
    const { students } = useAppContext();
    const [activeTab, setActiveTab] = useState('group');
    
    const groupStudents = students.filter(s => !s.isTutoring);
    const tutoringStudents = students.filter(s => s.isTutoring);
    const studentsToShow = activeTab === 'group' ? groupStudents : tutoringStudents;

    return (
        <div className="bg-white rounded-lg shadow-md">
            <div className="p-4 border-b border-gray-200">
                 <h3 className="font-semibold text-xl text-gray-800">Manage Student Payments</h3>
            </div>
            <div className="px-4 border-b border-gray-200">
                <nav className="flex space-x-4" aria-label="Tabs">
                    <button onClick={() => setActiveTab('group')} className={`-mb-px px-3 py-2 font-medium text-sm border-b-2 ${activeTab === 'group' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Group Students</button>
                    <button onClick={() => setActiveTab('tutoring')} className={`-mb-px px-3 py-2 font-medium text-sm border-b-2 ${activeTab === 'tutoring' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Tutoring Students</button>
                </nav>
            </div>
            <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Full Name</th>
                            <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Payment Status</th>
                            <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Next Due Date</th>
                            <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {studentsToShow.length > 0 ? (
                            studentsToShow.map(student => (
                                <tr key={student.id} className="hover:bg-gray-50">
                                    <td className="p-4 text-gray-800">{student.fullName}</td>
                                    <td className="p-4 text-gray-600">
                                        <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">Paid</span>
                                    </td>
                                    <td className="p-4 text-gray-600">N/A</td>
                                    <td className="p-4">
                                        <button onClick={() => onStudentSelect(student)} className="text-sm font-medium text-blue-600 hover:underline">View Details</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="4" className="p-4 text-center text-gray-500">No students found in this category.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StudentPaymentsView;