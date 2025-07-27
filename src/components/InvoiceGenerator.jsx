import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { FormInput, FormSelect, FormSection } from './Form';
import { useNotification } from '../contexts/NotificationContext';
import { useAppContext } from '../contexts/AppContext';
import { Icon, ICONS } from './Icons';
import { formatDate } from '../utils/formatDate';

// Currency formatting utility
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

const InvoiceGenerator = ({ isOpen, onClose, student, newlyPaidInstallment }) => {
    const { showNotification } = useNotification();
    const { students } = useAppContext();
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [invoiceData, setInvoiceData] = useState({
        studentId: '',
        invoiceNumber: `UDL-${Date.now()}`,
        issueDate: new Date().toISOString().split('T')[0],
        paymentDate: new Date().toISOString().split('T')[0],
        items: [],
        notes: '',
        terms: 'Bu fatura ödeme alındıktan sonra düzenlenmiştir.'
    });

    const [selectedInstallments, setSelectedInstallments] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (student) {
                // Get the latest student data from context to ensure we have updated installments
                const latestStudent = students.find(s => s.id === student.id);
                const studentToUse = latestStudent || student;
                
                setSelectedStudent(studentToUse);
                
                // Auto-select newly paid installment if provided
                if (newlyPaidInstallment) {
                    setSelectedInstallments([newlyPaidInstallment]);
                } else {
                    // Auto-select all paid installments if no specific installment
                    const paidInstallments = studentToUse.installments?.filter(inst => inst.status === 'Paid').map(inst => inst.number) || [];
                    setSelectedInstallments(paidInstallments);
                }
                
                setInvoiceData(prev => ({
                    ...prev,
                    studentId: studentToUse.id,
                    invoiceNumber: `UDL-${Date.now()}`,
                    items: studentToUse.installments?.filter(inst => inst.status === 'Paid').map(inst => ({
                        description: `Taksit ${inst.number} - ${formatDate(new Date(inst.dueDate), 'dd/MM/yyyy')}`,
                        quantity: 1,
                        unitPrice: inst.amount,
                        amount: inst.amount
                    })) || []
                }));
            } else {
                setSelectedStudent(null);
                setSelectedInstallments([]);
                setInvoiceData({
                    studentId: '',
                    invoiceNumber: `UDL-${Date.now()}`,
                    issueDate: new Date().toISOString().split('T')[0],
                    paymentDate: new Date().toISOString().split('T')[0],
                    items: [],
                    notes: '',
                    terms: 'Bu fatura ödeme alındıktan sonra düzenlenmiştir.'
                });
            }
        }
    }, [isOpen, student, newlyPaidInstallment, students]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setInvoiceData(prev => ({ ...prev, [name]: value }));
        
        if (name === 'studentId') {
            const selectedStudentData = students.find(s => s.id === value);
            setSelectedStudent(selectedStudentData);
            setSelectedInstallments([]); // Reset installment selection
            if (selectedStudentData) {
                setInvoiceData(prev => ({
                    ...prev,
                    items: []
                }));
            }
        }
    };

    const handleInstallmentSelection = (installmentId, isSelected) => {
        if (isSelected) {
            setSelectedInstallments(prev => [...prev, installmentId]);
        } else {
            setSelectedInstallments(prev => prev.filter(id => id !== installmentId));
        }
    };

    const updateInvoiceItems = () => {
        if (!selectedStudent) return;
        
        const installments = typeof selectedStudent.installments === 'string' 
            ? JSON.parse(selectedStudent.installments) 
            : selectedStudent.installments;
        
        const selectedItems = installments
            .filter(inst => selectedInstallments.includes(inst.number))
            .filter(inst => inst.status === 'Paid')
            .map(inst => ({
                description: `Taksit ${inst.number} - ${formatDate(new Date(inst.dueDate), 'dd/MM/yyyy')}`,
                quantity: 1,
                unitPrice: inst.amount,
                amount: inst.amount
            }));
        
        setInvoiceData(prev => ({
            ...prev,
            items: selectedItems
        }));
    };

    // Update invoice items when installment selection changes
    useEffect(() => {
        updateInvoiceItems();
    }, [selectedInstallments, selectedStudent]);

    const addItem = () => {
        setInvoiceData(prev => ({
            ...prev,
            items: [...prev.items, {
                description: '',
                quantity: 1,
                unitPrice: 0,
                amount: 0
            }]
        }));
    };

    const removeItem = (index) => {
        setInvoiceData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const updateItem = (index, field, value) => {
        setInvoiceData(prev => ({
            ...prev,
            items: prev.items.map((item, i) => {
                if (i === index) {
                    const updatedItem = { ...item, [field]: value };
                    if (field === 'quantity' || field === 'unitPrice') {
                        updatedItem.amount = updatedItem.quantity * updatedItem.unitPrice;
                    }
                    return updatedItem;
                }
                return item;
            })
        }));
    };

    const getTotalAmount = () => {
        return invoiceData.items.reduce((total, item) => total + item.amount, 0);
    };

    const generateInvoice = async () => {
        setIsGenerating(true);
        try {
            // Generate filename based on content - convert Turkish characters to ASCII
            const turkishToAscii = (str) => {
                return str
                    .replace(/ğ/g, 'g')
                    .replace(/Ğ/g, 'G')
                    .replace(/ü/g, 'u')
                    .replace(/Ü/g, 'U')
                    .replace(/ş/g, 's')
                    .replace(/Ş/g, 'S')
                    .replace(/ı/g, 'i')
                    .replace(/İ/g, 'I')
                    .replace(/ö/g, 'o')
                    .replace(/Ö/g, 'O')
                    .replace(/ç/g, 'c')
                    .replace(/Ç/g, 'C');
            };
            
            const studentName = turkishToAscii(selectedStudent?.fullName || 'Unknown')
                .replace(/[^a-zA-Z\s]/g, '')
                .trim()
                .replace(/\s+/g, '_');
            const invoiceNumber = invoiceData.invoiceNumber.replace(/[^a-zA-Z0-9]/g, '');
            const filename = `${studentName}_Fatura_${invoiceNumber}.pdf`;

            const invoiceWindow = window.open('', '_blank');
            invoiceWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${filename}</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            margin: 0; 
                            padding: 15px; 
                            background: white;
                            line-height: 1.3;
                        }
                        
                        /* Header styling */
                        .header {
                            text-align: center;
                            margin-bottom: 20px;
                            border-bottom: 2px solid #1f2937;
                            padding-bottom: 15px;
                        }
                        
                        .header h1 {
                            margin: 0;
                            font-size: 18px;
                            font-weight: bold;
                            color: #1f2937;
                            text-transform: uppercase;
                        }
                        
                        .header h2 {
                            margin: 5px 0 0 0;
                            font-size: 14px;
                            color: #6b7280;
                        }
                        
                        /* Two column layout */
                        .content {
                            display: flex;
                            gap: 20px;
                        }
                        
                        .left-column, .right-column {
                            flex: 1;
                        }
                        
                        /* Section headers */
                        .section-header {
                            font-size: 12px;
                            font-weight: bold;
                            color: #374151;
                            margin: 0 0 8px 0;
                            text-transform: uppercase;
                            border-bottom: 1px solid #d1d5db;
                            padding-bottom: 4px;
                        }
                        
                        /* Grid layouts */
                        .grid {
                            margin: 8px 0;
                        }
                        
                        .grid-cols-1 > div {
                            display: flex;
                            justify-content: space-between;
                            margin: 2px 0;
                            font-size: 10px;
                        }
                        
                        .grid-cols-3 {
                            display: grid;
                            grid-template-columns: 1fr 1fr 1fr;
                            gap: 8px;
                        }
                        
                        .grid-cols-3 > div {
                            background: #f8f9fa;
                            border: 1px solid #ddd;
                            padding: 6px;
                            text-align: center;
                            font-size: 10px;
                        }
                        
                        /* Table styling */
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin: 8px 0;
                            font-size: 9px;
                        }
                        
                        table th {
                            background: #f1f5f9;
                            color: #1f2937;
                            font-weight: bold;
                            padding: 4px 6px;
                            border: 1px solid #cbd5e1;
                            text-align: center;
                        }
                        
                        table td {
                            border: 1px solid #cbd5e1;
                            padding: 4px 6px;
                            text-align: center;
                        }
                        
                        /* Payment status */
                        .payment-status {
                            background: #dcfce7;
                            color: #166534;
                            padding: 8px;
                            border-radius: 4px;
                            margin: 8px 0;
                            text-align: center;
                            font-weight: bold;
                            font-size: 10px;
                        }
                        
                        /* Total amount */
                        .total-amount {
                            background: #dbeafe;
                            color: #1e40af;
                            padding: 8px;
                            border-radius: 4px;
                            margin: 8px 0;
                            text-align: center;
                            font-weight: bold;
                            font-size: 12px;
                        }
                        
                        /* Notes section */
                        .notes-section {
                            background: #fffbeb;
                            border: 1px solid #fde68a;
                            padding: 8px;
                            margin: 8px 0;
                            font-size: 10px;
                        }
                        
                        /* Signature section */
                        .signature-section {
                            margin-top: 25px;
                            padding-top: 20px;
                        }
                        
                        .signature-box {
                            display: flex;
                            justify-content: space-between;
                        }
                        
                        .signature-item {
                            text-align: center;
                            flex: 1;
                        }
                        
                        .signature-line {
                            border-bottom: 2px solid #9ca3af;
                            margin-bottom: 10px;
                            min-height: 60px;
                        }
                        
                        /* Text utilities */
                        .text-xs { font-size: 9px; }
                        .text-sm { font-size: 11px; }
                        .text-lg { font-size: 14px; }
                        .font-bold { font-weight: bold; }
                        .font-medium { font-weight: 500; }
                        .text-center { text-align: center; }
                        .text-right { text-align: right; }
                        .text-left { text-align: left; }
                        
                        /* Colors */
                        .text-gray-900 { color: #111827; }
                        .text-gray-600 { color: #4b5563; }
                        .text-gray-500 { color: #6b7280; }
                        .text-gray-700 { color: #374151; }
                        
                        /* Spacing */
                        .mb-1 { margin-bottom: 4px; }
                        .mb-2 { margin-bottom: 8px; }
                        .mb-4 { margin-bottom: 15px; }
                        .mt-4 { margin-top: 15px; }
                        .p-2 { padding: 8px; }
                        .p-3 { padding: 12px; }
                        
                        /* Prevent page breaks */
                        table { page-break-inside: avoid; }
                        .content { page-break-inside: avoid; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>FATURA</h1>
                        <h2>${invoiceData.invoiceNumber}</h2>
                    </div>
                    
                    <div class="payment-status">
                        ÖDEME ALINDI - PAID
                    </div>
                    
                    <div class="content">
                        <div class="left-column">
                            <!-- Student Information -->
                            <div class="mb-4">
                                <h3 class="section-header">ÖĞRENCİ BİLGİLERİ</h3>
                                <div class="grid grid-cols-1">
                                    <div>
                                        <span class="font-medium">Ad Soyad:</span>
                                        <span>${selectedStudent?.fullName || 'Öğrenci Adı'}</span>
                                    </div>
                                    <div>
                                        <span class="font-medium">T.C. Kimlik No:</span>
                                        <span>${selectedStudent?.nationalId || 'Belirtilmemiş'}</span>
                                    </div>
                                    <div>
                                        <span class="font-medium">İletişim:</span>
                                        <span>${selectedStudent?.studentContact || 'İletişim Bilgileri'}</span>
                                    </div>
                                    <div>
                                        <span class="font-medium">Veli Adı:</span>
                                        <span>${selectedStudent?.parentName || 'Veli Adı'}</span>
                                    </div>
                                    <div>
                                        <span class="font-medium">Veli İletişim:</span>
                                        <span>${selectedStudent?.parentContact || 'Veli İletişim'}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Invoice Information -->
                            <div class="mb-4">
                                <h3 class="section-header">FATURA BİLGİLERİ</h3>
                                <div class="grid grid-cols-1">
                                    <div>
                                        <span class="font-medium">Düzenleme Tarihi:</span>
                                        <span>${formatDate(invoiceData.issueDate)}</span>
                                    </div>
                                    <div>
                                        <span class="font-medium">Ödeme Tarihi:</span>
                                        <span>${formatDate(invoiceData.paymentDate)}</span>
                                    </div>
                <div>
                                        <span class="font-medium">Fatura No:</span>
                                        <span>${invoiceData.invoiceNumber}</span>
                </div>
                </div>
            </div>

                            <!-- Payment Summary -->
                            <div class="mb-4">
                                <h3 class="section-header">ÖDEME ÖZETİ</h3>
                                <div class="grid grid-cols-3">
                                    <div>
                                        <div class="font-bold text-gray-900">${invoiceData.items.length}</div>
                                        <div class="text-gray-600">Taksit Sayısı</div>
                                    </div>
                                    <div>
                                        <div class="font-bold text-gray-900">${formatCurrency(getTotalAmount())}</div>
                                        <div class="text-gray-600">Toplam Tutar</div>
                                    </div>
                                    <div>
                                        <div class="font-bold text-gray-900">${formatDate(new Date(), 'dd/MM/yyyy')}</div>
                                        <div class="text-gray-600">Tarih</div>
                                    </div>
                                </div>
                            </div>
            </div>

                        <div class="right-column">
                            <!-- Invoice Items -->
                            <div class="mb-4">
                                <h3 class="section-header">ALINAN ÖDEMELER</h3>
                                <table>
                    <thead>
                                        <tr>
                                            <th>Açıklama</th>
                                            <th>Miktar</th>
                                            <th>Birim Fiyat</th>
                                            <th>Tutar</th>
                        </tr>
                    </thead>
                    <tbody>
                                        ${invoiceData.items.map(item => `
                                            <tr>
                                                <td>${item.description}</td>
                                                <td>${item.quantity}</td>
                                                <td>${formatCurrency(item.unitPrice)}</td>
                                                <td>${formatCurrency(item.amount)}</td>
                        </tr>
                                        `).join('')}
                    </tbody>
                </table>
            </div>

                            <!-- Total Amount -->
                            <div class="total-amount">
                                TOPLAM TUTAR: ${formatCurrency(getTotalAmount())}
                            </div>
                            
                            <!-- Notes -->
                            ${invoiceData.notes && `
                                <div class="mb-4">
                                    <h3 class="section-header">NOTLAR</h3>
                                    <div class="notes-section">
                                        ${invoiceData.notes}
                                    </div>
                </div>
                            `}
                            

                </div>
            </div>

                    <!-- Signature Section -->
                    <div class="signature-section">
                        <div class="signature-box">
                            <div class="signature-item">
                                <div class="signature-line"></div>
                                <p class="text-sm font-bold text-gray-900 mb-1">Nazım Ünlü</p>
                                <p class="text-xs text-gray-600">KURUCU MÜDÜR</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `);
            invoiceWindow.document.close();
            invoiceWindow.print();

            showNotification('Fatura başarıyla oluşturuldu!', 'success');
            onClose();
        } catch (error) {
            console.error("Error generating invoice:", error);
            showNotification('Fatura oluşturulamadı.', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Fatura Oluştur (Ödeme Sonrası)" 
            size="lg"
            headerStyle={{ backgroundColor: '#2563EB' }}
        >
            <form onSubmit={(e) => { e.preventDefault(); generateInvoice(); }}>
                <FormSection title="Fatura Bilgileri">
                    <div className="sm:col-span-6">
                        <FormSelect 
                            label="Öğrenci" 
                            name="studentId" 
                            value={invoiceData.studentId} 
                            onChange={handleChange}
                            required
                            disabled={!!student}
                        >
                            <option value="">Öğrenci seçin</option>
                            {students.map(s => (
                                <option key={s.id} value={s.id}>{s.fullName}</option>
                            ))}
                        </FormSelect>
                    </div>

                    {selectedStudent && (
                        <div className="sm:col-span-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Taksit Seçimi
                            </label>
                            <div className="bg-gray-50 p-4 rounded-lg border">
                                <p className="text-sm text-gray-600 mb-3">
                                    Faturaya dahil edilecek ödenmiş taksitleri seçin:
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {(() => {
                                        const installments = typeof selectedStudent.installments === 'string' 
                                            ? JSON.parse(selectedStudent.installments) 
                                            : selectedStudent.installments;
                                        
                                        return installments
                                            .filter(inst => inst.status === 'Paid')
                                            .map(inst => (
                                                <label key={inst.number} className="flex items-center space-x-2 p-2 bg-white rounded border hover:bg-gray-50 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedInstallments.includes(inst.number)}
                                                        onChange={(e) => handleInstallmentSelection(inst.number, e.target.checked)}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="text-sm">
                                                        Taksit {inst.number} - {formatCurrency(inst.amount)} 
                                                        <span className="text-gray-500 ml-1">
                                                            ({formatDate(new Date(inst.dueDate), 'dd/MM/yyyy')})
                                                        </span>
                                                    </span>
                                                </label>
                                            ));
                                    })()}
                                </div>
                                {(() => {
                                    const installments = typeof selectedStudent.installments === 'string' 
                                        ? JSON.parse(selectedStudent.installments) 
                                        : selectedStudent.installments;
                                    
                                    const paidInstallments = installments.filter(inst => inst.status === 'Paid');
                                    
                                    if (paidInstallments.length === 0) {
                                        return (
                                            <p className="text-sm text-gray-500 mt-2">
                                                Bu öğrencinin ödenmiş taksiti bulunmamaktadır.
                                            </p>
                                        );
                                    }
                                })()}
                            </div>
                        </div>
                    )}

                    <div className="sm:col-span-3">
                        <FormInput 
                            label="Fatura Numarası" 
                            name="invoiceNumber" 
                            value={invoiceData.invoiceNumber} 
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="sm:col-span-3">
                        <FormInput 
                            label="Düzenleme Tarihi" 
                            name="issueDate" 
                            type="date"
                            value={invoiceData.issueDate} 
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="sm:col-span-6">
                        <FormInput 
                            label="Ödeme Tarihi" 
                            name="paymentDate" 
                            type="date"
                            value={invoiceData.paymentDate} 
                            onChange={handleChange}
                            required
                        />
                    </div>
                </FormSection>

                <FormSection title="Ödenen Taksitler">
                    <div className="sm:col-span-6 mb-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-blue-800 text-sm">
                                <Icon path={ICONS.INFO} className="w-4 h-4 inline mr-2" />
                                Bu fatura ödeme alındıktan sonra düzenlenmektedir. Sadece ödenmiş taksitler listelenmektedir.
                            </p>
                        </div>
                    </div>

                    <div className="sm:col-span-6 mb-4">
                        <button 
                            type="button"
                            onClick={addItem}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                        >
                            <Icon path={ICONS.ADD} className="w-4 h-4 mr-2" />
                            Kalem Ekle
                        </button>
                    </div>

                    {invoiceData.items.map((item, index) => (
                        <div key={index} className="sm:col-span-6 grid grid-cols-12 gap-4 items-end mb-4 p-4 bg-gray-50 rounded-lg">
                            <div className="col-span-4">
                                <FormInput 
                                    label="Açıklama" 
                                    name={`item-${index}-description`}
                                    value={item.description} 
                                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                                    required
                                />
                            </div>
                            <div className="col-span-2">
                                <FormInput 
                                    label="Miktar" 
                                    name={`item-${index}-quantity`}
                                    type="number"
                                    value={item.quantity} 
                                    onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                                    required
                                />
                            </div>
                            <div className="col-span-2">
                                <FormInput 
                                    label="Birim Fiyat" 
                                    name={`item-${index}-unitPrice`}
                                    type="number"
                                    step="0.01"
                                    value={item.unitPrice} 
                                    onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value))}
                                    required
                                />
                            </div>
                            <div className="col-span-2">
                                <FormInput 
                                    label="Tutar" 
                                    name={`item-${index}-amount`}
                                    type="number"
                                    step="0.01"
                                    value={Math.round(item.amount)} 
                                    disabled
                                />
                            </div>
                            <div className="col-span-2">
                                <button 
                                    type="button"
                                    onClick={() => removeItem(index)}
                                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                >
                                    <Icon path={ICONS.DELETE} className="w-4 h-4" />
                                </button>
            </div>
        </div>
                    ))}

                    <div className="sm:col-span-6 text-right">
                        <p className="text-xl font-bold text-gray-800">
                            Toplam: {Math.round(getTotalAmount())} ₺
                        </p>
                    </div>
                </FormSection>

                <FormSection title="Ek Bilgiler">
                    <div className="sm:col-span-6">
                        <FormInput 
                            label="Notlar" 
                            name="notes" 
                            value={invoiceData.notes} 
                            onChange={handleChange}
                            placeholder="Fatura için ek notlar..."
                        />
                    </div>
                </FormSection>

                <div className="flex justify-end pt-8 mt-8 border-t border-gray-200 space-x-4">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300"
                    >
                        İptal
                    </button>
                    <button 
                        type="submit" 
                        disabled={isGenerating || invoiceData.items.length === 0} 
                        className="px-6 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? 'Oluşturuluyor...' : 'Fatura Oluştur'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default InvoiceGenerator;
