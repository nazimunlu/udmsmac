import React, { useState, useEffect } from 'react';
import { formatDate } from '../utils/formatDate';
import { Icon, ICONS } from './Icons';

const PaymentPlanPrint = ({ student, onClose }) => {
    
    
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatInstallmentDate = (dateString) => {
        return formatDate(new Date(dateString), 'dd/MM/yyyy');
    };

    const getStatusText = (status) => {
        switch (status?.toLowerCase()) {
            case 'paid':
                return 'Ödendi';
            case 'unpaid':
                return 'Ödenmedi';
            case 'partial':
                return 'Kısmi Ödeme';
            default:
                return status || 'Bilinmiyor';
        }
    };

    const getTurkishDayNames = (days) => {
        if (!days || !Array.isArray(days)) return '';
        
        const dayMap = {
            // Full names
            'monday': 'Pazartesi',
            'tuesday': 'Salı',
            'wednesday': 'Çarşamba',
            'thursday': 'Perşembe',
            'friday': 'Cuma',
            'saturday': 'Cumartesi',
            'sunday': 'Pazar',
            // Abbreviated names
            'mon': 'Pazartesi',
            'tue': 'Salı',
            'wed': 'Çarşamba',
            'thu': 'Perşembe',
            'fri': 'Cuma',
            'sat': 'Cumartesi',
            'sun': 'Pazar'
        };
        
        const result = days.map(day => {
            const dayLower = day.toLowerCase();
            return dayMap[dayLower] || day;
        }).join(', ');
        
        return result;
    };

    const handlePrint = () => {
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
        
        const studentName = turkishToAscii(student.fullName)
            .replace(/[^a-zA-Z\s]/g, '')
            .trim()
            .replace(/\s+/g, '_');
        const filename = `${studentName}_PaymentPlan.pdf`;
        
        // Store the original title
        const originalTitle = document.title;
        
        // Set the document title to the desired filename
        document.title = filename;
        
        // Print the document
        window.print();
        
        // Restore the original title after a short delay
        setTimeout(() => {
            document.title = originalTitle;
        }, 1000);
    };



    const handleClose = () => {
        onClose();
    };

    // Parse JSON fields if they're strings
    const feeDetails = typeof student.feeDetails === 'string' ? JSON.parse(student.feeDetails) : student.feeDetails;
    const installments = typeof student.installments === 'string' ? JSON.parse(student.installments) : student.installments;
    const tutoringDetails = typeof student.tutoringDetails === 'string' ? JSON.parse(student.tutoringDetails) : student.tutoringDetails;

    const totalAmount = student.isTutoring 
        ? (tutoringDetails?.totalCalculatedFee || 0)
        : (feeDetails?.totalFee || 0);

    const installmentCount = installments?.length || 0;
    const unpaidAmount = installments?.reduce((sum, inst) => {
        if (inst.status?.toLowerCase() !== 'paid') {
            return sum + (inst.amount || 0);
        }
        return sum;
    }, 0) || 0;
    
    // Calculate installment fee (amount per installment)
    const installmentFee = installments && installments.length > 0 ? installments[0].amount : 0;

    // Don't render if no valid student data
    if (!student || !student.id) {
        console.error('PaymentPlanPrint: No valid student data provided');
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] overflow-hidden">
                {/* Header */}
                <div className="bg-blue-600 text-white p-6 flex items-center justify-between print:hidden">
                    <div>
                        <h2 className="text-2xl font-bold">Ödeme Planı</h2>
                        <p className="text-blue-100">Payment Plan</p>
                    </div>
                    <div className="flex space-x-3">
                        <button
                            onClick={handlePrint}
                            className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                        >
                            <Icon path={ICONS.DOWNLOAD} className="w-4 h-4" />
                            <span>Yazdır</span>
                        </button>

                        <button
                            onClick={handleClose}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                        >
                            <Icon path={ICONS.CLOSE} className="w-4 h-4" />
                            <span>Kapat</span>
                        </button>
                    </div>
                </div>

                {/* Print Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(95vh-120px)] print:p-0 print:max-h-none">
                    <div className="print-content bg-white">
                        {/* Header for Print */}
                        <div className="hidden print:block mb-6 border-b-2 border-gray-800 pb-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900 mb-1">ÖDEME PLANI</h1>
                                    <p className="text-sm text-gray-700 font-medium">{student.fullName}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-600">{formatDate(new Date(), 'dd/MM/yyyy')}</p>
                                </div>
                            </div>
                        </div>

                        {/* Main Content - Two Column Layout */}
                        <div className="flex gap-6">
                            {/* Left Column */}
                            <div className="flex-1">
                                {/* Student Information */}
                                <div className="mb-4">
                                    <h3 className="text-sm font-bold text-gray-900 mb-2 border-b border-gray-300 pb-1">ÖĞRENCİ BİLGİLERİ</h3>
                                    <div className="grid grid-cols-1 gap-1 text-xs">
                                        <div className="flex justify-between">
                                            <span className="font-medium">Ad Soyad:</span>
                                            <span>{student.fullName}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-medium">T.C. Kimlik No:</span>
                                            <span>{student.nationalId || 'Belirtilmemiş'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-medium">İletişim:</span>
                                            <span>{student.studentContact}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-medium">Veli Adı:</span>
                                            <span>{student.parentName}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-medium">Veli İletişim:</span>
                                            <span>{student.parentContact}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-medium">Kayıt Tarihi:</span>
                                            <span>{formatDate(student.enrollmentDate, 'dd/MM/yyyy')}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Summary */}
                                <div className="mb-4">
                                    <h3 className="text-sm font-bold text-gray-900 mb-2 border-b border-gray-300 pb-1">ÖDEME ÖZETİ</h3>
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div className="bg-blue-50 p-2 text-center border border-blue-200">
                                            <div className="font-bold text-blue-900">{formatCurrency(totalAmount)}</div>
                                            <div className="text-blue-600">Toplam Tutar</div>
                                        </div>
                                        <div className="bg-green-50 p-2 text-center border border-green-200">
                                            <div className="font-bold text-green-900">{installmentCount}</div>
                                            <div className="text-green-600">Taksit Sayısı</div>
                                        </div>
                                        <div className="bg-orange-50 p-2 text-center border border-orange-200">
                                            <div className="font-bold text-orange-900">{formatCurrency(installmentFee)}</div>
                                            <div className="text-orange-600">Taksit Tutarı</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Tutoring Details (if applicable) */}
                                {student.isTutoring && tutoringDetails && (
                                    <div className="mb-4">
                                        <h3 className="text-sm font-bold text-gray-900 mb-2 border-b border-gray-300 pb-1">BİREYSEL DERS DETAYLARI</h3>
                                        <div className="grid grid-cols-1 gap-1 text-xs">
                                            <div className="flex justify-between">
                                                <span className="font-medium">Ders Başına Ücret:</span>
                                                <span>{formatCurrency(tutoringDetails.pricePerLesson || 0)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-medium">Toplam Ders Sayısı:</span>
                                                <span>{tutoringDetails.numberOfLessons || 0}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-medium">Ders Günleri:</span>
                                                <span>{getTurkishDayNames(tutoringDetails.schedule?.days)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-medium">Bitiş Tarihi:</span>
                                                <span>{tutoringDetails.endDate 
                                                    ? formatDate(new Date(tutoringDetails.endDate), 'dd/MM/yyyy')
                                                    : 'Belirtilmemiş'}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Column */}
                            <div className="flex-1">
                                {/* Installments Table */}
                                <div className="mb-4">
                                    <h3 className="text-sm font-bold text-gray-900 mb-2 border-b border-gray-300 pb-1">TAKSİT DETAYLARI</h3>
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-purple-100">
                                                <th className="border border-purple-300 px-2 py-1 text-center text-purple-900">No</th>
                                                <th className="border border-purple-300 px-2 py-1 text-center text-purple-900">Tutar</th>
                                                <th className="border border-purple-300 px-2 py-1 text-center text-purple-900">Vade</th>
                                                <th className="border border-purple-300 px-2 py-1 text-center text-purple-900">Durum</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {installments && installments.length > 0 ? (
                                                installments.map((installment, index) => (
                                                    <tr key={index} className="hover:bg-gray-50">
                                                        <td className="border border-purple-200 px-2 py-1 text-center font-medium">
                                                            {installment.number}
                                                        </td>
                                                        <td className="border border-purple-200 px-2 py-1 text-center font-medium">
                                                            {formatCurrency(installment.amount)}
                                                        </td>
                                                        <td className="border border-purple-200 px-2 py-1 text-center">
                                                            {formatInstallmentDate(installment.dueDate)}
                                                        </td>
                                                        <td className="border border-purple-200 px-2 py-1 text-center">
                                                            <span className="print:hidden px-2 py-1 rounded text-xs font-medium ${
                                                                installment.status?.toLowerCase() === 'paid' 
                                                                    ? 'bg-green-100 text-green-800' 
                                                                    : 'bg-red-100 text-red-800'
                                                            }">
                                                                {getStatusText(installment.status)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="4" className="border border-purple-200 px-2 py-2 text-center text-gray-500">
                                                        Taksit planı bulunamadı
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Important Notes */}
                                <div className="mb-4">
                                    <h3 className="text-sm font-bold text-gray-900 mb-2 border-b border-gray-300 pb-1">ÖNEMLİ NOTLAR</h3>
                                    <div className="bg-yellow-50 border border-yellow-200 p-3 text-xs">
                                        <div className="space-y-2 text-gray-700">
                                            <p>1. Taksitler vade tarihinde ödenmelidir.</p>
                                            <p>2. Kurum, vadesi geçen ödemeler için gerekli resmi kuruluşlara başvurma, ve yasal takip talebinde bulunma hakkına sahiptir.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Signature Section - Only for Print */}
                        <div className="print:block hidden mt-8 pt-6">
                            <div className="flex justify-between">
                                <div className="text-center flex-1">
                                    <div className="border-b-2 border-gray-400 mb-3" style={{ minHeight: '60px', width: '100%' }}>
                                    </div>
                                    <p className="text-sm font-bold text-gray-900 mb-1">&nbsp;</p>
                                    <p className="text-xs text-gray-600">ÖĞRENCİ / VELİ</p>
                                </div>
                                <div className="text-center flex-1">
                                    <div className="border-b-2 border-gray-400 mb-3" style={{ minHeight: '60px', width: '100%' }}>
                                    </div>
                                    <p className="text-sm font-bold text-gray-900 mb-1">Nazım Ünlü</p>
                                    <p className="text-xs text-gray-600">KURUCU MÜDÜR</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                    @media print {
                        /* Hide everything except print content */
                        body * {
                            visibility: hidden !important;
                        }
                        .print-content, .print-content * {
                            visibility: visible !important;
                        }
                        
                        /* Reset and center the print content */
                        .print-content {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            margin: 0 !important;
                            padding: 15px !important;
                            background: white !important;
                            font-family: Arial, sans-serif !important;
                            text-align: left !important;
                            display: block !important;
                            line-height: 1.3 !important;
                        }
                        
                        /* Header styling */
                        .print-content h1 {
                            font-size: 18px !important;
                            font-weight: bold !important;
                            color: #1f2937 !important;
                            margin: 0 !important;
                            text-transform: uppercase !important;
                        }
                        
                        .print-content h3 {
                            font-size: 12px !important;
                            font-weight: bold !important;
                            color: #374151 !important;
                            margin: 0 0 8px 0 !important;
                            text-transform: uppercase !important;
                        }
                        
                        .print-content p {
                            margin: 2px 0 !important;
                            font-size: 10px !important;
                        }
                        
                        /* Two column layout */
                        .print-content .flex {
                            display: flex !important;
                            gap: 20px !important;
                        }
                        
                        .print-content .flex-1 {
                            flex: 1 !important;
                        }
                        
                        /* Grid styling */
                        .print-content .grid {
                            margin: 8px 0 !important;
                        }
                        
                        .print-content .grid-cols-1 > div {
                            display: flex !important;
                            justify-content: space-between !important;
                            margin: 2px 0 !important;
                            font-size: 10px !important;
                        }
                        
                        .print-content .grid-cols-3 {
                            display: grid !important;
                            grid-template-columns: 1fr 1fr 1fr !important;
                            gap: 8px !important;
                        }
                        
                        .print-content .grid-cols-3 > div {
                            background: #f8f9fa !important;
                            border: 1px solid #ddd !important;
                            padding: 6px !important;
                            text-align: center !important;
                            font-size: 10px !important;
                        }
                        
                        .print-content .grid-cols-2 {
                            display: grid !important;
                            grid-template-columns: 1fr 1fr !important;
                            gap: 8px !important;
                        }
                        
                        .print-content .grid-cols-2 > div {
                            display: flex !important;
                            justify-content: space-between !important;
                            margin: 2px 0 !important;
                            font-size: 10px !important;
                        }
                        
                        /* Table styling */
                        .print-content table {
                            width: 100% !important;
                            border-collapse: collapse !important;
                            margin: 8px 0 !important;
                            font-size: 9px !important;
                        }
                        
                        .print-content table th {
                            background: #f1f5f9 !important;
                            color: #1f2937 !important;
                            font-weight: bold !important;
                            padding: 4px 6px !important;
                            border: 1px solid #cbd5e1 !important;
                            text-align: left !important;
                        }
                        
                        .print-content table td {
                            border: 1px solid #cbd5e1 !important;
                            padding: 4px 6px !important;
                        }
                        
                        /* Status badges */
                        .print-content .bg-green-100 {
                            background: #dcfce7 !important;
                            color: #166534 !important;
                            font-weight: bold !important;
                            padding: 2px 4px !important;
                            border-radius: 3px !important;
                        }
                        
                        .print-content .bg-red-100 {
                            background: #fee2e2 !important;
                            color: #991b1b !important;
                            font-weight: bold !important;
                            padding: 2px 4px !important;
                            border-radius: 3px !important;
                        }
                        
                        /* Important notes */
                        .print-content .bg-yellow-50 {
                            background: #fffbeb !important;
                            border: 1px solid #fde68a !important;
                            padding: 8px !important;
                            margin: 8px 0 !important;
                        }
                        
                        .print-content .list-disc {
                            list-style-type: disc !important;
                        }
                        
                        .print-content .list-inside {
                            list-style-position: inside !important;
                        }
                        
                        .print-content .space-y-1 > * + * {
                            margin-top: 4px !important;
                        }
                        
                        /* Signature section */
                        .print-content .mt-8 {
                            margin-top: 25px !important;
                        }
                        
                        .print-content .pt-6 {
                            padding-top: 20px !important;
                        }
                        
                        .print-content .border-t-2 {
                            border-top: 2px solid #1f2937 !important;
                        }
                        
                        .print-content .border-b-2 {
                            border-bottom: 2px solid #9ca3af !important;
                        }
                        
                        .print-content .border-b {
                            border-bottom: 1px solid #9ca3af !important;
                        }
                        
                        .print-content .border {
                            border: 1px solid #9ca3af !important;
                        }
                        
                        .print-content .border-gray-300 {
                            border-color: #d1d5db !important;
                        }
                        
                        .print-content .border-gray-800 {
                            border-color: #1f2937 !important;
                        }
                        
                        .print-content .border-yellow-200 {
                            border-color: #fde68a !important;
                        }
                        
                        /* Flex utilities */
                        .print-content .flex {
                            display: flex !important;
                        }
                        
                        .print-content .justify-between {
                            justify-content: space-between !important;
                        }
                        
                        .print-content .items-end {
                            align-items: flex-end !important;
                        }
                        
                        .print-content .flex-1 {
                            flex: 1 !important;
                        }
                        
                        /* Space utilities */
                        .print-content .space-y-2 > * + * {
                            margin-top: 8px !important;
                        }
                        
                        /* Text utilities */
                        .print-content .text-xs {
                            font-size: 9px !important;
                        }
                        
                        .print-content .text-sm {
                            font-size: 11px !important;
                        }
                        
                        .print-content .text-xl {
                            font-size: 18px !important;
                        }
                        
                        .print-content .text-center {
                            text-align: center !important;
                        }
                        
                        .print-content .text-right {
                            text-align: right !important;
                        }
                        
                        .print-content .text-left {
                            text-align: left !important;
                        }
                        
                        .print-content .font-bold {
                            font-weight: bold !important;
                        }
                        
                        .print-content .font-medium {
                            font-weight: 500 !important;
                        }
                        
                        .print-content .text-gray-900 {
                            color: #111827 !important;
                        }
                        
                        .print-content .text-gray-600 {
                            color: #4b5563 !important;
                        }
                        
                        .print-content .text-gray-500 {
                            color: #6b7280 !important;
                        }
                        
                        .print-content .text-gray-700 {
                            color: #374151 !important;
                        }
                        
                        /* Spacing utilities */
                        .print-content .mb-1 {
                            margin-bottom: 4px !important;
                        }
                        
                        .print-content .mb-2 {
                            margin-bottom: 8px !important;
                        }
                        
                        .print-content .mb-4 {
                            margin-bottom: 15px !important;
                        }
                        
                        .print-content .mb-6 {
                            margin-bottom: 20px !important;
                        }
                        
                        .print-content .mt-4 {
                            margin-top: 15px !important;
                        }
                        
                        .print-content .pb-1 {
                            padding-bottom: 4px !important;
                        }
                        
                        .print-content .pb-4 {
                            padding-bottom: 15px !important;
                        }
                        
                        .print-content .pt-2 {
                            padding-top: 8px !important;
                        }
                        
                        .print-content .p-2 {
                            padding: 8px !important;
                        }
                        
                        .print-content .p-3 {
                            padding: 12px !important;
                        }
                        
                        .print-content .gap-2 {
                            gap: 8px !important;
                        }
                        
                        .print-content .gap-6 {
                            gap: 20px !important;
                        }
                        
                        .print-content .gap-8 {
                            gap: 25px !important;
                        }
                        
                        /* Hide screen-only elements */
                        .print-content .print\\:hidden {
                            display: none !important;
                        }
                        
                        /* Show print-only elements */
                        .print-content .hidden.print\\:block {
                            display: block !important;
                        }
                        
                        /* Prevent page breaks */
                        .print-content table {
                            page-break-inside: avoid !important;
                        }
                        
                        .print-content .flex {
                            page-break-inside: avoid !important;
                        }
                    }
                `
            }} />
        </div>
    );
};

export default PaymentPlanPrint; 