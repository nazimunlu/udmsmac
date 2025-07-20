
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const AppContext = createContext();

const AppProvider = ({ children }) => {
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: studentsData, error: studentsError },
        { data: groupsData, error: groupsError },
        { data: lessonsData, error: lessonsError },
        { data: transactionsData, error: transactionsError },
        { data: documentsData, error: documentsError },
        { data: settingsData, error: settingsError },
      ] = await Promise.all([
        supabase.from('students').select('*'),
        supabase.from('groups').select('*'),
        supabase.from('lessons').select('*'),
        supabase.from('transactions').select('*'),
        supabase.from('documents').select('*'),
        supabase.from('settings').select('*'),
      ]);

      if (studentsError) throw studentsError;
      if (groupsError) throw groupsError;
      if (lessonsError) throw lessonsError;
      if (transactionsError) throw transactionsError;
      if (documentsError) throw documentsError;
      if (settingsError) throw settingsError;

      setStudents(studentsData.map(s => {
        let parsedStudent = { ...s };
        try { parsedStudent.installments = s.installments ? JSON.parse(s.installments) : []; } catch (e) { console.error("Error parsing student installments:", e); parsedStudent.installments = []; }
        try { parsedStudent.feeDetails = s.feeDetails ? JSON.parse(s.feeDetails) : {}; } catch (e) { console.error("Error parsing student feeDetails:", e); parsedStudent.feeDetails = {}; }
        try { parsedStudent.tutoringDetails = s.tutoringDetails ? JSON.parse(s.tutoringDetails) : {}; } catch (e) { console.error("Error parsing student tutoringDetails:", e); parsedStudent.tutoringDetails = {}; }
        try { parsedStudent.documents = s.documents ? JSON.parse(s.documents) : {}; } catch (e) { console.error("Error parsing student documents:", e); parsedStudent.documents = {}; }
        try { parsedStudent.documentNames = s.documentNames ? JSON.parse(s.documentNames) : {}; } catch (e) { console.error("Error parsing student documentNames:", e); parsedStudent.documentNames = {}; }
        return parsedStudent;
      }));
      setGroups(groupsData.map(g => {
        let parsedGroup = { ...g };
        try { parsedGroup.schedule = g.schedule ? JSON.parse(g.schedule) : {}; } catch (e) { console.error("Error parsing group schedule:", e); parsedGroup.schedule = {}; }
        return parsedGroup;
      }));
      setLessons(lessonsData.map(l => {
        let parsedLesson = { ...l };
        try { parsedLesson.attendance = l.attendance ? JSON.parse(l.attendance) : {}; } catch (e) { console.error("Error parsing lesson attendance:", e); parsedLesson.attendance = {}; }
        return parsedLesson;
      }));
      setPayments(transactionsData.filter(t => t.type.startsWith('income')));
      setExpenses(transactionsData.filter(t => t.type.startsWith('expense')));
      setDocuments(documentsData);
      setSettings(settingsData.length > 0 ? settingsData[0] : {});
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
    groups,
    lessons,
    payments,
    expenses,
    documents,
    teachers,
    settings,
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

import { useContext } from 'react';

export const useAppContext = () => useContext(AppContext);

export { AppContext, AppProvider };
