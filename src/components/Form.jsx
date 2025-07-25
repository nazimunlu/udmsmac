import React, { forwardRef } from 'react';
import { Icon, ICONS } from './Icons';

export const FormInput = forwardRef(({ label, icon, ...props }, ref) => (
    <div>
        {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
        <div className="relative">
            <input ref={ref} {...props} className={`block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${icon ? 'pr-10' : ''}`} />
            {icon && <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><Icon path={icon} className="w-5 h-5 text-gray-400"/></span>}
        </div>
    </div>
));

export const FormSelect = ({ label, children, ...props }) => (
     <div>
        {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
        <select {...props} className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
            {children}
        </select>
    </div>
);

export const FormSection = ({ title, children, titleRightContent }) => (
    <fieldset className="mt-6">
        <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-6">
            <legend className="text-lg font-medium text-gray-900">{title}</legend>
            {titleRightContent}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">{children}</div>
    </fieldset>
);