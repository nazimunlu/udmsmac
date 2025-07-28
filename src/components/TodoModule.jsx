import React, { useState, useEffect, useMemo, useCallback } from 'react';
import apiClient from '../apiClient';
import { supabase } from '../supabaseClient';
import { Icon, ICONS } from './Icons';
import { useNotification } from '../contexts/NotificationContext';
import { useAppContext } from '../contexts/AppContext';
import { formatDistanceToNow, isPast, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';
import CustomTimePicker from './CustomTimePicker';

const TodoModule = () => {
    const { todos, fetchData, lessons } = useAppContext();
    const [newTask, setNewTask] = useState('');
    const [dueTime, setDueTime] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showNotification } = useNotification();

    // Function to create attendance reminder tasks
    const createAttendanceReminderTasks = useCallback(async () => {
        if (!lessons || lessons.length === 0) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const now = new Date();
        const existingTasks = todos || [];

        for (const lesson of lessons) {
            if (lesson.status === 'Complete' && (!lesson.attendance || Object.keys(lesson.attendance).length === 0)) {
                const lessonEndDateTime = new Date(`${lesson.lessonDate}T${lesson.endTime || '10:00'}`);
                const reminderTime = new Date(lessonEndDateTime.getTime() + 30 * 60 * 1000); // 30 minutes after end time

                // Only create task if reminder time is in the future and no similar task exists
                if (reminderTime > now) {
                    const taskDescription = `Log attendance for ${lesson.topic} (${lesson.groupName || 'Group'})`;
                    
                    // Check if similar task already exists
                    const existingTask = existingTasks.find(task => 
                        task.task.includes(lesson.topic) && 
                        task.task.includes('Log attendance') &&
                        !task.isCompleted
                    );

                    if (!existingTask) {
                        try {
                            await apiClient.create('todos', {
                                task: taskDescription,
                                userId: user.id,
                                dueDate: reminderTime.toISOString(),
                                lessonId: lesson.id,
                                isAttendanceReminder: true
                            });
                        } catch (error) {
                            console.error('Error creating attendance reminder task:', error);
                        }
                    }
                }
            }
        }
    }, [lessons, todos]);

    // Create attendance reminder tasks when lessons change
    useEffect(() => {
        createAttendanceReminderTasks();
    }, [createAttendanceReminderTasks]);

    // Clean up completed attendance reminder tasks
    const cleanupCompletedAttendanceTasks = useCallback(async () => {
        if (!todos || todos.length === 0) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        for (const todo of todos) {
            if (todo.isAttendanceReminder && todo.lessonId) {
                // Check if attendance has been logged for this lesson
                const lesson = lessons?.find(l => l.id === todo.lessonId);
                if (lesson && lesson.attendance && Object.keys(lesson.attendance).length > 0) {
                    // Delete the reminder task since attendance has been logged
                    try {
                        await apiClient.delete('todos', todo.id);
                    } catch (error) {
                        console.error('Error deleting completed attendance reminder task:', error);
                    }
                }
            }
        }
    }, [todos, lessons]);

    // Clean up tasks when lessons or todos change
    useEffect(() => {
        cleanupCompletedAttendanceTasks();
    }, [cleanupCompletedAttendanceTasks]);

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

    const handleSubmit = async (e) => {
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

    const toggleComplete = async (id) => {
        try {
            await apiClient.update('todos', id, { isCompleted: !isCompleted });
            fetchData();
        } catch (error) {
            showNotification('Error updating task.', 'error');
            console.error('Error updating task:', error);
        }
    };

    const deleteTodo = async (id) => {
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

    const pendingCount = useMemo(() => todos?.filter(t => !t.isCompleted)?.length || 0, [todos]);

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 h-full flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 p-4 md:p-6 border-b border-gray-200">
                <div className="flex items-center">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-sm mr-3">
                        <Icon path={ICONS.CHECK} className="w-4 h-4 md:w-5 md:h-5 text-white"/>
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-gray-800">Task Management</h3>
                </div>
            </div>
            
            {/* Add Task Form */}
            <div className="flex-shrink-0 bg-gray-50 rounded-2xl m-4 md:m-6 p-4 shadow-sm border border-gray-200">
                <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-3 md:mb-4">New Task</h3>
                <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
                    <div>
                <input
                    type="text"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                            placeholder="What needs to be done?"
                            className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500 transition-all duration-300 text-gray-700 placeholder-gray-500 text-sm md:text-base"
                    disabled={isSubmitting}
                />
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-end space-y-3 sm:space-y-0 sm:space-x-3 md:space-x-4">
                        <div className="flex-1 w-full sm:w-auto">
                            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Due Time (Optional)</label>
                    <CustomTimePicker
                        value={dueTime}
                        onChange={(e) => setDueTime(e.target.value)}
                        options={timeOptions}
                                className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500 transition-all duration-300 text-gray-700 text-sm md:text-base"
                        disabled={isSubmitting}
                        placeholder="Select Time"
                    />
                        </div>
                        <button 
                            type="submit"
                            className="w-full sm:w-auto px-4 md:px-6 py-2 md:py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all duration-300 font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                            disabled={isSubmitting || !newTask.trim()}
                        >
                            + Add Task
                        </button>
                    </div>
                </form>
            </div>
            
            {/* Tasks List */}
            <div className="flex-1 bg-gray-50 rounded-2xl mx-4 md:mx-6 mb-4 md:mb-6 shadow-sm border border-gray-200 flex flex-col min-h-0">
                <div className="flex-shrink-0 p-3 md:p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base md:text-lg font-semibold text-gray-800 flex items-center">
                            <Icon path={ICONS.LIST} className="w-4 h-4 md:w-5 md:h-5 mr-2 text-gray-600"/>
                            Your Tasks
                        </h3>
                    </div>
                </div>
                <div className="flex-1 p-3 md:p-4 overflow-y-auto">
                    {memoizedTodos.length > 0 ? (
                        <div className="space-y-2 md:space-y-3">
                            {memoizedTodos.map((todo) => (
                                <div
                                    key={todo.id}
                                    className="bg-white rounded-xl p-3 md:p-4 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center space-x-2 md:space-x-3">
                                                <button
                                                    onClick={() => toggleComplete(todo.id)}
                                                    className={`flex-shrink-0 w-5 h-5 md:w-6 md:h-6 rounded-full border-2 transition-all duration-300 ${
                                                        todo.isCompleted
                                                            ? 'bg-green-500 border-green-500'
                                                            : 'border-gray-300 hover:border-green-400'
                                                    }`}
                                                >
                                                    {todo.isCompleted && (
                                                        <Icon path={ICONS.CHECK} className="w-3 h-3 md:w-4 md:h-4 text-white mx-auto" />
                                                    )}
                                                </button>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-gray-800 font-medium text-sm md:text-base ${
                                                        todo.isCompleted ? 'line-through text-gray-500' : ''
                                                    }`}>
                                                        {todo.task}
                                                    </p>
                                                    {todo.dueDate && todo.timeInfo && (
                                                        <div className="flex items-center mt-1 text-xs md:text-sm">
                                                            <Icon path={ICONS.CLOCK} className="w-3 h-3 mr-1 text-gray-400" />
                                                            <span className={`font-medium ${todo.timeInfo.color}`}>
                                                                {todo.timeInfo.text}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => deleteTodo(todo.id)}
                                            className="flex-shrink-0 ml-2 md:ml-3 p-1 text-gray-400 hover:text-red-500 transition-colors duration-200"
                                        >
                                            <Icon path={ICONS.TRASH} className="w-3 h-3 md:w-4 md:h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-6 md:py-8 text-center">
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-full flex items-center justify-center mb-2 md:mb-3">
                                <Icon path={ICONS.CHECK} className="w-6 h-6 md:w-8 md:h-8 text-green-500" />
                            </div>
                            <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-1">You're all caught up!</h3>
                            <p className="text-gray-500 text-xs md:text-sm">No tasks pending. Great job!</p>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
};

export default TodoModule;
