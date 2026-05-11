import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import ExportButton from '../components/ExportButton';

const AttendanceView = ({ userProfile, attendance, allUsers, fetchAttendance }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [liveDistance, setLiveDistance] = useState(null); 
    const [isInRange, setIsInRange] = useState(false);
    const [locationConsentGiven, setLocationConsentGiven] = useState(() => {
        // Check if user has previously consented to location storage
        return localStorage.getItem(`location_consent_${userProfile.id}`) === 'true';
    });
    const [selectedEmployee, setSelectedEmployee] = useState(userProfile.role === 'supervisor' ? null : userProfile.id);
    
    // NEW: Store the actual coordinates here so we don't have to fetch them again
    const [currentCoords, setCurrentCoords] = useState(null); 

    const today = new Date().toISOString().split('T')[0];
    const todayRecord = filteredAttendance.find(record => record.employee_id === userProfile.id && record.date === today);

    // --- CONFIGURATION ---
    const WORK_START_TIME = '08:00:00'; 
    const OFFICE_LOCATION = {
        lat: -6.20651363, 
        lng: 106.87604852 
    };
    const ALLOWED_RADIUS_METERS = 100; 

    // --- FILTER DATA BY SELECTED EMPLOYEE (for supervisors) ---
    const filteredAttendance = userProfile.role === 'supervisor' && selectedEmployee
        ? attendance.filter(a => a.employee_id === selectedEmployee)
        : attendance.filter(a => a.employee_id === userProfile.id);

    // --- HERO STATS ---
    const totalDays = filteredAttendance.length;
    const onTimeDays = filteredAttendance.filter(a => a.status === 'Present').length;
    const lateDays = filteredAttendance.filter(a => a.status === 'Late').length;
    const punctualityScore = totalDays > 0 ? ((onTimeDays / totalDays) * 100).toFixed(0) : 0;

    // --- HELPERS ---
    const getUserName = (id) => allUsers.find(u => u.id === id)?.name || 'Unknown';
    const employeeUsers = allUsers.filter(u => u.role === 'employee');

    // --- EXPORT DATA PREP (filtered by selected employee) ---
    const exportData = filteredAttendance.map(record => ({
        Date: record.date,
        Employee: getUserName(record.employee_id),
        Status: record.status,
        "Check In": record.clock_in,
        "Check Out": record.clock_out,
        Latitude: record.latitude,
        Longitude: record.longitude
    }));

    // --- EFFECT: Live Location (Updated to store Coords) ---
    useEffect(() => {
        if (!navigator.geolocation) return;
        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                
                // 1. SAVE COORDS TO STATE (Instant access later)
                setCurrentCoords({ latitude, longitude }); 

                const dist = getDistanceFromLatLonInMeters(latitude, longitude, OFFICE_LOCATION.lat, OFFICE_LOCATION.lng);
                setLiveDistance(dist);
                setIsInRange(dist <= ALLOWED_RADIUS_METERS);
            },
            (err) => console.error(err),
            { enableHighAccuracy: true }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    const openMap = (lat, lng) => {
        if (!lat || !lng) return;
        const url = `https://www.google.com/maps?q=${lat},${lng}`;
        window.open(url, '_blank');
    };

    const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) => {
        const R = 6371; 
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return (R * c) * 1000; 
    };

    const deg2rad = (deg) => deg * (Math.PI / 180);

    // --- HANDLERS ---
    
    // Request location consent
    const handleLocationConsent = () => {
        setLocationConsentGiven(true);
        localStorage.setItem(`location_consent_${userProfile.id}`, 'true');
    };

    const handleRevokeLocationConsent = () => {
        setLocationConsentGiven(false);
        localStorage.removeItem(`location_consent_${userProfile.id}`);
    };
    
    // OPTIMIZED CLOCK IN (Uses cached location if available)
    const handleClockIn = async () => {
        // Validation
        if (!currentCoords) return alert("Waiting for GPS location...");
        if (!isInRange) return alert(`Too far! Distance: ${liveDistance?.toFixed(0)}m.`);

        setIsLoading(true);

        const now = new Date();
        const time = now.toLocaleTimeString('en-GB', { hour12: false });
        const status = time > WORK_START_TIME ? 'Late' : 'Present';

        // Only store location if user has given consent
        const { error } = await supabase.from('attendance').insert({
            employee_id: userProfile.id,
            date: today,
            status: status, 
            clock_in: time,
            latitude: currentCoords.latitude, // Use cached state
            longitude: currentCoords.longitude // Use cached state
        });

        if (error) {
            alert('Error: ' + error.message);
        } else {
            await fetchAttendance(); 
        }
        setIsLoading(false);
    };

    // OPTIMIZED CLOCK OUT (Much Faster)
    const handleClockOut = async () => {
        // 1. Instant Validation (No waiting for new GPS position)
        if (!currentCoords) return alert("Waiting for GPS location...");
        if (!isInRange) return alert("Too far to Clock Out!");
        
        setIsLoading(true); 

        // 2. Immediate DB Call using cached coords
        const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
        
        const { error } = await supabase
            .from('attendance')
            .update({ clock_out: time })
            .eq('id', todayRecord.id);
        
        if (error) {
            console.error('Error clocking out:', error);
            alert("Failed to clock out");
        } else {
            // 3. Refresh Data
            await fetchAttendance(); 
        }

        setIsLoading(false); 
    };

    const statusBadge = (status) => {
        const styles = {
            'Present': 'bg-green-100 text-green-700 border border-green-200',
            'Late': 'bg-orange-100 text-orange-700 border border-orange-200',
            'Absent': 'bg-red-100 text-red-700 border border-red-200',
        }[status] || 'bg-gray-100 text-gray-600';
        return <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${styles}`}>{status}</span>;
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* --- LOCATION CONSENT NOTICE --- */}
            {!locationConsentGiven && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 dark:bg-blue-900/30 dark:border-blue-800">
                    <p className="text-blue-900 dark:text-blue-100 text-sm mb-3">
                        This application uses GPS location data to verify you're at the office during clock-in. Your location is stored for attendance records.
                    </p>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleLocationConsent}
                            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
                        >
                            I Agree
                        </button>
                        <span className="text-sm text-blue-800 dark:text-blue-200 self-center">
                            You can withdraw consent anytime in settings.
                        </span>
                    </div>
                </div>
            )}

            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Attendance Overview</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Track employee check-ins and location data.</p>
                </div>
            </div>

            {/* --- SUPERVISOR EMPLOYEE SELECTOR --- */}
            {userProfile.role === 'supervisor' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-2 tracking-wider">View Attendance For</label>
                        <select
                            value={selectedEmployee || ''}
                            onChange={(e) => setSelectedEmployee(e.target.value || null)}
                            className="w-full md:w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="">-- All Employees --</option>
                            {employeeUsers.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                        </select>
                    </div>
                    {/* EXPORT BUTTON */}
                    <div className="pt-2 md:pt-6">
                        <ExportButton 
                            data={exportData} 
                            filename={selectedEmployee ? `Attendance_${getUserName(selectedEmployee).replace(/\s+/g, '_')}` : 'Attendance_Log'} 
                            label="Download Report" 
                        />
                    </div>
                </div>
            )}
            
            {/* --- HERO STATS --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20">
                    <p className="text-blue-200 text-sm font-medium mb-1">Punctuality Score</p>
                    <h3 className="text-4xl font-bold">{punctualityScore}%</h3>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-100 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Total Days Present</p>
                    <h3 className="text-4xl font-bold text-gray-800 dark:text-gray-100">{totalDays}</h3>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-100 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Late Arrivals</p>
                    <h3 className={`text-4xl font-bold ${lateDays > 0 ? 'text-orange-500' : 'text-gray-800 dark:text-gray-100'}`}>{lateDays}</h3>
                </div>
            </div>

            {/* --- ACTION BAR --- */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
                 <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isInRange ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600 animate-pulse'}`}>
                        <span className="text-2xl">📍</span>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{liveDistance !== null ? 'Location Detected' : 'Locating...'}</h2>
                        <p className={`text-sm font-medium ${isInRange ? 'text-green-600' : 'text-red-500'}`}>{liveDistance !== null ? `${liveDistance.toFixed(0)} meters from Office` : 'Waiting for GPS...'}</p>
                    </div>
                 </div>
                 <div className="flex gap-3">
                    {/* CLOCK IN BUTTON */}
                    {!todayRecord && (
                        <button 
                            onClick={handleClockIn} 
                            disabled={isLoading || (liveDistance !== null && !isInRange)} 
                            className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${isLoading || (liveDistance !== null && !isInRange) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {isLoading ? 'Processing...' : 'Clock In Now'}
                        </button>
                    )}

                    {/* CLOCK OUT BUTTON */}
                    {todayRecord && !todayRecord.clock_out && (
                        <button 
                            onClick={handleClockOut} 
                            disabled={isLoading} 
                            className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600'}`}
                        >
                            {isLoading ? 'Processing...' : 'Clock Out'}
                        </button>
                    )}

                    {todayRecord && todayRecord.clock_out && <div className="px-6 py-3 bg-gray-100 text-gray-500 font-bold rounded-xl dark:bg-gray-700 dark:text-gray-300">Day Completed</div>}
                 </div>
            </div>

            {/* --- TABLE --- */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">Date</th>
                                {userProfile.role === 'supervisor' && <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">Employee</th>}
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">Status</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">Check In</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">Check Out</th>
                                {userProfile.role === 'supervisor' && <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">Proof</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredAttendance.map(record => (
                                <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="p-4 font-medium text-gray-700 dark:text-gray-200">{record.date}</td>
                                    {userProfile.role === 'supervisor' && <td className="p-4 text-gray-600 dark:text-gray-300">{getUserName(record.employee_id)}</td>}
                                    <td className="p-4">{statusBadge(record.status)}</td>
                                    <td className="p-4 text-gray-600 dark:text-gray-300">
                                        <div className="flex flex-col">
                                            <span className="font-medium">{record.clock_in}</span>
                                            {record.status === 'Late' && <span className="text-[10px] text-red-500 font-bold">LATE ARRIVAL</span>}
                                        </div>
                                    </td>
                                    <td className="p-4 text-gray-600 dark:text-gray-300">{record.clock_out || '--:--'}</td>
                                    {userProfile.role === 'supervisor' && (
                                        <td className="p-4">
                                            {record.latitude ? <button onClick={() => openMap(record.latitude, record.longitude)} className="text-blue-600 hover:text-blue-800 text-sm font-semibold"><span>🗺️</span> View</button> : <span className="text-gray-300 text-sm">N/A</span>}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AttendanceView;