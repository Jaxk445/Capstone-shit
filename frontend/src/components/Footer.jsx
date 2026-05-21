import React from 'react';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="mt-auto pt-8 pb-4 border-t border-gray-100 dark:border-gray-700/40 text-xs text-gray-400 dark:text-gray-500 font-medium">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
                
                {/* LEFT SIDE: COPYRIGHT & AFFILIATION */}
                <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 text-center sm:text-left">
                    <span>
                        &copy; {currentYear} <span className="font-bold text-gray-600 dark:text-gray-400">Faculty of Computer Science</span>.
                    </span>
                    <span className="hidden sm:inline text-gray-200 dark:text-gray-700">|</span>
                    <span>President University Capstone Project</span>
                </div>

                {/* RIGHT SIDE: STATUS INDICATOR & CONTACT CHANNELS */}
                <div className="flex items-center flex-wrap justify-center gap-4">
                    
                    {/* Live System Telemetry Status Indicator */}
                    <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900/40 px-2.5 py-1 rounded-lg border dark:border-gray-700/40">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400">
                            Systems Operational
                        </span>
                    </div>

                    {/* Quick Link Channels */}
                    <div className="flex items-center gap-3">
                        <a 
                            href="mailto:support@president.ac.id?subject=Internship%20Portal%20Support" 
                            className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L22 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Help Desk Contact
                        </a>
                    </div>

                </div>

            </div>
        </footer>
    );
};

export default Footer;