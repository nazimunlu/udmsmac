import React from 'react';
import { formatDate } from '../utils/formatDate';
import formatPhoneNumber from '../utils/formatPhoneNumber';

const InvoiceGenerator = ({ student, payment }) => {
    if (!student || !payment) return <p>No invoice data available.</p>;

    const invoiceDate = new Date();
    const dueDate = payment.dueDate ? payment.dueDate.toDate() : null;
    const paymentDate = payment.paymentDate ? payment.paymentDate.toDate() : null;

    return (
        <div className="p-6 bg-white rounded-lg shadow-md print:shadow-none print:p-0">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">INVOICE</h1>
                    <p className="text-sm text-gray-600">Date: {formatDate(invoiceDate)}</p>
                    <p className="text-sm text-gray-600">Invoice #: {payment.id || 'N/A'}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-semibold text-gray-700">Ünlü Dil Kursu</h2>
                    <p className="text-sm text-gray-600">[Your Address]</p>
                    <p className="text-sm text-gray-600">[Your Phone Number]</p>
                    <p className="text-sm text-gray-600">[Your Email]</p>
                </div>
            </div>

            <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Bill To:</h3>
                <p className="font-medium text-gray-800">{student.fullName}</p>
                <p className="text-sm text-gray-600">Contact: {formatPhoneNumber(student.studentContact)}</p>
                {student.parentContact && <p className="text-sm text-gray-600">Parent: {formatPhoneNumber(student.parentContact)}</p>}
            </div>

            <div className="overflow-x-auto mb-8">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead>
                        <tr className="bg-gray-100 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                            <th className="py-3 px-4 border-b">Description</th>
                            <th className="py-3 px-4 border-b text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-gray-200">
                            <td className="py-3 px-4 text-gray-800">{`Installment #${payment.number} for ${student.fullName} - ${student.isTutoring ? 'Tutoring' : 'Group'} Course` }</td>
                            <td className="py-3 px-4 text-right text-gray-800">₺{payment.amount ? payment.amount.toFixed(2) : '0.00'}</td>
                        </tr>
                        {/* Add more rows for other charges/discounts if applicable */}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td className="py-3 px-4 text-right font-semibold text-gray-800">Total Due:</td>
                            <td className="py-3 px-4 text-right font-bold text-gray-800">₺{payment.amount ? payment.amount.toFixed(2) : '0.00'}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-sm text-gray-700">
                <div>
                    <p><span className="font-semibold">Payment Status:</span> {payment.status}</p>
                    {dueDate && <p><span className="font-semibold">Due Date:</span> {formatDate(dueDate)}</p>}
                    {paymentDate && <p><span className="font-semibold">Payment Date:</span> {formatDate(paymentDate)}</p>}
                </div>
                <div>
                    <p className="font-semibold">Notes:</p>
                    <p>Thank you for your payment. Please contact us if you have any questions.</p>
                </div>
            </div>

            <div className="text-center text-gray-500 text-xs print:hidden">
                <p>This is a computer generated invoice and does not require a signature.</p>
            </div>
        </div>
    );
};

export default InvoiceGenerator;
