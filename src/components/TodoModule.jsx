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
                overdueText = `${overdueDays}d ${overdueHours % 24}h overdue`;
            } else if (overdueHours > 0) {
                overdueText = `${overdueHours}h ${overdueMinutes % 60}m overdue`;
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
            remainingText = `${remainingDays}d ${remainingHours % 24}h remaining`;
            if (remainingDays <= 1) {
                color = 'text-orange-500';
            }
        } else if (remainingHours > 0) {
            remainingText = `${remainingHours}h ${remainingMinutes % 60}m remaining`;
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

    // Memoize the todos list to prevent unnecessary re-renders
    const memoizedTodos = useMemo(() => todos.map(todo => {
        const timeInfo = getTimeRemaining(todo.dueDate);
        return {
            ...todo,
            timeInfo
        };
    }), [todos, getTimeRemaining]);

    return (
        <div className="relative p-4 md:p-8 bg-white rounded-lg shadow-lg">
            {/* Simple Premium Header */}
            <div className="mb-8">
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
                    <div className="flex items-center">
                        <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center shadow-sm mr-4">
                            <Icon path={ICONS.CHECK} className="w-7 h-7 text-white"/>
                        </div>
                        <div>
                            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">Task Management</h2>
                            <p className="text-gray-600 text-sm lg:text-base">Organize your daily tasks and priorities</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <div className="text-sm text-gray-600">
                            <span className="font-medium">{todos.filter(t => !t.isCompleted).length}</span> pending tasks
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Task Form */}
            <div className="bg-gray-50 rounded-2xl p-6 shadow-sm border border-gray-200 mb-6">
                <form onSubmit={handleAddTask} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">New Task</label>
                        <input
                            type="text"
                            value={newTask}
                            onChange={(e) => setNewTask(e.target.value)}
                            placeholder="What needs to be done?"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Due Time (Optional)</label>
                            <CustomTimePicker
                                value={dueTime}
                                onChange={(e) => setDueTime(e.target.value)}
                                options={timeOptions}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                                disabled={isSubmitting}
                                placeholder="Select Time"
                            />
                        </div>
                        <div className="flex items-end">
                            <button 
                                type="submit" 
                                className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed" 
                                disabled={isSubmitting || !newTask.trim()}
                            >
                                <Icon path={ICONS.ADD} className="w-5 h-5" />
                                <span className="font-medium">Add Task</span>
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Tasks List */}
            <div className="bg-gray-50 rounded-2xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <Icon path={ICONS.LIST} className="w-5 h-5 mr-2 text-orange-600" />
                        Your Tasks
                    </h3>
                </div>
                <div className="p-6">
                    {todos.length > 0 ? (
                        <ul className="space-y-3">
                            {memoizedTodos.map(todo => (
                                <li key={todo.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-white group border border-gray-200 transition-all duration-200 bg-white">
                                    <div className="flex items-center flex-1">
                                        <input
                                            type="checkbox"
                                            checked={todo.isCompleted}
                                            onChange={() => toggleTask(todo.id, todo.isCompleted)}
                                            className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer transition-colors"
                                        />
                                        <div className="ml-4 flex-1">
                                            <span className={`${todo.isCompleted ? 'line-through text-gray-500' : 'text-gray-800'} font-medium text-base`}>
                                                {todo.task}
                                            </span>
                                            {todo.dueDate && todo.timeInfo && (
                                                <div className="flex items-center mt-1">
                                                    <span className={`text-xs font-medium ${todo.timeInfo.color}`}>
                                                        {todo.timeInfo.text}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => deleteTask(todo.id)}
                                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all duration-200"
                                        title="Delete task"
                                    >
                                        <Icon path={ICONS.DELETE} className="w-4 h-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Icon path={ICONS.CHECK} className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">You're all caught up!</h3>
                            <p className="text-gray-600">No tasks pending. Great job!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TodoModule;
