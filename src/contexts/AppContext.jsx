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
        let parsedStudent = {
          ...s,
          fullName: s.full_name,
          enrollmentDate: s.enrollment_date,
          birthDate: s.birth_date,
          feeDetails: s.fee_details,
          tutoringDetails: s.tutoring_details,
          documentNames: s.document_names,
        };
        try { parsedStudent.installments = s.installments ? JSON.parse(s.installments) : []; } catch (e) { console.error("Error parsing student installments:", e); parsedStudent.installments = []; }
        try { parsedStudent.documents = s.documents ? JSON.parse(s.documents) : {}; } catch (e) { console.error("Error parsing student documents:", e); parsedStudent.documents = {}; }
        parsedStudent.isArchived = !!s.is_archived;
        return parsedStudent;
      });
      setStudents(allStudents.filter(s => !s.is_archived));
      setArchivedStudents(allStudents.filter(s => s.is_archived));

      const allGroups = groupsData.map(g => {
        let parsedGroup = {
          ...g,
          groupName: g.group_name,
          startDate: g.start_date,
          endDate: g.end_date,
          programLength: g.program_length,
          isArchived: g.is_archived,
        };
        try { parsedGroup.schedule = g.schedule ? JSON.parse(g.schedule) : {}; } catch (e) { console.error("Error parsing group schedule:", e); parsedGroup.schedule = {}; }
        return parsedGroup;
      });
      setGroups(allGroups.filter(g => !g.is_archived));
      setArchivedGroups(allGroups.filter(g => g.is_archived));

      setLessons(lessonsData.map(l => {
        let parsedLesson = {
          ...l,
          lessonDate: l.lesson_date,
          startTime: l.start_time,
          endTime: l.end_time,
          materialUrl: l.material_url,
          materialName: l.material_name,
          groupId: l.group_id,
          studentId: l.student_id,
        };
        try { parsedLesson.attendance = l.attendance ? JSON.parse(l.attendance) : {}; } catch (e) { console.error("Error parsing lesson attendance:", e); parsedLesson.attendance = {}; }
        return parsedLesson;
      }));
      setEvents(eventsData.map(e => ({
        ...e,
        eventName: e.event_name,
        startTime: e.start_time,
        endTime: e.end_time,
        isAllDay: e.is_all_day,
      })));
      setPayments(transactionsData.filter(t => t.type.startsWith('income')).map(t => ({
        ...t,
        transactionDate: t.transaction_date,
        invoiceUrl: t.invoice_url,
        invoiceName: t.invoice_name,
      })));
      setExpenses(transactionsData.filter(t => t.type.startsWith('expense')).map(t => ({
        ...t,
        transactionDate: t.transaction_date,
        invoiceUrl: t.invoice_url,
        invoiceName: t.invoice_name,
      })));
      setDocuments(documentsData.map(d => ({
        ...d,
        uploadDate: d.upload_date,
        storagePath: d.storage_path,
      })));
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

