import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNotification } from '../contexts/NotificationContext';
import { Icon, ICONS } from './Icons';

const Auth = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { showNotification } = useNotification();

    const [isLogin, setIsLogin] = useState(true);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            showNotification(error.message, 'error');
        } else {
            showNotification('Logged in successfully!', 'success');
        }
        setLoading(false);
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signUp({ email, password });

        if (error) {
            showNotification(error.message, 'error');
        } else {
            showNotification('Check your email for the confirmation link!', 'success');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 py-8 px-4 sm:px-6 lg:px-8">
            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
                <div className="absolute top-40 left-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative max-w-md w-full space-y-8">
                {/* Logo and Branding */}
                <div className="text-center">
                    <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 to-green-600 rounded-2xl flex items-center justify-center shadow-lg mb-6">
                        <Icon path={ICONS.DASHBOARD} className="w-10 h-10 text-white" />
                    </div>
                                                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-2">
                                    Ünlü Dil
                                </h1>
                                <p className="text-gray-600 text-lg font-medium">
                                    Kurs Yönetim Sistemi
                                </p>
                </div>

                {/* Login Card */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            {isLogin ? 'Welcome Back!' : 'Create Account'}
                        </h2>
                        <p className="text-gray-600">
                            {isLogin ? 'Sign in to access your dashboard' : 'Join us to get started'}
                        </p>
                    </div>

                    <form className="space-y-6" onSubmit={isLogin ? handleLogin : handleSignUp}>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-2">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Icon path={ICONS.EMAIL} className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="email-address"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Icon path={ICONS.LOCK} className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="current-password"
                                        required
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                        >
                            {loading ? (
                                <div className="flex items-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Processing...
                                </div>
                            ) : (
                                <div className="flex items-center">
                                    <Icon path={isLogin ? ICONS.LOGIN : ICONS.USER_PLUS} className="w-4 h-4 mr-2" />
                                    {isLogin ? 'Sign In' : 'Create Account'}
                                </div>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button 
                            onClick={() => setIsLogin(!isLogin)} 
                            className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
                        >
                            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center text-sm text-gray-500">
                    <p>© 2024 UDMS. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
};

export default Auth;
