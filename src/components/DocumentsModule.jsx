import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Icon, ICONS } from './Icons';
import Modal from './Modal';
import DocumentEditModal from './DocumentEditModal';
import ConfirmationModal from './ConfirmationModal';
import { useNotification } from '../contexts/NotificationContext';
import { useAppContext } from '../contexts/AppContext';

const DocumentCategoryCard = ({ category, icon, color, documents, onSelectCategory }) => (
    <div 
        className={`bg-white rounded-lg shadow-md p-6 flex flex-col items-center justify-center cursor-pointer transform transition duration-300 hover:scale-105`} 
        style={{ borderBottom: `4px solid ${color}` }}
        onClick={() => onSelectCategory(category, documents)}
    >
        <div className={`p-3 rounded-full mb-4`} style={{ backgroundColor: color, opacity: 0.2 }}>
            <Icon path={icon} className="w-8 h-8" style={{ color: color }} />
        </div>
        <h3 className="text-xl font-semibold text-gray-800">{category}</h3>
        <p className="text-gray-500 text-sm">{documents.length} documents</p>
    </div>
);

const DocumentListModal = ({ isOpen, onClose, category, documents, onEditDocument, onDeleteDocument }) => (
    <Modal isOpen={isOpen} onClose={onClose} title={`${category} Documents`}>
        <div className="space-y-4">
            {documents.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                    {documents.map(doc => (
                        <li key={doc.id} className="py-3 flex justify-between items-center">
                            <div>
                                <p className="font-medium text-gray-800">{doc.name}</p>
                                <p className="text-sm text-gray-500">Uploaded: {doc.upload_date ? new Date(doc.upload_date).toLocaleDateString() : 'N/A'}</p>
                            </div>
                            <div className="flex space-x-2">
                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1 text-sm rounded-lg text-white bg-blue-600 hover:bg-blue-700">
                                    Preview
                                </a>
                                <a href={doc.url} download className="px-3 py-1 text-sm rounded-lg text-white bg-green-600 hover:bg-green-700">
                                    Download
                                </a>
                                <button onClick={() => onEditDocument(doc)} className="px-3 py-1 text-sm rounded-lg text-white bg-yellow-600 hover:bg-yellow-700">
                                    Edit
                                </button>
                                <button onClick={() => onDeleteDocument(doc)} className="px-3 py-1 text-sm rounded-lg text-white bg-red-600 hover:bg-red-700">
                                    Delete
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-center text-gray-500">No documents in this category.</p>
            )}
        </div>
    </Modal>
);

const DocumentsModule = () => {
    const { documents, fetchData } = useAppContext();
    const { showNotification } = useNotification();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [documentToEdit, setDocumentToEdit] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    const filteredDocuments = documents.filter(doc => {
        const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
        const matchesSearchTerm = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearchTerm;
    });

    const documentCategories = [
        { name: 'National IDs', icon: ICONS.STUDENTS, color: '#3b82f6', filter: (doc) => doc.type === 'nationalId' },
        { name: 'Agreements', icon: ICONS.DOCUMENTS, color: '#10b981', filter: (doc) => doc.type === 'agreement' },
        { name: 'Certificates', icon: ICONS.SAVE, color: '#ef4444', filter: (doc) => doc.type === 'certificate' },
        { name: 'Other', icon: ICONS.INFO, color: '#f59e0b', filter: (doc) => !['nationalId', 'agreement', 'certificate'].includes(doc.type) },
    ];

    const handleSelectCategory = (categoryName, docs) => {
        setSelectedCategory(categoryName);
        setSelectedCategoryDocuments(docs);
    };

    const handleEditDocument = (doc) => {
        setDocumentToEdit(doc);
        setIsEditModalOpen(true);
    };

    const handleDeleteDocument = (doc) => {
        setDocumentToDelete(doc);
        setIsConfirmModalOpen(true);
    };

    const confirmDeleteDocument = async () => {
        if (!documentToDelete) return;

        try {
            const { error: dbError } = await supabase.from('documents').delete().match({ id: documentToDelete.id });
            if (dbError) throw dbError;

            if (documentToDelete.storage_path) {
                const { error: storageError } = await supabase.storage.from('udms').remove([documentToDelete.storage_path]);
                if (storageError) {
                    console.error("Error deleting file from Supabase:", storageError);
                    showNotification('Failed to delete file from storage.', 'error');
                }
            }
            showNotification('Document deleted successfully!', 'success');
            fetchData();
            setSelectedCategory(null); // Close the document list modal
        } catch (error) {
            console.error("Error deleting document:", error);
            showNotification('Failed to delete document.', 'error');
        } finally {
            setIsConfirmModalOpen(false);
            setDocumentToDelete(null);
        }
    };

    return (
        <div className="relative p-4 md:p-8 bg-gray-50 rounded-lg shadow-lg">
            <div className="flex justify-between items-center pb-4 mb-6 border-b border-gray-200">
                <h2 className="text-3xl font-bold text-gray-800 flex items-center"><Icon path={ICONS.DOCUMENTS} className="w-8 h-8 mr-3"/>Documents</h2>
                <button onClick={() => setIsEditModalOpen(true)} className="flex items-center px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow"><Icon path={ICONS.ADD} className="mr-2"/>Add Document</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {documentCategories.map(category => (
                    <DocumentCategoryCard
                        key={category.name}
                        category={category.name}
                        icon={category.icon}
                        color={category.color}
                        documents={documents.filter(category.filter)}
                        onSelectCategory={handleSelectCategory}
                    />
                ))}
            </div>
            {selectedCategory && (
                <DocumentListModal
                    isOpen={!!selectedCategory}
                    onClose={() => setSelectedCategory(null)}
                    category={selectedCategory}
                    documents={selectedCategoryDocuments}
                    onEditDocument={handleEditDocument}
                    onDeleteDocument={handleDeleteDocument}
                />
            )}
            {documentToDelete && (
                <ConfirmationModal
                    isOpen={isConfirmModalOpen}
                    onClose={() => setIsConfirmModalOpen(false)}
                    onConfirm={confirmDeleteDocument}
                    title="Delete Document"
                    message={`Are you sure you want to delete the document "${documentToDelete.name}"? This action cannot be undone.`}
                />
            )}
            {documentToEdit && (
                <DocumentEditModal
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setDocumentToEdit(null);
                    }}
                    documentToEdit={documentToEdit}
                />
            )}
            
        </div>
    );
};

export default DocumentsModule;
