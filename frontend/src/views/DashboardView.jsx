import React, { useState, useEffect } from 'react';
import { 
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const DashboardView = ({ userProfile, tasks, leaveRequests, attendance, allUsers, reviews }) => {
    const [selectedEmployee, setSelectedEmployee] = useState(userProfile.role === 'supervisor' ? 'all' : userProfile.id);
    const [showSettings, setShowSettings] = useState(false);

    // --- 1. CONFIGURABLE WIDGET STATE ---
    const [widgets, setWidgets] = useState(() => {
        const saved = localStorage.getItem('dashboard_widgets');
        if (!saved) {
            return {
                metrics: true,
                attendanceChart: true,
                taskChart: true,
                recentReviews: true
            };
        }
        
        try {
            const parsed = JSON.parse(saved);
            // Validate that parsed data has the expected structure
            if (typeof parsed === 'object' && parsed !== null) {
                return parsed;
            }
        } catch (error) {
            console.error('Error parsing stored widgets:', error);
        }
        
        // Return defaults if parsing failed
        return {
            metrics: true,
            attendanceChart: true,
            taskChart: true,
            recentReviews: true
        };
    });

    useEffect(() => {
        localStorage.setItem('dashboard_widgets', JSON.stringify(widgets));
    }, [widgets]);

    const toggleWidget = (key) => {
        setWidgets(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // --- 2. SYNCHRONIZED METRICS (THE FIX) ---
    
    // A. PENDING TASKS (Active Workload)
    // Supervisor: Sees TOTAL tasks currently being worked on (To Do + In Progress + Revision)
    // Employee: Sees ONLY tasks assigned to them
    const activeWorkload = tasks.filter(t => {
        const isActive = t.status === 'To Do' || t.status === 'In Progress' || t.status === 'Revision Needed';
        if (userProfile.role === 'supervisor') return isActive; 
        return isActive && (t.assigned_to || []).includes(userProfile.id);
    }).length;

    // B. PENDING APPROVALS (Action Items)
    // This effectively counts "Ready for Review" items + "Pending Leave"
    let approvalCount = 0;
    let approvalLabel = "No actions needed";

    if (userProfile.role === 'supervisor') {
        // Supervisor Logic:
        // 1. Leave requests waiting for me
        const pendingLeaves = leaveRequests.filter(r => r.status === 'Pending').length;
        // 2. Tasks in "Ready for Review" column (Status = Completed)
        const pendingTaskReviews = tasks.filter(t => t.status === 'Completed').length;
        
        approvalCount = pendingLeaves + pendingTaskReviews;
        
        if (approvalCount > 0) {
            approvalLabel = `${pendingLeaves} leave, ${pendingTaskReviews} tasks`;
        }
    } else {
        // Employee Logic:
        // Items I submitted that are waiting for the boss
        const myPendingLeaves = leaveRequests.filter(r => r.employee_id === userProfile.id && r.status === 'Pending').length;
        const myPendingTasks = tasks.filter(t => 
            (t.assigned_to || []).includes(userProfile.id) && t.status === 'Completed'
        ).length;
        
        approvalCount = myPendingLeaves + myPendingTasks;
        if (approvalCount > 0) approvalLabel = "Waiting for supervisor";
    }

    // C. Leave Days Taken (Same as before)
    const getDaysDiff = (start, end) => {
        const date1 = new Date(start);
        const date2 = new Date(end);
        return Math.ceil(Math.abs(date2 - date1) / (1000 * 60 * 60 * 24)) + 1;
    };

    const leaveDaysTaken = leaveRequests
        .filter(req => req.employee_id === userProfile.id && req.status === "Approved")
        .reduce((total, req) => total + getDaysDiff(req.start_date, req.end_date), 0);

    const getUserName = (id) => {
        if (!allUsers || !id) return 'Unknown';
        const match = allUsers.find(u => String(u.id) === String(id));
        return match ? match.name : 'Unknown';
    };

    // --- 3. CHART DATA PROCESSING ---
    const processChartData = () => {
        const months = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const users = allUsers.filter(u => u.role === 'employee');

        const attData = [];
        const taskData = [];

        months.forEach((month, index) => {
            const targetMonth = index + 6; 
            const attMonth = { name: month };
            const taskMonth = { name: month };

            users.forEach(u => {
                // ATTENDANCE
                const presentCount = attendance.filter(a =>
                    a.employee_id === u.id &&
                    new Date(a.date).getMonth() === targetMonth &&
                    (a.status === 'Present' || a.status === 'Late')
                ).length;
                
                // TASKS (Approved/Done)
                const completedCount = tasks.filter(t => 
                    (t.assigned_to || []).includes(u.id) && 
                    t.status === 'Approved' && 
                    new Date(t.due_date).getMonth() === targetMonth
                ).length;

                if (selectedEmployee === 'all' || selectedEmployee === u.id) {
                    attMonth[u.name] = presentCount;
                    taskMonth[u.name] = completedCount;
                }
            });
            attData.push(attMonth);
            taskData.push(taskMonth);
        });

        return { attData, taskData };
    };

    const { attData, taskData } = processChartData();
    const employeeUsers = allUsers.filter(u => u.role === 'employee');
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE', '#00C49F'];

    return (
        <div className="p-8 relative">
            
            {/* --- HEADER --- */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Welcome, {userProfile.name}!</h1>
                    <p className="text-gray-500 dark:text-gray-400">Here's your activity overview.</p>
                </div>
                
                <div className="relative">
                    <button 
                        onClick={() => setShowSettings(!showSettings)} 
                        className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg transition dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                    >
                        <span>⚙️ Customize</span>
                    </button>

                    {showSettings && (
                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-4 dark:bg-gray-800 dark:border-gray-600">
                            <h3 className="font-bold text-gray-700 mb-3 dark:text-gray-200">Visible Widgets</h3>
                            <div className="space-y-2">
                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input type="checkbox" checked={widgets.metrics} onChange={() => toggleWidget('metrics')} className="form-checkbox h-5 w-5 text-blue-600"/>
                                    <span className="text-gray-700 dark:text-gray-300">Key Metrics</span>
                                </label>
                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input type="checkbox" checked={widgets.attendanceChart} onChange={() => toggleWidget('attendanceChart')} className="form-checkbox h-5 w-5 text-blue-600"/>
                                    <span className="text-gray-700 dark:text-gray-300">Attendance Chart</span>
                                </label>
                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input type="checkbox" checked={widgets.taskChart} onChange={() => toggleWidget('taskChart')} className="form-checkbox h-5 w-5 text-blue-600"/>
                                    <span className="text-gray-700 dark:text-gray-300">Task Completion Chart</span>
                                </label>
                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input type="checkbox" checked={widgets.recentReviews} onChange={() => toggleWidget('recentReviews')} className="form-checkbox h-5 w-5 text-blue-600"/>
                                    <span className="text-gray-700 dark:text-gray-300">Recent Reviews</span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- FILTER --- */}
            {(widgets.attendanceChart || widgets.taskChart) && userProfile.role === 'supervisor' && (
                <div className="mb-6 flex justify-end">
                    <select
                        value={selectedEmployee}
                        onChange={(e) => setSelectedEmployee(e.target.value)}
                        className="p-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        <option value="all">All Employees</option>
                        {employeeUsers.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                </div>
            )}

            {/* --- WIDGETS --- */}
            
            {/* 1. METRICS */}
            {widgets.metrics && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fade-in-down">
                    
                    {/* A. Workload Card */}
                    <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500 dark:bg-gray-800 dark:border-blue-400">
                        <h3 className="font-bold text-lg text-gray-500 dark:text-gray-400">
                            {userProfile.role === 'supervisor' ? 'Team Workload' : 'My Pending Tasks'}
                        </h3>
                        <div className="flex items-baseline gap-2">
                            <p className="text-4xl font-bold text-gray-800 mt-2 dark:text-gray-100">{activeWorkload}</p>
                            <span className="text-sm text-gray-400">active tasks</span>
                        </div>
                    </div>

                    {/* B. Leave Card */}
                    <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500 dark:bg-gray-800 dark:border-green-400">
                        <h3 className="font-bold text-lg text-gray-500 dark:text-gray-400">Leave Taken</h3>
                        <p className="text-4xl font-bold text-gray-800 mt-2 dark:text-gray-100">{leaveDaysTaken} <span className="text-sm font-normal text-gray-400">days</span></p>
                    </div>

                    {/* C. Approvals Card (Dynamic) */}
                    <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500 dark:bg-gray-800 dark:border-yellow-400">
                        <h3 className="font-bold text-lg text-gray-500 dark:text-gray-400">
                            {userProfile.role === 'supervisor' ? 'Approvals Needed' : 'Waiting Approval'}
                        </h3>
                        <div className="flex flex-col justify-center h-full pb-2">
                            <div className="flex items-baseline gap-2">
                                <p className="text-4xl font-bold text-gray-800 dark:text-gray-100">{approvalCount}</p>
                                <span className="text-sm text-yellow-600 font-medium">items</span>
                            </div>
                            {approvalCount > 0 && (
                                <p className="text-xs text-gray-400 mt-1">{approvalLabel}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 2. CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {widgets.attendanceChart && (
                    <div className="bg-white p-6 rounded-lg shadow-md dark:bg-gray-800">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 dark:text-gray-100">Attendance Trends</h2>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <LineChart data={attData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                    <XAxis dataKey="name" stroke="#888" />
                                    <YAxis stroke="#888" />
                                    <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none', color:'#fff', borderRadius:'8px' }} />
                                    <Legend wrapperStyle={{ paddingTop: '10px' }}/>
                                    {employeeUsers.map((emp, index) => {
                                        if (selectedEmployee === 'all' || selectedEmployee === emp.id) {
                                            return <Line key={emp.id} type="monotone" dataKey={emp.name} stroke={colors[index % colors.length]} strokeWidth={3} dot={{r:4}} />;
                                        }
                                        return null;
                                    })}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {widgets.taskChart && (
                    <div className="bg-white p-6 rounded-lg shadow-md dark:bg-gray-800">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 dark:text-gray-100">Tasks Completed</h2>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <BarChart data={taskData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                    <XAxis dataKey="name" stroke="#888" />
                                    <YAxis stroke="#888" />
                                    <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none', color:'#fff', borderRadius:'8px' }} cursor={{fill: 'rgba(255,255,255,0.1)'}}/>
                                    <Legend wrapperStyle={{ paddingTop: '10px' }}/>
                                    {employeeUsers.map((emp, index) => {
                                        if (selectedEmployee === 'all' || selectedEmployee === emp.id) {
                                            return <Bar key={emp.id} dataKey={emp.name} fill={colors[index % colors.length]} radius={[4, 4, 0, 0]} />;
                                        }
                                        return null;
                                    })}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>

            {/* 3. REVIEWS */}
            {widgets.recentReviews && (
                <div className="bg-white p-6 rounded-lg shadow-md dark:bg-gray-800">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4 dark:text-gray-100">Performance Overview</h2>
                    {reviews && reviews.length > 0 ? (
                        <div className="space-y-4">
                            {reviews.slice(0, 3).map(review => ( 
                                <div key={review.id} className="border-b pb-4 last:border-b-0 dark:border-gray-700">
                                    <div className="flex justify-between items-center mb-2">
                                        <div>
                                            <p className="font-bold text-gray-800 dark:text-gray-100">
                                                Review from: {getUserName(review.supervisor_id)}
                                            </p>
                                            {review.rating && (
                                                <div className="flex items-center gap-2">
                                                    <div className="flex text-yellow-400 text-sm">
                                                        {[...Array(Math.round(review.rating))].map((_, i) => <span key={i}>★</span>)}
                                                    </div>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">({review.rating})</span>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{review.date}</p>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap text-sm italic">
                                        "{review.review_text.length > 100 ? review.review_text.substring(0, 100) + '...' : review.review_text}"
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-8 dark:text-gray-400">No reviews yet.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default DashboardView;