import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import apiClient from '../apiClient';

const AppContext = createContext();

const AppProvider = ({ children }) => {
  const [students, setStudents] = useState([]);
  const [archivedStudents, setArchivedStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [archivedGroups, setArchivedGroups] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [events, setEvents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [todos, setTodos] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        studentsData,
        groupsData,
        lessonsData,
        eventsData,
        transactionsData,
        documentsData,
        settingsData,
        todosData,
      ] = await Promise.all([
        apiClient.getAll('students'),
        apiClient.getAll('groups'),
        apiClient.getAll('lessons'),
        apiClient.getAll('events'),
        apiClient.getAll('transactions'),
        apiClient.getAll('documents'),
        apiClient.getAll('settings'),
        apiClient.getAll('todos'),
      ]);

      // Parse JSON fields for students
      const allStudents = studentsData.map(s => {
        let parsedStudent = { ...s };
        try { 
          parsedStudent.installments = s.installments ? 
            (typeof s.installments === 'string' ? JSON.parse(s.installments) : s.installments) : 
            []; 
        } catch (e) { 
          console.error("Error parsing student installments:", e); 
          parsedStudent.installments = []; 
        }
        try { 
          parsedStudent.documents = s.documents ? 
            (typeof s.documents === 'string' ? JSON.parse(s.documents) : s.documents) : 
            {}; 
        } catch (e) { 
          console.error("Error parsing student documents:", e); 
          parsedStudent.documents = {}; 
        }
        try { 
          parsedStudent.tutoringDetails = s.tutoringDetails ? 
            (typeof s.tutoringDetails === 'string' ? JSON.parse(s.tutoringDetails) : s.tutoringDetails) : 
            {}; 
        } catch (e) { 
          console.error("Error parsing student tutoringDetails:", e); 
          parsedStudent.tutoringDetails = {}; 
        }
        try { 
          parsedStudent.feeDetails = s.feeDetails ? 
            (typeof s.feeDetails === 'string' ? JSON.parse(s.feeDetails) : s.feeDetails) : 
            {}; 
        } catch (e) { 
          console.error("Error parsing student feeDetails:", e); 
          parsedStudent.feeDetails = {}; 
        }
        return parsedStudent;
      });
      setStudents(allStudents.filter(s => !s.isArchived));
      setArchivedStudents(allStudents.filter(s => s.isArchived));

      // Parse JSON fields for groups
      const allGroups = groupsData.map(g => {
        let parsedGroup = { ...g };
        try { 
          parsedGroup.schedule = g.schedule ? 
            (typeof g.schedule === 'string' ? JSON.parse(g.schedule) : g.schedule) : 
            {}; 
        } catch (e) { 
          console.error("Error parsing group schedule:", e); 
          parsedGroup.schedule = {}; 
        }
        return parsedGroup;
      });
      setGroups(allGroups.filter(g => !g.isArchived));
      setArchivedGroups(allGroups.filter(g => g.isArchived));

      // Parse JSON fields for lessons
      setLessons(lessonsData.map(l => {
        let parsedLesson = { ...l };
        try { 
          parsedLesson.attendance = l.attendance ? 
            (typeof l.attendance === 'string' ? JSON.parse(l.attendance) : l.attendance) : 
            {}; 
        } catch (e) { 
          console.error("Error parsing lesson attendance:", e); 
          parsedLesson.attendance = {}; 
        }
        return parsedLesson;
      }));

      setEvents(eventsData);
      setTransactions(transactionsData);
      setPayments(transactionsData.filter(t => t.type?.startsWith('income') || t.expenseType?.startsWith('income')));
      setExpenses(transactionsData.filter(t => t.type?.startsWith('expense') || t.expenseType?.startsWith('expense')));
      setDocuments(documentsData);
      setSettings(settingsData.length > 0 ? settingsData[0] : {});
      setTodos(todosData);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const contextValue = {
    students,
    archivedStudents,
    groups,
    archivedGroups,
    lessons,
    events,
    payments,
    expenses,
    transactions,
    documents,
    teachers,
    settings,
    todos,
    loading,
    error,
    fetchData,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);

export { AppProvider, AppContext };

