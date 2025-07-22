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

      const allStudents = studentsData.map(s => {
        let parsedStudent = { ...s };
        try { parsedStudent.installments = s.installments ? JSON.parse(s.installments) : []; } catch (e) { console.error("Error parsing student installments:", e); parsedStudent.installments = []; }
        try { parsedStudent.feeDetails = s.fee_details ? JSON.parse(s.fee_details) : {}; } catch (e) { console.error("Error parsing student fee_details:", e); parsedStudent.feeDetails = {}; }
        try { parsedStudent.tutoringDetails = s.tutoring_details ? JSON.parse(s.tutoring_details) : {}; } catch (e) { console.error("Error parsing student tutoring_details:", e); parsedStudent.tutoringDetails = {}; }
        try { parsedStudent.documents = s.documents ? JSON.parse(s.documents) : {}; } catch (e) { console.error("Error parsing student documents:", e); parsedStudent.documents = {}; }
        try { parsedStudent.documentNames = s.document_names ? JSON.parse(s.document_names) : {}; } catch (e) { console.error("Error parsing student document_names:", e); parsedStudent.documentNames = {}; }
        parsedStudent.isArchived = !!s.isArchived;
        return parsedStudent;
      });
      setStudents(allStudents.filter(s => !s.isArchived));
      setArchivedStudents(allStudents.filter(s => s.isArchived));

      const allGroups = groupsData.map(g => {
        let parsedGroup = { ...g };
        try { parsedGroup.schedule = g.schedule ? JSON.parse(g.schedule) : {}; } catch (e) { console.error("Error parsing group schedule:", e); parsedGroup.schedule = {}; }
        parsedGroup.isArchived = !!g.isArchived; // Explicitly convert to boolean
        return parsedGroup;
      });
      setGroups(allGroups.filter(g => !g.isArchived));
      setArchivedGroups(allGroups.filter(g => g.isArchived));

      setLessons(lessonsData.map(l => {
        let parsedLesson = { ...l };
        try { parsedLesson.attendance = l.attendance ? JSON.parse(l.attendance) : {}; } catch (e) { console.error("Error parsing lesson attendance:", e); parsedLesson.attendance = {}; }
        return parsedLesson;
      }));
      setEvents(eventsData);
      setPayments(transactionsData.filter(t => t.type.startsWith('income')));
      setExpenses(transactionsData.filter(t => t.type.startsWith('expense')));
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

