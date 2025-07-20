import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { formatDate } from '../utils/formatDate';

const StudentPaymentsView = ({ onStudentSelect }) => {
    const [students, setStudents] = useState([]);
    const [incomeTransactions, setIncomeTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const { data: transactionsData, error: transactionsError } = await supabase.from('transactions').select('*').in('type', ["income-group", "income-tutoring"]);
            if (transactionsError) console.error('Error fetching transactions:', transactionsError);
            else {
                transactionsData.sort((a, b) => new Date(b.date) - new Date(a.date));
                setIncomeTransactions(transactionsData || []);
            }

            const { data: studentsData, error: studentsError } = await supabase.from('students').select('*');
            if (studentsError) console.error('Error fetching students:', studentsError);
            else setStudents(studentsData.map(s => ({
                ...s,
                installments: s.installments ? JSON.parse(s.installments) : [],
                feeDetails: s.feeDetails ? JSON.parse(s.feeDetails) : {},
                tutoringDetails: s.tutoringDetails ? JSON.parse(s.tutoringDetails) : {},
                documents: s.documents ? JSON.parse(s.documents) : {},
                documentNames: s.documentNames ? JSON.parse(s.documentNames) : {},
            })) || []);
            
            setIsLoading(false);
        };
        fetchData();
    }, []);

    const getStudentName = (studentId) => {
        const student = students.find(s => s.id === studentId);
        return student ? student.fullName : 'N/A';
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md">
                <h3 className="font-semibold text-xl p-6 border-b border-gray-200">All Income Transactions</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Date</th>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Student Name</th>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Type</th>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Description</th>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {isLoading ? (
                                <tr><td colSpan="5" className="p-4 text-center text-gray-500">Loading income transactions...</td></tr>
                            ) : incomeTransactions.length > 0 ? (
                                incomeTransactions.map(transaction => (
                                    <tr key={transaction.id} className="hover:bg-gray-50">
                                        <td className="p-4 text-gray-600">{formatDate(transaction.date)}</td>
                                        <td className="p-4 text-gray-800">{getStudentName(transaction.studentId)}</td>
                                        <td className="p-4 text-gray-800">{transaction.type === 'income-group' ? 'Group Payment' : 'Tutoring Payment'}</td>
                                        <td className="p-4 text-gray-800">{transaction.description}</td>
                                        <td className="p-4 text-gray-800 font-semibold text-right">₺{transaction.amount.toFixed(2)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="5" className="p-4 text-center text-gray-500">No income transactions found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StudentPaymentsView;