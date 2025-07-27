import React, { useState, useEffect, useMemo, useCallback } from 'react';
import apiClient from '../apiClient';
import { supabase } from '../supabaseClient';
import { Icon, ICONS } from './Icons';
import { useNotification } from '../contexts/NotificationContext';
import { useAppContext } from '../contexts/AppContext';
import { formatDistanceToNow, isPast, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';
import CustomTimePicker from './CustomTimePicker';

const TodoModule = () => {
    const { todos, fetchData } = useAppContext();
    const [newTask, setNewTask] = useState('');
    const [dueTime, setDueTime] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showNotification } = useNotification();

    const timeOptions = useMemo(() => {
        const options = [];
        for (let h = 0; h < 24; h++) {
            for (let m = 0; m < 60; m += 30) {
                options.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
            }
        }
        return options;
    }, []);

    const getTimeRemaining = useCallback((date) => {
        if (!date) return null;
        const targetDate = new Date(date);
        const now = new Date();
        
        if (isPast(targetDate)) {
            const overdueMinutes = Math.abs(differenceInMinutes(targetDate, now));
            const overdueHours = Math.abs(differenceInHours(targetDate, now));
            const overdueDays = Math.abs(differenceInDays(targetDate, now));
            
            let overdueText = '';
            if (overdueDays > 0) {
                overdueText = `${overdueDays}d overdue`;
            } else if (overdueHours > 0) {
                overdueText = `${overdueHours}h overdue`;
            } else {
                overdueText = `${overdueMinutes}m overdue`;
            }
            
            return {
                text: overdueText,
                color: 'text-red-500'
            };
        }
        
        const remainingMinutes = differenceInMinutes(targetDate, now);
        const remainingHours = differenceInHours(targetDate, now);
        const remainingDays = differenceInDays(targetDate, now);
        
        let remainingText = '';
        let color = 'text-gray-500';
        
        if (remainingDays > 0) {
            remainingText = `${remainingDays}d remaining`;
            if (remainingDays <= 1) {
                color = 'text-orange-500';
            }
        } else if (remainingHours > 0) {
            remainingText = `${remainingHours}h remaining`;
            color = 'text-orange-500';
        } else if (remainingMinutes > 0) {
            remainingText = `${remainingMinutes}m remaining`;
            color = 'text-red-500';
        } else {
            remainingText = 'Due now';
            color = 'text-red-500';
        }
        
        return {
            text: remainingText,
            color
        };
    }, []);

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!newTask.trim()) return;

        setIsSubmitting(true);
        const { data: { user } } = await supabase.auth.getUser();

        let dueDate = null;
        if (dueTime) {
            const [hours, minutes] = dueTime.split(':');
            const now = new Date();
            now.setHours(hours, minutes, 0, 0);
            dueDate = now.toISOString();
        }

        if (user) {
            try {
                await apiClient.create('todos', { 
                    task: newTask, 
                    userId: user.id,
                    dueDate: dueDate
                });
                setNewTask('');
                setDueTime('');
                fetchData();
            } catch (error) {
                showNotification('Error adding task.', 'error');
                console.error('Error adding task:', error);
            }
        }
        setIsSubmitting(false);
    };

    const toggleTask = async (id, isCompleted) => {
        try {
            await apiClient.update('todos', id, { isCompleted: !isCompleted });
            fetchData();
        } catch (error) {
            showNotification('Error updating task.', 'error');
            console.error('Error updating task:', error);
        }
    };

    const deleteTask = async (id) => {
        try {
            await apiClient.delete('todos', id);
            fetchData();
        } catch (error) {
            showNotification('Error deleting task.', 'error');
            console.error('Error deleting task:', error);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md h-full flex flex-col">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                <Icon path={ICONS.CHECK} className="w-6 h-6 mr-3 text-blue-600" />
                To-Do List
            </h3>
            <form onSubmit={handleAddTask} className="flex flex-col gap-2 mb-4">
                <input
                    type="text"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    placeholder="Add a new task..."
                    className="flex-grow p-2 border border-gray-300 rounded-md"
                    disabled={isSubmitting}
                />
                <div className="flex gap-2">
                    <CustomTimePicker
                        value={dueTime}
                        onChange={(e) => setDueTime(e.target.value)}
                        options={timeOptions}
                        className="p-2 border border-gray-300 rounded-md"
                        disabled={isSubmitting}
                        placeholder="Select Time"
                    />
                    <button type="submit" className="p-2 bg-blue-600 text-white rounded-md flex-grow" disabled={isSubmitting}>
                        <Icon path={ICONS.ADD} className="mx-auto" />
                    </button>
                </div>
            </form>
            <ul className="space-y-2 overflow-y-auto flex-grow">
                {useMemo(() => todos.map(todo => {
                    const timeInfo = getTimeRemaining(todo.dueDate);
                    return (
                        <li key={todo.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 group border border-gray-100">
                            <div className="flex items-center flex-1">
                                <input
                                    type="checkbox"
                                    checked={todo.isCompleted}
                                    onChange={() => toggleTask(todo.id, todo.isCompleted)}
                                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <div className="ml-3 flex-1">
                                    <span className={`${todo.isCompleted ? 'line-through text-gray-500' : 'text-gray-800'} font-medium`}>
                                        {todo.task}
                                    </span>
                                    {todo.dueDate && timeInfo && (
                                        <p className={`text-xs ${timeInfo.color} mt-1`}>
                                            {timeInfo.text}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button 
                                onClick={() => deleteTask(todo.id)}
                                className="p-1 rounded-full text-gray-400 hover:text-red-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Icon path={ICONS.DELETE} className="w-4 h-4" />
                            </button>
                        </li>
                    );
                }), [todos, getTimeRemaining, toggleTask, deleteTask])}
                {todos.length === 0 && (
                    <div className="text-center text-gray-500 py-4 flex flex-col items-center justify-center h-full">
                        <Icon path={ICONS.CHECK} className="w-12 h-12 text-green-500 mb-2" />
                        <p className="font-semibold">You're all caught up!</p>
                    </div>
                )}
            </ul>
        </div>
    );
};

export default TodoModule;
