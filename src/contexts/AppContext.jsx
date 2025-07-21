import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { supabase } from '../supabaseClient';

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
        { data: studentsData, error: studentsError },
        { data: groupsData, error: groupsError },
        { data: lessonsData, error: lessonsError },
        { data: eventsData, error: eventsError },
        { data: transactionsData, error: transactionsError },
        { data: documentsData, error: documentsError },
        { data: settingsData, error: settingsError },
        { data: todosData, error: todosError },
      ] = await Promise.all([
        supabase.from('students').select('*'),
        supabase.from('groups').select('id, created_at, groupName, schedule, color, startDate, programLength, endDate, isArchived'),
        supabase.from('lessons').select('*'),
        supabase.from('events').select('*'),
        supabase.from('transactions').select('*'),
        supabase.from('documents').select('*'),
        supabase.from('settings').select('*'),
        supabase.from('todos').select('*').order('created_at', { ascending: false }),
      ]);

      if (studentsError) { console.error("Error fetching students:", studentsError); throw studentsError; }
      if (groupsError) { console.error("Error fetching groups:", groupsError); throw groupsError; }
      if (lessonsError) { console.error("Error fetching lessons:", lessonsError); throw lessonsError; }
      if (eventsError) { console.error("Error fetching events:", eventsError); throw eventsError; }
      if (transactionsError) { console.error("Error fetching transactions:", transactionsError); throw transactionsError; }
      if (documentsError) { console.error("Error fetching documents:", documentsError); throw documentsError; }
      if (settingsError) { console.error("Error fetching settings:", settingsError); throw settingsError; }
      if (todosError) { console.error("Error fetching todos:", todosError); throw todosError; }

      const allStudents = studentsData.map(s => {
        let parsedStudent = { ...s };
        try { parsedStudent.installments = s.installments ? JSON.parse(s.installments) : []; } catch (e) { console.error("Error parsing student installments:", e); parsedStudent.installments = []; }
        try { parsedStudent.feeDetails = s.feeDetails ? JSON.parse(s.feeDetails) : {}; } catch (e) { console.error("Error parsing student feeDetails:", e); parsedStudent.feeDetails = {}; }
        try { parsedStudent.tutoringDetails = s.tutoringDetails ? JSON.parse(s.tutoringDetails) : {}; } catch (e) { console.error("Error parsing student tutoringDetails:", e); parsedStudent.tutoringDetails = {}; }
        try { parsedStudent.documents = s.documents ? JSON.parse(s.documents) : {}; } catch (e) { console.error("Error parsing student documents:", e); parsedStudent.documents = {}; }
        try { parsedStudent.documentNames = s.documentNames ? JSON.parse(s.documentNames) : {}; } catch (e) { console.error("Error parsing student documentNames:", e); parsedStudent.documentNames = {}; }
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

