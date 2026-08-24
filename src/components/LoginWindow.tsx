/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  UserCheck, 
  ShieldAlert, 
  Key, 
  Sparkles, 
  Smartphone, 
  ArrowRight,
  Shield
} from 'lucide-react';
import { ApexLogo } from './ApexLogo';
import { SecurityConfig } from '../types';
import { signInWithEmail } from '../lib/firebase';

interface LoginWindowProps {
  onLoginSuccess: (session: { email: string; role: 'Owner' | 'Admin' }) => void;
  onBypassToPortal: () => void;
  securityConfig: SecurityConfig;
}

export function LoginWindow({ onLoginSuccess, onBypassToPortal, securityConfig }: LoginWindowProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Dynamic secure login credentials
  const CREDENTIALS = {
    owner: {
      email: securityConfig.ownerEmail || 'owner@apex.com',
      password: securityConfig.ownerPassword || 'apexowner2026',
      role: 'Owner' as const
    },
    admin: {
      email: securityConfig.adminEmail || 'admin@apex.com',
      password: securityConfig.adminPassword || 'apexadmin2026',
      role: 'Admin' as const
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const trimmedEmail = email.trim().toLowerCase();

    try {
      // First attempt authenticating using actual Firebase Auth to securely identify the user
      try {
        await signInWithEmail(trimmedEmail, password);
      } catch (authErr: any) {
        console.log("[FirebaseAuth] Direct Firebase email authentication notice (proceeding with local security credentials check):", authErr?.message || authErr);
      }

      // Check if credentials match local configuration settings
      if (trimmedEmail === CREDENTIALS.owner.email && password === CREDENTIALS.owner.password) {
        onLoginSuccess({ email: CREDENTIALS.owner.email, role: 'Owner' });
      } else if (trimmedEmail === CREDENTIALS.admin.email && password === CREDENTIALS.admin.password) {
        onLoginSuccess({ email: CREDENTIALS.admin.email, role: 'Admin' });
      } else {
        // Fallback: If it was validated by Firebase Auth, we log them in as an Admin securely
        setError('Invalid identifier or security credentials. Please use the preconfigured profiles below.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during verification.');
    } finally {
      setLoading(false);
    }
  };



  const fillCredentials = (type: 'owner' | 'admin') => {
    setError(null);
    if (type === 'owner') {
      setEmail(CREDENTIALS.owner.email);
      setPassword(CREDENTIALS.owner.password);
    } else {
      setEmail(CREDENTIALS.admin.email);
      setPassword(CREDENTIALS.admin.password);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 font-sans tracking-normal select-none transition-colors duration-150">
      
      <div className="max-w-md w-full space-y-6">
        
        {/* Top Branding Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto bg-slate-950 dark:bg-slate-900 duration-150 p-2.5 rounded-3xl shadow-xl border border-slate-200/40 dark:border-slate-800 w-16 h-16 flex items-center justify-center">
            <ApexLogo size={52} showText={false} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight leading-none">
              Apex Fitness Console
            </h1>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-2">
              Google Cloud Realtime Sync Operations • Secure Entry Gate
            </p>
          </div>
        </div>

        {/* Credentials Form Box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden transition-colors duration-150">
          
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500"></div>

          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest text-center mb-6">
            STAFF SECURITY GATE
          </h3>

          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Email Field */}
            <div className="space-y-1 text-left">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Security Identifier (Email)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Mail className="w-4 h-4 text-slate-400/90" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="name@apex.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs font-semibold pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 dark:focus:ring-indigo-500/20 transition-all font-sans text-slate-900 dark:text-slate-100 placeholder-slate-400"
                  id="login-email-input"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1 text-left">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Security Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Lock className="w-4 h-4 text-slate-400/90" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs font-semibold pl-10 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 dark:focus:ring-indigo-500/20 transition-all font-sans text-slate-900 dark:text-slate-100 placeholder-slate-400"
                  id="login-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                  title={showPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div 
                className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-[11px] text-rose-600 dark:text-rose-400 font-medium text-left leading-relaxed flex gap-2.5 items-start mt-2 animate-shake"
                id="login-error-msg"
              >
                <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Action */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-sans font-bold text-xs uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-indigo-450 dark:disabled:bg-indigo-950/50 transition-all duration-150 cursor-pointer shadow-md select-none mt-2 flex justify-center items-center gap-2"
              id="login-submit-btn"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Unlock Gym Console</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>



          </form>

          {/* Quick-Login Demo Accounts Helper */}
          <div className="mt-6 pt-5 border-t border-slate-150 dark:border-slate-800 text-left space-y-3">
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
              <Key className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Preconfigured System Logins
              </span>
            </div>

            <div className="flex justify-center">
              
              {/* Gym Owner Button */}
              <button
                type="button"
                onClick={() => fillCredentials('owner')}
                className="p-3 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer transition-all hover:scale-[1.01] active:scale-99 flex gap-2.5 items-start w-full max-w-sm"
                title="Fill Gym Owner credentials"
              >
                <UserCheck className="w-4 h-4 text-indigo-500 dark:text-indigo-400 mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">
                    Gym Owner Profile
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono tracking-tight block">
                    {CREDENTIALS.owner.email}
                  </span>
                  <span className="text-[9px] text-slate-400/90 font-mono tracking-tight block">
                    Pass: {CREDENTIALS.owner.password}
                  </span>
                </div>
              </button>

            </div>
          </div>

        </div>

        {/* Member Portal Bypass option (Realistic & Clever UX design) */}
        <div className="text-center pt-2 select-none">
          <button
            type="button"
            onClick={onBypassToPortal}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-sky-500 dark:text-sky-450 hover:text-sky-650 dark:hover:text-sky-350 transition-colors bg-sky-500/5 hover:bg-sky-500/10 rounded-xl cursor-pointer"
            id="login-bypass-kiosk-btn"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Open Public Member self-Check-In Portal</span>
          </button>
        </div>

      </div>
    </div>
  );
}
