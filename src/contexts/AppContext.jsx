import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../apiClient';

const AppContext = createContext();

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};

export const AppProvider = ({ children }) => {
    const [students, setStudents] = useState([]);
    const [groups, setGroups] = useState([]);
    const [lessons, setLessons] = useState([]);
    const [events, setEvents] = useState([]);
    const [todos, setTodos] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [studentsData, groupsData, lessonsData, eventsData, todosData, documentsData, transactionsData] = await Promise.all([
                apiClient.getAll('students'),
                apiClient.getAll('groups'),
                apiClient.getAll('lessons'),
                apiClient.getAll('events'),
                apiClient.getAll('todos'),
                apiClient.getAll('documents'),
                apiClient.getAll('transactions')
            ]);

            setStudents(studentsData);
            setGroups(groupsData);
            setLessons(lessonsData);
            setEvents(eventsData);
            setTodos(todosData);
            setDocuments(documentsData);
            setTransactions(transactionsData);
        } catch (error) {
            console.error('Error fetching data:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const value = {
        students,
        groups,
        lessons,
        events,
        todos,
        documents,
        transactions,
        loading,
        error,
        fetchData
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

export { AppContext };

