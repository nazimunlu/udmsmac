import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import apiClient from '../apiClient';
import { supabase } from '../supabaseClient';
import { useNotification } from '../contexts/NotificationContext';
import Modal from './Modal';
import { FormInput, FormSelect, FormSection } from './Form';
import CustomDatePicker from './CustomDatePicker';
import formatPhoneNumber from '../utils/formatPhoneNumber';
import { Icon, ICONS } from './Icons';
import { AppContext } from '../contexts/AppContext';
import { calculateLessonsWithinRange, generateInstallments } from '../utils/lessonCalculator';
import { sanitizeFileName } from '../utils/caseConverter';
import CustomTimePicker from './CustomTimePicker';

const StudentFormModal = ({ isOpen, onClose, studentToEdit }) => {
    const { showNotification } = useNotification();
    const { fetchData, settings } = useContext(AppContext);
    const [groups, setGroups] = useState([]);
    const [files, setFiles] = useState({ nationalId: null, agreement: null });


    const defaultPricePerLesson = useMemo(() => {
        return settings && settings.pricePerLesson ? parseFloat(settings.pricePerLesson) : 800;
    }, [settings]);

    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const groupsData = await apiClient.getAll('groups');
                setGroups(groupsData);
                
                // Check if the student being edited is assigned to an archived group
                if (studentToEdit && studentToEdit.groupId) {
                    const assignedGroup = groupsData.find(g => g.id === studentToEdit.groupId);
                    if (assignedGroup && assignedGroup.isArchived) {
                        showNotification('Warning: This student is currently assigned to an archived group. Please reassign to an active group.', 'warning');
                    }
                }
            } catch (error) {
                console.error('Error fetching groups:', error);
            }
        };
        if (isOpen) {
            fetchGroups();
        }
    }, [isOpen, studentToEdit, showNotification]);

    const getInitialFormData = useCallback(() => {
        const getSafeDateString = (dateSource) => {
            if (!dateSource) return '';
            try {
                return new Date(dateSource).toISOString().split('T')[0];
            } catch (e) {
                return '';
            }
        };

        const safeParse = (jsonString, defaultValue) => {
            if (typeof jsonString === 'string') {
                try {
                    return JSON.parse(jsonString);
                } catch (e) {
                    return defaultValue;
                }
            }
            return jsonString || defaultValue;
        };
        
        const studentTutoringDetails = safeParse(studentToEdit?.tutoringDetails, {});

        const defaultTutoringDetails = {
            pricePerLesson: studentTutoringDetails.pricePerLesson || defaultPricePerLesson,
            totalCalculatedFee: studentTutoringDetails.totalCalculatedFee || 0,
            numberOfLessons: studentTutoringDetails.numberOfLessons || 0,
            endDate: studentTutoringDetails.endDate || '',
            schedule: { 
                days: [], 
                ...studentTutoringDetails.schedule
            },
            installmentFrequency: studentTutoringDetails.installmentFrequency || 'monthly'
        };

        if (studentToEdit) {
        return {
                fullName: studentToEdit?.fullName || '',
                studentContact: studentToEdit?.studentContact || '',
                parentName: studentToEdit?.parentName || '',
                parentContact: studentToEdit?.parentContact || '',
                nationalId: studentToEdit?.nationalId || '',
                enrollmentDate: getSafeDateString(studentToEdit?.enrollmentDate) || new Date().toISOString().split('T')[0],
                birthDate: getSafeDateString(studentToEdit?.birthDate) || '',
            isTutoring: studentToEdit?.isTutoring || false,
                groupId: studentToEdit?.groupId || null,
                color: studentToEdit?.color || '#3B82F6',
            documents: safeParse(studentToEdit?.documents, { nationalIdUrl: '', agreementUrl: '' }),
                documentNames: safeParse(studentToEdit?.documentNames, { nationalId: '', agreement: '' }),
                feeDetails: safeParse(studentToEdit?.feeDetails, { totalFee: '12000', numberOfInstallments: '3' }),
            tutoringDetails: defaultTutoringDetails,
            installments: safeParse(studentToEdit?.installments, []),
            };
        } else {
            return {
                fullName: '',
                studentContact: '',
                parentName: '',
                parentContact: '',
                nationalId: '',
                enrollmentDate: new Date().toISOString().split('T')[0],
                birthDate: '',
                isTutoring: false,
                groupId: null,
                color: '#3B82F6',
                documents: { nationalIdUrl: '', agreementUrl: '' },
                documentNames: { nationalId: '', agreement: '' },
                feeDetails: { totalFee: '12000', numberOfInstallments: '3' },
                tutoringDetails: defaultTutoringDetails,
                installments: [],
            };
        }
    }, [studentToEdit, defaultPricePerLesson]);

    const [formData, setFormData] = useState(getInitialFormData());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitProgress, setSubmitProgress] = useState('');

    useEffect(() => {
        if (isOpen) {
            setFormData(getInitialFormData());
            setFiles({ nationalId: null, agreement: null });
        }
    }, [isOpen, getInitialFormData]);

    useEffect(() => {
        if (formData.isTutoring) {
            const { schedule, endDate, pricePerLesson } = formData.tutoringDetails;
            const { enrollmentDate } = formData;
            const lessons = calculateLessonsWithinRange(enrollmentDate, endDate, schedule.days);
            const totalFee = lessons * (parseFloat(pricePerLesson) || 0);

            setFormData(prev => ({
                ...prev,
                tutoringDetails: {
                    ...prev.tutoringDetails,
                    numberOfLessons: lessons,
                    totalCalculatedFee: totalFee
                }
            }));
        }
    }, [
        formData.isTutoring, 
        formData.enrollmentDate, 
        formData.tutoringDetails.endDate, 
        formData.tutoringDetails.schedule.days,
        formData.tutoringDetails.pricePerLesson
    ]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name === 'studentContact' || name === 'parentContact') {
            setFormData(prev => ({ ...prev, [name]: formatPhoneNumber(value) }));
        } else if (name === 'isTutoring') {
             setFormData(prev => ({ ...prev, [name]: checked }));
        }
        else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleFeeChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, feeDetails: { ...prev.feeDetails, [name]: value } }));
    };

    const handleTutoringChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, tutoringDetails: { ...prev.tutoringDetails, [name]: value } }));
    };

    const handleTutoringScheduleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            tutoringDetails: {
                ...prev.tutoringDetails,
                schedule: {
                    ...prev.tutoringDetails.schedule,
                    [name]: value
                }
            }
        }));
    };

    const toggleScheduleDay = (day) => {
        const currentDays = formData.tutoringDetails.schedule.days;
        const newDays = currentDays.includes(day)
            ? currentDays.filter(d => d !== day)
            : [...currentDays, day];
        setFormData(prev => ({ ...prev, tutoringDetails: { ...prev.tutoringDetails, schedule: { ...prev.tutoringDetails.schedule, days: newDays } } }));
    };

    const handleFileChange = (e, name) => {
        const selectedFiles = e.target.files;
        if (selectedFiles && selectedFiles.length > 0) {
            setFiles(prev => ({
                ...prev,
                [name]: selectedFiles[0]
            }));
        }
    };

    const uploadFile = async (file, path) => {
        try {
            const { error: uploadError } = await supabase.storage
                .from('udms')
                .upload(path, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data: urlData } = supabase.storage
                .from('udms')
                .getPublicUrl(path);

            return urlData.publicUrl;
        } catch (error) {
            throw error;
        }
    };

    const generateFileName = (studentName, documentType, originalFileName) => {
        const sanitizedName = sanitizeFileName(studentName);
        const fileExtension = originalFileName.split('.').pop().toLowerCase();
        
        switch (documentType) {
            case 'nationalId':
                return `${sanitizedName}_National_ID.${fileExtension}`;
            case 'agreement':
                return `${sanitizedName}_Agreement.${fileExtension}`;
            default:
                return `${sanitizedName}_${documentType}.${fileExtension}`;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitProgress('Validating form data...');

        try {
            // Validate required fields
            if (!formData.fullName.trim()) {
                showNotification('Full name is required.', 'error');
            setIsSubmitting(false);
                setSubmitProgress('');
            return;
        }

            if (!formData.studentContact.trim()) {
                showNotification('Phone number is required.', 'error');
                setIsSubmitting(false);
                setSubmitProgress('');
                return;
            }

            if (!formData.nationalId.trim()) {
                showNotification('National ID is required.', 'error');
                setIsSubmitting(false);
                setSubmitProgress('');
                return;
            }

            // Validate files if they exist
            if (files.nationalId && files.nationalId.size > 10 * 1024 * 1024) {
                showNotification('National ID file size must be less than 10MB.', 'error');
                setIsSubmitting(false);
                setSubmitProgress('');
                return;
            }

            if (files.agreement && files.agreement.size > 10 * 1024 * 1024) {
                showNotification('Agreement file size must be less than 10MB.', 'error');
                setIsSubmitting(false);
                setSubmitProgress('');
                return;
            }

            // Upload files with automatic naming (parallel uploads for speed)
            let nationalIdUrl = '';
            let agreementUrl = '';

            // Upload files in parallel for better performance
            const uploadPromises = [];

            if (files.nationalId) {
                const nationalIdFileName = generateFileName(formData.fullName, 'nationalId', files.nationalId.name);
                const timestamp = Date.now();
                const nationalIdPath = `students/${timestamp}_${nationalIdFileName}`;
                
                uploadPromises.push(
                    uploadFile(files.nationalId, nationalIdPath)
                        .then(url => {
                            return { type: 'nationalId', url };
                        })
                );
            }

            if (files.agreement) {
                const agreementFileName = generateFileName(formData.fullName, 'agreement', files.agreement.name);
                const timestamp = Date.now();
                const agreementPath = `students/${timestamp}_${agreementFileName}`;
                
                uploadPromises.push(
                    uploadFile(files.agreement, agreementPath)
                        .then(url => {
                            return { type: 'agreement', url };
                        })
                );
            }

            // Wait for all uploads to complete
            if (uploadPromises.length > 0) {
                setSubmitProgress(`Uploading ${uploadPromises.length} file${uploadPromises.length > 1 ? 's' : ''}...`);
                const uploadResults = await Promise.all(uploadPromises);
                
                // Process results
                uploadResults.forEach(result => {
                    if (result.type === 'nationalId') {
                        nationalIdUrl = result.url;
                    } else if (result.type === 'agreement') {
                        agreementUrl = result.url;
                    }
                });
            }

            // Prepare data to save
            setSubmitProgress('Saving student data...');
            
            // Generate installments for group students
            let finalInstallments = formData.installments;
            let finalFeeDetails = formData.feeDetails;
            
            if (!formData.isTutoring && formData.feeDetails.totalFee && formData.feeDetails.numberOfInstallments) {
                // If editing and student already has installments, preserve them
                if (studentToEdit && formData.installments && formData.installments.length > 0) {
                    finalInstallments = formData.installments;
                } else {
                    // Generate new installments for new enrollments
                    const totalFee = parseFloat(formData.feeDetails.totalFee);
                    const numberOfInstallments = parseInt(formData.feeDetails.numberOfInstallments);
                    const installmentAmount = totalFee / numberOfInstallments;
                    
                    finalInstallments = Array.from({ length: numberOfInstallments }, (_, index) => {
                        const installmentDate = new Date(formData.enrollmentDate);
                        installmentDate.setMonth(installmentDate.getMonth() + index);
                        
                        return {
                            number: index + 1,
                            amount: installmentAmount,
                            dueDate: installmentDate.toISOString().split('T')[0],
                            status: 'Unpaid',
                            paidDate: null
                        };
                    });
                }
            } else if (formData.isTutoring) {
                // Generate installments for tutoring students based on their schedule and payment frequency
                const installments = generateInstallments(
                    parseFloat(formData.tutoringDetails.pricePerLesson),
                    formData.enrollmentDate,
                    formData.tutoringDetails.endDate,
                    formData.tutoringDetails.installmentFrequency,
                    formData.tutoringDetails.schedule.days
                );
                finalInstallments = installments;
                // Update fee details to reflect tutoring structure
                finalFeeDetails = {
                    totalFee: formData.tutoringDetails.totalCalculatedFee.toString(),
                    numberOfInstallments: installments.length.toString()
                };
            }
            
            const dataToSave = {
                ...formData,
                // Filter out empty date strings to prevent database errors
                enrollmentDate: formData.enrollmentDate || null,
                birthDate: formData.birthDate || null,
                feeDetails: JSON.stringify(finalFeeDetails),
                installments: JSON.stringify(finalInstallments),
                documents: JSON.stringify({
                    nationalIdUrl,
                    agreementUrl
                }),
                documentNames: JSON.stringify({
                    nationalId: files.nationalId ? generateFileName(formData.fullName, 'nationalId', files.nationalId.name) : '',
                    agreement: files.agreement ? generateFileName(formData.fullName, 'agreement', files.agreement.name) : ''
                })
            };

            if (studentToEdit) {
                await apiClient.update('students', studentToEdit.id, dataToSave);
                showNotification('Student updated successfully!', 'success');
                onClose();
            } else {
                const result = await apiClient.create('students', dataToSave);
                showNotification('Student enrolled successfully!', 'success');
                onClose();
            }

            fetchData();
        } catch (error) {
            console.error('File upload error details:', error);
            console.error('Error message:', error.message);
            console.error('Error code:', error.code);
            showNotification(`Enrollment failed: ${error.message}`, 'error');
        } finally {
            setIsSubmitting(false);
            setSubmitProgress('');
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={studentToEdit ? "Edit Student" : "Enroll New Student"}
            headerStyle={{ backgroundColor: '#4F46E5' }}
        >
            <form onSubmit={handleSubmit}>
                <FormSection title="General Information">
                    <div className="sm:col-span-6"><FormInput label="Full Name" name="fullName" value={formData.fullName} onChange={handleChange} required /></div>
                    <div className="sm:col-span-6"><FormInput label="National ID" name="nationalId" value={formData.nationalId} onChange={handleChange} required /></div>
                    <div className="sm:col-span-3"><FormInput label="Student Contact" name="studentContact" type="tel" value={formData.studentContact} onChange={handleChange} required /></div>
                    <div className="sm:col-span-3"><FormInput label="Parent Name (Optional)" name="parentName" value={formData.parentName} onChange={handleChange} /></div>
                    <div className="sm:col-span-3"><FormInput label="Parent Contact (Optional)" name="parentContact" type="tel" value={formData.parentContact} onChange={handleChange} /></div>
                    <div className="sm:col-span-3">
                        <CustomDatePicker label="Enrollment Date" name="enrollmentDate" value={formData.enrollmentDate} onChange={handleChange} />
                    </div>
                    <div className="sm:col-span-3"><CustomDatePicker label="Birth Date (Optional)" name="birthDate" value={formData.birthDate} onChange={handleChange} /></div>
                    <div className="sm:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Student Color</label>
                        <div className="flex items-center space-x-3">
                            <div className="relative">
                                <input
                                    type="color"
                                    name="color"
                                    value={formData.color}
                                    onChange={handleChange}
                                    className="w-12 h-12 rounded-xl border-2 border-gray-200 cursor-pointer shadow-sm hover:shadow-md transition-shadow duration-200"
                                    title="Choose student color"
                                />
                                <div 
                                    className="absolute inset-0 rounded-xl border-2 border-white shadow-inner pointer-events-none"
                                    style={{ backgroundColor: formData.color }}
                                ></div>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                    <div 
                                        className="w-4 h-4 rounded-full border border-gray-300"
                                        style={{ backgroundColor: formData.color }}
                                    ></div>
                                    <span className="text-sm font-medium text-gray-900">{formData.color.toUpperCase()}</span>
                                </div>
                                <p className="text-xs text-gray-500">For calendar and dashboard display</p>
                            </div>
                        </div>
                    </div>
                    <div className="sm:col-span-6 flex items-center justify-end pt-5">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" name="isTutoring" checked={formData.isTutoring} onChange={handleChange} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            <span className="ml-3 text-sm font-medium text-gray-900">Is Tutoring Student?</span>
                        </label>
                    </div>
                </FormSection>

                {formData.isTutoring ? (
                    <FormSection title="Tutoring Details">
                        <div className="sm:col-span-3"><CustomDatePicker label="End Date" name="endDate" value={formData.tutoringDetails.endDate} onChange={handleTutoringChange} /></div>
                        <div className="sm:col-span-3">
                            <FormInput 
                                label="Price Per Lesson (₺)" 
                                name="pricePerLesson" 
                                type="number" 
                                value={formData.tutoringDetails.pricePerLesson} 
                                onChange={handleTutoringChange} 
                            />
                        </div>
                        <div className="sm:col-span-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Recurring Schedule</label>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <button type="button" key={day} onClick={() => toggleScheduleDay(day)} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${formData.tutoringDetails.schedule.days.includes(day) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                                        {day}
                                    </button>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <CustomTimePicker 
                                    label="Start Time" 
                                    name="startTime" 
                                    value={formData.tutoringDetails.schedule.startTime} 
                                    onChange={handleTutoringScheduleChange} 
                                />
                                <CustomTimePicker 
                                    label="End Time" 
                                    name="endTime" 
                                    value={formData.tutoringDetails.schedule.endTime} 
                                    onChange={handleTutoringScheduleChange} 
                                />
                            </div>
                        </div>
                        <div className="sm:col-span-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Installment Frequency</label>
                            <div className="grid grid-cols-3 gap-3">
                                <label className={`flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                    formData.tutoringDetails.installmentFrequency === 'daily' 
                                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}>
                                    <input 
                                        type="radio" 
                                        name="installmentFrequency" 
                                        value="daily" 
                                        checked={formData.tutoringDetails.installmentFrequency === 'daily'} 
                                        onChange={handleTutoringChange} 
                                        className="sr-only" 
                                    />
                                    <div className="text-center">
                                        <div className="font-medium">Daily</div>
                                        <div className="text-xs text-gray-500">Every day</div>
                                    </div>
                                </label>
                                <label className={`flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                    formData.tutoringDetails.installmentFrequency === 'weekly' 
                                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}>
                                    <input 
                                        type="radio" 
                                        name="installmentFrequency" 
                                        value="weekly" 
                                        checked={formData.tutoringDetails.installmentFrequency === 'weekly'} 
                                        onChange={handleTutoringChange} 
                                        className="sr-only" 
                                    />
                                    <div className="text-center">
                                        <div className="font-medium">Weekly</div>
                                        <div className="text-xs text-gray-500">Every week</div>
                                    </div>
                                </label>
                                <label className={`flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                    formData.tutoringDetails.installmentFrequency === 'monthly' 
                                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}>
                                    <input 
                                        type="radio" 
                                        name="installmentFrequency" 
                                        value="monthly" 
                                        checked={formData.tutoringDetails.installmentFrequency === 'monthly'} 
                                        onChange={handleTutoringChange} 
                                        className="sr-only" 
                                    />
                                    <div className="text-center">
                                        <div className="font-medium">Monthly</div>
                                        <div className="text-xs text-gray-500">Every month</div>
                                    </div>
                                </label>
                            </div>
                        </div>
                        <div className="sm:col-span-6 mt-6">
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-lg font-bold text-gray-800 flex items-center">
                                        <Icon path={ICONS.CALCULATOR} className="w-5 h-5 mr-2 text-blue-600" />
                                        Calculated Plan
                                    </h4>
                                    <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                        Auto-calculated
                                    </div>
                                </div>
                                
                                {/* Main Stats Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    <div className="bg-white rounded-lg p-3 border border-blue-100 shadow-sm">
                                        <div className="text-center">
                                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Lessons</p>
                                            <p className="text-lg font-bold text-blue-600">{formData.tutoringDetails.numberOfLessons}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white rounded-lg p-3 border border-green-100 shadow-sm">
                                        <div className="text-center">
                                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Fee</p>
                                            <p className="text-lg font-bold text-green-600">{Math.round(formData.tutoringDetails.totalCalculatedFee || 0)} ₺</p>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white rounded-lg p-3 border border-purple-100 shadow-sm">
                                        <div className="text-center">
                                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Per Lesson</p>
                                            <p className="text-lg font-bold text-purple-600">{Math.round(parseFloat(formData.tutoringDetails.pricePerLesson || 0))} ₺</p>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white rounded-lg p-3 border border-orange-100 shadow-sm">
                                        <div className="text-center">
                                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Weekly</p>
                                            <p className="text-lg font-bold text-orange-600">{formData.tutoringDetails.schedule.days.length} days</p>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Installment Summary */}
                                {formData.tutoringDetails.schedule.days.length > 0 && formData.tutoringDetails.pricePerLesson > 0 && (
                                    <div className="bg-white rounded-lg p-3 border border-indigo-100 shadow-sm mb-6">
                                        <div className="text-center">
                                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Installment Plan</p>
                                            <p className="text-base font-bold text-indigo-600 capitalize mb-2">
                                                {formData.tutoringDetails.installmentFrequency} Payments
                                            </p>
                                            <p className="text-xs text-gray-600">
                                                {(() => {
                                                    const installments = generateInstallments(
                                                        parseFloat(formData.tutoringDetails.pricePerLesson),
                                                        formData.enrollmentDate,
                                                        formData.tutoringDetails.endDate,
                                                        formData.tutoringDetails.installmentFrequency,
                                                        formData.tutoringDetails.schedule.days
                                                    );
                                                    const frequencyText = formData.tutoringDetails.installmentFrequency === 'weekly' 
                                                        ? `every ${new Date(installments[0]?.dueDate).toLocaleDateString('en-GB', { weekday: 'long' })}`
                                                        : formData.tutoringDetails.installmentFrequency;
                                                    return `${installments.length} installments of ${Math.round(installments[0]?.amount || 0)} ₺ ${frequencyText}`;
                                                })()}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Detailed Breakdown */}
                                <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
                                    <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                                        <Icon path={ICONS.INFO} className="w-4 h-4 mr-2 text-gray-500" />
                                        Calculation Breakdown
                                    </h5>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-gray-600">Enrollment Date:</span>
                                            <span className="font-medium text-gray-800">{formData.enrollmentDate ? new Date(formData.enrollmentDate).toLocaleDateString('en-GB') : 'Not set'}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-gray-600">End Date:</span>
                                            <span className="font-medium text-gray-800">{formData.tutoringDetails.endDate ? new Date(formData.tutoringDetails.endDate).toLocaleDateString('en-GB') : 'Not set'}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-gray-600">Schedule:</span>
                                            <span className="font-medium text-gray-800">
                                                {formData.tutoringDetails.schedule.days.length > 0 
                                                    ? `${formData.tutoringDetails.schedule.days.join(', ')} (${formData.tutoringDetails.schedule.startTime || '09:00'} - ${formData.tutoringDetails.schedule.endTime || '10:00'})`
                                                    : 'No days selected'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-gray-600">Duration:</span>
                                            <span className="font-medium text-gray-800">
                                                {formData.enrollmentDate && formData.tutoringDetails.endDate 
                                                    ? `${Math.ceil((new Date(formData.tutoringDetails.endDate) - new Date(formData.enrollmentDate)) / (1000 * 60 * 60 * 24 * 7))} weeks`
                                                    : 'Not calculated'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Monthly Installment Preview */}
                                {formData.tutoringDetails.schedule.days.length > 0 && formData.tutoringDetails.pricePerLesson > 0 && (
                                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                                        <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                                            <Icon path={ICONS.CREDIT_CARD} className="w-4 h-4 mr-2 text-green-600" />
                                            {formData.tutoringDetails.installmentFrequency.charAt(0).toUpperCase() + formData.tutoringDetails.installmentFrequency.slice(1)} Installment Preview
                                        </h5>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {(() => {
                                                const installments = generateInstallments(
                                                    parseFloat(formData.tutoringDetails.pricePerLesson),
                                                    formData.enrollmentDate,
                                                    formData.tutoringDetails.endDate,
                                                    formData.tutoringDetails.installmentFrequency,
                                                    formData.tutoringDetails.schedule.days
                                                );
                                                return installments.slice(0, 6).map((inst, index) => (
                                                    <div key={index} className="bg-white rounded-md p-3 border border-green-100">
                                                        <div className="text-xs text-gray-500 capitalize">
                                                            {formData.tutoringDetails.installmentFrequency === 'weekly' 
                                                                ? `${new Date(inst.dueDate).toLocaleDateString('en-GB', { weekday: 'short' })} ${inst.number}`
                                                                : `${formData.tutoringDetails.installmentFrequency} ${inst.number}`
                                                            }
                                                        </div>
                                                        <div className="text-sm font-semibold text-green-700">{Math.round(inst.amount)} ₺</div>
                                                        <div className="text-xs text-gray-400">{new Date(inst.dueDate).toLocaleDateString('en-GB')}</div>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                        {(() => {
                                            const totalInstallments = generateInstallments(
                                                parseFloat(formData.tutoringDetails.pricePerLesson),
                                                formData.enrollmentDate,
                                                formData.tutoringDetails.endDate,
                                                formData.tutoringDetails.installmentFrequency,
                                                formData.tutoringDetails.schedule.days
                                            ).length;
                                            if (totalInstallments > 6) {
                                                return (
                                                    <div className="text-xs text-gray-500 mt-2 text-center">
                                                        +{totalInstallments - 6} more {formData.tutoringDetails.installmentFrequency} installments
                                                    </div>
                                                );
                                            }
                                        })()}
                                    </div>
                                )}
                                
                                {/* Validation Messages */}
                                <div className="mt-4 space-y-2">
                                    {!formData.tutoringDetails.endDate && (
                                        <div className="flex items-center text-amber-600 bg-amber-50 rounded-md p-3">
                                            <Icon path={ICONS.WARNING} className="w-4 h-4 mr-2" />
                                            <span className="text-sm">Please set an end date to calculate the plan</span>
                                        </div>
                                    )}
                                    {formData.tutoringDetails.schedule.days.length === 0 && (
                                        <div className="flex items-center text-amber-600 bg-amber-50 rounded-md p-3">
                                            <Icon path={ICONS.WARNING} className="w-4 h-4 mr-2" />
                                            <span className="text-sm">Please select at least one day for the schedule</span>
                                        </div>
                                    )}
                                    {formData.tutoringDetails.pricePerLesson <= 0 && (
                                        <div className="flex items-center text-amber-600 bg-amber-50 rounded-md p-3">
                                            <Icon path={ICONS.WARNING} className="w-4 h-4 mr-2" />
                                            <span className="text-sm">Please set a price per lesson</span>
                                        </div>
                                    )}
                                    {formData.tutoringDetails.numberOfLessons > 0 && formData.tutoringDetails.totalCalculatedFee > 0 && (
                                        <div className="flex items-center text-green-600 bg-green-50 rounded-md p-3">
                                            <Icon path={ICONS.CHECK} className="w-4 h-4 mr-2" />
                                            <span className="text-sm">Plan calculated successfully! Ready to enroll.</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </FormSection>
                ) : (
                    <>
                        <FormSection title="Group & Financial Details">
                            <div className="sm:col-span-6">
                                <FormSelect label="Assign to Group" name="groupId" value={formData.groupId || ''} onChange={handleChange}>
                                    <option value="">Select a group</option>
                                    {groups.filter(g => !g.isArchived).map(group => <option key={group.id} value={group.id}>{group.groupName}</option>)}
                                </FormSelect>
                                {groups.filter(g => !g.isArchived).length === 0 && (
                                    <p className="text-sm text-amber-600 mt-1">No active groups available. Please create a group first.</p>
                                )}
                                {studentToEdit && studentToEdit.groupId && groups.find(g => g.id === studentToEdit.groupId)?.isArchived && (
                                    <p className="text-sm text-red-600 mt-1">⚠️ This student is currently assigned to an archived group. Please select an active group above.</p>
                                )}
                            </div>
                            <div className="sm:col-span-3"><FormInput label="Total Fee (₺)" name="totalFee" type="number" value={formData.feeDetails.totalFee} onChange={handleFeeChange} /></div>
                            <div className="sm:col-span-3"><FormInput label="Number of Installments" name="numberOfInstallments" type="number" value={formData.feeDetails.numberOfInstallments} onChange={handleFeeChange} /></div>
                        </FormSection>
                        <FormSection title="Document Uploads">
                            <div className="sm:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">National ID</label>
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                                    <div className="space-y-1 text-center w-full">
                                        <Icon path={ICONS.UPLOAD} className="mx-auto h-12 w-12 text-gray-400" />
                                        <div className="flex text-sm text-gray-600 justify-center">
                                            <label htmlFor="nationalId" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                                                <span>{files.nationalId ? files.nationalId.name : (formData.documentNames?.nationalId || 'Upload a file')}</span>
                                                <input id="nationalId" name="nationalId" type="file" className="sr-only" onChange={(e) => handleFileChange(e, 'nationalId')} />
                                            </label>
                                            {!files.nationalId && !formData.documentNames?.nationalId && <p className="pl-1">or drag and drop</p>}
                                        </div>
                                        <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                                    </div>
                                </div>
                            </div>
                            <div className="sm:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Agreement</label>
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                                    <div className="space-y-1 text-center w-full">
                                        <Icon path={ICONS.UPLOAD} className="mx-auto h-12 w-12 text-gray-400" />
                                        <div className="flex text-sm text-gray-600 justify-center">
                                            <label htmlFor="agreement" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                                                <span>{files.agreement ? files.agreement.name : (formData.documentNames?.agreement || 'Upload a file')}</span>
                                                <input id="agreement" name="agreement" type="file" className="sr-only" onChange={(e) => handleFileChange(e, 'agreement')} />
                                            </label>
                                            {!files.agreement && !formData.documentNames?.agreement && <p className="pl-1">or drag and drop</p>}
                                        </div>
                                        <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                                    </div>
                                </div>
                            </div>
                        </FormSection>
                    </>
                )}
                <div className="flex justify-end pt-8 mt-8 border-t border-gray-200 space-x-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center space-x-2">
                        {isSubmitting && <Icon path={ICONS.LOADING} className="w-4 h-4 animate-spin" />}
                        <span>
                            {isSubmitting ? (submitProgress || 'Saving...') : (studentToEdit ? 'Save Changes' : 'Enroll Student')}
                        </span>
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default StudentFormModal;
