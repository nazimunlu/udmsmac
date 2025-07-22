import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Icon, ICONS } from './Icons';

const SettingsModule = () => {
    const [isExporting, setIsExporting] = useState(false);

    const handleExportData = async () => {
        setIsExporting(true);
        try {
            const zip = new JSZip();
            const dataFolder = zip.folder('exported_data');

            const { data: studentsData, error: studentsError } = await supabase.from('students').select('*');
            if (studentsError) throw studentsError;
            dataFolder.file('students.json', JSON.stringify(studentsData.map(s => ({
                ...s,
                installments: s.installments ? JSON.parse(s.installments) : [],
                feeDetails: s.fee_details ? JSON.parse(s.fee_details) : {},
                tutoringDetails: s.tutoring_details ? JSON.parse(s.tutoring_details) : {},
                documents: s.documents ? JSON.parse(s.documents) : {},
                documentNames: s.document_names ? JSON.parse(s.document_names) : {},
            })), null, 2));

            const { data: groupsData, error: groupsError } = await supabase.from('groups').select('*');
            if (groupsError) throw groupsError;
            dataFolder.file('groups.json', JSON.stringify(groupsData.map(g => ({
                ...g,
                schedule: g.schedule ? JSON.parse(g.schedule) : {},
            })), null, 2));

            const { data: transactionsData, error: transactionsError } = await supabase.from('transactions').select('*');
            if (transactionsError) throw transactionsError;
            dataFolder.file('transactions.json', JSON.stringify(transactionsData, null, 2));

            const { data: documentsData, error: documentsError } = await supabase.from('documents').select('*');
            if (documentsError) throw documentsError;
            dataFolder.file('documents_metadata.json', JSON.stringify(documentsData, null, 2));

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
            <div className="flex justify-between items-center pb-4 mb-6 border-b border-gray-200">
                <h2 className="text-3xl font-bold text-gray-800 flex items-center"><Icon path={ICONS.SETTINGS} className="w-8 h-8 mr-3"/>Settings</h2>
            </div>
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
