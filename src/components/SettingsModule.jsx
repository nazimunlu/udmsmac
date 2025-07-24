import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Icon, ICONS } from './Icons';
import { useNotification } from '../contexts/NotificationContext';
import { useAppContext } from '../contexts/AppContext';
import Modal from './Modal';

const SettingsModule = () => {
    const { showNotification } = useNotification();
    const { settings, fetchData } = useAppContext();
    const [isExporting, setIsExporting] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        businessName: '',
        businessAddress: '',
        businessPhone: '',
        businessEmail: '',
        pricePerLesson: '',
        currency: '₺',
        timezone: 'Europe/Istanbul',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        language: 'en',
        notifications: {
            email: true,
            browser: true,
            paymentReminders: true,
            lessonReminders: true
        }
    });

    useEffect(() => {
        if (settings && Object.keys(settings).length > 0) {
            setFormData(prev => ({
                ...prev,
                ...settings,
                pricePerLesson: settings.pricePerLesson || '800',
                currency: settings.currency || '₺',
                timezone: settings.timezone || 'Europe/Istanbul',
                dateFormat: settings.dateFormat || 'DD/MM/YYYY',
                timeFormat: settings.timeFormat || '24h',
                language: settings.language || 'en',
                notifications: settings.notifications || {
                    email: true,
                    browser: true,
                    paymentReminders: true,
                    lessonReminders: true
                }
            }));
        }
    }, [settings]);

    const handleExportData = async () => {
        setIsExporting(true);
        try {
            const zip = new JSZip();
            const dataFolder = zip.folder('exported_data');

            const studentsData = await apiClient.getAll('students');
            dataFolder.file('students.json', JSON.stringify(studentsData.map(s => ({
                ...s,
                installments: s.installments ? JSON.parse(s.installments) : [],
                feeDetails: s.feeDetails ? JSON.parse(s.feeDetails) : {},
                tutoringDetails: s.tutoringDetails ? JSON.parse(s.tutoringDetails) : {},
                documents: s.documents ? JSON.parse(s.documents) : {},
                documentNames: s.documentNames ? JSON.parse(s.documentNames) : {},
            })), null, 2));

            const groupsData = await apiClient.getAll('groups');
            dataFolder.file('groups.json', JSON.stringify(groupsData.map(g => ({
                ...g,
                schedule: g.schedule ? JSON.parse(g.schedule) : {},
            })), null, 2));

            const transactionsData = await apiClient.getAll('transactions');
            dataFolder.file('transactions.json', JSON.stringify(transactionsData, null, 2));

            const documentsData = await apiClient.getAll('documents');
            dataFolder.file('documents.json', JSON.stringify(documentsData, null, 2));

            const lessonsData = await apiClient.getAll('lessons');
            dataFolder.file('lessons.json', JSON.stringify(lessonsData, null, 2));

            const eventsData = await apiClient.getAll('events');
            dataFolder.file('events.json', JSON.stringify(eventsData, null, 2));

            zip.generateAsync({ type: 'blob' }).then(function(content) {
                saveAs(content, `udms_data_export_${new Date().toISOString().split('T')[0]}.zip`);
            });

            showNotification('Data exported successfully!', 'success');
        } catch (error) {
            console.error('Error exporting data:', error);
            showNotification('Failed to export data. Check console for details.', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    const handleSaveSettings = async () => {
        try {
            // Update or create settings
            if (settings && settings.id) {
                await apiClient.update('settings', settings.id, formData);
            } else {
                await apiClient.create('settings', formData);
            }
            
            showNotification('Settings saved successfully!', 'success');
            fetchData();
            setIsSettingsModalOpen(false);
        } catch (error) {
            console.error('Error saving settings:', error);
            showNotification('Failed to save settings.', 'error');
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name.startsWith('notifications.')) {
            const notificationKey = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                notifications: {
                    ...prev.notifications,
                    [notificationKey]: checked
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        }
    };

    const getSystemInfo = () => {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            screenResolution: `${screen.width}x${screen.height}`,
            windowSize: `${window.innerWidth}x${window.innerHeight}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            currentTime: new Date().toISOString()
        };
    };

    const SettingsModal = ({ isOpen, onClose }) => (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="System Settings"
            size="lg"
            headerStyle={{ backgroundColor: '#6B7280' }}
        >
            <div className="space-y-6 max-h-96 overflow-y-auto">
                {/* Business Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <Icon path={ICONS.BUILDING} className="w-5 h-5 mr-2 text-gray-600" />
                        Business Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                            <input
                                type="text"
                                name="businessName"
                                value={formData.businessName}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Business Phone</label>
                            <input
                                type="tel"
                                name="businessPhone"
                                value={formData.businessPhone}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Business Email</label>
                            <input
                                type="email"
                                name="businessEmail"
                                value={formData.businessEmail}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Default Price per Lesson</label>
                            <input
                                type="number"
                                name="pricePerLesson"
                                value={formData.pricePerLesson}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Business Address</label>
                            <textarea
                                name="businessAddress"
                                value={formData.businessAddress}
                                onChange={handleChange}
                                rows="2"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Display Preferences */}
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <Icon path={ICONS.SETTINGS} className="w-5 h-5 mr-2 text-gray-600" />
                        Display Preferences
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                            <select
                                name="currency"
                                value={formData.currency}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                            >
                                <option value="₺">Turkish Lira (₺)</option>
                                <option value="$">US Dollar ($)</option>
                                <option value="€">Euro (€)</option>
                                <option value="£">British Pound (£)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
                            <select
                                name="dateFormat"
                                value={formData.dateFormat}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                            >
                                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Time Format</label>
                            <select
                                name="timeFormat"
                                value={formData.timeFormat}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                            >
                                <option value="24h">24-hour</option>
                                <option value="12h">12-hour</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Notifications */}
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <Icon path={ICONS.BELL} className="w-5 h-5 mr-2 text-gray-600" />
                        Notifications
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-800">Email Notifications</p>
                                <p className="text-sm text-gray-600">Receive notifications via email</p>
                            </div>
                            <input
                                type="checkbox"
                                name="notifications.email"
                                checked={formData.notifications.email}
                                onChange={handleChange}
                                className="w-4 h-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-800">Browser Notifications</p>
                                <p className="text-sm text-gray-600">Show browser notifications</p>
                            </div>
                            <input
                                type="checkbox"
                                name="notifications.browser"
                                checked={formData.notifications.browser}
                                onChange={handleChange}
                                className="w-4 h-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-800">Payment Reminders</p>
                                <p className="text-sm text-gray-600">Remind about due payments</p>
                            </div>
                            <input
                                type="checkbox"
                                name="notifications.paymentReminders"
                                checked={formData.notifications.paymentReminders}
                                onChange={handleChange}
                                className="w-4 h-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-800">Lesson Reminders</p>
                                <p className="text-sm text-gray-600">Remind about upcoming lessons</p>
                            </div>
                            <input
                                type="checkbox"
                                name="notifications.lessonReminders"
                                checked={formData.notifications.lessonReminders}
                                onChange={handleChange}
                                className="w-4 h-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSaveSettings}
                    className="px-4 py-2 text-white bg-gray-600 rounded-md hover:bg-gray-700 transition-colors"
                >
                    Save Settings
                </button>
            </div>
        </Modal>
    );

    const systemInfo = getSystemInfo();

    return (
        <div className="p-4 md:p-8 bg-gray-50 rounded-lg shadow-lg">
            <div className="flex justify-between items-center pb-4 mb-6 border-b border-gray-200">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 flex items-center">
                        <Icon path={ICONS.SETTINGS} className="w-8 h-8 mr-3"/>
                        Settings
                    </h2>
                    <p className="text-gray-600 mt-1">Manage your system preferences and data</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Business Settings */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                                <Icon path={ICONS.BUILDING} className="w-6 h-6 mr-2 text-blue-600" />
                                Business Settings
                            </h3>
                            <button
                                onClick={() => setIsSettingsModalOpen(true)}
                                className="px-3 py-1 text-sm text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                            >
                                Edit
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Business Name:</span>
                                <span className="font-medium">{formData.businessName || 'Not set'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Business Phone:</span>
                                <span className="font-medium">{formData.businessPhone || 'Not set'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Business Email:</span>
                                <span className="font-medium">{formData.businessEmail || 'Not set'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Price per Lesson:</span>
                                <span className="font-medium">{formData.pricePerLesson || '800'} {formData.currency}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                            <Icon path={ICONS.SETTINGS} className="w-6 h-6 mr-2 text-green-600" />
                            Display Preferences
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Currency:</span>
                                <span className="font-medium">{formData.currency}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Date Format:</span>
                                <span className="font-medium">{formData.dateFormat}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Time Format:</span>
                                <span className="font-medium">{formData.timeFormat}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Data Management */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                            <Icon path={ICONS.DOWNLOAD} className="w-6 h-6 mr-2 text-purple-600" />
                            Data Management
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-gray-600 mb-2">Export all your data including students, groups, finances, and documents.</p>
                                <button
                                    onClick={handleExportData}
                                    disabled={isExporting}
                                    className="w-full px-4 py-2 text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed rounded-md transition-colors"
                                >
                                    {isExporting ? (
                                        <span className="flex items-center justify-center">
                                            <Icon path={ICONS.LOADING} className="w-4 h-4 mr-2 animate-spin" />
                                            Exporting...
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center">
                                            <Icon path={ICONS.DOWNLOAD} className="w-4 h-4 mr-2" />
                                            Export All Data
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                            <Icon path={ICONS.INFO} className="w-6 h-6 mr-2 text-orange-600" />
                            System Information
                        </h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Platform:</span>
                                <span className="font-medium">{systemInfo.platform}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Browser:</span>
                                <span className="font-medium">{systemInfo.userAgent.split(' ').slice(-2).join(' ')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Screen Resolution:</span>
                                <span className="font-medium">{systemInfo.screenResolution}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Timezone:</span>
                                <span className="font-medium">{systemInfo.timezone}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Online Status:</span>
                                <span className={`font-medium ${systemInfo.onLine ? 'text-green-600' : 'text-red-600'}`}>
                                    {systemInfo.onLine ? 'Online' : 'Offline'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <SettingsModal 
                isOpen={isSettingsModalOpen} 
                onClose={() => setIsSettingsModalOpen(false)} 
            />
        </div>
    );
};

export default SettingsModule;
