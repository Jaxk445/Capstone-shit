import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const SettingsView = ({ userProfile, fetchProfile }) => {
    const [uploading, setUploading] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // --- AVATAR UPLOAD LOGIC ---
    const handleAvatarUpload = async (event) => {
        try {
            setUploading(true);
            if (!event.target.files || event.target.files.length === 0) {
                return; // No file selected
            }

            const file = event.target.files[0];
            
            // Validate file type (only images)
            const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
            if (!validTypes.includes(file.type)) {
                alert('Only image files (JPG, PNG, WebP, GIF) are allowed.');
                return;
            }
            
            // Validate file size (max 5MB)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                alert('File size must be less than 5MB.');
                return;
            }
            
            // Create a unique path with random ID
            const fileExt = file.name.split('.').pop();
            const randomId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            const filePath = `${userProfile.id}/${randomId}.${fileExt}`;

            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            // 2. Get the Public URL
            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            
            // 3. Save URL to Profile Database
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: data.publicUrl })
                .eq('id', userProfile.id);

            if (updateError) throw updateError;

            alert('Profile picture updated!');
            fetchProfile(); // Refresh the app to show new image
        } catch (error) {
            console.error("Upload error:", error);
            alert('Error uploading image. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    // --- PASSWORD CHANGE LOGIC ---
    const handlePasswordChange = async () => {
        if (password !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }
        
        // Enhanced password validation: minimum 8 characters, at least one uppercase, one lowercase, one number
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(password)) {
            alert("Password must be at least 8 characters long and contain uppercase, lowercase, and numbers.");
            return;
        }

        const { error } = await supabase.auth.updateUser({ password: password });

        if (error) {
            alert("Error updating password. Please ensure you're using a strong password.");
        } else {
            alert("Password updated successfully!");
            setPassword('');
            setConfirmPassword('');
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-8">Account Settings</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* 1. AVATAR CARD */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                    <h3 className="font-bold text-xl mb-6 text-gray-800 dark:text-gray-100">Profile Picture</h3>
                    
                    <div className="flex flex-col items-center">
                        <div className="relative group">
                            {/* Image Circle */}
                            <div className="w-32 h-32 rounded-full bg-gray-100 overflow-hidden border-4 border-white shadow-lg dark:border-gray-700 dark:bg-gray-700">
                                {userProfile.avatar_url ? (
                                    <img 
                                        src={userProfile.avatar_url} 
                                        alt="Avatar" 
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-400">
                                        {userProfile.name?.charAt(0)}
                                    </div>
                                )}
                            </div>

                            {/* Hover Edit Icon */}
                            <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer shadow-md hover:bg-blue-700 transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={handleAvatarUpload} 
                                    disabled={uploading} 
                                />
                            </label>
                        </div>
                        
                        <p className="text-sm text-gray-500 mt-4 dark:text-gray-400">
                            {uploading ? 'Uploading...' : 'Click the pencil to upload. Max 2MB.'}
                        </p>
                    </div>
                </div>

                {/* 2. SECURITY CARD */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                    <h3 className="font-bold text-xl mb-6 text-gray-800 dark:text-gray-100">Security</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1 dark:text-gray-300">New Password</label>
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1 dark:text-gray-300">Confirm Password</label>
                            <input 
                                type="password" 
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="••••••••"
                            />
                        </div>

                        <button 
                            onClick={handlePasswordChange}
                            disabled={!password || !confirmPassword}
                            className="w-full bg-gray-800 text-white font-bold py-3 rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2"
                        >
                            Update Password
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SettingsView;