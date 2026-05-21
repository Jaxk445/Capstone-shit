import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import ExportButton from '../components/ExportButton';

/**
 * COMPONENT: AttendanceView
 * PURPOSE: Geolocation-Verified Clock-In & Time Telemetry Management Engine.
 * FEATURES:
 * 1. Live device tracking via the HTML5 Geolocation API matrix.
 * 2. Mathematical Haversine coordinate validation against office parameters.
 * 3. Dynamic role filtering enabling custom supervisors overview panels.
 */
const AttendanceView = ({ userProfile, attendance = [], allUsers = [], fetchAttendance }) => {
    // =========================================================================
    // 🎛️ 1. REACT INTERFACE LAYER CONTEXT STATES
    // =========================================================================
    const [isLoading, setIsLoading] = useState(false); // Controls button mutation states during network requests
    const [liveDistance, setLiveDistance] = useState(null); // Calculated distance in meters from the office location
    const [isInRange, setIsInRange] = useState(false); // Flag validating if employee is inside the allowed geofence
    const [currentCoords, setCurrentCoords] = useState(null); // Stores captured active latitude/longitude vectors

    // --- SUPERVISOR BOARD COMPONENT FILTER HOOKS ---
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSource, setFilterSource] = useState('all');
    const [filterMode, setFilterMode] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [sortBy, setSortBy] = useState('name-az');

    // =========================================================================
    // 📐 2. CRITICAL CORE GEOMETRIC & TIME REFERENCE VARIABLES
    // =========================================================================
    const today = new Date().toISOString().split('T')[0]; // Current system ISO date string key (YYYY-MM-DD)
    
    // Finds if the active user has already executed a check-in transaction today
    const todayRecord = attendance.find(record => record.employee_id === userProfile.id && record.date === today);

    const WORK_START_TIME = '08:00:00'; // Strict operational deadline constraint. Clock-ins past this are marked 'Late'
    
    // Immutable office target coordinate benchmark parameters (Directorate General of Customs and Excise)
    const OFFICE_LOCATION = {
        lat: -6.20651363, 
        lng: 106.87604852 
    };
    const ALLOWED_RADIUS_METERS = 100; // Geofence radius boundary restriction constraint rule

    // =========================================================================
    // 📊 3. DATA PROCESSING ENGINES & FILTER CONSTRUCTORS
    // =========================================================================
    
    // PERSONAL METRICS: Filters historical check-ins to compute personal punctuality ratios
    const myHistory = attendance.filter(a => a.employee_id === userProfile.id);
    const totalDays = myHistory.length;
    const onTimeDays = myHistory.filter(a => a.status === 'Present').length;
    const lateDays = myHistory.filter(a => a.status === 'Late').length;
    const punctualityScore = totalDays > 0 ? ((onTimeDays / totalDays) * 100).toFixed(0) : 0;

    // SUPERVISOR METRICS: Aggregates real-time overview telemetry from active employee arrays
    const activeEmployees = allUsers.filter(u => u.role === 'employee');
    const clockedInTodayCount = activeEmployees.filter(emp => 
        attendance.some(a => a.employee_id === emp.id && a.date === today)
    ).length;
    const wfhAssignmentCount = activeEmployees.filter(emp => emp.work_mode === 'WFH').length;
    const wfoAssignmentCount = activeEmployees.filter(emp => (emp.work_mode || 'WFO') === 'WFO').length;

    const getUserName = (id) => allUsers.find(u => u.id === id)?.name || 'Unknown Officer';

    // CAMPUS PICKER: Dynamically maps unique educational institutions to populate filter drop-downs
    const uniqueSources = Array.from(
        new Set(
            allUsers
                .filter(u => u.role === 'employee')
                .map(u => u.source || u.university || 'President University')
        )
    );

    // FILTER PIPELINE ENGINE: Computes text searches and dropdown metrics on the main intern grid
    const processedInterns = allUsers
        .filter(u => u.role === 'employee')
        .filter(emp => {
            const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase());
            const empSource = emp.source || emp.university || 'President University';
            const matchesSource = filterSource === 'all' || empSource === filterSource;
            const empMode = emp.work_mode || 'WFO';
            const matchesMode = filterMode === 'all' || empMode === filterMode;
            
            const empTodayRecord = attendance.find(a => a.employee_id === emp.id && a.date === today);
            let matchesStatus = true;
            if (filterStatus === 'clocked_in') matchesStatus = !!empTodayRecord;
            if (filterStatus === 'not_clocked_in') matchesStatus = !empTodayRecord;

            return matchesSearch && matchesSource && matchesMode && matchesStatus;
        })
        .sort((a, b) => {
            if (sortBy === 'name-az') return a.name.localeCompare(b.name);
            if (sortBy === 'name-za') return b.name.localeCompare(a.name);
            if (sortBy === 'status-active') {
                const aClocked = attendance.some(att => att.employee_id === a.id && att.date === today);
                const bClocked = attendance.some(att => att.employee_id === b.id && att.date === today);
                return bClocked - aClocked; // Pushes active check-ins to the top of rows
            }
            return 0;
        });

    // SPREADSHEET BUILDER: Formats processed logs into tabular blocks before launching Excel exports
    const exportDataFiltered = processedInterns.flatMap(emp => 
        attendance.filter(a => a.employee_id === emp.id).map(record => ({
            Date: record.date,
            Employee: emp.name,
            Institution: emp.source || emp.university || 'President University',
            "Assigned Mode": emp.work_mode || 'WFO',
            Status: record.status,
            "Check In": record.clock_in,
            "Check Out": record.clock_out
        }))
    );

    // =========================================================================
    // 🛰️ 4. GEOLOCATION RUNTIME HARDWARE LIFECYCLE LISTENERS
    // =========================================================================
    useEffect(() => {
        if (!navigator.geolocation || !userProfile) return;
        
        // Hooks into the hardware tracking stream to catch coordinate shifts instantly
        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setCurrentCoords({ latitude, longitude }); 

                // Calculates geodesic distance metric vectors
                const dist = getDistanceFromLatLonInMeters(latitude, longitude, OFFICE_LOCATION.lat, OFFICE_LOCATION.lng);
                setLiveDistance(dist);
                
                // Enforces boundary logic restrictions based on access permissions and assignments
                if (userProfile.role === 'supervisor') {
                    setIsInRange(true); // Administrative profiles bypass radial geofence constraints globally
                } else {
                    const assignedMode = userProfile.work_mode || 'WFO';
                    if (assignedMode === 'WFH') {
                        setIsInRange(true); // Remote work assignments bypass spatial lock barriers
                    } else {
                        setIsInRange(dist <= ALLOWED_RADIUS_METERS); // On-site employees must comply with the 100m geofence
                    }
                }
            },
            (err) => console.error("GPS stream hardware exception error logging:", err),
            { enableHighAccuracy: true, timeout: 10000 } // Demands peak precision coordinates
        );
        
        // Cleanup: Destroys active GPS streams cleanly when changing tabs to preserve device battery
        return () => navigator.geolocation.clearWatch(watchId);
    }, [userProfile]);

    /**
     * MATHEMATICAL CALCULATOR: getDistanceFromLatLonInMeters
     * PURPOSE: The Haversine Formula. Computes the shortest absolute distance between 
     * two pairs of latitude/longitude coordinates over the earth's spherical curve in meters.
     */
    const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Earth's mean radius in kilometers
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return (R * c) * 1000; // Returns exact float distance values converted to meters
    };

    // FIXED MAP LINK: Uses standard URL search strings to mount vectors safely on Google Maps maps layers
    const openMap = (lat, lng) => {
        if (!lat || !lng) return;
        window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    };

    // =========================================================================
    // ⚙️ 5. SUPABASE DATABASE WRITE MUTATION HANDLERS
    // =========================================================================

    /**
     * TRANSACTION: handleToggleWorkMode
     * PURPOSE: Shifts an employee's configuration track state (`WFO` <-> `WFH`) inside public.profiles.
     */
    const handleToggleWorkMode = async (employeeId, currentMode) => {
        const nextMode = currentMode === 'WFH' ? 'WFO' : 'WFH';
        const { error } = await supabase
            .from('profiles')
            .update({ work_mode: nextMode })
            .eq('id', employeeId);

        if (error) alert("Failed to change work mode allocation: " + error.message);
        else window.location.reload(); 
    };

    /**
     * TRANSACTION: handleClockIn
     * PURPOSE: Inserts a morning timestamp signature into public.attendance tables.
     * METRIC RULE: Compares transactional timestamp vector rows against WORK_START_TIME (08:00) to flag punctuality.
     */
    const handleClockIn = async () => {
        if (!currentCoords) return alert("Waiting for secure GPS baseline validation coordinates...");
        if (!isInRange) return alert(`Geofence rejection exception: You sit ${liveDistance?.toFixed(0)}m outside office gates.`);

        setIsLoading(true);
        const now = new Date();
        const time = now.toLocaleTimeString('en-GB', { hour12: false });
        const status = time > WORK_START_TIME ? 'Late' : 'Present'; // Late calculation gateway execution line

        const { error } = await supabase.from('attendance').insert({
            employee_id: userProfile.id,
            date: today,
            status: status, 
            clock_in: time,
            latitude: currentCoords.latitude,
            longitude: currentCoords.longitude
        });

        if (error) alert('Database submission error: ' + error.message);
        else await fetchAttendance(); 
        setIsLoading(false);
    };

    /**
     * TRANSACTION: handleClockOut
     * PURPOSE: Appends an afternoon exit timestamp onto today's attendance record slot.
     */
    const handleClockOut = async () => {
        if (!currentCoords) return alert("Waiting for location coordinates...");
        if (userProfile.work_mode !== 'WFH' && !isInRange) return alert("Geofence exception: Retain on-site coordinates to complete clock-out transactions.");
        
        setIsLoading(true); 
        const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
        
        const { error } = await supabase
            .from('attendance')
            .update({ clock_out: time })
            .eq('id', todayRecord.id);
        
        if (error) alert("Database write update error: Failed to log clock out parameters.");
        else await fetchAttendance(); 
        setIsLoading(false); 
    };

    const statusBadge = (status, clockOut, date) => {
        const today = new Date().toISOString().split('T')[0];
        
        // 1. INCOMPLETE (Past Date)
        if (!clockOut && date !== today) {
            return <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50">Incomplete</span>;
        }
        
        // 2. IN PROGRESS (Today)
        if (!clockOut) {
            return <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50">In Progress</span>;
        }

        // 3. OTHERS
        const styles = {
            'Present': 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900/50',
            'Late': 'bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/50',
        }[status] || 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-700 dark:text-gray-300';
        
        return <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles}`}>{status}</span>;
    };

    // =========================================================================
    // 💻 6. VIEWPORT DESIGN TEMPLATE RENDER MODULES
    // =========================================================================
    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            
            {/* --- LAYOUT HEADER ACCENTS --- */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-gray-200 dark:border-gray-700 pb-4 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                        {userProfile.role === 'supervisor' ? 'Intern Tracking Portal' : 'My Attendance Logs'}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {userProfile.role === 'supervisor' ? 'Manage operational check-in parameters and export sheets.' : 'Log work availability tokens and verify historical tracks.'}
                    </p>
                </div>

                {/* SUPERVISOR PANEL HEADER WHITE-SPACE SUMMARY FLUID CARDS */}
                {userProfile.role === 'supervisor' && (
                    <div className="hidden xl:flex items-center gap-3.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-4 py-2 rounded-2xl text-xs font-semibold text-gray-600 dark:text-gray-300 shadow-sm">
                        <div className="flex items-center gap-1.5 border-r border-gray-100 dark:border-gray-700 pr-3.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            <span>Total Roster: <b className="text-gray-900 dark:text-white font-bold">{activeEmployees.length}</b></span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 border-r border-gray-100 dark:border-gray-700 pr-3.5">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <span>Clocked In Today: <b className="text-gray-900 dark:text-white font-bold">{clockedInTodayCount}</b></span>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-gray-400 dark:text-gray-500 font-medium">Duty Allotments:</span>
                            <span className="bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 px-2.5 py-0.5 rounded-lg border border-blue-100 dark:border-blue-900/50 font-bold text-[10px] uppercase">
                                🏢 {wfoAssignmentCount} WFO
                            </span>
                            <span className="bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300 px-2.5 py-0.5 rounded-lg border border-purple-100 dark:border-purple-900/50 font-bold text-[10px] uppercase">
                                🏠 {wfhAssignmentCount} WFH
                            </span>
                        </div>
                    </div>
                )}

                {userProfile.role === 'supervisor' && (
                    <ExportButton data={exportDataFiltered} filename="Filtered_Intern_Attendance" label="Export Hand-Picked Records" />
                )}
            </div>

            {/* ========================================================================= */}
            {/* 🏢 PROFILE PROACT ZONE: SUPERVISOR TRACKING CONSOLE MATRIX              */}
            {/* ========================================================================= */}
            {userProfile.role === 'supervisor' ? (
                <div className="space-y-4">
                    
                    {/* SEARCH CONTROLS FILTER BLOCK */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Search Intern</label>
                            <input 
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Type a name..."
                                className="w-full p-2 text-xs border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Origin Source</label>
                            <select
                                value={filterSource}
                                onChange={(e) => setFilterSource(e.target.value)}
                                className="w-full p-2 text-xs border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white font-bold"
                            >
                                <option value="all">All Campuses</option>
                                {uniqueSources.map(src => <option key={src} value={src}>{src}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Duty Mode</label>
                            <select
                                value={filterMode}
                                onChange={(e) => setFilterMode(e.target.value)}
                                className="w-full p-2 text-xs border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white font-bold"
                            >
                                <option value="all">All Modes</option>
                                <option value="WFO">🏢 Office (WFO)</option>
                                <option value="WFH">🏠 Remote (WFH)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Attendance Status</label>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="w-full p-2 text-xs border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white font-bold"
                            >
                                <option value="all">All Activity</option>
                                <option value="clocked_in">Active (Clocked In)</option>
                                <option value="not_clocked_in">Inactive (Not In)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Sort Matrix</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full p-2 text-xs border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white font-bold"
                            >
                                <option value="name-az">Name (A → Z)</option>
                                <option value="name-za">Name (Z → A)</option>
                                <option value="status-active">Clocked In First</option>
                            </select>
                        </div>
                    </div>

                    {/* CORE ROSTER TRACKING TABLE SHEET */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50/80 dark:bg-gray-700/40 border-b border-gray-100 dark:border-gray-700 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                    <tr>
                                        <th className="p-4">Intern Name</th>
                                        <th className="p-4">Source / Origin</th>
                                        <th className="p-4">Assigned Duty Mode</th>
                                        <th className="p-4">Today's Status</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-xs">
                                    {processedInterns.map(emp => {
                                        const empToday = attendance.find(a => a.employee_id === emp.id && a.date === today);
                                        const empRecords = attendance.filter(a => a.employee_id === emp.id);
                                        const empTotalDays = empRecords.length;
                                        const empOnTime = empRecords.filter(a => a.status === 'Present').length;
                                        const empLate = empRecords.filter(a => a.status === 'Late').length;
                                        const empPunctuality = empTotalDays > 0 ? ((empOnTime / empTotalDays) * 100).toFixed(0) : 0;

                                        const empHistoryExport = empRecords.map(record => ({
                                            Date: record.date,
                                            Status: record.status,
                                            "Check In": record.clock_in,
                                            "Check Out": record.clock_out,
                                            Latitude: record.latitude,
                                            Longitude: record.longitude
                                        }));

                                        return (
                                            <tr key={emp.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-all font-semibold">
                                                <td className="p-4 text-gray-900 dark:text-gray-100 relative">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative group cursor-help">
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white text-xs shadow-sm group-hover:scale-105 transition-all">
                                                                {emp.name?.charAt(0)}
                                                            </div>
                                                            {/* FLUID MINI GRAPH PROFILE OVERLAY HOVER CARD */}
                                                            <div className="absolute left-10 top-0 invisible group-hover:visible opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all duration-200 z-50 w-52 bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 pointer-events-none text-[11px]">
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Historical Track</span>
                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                                        empPunctuality >= 85 ? 'bg-green-50 text-green-700 dark:bg-green-950/30' : 'bg-orange-50 text-orange-700 dark:bg-orange-950/30'
                                                                    }`}>
                                                                        {empPunctuality}% Score
                                                                    </span>
                                                                </div>
                                                                <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden mb-3">
                                                                    <div className={`h-full transition-all duration-300 ${empPunctuality >= 85 ? 'bg-green-500' : 'bg-orange-500'}`} style={{ width: `${empPunctuality}%` }}></div>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
                                                                    <div className="bg-gray-50 dark:bg-gray-800/40 p-2 rounded-xl border dark:border-gray-700">
                                                                        <div className="text-[8px] font-bold text-gray-400 uppercase">Days Present</div>
                                                                        <div className="text-xs font-bold text-gray-700 dark:text-gray-200">{empTotalDays}</div>
                                                                    </div>
                                                                    <div className="bg-gray-50 dark:bg-gray-800/40 p-2 rounded-xl border dark:border-gray-700">
                                                                        <div className="text-[8px] font-bold text-gray-400 uppercase">Late Count</div>
                                                                        <div className="text-xs font-bold text-orange-500">{empLate}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <span>{emp.name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="inline-block bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 px-2.5 py-0.5 rounded-md text-[10px] uppercase font-bold border dark:border-gray-600">
                                                        {emp.source || emp.university || 'President University'}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleWorkMode(emp.id, emp.work_mode || 'WFO')}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold transition-all border shadow-sm text-[11px] ${
                                                            emp.work_mode === 'WFH'
                                                                ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50'
                                                                : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50'
                                                        }`}
                                                    >
                                                        {emp.work_mode === 'WFH' ? '🏠 WFH (Remote)' : '🏢 WFO (On-Site)'}
                                                    </button>
                                                </td>
                                                <td className="p-4">
                                                    {empToday ? (
                                                        <div className="flex flex-col gap-0.5">
                                                            {statusBadge(empToday.status, empToday.clock_out, empToday.date)}
                                                            <span className="text-[10px] font-bold text-gray-400 font-mono mt-0.5">IN: {empToday.clock_in}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-50 text-gray-400 border border-gray-200 dark:bg-gray-900/20 dark:text-gray-500 dark:border-gray-800">
                                                            Not Clocked In
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="inline-flex justify-end gap-2">
                                                        {empToday?.latitude && (
                                                            <button 
                                                                type="button"
                                                                onClick={() => openMap(empToday.latitude, empToday.longitude)} 
                                                                className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-bold px-2.5 py-1 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 shadow-sm transition"
                                                            >
                                                                🗺️ Geolocation
                                                            </button>
                                                        )}
                                                        <ExportButton data={empHistoryExport} filename={`${emp.name.replace(/\s+/g, '_')}_Attendance`} label="Export Logs" />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                /* ========================================================================= */
                /* 👤 EMPLOYEE PANEL ZONE: INDIVIDUAL CLOCK INTERFACES                     */
                /* ========================================================================= */
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs uppercase tracking-wider text-gray-400 font-bold">
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-2xl p-5 text-white shadow-md shadow-blue-500/10">
                            <p className="text-blue-100 text-xs font-bold uppercase mb-1">My Punctuality Score</p>
                            <h3 className="text-4xl font-black">{punctualityScore}%</h3>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                            <p className="mb-1 text-gray-400">Total Days Present</p>
                            <h3 className="text-4xl font-black text-gray-800 dark:text-gray-100">{totalDays} <span className="text-xs font-bold text-gray-400 uppercase">Days</span></h3>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                            <p className="mb-1 text-gray-400">Late Arrivals</p>
                            <h3 className={`text-4xl font-black ${lateDays > 0 ? 'text-orange-500' : 'text-gray-800 dark:text-gray-100'}`}>{lateDays} <span className="text-xs font-bold text-gray-400 uppercase">Days</span></h3>
                        </div>
                    </div>

                    {/* HARDWARE CLOCK BUTTON CONTROLS WIDGET CARD */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
                         <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isInRange ? 'bg-green-50 text-green-600 dark:bg-green-950/30' : 'bg-red-50 text-red-600 dark:bg-red-950/30 animate-pulse'}`}>
                                <span className="text-2xl">{(userProfile.work_mode || 'WFO') === 'WFO' ? '🏢' : '🏠'}</span>
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
                                    Duty Profile: {(userProfile.work_mode || 'WFO') === 'WFO' ? 'Office (On-Site WFO)' : 'Remote (Home WFH)'}
                                </h2>
                                <p className={`text-xs font-bold uppercase font-mono mt-0.5 tracking-wide ${isInRange ? 'text-green-600' : 'text-red-500'}`}>
                                    {(userProfile.work_mode || 'WFO') === 'WFO' 
                                        ? (liveDistance !== null ? `📍 ${liveDistance.toFixed(0)} meters from Office Boundary` : '🔍 Acquiring GPS Tracking Signal...')
                                        : '🔒 Remote network node verified'}
                                </p>
                            </div>
                         </div>
                         
                         {/* MAIN TRANSACTION ACTIONS HUB */}
                         <div className="flex gap-3">
                            {!todayRecord && (
                                <button 
                                    type="button"
                                    onClick={handleClockIn} 
                                    disabled={isLoading || !isInRange} 
                                    className={`px-8 py-3 rounded-xl font-bold text-white transition-all shadow-md ${isLoading || !isInRange ? 'bg-gray-300 cursor-not-allowed text-gray-500 dark:bg-gray-700' : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 shadow-blue-500/10'}`}
                                >
                                    {isLoading ? 'Verifying Coordinates...' : 'Clock In Shift'}
                                </button>
                            )}
                            {todayRecord && !todayRecord.clock_out && (
                                <button 
                                    type="button"
                                    onClick={handleClockOut} 
                                    disabled={isLoading} 
                                    className={`px-8 py-3 rounded-xl font-bold text-white transition-all shadow-md ${isLoading ? 'bg-gray-300 cursor-not-allowed text-gray-500' : 'bg-yellow-500 hover:bg-yellow-600 hover:-translate-y-0.5 shadow-yellow-500/10'}`}
                                >
                                    {isLoading ? 'Processing Pipeline...' : 'Clock Out Shift'}
                                </button>
                            )}
                            {todayRecord && todayRecord.clock_out && (
                                <div className="px-6 py-3 bg-gray-50 border border-gray-100 text-gray-400 font-extrabold rounded-xl text-xs uppercase tracking-wider dark:bg-gray-900/40 dark:border-gray-800 dark:text-gray-500">
                                    ✓ Shift Completed
                                </div>
                            )}
                         </div>
                    </div>

                    {/* INDOOR PERSONAL TIMELINE LOGS TABLE */}
                    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 text-[10px] uppercase tracking-wider font-bold">
                                <tr>
                                    <th className="p-4">Shift Calendar Date</th>
                                    <th className="p-4">Operational Status</th>
                                    <th className="p-4">Check In Log</th>
                                    <th className="p-4">Check Out Log</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-xs">
                                {myHistory.map(record => (
                                    <tr key={record.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors duration-150 odd:bg-white even:bg-gray-50/50 dark:odd:bg-gray-800 dark:even:bg-gray-800/50">
                                        <td className="p-4 font-bold text-gray-700 dark:text-gray-200 font-mono">{record.date}</td>
                                        <td className="p-4">{statusBadge(record.status, record.clock_out, record.date)}</td>
                                        <td className="p-4 text-gray-600 dark:text-gray-400 font-mono tracking-tight">{record.clock_in}</td>
                                        <td className="p-4 text-gray-600 dark:text-gray-400 font-mono tracking-tight">{record.clock_out || '--:--'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

export default AttendanceView;