
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

      setStudents(studentsData.map(s => ({
        ...s,
        installments: s.installments ? JSON.parse(s.installments) : [],
        feeDetails: s.feeDetails ? JSON.parse(s.feeDetails) : {},
        tutoringDetails: s.tutoringDetails ? JSON.parse(s.tutoringDetails) : {},
        documents: s.documents ? JSON.parse(s.documents) : {},
        documentNames: s.documentNames ? JSON.parse(s.documentNames) : {},
      })));
      setGroups(groupsData.map(g => ({
        ...g,
        schedule: g.schedule ? JSON.parse(g.schedule) : {},
      })));
      setLessons(lessonsData.map(l => ({
        ...l,
        attendance: l.attendance ? JSON.parse(l.attendance) : {},
      })));
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
