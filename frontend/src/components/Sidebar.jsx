import React from 'react';
import { Icons } from './Icons';

/**
 * Sidebar component for primary navigation.
 * Handles desktop navigation and the mobile drawer state.
 */
const Sidebar = ({ userProfile, activeView, setActiveView, isMobileOpen, setIsMobileOpen }) => {

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: Icons.LayoutDashboard },
    { id: 'tasks', label: userProfile?.role === 'supervisor' ? 'Track Team Tasks' : 'My Project Tasks', icon: Icons.ClipboardList },
    { id: 'attendance', label: 'Attendance Telemetry', icon: Icons.CalendarDays },
    { id: 'leave', label: 'Absence Requests', icon: Icons.CalendarDays },
    { id: 'contributions', label: 'Discussion Board', icon: Icons.Trophy },
    { 
      id: 'reviews', 
      label: userProfile?.role === 'supervisor' ? 'Framework Appraisals' : 'My Scorecard Transcripts', 
      icon: Icons.UserCircle 
    },
  ];

  const handleNavClick = (id) => {
    setActiveView(id);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/40 z-40 md:hidden backdrop-blur-sm transition-opacity duration-200 animate-fade-in"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50
          w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700/60
          transform transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0 
          flex flex-col shadow-xl md:shadow-none
        `}
      >
        {/* Mobile header */}
        <div className="h-16 flex items-center px-6 border-b border-gray-100 dark:border-gray-700 md:hidden bg-gray-50/50 dark:bg-gray-900/20">
            <span className="font-bold text-xs uppercase tracking-wider text-gray-400">Navigation Console</span>
        </div>

        {/* Navigation links */}
        <nav className="flex-grow p-4 space-y-1.5 overflow-y-auto">
          <div className="text-[10px] font-bold text-gray-400 uppercase mb-3 px-3 tracking-widest">Main Modules</div>
          
          {menuItems.map(item => {
            const isActive = activeView === item.id;
            
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all duration-150 group
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/60 hover:text-blue-600 dark:hover:text-white'
                  }
                `}
              >
                <span className={`transition-colors duration-150 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-blue-600 dark:text-gray-500 dark:group-hover:text-white'}`}>
                   {item.icon}
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Settings section */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/10">
            <button 
                type="button"
                onClick={() => handleNavClick('settings')} 
                className={`
                    w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 group
                    ${activeView === 'settings' 
                        ? 'bg-gray-100 text-blue-600 dark:bg-gray-700 dark:text-white font-extrabold shadow-inner' 
                        : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/40 hover:text-blue-600'
                    }
                `}
            >
                <span className="text-base group-hover:scale-110 transition-transform">Settings</span>
            </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;