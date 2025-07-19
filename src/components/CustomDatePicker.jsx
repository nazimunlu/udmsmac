import React, { useState, useEffect, useRef } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useClickOutside } from '../hooks/useClickOutside';
import { formatDate } from '../utils/formatDate';
import { FormInput } from './Form';
import { Icon, ICONS } from './Icons';

const CustomDatePicker = ({ label, value, onChange, name }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const getInitialDate = (v) => {
        if (v && typeof v.toDate === 'function') return v.toDate();
        if (v instanceof Date) return v;
        if (typeof v === 'string' && v) return new Date(v.replace(/-/g, '/'));
        return new Date();
    };

    const [displayDate, setDisplayDate] = useState(getInitialDate(value));
    const pickerRef = useRef(null);
    useClickOutside(pickerRef, () => setIsOpen(false));

    useEffect(() => {
        setDisplayDate(getInitialDate(value));
    }, [value, isOpen]);

    const daysOfWeek = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const getFirstDayOfMonth = (date) => {
        const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
        return (day + 6) % 7; 
    };

    const firstDayOfMonth = getFirstDayOfMonth(displayDate);
    const daysInMonth = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0).getDate();

    const changeMonth = (offset) => {
        setDisplayDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    const handleSelectDate = (day) => {
        const selected = new Date(displayDate.getFullYear(), displayDate.getMonth(), day);
        const year = selected.getFullYear();
        const month = (selected.getMonth() + 1).toString().padStart(2, '0');
        const date = selected.getDate().toString().padStart(2, '0');
        const dateString = `${year}-${month}-${date}`;
        onChange({ target: { name, value: dateString } });
        setIsOpen(false);
    };

    let selectedDateObj = null;
    if (value && typeof value === 'string') {
        const [year, month, day] = value.split('-').map(Number);
        selectedDateObj = new Date(year, month - 1, day);
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const changeYear = (year) => {
        setDisplayDate(prev => new Date(year, prev.getMonth(), 1));
    };

    const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);

    return (
        <div className="relative" ref={pickerRef}>
            <FormInput 
                label={label} 
                value={value ? formatDate(value) : ''}
                readOnly 
                onClick={() => setIsOpen(!isOpen)} 
                icon={<Icon path={ICONS.CALENDAR} className="w-5 h-5 text-gray-400"/>}
                className="cursor-pointer"
            />
            {isOpen && (
                <div className="absolute z-20 mt-1 w-80 bg-white shadow-lg rounded-lg p-4 border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <button type="button" onClick={() => changeMonth(-1)} className="p-1 rounded-full hover:bg-gray-100"><Icon path={ICONS.CHEVRON_LEFT} className="w-5 h-5" /></button>
                        <div className="flex items-center">
                            <span className="font-semibold text-gray-800">{monthNames[displayDate.getMonth()]}</span>
                            {true ? (
                                <select onChange={(e) => changeYear(e.target.value)} value={displayDate.getFullYear()} className="ml-2 p-1 border-gray-300 rounded-md">
                                    {years.map(year => <option key={year} value={year}>{year}</option>)}
                                </select>
                            ) : (
                                <span className="font-semibold text-gray-800 ml-2">{displayDate.getFullYear()}</span>
                            )}
                        </div>
                        <button type="button" onClick={() => changeMonth(1)} className="p-1 rounded-full hover:bg-gray-100"><Icon path={ICONS.CHEVRON_RIGHT} className="w-5 h-5" /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-sm">
                        {daysOfWeek.map(day => <div key={day} className="font-medium text-gray-500">{day}</div>)}
                        {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`}></div>)}
                        {Array.from({ length: daysInMonth }).map((_, day) => {
                            const dayNumber = day + 1;
                            const date = new Date(displayDate.getFullYear(), displayDate.getMonth(), dayNumber);
                            const isSelected = selectedDateObj && date.getTime() === selectedDateObj.getTime();
                            const isToday = date.getTime() === today.getTime();

                            return (
                                <div key={dayNumber} onClick={() => handleSelectDate(dayNumber)} 
                                     className={`p-2 rounded-full cursor-pointer 
                                     ${isSelected ? 'bg-blue-600 text-white' : 
                                     isToday ? 'bg-blue-200 text-blue-700' : 
                                     'text-gray-700 hover:bg-gray-100'}`}>
                                    {dayNumber}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomDatePicker;