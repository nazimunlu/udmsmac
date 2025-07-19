import React, { createContext, useState, useEffect, useContext } from 'react';
import { onSnapshot, collection, query, where } from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth, db, storage } from '../firebase';
import { useNotification } from './NotificationContext';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userId, setUserId] = useState(null);
    const [appId, setAppId] = useState(null);
    const [students, setStudents] = useState([]);
    const [groups, setGroups] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [notifiedOverduePayments, setNotifiedOverduePayments] = useState({});

    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUser(user);
                setUserId(user.uid);
                // You might need a way to set the appId, for now, I'll hardcode it
                // This should be replaced with a proper way to get the appId
                setAppId('v4'); 
            } else {
                signInAnonymously(auth).catch(error => console.error("Anonymous sign-in failed", error));
            }
        });
        return () => unsubAuth();
    }, []);

    useEffect(() => {
        if (!userId || !appId) return;

        const studentsQuery = collection(db, 'artifacts', appId, 'users', userId, 'students');
        const unsubStudents = onSnapshot(studentsQuery, (snapshot) => {
            const studentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStudents(studentsData);
            setIsLoading(false);
        });

        const groupsQuery = collection(db, 'artifacts', appId, 'users', userId, 'groups');
        const unsubGroups = onSnapshot(groupsQuery, (snapshot) => {
            const groupsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setGroups(groupsData);
        });

        const transactionsQuery = collection(db, 'artifacts', appId, 'users', userId, 'transactions');
        const unsubTransactions = onSnapshot(transactionsQuery, (snapshot) => {
            const transactionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTransactions(transactionsData);
        });

        return () => {
            unsubStudents();
            unsubGroups();
            unsubTransactions();
        };
    }, [userId, appId]);

    const { showNotification } = useNotification();

    useEffect(() => {
        if (!students.length) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        students.forEach(student => {
            if (student.installments && student.installments.length > 0) {
                student.installments.forEach(installment => {
                    const installmentId = `${student.id}-${installment.number}`;
                    if (installment.status !== 'Paid' && installment.dueDate && installment.dueDate.toDate() < today && !notifiedOverduePayments[installmentId]) {
                        showNotification(`Overdue payment for ${student.fullName}: Installment #${installment.number} (₺${installment.amount.toFixed(2)}) was due on ${installment.dueDate.toDate().toLocaleDateString()}.`, 'warning', 10000);
                        setNotifiedOverduePayments(prev => ({ ...prev, [installmentId]: true }));
                    }
                });
            }
        });
    }, [students, showNotification, notifiedOverduePayments]);

    const value = {
        user,
        userId,
        appId,
        students,
        groups,
        transactions,
        isLoading,
        db,
        storage, // You need to import and provide storage from firebase.js if you use it
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);