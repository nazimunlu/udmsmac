import React, { useState, useRef } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';
import { FormInput } from './Form';
import { Icon, ICONS } from './Icons';

const CustomTimePicker = ({ label, value, onChange, name, options }) => {
    const [isOpen, setIsOpen] = useState(false);
    const pickerRef = useRef(null);
    useClickOutside(pickerRef, () => setIsOpen(false));

    const handleSelect = (option) => {
        onChange({ target: { name, value: option } });
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={pickerRef}>
            <FormInput 
                label={label} 
                value={value} 
                readOnly 
                onClick={() => setIsOpen(!isOpen)} 
                icon={<Icon path={ICONS.CLOCK} className="w-5 h-5 text-gray-400"/>}
                className="cursor-pointer"
            />
            {isOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md max-h-60 overflow-auto border border-gray-200">
                    <ul className="py-1">
                        {options.map(option => (
                            <li key={option} onClick={() => handleSelect(option)} className="px-3 py-2 text-sm text-gray-700 hover:bg-blue-500 hover:text-white cursor-pointer">
                                {option}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default CustomTimePicker;