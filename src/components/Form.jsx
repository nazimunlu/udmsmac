import React from 'react';

export const FormInput = ({ label, icon, ...props }) => (
    <div>
        {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
        <div className="relative">
            <input {...props} className={`block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${icon ? 'pr-10' : ''}`} />
            {icon && <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">{icon}</span>}
        </div>
    </div>
);

export const FormSelect = ({ label, children, ...props }) => (
     <div>
        {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
        <select {...props} className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
            {children}
        </select>
    </div>
);

export const FormSection = ({ title, children }) => (
    <fieldset className="mt-6 border-t border-gray-200 pt-6">
        <legend className="text-lg font-medium text-gray-900">{title}</legend>
        <div className="mt-4 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">{children}</div>
    </fieldset>
);