/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Member } from '../types';
import { generateQrSvg } from '../utils/qrGenerator';
import { motion, AnimatePresence } from 'motion/react';
import { 
  QrCode, 
  CheckCircle, 
  XCircle, 
  Sparkles, 
  User, 
  Calendar,
  AlertCircle,
  Delete,
  X,
  RefreshCw,
  Clock,
  Search,
  Smartphone,
  Volume2,
  VolumeX,
  Fingerprint,
  Lightbulb,
  MessageSquare,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { FeedbackForm } from './FeedbackForm';

interface CheckInPortalProps {
  members: Member[];
  onCheckIn: (memberId: string, method: 'Self QR Scan' | 'Front Desk Scan' | 'Manual Select' | 'Biometric Fingerprint') => { success: boolean; message: string; status: 'Granted' | 'Expired Plan' | 'No Active Plan' };
  onSubmitFeedback?: (feedback: any) => Promise<void>;
}

export function CheckInPortal({ members, onCheckIn, onSubmitFeedback }: CheckInPortalProps) {
  const [authMode, setAuthMode] = useState<'search' | 'pin' | 'biometrics' | 'feedback'>('search'); // 'search' is default for extreme ease of use!
  const [nameQuery, setNameQuery] = useState<string>('');
  const [dobPin, setDobPin] = useState<string>('');
  
  // Biometric states
  const [biometricQuery, setBiometricQuery] = useState('');
  const [biometricSelectedMember, setBiometricSelectedMember] = useState<Member | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatusMsg, setScanStatusMsg] = useState('Place finger on pad to scan');
  const scanIntervalRef = React.useRef<any>(null);

  React.useEffect(() => {
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, []);

  const startFingerprintScan = () => {
    if (!biometricSelectedMember) return;
    setIsScanning(true);
    setScanProgress(0);
    setScanStatusMsg('Initializing biometric scanner...');
    
    let progress = 0;
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    
    scanIntervalRef.current = setInterval(() => {
      progress += 10;
      if (progress === 30) {
        setScanStatusMsg('Scanning fingerprint ridges...');
      } else if (progress === 60) {
        setScanStatusMsg('Matching template with secure database...');
      } else if (progress === 90) {
        setScanStatusMsg('Verifying membership claims...');
      }
      
      if (progress >= 100) {
        clearInterval(scanIntervalRef.current);
        setIsScanning(false);
        setScanProgress(100);
        setScanStatusMsg('Fingerprint template verified!');
        
        // Trigger check in!
        const response = onCheckIn(biometricSelectedMember.id, 'Biometric Fingerprint');
        playBeep(response.success);
        
        setCheckInResult({
          success: response.success,
          message: response.message,
          memberName: biometricSelectedMember.name,
          plan: biometricSelectedMember.plan,
          id: biometricSelectedMember.id,
          status: response.status
        });
        
        setAnimatedName(biometricSelectedMember.name);
        setIsAnimationActive(response.success ? 'success' : 'fail');
        setTimeout(() => {
          setIsAnimationActive(null);
        }, 2500);
        
        // Clean up biometric selections
        setBiometricSelectedMember(null);
        setBiometricQuery('');
        setScanProgress(0);
        setScanStatusMsg('Place finger on pad to scan');
      } else {
        setScanProgress(progress);
      }
    }, 200);
  };
  
  const [checkInResult, setCheckInResult] = useState<{ 
    success: boolean; 
    message: string; 
    memberName: string; 
    plan: string; 
    id: string; 
    status: 'Granted' | 'Expired Plan' | 'No Active Plan' 
  } | null>(null);

  const [liveTime, setLiveTime] = useState<Date>(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [inputError, setInputError] = useState<string | null>(null);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  const [isAnimationActive, setIsAnimationActive] = useState<'success' | 'fail' | null>(null);
  const [animatedName, setAnimatedName] = useState<string>('');

  // Play synthetic check-in sound feedbacks using Web Audio API
  const playBeep = (success: boolean) => {
    if (!isSoundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      
      // Ensure the AudioContext is resumed if the browser started it suspended
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const now = audioCtx.currentTime;

      if (success) {
        // Futuristic pleasant gym check-in double chime (E5 and then A5)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(659.25, now); // E5
        gain1.gain.setValueAtTime(0.08, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start(now);
        osc1.stop(now + 0.15);

        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, now + 0.08); // A5
        gain2.gain.setValueAtTime(0.08, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.3);
      } else {
        // Distinct low diagnostic double buzz warning
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now); // Low buzz
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch (e) {
      console.warn("AudioContext suspended/not supported by browser environment:", e);
    }
  };

  // Keypad Click Handlers
  const handleKeyPress = (num: string) => {
    setInputError(null);
    if (dobPin.length < 4) {
      setDobPin(prev => prev + num);
    }
  };

  const handleBackspace = () => {
    setInputError(null);
    setDobPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setInputError(null);
    setDobPin('');
  };

  // Central trigger check-in logic
  const handleSelfCheckIn = (enteredDob: string) => {
    const cleanInput = enteredDob.trim();
    if (cleanInput.length !== 4 && cleanInput.length !== 6 && cleanInput.length !== 8) {
      setInputError('Please enter your 4-digit Gate PIN (DDMM) or DOB.');
      return;
    }

    const matchedMember = members.find(m => {
      if (m.id === cleanInput) return true;
      if (m.id.length >= 4 && m.id.slice(0, 4) === cleanInput) return true;
      if (m.id.length === 8) {
        const ddmmyy = m.id.slice(0, 4) + m.id.slice(6, 8);
        if (ddmmyy === cleanInput) return true;
      }
      if (m.dob && m.dob.includes('-')) {
        const parts = m.dob.split('-');
        if (parts.length === 3) {
          const [yyyy, mm, dd] = parts;
          const ddmm = `${dd}${mm}`;
          const ddmmyy = `${dd}${mm}${yyyy.slice(-2)}`;
          const ddmmyyyy = `${dd}${mm}${yyyy}`;
          if (ddmm === cleanInput || ddmmyy === cleanInput || ddmmyyyy === cleanInput) return true;
        }
      }
      return false;
    });

    if (!matchedMember) {
      setInputError(`No member registered matching Gate PIN or DOB: ${enteredDob}.`);
      playBeep(false);
      return;
    }

    const response = onCheckIn(matchedMember.id, 'Self QR Scan');
    playBeep(response.success);
    
    setCheckInResult({
      success: response.success,
      message: response.message,
      memberName: matchedMember.name,
      plan: matchedMember.plan,
      id: matchedMember.id,
      status: response.status
    });

    setAnimatedName(matchedMember.name);
    setIsAnimationActive(response.success ? 'success' : 'fail');
    setTimeout(() => {
      setIsAnimationActive(null);
    }, 2500);
  };

  const resetPortalState = () => {
    setDobPin('');
    setNameQuery('');
    setInputError(null);
    setCheckInResult(null);
  };

  // Keyboard and Numpad entry listener for Date of Birth PIN
  React.useEffect(() => {
    if (authMode !== 'pin' || checkInResult) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is active in standard input or text area
      if (
        document.activeElement?.tagName === 'INPUT' || 
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      const key = e.key;
      if (/^[0-9]$/.test(key)) {
        e.preventDefault();
        setInputError(null);
        if (dobPin.length < 6) {
          setDobPin(prev => prev + key);
        }
      } else if (key === 'Backspace') {
        e.preventDefault();
        setInputError(null);
        setDobPin(prev => prev.slice(0, -1));
      } else if (key === 'Escape' || key === 'Delete') {
        e.preventDefault();
        setInputError(null);
        setDobPin('');
      } else if (key === 'Enter') {
        e.preventDefault();
        if (dobPin.length === 6) {
          handleSelfCheckIn(dobPin);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [authMode, checkInResult, dobPin]);

  // Search Results for the custom Name Tab
  const searchResults = useMemo(() => {
    const cleanQuery = nameQuery.trim().toLowerCase();
    if (cleanQuery === '') return [];
    return members.filter(m => 
      m.name.toLowerCase().includes(cleanQuery) || 
      m.id.includes(cleanQuery) ||
      (m.email && m.email.toLowerCase().includes(cleanQuery))
    ).slice(0, 5);
  }, [nameQuery, members]);

  // Search Results for the biometric Fingerprint Scan
  const biometricSearchResults = useMemo(() => {
    const cleanQuery = biometricQuery.trim().toLowerCase();
    if (cleanQuery === '') return [];
    return members.filter(m => 
      m.name.toLowerCase().includes(cleanQuery) || 
      m.id.includes(cleanQuery)
    ).slice(0, 5);
  }, [biometricQuery, members]);

  // Frequently active members listing for swift trial taps
  const suggestedMembers = useMemo(() => {
    return members.filter(m => m.status === 'Active').slice(0, 4);
  }, [members]);

  return (
    <div className="max-w-md mx-auto bg-slate-50 border border-slate-200/60 rounded-3xl overflow-hidden shadow-md font-sans text-slate-800 relative" id="member-portal-card">
      
      {/* Mobile Top Header */}
      <div className="bg-slate-900 text-white p-5 relative select-none">
        <div className="absolute inset-0 bg-radial-gradient from-sky-500/15 to-transparent opacity-40 pointer-events-none"></div>
        <div className="relative flex justify-between items-center text-left">
          <div className="space-y-1">
            <span className="text-[10px] bg-sky-500 text-black font-bold px-2.5 py-0.5 rounded-full inline-block font-mono tracking-wider">
              SELF-CHECK-IN PORTAL
            </span>
            <h1 className="text-lg font-bold font-sans tracking-tight">Apex Fitness Self-Check-In</h1>
            <p className="text-xs text-slate-400">Scan-free, swift gate entrance system</p>
          </div>
          <div className="flex gap-2 items-center">
            <button
              type="button"
              onClick={() => setIsSoundEnabled(!isSoundEnabled)}
              className="p-2 bg-slate-800 text-slate-300 hover:text-white transition-all rounded-xl border border-slate-700 hover:border-slate-600 flex items-center justify-center cursor-pointer relative group"
              title={isSoundEnabled ? "Mute Check-In Sound" : "Enable Check-In Sound"}
              id="self-portal-sound-btn"
            >
              {isSoundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
              <span className="absolute bottom-full mb-1.5 hidden group-hover:block whitespace-nowrap bg-slate-950 text-[10px] text-white px-2 py-1 rounded font-bold transition-all shadow-md">
                {isSoundEnabled ? 'Check-in Sound: ON' : 'Check-in Sound: MUTED'}
              </span>
            </button>
            <div className="bg-slate-800 text-sky-500 p-2.5 rounded-xl">
              <Smartphone className="w-5 h-5 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-5 space-y-5">

        {/* Live Portal Clock */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-550">
            <Clock className="w-4 h-4 text-indigo-500 shrink-0 animate-spin-slow" />
            <span className="text-[11px] font-mono font-extrabold tracking-wider text-slate-500">PORTAL GATE CLOCK</span>
          </div>
          <span className="text-xs font-mono font-black text-indigo-950">
            {liveTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} • {liveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        {!checkInResult ? (
          <div className="space-y-5" id="self-portal-auth">
            
            {/* Tab Selection Switches */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-150 rounded-2xl" id="portal-tab-selector">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('search');
                  setInputError(null);
                }}
                className={`py-2 px-1 text-xs font-bold rounded-xl transition-all ${
                  authMode === 'search' 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                🔍 Name Search
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('pin');
                  setInputError(null);
                }}
                className={`py-2 px-1 text-xs font-bold rounded-xl transition-all ${
                  authMode === 'pin' 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                🔢 Birthdate Pin
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('biometrics');
                  setInputError(null);
                }}
                className={`py-2 px-1 text-xs font-bold rounded-xl transition-all ${
                  authMode === 'biometrics' 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                👤 Biometric Scan
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('feedback');
                  setInputError(null);
                }}
                className={`py-2 px-1 text-xs font-bold rounded-xl transition-all ${
                  authMode === 'feedback' 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                💡 Gym Feedback
              </button>
            </div>

            {/* TAB A: INSTANT NAME SEARCH (QR-Free checkin!) */}
            {authMode === 'search' && (
              <div className="space-y-4 text-left" id="name-search-mode-pane">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">
                    TYPE YOUR NAME OR BADGE ID
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={nameQuery}
                      onChange={e => {
                        setNameQuery(e.target.value);
                        setInputError(null);
                      }}
                      placeholder="Start typing your name (e.g. John)..."
                      className="w-full text-slate-950 pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-sky-500 font-sans transition-all"
                    />
                    {nameQuery && (
                      <button
                        type="button"
                        onClick={() => setNameQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Real-time search autocomplete suggestion list */}
                {nameQuery.trim() !== '' && (
                  <div className="space-y-2" id="search-autocomplete-list">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Matching Members Select:
                    </span>
                    
                    {searchResults.map(member => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => handleSelfCheckIn(member.id)}
                        className="w-full p-3 bg-white hover:bg-sky-50/50 border border-slate-200/80 hover:border-sky-300 rounded-xl transition-all flex items-center justify-between group active:scale-99"
                      >
                        <div className="space-y-0.5 pr-2">
                          <p className="text-xs font-bold text-slate-900 group-hover:text-sky-600 transition-colors">{member.name}</p>
                          <p className="text-[10px] font-mono text-slate-400">Plan: {member.plan} • Code: {member.id}</p>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-150 px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1 group-hover:bg-sky-500 group-hover:text-black group-hover:border-sky-400 transition-colors">
                          <Sparkles className="w-3 h-3 text-emerald-500 group-hover:text-black" />
                          Tap to Check In
                        </span>
                      </button>
                    ))}

                    {searchResults.length === 0 && (
                      <p className="text-xs text-slate-450 italic py-2 bg-slate-100/50 text-center rounded-xl border border-slate-150">
                        No members found matching "{nameQuery}". Take a moment to verify spelling.
                      </p>
                    )}
                  </div>
                )}

                {/* Default layout suggestions screen if state is empty */}
                {nameQuery.trim() === '' && (
                  <div className="space-y-3 bg-white border border-slate-200/60 p-4 rounded-2xl" id="suggested-easylink-panel">
                    <div className="flex gap-1.5 items-center">
                      <Sparkles className="w-3.5 h-3.5 text-sky-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                        Quick Active Directory (1-Click Entrance):
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {suggestedMembers.map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleSelfCheckIn(m.id)}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-sky-50/50 hover:border-sky-300 active:scale-98 transition-all flex items-center justify-between text-left"
                        >
                          <div className="flex items-center justify-between w-full">
                            <div>
                              <span className="text-xs font-bold text-slate-900 block">{m.name}</span>
                              <span className="text-[10px] text-slate-450 font-mono">{m.plan}</span>
                            </div>
                            <span className="text-[9px] font-mono font-bold bg-white text-slate-700 px-2.5 py-1 rounded border border-slate-200 text-center uppercase tracking-wide">
                              Gate PIN: {m.id.length >= 4 ? m.id.slice(0, 4) : m.id}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <p className="text-[11px] text-slate-400 text-center leading-relaxed bg-slate-100/40 p-2.5 rounded-xl border border-slate-150/50">
                  💡 Type your registered first or last name above to matching-filter of your profile and check in with one single touch.
                </p>
              </div>
            )}

            {/* TAB B: BIRTHDATE PIN ENTRY (Traditional) */}
            {authMode === 'pin' && (
              <div className="space-y-4" id="pin-entry-mode-pane">
                {/* Display DOB layout visual slots */}
                <div className="text-center space-y-2">
                  <label className="text-xs text-slate-700 font-extrabold block text-center uppercase tracking-wider">
                    ENTRY GATE PIN (DATE OF BIRTH: DDMM)
                  </label>
                  <p className="text-[10px] text-slate-500 font-sans">
                    Use 4-digit <span className="font-mono font-bold text-sky-700">DDMM</span> (where DD is date and MM is month, e.g. <span className="font-mono font-bold text-emerald-600">2502</span> for 25th Feb).
                  </p>
                  
                  {/* DOB Pins visuals */}
                  <div className="flex justify-center gap-2.5 mt-2" id="pin-slots-row">
                    {[0, 1, 2, 3].map((index) => {
                      const digit = dobPin[index];
                      const label = index < 2 ? 'D' : 'M';

                      return (
                        <div 
                          key={index}
                          className={`w-13 h-14 border-2 rounded-xl flex flex-col items-center justify-center transition-all duration-150 ${
                            dobPin.length === index 
                              ? 'border-sky-500 bg-sky-50/30 ring-2 ring-sky-500/20' 
                              : digit 
                                ? 'border-slate-800 bg-white font-extrabold text-slate-900 text-xl' 
                                : 'border-slate-200 bg-slate-100/60 font-medium text-slate-400'
                          }`}
                        >
                          <span className="text-xl font-sans font-extrabold">{digit || ''}</span>
                          {!digit && <span className="text-[10px] font-mono opacity-50 mt-0.5">{label}</span>}
                        </div>
                      );
                    })}
                  </div>

                  {inputError && (
                    <p className="text-[11px] text-rose-600 font-sans mt-2 bg-rose-50 p-2 rounded-lg flex items-center justify-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{inputError}</span>
                    </p>
                  )}
                </div>

                {/* Custom PIN Keypad */}
                <div className="grid grid-cols-3 gap-2.5 px-6" id="keypad-matrix">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                    <button
                      type="button"
                      key={num}
                      onClick={() => handleKeyPress(num)}
                      className="h-12 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200/90 text-slate-900 font-sans font-bold text-lg rounded-2xl transition-all shadow-xs active:scale-95 flex items-center justify-center select-none"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleClear}
                    className="h-12 bg-slate-100 hover:bg-slate-200 text-slate-500 font-sans font-semibold text-xs rounded-2xl transition-all flex items-center justify-center select-none"
                  >
                    CLEAR
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeyPress('0')}
                    className="h-12 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200/90 text-slate-900 font-sans font-bold text-lg rounded-2xl transition-all shadow-xs active:scale-95 flex items-center justify-center select-none"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleBackspace}
                    className="h-12 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-all flex items-center justify-center select-none"
                    title="Backspace"
                  >
                    <Delete className="w-5 h-5" />
                  </button>
                </div>

                {/* Fast Trigger check-in action button */}
                <button
                  type="button"
                  onClick={() => handleSelfCheckIn(dobPin)}
                  disabled={dobPin.length !== 6}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-sm shadow-md transition-all duration-155 flex items-center justify-center gap-2 ${
                    dobPin.length === 6 
                      ? 'bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-black hover:shadow-lg pointer-events-auto cursor-pointer' 
                      : 'bg-slate-200 text-slate-400 border border-slate-300/40 cursor-not-allowed shadow-none'
                  }`}
                  id="self-checkin-trigger"
                >
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  SUBMIT BIRTHDATE ID
                </button>

                <p className="text-[10px] text-slate-400 text-center leading-relaxed mt-2">
                  ⌨️ <strong>Keyboard enabled:</strong> You can use your physical computer keyboard or numpad to type digits. Press <strong>Backspace</strong> to delete, <strong>Enter</strong> to submit.
                </p>
              </div>
            )}

            {/* TAB C: BIOMETRICS FINGERPRINT SCAN */}
            {authMode === 'biometrics' && (
              <div className="space-y-4 text-left" id="biometrics-pane">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">
                    1. FIND YOUR PROFILE
                  </label>
                  {!biometricSelectedMember ? (
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={biometricQuery}
                        onChange={e => setBiometricQuery(e.target.value)}
                        placeholder="Type your name or Member ID..."
                        className="w-full text-slate-950 pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-sky-500 font-sans transition-all"
                      />
                      {biometricQuery && (
                        <button
                          type="button"
                          onClick={() => setBiometricQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-sky-50 border border-sky-150 p-3 rounded-xl">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                          {biometricSelectedMember.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{biometricSelectedMember.name}</p>
                          <p className="text-[10px] text-slate-550 font-mono">ID: {biometricSelectedMember.id} • {biometricSelectedMember.plan}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setBiometricSelectedMember(null);
                          setScanProgress(0);
                        }}
                        className="p-1 hover:bg-sky-100 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <X className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Autocomplete list for biometrics */}
                {!biometricSelectedMember && biometricQuery.trim() !== '' && (
                  <div className="space-y-1.5" id="biometric-autocomplete-list">
                    {biometricSearchResults.map(member => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => {
                          setBiometricSelectedMember(member);
                          setBiometricQuery('');
                        }}
                        className="w-full p-2.5 bg-white hover:bg-sky-50/50 border border-slate-200 hover:border-sky-300 rounded-xl transition-all flex items-center justify-between text-left active:scale-99"
                      >
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">{member.name}</span>
                          <span className="text-[10px] text-slate-450 font-mono">ID: {member.id} • {member.plan}</span>
                        </div>
                        <span className="text-[9px] font-bold bg-sky-50 border border-sky-150 text-sky-700 px-2.5 py-1 rounded-lg uppercase">
                          Select
                        </span>
                      </button>
                    ))}
                    {biometricSearchResults.length === 0 && (
                      <p className="text-xs text-slate-450 italic py-2 text-center">No matching profiles found.</p>
                    )}
                  </div>
                )}

                {/* Fingerprint scanning pad interface */}
                {biometricSelectedMember && (
                  <div className="bg-white border border-slate-200/65 rounded-2xl p-5 flex flex-col items-center justify-center space-y-4 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      2. SCANNER TOUCH PAD
                    </span>

                    <button
                      type="button"
                      disabled={isScanning}
                      onClick={startFingerprintScan}
                      className={`w-28 h-28 rounded-full border-4 flex items-center justify-center relative cursor-pointer group transition-all active:scale-95 ${
                        isScanning
                          ? 'border-sky-500 bg-sky-500/10 text-sky-500 shadow-lg shadow-sky-500/15 animate-pulse'
                          : 'border-slate-200 hover:border-sky-400 bg-slate-50 hover:bg-sky-50 text-slate-450 hover:text-sky-500'
                      }`}
                    >
                      {/* Scanning Line Indicator */}
                      {isScanning && (
                        <motion.div
                          animate={{ top: ['0%', '100%', '0%'] }}
                          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                          className="absolute left-0 right-0 h-1 bg-sky-400/80 shadow-md shadow-sky-400 z-10"
                        />
                      )}
                      
                      <Fingerprint className="w-14 h-14" />
                    </button>

                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-850">{scanStatusMsg}</p>
                      {isScanning && (
                        <div className="w-40 bg-slate-100 rounded-full h-2 overflow-hidden mx-auto">
                          <div 
                            className="bg-sky-500 h-2 rounded-full transition-all duration-200" 
                            style={{ width: `${scanProgress}%` }}
                          />
                        </div>
                      )}
                      {isScanning && (
                        <p className="text-[10px] font-mono font-bold text-sky-600">{scanProgress}% completed</p>
                      )}
                    </div>
                  </div>
                )}

                {!biometricSelectedMember && biometricQuery.trim() === '' && (
                  <div className="bg-white border border-slate-200/60 p-4 rounded-2xl space-y-3">
                    <div className="flex gap-1.5 items-center">
                      <Fingerprint className="w-4 h-4 text-sky-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                        Touchless Biometric Gate Entrance:
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-450 leading-relaxed text-left">
                      Search and select your profile above, then simulate a fingerprint scan to unlock the gym gate instantly!
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB D: GYM FEEDBACK & IMPROVEMENT SUGGESTIONS */}
            {authMode === 'feedback' && (
              <div className="space-y-4" id="feedback-pane">
                <FeedbackForm 
                  members={members} 
                  onSubmitFeedback={onSubmitFeedback || (async () => {})} 
                />
              </div>
            )}

          </div>
        ) : (
          /* Check-In Success or Denial Result badge ticket */
          <div className="space-y-5 animate-scale-up" id="portal-result-ticket">
            
            <div className={`p-5 rounded-2xl border text-center space-y-4 ${
              checkInResult.success 
                ? 'bg-emerald-50/50 border-emerald-100' 
                : 'bg-rose-50/50 border-rose-100'
            }`}>
              
              <div className="mx-auto inline-flex p-3 rounded-full bg-white shadow-xs">
                {checkInResult.success ? (
                  <CheckCircle className="w-8 h-8 text-emerald-500 animate-bounce" />
                ) : (
                  <XCircle className="w-8 h-8 text-rose-500 animate-pulse" />
                )}
              </div>

              <div className="space-y-1">
                <h3 className={`font-sans font-black text-base tracking-tight ${checkInResult.success ? 'text-emerald-850' : 'text-rose-850'}`}>
                  {checkInResult.success ? 'ACCESS GRANTED!' : 'ACCESS DENIED'}
                </h3>
                <p className="text-xs text-slate-550 max-w-xs mx-auto leading-relaxed">
                  {checkInResult.message}
                </p>
              </div>

              {/* Verified Pass Stub */}
              <div className="bg-white border border-slate-100 rounded-xl p-4 text-left divide-y divide-slate-100 space-y-2">
                <div className="flex justify-between items-center pb-2 flex-wrap gap-1">
                  <span className="text-xs text-slate-400">Entry Timestamp</span>
                  <span className="text-xs font-mono font-black text-indigo-700">
                    {new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} @ {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs text-slate-400">Date of Birth ID</span>
                  <span className="text-xs font-mono font-bold text-slate-800">{checkInResult.id}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs text-slate-400">Full Name</span>
                  <span className="text-xs font-bold text-slate-850">{checkInResult.memberName}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs text-slate-400">Membership Tier</span>
                  <span className="text-xs font-bold text-slate-850">{checkInResult.plan}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-slate-400">Status Code</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold font-semibold uppercase ${
                    checkInResult.success ? 'bg-emerald-100/50 text-emerald-700' : 'bg-rose-100/50 text-rose-700'
                  }`}>
                    {checkInResult.status === 'Granted' ? 'SUCCESS' : 'RESTRICTED'}
                  </span>
                </div>
              </div>

              {/* Personal Pass QR code representing ID for physical scanning */}
              {checkInResult.success && (
                <div className="space-y-2.5 pt-2">
                  <p className="text-[11px] font-bold text-slate-650 flex items-center justify-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-sky-500 animate-pulse" />
                    Digital QR Entry Badge Saved
                  </p>
                  <div className="inline-block p-2.5 border border-slate-100 rounded-xl bg-white shadow-sm">
                    <div 
                      dangerouslySetInnerHTML={{ __html: generateQrSvg(checkInResult.id, 100) }}
                      className="w-[100px] h-[100px]"
                    />
                  </div>
                </div>
              )}

            </div>

            <button
              onClick={resetPortalState}
              className="w-full bg-slate-900 hover:bg-slate-850 text-white font-bold py-3 px-4 rounded-xl font-sans text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Done - Ready next member
            </button>

          </div>
        )}

      </div>

      {/* Footer Branding */}
      <div className="border-t border-slate-200/50 bg-slate-100/40 p-3 text-center">
        <p className="text-[10px] text-slate-405 font-sans tracking-wide">
          Apex Fitness Local Gate Checkin • Powered by localStorage
        </p>
      </div>

      {/* Animated Scanning Result Overlay Panel */}
      <AnimatePresence>
        {isAnimationActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`absolute inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-md p-6 text-center ${
              isAnimationActive === 'success' 
                ? 'bg-emerald-950/95 text-white' 
                : 'bg-rose-950/95 text-white'
            }`}
            id="portal-active-animation-overlay"
          >
            {/* Expanding success/fail ring animation */}
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 15, stiffness: 200 }}
              className="relative flex items-center justify-center flex-col space-y-4"
            >
              <div className="relative">
                {/* Ripple waves */}
                <motion.div
                  animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeOut' }}
                  className={`absolute inset-0 rounded-full ${
                    isAnimationActive === 'success' ? 'bg-emerald-400' : 'bg-rose-500'
                  }`}
                />
                <motion.div
                  animate={{ scale: [1, 1.4], opacity: [0.4, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: 0.5, ease: 'easeOut' }}
                  className={`absolute inset-0 rounded-full ${
                    isAnimationActive === 'success' ? 'bg-emerald-400' : 'bg-rose-500'
                  }`}
                />

                {/* Main Center Badge */}
                <div className={`w-20 h-20 rounded-full flex items-center justify-center relative z-10 border-4 shadow-xl ${
                  isAnimationActive === 'success' 
                    ? 'bg-emerald-500 border-white text-white' 
                    : 'bg-rose-500 border-white text-white'
                }`}>
                  {isAnimationActive === 'success' ? (
                    <CheckCircle className="w-10 h-10 animate-bounce" />
                  ) : (
                    <XCircle className="w-10 h-10 animate-pulse" />
                  )}
                </div>
              </div>

              <div className="space-y-1.5 z-10">
                <motion.h4
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-xl font-black tracking-tight"
                >
                  {isAnimationActive === 'success' ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
                </motion.h4>
                
                <motion.p
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-sm font-bold opacity-95 max-w-xs mx-auto truncate"
                >
                  {animatedName}
                </motion.p>
                
                <motion.p
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-xs opacity-75 leading-relaxed max-w-xs mx-auto"
                >
                  {isAnimationActive === 'success' 
                    ? '🔓 Gym Gate Unlocked! Enjoy your workout.' 
                    : '🔒 Membership inactive or expired. Visit desk.'}
                </motion.p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
