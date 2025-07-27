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

// Document Upload Modal Component
const DocumentUploadModal = ({ isOpen, onClose, category, onUploadSuccess, documentType }) => {
    const { showNotification } = useNotification();
    const { fetchData, students } = useAppContext();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        type: 'other'
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setFormData({
                name: '',
                description: '',
                type: documentType || 'other'
            });
            setSelectedFile(null);
            setUploadProgress(0);
        }
    }, [isOpen, documentType]);

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
                    { value: 'payment_plan', label: 'Payment Plan' },
                    { value: 'financial_report', label: 'Financial Report' },
                    { value: 'other', label: 'Other' }
                ];
            case 'meb':
                return [
                    { value: 'received', label: 'Received Document' },
                    { value: 'sent', label: 'Sent Document' },
                    { value: 'official', label: 'Official Document' },
                    { value: 'permit', label: 'Permit' },
                    { value: 'license', label: 'License' },
                    { value: 'other', label: 'Other' }
                ];
            default:
                return [{ value: 'other', label: 'Other' }];
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file size (10MB limit)
            if (file.size > 10 * 1024 * 1024) {
                showNotification('File size must be less than 10MB.', 'error');
                return;
            }
            
            // Validate file type
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(file.type)) {
                showNotification('Please select a valid file type (PDF, image, or Word document).', 'error');
                return;
            }

            setSelectedFile(file);
            if (!formData.name) {
                setFormData(prev => ({ ...prev, name: file.name }));
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedFile || !formData.name.trim() || !formData.type) {
            showNotification('Please fill in all required fields and select a file.', 'error');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            // Get file extension from original file
            const fileExtension = selectedFile.name.split('.').pop().toLowerCase();
            
            // Create sanitized name without extension
            const sanitizedBaseName = sanitizeFileName(formData.name).replace(/\.[^/.]+$/, '');
            
            const timestamp = new Date().getTime();
            const storagePath = `documents/${category}/${user.id}/${timestamp}_${sanitizedBaseName}.${fileExtension}`;

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
                student_id: formData.studentId || null,
                description: formData.description,
                url: publicUrl,
                storage_path: storagePath,
                upload_date: new Date().toISOString().split('T')[0]
            });

            showNotification('Document uploaded successfully!', 'success');
            fetchData();
            onUploadSuccess();
            onClose();
        } catch (error) {
            console.error('Error uploading document:', error);
            showNotification('Failed to upload document. Please try again.', 'error');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const getCategoryColor = () => {
        switch (category) {
            case 'student': return '#3B82F6';
            case 'finance': return '#10B981';
            case 'meb': return '#F59E0B';
            default: return '#6B7280';
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={`Upload ${category.charAt(0).toUpperCase() + category.slice(1)} Document`}
            headerStyle={{ backgroundColor: getCategoryColor() }}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* File Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select File *
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                        <div className="space-y-1 text-center">
                            <Icon path={ICONS.UPLOAD} className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="flex text-sm text-gray-600">
                                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                    <span>Upload a file</span>
                                    <input 
                                        id="file-upload" 
                                        name="file-upload" 
                                        type="file" 
                                        className="sr-only" 
                                        onChange={handleFileChange}
                                        accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                                    />
                                </label>
                                <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-gray-500">
                                PDF, PNG, JPG, GIF, DOC up to 10MB
                            </p>
                        </div>
                    </div>
                    {selectedFile && (
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                            <div className="flex items-center">
                                <Icon path={ICONS.CHECK_CIRCLE} className="w-5 h-5 text-green-600 mr-2" />
                                <span className="text-sm text-green-800">{selectedFile.name}</span>
                                <span className="text-xs text-green-600 ml-2">
                                    ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Document Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Document Name *
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter document name"
                        required
                    />
                </div>

                {/* Document Type */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Document Type *
                    </label>
                    <select
                        value={formData.type}
                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

                {/* Student Selection (for student documents) */}
                {category === 'student' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Student *
                        </label>
                        <select
                            value={formData.studentId}
                            onChange={(e) => setFormData(prev => ({ ...prev, studentId: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        >
                            <option value="">Select a student</option>
                            {students.map(student => (
                                <option key={student.id} value={student.id}>
                                    {student.fullName}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter document description (optional)"
                    />
                </div>

                {/* Upload Progress */}
                {isUploading && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Uploading...</span>
                            <span>{Math.round(uploadProgress)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        disabled={isUploading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isUploading}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
                    >
                        {isUploading ? 'Uploading...' : 'Upload Document'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

// Document Card Component
const DocumentCard = ({ title, icon, color, documents, category, onViewDocuments, onUploadDocument, onOpenFolders }) => {
    const documentCount = documents.length;
    
    // Create gradient colors based on the category color
    const getGradientColors = (baseColor) => {
        const colorMap = {
            '#3B82F6': 'from-blue-500 to-blue-600', // Student
            '#10B981': 'from-green-500 to-green-600', // Finance
            '#F59E0B': 'from-amber-500 to-amber-600', // MEB
            '#8B5CF6': 'from-purple-500 to-purple-600', // Default
        };
        return colorMap[baseColor] || 'from-blue-500 to-blue-600';
    };
    
    const gradientColors = getGradientColors(color);
    
    return (
        <div 
            className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 p-4 cursor-pointer group" 
            onClick={() => onOpenFolders(category, documents)}
        >
            <div className="flex items-center mb-3">
                <div 
                    className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 flex-shrink-0 bg-gradient-to-br ${gradientColors} shadow-sm`}
                >
                    <Icon path={icon} className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors truncate">{title}</h3>
                    <p className="text-sm text-gray-600">{documentCount} document{documentCount !== 1 ? 's' : ''}</p>
                </div>
            </div>
            
            <div className="flex items-center justify-between">
                <div className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getGradientColors(color).replace('from-', 'bg-').replace(' to-', '')} text-white`}>
                    <Icon path={ICONS.DOCUMENTS} className="w-3 h-3 mr-1" />
                    {documentCount} files
                </div>
                
                {/* Upload button for MEB */}
                {category === 'meb' && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onUploadDocument(category, 'received');
                        }}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                    >
                        <Icon path={ICONS.UPLOAD} className="w-3 h-3 mr-1" />
                        Upload
                    </button>
                )}
            </div>
        </div>
    );
};

// Helper function to organize student documents into folders
const getStudentFolders = (documents) => {
    const folders = {};
    
    documents.forEach(doc => {
        if (!folders[doc.studentId]) {
            folders[doc.studentId] = {
                studentId: doc.studentId,
                studentName: doc.studentName || 'Unknown Student',
                documents: [],
                hasNationalId: false,
                hasAgreement: false,
                hasPaymentPlan: false,
                hasInvoices: false
            };
        }
        
        folders[doc.studentId].documents.push(doc);
        
        // Check document types
        if (doc.type === 'nationalId') folders[doc.studentId].hasNationalId = true;
        if (doc.type === 'agreement') folders[doc.studentId].hasAgreement = true;
        if (doc.type === 'payment_plan') folders[doc.studentId].hasPaymentPlan = true;
        if (doc.type === 'invoice') folders[doc.studentId].hasInvoices = true;
    });
    
    return Object.values(folders).sort((a, b) => a.studentName.localeCompare(b.studentName));
};

const getFinanceFolders = (documents) => {
    const folders = {};
    
    documents.forEach(doc => {
        if (doc.category === 'finance') {
            // Use the subcategory (actual business expense category) for folder organization
            const folderName = doc.subcategory || 'Other';
            
            if (!folders[folderName]) {
                folders[folderName] = [];
            }
            folders[folderName].push(doc);
        }
    });
    
    return folders;
};

const getCategoryIcon = (categoryName) => {
    const iconMap = {
        'Rent': ICONS.BUILDING,
        'Materials': ICONS.BOOK_OPEN,
        'Bills': ICONS.BOLT,
        'Salaries': ICONS.USERS,
        'Marketing': ICONS.BULLHORN,
        'Equipment': ICONS.TOOLS,
        'Insurance': ICONS.SHIELD,
        'Taxes': ICONS.CALCULATOR,
        'Travel': ICONS.CAR,
        'Other': ICONS.INFO
    };
    return iconMap[categoryName] || ICONS.DOCUMENTS;
};

const getCategoryColor = (categoryName) => {
    const colorMap = {
        'Rent': 'from-red-500 to-red-600',
        'Materials': 'from-blue-500 to-blue-600',
        'Bills': 'from-yellow-500 to-yellow-600',
        'Salaries': 'from-green-500 to-green-600',
        'Marketing': 'from-purple-500 to-purple-600',
        'Equipment': 'from-cyan-500 to-cyan-600',
        'Insurance': 'from-pink-500 to-pink-600',
        'Taxes': 'from-gray-500 to-gray-600',
        'Travel': 'from-orange-500 to-orange-600',
        'Other': 'from-gray-500 to-gray-600'
    };
    return colorMap[categoryName] || 'from-gray-500 to-gray-600';
};

// Document List Modal Component
const DocumentListModal = ({ isOpen, onClose, category, documents, onEditDocument, onDeleteDocument, folderName }) => {
    const { students } = useAppContext();
    
    const getCategoryTitle = () => {
        let baseTitle = '';
        switch (category) {
            case 'student': baseTitle = 'Student Documents'; break;
            case 'finance': baseTitle = 'Finance Documents'; break;
            case 'meb': baseTitle = 'MEB Documents'; break;
            default: baseTitle = 'Documents'; break;
        }
        
        // Add folder name if provided
        if (folderName) {
            return `${baseTitle} - ${folderName}`;
        }
        return baseTitle;
    };

    const getCategoryColor = () => {
        switch (category) {
            case 'student': return '#3B82F6';
            case 'finance': return '#10B981';
            case 'meb': return '#F59E0B';
            default: return '#6B7280';
        }
    };

    const getStudentName = (studentId) => {
        const student = students.find(s => s.id === studentId);
        return student ? student.fullName : 'Unknown Student';
    };

    const handleDownload = async (doc) => {
        try {
            // Fetch the file from the URL
            const response = await fetch(doc.url);
            if (!response.ok) {
                throw new Error('Failed to fetch file');
            }
            
            // Get the file blob
            const blob = await response.blob();
            
            // Create a download link
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = doc.name || 'document';
            
            // Trigger the download
            document.body.appendChild(link);
            link.click();
            
            // Clean up
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('Download failed:', error);
            // Fallback to direct link if fetch fails
            const link = document.createElement('a');
            link.href = doc.url;
            link.download = doc.name || 'document';
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={getCategoryTitle()}
            size="lg"
            headerStyle={{ backgroundColor: getCategoryColor() }}
        >
            <div className="space-y-4 max-h-96 overflow-y-auto">
                {documents.length > 0 ? (
                    <div className="space-y-4">
                        {documents.map(doc => {
                            const docColor = getDocumentColor(doc);
                            const docIcon = getDocumentIcon(doc);
                            const docTypeLabel = getDocumentTypeLabel(doc);
                            
                            return (
                                <div key={doc.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                                    {/* Document Header */}
                                    <div className="flex items-center p-3 border-b border-gray-100">
                                        <div 
                                            className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 flex-shrink-0 ${getDocumentColor(doc)}`}
                                        >
                                            <Icon path={getDocumentIcon(doc)} className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-gray-800 text-base truncate">{doc.name}</h4>
                                            <div className="flex items-center mt-1 flex-wrap gap-1">
                                                <span 
                                                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700"
                                                >
                                                    {getDocumentTypeLabel(doc)}
                                                </span>
                                                {doc.studentName && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700">
                                                        {doc.studentName}
                                                    </span>
                                                )}
                                                {doc.uploadDate && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                                                        {formatDate(doc.uploadDate)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Document Actions */}
                                    <div className="p-3 sm:p-4 bg-gray-50">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
                                            <div className="flex items-center space-x-2 sm:space-x-3">
                                                <a 
                                                    href={doc.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="inline-flex items-center px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                                    title="Preview Document"
                                                >
                                                    <Icon path={ICONS.EYE} className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                                    Preview
                                                </a>
                                                <button 
                                                    onClick={() => handleDownload(doc)} 
                                                    className="inline-flex items-center px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                                                    title="Download Document"
                                                >
                                                    <Icon path={ICONS.DOWNLOAD} className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                                    Download
                                                </button>
                                            </div>
                                            <div className="flex items-center space-x-1 sm:space-x-2">
                                                <button 
                                                    onClick={() => onEditDocument(doc)} 
                                                    disabled={doc.isTransactionDocument || doc.isStudentDocument}
                                                    className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                                                        doc.isTransactionDocument || doc.isStudentDocument
                                                            ? 'text-gray-400 cursor-not-allowed'
                                                            : 'text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50'
                                                    }`}
                                                    title={
                                                        doc.isTransactionDocument || doc.isStudentDocument
                                                            ? "Cannot edit - edit the original record instead"
                                                            : "Edit Document"
                                                    }
                                                >
                                                    <Icon path={ICONS.EDIT} className="w-3 h-3 sm:w-4 sm:h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => onDeleteDocument(doc)} 
                                                    disabled={doc.isTransactionDocument || doc.isStudentDocument}
                                                    className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                                                        doc.isTransactionDocument || doc.isStudentDocument
                                                            ? 'text-gray-400 cursor-not-allowed'
                                                            : 'text-red-600 hover:text-red-800 hover:bg-red-50'
                                                    }`}
                                                    title={
                                                        doc.isTransactionDocument || doc.isStudentDocument
                                                            ? "Cannot delete - delete the original record instead"
                                                            : "Delete Document"
                                                    }
                                                >
                                                    <Icon path={ICONS.DELETE} className="w-3 h-3 sm:w-4 sm:h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Icon path={ICONS.DOCUMENTS} className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
                        <p className="text-gray-500">There are no documents in this category.</p>
                    </div>
                )}
            </div>
        </Modal>
    );
};

// Folder Modal Component
const FolderModal = ({ isOpen, onClose, category, documents, onViewDocuments, onUploadDocument }) => {
    const getCategoryTitle = () => {
        switch (category) {
            case 'student': return 'Student Documents';
            case 'finance': return 'Finance Documents';
            case 'meb': return 'MEB Documents';
            default: return 'Documents';
        }
    };

    const getCategoryColor = () => {
        switch (category) {
            case 'student': return 'from-blue-500 to-blue-600';
            case 'finance': return 'from-green-500 to-green-600';
            case 'meb': return 'from-amber-500 to-amber-600';
            default: return 'from-purple-500 to-purple-600';
        }
    };

    const getCategoryIcon = () => {
        switch (category) {
            case 'student': return ICONS.USERS;
            case 'finance': return ICONS.MONEY_BILL_WAVE;
            case 'meb': return ICONS.BUILDING;
            default: return ICONS.DOCUMENTS;
        }
    };

    let folders = [];
    if (category === 'student') {
        const studentFolders = getStudentFolders(documents);
        folders = studentFolders.map(folder => ({
            name: folder.studentName,
            documents: folder.documents,
            icon: ICONS.USERS,
            color: 'from-blue-500 to-blue-600'
        }));
    } else if (category === 'finance') {
        const financeFolders = getFinanceFolders(documents);
        folders = Object.entries(financeFolders).map(([name, docs]) => ({
            name,
            documents: docs,
            icon: getCategoryIcon(name),
            color: getCategoryColor(name)
        }));
    } else if (category === 'meb') {
        // MEB documents are organized into "Received" and "Sent" folders
        const receivedDocs = documents.filter(doc => doc.type === 'received');
        const sentDocs = documents.filter(doc => doc.type === 'sent');
        
        folders = [
            {
                name: 'Received Documents',
                documents: receivedDocs,
                icon: ICONS.DOWNLOAD,
                color: 'from-green-500 to-green-600'
            },
            {
                name: 'Sent Documents',
                documents: sentDocs,
                icon: ICONS.UPLOAD,
                color: 'from-blue-500 to-blue-600'
            }
        ];
    }

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={
                <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getCategoryColor()} flex items-center justify-center mr-3`}>
                        <Icon path={getCategoryIcon()} className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg font-semibold">{getCategoryTitle()}</span>
                </div>
            }
        >
            <div className="space-y-4">
                {/* Category Description */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-sm text-gray-600">
                        {category === 'student' && 'Browse student documents organized by individual students'}
                        {category === 'finance' && 'Browse financial documents organized by expense categories'}
                        {category === 'meb' && 'Browse MEB (Ministry of Education) documents organized by type'}
                    </p>
                </div>

                {/* Folders Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {folders.map((folder, index) => (
                        <div 
                            key={folder.name || index}
                            className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 p-4 cursor-pointer group"
                            onClick={() => onViewDocuments(category, folder.documents, folder.name)}
                        >
                            <div className="flex items-center mb-3">
                                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${folder.color} flex items-center justify-center mr-3`}>
                                    <Icon path={folder.icon} className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-semibold text-gray-800 group-hover:text-blue-600 transition-colors truncate">
                                        {folder.name}
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        {folder.documents.length} document{folder.documents.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <div className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${folder.color ? folder.color.replace('from-', 'bg-').replace(' to-', '') : 'bg-gray-500'} text-white`}>
                                    <Icon path={ICONS.DOCUMENTS} className="w-3 h-3 mr-1" />
                                    {folder.documents.length} files
                                </div>
                                
                                {/* Upload button for MEB folders */}
                                {category === 'meb' && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const type = folder.name.includes('Received') ? 'received' : 'sent';
                                            onUploadDocument(category, type);
                                        }}
                                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                                    >
                                        <Icon path={ICONS.UPLOAD} className="w-3 h-3 mr-1" />
                                        Upload
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Modal>
    );
};

// Main Documents Module Component
const DocumentsModule = () => {
    const { documents, students, fetchData, transactions } = useAppContext();
    const { showNotification } = useNotification();
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [documentToEdit, setDocumentToEdit] = useState(null);
    const [uploadCategory, setUploadCategory] = useState('');
    const [uploadDocumentType, setUploadDocumentType] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedCategoryDocuments, setSelectedCategoryDocuments] = useState([]);
    const [selectedFolderName, setSelectedFolderName] = useState(null);
    const [documentToDelete, setDocumentToDelete] = useState(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [folderModalData, setFolderModalData] = useState({ category: null, documents: [] });

    // Process student documents from students table
    const processStudentDocuments = () => {
        const studentDocs = [];
        students.forEach(student => {
            try {
                const studentDocuments = typeof student.documents === 'string' ? JSON.parse(student.documents) : (student.documents || {});
                const studentDocumentNames = typeof student.documentNames === 'string' ? JSON.parse(student.documentNames) : (student.documentNames || {});

                // Add National ID if exists
                if (studentDocuments.nationalIdUrl) {
                    studentDocs.push({
                        id: `student-${student.id}-nationalId`,
                        name: studentDocumentNames.nationalId || `National ID - ${student.fullName}`,
                        type: 'nationalId',
                        category: 'student',
                        studentId: student.id,
                        description: `National ID document for ${student.fullName}`,
                        url: studentDocuments.nationalIdUrl,
                        uploadDate: student.createdAt ? new Date(student.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                        isStudentDocument: true,
                        studentName: student.fullName,
                        source: 'Student Enrollment'
                    });
                }

                // Add Agreement if exists
                if (studentDocuments.agreementUrl) {
                    studentDocs.push({
                        id: `student-${student.id}-agreement`,
                        name: studentDocumentNames.agreement || `Agreement - ${student.fullName}`,
                        type: 'agreement',
                        category: 'student',
                        studentId: student.id,
                        description: `Agreement document for ${student.fullName}`,
                        url: studentDocuments.agreementUrl,
                        uploadDate: student.createdAt ? new Date(student.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                        isStudentDocument: true,
                        studentName: student.fullName,
                        source: 'Student Enrollment'
                    });
                }
            } catch (error) {
                console.error('Error processing student documents for student:', student.id, error);
            }
        });
        return studentDocs;
    };

    // Process business expense documents from transactions table
    const processBusinessExpenseDocuments = () => {
        const expenseDocs = [];
        
        transactions.forEach(transaction => {
            try {
                // Check for business expenses with invoice files
                // Handle both 'type' and 'expenseType' fields, and both 'expense-business' and 'business' values
                const isBusinessExpense = (
                    (transaction.type === 'expense-business' || transaction.type === 'business') ||
                    (transaction.expenseType === 'expense-business' || transaction.expenseType === 'business')
                );
                
                if (isBusinessExpense && transaction.invoiceUrl) {
                    const student = students.find(s => s.id === transaction.studentId);
                    expenseDocs.push({
                        id: `transaction-${transaction.id}-invoice`,
                        name: transaction.invoiceName || `Invoice - ${transaction.description || 'Business Expense'}`,
                        type: 'invoice',
                        category: 'finance',
                        subcategory: transaction.category || 'Other', // Use the actual business category
                        studentId: transaction.studentId,
                        description: `Business expense invoice: ${transaction.description} (${transaction.amount} ₺)`,
                        url: transaction.invoiceUrl,
                        uploadDate: transaction.createdAt ? new Date(transaction.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                        isTransactionDocument: true,
                        studentName: student ? student.fullName : null,
                        source: 'Business Expense',
                        amount: transaction.amount,
                        transactionDate: transaction.transactionDate
                    });
                }
            } catch (error) {
                console.error('Error processing transaction documents for transaction:', transaction.id, error);
            }
        });
        
        return expenseDocs;
    };

    // Combine all documents from different sources
    const allDocuments = [
        ...documents, 
        ...processStudentDocuments(), 
        ...processBusinessExpenseDocuments()
    ];

    // Filter documents based on search query
    const filteredDocuments = allDocuments.filter(doc => {
        if (!searchQuery.trim()) return true;
        
        const query = searchQuery.toLowerCase();
        return (
            doc.name?.toLowerCase().includes(query) ||
            doc.description?.toLowerCase().includes(query) ||
            doc.studentName?.toLowerCase().includes(query) ||
            doc.type?.toLowerCase().includes(query) ||
            doc.category?.toLowerCase().includes(query)
        );
    });

    // Categorize documents
    const studentDocuments = filteredDocuments.filter(doc => doc.category === 'student');
    const financeDocuments = filteredDocuments.filter(doc => doc.category === 'finance');
    const mebDocuments = filteredDocuments.filter(doc => doc.category === 'meb');

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

    const handleUploadDocument = (category, type) => {
        setUploadCategory(category);
        setUploadDocumentType(type); // Set the document type
        setIsUploadModalOpen(true);
        setIsFolderModalOpen(false); // Close folder modal when opening upload modal
    };

    const handleOpenFolders = (category, documents) => {
        setFolderModalData({ category, documents });
        setIsFolderModalOpen(true);
    };

    const handleViewDocuments = (category, docs, folderName = null) => {
        setSelectedCategory(category);
        setSelectedCategoryDocuments(docs);
        setSelectedFolderName(folderName);
        setIsFolderModalOpen(false); // Close folder modal when opening document list
    };

    const handleEditDocument = (doc) => {
        setDocumentToEdit(doc);
        setIsEditModalOpen(true);
    };

    const handleDeleteDocument = (doc) => {
        // Check if this is a virtual document (generated from transactions or students)
        if (doc.isTransactionDocument || doc.isStudentDocument) {
            showNotification('This document cannot be deleted directly. Please delete the original record (business expense or student enrollment) instead.', 'info');
            return;
        }
        
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
            setSelectedFolderName(null);
        } catch (error) {
            console.error("Error deleting document:", error);
            showNotification('Failed to delete document.', 'error');
        } finally {
            setIsConfirmModalOpen(false);
            setDocumentToDelete(null);
        }
    };

    const totalDocuments = allDocuments.length;

    return (
        <div className="relative p-4 md:p-8 bg-gray-50 rounded-lg shadow-lg">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center pb-4 mb-6 border-b border-gray-200 space-y-4 lg:space-y-0">
                <h2 className="text-2xl lg:text-3xl font-bold text-gray-800 flex items-center">
                    <Icon path={ICONS.DOCUMENTS} className="w-6 h-6 lg:w-8 lg:h-8 mr-2 lg:mr-3" />
                    <span className="hidden sm:inline">Document Management</span>
                    <span className="sm:hidden">Documents</span>
                </h2>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon path={ICONS.SEARCH} className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search documents by name, student, type, or description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                            <Icon path={ICONS.CLOSE} className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        </button>
                    )}
                </div>
                {searchQuery && (
                    <div className="mt-2 text-sm text-gray-600">
                        Found {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''} matching "{searchQuery}"
                    </div>
                )}
            </div>

            {/* Search Results */}
            {searchQuery && filteredDocuments.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                        <Icon path={ICONS.SEARCH} className="w-4 h-4 mr-2 text-gray-600" />
                        Search Results
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredDocuments.map((doc, index) => (
                            <div 
                                key={`${doc.id || index}-${doc.name}`}
                                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 p-3 cursor-pointer group"
                                onClick={() => handleViewDocuments(doc.category || 'other', [doc], doc.name)}
                            >
                                <div className="flex items-start space-x-3">
                                    <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${getDocumentColor(doc)}`}>
                                        <Icon path={getDocumentIcon(doc)} className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                                            {doc.name}
                                        </h4>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {getDocumentTypeLabel(doc)}
                                        </p>
                                        {doc.studentName && (
                                            <p className="text-xs text-blue-600 mt-1 font-medium">
                                                {doc.studentName}
                                            </p>
                                        )}
                                        {doc.uploadDate && (
                                            <p className="text-xs text-gray-400 mt-1">
                                                {formatDate(doc.uploadDate)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Document Categories */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                        onOpenFolders={handleOpenFolders}
                    />
                ))}
            </div>

            {/* Modals */}
            <DocumentUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                category={uploadCategory}
                onUploadSuccess={() => setIsUploadModalOpen(false)}
                documentType={uploadDocumentType}
            />

            {selectedCategory && (
                <DocumentListModal
                    isOpen={!!selectedCategory}
                    onClose={() => {
                        setSelectedCategory(null);
                        setSelectedFolderName(null);
                    }}
                    category={selectedCategory}
                    documents={selectedCategoryDocuments}
                    onEditDocument={handleEditDocument}
                    onDeleteDocument={handleDeleteDocument}
                    folderName={selectedFolderName}
                />
            )}

            {folderModalData.category && (
                <FolderModal
                    isOpen={isFolderModalOpen}
                    onClose={() => setIsFolderModalOpen(false)}
                    category={folderModalData.category}
                    documents={folderModalData.documents}
                    onViewDocuments={handleViewDocuments}
                    onUploadDocument={handleUploadDocument}
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
