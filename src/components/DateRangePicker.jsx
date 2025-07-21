import React, { useState, useEffect } from 'react';
import { subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { Icon, ICONS } from './Icons';

const DateRangePicker = ({ onDateChange }) => {
    const [range, setRange] = useState('this-month');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const handlePresetChange = (preset) => {
        let startDate, endDate;
        const now = new Date();

        switch (preset) {
            case 'this-month':
                startDate = startOfMonth(now);
                endDate = endOfMonth(now);
                break;
            case 'last-3-months':
                startDate = startOfMonth(subMonths(now, 2));
                endDate = endOfMonth(now);
                break;
            case 'last-6-months':
                startDate = startOfMonth(subMonths(now, 5));
                endDate = endOfMonth(now);
                break;
            case 'ytd':
                startDate = startOfYear(now);
                endDate = now;
                break;
            case 'last-year':
                const lastYear = now.getFullYear() - 1;
                startDate = new Date(lastYear, 0, 1);
                endDate = new Date(lastYear, 11, 31);
                break;
            default:
                startDate = startOfMonth(now);
                endDate = endOfMonth(now);
        }
        onDateChange({ startDate, endDate });
    };

    const handleCustomDateChange = () => {
        if (customStart && customEnd) {
            onDateChange({ startDate: new Date(customStart), endDate: new Date(customEnd) });
        }
    };

    useEffect(() => {
        handlePresetChange('this-month');
    }, []);

    return (
        <div className="flex flex-wrap items-center gap-4 p-4 bg-white rounded-lg shadow-sm mb-6">
            <select
                value={range}
                onChange={(e) => {
                    const newRange = e.target.value;
                    setRange(newRange);
                    if (newRange !== 'custom') {
                        handlePresetChange(newRange);
                    }
                }}
                className="p-2 border border-gray-300 rounded-md"
            >
                <option value="this-month">This Month</option>
                <option value="last-3-months">Last 3 Months</option>
                <option value="last-6-months">Last 6 Months</option>
                <option value="ytd">Year to Date</option>
                <option value="last-year">Last Year</option>
                <option value="custom">Custom Range</option>
            </select>
            {range === 'custom' && (
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="p-2 border border-gray-300 rounded-md"
                    />
                    <span>to</span>
                    <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="p-2 border border-gray-300 rounded-md"
                    />
                    <button onClick={handleCustomDateChange} className="p-2 bg-blue-600 text-white rounded-md">
                        <Icon path={ICONS.CHECK} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default DateRangePicker;
