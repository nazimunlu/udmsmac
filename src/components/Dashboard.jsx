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

const Sidebar = ({ activeModule, setActiveModule }) => {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: ICONS.DASHBOARD },
        { id: 'students', label: 'Students', icon: ICONS.STUDENTS },
        { id: 'groups', label: 'Groups', icon: ICONS.GROUPS },
        { id: 'finances', label: 'Finances', icon: ICONS.MONEY_BILL_WAVE },
        { id: 'documents', label: 'Documents', icon: ICONS.DOCUMENTS },
    ];

    const settingsItem = { id: 'settings', label: 'Settings', icon: ICONS.SETTINGS };

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('Error logging out:', error.message);
    };

    return (
        <aside className="w-48 bg-gray-800 text-white flex flex-col">
            <div className="h-16 flex flex-col items-center justify-center">
                <div className="text-xl font-bold">Ünlü Dil</div>
                <div className="text-xs">Kurs Yönetim Sistemi</div>
            </div>
            <nav className="flex-1 px-2 py-4 space-y-2">
                {navItems.map(item => (
                    <a
                        key={item.id}
                        href="#"
                        onClick={() => setActiveModule(item.id)}
                        className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                            activeModule === item.id
                                ? 'bg-gray-900 text-white'
                                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }`}>
                        <Icon path={item.icon} className="w-6 h-6 mr-3" />
                        {item.label}
                    </a>
                ))}
            </nav>
            <div className="px-2 py-4 mt-auto">
                <a
                    key={settingsItem.id}
                    href="#"
                    onClick={() => setActiveModule(settingsItem.id)}
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeModule === settingsItem.id
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}>
                    <Icon path={settingsItem.icon} className="w-6 h-6 mr-3" />
                    {settingsItem.label}
                </a>
                <button
                    onClick={handleLogout}
                    className="flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors w-full text-left mt-2 text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                    <Icon path={ICONS.LOGOUT} className="w-6 h-6 mr-3" />
                    Logout
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
        <main className="flex-1 p-4 bg-gray-100 overflow-y-auto">
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
        <div className="flex h-screen bg-gray-100">
            <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />
            <MainContent activeModule={activeModule} setActiveModule={setActiveModule} />
        </div>
    );
};

export default Dashboard;