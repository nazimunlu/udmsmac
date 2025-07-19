import React, { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, doc, setDoc, Timestamp } from 'firebase/firestore';
import { supabase } from '../supabaseClient';
import { useAppContext } from '../contexts/AppContext';
import { useNotification } from '../contexts/NotificationContext';
import Modal from './Modal';
import { FormInput, FormSelect, FormSection } from './Form';
import CustomDatePicker from './CustomDatePicker';
import CustomTimePicker from './CustomTimePicker';

const StudentFormModal = ({ isOpen, onClose, studentToEdit }) => {
    const { db, userId, appId, groups } = useAppContext();
    const { showNotification } = useNotification();
    const [files, setFiles] = useState({ nationalId: null, agreement: null });
    
    const timeOptions = [];
    for (let h = 9; h <= 23; h++) {
        timeOptions.push(`${h.toString().padStart(2, '0')}:00`);
        timeOptions.push(`${h.toString().padStart(2, '0')}:30`);
    }

    const getInitialFormData = useCallback(() => {
        const getSafeDateString = (dateSource) => {
            if (dateSource && typeof dateSource.toDate === 'function') {
                return dateSource.toDate().toISOString().split('T')[0];
            }
            if (typeof dateSource === 'string' && dateSource) {
                return dateSource;
            }
            return '';
        };

        return {
            fullName: studentToEdit?.fullName || '',
            studentContact: studentToEdit?.studentContact || '',
            parentContact: studentToEdit?.parentContact || '',
            enrollmentDate: getSafeDateString(studentToEdit?.enrollmentDate) || new Date().toISOString().split('T')[0],
            birthDate: getSafeDateString(studentToEdit?.birthDate) || '',
            isTutoring: studentToEdit?.isTutoring || false,
            groupId: studentToEdit?.groupId || null,
            documents: studentToEdit?.documents || { nationalIdUrl: '', agreementUrl: '' },
            documentNames: studentToEdit?.documentNames || { nationalId: '', agreement: '' },
            feeDetails: studentToEdit?.feeDetails || { totalFee: '', numberOfInstallments: '' },
            tutoringDetails: studentToEdit?.tutoringDetails || {
                    hourlyRate: '',
                    numberOfLessons: '',
                    endDate: '',
                    schedule: { days: [], startTime: '09:00', endTime: '10:00' }
                },
            installments: studentToEdit?.installments || []
        };
    }, [studentToEdit]);

    const [formData, setFormData] = useState(getInitialFormData());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);
    
    useEffect(() => {
        if (isOpen) {
            setFormData(getInitialFormData());
            setFiles({ nationalId: null, agreement: null });
            setStatusMessage(null);
        }
    }, [isOpen, getInitialFormData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };
    
    const handleFeeChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, feeDetails: {...prev.feeDetails, [name]: value }}));
    };

    const handleTutoringChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, tutoringDetails: {...prev.tutoringDetails, [name]: value }}));
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
        setFormData(prev => ({...prev, tutoringDetails: {...prev.tutoringDetails, schedule: {...prev.tutoringDetails.schedule, days: newDays}}}));
    };

    const handleFileChange = (e) => {
        const { name, files: selectedFiles } = e.target;
        if (selectedFiles[0]) { setFiles(prev => ({ ...prev, [name]: selectedFiles[0] })); }
    };

    const uploadFile = async (file, path) => {
        if (!file) return null;
        const { data, error } = await supabase.storage.from('udms').upload(path, file);
        if (error) throw error;
        return supabase.storage.from('udms').getPublicUrl(path).data.publicUrl;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.isTutoring && (!files.nationalId && !studentToEdit?.documents?.nationalIdUrl || !files.agreement && !studentToEdit?.documents?.agreementUrl)) {
            setStatusMessage({ type: 'error', text: 'National ID and Agreement are mandatory for group students.' });
            return;
        }

        setIsSubmitting(true);
        setStatusMessage(null);
        let dataToSave = { ...formData };

        const getSafeDateString = (dateSource) => {
            if (dateSource && typeof dateSource.toDate === 'function') {
                return dateSource.toDate().toISOString().split('T')[0];
            }
            return typeof dateSource === 'string' ? dateSource : '';
        };

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
                    String(originalTutoring.hourlyRate || '') !== currentTutoring.hourlyRate ||
                    String(originalTutoring.numberOfLessons || '') !== currentTutoring.numberOfLessons ||
                    getSafeDateString(originalTutoring.endDate) !== getSafeDateString(currentTutoring.endDate) ||
                    getSafeDateString(studentToEdit.enrollmentDate) !== getSafeDateString(formData.enrollmentDate) ||
                    JSON.stringify(originalSchedule.days || []) !== JSON.stringify(currentSchedule.days || []) ||
                    originalSchedule.startTime !== currentSchedule.startTime
                ) {
                    feeStructureChanged = true;
                }
            } else { // Not tutoring
                if (
                    String(studentToEdit.feeDetails?.totalFee || '') !== formData.feeDetails.totalFee ||
                    String(studentToEdit.feeDetails?.numberOfInstallments || '') !== formData.feeDetails.numberOfInstallments ||
                    getSafeDateString(studentToEdit.enrollmentDate) !== getSafeDateString(formData.enrollmentDate)
                ) {
                    feeStructureChanged = true;
                }
            }
        }

        if (feeStructureChanged) {
            if (!dataToSave.isTutoring) {
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
                        dueDate: Timestamp.fromDate(dueDate),
                        status: 'Unpaid'
                    };
                });
            } else {
                const hourlyRate = parseFloat(dataToSave.tutoringDetails.hourlyRate) || 0;
                const enrollmentDate = new Date(dataToSave.enrollmentDate.replace(/-/g, '/'));
                const tutoringEndDate = dataToSave.tutoringDetails.endDate ? new Date(dataToSave.tutoringDetails.endDate.replace(/-/g, '/')) : null;
                const scheduledDays = (dataToSave.tutoringDetails.schedule.days || []).map(day => ({'Sun':0, 'Mon':1, 'Tue':2, 'Wed':3, 'Thu':4, 'Fri':5, 'Sat':6}[day])).filter(d => d !== undefined);
                const [startHour, startMinute] = (dataToSave.tutoringDetails.schedule.startTime || "09:00").split(':').map(Number);

                dataToSave.installments = [];
                let currentLessonDate = new Date(enrollmentDate);
                let lessonCount = 0;

                if (dataToSave.tutoringDetails.numberOfLessons) {
                    const targetLessons = parseInt(dataToSave.tutoringDetails.numberOfLessons, 10);
                    while (lessonCount < targetLessons) {
                        if (scheduledDays.includes(currentLessonDate.getDay())) {
                            const dueDate = new Date(currentLessonDate);
                            dueDate.setHours(startHour, startMinute, 0, 0);
                            dataToSave.installments.push({ number: lessonCount + 1, amount: hourlyRate, dueDate: Timestamp.fromDate(dueDate), status: 'Unpaid' });
                            lessonCount++;
                        }
                        currentLessonDate.setDate(currentLessonDate.getDate() + 1);
                    }
                    if(lessonCount > 0) {
                       currentLessonDate.setDate(currentLessonDate.getDate() - 1);
                    }
                    dataToSave.tutoringDetails.endDate = Timestamp.fromDate(currentLessonDate);
                } else if (tutoringEndDate) {
                    while (currentLessonDate <= tutoringEndDate) {
                        if (scheduledDays.includes(currentLessonDate.getDay())) {
                            const dueDate = new Date(currentLessonDate);
                            dueDate.setHours(startHour, startMinute, 0, 0);
                            dataToSave.installments.push({ number: lessonCount + 1, amount: hourlyRate, dueDate: Timestamp.fromDate(dueDate), status: 'Unpaid' });
                            lessonCount++;
                        }
                        currentLessonDate.setDate(currentLessonDate.getDate() + 1);
                    }
                    dataToSave.tutoringDetails.numberOfLessons = lessonCount;
                }
            }
        }

        try {
            const nationalIdPath = `student_documents/${userId}/${Date.now()}_nationalId_${files.nationalId?.name}`;
            const agreementPath = `student_documents/${userId}/${Date.now()}_agreement_${files.agreement?.name}`;

            if (files.nationalId) {
                dataToSave.documents.nationalIdUrl = await uploadFile(files.nationalId, nationalIdPath);
                await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'documents'), {
                    name: files.nationalId.name,
                    url: dataToSave.documents.nationalIdUrl,
                    type: 'nationalId',
                    uploadDate: Timestamp.now(),
                    studentId: studentToEdit?.id || null,
                });
            } else if (studentToEdit?.documents?.nationalIdUrl) {
                dataToSave.documents.nationalIdUrl = studentToEdit.documents.nationalIdUrl;
            }

            if (files.agreement) {
                dataToSave.documents.agreementUrl = await uploadFile(files.agreement, agreementPath);
                await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'documents'), {
                    name: files.agreement.name,
                    url: dataToSave.documents.agreementUrl,
                    type: 'agreement',
                    uploadDate: Timestamp.now(),
                    studentId: studentToEdit?.id || null,
                });
            } else if (studentToEdit?.documents?.agreementUrl) {
                dataToSave.documents.agreementUrl = studentToEdit.documents.agreementUrl;
            }
            
            const toTimestamp = (dateString) => {
                if (!dateString || typeof dateString !== 'string') return null;
                const [year, month, day] = dateString.split('-').map(Number);
                if(isNaN(year) || isNaN(month) || isNaN(day)) return null;
                return Timestamp.fromDate(new Date(year, month - 1, day));
            };

            dataToSave.enrollmentDate = toTimestamp(dataToSave.enrollmentDate);
            dataToSave.birthDate = toTimestamp(dataToSave.birthDate);
            if (dataToSave.tutoringDetails.endDate && typeof dataToSave.tutoringDetails.endDate === 'string') {
                 dataToSave.tutoringDetails.endDate = toTimestamp(dataToSave.tutoringDetails.endDate);
            } else if (!dataToSave.tutoringDetails.endDate) {
                 dataToSave.tutoringDetails.endDate = null;
            }


            if (formData.isTutoring) {
                 if (dataToSave.tutoringDetails.hourlyRate && dataToSave.tutoringDetails.numberOfLessons) {
                    dataToSave.feeDetails = {
                        totalFee: (parseFloat(dataToSave.tutoringDetails.hourlyRate) * parseInt(dataToSave.tutoringDetails.numberOfLessons, 10)).toString(),
                        numberOfInstallments: dataToSave.tutoringDetails.numberOfLessons.toString()
                    };
                }
            }


            if (studentToEdit) {
                const studentDocRef = doc(db, 'artifacts', appId, 'users', userId, 'students', studentToEdit.id);
                await setDoc(studentDocRef, dataToSave, { merge: true });
                showNotification('Student updated successfully!', 'success');
            } else {
                const studentCollectionPath = collection(db, 'artifacts', appId, 'users', userId, 'students');
                await addDoc(studentCollectionPath, dataToSave);
                showNotification('Student enrolled successfully!', 'success');
            }
            onClose();
        } catch (error) {
            console.error("Error saving student:", error);
            setStatusMessage({ type: 'error', text: 'Failed to save student. Please check console for details.' });
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
                        <div className="sm:col-span-3"><FormInput label="Hourly Rate (₺)" name="hourlyRate" type="number" value={formData.tutoringDetails.hourlyRate} onChange={handleTutoringChange} /></div>
                        <div className="sm:col-span-3"><CustomDatePicker label="End Date" name="endDate" value={formData.tutoringDetails.endDate} onChange={handleTutoringChange} /></div>
                        <div className="sm:col-span-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Recurring Schedule</label>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <button type="button" key={day} onClick={() => toggleScheduleDay(day)} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${formData.tutoringDetails.schedule.days.includes(day) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                                        {day}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex-1"><CustomTimePicker label="Start Time" name="startTime" value={formData.tutoringDetails.schedule.startTime} onChange={handleTutoringScheduleChange} options={timeOptions}/></div>
                                <div className="pt-6 text-gray-500">-</div>
                                <div className="flex-1"><CustomTimePicker label="End Time" name="endTime" value={formData.tutoringDetails.schedule.endTime} onChange={handleTutoringScheduleChange} options={timeOptions}/></div>
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
                                    <div className="space-y-1 text-center">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                                        <div className="flex text-sm text-gray-600">
                                            <label htmlFor="nationalId" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"><span>{files.nationalId ? files.nationalId.name : 'Upload a file'}</span><input id="nationalId" name="nationalId" type="file" className="sr-only" onChange={handleFileChange} /></label>
                                            {!files.nationalId && <p className="pl-1">or drag and drop</p>}
                                        </div>
                                        <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                                    </div>
                                </div>
                           </div>
                           <div className="sm:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Agreement</label>
                                 <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                                    <div className="space-y-1 text-center">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                                        <div className="flex text-sm text-gray-600">
                                            <label htmlFor="agreement" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"><span>{files.agreement ? files.agreement.name : 'Upload a file'}</span><input id="agreement" name="agreement" type="file" className="sr-only" onChange={handleFileChange} /></label>
                                            {!files.agreement && <p className="pl-1">or drag and drop</p>}
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
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed">Save Student</button>
                </div>
                {statusMessage && <p className={`mt-4 text-center text-sm ${statusMessage.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>{statusMessage.text}</p>}
            </form>
        </Modal>
    );
};

export default StudentFormModal;
