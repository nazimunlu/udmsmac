import React, { useState, useEffect } from 'react';
import { subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';
import { Icon, ICONS } from './Icons';

const DateRangePicker = ({ onDateChange, initialRange }) => {
    const [range, setRange] = useState('this-month');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [currentRange, setCurrentRange] = useState({ startDate: null, endDate: null });

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
        const dateRange = { startDate, endDate };
        setCurrentRange(dateRange);
        onDateChange(dateRange);
    };

    const handleCustomDateChange = () => {
        if (customStart && customEnd) {
            const dateRange = { startDate: new Date(customStart), endDate: new Date(customEnd) };
            setCurrentRange(dateRange);
            onDateChange(dateRange);
        }
    };

    useEffect(() => {
        if (initialRange) {
            setCurrentRange(initialRange);
            // Determine which preset matches the initial range
            const now = new Date();
            const thisMonthStart = startOfMonth(now);
            const thisMonthEnd = endOfMonth(now);
            const last3MonthsStart = startOfMonth(subMonths(now, 2));
            const last3MonthsEnd = endOfMonth(now);
            const last6MonthsStart = startOfMonth(subMonths(now, 5));
            const last6MonthsEnd = endOfMonth(now);
            const ytdStart = startOfYear(now);
            const ytdEnd = now;
            const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
            const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);
            
            // Helper function to compare dates by date only (ignoring time)
            const isSameDate = (date1, date2) => {
                return date1.getFullYear() === date2.getFullYear() &&
                       date1.getMonth() === date2.getMonth() &&
                       date1.getDate() === date2.getDate();
            };

            // Check which preset matches the initial range
            if (isSameDate(initialRange.startDate, thisMonthStart) && 
                isSameDate(initialRange.endDate, thisMonthEnd)) {
                setRange('this-month');
            } else if (isSameDate(initialRange.startDate, last3MonthsStart) && 
                       isSameDate(initialRange.endDate, last3MonthsEnd)) {
                setRange('last-3-months');
            } else if (isSameDate(initialRange.startDate, last6MonthsStart) && 
                       isSameDate(initialRange.endDate, last6MonthsEnd)) {
                setRange('last-6-months');
            } else if (isSameDate(initialRange.startDate, ytdStart) && 
                       isSameDate(initialRange.endDate, ytdEnd)) {
                setRange('ytd');
            } else if (isSameDate(initialRange.startDate, lastYearStart) && 
                       isSameDate(initialRange.endDate, lastYearEnd)) {
                setRange('last-year');
            } else {
                setRange('custom');
                setCustomStart(format(initialRange.startDate, 'yyyy-MM-dd'));
                setCustomEnd(format(initialRange.endDate, 'yyyy-MM-dd'));
            }
        } else {
            handlePresetChange('this-month');
        }
    }, [initialRange]);

    const formatDateRange = (startDate, endDate) => {
        if (!startDate || !endDate) return '';
        
        const startDay = format(startDate, 'd');
        const endDay = format(endDate, 'd');
        const startMonth = format(startDate, 'MMMM');
        const endMonth = format(endDate, 'MMMM');
        const startYear = format(startDate, 'yyyy');
        const endYear = format(endDate, 'yyyy');
        
        // Same month and year
        if (startMonth === endMonth && startYear === endYear) {
            return `${startDay}-${endDay} ${startMonth} ${startYear}`;
        }
        
        // Same year, different months
        if (startYear === endYear) {
            return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${startYear}`;
        }
        
        // Different years
        return `${startDay} ${startMonth} ${startYear} - ${endDay} ${endMonth} ${endYear}`;
    };

    return (
        <div className="flex flex-wrap items-center gap-4 p-4 bg-white rounded-lg shadow-sm">
            {/* Date Range Display */}
            <div className="flex items-center gap-2">
                <Icon path={ICONS.CALENDAR} className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                    {currentRange.startDate && currentRange.endDate 
                        ? formatDateRange(currentRange.startDate, currentRange.endDate)
                        : 'Select date range'
                    }
                </span>
            </div>
            
            <select
                value={range}
                onChange={(e) => {
                    const newRange = e.target.value;
                    setRange(newRange);
                    if (newRange !== 'custom') {
                        handlePresetChange(newRange);
                    }
                }}
                className="p-2 border border-gray-300 rounded-md text-sm"
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
                        className="p-2 border border-gray-300 rounded-md text-sm"
                    />
                    <span className="text-sm text-gray-500">to</span>
                    <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="p-2 border border-gray-300 rounded-md text-sm"
                    />
                    <button 
                        onClick={handleCustomDateChange} 
                        className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        title="Apply custom date range"
                    >
                        <Icon path={ICONS.CHECK} className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default DateRangePicker;
