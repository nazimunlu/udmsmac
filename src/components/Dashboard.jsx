import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Icon, ICONS } from './Icons';
import StudentsModule from './StudentsModule';
import GroupsModule from './GroupsModule';
import FinancesModule from './FinancesModule';
import DashboardModule from './DashboardModule';
import DocumentsModule from './DocumentsModule';
import SettingsModule from './SettingsModule';
import LoadingSpinner from './LoadingSpinner';
import { supabase } from '../supabaseClient';
import ErrorBoundary from './ErrorBoundary';

const Sidebar = ({ activeModule, setActiveModule }) => {
    const { lessons } = useAppContext();
    
    // Calculate lesson warnings
    const getOverdueLessons = () => {
        const now = new Date();
        return lessons?.filter(lesson => {
            const lessonDateTime = new Date(`${lesson.lessonDate}T${lesson.startTime || '09:00'}`);
            const lessonEndDateTime = new Date(`${lesson.lessonDate}T${lesson.endTime || '10:00'}`);
            return lessonEndDateTime < now && lesson.status === 'Complete' && (!lesson.attendance || Object.keys(lesson.attendance).length === 0);
        }) || [];
    };

    const getTodayLessons = () => {
        const now = new Date();
        const today = new Date().toISOString().split('T')[0];
        return lessons?.filter(lesson => {
            const lessonDate = new Date(lesson.lessonDate).toISOString().split('T')[0];
            const lessonEndDateTime = new Date(`${lesson.lessonDate}T${lesson.endTime || '10:00'}`);
            return lessonDate === today && lessonEndDateTime < now && lesson.status === 'Complete' && (!lesson.attendance || Object.keys(lesson.attendance).length === 0);
        }) || [];
    };

    const hasLessonWarnings = getOverdueLessons().length > 0 || getTodayLessons().length > 0;

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: ICONS.DASHBOARD, color: 'bg-blue-600' },
        { id: 'students', label: 'Students', icon: ICONS.STUDENTS, color: 'bg-blue-600' },
        { id: 'groups', label: 'Groups', icon: ICONS.GROUPS, color: 'bg-purple-600', hasWarning: hasLessonWarnings },
        { id: 'finances', label: 'Finances', icon: ICONS.MONEY_BILL_WAVE, color: 'bg-green-600' },
        { id: 'documents', label: 'Documents', icon: ICONS.DOCUMENTS, color: 'bg-amber-600' },
    ];

    const settingsItem = { id: 'settings', label: 'Settings', icon: ICONS.SETTINGS, color: 'bg-gray-600' };

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('Error logging out:', error.message);
    };

    return (
        <aside className="w-48 lg:w-56 xl:w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white flex flex-col shadow-2xl border-r border-gray-700">
            <div className="h-16 md:h-20 flex flex-col items-center justify-center border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900">
                <div className="text-lg md:text-xl font-bold text-white mb-1">Ünlü Dil</div>
                <div className="text-xs text-gray-300 font-medium">Kurs Yönetim Sistemi</div>
            </div>
            <nav className="flex-1 px-2 md:px-3 py-4 md:py-6 space-y-1 md:space-y-2">
                {navItems.map(item => (
                    <a
                        key={item.id}
                        href="#"
                        onClick={() => setActiveModule(item.id)}
                        className={`flex items-center px-3 md:px-4 py-2 md:py-3 text-sm font-medium rounded-xl transition-all duration-300 group relative ${
                            activeModule === item.id
                                ? 'bg-white text-gray-900 shadow-lg transform scale-105'
                                : 'text-gray-300 hover:bg-gray-700 hover:text-white hover:shadow-md'
                        }`}>
                        <div className={`w-7 h-7 md:w-8 md:h-8 ${item.color} rounded-lg flex items-center justify-center mr-2 md:mr-3 shadow-sm group-hover:scale-110 transition-transform duration-300 ${
                            activeModule === item.id ? 'shadow-md' : ''
                        }`}>
                            <Icon path={item.icon} className="w-3 h-3 md:w-4 md:h-4 text-white" />
                        </div>
                        <span className="font-semibold text-sm md:text-base">{item.label}</span>
                        {item.hasWarning && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center shadow-sm">
                                <Icon path={ICONS.WARNING} className="w-2 h-2 text-white" />
                            </div>
                        )}
                    </a>
                ))}
            </nav>
            <div className="px-2 md:px-3 py-3 md:py-4 mt-auto border-t border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900">
                <a
                    key={settingsItem.id}
                    href="#"
                    onClick={() => setActiveModule(settingsItem.id)}
                    className={`flex items-center px-3 md:px-4 py-2 md:py-3 text-sm font-medium rounded-xl transition-all duration-300 group mb-2 md:mb-3 ${
                        activeModule === settingsItem.id
                            ? 'bg-white text-gray-900 shadow-lg transform scale-105'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white hover:shadow-md'
                    }`}>
                    <div className={`w-7 h-7 md:w-8 md:h-8 ${settingsItem.color} rounded-lg flex items-center justify-center mr-2 md:mr-3 shadow-sm group-hover:scale-110 transition-transform duration-300 ${
                        activeModule === settingsItem.id ? 'shadow-md' : ''
                    }`}>
                        <Icon path={settingsItem.icon} className="w-3 h-3 md:w-4 md:h-4 text-white" />
                    </div>
                    <span className="font-semibold text-sm md:text-base">{settingsItem.label}</span>
                </a>
                <button
                    onClick={handleLogout}
                    className="flex items-center px-3 md:px-4 py-2 md:py-3 text-sm font-medium rounded-xl transition-all duration-300 w-full text-left text-gray-300 hover:bg-red-600 hover:text-white hover:shadow-md group"
                >
                    <div className="w-7 h-7 md:w-8 md:h-8 bg-red-600 rounded-lg flex items-center justify-center mr-2 md:mr-3 shadow-sm group-hover:scale-110 transition-transform duration-300">
                        <Icon path={ICONS.LOGOUT} className="w-3 h-3 md:w-4 md:h-4 text-white" />
                    </div>
                    <span className="font-semibold text-sm md:text-base">Logout</span>
                </button>
            </div>
        </aside>
    );
};

const MainContent = ({ activeModule, setActiveModule }) => {
    const renderModule = () => {
        switch (activeModule) {
            case 'dashboard':
                return <DashboardModule setActiveModule={setActiveModule} />;
            case 'students':
                return <StudentsModule />;
            case 'groups':
                return <GroupsModule />;
            case 'finances':
                return <FinancesModule />;
            case 'documents':
                return <DocumentsModule />;
            case 'settings':
                return <SettingsModule />;
            default:
                return <div>Select a module</div>;
        }
    };

    return (
        <main className="flex-1 p-2 sm:p-4 bg-gray-100 overflow-y-auto">
            {renderModule()}
        </main>
    );
};

const Dashboard = () => {
    const { isLoading } = useAppContext();
    const [activeModule, setActiveModule] = useState('dashboard');

    if (isLoading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />
            <main className="flex-1 overflow-y-auto">
                <ErrorBoundary>
            <MainContent activeModule={activeModule} setActiveModule={setActiveModule} />
                </ErrorBoundary>
            </main>
        </div>
    );
};

export default Dashboard;