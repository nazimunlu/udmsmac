import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { collection, getDocs } from 'firebase/firestore';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const SettingsModule = () => {
    const { db, appId, userId } = useAppContext();
    const [isExporting, setIsExporting] = useState(false);

    const handleExportData = async () => {
        setIsExporting(true);
        try {
            const zip = new JSZip();
            const dataFolder = zip.folder('exported_data');

            // Helper to convert Firestore Timestamps to ISO strings
            const serializeData = (data) => {
                return JSON.parse(JSON.stringify(data, (key, value) => {
                    if (value && typeof value.toDate === 'function') {
                        return value.toDate().toISOString();
                    }
                    return value;
                }));
            };

            // Fetch Students
            const studentsCollectionRef = collection(db, 'artifacts', appId, 'users', userId, 'students');
            const studentsSnapshot = await getDocs(studentsCollectionRef);
            const studentsData = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            dataFolder.file('students.json', JSON.stringify(serializeData(studentsData), null, 2));

            // Fetch Groups
            const groupsCollectionRef = collection(db, 'artifacts', appId, 'users', userId, 'groups');
            const groupsSnapshot = await getDocs(groupsCollectionRef);
            const groupsData = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            dataFolder.file('groups.json', JSON.stringify(serializeData(groupsData), null, 2));

            // Fetch Transactions
            const transactionsCollectionRef = collection(db, 'artifacts', appId, 'users', userId, 'transactions');
            const transactionsSnapshot = await getDocs(transactionsCollectionRef);
            const transactionsData = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            dataFolder.file('transactions.json', JSON.stringify(serializeData(transactionsData), null, 2));

            // Fetch Documents (metadata only)
            const documentsCollectionRef = collection(db, 'artifacts', appId, 'users', userId, 'documents');
            const documentsSnapshot = await getDocs(documentsCollectionRef);
            const documentsData = documentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            dataFolder.file('documents_metadata.json', JSON.stringify(serializeData(documentsData), null, 2));

            // Generate and download the zip file
            zip.generateAsync({ type: 'blob' }).then(function(content) {
                saveAs(content, 'udms_data_export.zip');
            });

        } catch (error) {
            console.error('Error exporting data:', error);
            alert('Failed to export data. Check console for details.');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="p-4 md:p-8 bg-gray-50 rounded-lg shadow-lg">
            <h2 className="text-3xl font-bold text-gray-800 flex items-center"><Icon path={ICONS.SETTINGS} className="w-8 h-8 mr-3"/>Settings</h2>
            <div className="space-y-6">
                <section>
                    <h3 className="text-xl font-semibold text-gray-700 mb-4">Data Export</h3>
                    <p className="text-gray-600 mb-4">Export all your student, group, financial, and document metadata into a categorized ZIP file.</p>
                    <button
                        onClick={handleExportData}
                        disabled={isExporting}
                        className="px-6 py-3 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed shadow-md transition-colors"
                    >
                        {isExporting ? 'Exporting...' : 'Export All Data'}
                    </button>
                </section>

                
            </div>
        </div>
    );
};

export default SettingsModule;
