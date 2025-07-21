import React, { useState, useEffect, useRef } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';
import { FormInput } from './Form';
import { Icon, ICONS } from './Icons';

const CustomTimePicker = ({ label, value, onChange, name }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [openUpwards, setOpenUpwards] = useState(false);
    const pickerRef = useRef(null);
    const inputRef = useRef(null);

    const timeOptions = [];
    for (let h = 8; h <= 23; h++) {
        for (let m = 0; m < 60; m += 30) {
            if (h === 8 && m === 0) continue; // Skip 8:00
            timeOptions.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
    }

    useClickOutside(pickerRef, () => setIsOpen(false));

    useEffect(() => {
        if (isOpen && inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;

            // Assume dropdown height is max-h-60 (240px) + some margin
            if (spaceBelow < 250 && spaceAbove > 250) {
                setOpenUpwards(true);
            } else {
                setOpenUpwards(false);
            }
        }
    }, [isOpen]);

    const handleSelect = (option) => {
        onChange({ target: { name, value: option } });
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={pickerRef}>
            <FormInput 
                label={label} 
                value={value || ''}
                placeholder="Select Time"
                readOnly 
                onClick={() => setIsOpen(!isOpen)} 
                icon={<Icon path={ICONS.CLOCK} className="w-5 h-5 text-gray-400"/>}
                className="cursor-pointer"
                ref={inputRef}
            />
            {isOpen && (
                <div className={`absolute z-10 w-full bg-white shadow-lg rounded-md max-h-60 overflow-auto border border-gray-200 ${openUpwards ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
                    <ul className="py-1">
                        {timeOptions.map(option => (
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