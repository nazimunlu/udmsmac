import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { supabase } from '../supabaseClient';
import { useNotification } from '../contexts/NotificationContext';
import Modal from './Modal';
import { FormInput, FormSelect, FormSection } from './Form';
import CustomDatePicker from './CustomDatePicker';
import formatPhoneNumber from '../utils/formatPhoneNumber';
import { Icon, ICONS } from './Icons';
import { AppContext } from '../contexts/AppContext';
import { calculateLessonsWithinRange, generateMonthlyInstallments } from '../utils/lessonCalculator';

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
            const { data, error } = await supabase.from('groups').select('*');
            if (error) {
                console.error('Error fetching groups:', error);
            } else {
                setGroups(data);
            }
        };
        if (isOpen) {
            fetchGroups();
        }
    }, [isOpen]);

    const getInitialFormData = useCallback(() => {
        const getSafeDateString = (dateSource) => {
            if (!dateSource) return '';
            const date = new Date(dateSource);
            const offset = date.getTimezoneOffset();
            const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
            return adjustedDate.toISOString().split('T')[0];
        };

        const safeParse = (jsonString, defaultValue) => {
            if (typeof jsonString === 'object' && jsonString !== null) return jsonString;
            if (typeof jsonString === 'string') {
                try {
                    return JSON.parse(jsonString);
                } catch (e) {
                    return defaultValue;
                }
            }
            return defaultValue;
        };
        
        const studentTutoringDetails = safeParse(studentToEdit?.tutoring_details, {});

        const defaultTutoringDetails = {
            pricePerLesson: studentTutoringDetails.pricePerLesson || defaultPricePerLesson,
            totalCalculatedFee: studentTutoringDetails.totalCalculatedFee || 0,
            numberOfLessons: studentTutoringDetails.numberOfLessons || 0,
            endDate: studentTutoringDetails.endDate || '',
            schedule: { 
                days: [], 
                ...studentTutoringDetails.schedule
            }
        };

        return {
            fullName: studentToEdit?.fullName || '',
            studentContact: studentToEdit?.studentContact || '',
            parentContact: studentToEdit?.parentContact || '',
            enrollment_date: getSafeDateString(studentToEdit?.enrollment_date) || new Date().toISOString().split('T')[0],
            birth_date: getSafeDateString(studentToEdit?.birth_date) || '',
            isTutoring: studentToEdit?.isTutoring || false,
            groupId: studentToEdit?.groupId || null,
            documents: safeParse(studentToEdit?.documents, { nationalIdUrl: '', agreementUrl: '' }),
            document_names: safeParse(studentToEdit?.document_names, { nationalId: '', agreement: '' }),
            fee_details: safeParse(studentToEdit?.fee_details, { totalFee: '12000', numberOfInstallments: '3' }),
            tutoringDetails: defaultTutoringDetails,
            installments: safeParse(studentToEdit?.installments, []),
            isArchived: studentToEdit?.isArchived || false
        };
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
            const { enrollment_date } = formData;
            const lessons = calculateLessonsWithinRange(enrollment_date, endDate, schedule.days);
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
        formData.enrollment_date, 
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
        setFormData(prev => ({ ...prev, fee_details: { ...prev.fee_details, [name]: value } }));
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
            showNotification('National ID and Agreement are mandatory for group students.', 'error');
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
                    parseFloat(originalTutoring.pricePerLesson) !== parseFloat(currentTutoring.pricePerLesson)
                ) {
                    feeStructureChanged = true;
                }
            } else {
                if (
                    String(studentToEdit.fee_details?.totalFee || '') !== formData.fee_details.totalFee ||
                    String(studentToEdit.fee_details?.numberOfInstallments || '') !== formData.fee_details.numberOfInstallments ||
                    studentToEdit.enrollment_date !== formData.enrollment_date
                ) {
                    feeStructureChanged = true;
                }
            }
        }

        if (feeStructureChanged) {
            if (dataToSave.isTutoring) {
                dataToSave.installments = generateMonthlyInstallments(
                    dataToSave.tutoringDetails.totalCalculatedFee,
                    dataToSave.enrollment_date,
                    dataToSave.tutoringDetails.endDate
                );
            } else {
                const totalFee = parseFloat(dataToSave.fee_details.totalFee) || 0;
                const numInstallments = parseInt(dataToSave.fee_details.numberOfInstallments, 10) || 1;
                const installmentAmount = totalFee > 0 && numInstallments > 0 ? totalFee / numInstallments : 0;
                const startDate = new Date(dataToSave.enrollment_date.replace(/-/g, '/'));
                
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
        dataToSave.fee_details = JSON.stringify(dataToSave.fee_details);
        dataToSave.installments = JSON.stringify(dataToSave.installments);
        dataToSave.documents = JSON.stringify(dataToSave.documents);
        dataToSave.document_names = JSON.stringify(dataToSave.document_names);
        dataToSave.tutoring_details = JSON.stringify(dataToSave.tutoring_details);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                showNotification('You must be logged in to perform this action.', 'error');
                setIsSubmitting(false);
                return;
            }
            const userId = user.id;

            const nationalIdPath = `student_documents/${userId}/${dataToSave.fullName}_nationalId_${files.nationalId?.name || Date.now()}`;
            const agreementPath = `student_documents/${userId}/${dataToSave.fullName}_agreement_${files.agreement?.name || Date.now()}`;

            if (files.nationalId) {
                const nationalIdUrl = await uploadFile(files.nationalId, nationalIdPath);
                let docs = JSON.parse(dataToSave.documents);
                docs.nationalIdUrl = nationalIdUrl;
                dataToSave.documents = JSON.stringify(docs);
            }

            if (files.agreement) {
                const agreementUrl = await uploadFile(files.agreement, agreementPath);
                let docs = JSON.parse(dataToSave.documents);
                docs.agreementUrl = agreementUrl;
                dataToSave.documents = JSON.stringify(docs);
            }

            if (studentToEdit) {
                const { error } = await supabase.from('students').update(dataToSave).match({ id: studentToEdit.id });
                if (error) throw error;
                showNotification('Student updated successfully!', 'success');
            } else {
                const { error } = await supabase.from('students').insert([dataToSave]);
                if (error) throw error;
                showNotification('Student enrolled successfully!', 'success');
            }
            fetchData();
            onClose();
        } catch (error) {
            console.error("Error saving student:", error);
            showNotification(`Failed to save student: ${error.message || error.details || error.hint || JSON.stringify(error)}. Please check console for details.`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={studentToEdit ? "Edit Student" : "Enroll New Student"}>
            <form onSubmit={handleSubmit}>
                <FormSection title="General Information">
                    <div className="sm:col-span-6"><FormInput label="Full Name" name="fullName" value={formData.fullName} onChange={handleChange} required /></div>
                    <div className="sm:col-span-3"><FormInput label="Student Contact" name="studentContact" type="tel" value={formData.studentContact} onChange={handleChange} required /></div>
                    <div className="sm:col-span-3"><FormInput label="Parent Contact (Optional)" name="parentContact" type="tel" value={formData.parentContact} onChange={handleChange} /></div>
                    <div className="sm:col-span-3">
                        <CustomDatePicker label="Enrollment Date" name="enrollment_date" value={formData.enrollment_date} onChange={handleChange} />
                    </div>
                    <div className="sm:col-span-3"><CustomDatePicker label="Birth Date (Optional)" name="birth_date" value={formData.birth_date} onChange={handleChange} /></div>
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
                        <div className="sm:col-span-6 mt-4 p-4 bg-blue-50 rounded-lg">
                            <h4 className="text-md font-semibold text-gray-800">Calculated Plan</h4>
                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <div>
                                    <p className="text-sm text-gray-600">Total Lessons</p>
                                    <p className="text-xl font-bold text-blue-800">{formData.tutoringDetails.numberOfLessons}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Total Fee</p>
                                    <p className="text-xl font-bold text-blue-800">{(formData.tutoringDetails.totalCalculatedFee || 0).toFixed(2)} ₺</p>
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
                            <div className="sm:col-span-3"><FormInput label="Total Fee (₺)" name="totalFee" type="number" value={formData.fee_details.totalFee} onChange={handleFeeChange} /></div>
                            <div className="sm:col-span-3"><FormInput label="Number of Installments" name="numberOfInstallments" type="number" value={formData.fee_details.numberOfInstallments} onChange={handleFeeChange} /></div>
                        </FormSection>
                        <FormSection title="Document Uploads">
                            <div className="sm:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">National ID</label>
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                                    <div className="space-y-1 text-center w-full">
                                        <Icon path={ICONS.UPLOAD} className="mx-auto h-12 w-12 text-gray-400" />
                                        <div className="flex text-sm text-gray-600 justify-center">
                                            <label htmlFor="nationalId" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                                                <span>{files.nationalId ? files.nationalId.name : (formData.document_names?.nationalId || 'Upload a file')}</span>
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
                                                <span>{files.agreement ? files.agreement.name : (formData.document_names?.agreement || 'Upload a file')}</span>
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
