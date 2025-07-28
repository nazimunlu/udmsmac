import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useNotification } from '../contexts/NotificationContext';
import { Icon } from './Icons';
import { ICONS } from './Icons';
import Modal from './Modal';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { getMessageTemplates, saveMessageTemplates } from '../utils/messageTemplates';
import { supabase } from '../supabaseClient';

// Message Template Modal Component
const MessageTemplateModal = ({ isOpen, onClose, template, onSave }) => {
    const [editedTemplate, setEditedTemplate] = useState('');
    const [templateName, setTemplateName] = useState('');

    useEffect(() => {
        if (template) {
            setEditedTemplate(template.content);
            setTemplateName(template.name);
        }
    }, [template]);

    const handleSave = () => {
        onSave({
            name: templateName,
            content: editedTemplate,
            type: template.type
        });
        onClose();
    };

    const getTemplateDescription = () => {
        switch (template?.type) {
            case 'late_payment':
                return 'This message is sent to parents when their child has overdue payments. Use {studentName}, {dueDate}, {amount}, {installmentCount} as placeholders.';
            case 'absence':
                return 'This message is sent to parents when their child is absent from a lesson. Use {studentName}, {lessonDate}, {lessonTime} as placeholders.';
            default:
                return 'Edit the message template below.';
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Message Template">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Template Name
                    </label>
                    <input
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Template name"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                    </label>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                        {getTemplateDescription()}
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Message Template
                    </label>
                    <textarea
                        value={editedTemplate}
                        onChange={(e) => setEditedTemplate(e.target.value)}
                        rows={8}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="Enter your message template..."
                    />
                </div>

                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Save Template
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// Export Progress Modal Component
const ExportProgressModal = ({ isOpen, onClose, progress, status }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Exporting Data">
            <div className="space-y-4">
                <div className="text-center">
                    <Icon path={ICONS.LOADING} className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{status}</h3>
                    <p className="text-sm text-gray-600">Please wait while we prepare your export...</p>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>

                <div className="text-center text-sm text-gray-600">
                    {progress}% Complete
                </div>
            </div>
        </Modal>
    );
};

// Main Settings Module Component
const SettingsModule = () => {
    const { students, groups, lessons, events, todos, documents, transactions, fetchData } = useAppContext();
    const { showNotification } = useNotification();
    const [activeTab, setActiveTab] = useState('system');
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [exportStatus, setExportStatus] = useState('');
    const [lastExportDate, setLastExportDate] = useState(localStorage.getItem('lastExportDate') || 'Never');
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [messageTemplates, setMessageTemplates] = useState(getMessageTemplates());
    const [storageInfo, setStorageInfo] = useState({
        totalSize: 0,
        usedSize: 0,
        fileCount: 0,
        loading: false,
        lastUpdated: new Date()
    });
    const [isResettingData, setIsResettingData] = useState(false);
    const [resetProgress, setResetProgress] = useState(0);
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

    // Load templates from localStorage on component mount
    useEffect(() => {
        setMessageTemplates(getMessageTemplates());
    }, []);

    // Save templates to localStorage whenever they change
    useEffect(() => {
        saveMessageTemplates(messageTemplates);
    }, [messageTemplates]);

    // Fetch storage information
    const fetchStorageInfo = async () => {
        try {
            setStorageInfo(prev => ({ ...prev, loading: true }));
            
            // Calculate total size and file count
            let totalSize = 0;
            let fileCount = 0;

            // Get all files from different folders
            const folders = ['documents', 'business_expenses', 'lesson_materials', 'student_documents', 'students', 'transactions'];
            
            for (const folder of folders) {
                try {
                    const { data: items, error } = await supabase.storage
                        .from('udms')
                        .list(folder, { limit: 1000, offset: 0 });

                    if (error) {
                        console.error(`Error fetching ${folder}:`, error);
                        continue;
                    }

                    if (items && items.length > 0) {
                        for (const item of items) {
                            // Check if it's a file (has metadata) or folder
                            if (item.metadata && item.metadata.size) {
                                totalSize += item.metadata.size;
                                fileCount++;
                            } else if (!item.metadata) {
                                // This might be a folder, try to get its contents
                                try {
                                    const { data: subItems, error: subError } = await supabase.storage
                                        .from('udms')
                                        .list(`${folder}/${item.name}`, { limit: 1000, offset: 0 });
                                    
                                    if (!subError && subItems) {
                                        for (const subItem of subItems) {
                                            if (subItem.metadata && subItem.metadata.size) {
                                                totalSize += subItem.metadata.size;
                                                fileCount++;
                                            }
                                        }
                                    }
                                } catch (subError) {
                                    console.error(`Error fetching subfolder ${folder}/${item.name}:`, subError);
                                }
                            }
                        }
                    }
                } catch (folderError) {
                    console.error(`Error processing folder ${folder}:`, folderError);
                }
            }

            // Set storage info (assuming 1GB total storage for now)
            const totalStorage = 1024 * 1024 * 1024; // 1GB in bytes
            const usedStorage = totalSize;

            setStorageInfo({
                totalSize: totalStorage,
                usedSize: usedStorage,
                fileCount,
                loading: false,
                lastUpdated: new Date()
            });

        } catch (error) {
            console.error('Error fetching storage info:', error);
            setStorageInfo(prev => ({ ...prev, loading: false }));
        }
    };

    // Fetch storage info when component mounts
    useEffect(() => {
        fetchStorageInfo();
    }, []);

    // Utility function to format file sizes
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Calculate storage percentage
    const getStoragePercentage = () => {
        if (storageInfo.totalSize === 0) return 0;
        return Math.round((storageInfo.usedSize / storageInfo.totalSize) * 100);
    };

    const handleExportData = async () => {
        setIsExportModalOpen(true);
        setExportProgress(0);
        setExportStatus('Preparing export...');

        try {
            const zip = new JSZip();
            
            // Create folders for different data types
            const studentsFolder = zip.folder('students');
            const groupsFolder = zip.folder('groups');
            const documentsFolder = zip.folder('documents');
            const transactionsFolder = zip.folder('transactions');
            const lessonsFolder = zip.folder('lessons');
            const settingsFolder = zip.folder('settings');
            const filesFolder = zip.folder('files');

            setExportProgress(5);
            setExportStatus('Exporting students data...');

            // Export students data
            const studentsData = students.map(student => ({
                id: student.id,
                fullName: student.fullName,
                email: student.email,
                phone: student.phone,
                birthDate: student.birthDate,
                address: student.address,
                emergencyContact: student.emergencyContact,
                enrollmentDate: student.enrollmentDate,
                totalFee: student.totalFee,
                installments: student.installments,
                groupId: student.groupId,
                status: student.status,
                notes: student.notes
            }));
            studentsFolder.file('students.json', JSON.stringify(studentsData, null, 2));

            setExportProgress(15);
            setExportStatus('Exporting groups data...');

            // Export groups data
            const groupsData = groups.map(group => ({
                id: group.id,
                name: group.name,
                schedule: group.schedule,
                startDate: group.startDate,
                endDate: group.endDate,
                maxStudents: group.maxStudents,
                currentStudents: group.currentStudents,
                status: group.status,
                notes: group.notes
            }));
            groupsFolder.file('groups.json', JSON.stringify(groupsData, null, 2));

            setExportProgress(25);
            setExportStatus('Exporting documents data...');

            // Export documents data
            const documentsData = documents.map(doc => ({
                id: doc.id,
                name: doc.name,
                type: doc.type,
                category: doc.category,
                description: doc.description,
                uploadDate: doc.uploadDate,
                url: doc.url
            }));
            documentsFolder.file('documents.json', JSON.stringify(documentsData, null, 2));

            setExportProgress(35);
            setExportStatus('Exporting transactions data...');

            // Export transactions data
            const transactionsData = transactions.map(transaction => ({
                id: transaction.id,
                type: transaction.type,
                amount: transaction.amount,
                description: transaction.description,
                date: transaction.date,
                category: transaction.category,
                studentId: transaction.studentId
            }));
            transactionsFolder.file('transactions.json', JSON.stringify(transactionsData, null, 2));

            setExportProgress(45);
            setExportStatus('Exporting lessons data...');

            // Export lessons data
            const lessonsData = lessons.map(lesson => ({
                id: lesson.id,
                groupId: lesson.groupId,
                lessonDate: lesson.lessonDate,
                startTime: lesson.startTime,
                endTime: lesson.endTime,
                topic: lesson.topic,
                materials: lesson.materials,
                attendance: lesson.attendance,
                notes: lesson.notes
            }));
            lessonsFolder.file('lessons.json', JSON.stringify(lessonsData, null, 2));

            setExportProgress(55);
            setExportStatus('Exporting settings and templates...');

            // Export settings and templates
            const settingsData = {
                messageTemplates,
                exportDate: new Date().toISOString(),
                systemInfo: {
                    totalStudents: students.length,
                    totalGroups: groups.length,
                    totalDocuments: documents.length,
                    totalTransactions: transactions.length,
                    totalLessons: lessons.length
                }
            };
            settingsFolder.file('settings.json', JSON.stringify(settingsData, null, 2));

            setExportProgress(65);
            setExportStatus('Downloading files from storage...');

            // Download and include all files from storage
            const allFiles = [];

            // Collect all file URLs from different sources
            const fileUrls = new Set();

            // From documents table - categorize exactly as in the system
            documents.forEach(doc => {
                if (doc.url && doc.url.trim() !== '') {
                    // Use the exact category from the system
                    let category = doc.category;
                    if (!category) {
                        // Fallback categorization based on type
                        if (doc.type === 'payment_plan') {
                            category = 'student';
                        } else if (doc.type === 'invoice') {
                            category = 'finance';
                        } else {
                            category = 'other';
                        }
                    }
                    
                    // Extract storage path for student documents
                    let storagePath = null;
                    let studentName = null;
                    
                    if (category === 'student' && doc.storagePath) {
                        storagePath = doc.storagePath;
                        // Extract student name from storage path
                        const pathParts = doc.storagePath.split('/');
                        const studentIdIndex = pathParts.indexOf('student') + 1;
                        const studentId = pathParts[studentIdIndex];
                        
                        if (studentId) {
                            const student = students.find(s => s.id === studentId);
                            if (student) {
                                studentName = student.fullName;
                            }
                        }
                    }
                    
                    fileUrls.add({ 
                        url: doc.url, 
                        name: doc.name, 
                        category: category,
                        type: doc.type,
                        storagePath: storagePath,
                        studentName: studentName
                    });
                }
            });

            // From students (National ID, Agreement, etc.) - these are student documents
            students.forEach(student => {
                try {
                    const studentDocuments = typeof student.documents === 'string' ? JSON.parse(student.documents) : (student.documents || {});
                    const studentDocumentNames = typeof student.documentNames === 'string' ? JSON.parse(student.documentNames) : (student.documentNames || {});

                    if (studentDocuments.nationalIdUrl && studentDocuments.nationalIdUrl.trim() !== '') {
                        fileUrls.add({ 
                            url: studentDocuments.nationalIdUrl, 
                            name: studentDocumentNames.nationalId || `${student.fullName}_NationalID.pdf`,
                            category: 'student',
                            studentName: student.fullName
                        });
                    }
                    if (studentDocuments.agreementUrl && studentDocuments.agreementUrl.trim() !== '') {
                        fileUrls.add({ 
                            url: studentDocuments.agreementUrl, 
                            name: studentDocumentNames.agreement || `${student.fullName}_Agreement.pdf`,
                            category: 'student',
                            studentName: student.fullName
                        });
                    }
                } catch (error) {
                    console.error('Error processing student documents:', error);
                }
            });

            // From transactions (business expense invoices) - these are finance documents
            transactions.forEach(transaction => {
                if (transaction.invoiceUrl && transaction.invoiceUrl.trim() !== '') {
                    fileUrls.add({ 
                        url: transaction.invoiceUrl, 
                        name: transaction.invoiceName || `Transaction_${transaction.description || transaction.id}_Invoice.pdf`,
                        category: 'finance',
                        transactionType: transaction.type
                    });
                }
            });

            // From lessons (lesson materials) - these are student documents
            lessons.forEach(lesson => {
                if (lesson.materialsUrl && lesson.materialsUrl.trim() !== '') {
                    // Try to find the student name from the lesson
                    let studentName = 'Unknown Student';
                    if (lesson.studentId) {
                        const student = students.find(s => s.id === lesson.studentId);
                        if (student) {
                            studentName = student.fullName;
                        }
                    }
                    
                    fileUrls.add({ 
                        url: lesson.materialsUrl, 
                        name: lesson.materialsName || `Lesson_${lesson.topic || lesson.id}_Materials.pdf`,
                        category: 'student',
                        studentName: studentName
                    });
                }
            });

            // Download all files
            const fileArray = Array.from(fileUrls);
            let downloadedCount = 0;

            for (const fileInfo of fileArray) {
                try {
                    setExportStatus(`Downloading file: ${fileInfo.name}...`);
                    
                    // Extract storage path from URL - handle different URL formats
                    let storagePath;
                    if (fileInfo.url.includes('/storage/v1/object/public/')) {
                        // Standard Supabase storage URL format
                        const urlParts = fileInfo.url.split('/');
                        const publicIndex = urlParts.indexOf('public');
                        if (publicIndex === -1) {
                            console.error(`Invalid URL format for file ${fileInfo.name}:`, fileInfo.url);
                            continue;
                        }
                        // Extract everything after 'public/' and remove the bucket name
                        const pathAfterPublic = urlParts.slice(publicIndex + 1);
                        // Remove the bucket name (first element) and join the rest
                        storagePath = pathAfterPublic.slice(1).join('/');
                    } else {
                        // Direct path format
                        storagePath = fileInfo.url;
                    }
                    
                    // Validate storage path
                    if (!storagePath || storagePath.trim() === '') {
                        console.error(`Invalid storage path for file ${fileInfo.name}:`, storagePath);
                        continue;
                    }

                    // Download file from Supabase storage
                    console.log(`Attempting to download: ${fileInfo.name}`);
                    console.log(`Original URL: ${fileInfo.url}`);
                    console.log(`Extracted storage path: ${storagePath}`);
                    
                    const { data, error } = await supabase.storage
                        .from('udms')
                        .download(storagePath);

                    if (error) {
                        console.error(`Error downloading file ${fileInfo.name}:`, error);
                        console.error(`Storage path used: ${storagePath}`);
                        continue;
                    }

                    if (data) {
                        // Create folder structure in ZIP
                        const categoryFolder = filesFolder.folder(fileInfo.category);
                        
                        // For student documents, create individual student folders
                        if (fileInfo.category === 'student') {
                            // Try to find the student name from the document name or storage path
                            let studentName = 'Unknown Student';
                            
                            // Check if this is a student document with a specific student
                            if (fileInfo.studentName) {
                                studentName = fileInfo.studentName;
                            } else if (fileInfo.storagePath) {
                                // Extract student name from storage path: documents/student/{studentId}/...
                                const pathParts = fileInfo.storagePath.split('/');
                                const studentIdIndex = pathParts.indexOf('student') + 1;
                                const studentId = pathParts[studentIdIndex];
                                
                                if (studentId) {
                                    const student = students.find(s => s.id === studentId);
                                    if (student) {
                                        studentName = student.fullName;
                                    }
                                }
                            }
                            
                            // Create student folder and add file
                            const studentFolder = categoryFolder.folder(studentName);
                            studentFolder.file(fileInfo.name, data);
                        } else if (fileInfo.category === 'meb') {
                            // For MEB documents, create subfolders based on type (received/sent)
                            let subfolder = 'other';
                            if (fileInfo.type === 'received') {
                                subfolder = 'received';
                            } else if (fileInfo.type === 'sent') {
                                subfolder = 'sent';
                            }
                            const subfolderFolder = categoryFolder.folder(subfolder);
                            subfolderFolder.file(fileInfo.name, data);
                        } else if (fileInfo.category === 'finance') {
                            // For finance documents, create subfolders based on transaction type
                            let subfolder = 'other';
                            if (fileInfo.transactionType === 'income') {
                                subfolder = 'income';
                            } else if (fileInfo.transactionType === 'expense' || fileInfo.transactionType === 'expense-business') {
                                subfolder = 'expenses';
                            }
                            const subfolderFolder = categoryFolder.folder(subfolder);
                            subfolderFolder.file(fileInfo.name, data);
                        } else {
                            // For other documents, add directly to category folder
                            categoryFolder.file(fileInfo.name, data);
                        }
                        
                        downloadedCount++;
                    }

                    // Update progress
                    const progress = 65 + (downloadedCount / fileArray.length) * 25;
                    setExportProgress(Math.min(progress, 90));
                    
                } catch (error) {
                    console.error(`Error processing file ${fileInfo.name}:`, error);
                }
            }

            setExportProgress(95);
            setExportStatus('Generating ZIP file...');

            // Generate and download the ZIP file
            const content = await zip.generateAsync({ type: 'blob' });
            const fileName = `udms_export_${new Date().toISOString().split('T')[0]}.zip`;
            saveAs(content, fileName);

            setExportProgress(100);
            setExportStatus('Export completed successfully!');

            // Save export date
            localStorage.setItem('lastExportDate', new Date().toISOString());

            setTimeout(() => {
                setIsExportModalOpen(false);
                showNotification(`Data exported successfully! ${downloadedCount} files included.`, 'success');
            }, 1000);

        } catch (error) {
            console.error('Export error:', error);
            showNotification('Failed to export data. Please try again.', 'error');
            setIsExportModalOpen(false);
        }
    };

    const handleEditTemplate = (templateType) => {
        setEditingTemplate(messageTemplates[templateType]);
        setIsTemplateModalOpen(true);
    };

    const handleSaveTemplate = (updatedTemplate) => {
        setMessageTemplates(prev => ({
            ...prev,
            [updatedTemplate.type]: updatedTemplate
        }));
        showNotification('Message template updated successfully!', 'success');
    };

    const generateSampleMessage = (templateType) => {
        const template = messageTemplates[templateType];
        let sampleMessage = template.content;

        // Replace placeholders with sample data
        if (templateType === 'late_payment') {
            sampleMessage = sampleMessage
                .replace('{studentName}', 'Ahmet Yılmaz')
                .replace('{dueDate}', '15/08/2024')
                .replace('{amount}', '500')
                .replace('{installmentCount}', '2');
        } else if (templateType === 'absence') {
            sampleMessage = sampleMessage
                .replace('{studentName}', 'Ayşe Demir')
                .replace('{lessonDate}', '20/08/2024')
                .replace('{lessonTime}', '14:00');
        }

        return sampleMessage;
    };

    const tabs = [
        { id: 'system', label: 'System Info', icon: ICONS.INFO },
        { id: 'messages', label: 'Message Templates', icon: ICONS.MESSAGE },
        { id: 'export', label: 'Data Export', icon: ICONS.DOWNLOAD }
    ];

    // Data Reset Functions
    const handleResetAllData = async () => {
        setIsResettingData(true);
        setResetProgress(0);
        
        try {
            setIsResettingData(true);
            setResetProgress(0);
            setExportStatus('Starting data reset...');

            // Step 1: Clear storage (30%)
            setResetProgress(10);
            setExportStatus('Clearing file storage...');
            
            const { data: files } = await supabase.storage.from('documents').list();
            if (files && files.length > 0) {
                const filePaths = files.map(file => file.name);
                await supabase.storage.from('documents').remove(filePaths);
            }

            // Step 2: Delete all data from tables
            setResetProgress(30);
            setExportStatus('Deleting all database records...');

            const tables = ['students', 'groups', 'lessons', 'events', 'todos', 'documents', 'transactions'];
            
            for (let i = 0; i < tables.length; i++) {
                const table = tables[i];
                setExportStatus(`Deleting ${table}...`);
                
                // First get all records, then delete them individually
                const { data: records, error: fetchError } = await supabase
                    .from(table)
                    .select('id');
                
                if (fetchError) {
                    throw new Error(`Error fetching ${table}: ${fetchError.message}`);
                }
                
                if (records && records.length > 0) {
                    const ids = records.map(record => record.id);
                    const { error: deleteError } = await supabase
                        .from(table)
                        .delete()
                        .in('id', ids);
                    
                    if (deleteError) {
                        throw new Error(`Error deleting ${table}: ${deleteError.message}`);
                    }
                }
                
                setResetProgress(30 + ((i + 1) / tables.length) * 30);
            }

            // Step 3: Clear localStorage (80%)
            setResetProgress(80);
            setExportStatus('Clearing local storage...');
            
            localStorage.clear();

            // Step 4: Refresh data (100%)
            setResetProgress(90);
            setExportStatus('Refreshing application...');
            
            await fetchData();
            
            setResetProgress(100);
            setExportStatus('Data reset completed successfully!');
            
            showNotification('All data has been successfully reset!', 'success');
            
            // Close modal after a short delay
            setTimeout(() => {
                setIsResettingData(false);
                setResetProgress(0);
                setExportStatus('');
            }, 2000);

        } catch (error) {
            console.error('Error resetting data:', error);
            showNotification(`Error resetting data: ${error.message}`, 'error');
            setIsResettingData(false);
            setResetProgress(0);
            setExportStatus('');
        }
    };

    const openResetConfirmation = () => {
        setIsResetConfirmOpen(true);
    };

    return (
        <div className="bg-gray-50 min-h-screen p-4 lg:p-6">
            <div className="max-w-6xl mx-auto">
                {/* Simple Premium Header */}
                <div className="mb-8">
                    <div className="flex items-center">
                        <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm mr-4">
                            <Icon path={ICONS.SETTINGS} className="w-7 h-7 text-white"/>
                        </div>
                        <div>
                            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Settings</h1>
                            <p className="text-gray-600 text-sm lg:text-base">Manage system settings, export data, and customize message templates</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="flex space-x-8 px-6">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                        activeTab === tab.id
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <Icon path={tab.icon} className="w-4 h-4 mr-2" />
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
            </div>

                    <div className="p-6">
                        {activeTab === 'export' && (
            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Export</h2>
                                    <p className="text-gray-600 mb-6">
                                        Export all system data including students, groups, documents, transactions, and lessons in a structured ZIP file.
                                    </p>
                                    
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                        <div className="flex items-start">
                                            <Icon path={ICONS.INFO} className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                                            <div>
                                                <h3 className="font-medium text-blue-900 mb-2">What's included in the export:</h3>
                                                <ul className="text-sm text-blue-800 space-y-1">
                                                    <li>• All student information and enrollment details</li>
                                                    <li>• Group configurations and schedules</li>
                                                    <li>• Document metadata and file references</li>
                                                    <li>• Financial transactions and payment records</li>
                                                    <li>• Lesson plans and attendance records</li>
                                                    <li>• Current message templates and settings</li>
                                                    <li>• <strong>All actual files (PDFs, documents, etc.)</strong></li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>

                    <button
                        onClick={handleExportData}
                                        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        <Icon path={ICONS.DOWNLOAD} className="w-5 h-5 mr-2" />
                                        Export All Data
                                    </button>
                                </div>

                                {/* Data Reset Section */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
                <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center mr-3">
                        <Icon path={ICONS.TRASH} className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-red-800">Danger Zone</h3>
                        <p className="text-sm text-red-600">Permanently delete all data and documents</p>
                    </div>
                </div>
                
                <div className="bg-white border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-medium text-red-800 mb-1">Reset All Data</h4>
                            <p className="text-sm text-red-600">
                                This will permanently delete ALL data including:
                            </p>
                            <ul className="text-sm text-red-600 mt-2 space-y-1">
                                <li>• All students, groups, lessons, and events</li>
                                <li>• All financial records and transactions</li>
                                <li>• All uploaded documents and files</li>
                                <li>• All todos and settings</li>
                                <li>• All local storage data</li>
                            </ul>
                            <p className="text-sm font-medium text-red-700 mt-2">
                                ⚠️ This action cannot be undone!
                            </p>
                        </div>
                        <button
                            onClick={openResetConfirmation}
                            disabled={isResettingData}
                            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors font-semibold"
                        >
                            {isResettingData ? 'Resetting...' : 'Reset All Data'}
                        </button>
                    </div>
                </div>

                {isResettingData && (
                    <div className="bg-white border border-red-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-red-800">Progress</span>
                            <span className="text-sm text-red-600">{resetProgress}%</span>
                        </div>
                        <div className="w-full bg-red-200 rounded-full h-2 mb-2">
                            <div 
                                className="bg-red-600 h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${resetProgress}%` }}
                            ></div>
                        </div>
                        <p className="text-sm text-red-600">{exportStatus}</p>
                    </div>
                )}
            </div>

                                <div className="border-t border-gray-200 pt-6">
                                    <h3 className="text-md font-semibold text-gray-900 mb-4">System Statistics</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                                            <div className="text-2xl font-bold text-blue-600">{students.length}</div>
                                            <div className="text-sm text-gray-600">Students</div>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                                            <div className="text-2xl font-bold text-green-600">{groups.length}</div>
                                            <div className="text-sm text-gray-600">Groups</div>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                                            <div className="text-2xl font-bold text-purple-600">{documents.length}</div>
                                            <div className="text-sm text-gray-600">Documents</div>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                                            <div className="text-2xl font-bold text-orange-600">{transactions.length}</div>
                                            <div className="text-sm text-gray-600">Transactions</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'messages' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Message Templates</h2>
                                    <p className="text-gray-600 mb-6">
                                        Customize the message templates used for late payment notifications and student absence communications.
                                    </p>
                                </div>

                                <div className="grid gap-6">
                                    {/* Late Payment Template */}
                                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h3 className="text-lg font-medium text-gray-900">{messageTemplates.late_payment.name}</h3>
                                                <p className="text-sm text-gray-600">Sent to parents when payments are overdue</p>
                                            </div>
                                            <button
                                                onClick={() => handleEditTemplate('late_payment')}
                                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                                            >
                                                <Icon path={ICONS.EDIT} className="w-4 h-4 mr-2" />
                                                Edit Template
                                            </button>
                                        </div>
                                        
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <h4 className="text-sm font-medium text-gray-700 mb-2">Sample Message:</h4>
                                            <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                                {generateSampleMessage('late_payment')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Absence Template */}
                                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h3 className="text-lg font-medium text-gray-900">{messageTemplates.absence.name}</h3>
                                                <p className="text-sm text-gray-600">Sent to parents when students miss lessons</p>
                                            </div>
                                            <button
                                                onClick={() => handleEditTemplate('absence')}
                                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                                            >
                                                <Icon path={ICONS.EDIT} className="w-4 h-4 mr-2" />
                                                Edit Template
                                            </button>
                                        </div>
                                        
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <h4 className="text-sm font-medium text-gray-700 mb-2">Sample Message:</h4>
                                            <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                                {generateSampleMessage('absence')}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <div className="flex items-start">
                                        <Icon path={ICONS.INFO} className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
                                        <div>
                                            <h3 className="font-medium text-yellow-900 mb-2">Available Placeholders:</h3>
                                            <div className="text-sm text-yellow-800 space-y-1">
                                                <p><strong>Late Payment:</strong> {'{studentName}'}, {'{dueDate}'}, {'{amount}'}, {'{installmentCount}'}</p>
                                                <p><strong>Absence:</strong> {'{studentName}'}, {'{lessonDate}'}, {'{lessonTime}'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'system' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900 mb-4">System Information</h2>
                                    <p className="text-gray-600 mb-6">
                                        Monitor storage usage, system performance, and important system details.
                                    </p>
                                </div>

                                <div className="grid gap-6">
                                    {/* Storage Information */}
                                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-medium text-gray-900">Storage Information</h3>
                                                                                        <button
                                                onClick={fetchStorageInfo}
                                                disabled={storageInfo.loading}
                                                className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                                            >
                                                {storageInfo.loading ? (
                                                    <>
                                                        <Icon path={ICONS.LOADING} className="w-4 h-4 mr-1 animate-spin" />
                                                        Calculating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Icon path={ICONS.REFRESH} className="w-4 h-4 mr-1" />
                                                        Refresh
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                        {storageInfo.loading ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-center py-4">
                                                    <Icon path={ICONS.LOADING} className="w-5 h-5 text-blue-600 animate-spin mr-2" />
                                                    <span className="text-gray-600">Calculating storage usage...</span>
                                                </div>
                                                <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                                                    <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                                                </div>
                                                <p className="text-xs text-gray-500 text-center">Scanning files and calculating sizes...</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600">Total Storage:</span>
                                                    <span className="font-medium">{formatFileSize(storageInfo.totalSize)}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600">Used Storage:</span>
                                                    <span className="font-medium">{formatFileSize(storageInfo.usedSize)}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600">Available Storage:</span>
                                                    <span className="font-medium">{formatFileSize(storageInfo.totalSize - storageInfo.usedSize)}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600">Total Files:</span>
                                                    <span className="font-medium">{storageInfo.fileCount}</span>
                                                </div>
                                                
                                                {/* Storage Progress Bar */}
                                                <div className="mt-4">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-sm font-medium text-gray-700">Storage Usage</span>
                                                        <span className="text-sm text-gray-600">{getStoragePercentage()}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div 
                                                            className={`h-2 rounded-full transition-all duration-300 ${
                                                                getStoragePercentage() > 80 ? 'bg-red-500' : 
                                                                getStoragePercentage() > 60 ? 'bg-yellow-500' : 'bg-green-500'
                                                            }`}
                                                            style={{ width: `${getStoragePercentage()}%` }}
                                                        ></div>
                                                    </div>
                                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                        <span>0</span>
                                                        <span>{formatFileSize(storageInfo.totalSize)}</span>
                                                    </div>
                                                </div>

                                                {/* Storage Status */}
                                                <div className={`mt-3 p-3 rounded-lg ${
                                                    getStoragePercentage() > 80 ? 'bg-red-50 border border-red-200' :
                                                    getStoragePercentage() > 60 ? 'bg-yellow-50 border border-yellow-200' :
                                                    'bg-green-50 border border-green-200'
                                                }`}>
                                                    <div className="flex items-center">
                                                        <Icon 
                                                            path={
                                                                getStoragePercentage() > 80 ? ICONS.EXCLAMATION :
                                                                getStoragePercentage() > 60 ? ICONS.WARNING :
                                                                ICONS.CHECK_CIRCLE
                                                            } 
                                                            className={`w-4 h-4 mr-2 ${
                                                                getStoragePercentage() > 80 ? 'text-red-600' :
                                                                getStoragePercentage() > 60 ? 'text-yellow-600' :
                                                                'text-green-600'
                                                            }`} 
                                                        />
                                                        <span className={`text-sm font-medium ${
                                                            getStoragePercentage() > 80 ? 'text-red-800' :
                                                            getStoragePercentage() > 60 ? 'text-yellow-800' :
                                                            'text-green-800'
                                                        }`}>
                                                            {getStoragePercentage() > 80 ? 'Storage nearly full' :
                                                             getStoragePercentage() > 60 ? 'Storage usage is moderate' :
                                                             'Storage usage is healthy'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Data Overview */}
                                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                                        <h3 className="text-lg font-medium text-gray-900 mb-4">Data Overview</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                                                <div className="text-2xl font-bold text-blue-600">{students.length}</div>
                                                <div className="text-sm text-gray-600">Students</div>
                                            </div>
                                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                                <div className="text-2xl font-bold text-green-600">{groups.length}</div>
                                                <div className="text-sm text-gray-600">Groups</div>
                                            </div>
                                            <div className="text-center p-4 bg-purple-50 rounded-lg">
                                                <div className="text-2xl font-bold text-purple-600">{documents.length}</div>
                                                <div className="text-sm text-gray-600">Documents</div>
                                            </div>
                                            <div className="text-center p-4 bg-orange-50 rounded-lg">
                                                <div className="text-2xl font-bold text-orange-600">{transactions.length}</div>
                                                <div className="text-sm text-gray-600">Transactions</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* System Health */}
                                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                                        <h3 className="text-lg font-medium text-gray-900 mb-4">System Health</h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                                <div className="flex items-center">
                                                    <Icon path={ICONS.CHECK_CIRCLE} className="w-5 h-5 text-green-600 mr-3" />
                                                    <span className="text-sm font-medium text-green-800">Database Connection</span>
                                                </div>
                                                <span className="text-sm text-green-600">Connected</span>
                                            </div>
                                            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                                <div className="flex items-center">
                                                    <Icon path={ICONS.CHECK_CIRCLE} className="w-5 h-5 text-green-600 mr-3" />
                                                    <span className="text-sm font-medium text-green-800">Storage Connection</span>
                                                </div>
                                                <span className="text-sm text-green-600">Connected</span>
                                            </div>
                                            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                                <div className="flex items-center">
                                                    <Icon path={ICONS.CHECK_CIRCLE} className="w-5 h-5 text-green-600 mr-3" />
                                                    <span className="text-sm font-medium text-green-800">Message Templates</span>
                                                </div>
                                                <span className="text-sm text-green-600">{Object.keys(messageTemplates).length} configured</span>
                                            </div>
                                            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                                <div className="flex items-center">
                                                    <Icon path={ICONS.CALENDAR} className="w-5 h-5 text-blue-600 mr-3" />
                                                    <span className="text-sm font-medium text-blue-800">Last Export</span>
                                                </div>
                                                <span className="text-sm text-blue-600">
                                                    {localStorage.getItem('lastExportDate') ? 
                                                        new Date(localStorage.getItem('lastExportDate')).toLocaleDateString('tr-TR') : 
                                                        'Never'
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                                        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <button
                                                onClick={() => {
                                                    localStorage.clear();
                                                    showNotification('All local data cleared. Please refresh the page.', 'info');
                                                }}
                                                className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                            >
                                                <Icon path={ICONS.TRASH} className="w-4 h-4 mr-2" />
                                                Clear Local Data
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const currentDate = new Date().toISOString();
                                                    localStorage.setItem('lastExportDate', currentDate);
                                                    showNotification('Export date updated!', 'success');
                                                }}
                                                className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                            >
                                                <Icon path={ICONS.CALENDAR} className="w-4 h-4 mr-2" />
                                                Update Export Date
                                            </button>

                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <MessageTemplateModal
                isOpen={isTemplateModalOpen}
                onClose={() => setIsTemplateModalOpen(false)}
                template={editingTemplate}
                onSave={handleSaveTemplate}
            />

            <ExportProgressModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                progress={exportProgress}
                status={exportStatus}
            />

            {/* Reset Confirmation Modal */}
            <Modal isOpen={isResetConfirmOpen} onClose={() => setIsResetConfirmOpen(false)} title="Confirm Data Reset">
                <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center mb-3">
                            <Icon path={ICONS.EXCLAMATION_TRIANGLE} className="w-6 h-6 text-red-600 mr-3" />
                            <h3 className="text-lg font-semibold text-red-800">Warning: Irreversible Action</h3>
                        </div>
                        <p className="text-red-700 mb-3">
                            You are about to permanently delete ALL data from the system. This action cannot be undone.
                        </p>
                        <div className="bg-white border border-red-200 rounded p-3">
                            <h4 className="font-medium text-red-800 mb-2">This will delete:</h4>
                            <ul className="text-sm text-red-700 space-y-1">
                                <li>• All students and their information</li>
                                <li>• All groups and lesson schedules</li>
                                <li>• All financial records and transactions</li>
                                <li>• All uploaded documents and files</li>
                                <li>• All todos and system settings</li>
                                <li>• All local storage data</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center">
                            <Icon path={ICONS.INFO} className="w-5 h-5 text-yellow-600 mr-3" />
                            <p className="text-yellow-800 text-sm">
                                <strong>Recommendation:</strong> Export your data first before proceeding with the reset.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            onClick={() => setIsResetConfirmOpen(false)}
                            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                setIsResetConfirmOpen(false);
                                handleResetAllData();
                            }}
                            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                        >
                            Yes, Reset All Data
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SettingsModule;
