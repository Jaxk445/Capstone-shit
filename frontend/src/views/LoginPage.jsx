import React, { useState, useEffect } from 'react';
import LoginLogo from '../assets/customs-logo.jpg';
import BackgroundImage from '../assets/becuk foto.jpg'; // <--- Your uploaded background
import { sanitizeText, validateEmail } from '../utils/sanitizer';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [initials, setInitials] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  // --- PARALLAX EFFECT STATE ---
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
        // Calculate mouse position relative to center of screen (-1 to 1)
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = (e.clientY / window.innerHeight) * 2 - 1;
        setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    const safeEmail = sanitizeText(email).trim().toLowerCase();
    const emailValidation = validateEmail(safeEmail);
    if (!emailValidation.isValid) {
      setError(emailValidation.error);
      setLoading(false);
      return;
    }

    try {
        if (isRegisterMode) {
            const safeName = sanitizeText(name).trim().substring(0, 100);
            const safeInitials = sanitizeText(initials).replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 2);

            if (!safeName) {
                setError('Full name is required.');
                setLoading(false);
                return;
            }

            if (safeInitials.length < 2) {
                setError('Initials must contain at least 2 letters.');
                setLoading(false);
                return;
            }

            const resp = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ email: safeEmail, password, name: safeName, initials: safeInitials })
            });

            if (resp.status === 429) {
                const data = await resp.json().catch(() => ({}));
                const wait = data.retryAfter ? Math.max(1, Math.ceil(data.retryAfter / 1000)) : 60;
                setError(`Too many registration attempts. Please try again in ${wait} seconds.`);
                setLoading(false);
                return;
            }

            if (!resp.ok) {
                const data = await resp.json().catch(() => ({ error: 'Registration failed' }));
                throw new Error(data.error || 'Registration failed');
            }

            setMessage('Registration successful! Check your email.');
        } else {
            const resp = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ email: safeEmail, password })
            });

            if (resp.status === 429) {
                const data = await resp.json().catch(() => ({}));
                const wait = data.retryAfter ? Math.max(1, Math.ceil(data.retryAfter / 1000)) : 60;
                setError(`Too many login attempts. Please try again in ${wait} seconds.`);
                setLoading(false);
                return;
            }

            if (!resp.ok) {
                const data = await resp.json().catch(() => ({ error: 'Authentication failed' }));
                throw new Error(data.error || 'Authentication failed');
            }
        }
    } catch (err) {
        setError(sanitizeText(err?.message || 'Authentication failed.'));
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center font-sans bg-slate-900">
      
      {/* 1. PARALLAX BACKGROUND LAYER */}
      <div 
        className="absolute inset-0 z-0 transition-transform duration-100 ease-out"
        style={{
            backgroundImage: `url("${BackgroundImage}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            // Move background slightly opposite to mouse direction
            transform: `scale(1.1) translate(${mousePos.x * -15}px, ${mousePos.y * -15}px)`
        }}
      />

      {/* 2. CINEMATIC OVERLAY (Dark Blue/Gold Gradient for "Government" feel) */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-900/90 via-blue-900/80 to-yellow-900/30 mix-blend-multiply" />
      
      {/* 3. GLASSMORPHISM CARD */}
      <div className="relative z-10 w-full max-w-md p-8 m-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl ring-1 ring-black/5 animate-fade-in-up">
        
        {/* Logo & Header */}
        <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-full mb-4 shadow-inner border border-white/10">
                <img src={LoginLogo} alt="Logo" className="h-12 w-auto drop-shadow-md mix-blend-multiply" />
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight mb-1 drop-shadow-md">
                Bea Cukai
            </h2>
            <p className="text-blue-100 text-xs font-bold tracking-[0.2em] uppercase opacity-80">
                Employee Monitoring System
            </p>
        </div>

        {/* The Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
            
            {isRegisterMode && (
                <div className="grid grid-cols-2 gap-4 animate-fade-in">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-blue-100 uppercase ml-1">Full Name</label>
                        <input 
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all"
                            type="text" 
                            placeholder="Perrell Brown" 
                            value={name} 
                            onChange={(e) => setName(sanitizeText(e.target.value).substring(0, 100))} 
                            required 
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-blue-100 uppercase ml-1">Initials</label>
                        <input 
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-center uppercase focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all"
                            type="text" 
                            placeholder="PB" 
                            value={initials} 
                            onChange={(e) => setInitials(sanitizeText(e.target.value).replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 2))} 
                            required 
                            maxLength="2" 
                        />
                    </div>
                </div>
            )}

            <div className="space-y-1">
                <label className="text-xs font-bold text-blue-100 uppercase ml-1">Official Email</label>
                <input 
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all"
                    type="email" 
                    placeholder="officer@customs.go.id" 
                    value={email} 
                    onChange={(e) => setEmail(sanitizeText(e.target.value).substring(0, 254))} 
                    required 
                />
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-blue-100 uppercase ml-1">Password</label>
                <input 
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all"
                    type="password" 
                    placeholder="••••••••" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                />
            </div>

            {/* Alerts */}
            {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-100 text-sm flex items-center gap-2 animate-shake">
                    <span>⚠️</span> {error}
                </div>
            )}
            {message && (
                <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-100 text-sm flex items-center gap-2">
                    <span>✅</span> {message}
                </div>
            )}

            {/* Action Button */}
            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-slate-900 font-bold py-3.5 rounded-lg shadow-lg transform transition hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? 'Verifying Credentials...' : (isRegisterMode ? 'Register Account' : 'Access Portal')}
            </button>

            {/* Toggle Mode */}
            <div className="text-center pt-2">
                <button 
                    onClick={(e) => { e.preventDefault(); setIsRegisterMode(!isRegisterMode); setError(''); setMessage(''); }}
                    className="text-sm text-blue-200 hover:text-white hover:underline transition-colors"
                >
                    {isRegisterMode ? 'Back to Login' : 'Register New Officer'}
                </button>
            </div>
        </form>
      </div>

      {/* Footer Credit */}
      <div className="absolute bottom-4 text-white/20 text-xs font-mono">
        Authorized Access Only • Directorate General of Customs and Excise
      </div>
    </div>
  );
};

export default LoginPage;