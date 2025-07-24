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
            } catch (error) {
                console.error('Error fetching groups:', error);
            }
        };
        if (isOpen) {
            fetchGroups();
        }
    }, [isOpen]);

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
                enrollmentDate: getSafeDateString(studentToEdit?.enrollmentDate) || new Date().toISOString().split('T')[0],
                birthDate: getSafeDateString(studentToEdit?.birthDate) || '',
            isTutoring: studentToEdit?.isTutoring || false,
                groupId: studentToEdit?.groupId || null,
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
                enrollmentDate: new Date().toISOString().split('T')[0],
                birthDate: '',
                isTutoring: false,
                groupId: null,
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

    const handleFileChange = (e) => {
        const { name, files: selectedFiles } = e.target;
        if (selectedFiles[0]) {
            setFiles(prev => ({ ...prev, [name]: selectedFiles[0] }));
        }
    };

    const uploadFile = async (file, path) => {
        if (!file) return null;
        const { data, error } = await supabase.storage.from('udms').upload(path, file, { upsert: true });
        if (error) throw error;
        return supabase.storage.from('udms').getPublicUrl(path).data.publicUrl;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        if (!formData.isTutoring && (!files.nationalId && !studentToEdit?.documents?.nationalIdUrl || !files.agreement && !studentToEdit?.documents?.agreementUrl)) {
            showNotification('National ID and Agreement are mandatory for group students. Please try uploading the files again.', 'error');
            setIsSubmitting(false);
            return;
        }

        let dataToSave = { ...formData };

        let feeStructureChanged = !studentToEdit;
        if (studentToEdit) {
            const isTutoringChanged = studentToEdit.isTutoring !== formData.isTutoring;
            if (isTutoringChanged) {
                feeStructureChanged = true;
            } else if (formData.isTutoring) {
                const originalTutoring = studentToEdit.tutoringDetails || {};
                const currentTutoring = formData.tutoringDetails;
                const originalSchedule = originalTutoring.schedule || {};
                const currentSchedule = currentTutoring.schedule || {};
                if (
                    studentToEdit.enrollmentDate !== formData.enrollmentDate ||
                    originalTutoring.endDate !== currentTutoring.endDate ||
                    JSON.stringify(originalSchedule.days || []) !== JSON.stringify(currentSchedule.days || []) ||
                    parseFloat(originalTutoring.pricePerLesson) !== parseFloat(currentTutoring.pricePerLesson) ||
                    currentTutoring.installmentFrequency !== originalTutoring.installmentFrequency ||
                    parseFloat(currentTutoring.installmentAmount) !== parseFloat(originalTutoring.installmentAmount)
                ) {
                    feeStructureChanged = true;
                }
            } else {
                if (
                    String(studentToEdit.feeDetails?.totalFee || '') !== formData.feeDetails.totalFee ||
                    String(studentToEdit.feeDetails?.numberOfInstallments || '') !== formData.feeDetails.numberOfInstallments ||
                    studentToEdit.enrollmentDate !== formData.enrollmentDate
                ) {
                    feeStructureChanged = true;
                }
            }
        }

        if (feeStructureChanged) {
            if (dataToSave.isTutoring) {
                dataToSave.installments = generateInstallments(
                    parseFloat(dataToSave.tutoringDetails.pricePerLesson),
                    dataToSave.enrollmentDate,
                    dataToSave.tutoringDetails.endDate,
                    dataToSave.tutoringDetails.installmentFrequency,
                    dataToSave.tutoringDetails.schedule.days
                );
            } else {
                const totalFee = parseFloat(dataToSave.feeDetails.totalFee) || 0;
                const numInstallments = parseInt(dataToSave.feeDetails.numberOfInstallments, 10) || 1;
                const installmentAmount = totalFee > 0 && numInstallments > 0 ? totalFee / numInstallments : 0;
                const startDate = new Date(dataToSave.enrollmentDate.replace(/-/g, '/'));
                
                dataToSave.installments = Array.from({ length: numInstallments }, (_, i) => {
                    const dueDate = new Date(startDate);
                    dueDate.setMonth(startDate.getMonth() + i);
                    return {
                        number: i + 1,
                        amount: installmentAmount,
                        dueDate: dueDate.toISOString().split('T')[0],
                        status: 'Unpaid'
                    };
                });
            }
        }

        // Stringify JSON fields before saving
        dataToSave.feeDetails = JSON.stringify(dataToSave.feeDetails);
        dataToSave.installments = JSON.stringify(dataToSave.installments);
        dataToSave.documents = JSON.stringify(dataToSave.documents);
        dataToSave.documentNames = JSON.stringify(dataToSave.documentNames);
        dataToSave.tutoringDetails = JSON.stringify(dataToSave.tutoringDetails);

        // Ensure all required fields are present
        if (!dataToSave.fullName) {
            showNotification('Full name is required.', 'error');
            setIsSubmitting(false);
            return;
        }

        // Add created_at if it's a new student
        if (!studentToEdit) {
            dataToSave.createdAt = new Date().toISOString();
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                showNotification('You must be logged in to perform this action.', 'error');
                setIsSubmitting(false);
                return;
            }
            const userId = user.id;

            const sanitizedFullName = sanitizeFileName(dataToSave.fullName);
            const nationalIdFileName = files.nationalId ? sanitizeFileName(files.nationalId.name) : `${Date.now()}.pdf`;
            const agreementFileName = files.agreement ? sanitizeFileName(files.agreement.name) : `${Date.now()}.pdf`;
            const nationalIdPath = `students/${userId}/nationalId_${Date.now()}.pdf`;
            const agreementPath = `students/${userId}/agreement_${Date.now()}.pdf`;

            if (files.nationalId) {
                try {
                const nationalIdUrl = await uploadFile(files.nationalId, nationalIdPath);
                let docs = JSON.parse(dataToSave.documents);
                docs.nationalIdUrl = nationalIdUrl;
                dataToSave.documents = JSON.stringify(docs);
                } catch (uploadError) {
                    console.error("File upload error details:", uploadError);
                    console.error("Error message:", uploadError.message);
                    console.error("Error code:", uploadError.code);
                    showNotification('File upload failed, but continuing with student save.', 'warning');
                }
            }

            if (files.agreement) {
                try {
                const agreementUrl = await uploadFile(files.agreement, agreementPath);
                let docs = JSON.parse(dataToSave.documents);
                docs.agreementUrl = agreementUrl;
                dataToSave.documents = JSON.stringify(docs);
                } catch (uploadError) {
                    console.error("File upload error details:", uploadError);
                    console.error("Error message:", uploadError.message);
                    console.error("Error code:", uploadError.code);
                    showNotification('File upload failed, but continuing with student save.', 'warning');
                }
            }

            if (studentToEdit) {
                try {
                    await apiClient.update('students', studentToEdit.id, dataToSave);
                showNotification('Student updated successfully!', 'success');
                } catch (dbError) {
                    console.error("Database update error:", dbError);
                    showNotification(`Failed to update student: ${dbError.message}`, 'error');
                    setIsSubmitting(false);
                    return;
                }
            } else {
                try {
                    await apiClient.create('students', dataToSave);
                showNotification('Student enrolled successfully!', 'success');
                } catch (dbError) {
                    console.error("Database create error:", dbError);
                    showNotification(`Failed to create student: ${dbError.message}`, 'error');
                    setIsSubmitting(false);
                    return;
                }
            }
            fetchData();
            onClose();
        } catch (error) {
            console.error("Error saving student:", error);
            showNotification('Failed to save student.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={studentToEdit ? "Edit Student" : "Enroll New Student"}
            headerStyle={{ backgroundColor: '#2563EB' }}
        >
            <form onSubmit={handleSubmit}>
                <FormSection title="General Information">
                    <div className="sm:col-span-6"><FormInput label="Full Name" name="fullName" value={formData.fullName} onChange={handleChange} required /></div>
                    <div className="sm:col-span-3"><FormInput label="Student Contact" name="studentContact" type="tel" value={formData.studentContact} onChange={handleChange} required /></div>
                    <div className="sm:col-span-3"><FormInput label="Parent Name (Optional)" name="parentName" value={formData.parentName} onChange={handleChange} /></div>
                    <div className="sm:col-span-3"><FormInput label="Parent Contact (Optional)" name="parentContact" type="tel" value={formData.parentContact} onChange={handleChange} /></div>
                    <div className="sm:col-span-3">
                        <CustomDatePicker label="Enrollment Date" name="enrollmentDate" value={formData.enrollmentDate} onChange={handleChange} />
                    </div>
                    <div className="sm:col-span-3"><CustomDatePicker label="Birth Date (Optional)" name="birthDate" value={formData.birthDate} onChange={handleChange} /></div>
                    <div className="sm:col-span-6 flex items-center justify-end pt-5">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" name="isTutoring" checked={formData.isTutoring} onChange={handleChange} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
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
                                            <p className="text-lg font-bold text-green-600">{(formData.tutoringDetails.totalCalculatedFee || 0).toFixed(2)} ₺</p>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white rounded-lg p-3 border border-purple-100 shadow-sm">
                                        <div className="text-center">
                                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Per Lesson</p>
                                            <p className="text-lg font-bold text-purple-600">{parseFloat(formData.tutoringDetails.pricePerLesson || 0).toFixed(2)} ₺</p>
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
                                                    return `${installments.length} installments of ${installments[0]?.amount.toFixed(2) || 0} ₺ ${frequencyText}`;
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
                                                    ? formData.tutoringDetails.schedule.days.join(', ') 
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
                                                        <div className="text-sm font-semibold text-green-700">{inst.amount.toFixed(2)} ₺</div>
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
                                    {groups.map(group => <option key={group.id} value={group.id}>{group.groupName}</option>)}
                                </FormSelect>
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
                                                <input id="nationalId" name="nationalId" type="file" className="sr-only" onChange={handleFileChange} />
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
                                                <input id="agreement" name="agreement" type="file" className="sr-only" onChange={handleFileChange} />
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
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed">
                        {isSubmitting ? 'Saving...' : (studentToEdit ? 'Save Changes' : 'Enroll Student')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default StudentFormModal;
