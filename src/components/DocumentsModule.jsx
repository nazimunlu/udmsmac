import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Icon, ICONS } from './Icons';
import Modal from './Modal';
import DocumentEditModal from './DocumentEditModal';
import ConfirmationModal from './ConfirmationModal';
import { useNotification } from '../contexts/NotificationContext';
import { useAppContext } from '../contexts/AppContext';
import apiClient from '../apiClient';
import { sanitizeFileName } from '../utils/caseConverter';

const DocumentUploadModal = ({ isOpen, onClose, category, onUploadSuccess }) => {
    const { showNotification } = useNotification();
    const { fetchData, students } = useAppContext();
    const [formData, setFormData] = useState({
        name: '',
        type: '',
        studentId: '',
        description: ''
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const getDocumentTypes = () => {
        switch (category) {
            case 'student':
                return [
                    { value: 'nationalId', label: 'National ID' },
                    { value: 'agreement', label: 'Agreement' },
                    { value: 'certificate', label: 'Certificate' },
                    { value: 'other', label: 'Other' }
                ];
            case 'finance':
                return [
                    { value: 'invoice', label: 'Invoice' },
                    { value: 'receipt', label: 'Receipt' },
                    { value: 'contract', label: 'Contract' },
                    { value: 'other', label: 'Other' }
                ];
            case 'meb':
                return [
                    { value: 'received', label: 'Received Document' },
                    { value: 'sent', label: 'Sent Document' },
                    { value: 'official', label: 'Official Document' },
                    { value: 'other', label: 'Other' }
                ];
            default:
                return [{ value: 'other', label: 'Other' }];
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            if (!formData.name) {
                setFormData(prev => ({ ...prev, name: file.name }));
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedFile || !formData.name.trim()) {
            showNotification('Please select a file and enter a name.', 'error');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const sanitizedFileName = sanitizeFileName(formData.name);
            const fileExtension = selectedFile.name.split('.').pop();
            const storagePath = `documents/${category}/${user.id}/${sanitizedFileName}.${fileExtension}`;

            // Upload file to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('udms')
                .upload(storagePath, selectedFile, {
                    onUploadProgress: (progress) => {
                        setUploadProgress((progress.loaded / progress.total) * 100);
                    }
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('udms')
                .getPublicUrl(storagePath);

            // Save document metadata to database
            await apiClient.create('documents', {
                name: formData.name,
                type: formData.type,
                category: category,
                studentId: formData.studentId || null,
                description: formData.description,
                url: publicUrl,
                storagePath: storagePath,
                uploadDate: new Date().toISOString().split('T')[0]
            });

            showNotification('Document uploaded successfully!', 'success');
            fetchData();
            onUploadSuccess();
            onClose();
            
            // Reset form
            setFormData({ name: '', type: '', studentId: '', description: '' });
            setSelectedFile(null);
            setUploadProgress(0);
        } catch (error) {
            console.error('Error uploading document:', error);
            showNotification('Failed to upload document.', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={`Upload ${category.charAt(0).toUpperCase() + category.slice(1)} Document`}
            headerStyle={{ backgroundColor: '#3B82F6' }}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Document Name
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter document name"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Document Type
                    </label>
                    <select
                        value={formData.type}
                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    >
                        <option value="">Select document type</option>
                        {getDocumentTypes().map(type => (
                            <option key={type.value} value={type.value}>
                                {type.label}
                            </option>
                        ))}
                    </select>
                </div>

                {category === 'student' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Student
                        </label>
                        <select
                            value={formData.studentId}
                            onChange={(e) => setFormData(prev => ({ ...prev, studentId: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="">Select a student</option>
                            {students.map(student => (
                                <option key={student.id} value={student.id}>
                                    {student.firstName} {student.lastName}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description (Optional)
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows="3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Add a description for this document"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select File
                    </label>
                    <input
                        type="file"
                        onChange={handleFileChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                        required
                    />
                    {selectedFile && (
                        <p className="text-sm text-gray-500 mt-1">
                            Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                    )}
                </div>

                {isUploading && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-blue-800">Uploading...</span>
                            <span className="text-sm text-blue-600">{uploadProgress.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2">
                            <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                        disabled={isUploading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isUploading || !selectedFile || !formData.name.trim() || !formData.type}
                        className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {isUploading ? 'Uploading...' : 'Upload Document'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

const DocumentCard = ({ title, icon, color, documents, onViewDocuments, onUploadDocument, category }) => (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4" style={{ borderLeftColor: color }}>
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
                <div className="p-3 rounded-lg mr-3" style={{ backgroundColor: color, opacity: 0.1 }}>
                    <Icon path={icon} className="w-6 h-6" style={{ color: color }} />
                </div>
                <div>
                    <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
                    <p className="text-sm text-gray-500">{documents.length} documents</p>
                </div>
            </div>
            <button
                onClick={() => onUploadDocument(category)}
                className="px-3 py-1 text-sm text-white rounded-md transition-colors"
                style={{ backgroundColor: color }}
            >
                <Icon path={ICONS.ADD} className="w-4 h-4" />
            </button>
        </div>
        
        <div className="space-y-2">
            {documents.slice(0, 3).map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                    <div className="flex items-center">
                        <Icon path={ICONS.DOCUMENTS} className="w-4 h-4 text-gray-500 mr-2" />
                        <span className="text-sm text-gray-700 truncate">{doc.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                        {doc.uploadDate ? new Date(doc.uploadDate).toLocaleDateString('en-GB') : 'N/A'}
                    </span>
                </div>
            ))}
            {documents.length > 3 && (
                <p className="text-xs text-gray-500 text-center">
                    +{documents.length - 3} more documents
                </p>
            )}
        </div>
        
        <button
            onClick={() => onViewDocuments(category, documents)}
            className="w-full mt-4 px-4 py-2 text-sm font-medium text-white rounded-md transition-colors"
            style={{ backgroundColor: color }}
        >
            View All Documents
        </button>
    </div>
);

const DocumentListModal = ({ isOpen, onClose, category, documents, onEditDocument, onDeleteDocument }) => {
    const { students } = useAppContext();
    
    const getCategoryTitle = () => {
        switch (category) {
            case 'student': return 'Student Documents';
            case 'finance': return 'Finance Documents';
            case 'meb': return 'MEB Documents';
            default: return 'Documents';
        }
    };

    const getStudentName = (studentId) => {
        const student = students.find(s => s.id === studentId);
        return student ? `${student.firstName} ${student.lastName}` : 'Unknown Student';
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={getCategoryTitle()}
            size="lg"
            headerStyle={{ backgroundColor: '#10B981' }}
        >
            <div className="space-y-4 max-h-96 overflow-y-auto">
            {documents.length > 0 ? (
                    <div className="space-y-3">
                    {documents.map(doc => (
                            <div key={doc.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center mb-2">
                                            <Icon path={ICONS.DOCUMENTS} className="w-5 h-5 text-gray-500 mr-2" />
                                            <h4 className="font-medium text-gray-800">{doc.name}</h4>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                                            <div>
                                                <span className="font-medium">Type:</span> {doc.type}
                                            </div>
                            <div>
                                                <span className="font-medium">Uploaded:</span> {doc.uploadDate ? new Date(doc.uploadDate).toLocaleDateString('en-GB') : 'N/A'}
                                            </div>
                                            {category === 'student' && doc.studentId && (
                                                <div className="col-span-2">
                                                    <span className="font-medium">Student:</span> {getStudentName(doc.studentId)}
                                                </div>
                                            )}
                                            {doc.description && (
                                                <div className="col-span-2">
                                                    <span className="font-medium">Description:</span> {doc.description}
                                                </div>
                                            )}
                                        </div>
                            </div>
                                    <div className="flex space-x-2 ml-4">
                                        <a 
                                            href={doc.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="px-3 py-1 text-sm rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                                            title="Preview"
                                        >
                                            <Icon path={ICONS.EYE} className="w-4 h-4" />
                                        </a>
                                        <a 
                                            href={doc.url} 
                                            download 
                                            className="px-3 py-1 text-sm rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors"
                                            title="Download"
                                        >
                                            <Icon path={ICONS.DOWNLOAD} className="w-4 h-4" />
                                        </a>
                                        <button 
                                            onClick={() => onEditDocument(doc)} 
                                            className="px-3 py-1 text-sm rounded-lg text-white bg-yellow-600 hover:bg-yellow-700 transition-colors"
                                            title="Edit"
                                        >
                                            <Icon path={ICONS.EDIT} className="w-4 h-4" />
                                </button>
                                        <button 
                                            onClick={() => onDeleteDocument(doc)} 
                                            className="px-3 py-1 text-sm rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors"
                                            title="Delete"
                                        >
                                            <Icon path={ICONS.DELETE} className="w-4 h-4" />
                                </button>
                                    </div>
                                </div>
                            </div>
                    ))}
                    </div>
            ) : (
                    <div className="text-center py-8">
                        <Icon path={ICONS.DOCUMENTS} className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No documents in this category.</p>
                    </div>
            )}
        </div>
    </Modal>
);
};

const DocumentsModule = () => {
    const { documents, students, fetchData } = useAppContext();
    const { showNotification } = useNotification();
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [documentToEdit, setDocumentToEdit] = useState(null);
    const [uploadCategory, setUploadCategory] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedCategoryDocuments, setSelectedCategoryDocuments] = useState([]);
    const [documentToDelete, setDocumentToDelete] = useState(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    // Categorize documents
    const studentDocuments = documents.filter(doc => doc.category === 'student');
    const financeDocuments = documents.filter(doc => doc.category === 'finance');
    const mebDocuments = documents.filter(doc => doc.category === 'meb');

    const documentCategories = [
        {
            title: 'Student Documents',
            icon: ICONS.STUDENTS,
            color: '#3B82F6',
            category: 'student',
            documents: studentDocuments,
            description: 'National IDs and agreements for each student'
        },
        {
            title: 'Finance Documents',
            icon: ICONS.WALLET,
            color: '#10B981',
            category: 'finance',
            documents: financeDocuments,
            description: 'Invoices and financial documents'
        },
        {
            title: 'MEB Documents',
            icon: ICONS.BUILDING,
            color: '#F59E0B',
            category: 'meb',
            documents: mebDocuments,
            description: 'Milli Eğitim Bakanlığı documents'
        }
    ];

    const handleUploadDocument = (category) => {
        setUploadCategory(category);
        setIsUploadModalOpen(true);
    };

    const handleViewDocuments = (category, docs) => {
        setSelectedCategory(category);
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
            await apiClient.delete('documents', documentToDelete.id);

            if (documentToDelete.storagePath) {
                const { error: storageError } = await supabase.storage.from('udms').remove([documentToDelete.storagePath]);
                if (storageError) {
                    console.error("Error deleting file from Supabase:", storageError);
                    showNotification('Failed to delete file from storage.', 'error');
                }
            }
            showNotification('Document deleted successfully!', 'success');
            fetchData();
            setSelectedCategory(null);
        } catch (error) {
            console.error("Error deleting document:", error);
            showNotification('Failed to delete document.', 'error');
        } finally {
            setIsConfirmModalOpen(false);
            setDocumentToDelete(null);
        }
    };

    const totalDocuments = documents.length;

    return (
        <div className="relative p-4 md:p-8 bg-gray-50 rounded-lg shadow-lg">
            {/* Header */}
            <div className="flex justify-between items-center pb-4 mb-6 border-b border-gray-200">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 flex items-center">
                        <Icon path={ICONS.DOCUMENTS} className="w-8 h-8 mr-3"/>
                        Documents
                    </h2>
                    <p className="text-gray-600 mt-1">Manage student, finance, and MEB documents</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-500">Total Documents</p>
                    <p className="text-2xl font-bold text-gray-800">{totalDocuments}</p>
                </div>
            </div>

            {/* Document Categories */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {documentCategories.map(category => (
                    <DocumentCard
                        key={category.category}
                        title={category.title}
                        icon={category.icon}
                        color={category.color}
                        documents={category.documents}
                        category={category.category}
                        onViewDocuments={handleViewDocuments}
                        onUploadDocument={handleUploadDocument}
                    />
                ))}
            </div>

            {/* Modals */}
            <DocumentUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                category={uploadCategory}
                onUploadSuccess={() => setIsUploadModalOpen(false)}
            />

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
