import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { FormInput, FormSelect, FormSection } from './Form';
import { useNotification } from '../contexts/NotificationContext';
import { useAppContext } from '../contexts/AppContext';
import { Icon, ICONS } from './Icons';
import { formatDate } from '../utils/formatDate';

const InvoiceGenerator = ({ isOpen, onClose, student }) => {
    const { showNotification } = useNotification();
    const { students } = useAppContext();
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [invoiceData, setInvoiceData] = useState({
        studentId: '',
        invoiceNumber: '',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [],
        notes: '',
        terms: 'Payment is due within 30 days of invoice date.'
    });
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (student) {
                setSelectedStudent(student);
                setInvoiceData(prev => ({
                    ...prev,
                    studentId: student.id,
                    invoiceNumber: `INV-${Date.now()}`,
                    items: student.installments?.filter(inst => inst.status === 'Unpaid').map(inst => ({
                        description: `Installment ${inst.number}`,
                        quantity: 1,
                        unitPrice: inst.amount,
                        amount: inst.amount
                    })) || []
                }));
            } else {
                setSelectedStudent(null);
                setInvoiceData({
                    studentId: '',
                    invoiceNumber: `INV-${Date.now()}`,
                    issueDate: new Date().toISOString().split('T')[0],
                    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    items: [],
                    notes: '',
                    terms: 'Payment is due within 30 days of invoice date.'
                });
            }
        }
    }, [isOpen, student]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setInvoiceData(prev => ({ ...prev, [name]: value }));
        
        if (name === 'studentId') {
            const selectedStudentData = students.find(s => s.id === value);
            setSelectedStudent(selectedStudentData);
            if (selectedStudentData) {
                setInvoiceData(prev => ({
                    ...prev,
                    items: selectedStudentData.installments?.filter(inst => inst.status === 'Unpaid').map(inst => ({
                        description: `Installment ${inst.number}`,
                        quantity: 1,
                        unitPrice: inst.amount,
                        amount: inst.amount
                    })) || []
                }));
            }
        }
    };

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
        return invoiceData.items.reduce((sum, item) => sum + item.amount, 0);
    };

    const generateInvoice = async () => {
        setIsGenerating(true);
        try {
            // Create invoice data
            const invoice = {
                ...invoiceData,
                totalAmount: getTotalAmount(),
                status: 'pending',
                createdAt: new Date().toISOString()
            };

            // In a real application, you would save this to the database
            // For now, we'll just generate a PDF-like display
            const invoiceWindow = window.open('', '_blank');
            invoiceWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Invoice ${invoiceData.invoiceNumber}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 40px; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .invoice-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
                        .student-info { margin-bottom: 30px; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                        th { background-color: #f8f9fa; }
                        .total { text-align: right; font-weight: bold; font-size: 18px; }
                        .footer { margin-top: 40px; font-size: 12px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>INVOICE</h1>
                        <h2>${invoiceData.invoiceNumber}</h2>
                    </div>
                    
                    <div class="invoice-info">
                        <div>
                            <strong>Issue Date:</strong> ${formatDate(invoiceData.issueDate)}<br>
                            <strong>Due Date:</strong> ${formatDate(invoiceData.dueDate)}
                        </div>
                        <div>
                            <strong>Invoice #:</strong> ${invoiceData.invoiceNumber}
                        </div>
                    </div>
                    
                    <div class="student-info">
                        <strong>Bill To:</strong><br>
                        ${selectedStudent?.fullName || 'Student Name'}<br>
                        ${selectedStudent?.studentContact || 'Contact Information'}
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th>Quantity</th>
                                <th>Unit Price</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${invoiceData.items.map(item => `
                                <tr>
                                    <td>${item.description}</td>
                                    <td>${item.quantity}</td>
                                    <td>${item.unitPrice.toFixed(2)} ₺</td>
                                    <td>${item.amount.toFixed(2)} ₺</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    
                    <div class="total">
                        Total Amount: ${getTotalAmount().toFixed(2)} ₺
                    </div>
                    
                    ${invoiceData.notes && `
                        <div style="margin-top: 20px;">
                            <strong>Notes:</strong><br>
                            ${invoiceData.notes}
                        </div>
                    `}
                    
                    <div class="footer">
                        <strong>Terms:</strong><br>
                        ${invoiceData.terms}
                    </div>
                </body>
                </html>
            `);
            invoiceWindow.document.close();
            invoiceWindow.print();

            showNotification('Invoice generated successfully!', 'success');
            onClose();
        } catch (error) {
            console.error("Error generating invoice:", error);
            showNotification('Failed to generate invoice.', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Generate Invoice" 
            size="lg"
            headerStyle={{ backgroundColor: '#2563EB' }}
        >
            <form onSubmit={(e) => { e.preventDefault(); generateInvoice(); }}>
                <FormSection title="Invoice Information">
                    <div className="sm:col-span-6">
                        <FormSelect 
                            label="Student" 
                            name="studentId" 
                            value={invoiceData.studentId} 
                            onChange={handleChange}
                            required
                            disabled={!!student}
                        >
                            <option value="">Select a student</option>
                            {students.map(s => (
                                <option key={s.id} value={s.id}>{s.fullName}</option>
                            ))}
                        </FormSelect>
                    </div>

                    <div className="sm:col-span-3">
                        <FormInput 
                            label="Invoice Number" 
                            name="invoiceNumber" 
                            value={invoiceData.invoiceNumber} 
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="sm:col-span-3">
                        <FormInput 
                            label="Issue Date" 
                            name="issueDate" 
                            type="date"
                            value={invoiceData.issueDate} 
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="sm:col-span-6">
                        <FormInput 
                            label="Due Date" 
                            name="dueDate" 
                            type="date"
                            value={invoiceData.dueDate} 
                            onChange={handleChange}
                            required
                        />
                    </div>
                </FormSection>

                <FormSection title="Invoice Items">
                    <div className="sm:col-span-6 mb-4">
                        <button 
                            type="button"
                            onClick={addItem}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                        >
                            <Icon path={ICONS.ADD} className="w-4 h-4 mr-2" />
                            Add Item
                        </button>
                    </div>

                    {invoiceData.items.map((item, index) => (
                        <div key={index} className="sm:col-span-6 grid grid-cols-12 gap-4 items-end mb-4 p-4 bg-gray-50 rounded-lg">
                            <div className="col-span-4">
                                <FormInput 
                                    label="Description" 
                                    name={`item-${index}-description`}
                                    value={item.description} 
                                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                                    required
                                />
                            </div>
                            <div className="col-span-2">
                                <FormInput 
                                    label="Quantity" 
                                    name={`item-${index}-quantity`}
                                    type="number"
                                    value={item.quantity} 
                                    onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                                    required
                                />
                            </div>
                            <div className="col-span-2">
                                <FormInput 
                                    label="Unit Price" 
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
                                    label="Amount" 
                                    name={`item-${index}-amount`}
                                    type="number"
                                    step="0.01"
                                    value={item.amount.toFixed(2)} 
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
                            Total: {getTotalAmount().toFixed(2)} ₺
                        </p>
                    </div>
                </FormSection>

                <FormSection title="Additional Information">
                    <div className="sm:col-span-6">
                        <FormInput 
                            label="Notes" 
                            name="notes" 
                            value={invoiceData.notes} 
                            onChange={handleChange}
                            placeholder="Additional notes for the invoice..."
                        />
                    </div>

                    <div className="sm:col-span-6">
                        <FormInput 
                            label="Terms & Conditions" 
                            name="terms" 
                            value={invoiceData.terms} 
                            onChange={handleChange}
                            placeholder="Payment terms and conditions..."
                        />
                    </div>
                </FormSection>

                <div className="flex justify-end pt-8 mt-8 border-t border-gray-200 space-x-4">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={isGenerating || invoiceData.items.length === 0} 
                        className="px-6 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? 'Generating...' : 'Generate Invoice'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default InvoiceGenerator;
