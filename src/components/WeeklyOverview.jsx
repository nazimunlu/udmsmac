import React from 'react';
import { formatDate } from '../utils/formatDate';

const WeeklyOverview = ({ events }) => {
    const hours = Array.from({ length: 16 }, (_, i) => i + 8); 
    
    const today = new Date();
    const startOfWeek = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)));
    
    const weekDates = Array.from({length: 7}).map((_, i) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        return date;
    });

    const getDayIndex = (date) => (date.getDay() + 6) % 7; 
    const todayIndex = getDayIndex(new Date());
    
    const getEventColor = (type) => {
        switch(type) {
            case 'lesson': return 'rgb(59, 130, 246)';
            case 'birthday': return 'rgb(236, 72, 153)';
            case 'event': return 'rgb(16, 185, 129)';
            default: return 'rgb(107, 114, 128)';
        }
    }
    
    return (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-[100px_repeat(7,_minmax(0,_1fr))]">
                <div className="row-start-1 col-start-1"></div>
                {weekDates.map((date, i) => (
                    <div key={i} className={`text-center font-semibold p-2 border-l border-gray-200 ${i === todayIndex ? 'text-blue-600' : 'text-gray-600'}`}>
                        <div>{new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date)}</div>
                        <div className="text-xs font-normal">{formatDate(date, { format: 'short' })}</div>
                    </div>
                ))}
            
                <div className="col-start-1 col-span-1 row-start-2 grid" style={{gridTemplateRows: `repeat(${hours.length}, minmax(0, 1fr))`}}>
                     {hours.map(hour => (
                        <div key={hour} className="h-12 text-center pr-2 border-t border-gray-200 flex items-center justify-center">
                            <span className="text-sm text-gray-700">{`${hour.toString().padStart(2, '0')}:00`}</span>
                        </div>
                    ))}
                </div>
                <div className="col-start-2 col-span-7 row-start-2 grid grid-cols-7 relative" style={{gridTemplateRows: `repeat(${hours.length}, minmax(0, 1fr))`}}>
                    {Array.from({length: hours.length * 7}).map((_, i) => (
                        <div key={i} className="border-l border-t border-gray-200"></div>
                    ))}

                    {events.map(event => {
                        const startTime = new Date(event.startTime);
                        const endTime = event.type === 'lesson' 
                            ? new Date(startTime.getTime() + 2 * 60 * 60 * 1000)
                            : (event.endTime ? new Date(event.endTime) : new Date(startTime.getTime() + 1 * 60 * 60 * 1000));
                        
                        const dayIndex = getDayIndex(startTime);
                        
                        const startHour = startTime.getHours() + startTime.getMinutes() / 60;
                        const endHour = endTime.getHours() + endTime.getMinutes() / 60;
                        
                        if (endHour < 8 || startHour > 23 || event.type === 'birthday') return null;

                        const top = ((Math.max(startHour, 8) - 8) / hours.length) * 100;
                        const height = ((Math.min(endHour, 24) - Math.max(startHour, 8)) / hours.length) * 100;
                        const left = (dayIndex / 7) * 100;
                        const width = (1/7) * 100;

                        return (
                            <div key={event.id} className="absolute p-1 rounded text-white text-xs overflow-hidden mx-px flex flex-col justify-center items-center text-center" 
                                 style={{ 
                                    top: `${top}%`,
                                    height: `${height}%`,
                                    left: `${left}%`,
                                    width: `calc(${width}% - 2px)`,
                                    backgroundColor: getEventColor(event.type)
                                 }}>
                                <p className="font-bold truncate w-full">{event.eventName}</p>
                                <p className="text-[0.6rem] text-white/80 truncate w-full">{new Date(startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hourCycle: 'h23'})} - {new Date(endTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hourCycle: 'h23'})}</p>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

export default WeeklyOverview;