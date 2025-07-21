import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Icon, ICONS } from './Icons';
import { useNotification } from '../contexts/NotificationContext';
import { useAppContext } from '../contexts/AppContext';
import { formatDistanceToNow, isPast } from 'date-fns';
import CustomTimePicker from './CustomTimePicker';

const TodoModule = () => {
    const { todos, fetchData } = useAppContext();
    const [newTask, setNewTask] = useState('');
    const [dueTime, setDueTime] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showNotification } = useNotification();

    const timeOptions = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
            timeOptions.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
    }

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
            const { error } = await supabase.from('todos').insert([{ 
                task: newTask, 
                user_id: user.id,
                due_date: dueDate
            }]);
            if (error) {
                showNotification('Error adding task.', 'error');
                console.error('Error adding task:', error);
            } else {
                setNewTask('');
                setDueTime('');
                fetchData();
            }
        }
        setIsSubmitting(false);
    };

    const handleToggleComplete = async (id, is_completed) => {
        const { error } = await supabase.from('todos').update({ is_completed: !is_completed }).match({ id });
        if (error) {
            showNotification('Error updating task.', 'error');
        } else {
            fetchData();
        }
    };

    const handleDeleteTask = async (id) => {
        const { error } = await supabase.from('todos').delete().match({ id });
        if (error) {
            showNotification('Error deleting task.', 'error');
        } else {
            fetchData();
        }
    };

    const getTimeRemaining = (date) => {
        if (!date) return null;
        const targetDate = new Date(date);
        if (isPast(targetDate)) {
            return <span className="text-red-500">Overdue</span>;
        }
        return `due ${formatDistanceToNow(targetDate, { addSuffix: true })}`;
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
                {todos.map(todo => (
                    <li key={todo.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 group">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                checked={todo.is_completed}
                                onChange={() => handleToggleComplete(todo.id, todo.is_completed)}
                                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <div className="ml-3">
                                <span className={`${todo.is_completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                                    {todo.task}
                                </span>
                                {todo.due_date && (
                                    <p className="text-xs text-gray-500">{getTimeRemaining(todo.due_date)}</p>
                                )}
                            </div>
                        </div>
                        <button 
                            onClick={() => handleDeleteTask(todo.id)}
                            className="p-1 rounded-full text-gray-400 hover:text-red-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100"
                        >
                            <Icon path={ICONS.DELETE} className="w-4 h-4" />
                        </button>
                    </li>
                ))}
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
