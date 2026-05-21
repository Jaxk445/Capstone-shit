import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Icons } from './Icons';
import CesdLogo from '../assets/LOGO ahh.png'; 

const Header = ({ 
    userProfile, 
    notifications = [], 
    tasks = [],
    onNotificationsRead, 
    isDarkMode, 
    toggleDarkMode,
    toggleMobileSidebar 
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const generateSystemAlerts = () => {
        const alerts = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        tasks.forEach(task => {
            if (userProfile?.role === 'supervisor' && task.status === 'Completed') {
                alerts.push({
                    id: `dynamic-review-${task.id}`,
                    message: `Task ready for review: "${task.title}" has been submitted for your evaluation.`,
                    created_at: task.due_date || new Date().toISOString().split('T')[0],
                    read: false,
                    type: 'review'
                });
                return;
            }

            const isAssignedToUser = (task.assigned_to || []).map(String).includes(String(userProfile?.id));
            if (userProfile?.role !== 'supervisor' && !isAssignedToUser) return;

            if (userProfile?.role !== 'supervisor' && task.status === 'Revision Needed') {
                alerts.push({
                    id: `dynamic-revision-${task.id}`,
                    message: `Revision required: "${task.title}" was sent back. Feedback: "${task.feedback || 'Review board for details.'}"`,
                    created_at: task.due_date || new Date().toISOString().split('T')[0],
                    read: false,
                    type: 'revision'
                });
                return;
            }

            if (['Approved', 'Completed'].includes(task.status)) return;
            if (!task.due_date) return;

            const due = new Date(task.due_date);
            due.setHours(0, 0, 0, 0);

            const diffTime = due - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
                alerts.push({
                    id: `dynamic-overdue-${task.id}`,
                    message: userProfile?.role === 'supervisor'
                        ? `Overdue task: "${task.title}" has missed its deadline.`
                        : `Your task "${task.title}" is overdue. Upload files immediately.`,
                    created_at: task.due_date,
                    read: false,
                    type: 'overdue'
                });
            } else if (diffDays <= 2) {
                alerts.push({
                    id: `dynamic-near-${task.id}`,
                    message: userProfile?.role === 'supervisor'
                        ? `Approaching deadline: "${task.title}" is close to due.`
                        : `Your task "${task.title}" is due within 48 hours.`,
                    created_at: task.due_date,
                    read: false,
                    type: 'near'
                });
            }
        });

        return alerts;
    };

    const combinedNotifications = [...generateSystemAlerts(), ...notifications];
    const unreadCount = combinedNotifications.filter(n => !n.read).length;

    const handleToggle = () => {
        setIsOpen(!isOpen);
        if (!isOpen && unreadCount > 0) {
            onNotificationsRead();
        }
    };

    const handleLogout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
        } catch (error) {
            console.error('Error logging out:', error.message);
            window.location.reload();
        }
    };

    return (
        <header className="bg-white shadow-sm border-b border-gray-200 p-4 flex justify-between items-center z-40 relative dark:bg-gray-800 dark:border-gray-700 h-16 transition-colors duration-150">
            
            <div className="flex items-center gap-3">
                <button 
                    type="button"
                    onClick={toggleMobileSidebar}
                    className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-xl dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                </button>

                <img src={CesdLogo} alt="Institutional Crest" className="h-9 w-auto object-contain" />
                <span className="hidden sm:block ml-1.5 text-base font-bold text-gray-800 dark:text-gray-100 tracking-tight">
                    Customs Intern Management Portal
                </span>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-3.5">
                <button
                    type="button"
                    onClick={toggleDarkMode}
                    className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl dark:text-gray-400 transition-all active:scale-95"
                    title="Toggle theme"
                >
                    {isDarkMode ? Icons.Sun : Icons.Moon}
                </button>

                <div className="relative">
                    <button 
                        type="button" 
                        onClick={handleToggle} 
                        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl dark:text-gray-400 transition-all relative"
                        title="Open notifications"
                    >
                        {Icons.Bell}
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                            </span>
                        )}
                    </button>
                    {isOpen && (
                        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 dark:bg-gray-800 dark:border-gray-700 animate-scale-up">
                           <div className="py-1">
                             <div className="font-bold px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 dark:text-white flex justify-between items-center text-xs">
                                 <span>Notifications</span>
                                 <span className="bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 text-[10px] px-2 py-0.5 rounded-md font-extrabold">
                                     {unreadCount} Active Alert{unreadCount !== 1 ? 's' : ''}
                                 </span>
                             </div>
                             <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/60">
                                {combinedNotifications.length > 0 ? combinedNotifications.map((n) => {
                                    let itemStyle = 'hover:bg-gray-50 dark:hover:bg-gray-700/40';
                                    if (n.type === 'overdue') itemStyle = 'bg-red-50/40 border-l-4 border-l-red-500 dark:bg-red-950/10 hover:bg-red-50 dark:hover:bg-red-950/20';
                                    if (n.type === 'near') itemStyle = 'bg-amber-50/40 border-l-4 border-l-amber-500 dark:bg-amber-950/10 hover:bg-amber-50 dark:hover:bg-amber-950/20';
                                    if (n.type === 'review') itemStyle = 'bg-blue-50/40 border-l-4 border-l-blue-500 dark:bg-blue-950/10 hover:bg-blue-50 dark:hover:bg-blue-950/20';
                                    if (n.type === 'revision') itemStyle = 'bg-rose-50/50 border-l-4 border-l-red-400 dark:bg-rose-950/10 hover:bg-rose-50 dark:hover:bg-rose-950/20';
                                    if (!n.type && !n.read) itemStyle = 'bg-blue-50/20 dark:bg-blue-950/5';

                                    return (
                                        <div key={n.id} className={`px-4 py-3 text-xs leading-relaxed transition-colors flex flex-col gap-1 ${itemStyle}`}>
                                            <p className="text-gray-700 dark:text-gray-200 font-semibold">
                                                {n.message}
                                            </p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-mono">
                                                {n.type ? `Target: ${n.created_at}` : `Logged: ${new Date(n.created_at).toLocaleDateString('en-GB')}`}
                                            </p>
                                        </div>
                                    );
                                }) : (
                                    <div className="px-4 py-12 text-center text-gray-400 dark:text-gray-500 text-xs italic font-medium">
                                        No active notices or warnings found.
                                    </div>
                                )}
                             </div>
                           </div>
                        </div>
                    )}
                </div>

                <div className="hidden sm:flex items-center gap-3 pl-3.5 border-l border-gray-200 dark:border-gray-700">
                    <div className="text-right hidden md:block">
                        <p className="text-xs font-extrabold text-gray-800 dark:text-white leading-none">{userProfile.name}</p>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 leading-none mt-1 uppercase tracking-wide">{userProfile.role}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 p-0.5 shadow-sm">
                        <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                            {userProfile.avatar_url ? (
                                <img src={userProfile.avatar_url} alt="Profile card thumbnail" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-blue-600 dark:text-blue-400 font-black text-[10px] uppercase tracking-wider">{userProfile.initials}</span>
                            )}
                        </div>
                    </div>
                </div>

                <button 
                    type="button"
                    onClick={handleLogout} 
                    title="Logout" 
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all cursor-pointer z-50 active:scale-95"
                >
                    {Icons.LogOut}
                </button>
            </div>
        </header>
    );
};

export default Header;