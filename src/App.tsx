/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Member, CheckIn, MembershipPlan, WelcomeMessage, SecurityConfig, Feedback } from './types';
import { INITIAL_MEMBERS, INITIAL_CHECKINS, MEMBERSHIP_PLANS } from './data/initialData';
import { Dashboard } from './components/Dashboard';
import { MembersList } from './components/MembersList';
import { ApexLogo } from './components/ApexLogo';
import { CheckInStation } from './components/CheckInStation';
import { CheckInPortal } from './components/CheckInPortal';
import { MemberPortal } from './components/MemberPortal';
import { ExpiryReminders } from './components/ExpiryReminders';
import { InvoiceModal } from './components/InvoiceModal';
import { LoginWindow } from './components/LoginWindow';
import { AdminPanel } from './components/AdminPanel';
import { FeedbackManager } from './components/FeedbackManager';
import { parseDate, calculateExpiryDate, formatDateDDMMYYYY } from './utils/dateUtils';
import { 
  seedDatabaseIfEmpty, 
  subscribeToMembers, 
  subscribeToPlans, 
  subscribeToCheckIns,
  subscribeToWelcomeMessages,
  dbAddMember,
  dbUpdateMember,
  dbDeleteMember,
  dbAddCheckIn,
  dbAddPlan,
  dbDeletePlan,
  dbAddWelcomeMessage,
  dbUpdateWelcomeMessage,
  dbDeleteWelcomeMessage,
  dbClearCheckIns,
  dbClearWelcomeMessages,
  dbResetMemberStats,
  subscribeToSecurityConfig,
  dbUpdateSecurityConfig,
  getLocalSecurityConfig,
  subscribeToFeedbacks,
  dbAddFeedback,
  dbUpdateFeedbackStatus,
  dbDeleteFeedback,
  dbClearFeedbacks
} from './lib/firebase';
import { 
  Dumbbell, 
  LayoutDashboard, 
  Users, 
  QrCode, 
  Smartphone, 
  Database, 
  MapPin, 
  TrendingUp,
  Server,
  MessageSquare,
  Megaphone,
  Sparkles,
  X,
  Sun,
  Moon,
  Shield,
  Lock,
  Unlock,
  LogOut,
  Sliders,
  RotateCcw,
  Trash2,
  ThumbsUp
} from 'lucide-react';

export default function App() {
  // Current app date reference: 2026-06-20
  const CURRENT_DATE_ANCHOR = '2026-06-20';

  // State maps synced with Firebase in real-time
  const [members, setMembers] = useState<Member[]>(() => INITIAL_MEMBERS);
  const [checkIns, setCheckIns] = useState<CheckIn[]>(() => INITIAL_CHECKINS);
  const [plans, setPlans] = useState<MembershipPlan[]>(() => MEMBERSHIP_PLANS);
  const [welcomeMessages, setWelcomeMessages] = useState<WelcomeMessage[]>([]);
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>(() => getLocalSecurityConfig());
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);

  const [currency, setCurrency] = useState<string>(() => {
    return localStorage.getItem('ironpulse_local_currency') || '$';
  });

  // Invoice & billing state
  const [activeInvoiceMember, setActiveInvoiceMember] = useState<Member | null>(null);
  const [isInvoiceNewRegistration, setIsInvoiceNewRegistration] = useState<boolean>(false);

  // Navigation state
  const [currentView, setCurrentView] = useState<'dashboard' | 'members' | 'station' | 'portal' | 'reminders' | 'admin' | 'feedbacks'>('dashboard');
  const [isSimulatorEnabled, setIsSimulatorEnabled] = useState<boolean>(true); // Dynamic split-screener

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<{ email: string; role: 'Owner' | 'Admin' } | null>(() => {
    const saved = localStorage.getItem('apex_fitness_user_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('apex_fitness_user_session', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('apex_fitness_user_session');
    }
  }, [currentUser]);

  const [liveTime, setLiveTime] = useState<Date>(new Date());

  // 1a. Theme Toggle State Setup (Light / Dark)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('apex_fitness_theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('apex_fitness_theme', theme);
  }, [theme]);

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. Setup Firebase Subscriptions and Seeding on Mount
  useEffect(() => {
    let active = true;
    let unsubMembers = () => {};
    let unsubPlans = () => {};
    let unsubCheckins = () => {};
    let unsubMessages = () => {};
    let unsubSecurity = () => {};
    let unsubFeedbacks = () => {};

    const initializeStore = async () => {
      // Seed Firestore with initial records if collections are empty
      await seedDatabaseIfEmpty();

      if (!active) return;

      // Establish persistent realtime listeners
      unsubMembers = subscribeToMembers((updated) => {
        if (active && updated) {
          setMembers(updated);
        }
      });

      unsubPlans = subscribeToPlans((updated) => {
        if (active && updated) {
          setPlans(updated);
        }
      });

      unsubCheckins = subscribeToCheckIns((updated) => {
        if (active && updated) {
          setCheckIns(updated);
        }
      });

      unsubMessages = subscribeToWelcomeMessages((updated) => {
        if (active && updated) {
          setWelcomeMessages(updated);
        }
      });

      unsubSecurity = subscribeToSecurityConfig((updated) => {
        if (active && updated) {
          setSecurityConfig(updated);
        }
      });

      unsubFeedbacks = subscribeToFeedbacks((updated) => {
        if (active && updated) {
          setFeedbacks(updated);
        }
      });
    };

    initializeStore();

    return () => {
      active = false;
      unsubMembers();
      unsubPlans();
      unsubCheckins();
      unsubMessages();
      unsubSecurity();
      unsubFeedbacks();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('ironpulse_local_currency', currency);
  }, [currency]);

  // Read query parameters to automatically route QR scans
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam === 'portal' || viewParam === 'checkin') {
      setCurrentView('portal');
      setIsSimulatorEnabled(false); // Disable split screen if requested as solo portal screen (e.g. from mobile QR scan link)
    }
  }, []);

  // 1b. Central background auto-renewal logic for members with the autoRenew flag enabled
  useEffect(() => {
    if (!members || members.length === 0) return;

    const todayNum = parseDate(CURRENT_DATE_ANCHOR).getTime();

    members.forEach(member => {
      if (member.autoRenew) {
        const expiryNum = parseDate(member.expiryDate).getTime();
        if (expiryNum < todayNum) {
          const planObj = plans.find(p => p.name.toLowerCase() === member.plan.toLowerCase()) || 
                          plans.find(p => p.name === 'Monthly Core') || 
                          plans[0];
          const duration = planObj ? planObj.durationDays : 30;

          const { expiryDateIso } = calculateExpiryDate(member.expiryDate, duration);

          console.log(`[Auto-Renew Routine] Automatically renewed ${member.name} (${member.id}) from ${member.expiryDate} to ${expiryDateIso} (Plan: ${member.plan})`);
          
          dbUpdateMember(member.id, {
            expiryDate: expiryDateIso,
            status: 'Active'
          });
        }
      }
    });
  }, [members, plans]);

  // 2. Central membership check-in business engine
  const handleProcessCheckIn = (
    memberId: string, 
    method: 'Self QR Scan' | 'Front Desk Scan' | 'Manual Select'
  ): { success: boolean; message: string; status: 'Granted' | 'Expired Plan' | 'No Active Plan' } => {
    const cleanId = memberId.trim().toUpperCase();
    
    // Find member by exact ID (DDMMYYYY) OR 4-digit entry gate PIN (DDMM)
    const memberIndex = members.findIndex(m => {
      if (m.id.toUpperCase() === cleanId) return true;
      // 4-digit DDMM gate PIN match (e.g. "2502" from "25022006" or "250206")
      if (m.id.length >= 4 && m.id.slice(0, 4).toUpperCase() === cleanId) return true;
      // Convert 8-digit DDMMYYYY ID e.g. "20061988" to 6-digit gate PIN "200688"
      if (m.id.length === 8) {
        const ddmmyy = (m.id.slice(0, 4) + m.id.slice(6, 8)).toUpperCase();
        if (ddmmyy === cleanId) return true;
      }
      // Check from member's dob string YYYY-MM-DD
      if (m.dob && m.dob.includes('-')) {
        const parts = m.dob.split('-');
        if (parts.length === 3) {
          const [yyyy, mm, dd] = parts;
          const ddmm = `${dd}${mm}`.toUpperCase();
          const ddmmyy = `${dd}${mm}${yyyy.slice(-2)}`.toUpperCase();
          const ddmmyyyy = `${dd}${mm}${yyyy}`.toUpperCase();
          if (ddmm === cleanId || ddmmyy === cleanId || ddmmyyyy === cleanId) return true;
        }
      }
      return false;
    });
    
    if (memberIndex === -1) {
      return { 
        success: false, 
        message: `No active profile found matching identity ${cleanId}.`, 
        status: 'No Active Plan' 
      };
    }

    const member = members[memberIndex];
    
    // Check if membership is explicitly Paused
    if (member.status === 'Paused') {
      return {
        success: false,
        message: `Membership for ${member.name} is currently PAUSED. Please visit the front desk manager to reactivate.`,
        status: 'No Active Plan'
      };
    }

    // Check if membership is expired (expiryDate is strictly before today)
    const todayNum = parseDate(CURRENT_DATE_ANCHOR).getTime();
    let expiryNum = parseDate(member.expiryDate).getTime();
    let targetExpiryDate = member.expiryDate;
    let targetStatus = member.status;
    let autoRenewedNow = false;
    
    if (targetStatus === 'Expired' || expiryNum < todayNum) {
      if (member.autoRenew) {
        // Automatically renew the membership on Check-In!
        const planObj = plans.find(p => p.name.toLowerCase() === member.plan.toLowerCase()) || 
                        plans.find(p => p.name === 'Monthly Core') || 
                        plans[0];
        const duration = planObj ? planObj.durationDays : 30;

        const { expiryDateIso } = calculateExpiryDate(member.expiryDate, duration);
        targetExpiryDate = expiryDateIso;
        targetStatus = 'Active';
        autoRenewedNow = true;

        console.log(`[Auto-Renew Check-In] Seamlessly auto-renewed profile of ${member.name} (${member.id}) to ${targetExpiryDate}`);
      } else {
        // Auto-update status to Expired if we detect it during swipe
        if (member.status !== 'Expired') {
          dbUpdateMember(member.id, { status: 'Expired' });
        }
        return {
          success: false,
          message: `Membership plan has expired on ${formatDateDDMMYYYY(member.expiryDate)}. Please renew subscription.`,
          status: 'Expired Plan'
        };
      }
    }

    // Happy Path: Success checkin!
    // Update total counts and set last checkin timestamp
    const nowTimestamp = new Date().toISOString().split('T')[0] + 'T' + new Date().toTimeString().split(' ')[0] + 'Z';
    
    const memberUpdates: Partial<Member> = {
      totalCheckIns: member.totalCheckIns + 1,
      lastCheckIn: nowTimestamp,
      status: 'Active' // Secure fallback
    };

    if (autoRenewedNow) {
      memberUpdates.expiryDate = targetExpiryDate;
    }

    dbUpdateMember(member.id, memberUpdates);

    // Append new checkin item
    const newCheckIn: CheckIn = {
      id: `CI-${Math.floor(1000 + Math.random() * 9000)}`,
      memberId: member.id,
      memberName: member.name,
      timestamp: nowTimestamp,
      planType: member.plan,
      method,
      status: 'Granted'
    };
    dbAddCheckIn(newCheckIn);

    // Create custom Check-In greeting welcome message
    const customWelcomeTemplate = localStorage.getItem('ironpulse_template_entry') || "Hello {NAME}! 💪 Checked in via {METHOD} for your {PLAN} training session. Let's make today count!";
    let compiledEntryMsgText = customWelcomeTemplate
      .replace(/{NAME}/g, member.name)
      .replace(/{METHOD}/g, method)
      .replace(/{PLAN}/g, member.plan);

    const checkInGreetingMsg: WelcomeMessage = {
      id: `MSG-${Math.floor(100000 + Math.random() * 900000)}`,
      type: 'CheckIn',
      memberId: member.id,
      memberName: member.name,
      phone: member.phone,
      messageText: compiledEntryMsgText,
      timestamp: nowTimestamp,
      method: method,
      plan: member.plan,
      status: 'Pending'
    };
    dbAddWelcomeMessage(checkInGreetingMsg);

    return {
      success: true,
      message: `Checked in successfully! Have an excellent training session.`,
      status: 'Granted'
    };
  };

  // Add a new member
  const handleAddMember = (m: Omit<Member, 'totalCheckIns' | 'lastCheckIn'>) => {
    const newMember: Member = {
      ...m,
      totalCheckIns: 0,
      lastCheckIn: null
    };

    dbAddMember(newMember);
    setIsInvoiceNewRegistration(true);
    setActiveInvoiceMember(newMember);

    // Create New Registration Welcome Message
    const nowTimestamp = new Date().toISOString().split('T')[0] + 'T' + new Date().toTimeString().split(' ')[0] + 'Z';
    const customRegTemplate = localStorage.getItem('ironpulse_template_welcome') || "Welcome to Apex Fitness, {NAME}! 🚀 Your account is active under the {PLAN} subscription. We are thrilled to helper you achieve your goals!";
    let compiledWelcomeMsgText = customRegTemplate
      .replace(/{NAME}/g, newMember.name)
      .replace(/{PLAN}/g, newMember.plan);

    const regWelcomeMsg: WelcomeMessage = {
      id: `MSG-${Math.floor(100000 + Math.random() * 900000)}`,
      type: 'Welcome',
      memberId: newMember.id,
      memberName: newMember.name,
      phone: newMember.phone,
      messageText: compiledWelcomeMsgText,
      timestamp: nowTimestamp,
      plan: newMember.plan,
      status: 'Pending'
    };
    dbAddWelcomeMessage(regWelcomeMsg);
  };

  // Update existing member details
  const handleUpdateMember = (id: string, updates: Partial<Member>) => {
    dbUpdateMember(id, updates);
  };

  // Permanently delete member from database
  const handleDeleteMember = (id: string) => {
    dbDeleteMember(id);
  };

  // Add a new member suggestion / feedback
  const handleAddFeedback = async (feedbackData: Omit<Feedback, 'id' | 'timestamp' | 'status'>) => {
    const newFeedback: Feedback = {
      ...feedbackData,
      id: `FB-${Math.floor(100000 + Math.random() * 900000)}`,
      timestamp: new Date().toISOString(),
      status: 'Pending'
    };
    await dbAddFeedback(newFeedback);
  };

  // Batch update plans (Add, Update, or Delete configurations)
  const handleUpdatePlans = async (newPlans: MembershipPlan[]) => {
    try {
      // Find plans that were removed/deleted
      const deletedPlans = plans.filter(p => !newPlans.find(np => np.name.trim().toLowerCase() === p.name.trim().toLowerCase()));
      for (const dp of deletedPlans) {
        await dbDeletePlan(dp.name);
      }
      // Add or update other plans
      for (const p of newPlans) {
        await dbAddPlan(p);
      }
    } catch (e) {
      console.error("Failed to sync updated configurations with Firestore: ", e);
    }
  };

  // Clear entire cloud storage to reset demo
  const handleResetDatabase = async () => {
    if (confirm('Are you sure you want to reset all data in the cloud? This will re-write member directory, plans, and currency back to original factory states across Firebase.')) {
      try {
        for (const plan of MEMBERSHIP_PLANS) {
          await dbAddPlan(plan);
        }
        for (const m of INITIAL_MEMBERS) {
          await dbAddMember(m);
        }
        for (const c of INITIAL_CHECKINS) {
          await dbAddCheckIn(c);
        }
        setCurrency('$');
        alert('Cloud Firestore database re-seeded successfully.');
      } catch (err) {
        console.error("Failed to reset firebase database: ", err);
        alert('Reset operations failed, please inspect console logs.');
      }
    }
  };

  // Admin-specific operations:
  const handleResetMemberStats = async () => {
    try {
      await dbResetMemberStats();
    } catch (err) {
      console.error("Admin stats reset failed: ", err);
      throw err;
    }
  };

  const handleClearCheckIns = async () => {
    try {
      await dbClearCheckIns();
    } catch (err) {
      console.error("Admin check-ins purge failed: ", err);
      throw err;
    }
  };

  const handleClearWelcomeMessages = async () => {
    try {
      await dbClearWelcomeMessages();
    } catch (err) {
      console.error("Admin welcome messages purge failed: ", err);
      throw err;
    }
  };

  const handleFactoryResetDirect = async () => {
    try {
      // Clear welcome messages and checkins first
      await dbClearWelcomeMessages();
      await dbClearCheckIns();
      // Re-add default states
      for (const plan of MEMBERSHIP_PLANS) {
        await dbAddPlan(plan);
      }
      for (const m of INITIAL_MEMBERS) {
        await dbAddMember(m);
      }
      for (const c of INITIAL_CHECKINS) {
        await dbAddCheckIn(c);
      }
      setCurrency('$');
    } catch (err) {
      console.error("Factory Reset Direct failed: ", err);
      throw err;
    }
  };

  // Security Gateway Checker (Restricts everything except standalone client QR self-checkin workspace)
  if (!currentUser && !(currentView === 'portal' && !isSimulatorEnabled)) {
    return (
      <LoginWindow 
        securityConfig={securityConfig}
        onLoginSuccess={(session) => {
          setCurrentUser(session);
          setCurrentView('dashboard');
        }}
        onBypassToPortal={() => {
          setCurrentView('portal');
          setIsSimulatorEnabled(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans tracking-normal flex flex-col justify-between relative text-slate-900 dark:text-slate-100 transition-colors duration-150">
      
      {/* 1. TOP SECURE NAVIGATION BAR */}
      <header className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200/95 dark:border-slate-800 shadow-xs z-40 select-none transition-colors duration-150">
        <div className="max-w-7xl mx-auto px-4 md:px-8 min-h-18 py-3.5 md:py-0 flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Logo Brand Row */}
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-3">
              <div className="bg-slate-950 p-0.5 rounded-full shadow-md flex items-center justify-center border border-slate-800">
                <ApexLogo size={42} showText={false} />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="font-sans font-black text-lg text-slate-900 dark:text-slate-100 leading-none">Apex Fitness</span>
                  <span className="text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-850">CLOUD</span>
                </div>
                <span className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 font-sans block mt-0.5">Firestore Live Sync</span>
              </div>
            </div>

            {/* Mobile Theme Toggle & Profile Info */}
            <div className="md:hidden flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 flex items-center justify-center"
                id="theme-toggle-mobile"
                aria-label="Toggle Theme"
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}
              </button>

              {currentUser && (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentUser(null);
                    setCurrentView('dashboard');
                  }}
                  className="p-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors cursor-pointer border border-rose-500/10 flex items-center gap-1 text-[11px] font-bold h-[38px]"
                  title="Sign Out Session"
                  id="mobile-logout-btn"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Out</span>
                </button>
              )}
            </div>
          </div>

          {/* Nav Controls */}
          <nav className="flex flex-wrap items-center justify-center gap-1 bg-slate-100/75 dark:bg-slate-800/60 p-1 rounded-xl w-full md:w-auto border border-transparent dark:border-slate-700/60 transition-colors" id="nav-navigation-menu">
            
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-sans font-semibold text-xs transition-all cursor-pointer ${
                currentView === 'dashboard' 
                  ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-50 shadow-xs border border-transparent dark:border-slate-800' 
                  : 'text-slate-500 dark:text-slate-405 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Overview
            </button>

            <button
              onClick={() => setCurrentView('members')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-sans font-semibold text-xs transition-all cursor-pointer ${
                currentView === 'members' 
                  ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-50 shadow-xs border border-transparent dark:border-slate-800' 
                  : 'text-slate-500 dark:text-slate-405 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
              id="nav-members-btn"
            >
              <Users className="w-3.5 h-3.5" />
              Members
            </button>

            <button
              onClick={() => setCurrentView('station')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-sans font-semibold text-xs transition-all cursor-pointer ${
                currentView === 'station' 
                  ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-50 shadow-xs border border-transparent dark:border-slate-800' 
                  : 'text-slate-500 dark:text-slate-405 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
              id="nav-station-btn"
            >
              <QrCode className="w-3.5 h-3.5" />
              Check-In Desk
            </button>

            <button
              onClick={() => setCurrentView('reminders')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-sans font-semibold text-xs transition-all relative cursor-pointer ${
                currentView === 'reminders' 
                  ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-50 shadow-xs border border-transparent dark:border-slate-800' 
                  : 'text-slate-500 dark:text-slate-405 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
              id="nav-reminders-btn"
            >
              <MessageSquare className="w-3.5 h-3.5 text-sky-500" />
              WhatsApp Alerts
              {members.some(m => {
                const expiry = new Date(m.expiryDate);
                const today = new Date('2026-06-20');
                const diffTime = expiry.getTime() - today.getTime();
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                return m.status === 'Active' && diffDays === 5;
              }) && (
                <span className="absolute -top-1.5 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
                </span>
              )}
            </button>

            <button
              onClick={() => setCurrentView('portal')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-sans font-semibold text-xs transition-all cursor-pointer ${
                currentView === 'portal' 
                  ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-50 shadow-xs border border-transparent dark:border-slate-800' 
                  : 'text-slate-500 dark:text-slate-450 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
              id="nav-portal-btn"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Member Portal
            </button>

            <button
              onClick={() => setCurrentView('feedbacks')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-sans font-semibold text-xs transition-all cursor-pointer ${
                currentView === 'feedbacks' 
                  ? 'bg-amber-500 text-black shadow-xs border border-transparent font-bold' 
                  : 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-350 font-bold bg-amber-500/10 hover:bg-amber-500/15'
              }`}
              id="nav-feedbacks-btn"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              Feedbacks Hub
            </button>

            {currentUser && currentUser.role === 'Admin' && (
              <button
                onClick={() => setCurrentView('admin')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-sans font-semibold text-xs transition-all cursor-pointer ${
                  currentView === 'admin' 
                    ? 'bg-emerald-600 text-white shadow-xs border border-transparent font-bold' 
                    : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-350 font-bold bg-emerald-500/10 hover:bg-emerald-500/15'
                }`}
                id="nav-admin-btn"
              >
                <Shield className="w-3.5 h-3.5" />
                Admin Panel
              </button>
            )}

          </nav>

          {/* Quick Stats Indicator */}
          <div className="hidden lg:flex items-center gap-4 text-xs font-mono font-bold text-slate-500">

            {/* Live Clock Indicator */}
            <div className="flex items-center gap-2 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-300 border border-indigo-150/70 dark:border-indigo-800 rounded-lg px-3 py-1.5 select-none font-sans">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-mono text-xs font-bold leading-none">
                {liveTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} • {liveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-lg px-3 py-1.5 balance-pill">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span>DB Size: {members.length} Cards</span>
            </div>

            {/* Desktop Theme Toggle Button */}
            <button
              type="button"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-205 dark:hover:bg-slate-700 transition-colors font-sans font-semibold text-xs cursor-pointer select-none"
              id="theme-toggle-desktop"
              title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-3.5 h-3.5" />
                  <span>Dark Mode</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Light Mode</span>
                </>
              )}
            </button>

            {currentUser && (
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg select-none font-sans text-xs">
                <span className={`w-2 h-2 rounded-full ${currentUser.role === 'Admin' ? 'bg-emerald-500 animate-pulse' : 'bg-indigo-500 animate-pulse'}`} />
                <span className="font-bold text-slate-700 dark:text-slate-300">{currentUser.role === 'Admin' ? 'Admin' : 'Owner'}</span>
                <span className="text-slate-300 dark:text-slate-650">|</span>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentUser(null);
                    setCurrentView('dashboard');
                  }}
                  className="text-xs font-bold text-rose-500 hover:text-rose-600 cursor-pointer flex items-center gap-1 hover:underline transition-colors focus:outline-none"
                  title="Sign Out Session"
                  id="header-logout-btn"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Out</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* 2. MAIN WORKSPACE */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6">
        
        {/* Dynamic Simulator Toggle Banner */}
        <div className="mb-6 p-4 rounded-2xl bg-slate-900 border border-slate-800 text-white flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm select-none" id="simulator-banner">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 text-sky-500 rounded-xl border border-sky-500/20">
              <Smartphone className="w-5 h-5 animate-pulse" />
            </div>
            <div className="text-left">
              <h4 className="font-sans font-bold text-sm tracking-tight">Interactive Local Simulator</h4>
              <p className="text-xs text-slate-450 mt-0.5">Test DOB check-ins side-by-side with the live administrative database logs!</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400">Layout Mode:</span>
            <button 
              onClick={() => setIsSimulatorEnabled(!isSimulatorEnabled)}
              className={`px-4 py-1.5 rounded-xl font-sans font-bold text-xs transition-all shadow-xs cursor-pointer ${
                isSimulatorEnabled 
                  ? 'bg-sky-500 text-black shadow-md hover:bg-sky-400' 
                  : 'bg-slate-800 text-slate-400 border border-slate-705 hover:text-white hover:bg-slate-750'
              }`}
              id="simulator-toggle-btn"
            >
              {isSimulatorEnabled ? 'Enabled (Dual-View Monitor)' : 'Disabled (Full-Width view)'}
            </button>
          </div>
        </div>

        {/* Real-time Inline Greet & Welcome Dispatched Queue (Non-Floating) */}
        {welcomeMessages.some(m => m.status === 'Pending') && (
          <div className="mb-6 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs text-left space-y-4 animate-slide-in" id="inline-greet-alerts">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="p-1 px-2.5 bg-emerald-500/10 text-emerald-700 font-sans font-black text-[10px] rounded-full inline-block animate-pulse">
                  PENDING ACTION EXPECTED
                </span>
                <span className="text-sm font-sans font-bold text-slate-900">
                  Real-time Sign-Up & Swipe Greet Pending Queue ({welcomeMessages.filter(m => m.status === 'Pending').length})
                </span>
              </div>
              <span className="text-xs font-mono text-slate-450">These actions are matched based on new member sign-ups or desk/scan check-ins</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {welcomeMessages
                .filter(m => m.status === 'Pending')
                .slice(0, 4) // Show up to 4 pending greetings as clean cards inline
                .map(msg => (
                  <div 
                    key={msg.id} 
                    className="bg-slate-900 border border-slate-850 text-white p-4 rounded-2xl shadow-md flex gap-3 text-left relative"
                    id={`inline-alert-card-${msg.id}`}
                  >
                    <div className="p-2 bg-emerald-500 text-black rounded-xl h-fit">
                      {msg.type === 'Welcome' ? <Sparkles className="w-4 h-4" /> : <Megaphone className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono tracking-wider text-emerald-400 font-bold uppercase bg-slate-800 px-2 py-0.5 rounded">
                          {msg.type === 'Welcome' ? 'New registration invite' : 'member swipe verified'}
                        </span>
                        <button 
                          onClick={() => dbUpdateWelcomeMessage(msg.id, { status: 'Sent' })}
                          className="text-slate-400 hover:text-white transition-colors p-1"
                          title="Dismiss Alert"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      <div>
                        <h4 className="text-xs font-black font-sans leading-tight">
                          {msg.memberName} ({msg.memberId})
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-1">
                          Phone: <span className="font-sans font-bold text-slate-300">{msg.phone}</span> {msg.plan && `• Plan: ${msg.plan}`}
                        </p>
                      </div>
                      
                      <div className="text-[10px] text-slate-300 max-h-16 overflow-y-auto font-sans leading-relaxed border-t border-slate-800/80 pt-2 italic">
                        "{msg.messageText}"
                      </div>
                      
                      {/* Shoot actions */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          onClick={() => {
                            const cleaned = msg.phone.replace(/[^\d]/g, '');
                            let prefixPhone = cleaned;
                            if (cleaned.length === 10) {
                              prefixPhone = '91' + cleaned; // default India Prefix
                            }
                            const url = `https://api.whatsapp.com/send?phone=${encodeURIComponent(prefixPhone)}&text=${encodeURIComponent(msg.messageText)}`;
                            window.open(url, '_blank', 'noreferrer,noopener');
                            dbUpdateWelcomeMessage(msg.id, { status: 'Sent' });
                          }}
                          className="bg-emerald-500 hover:bg-emerald-600 text-black px-2.5 py-1.5 rounded-lg text-[10px] font-bold active:bg-emerald-700 transition-all flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Shoot WhatsApp</span>
                        </button>
                        <button
                          onClick={() => dbUpdateWelcomeMessage(msg.id, { status: 'Sent' })}
                          className="bg-slate-800 text-slate-300 hover:text-white border border-slate-750 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                        >
                          Dismiss Alert
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {isSimulatorEnabled ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" id="dual-sim-layout">
            
            {/* Left Hand: Owners System View (2/3 columns) */}
            <div className="lg:col-span-8 space-y-6">
              <div className="border border-slate-200 bg-slate-100/50 px-4 py-2.5 rounded-2xl text-left flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-emerald-850 bg-emerald-100/70 px-2 py-0.5 rounded-full border border-emerald-250">
                    OWNER ADMIN SCREEN
                  </span>
                  <span className="text-xs text-slate-500 font-bold capitalize">
                    {currentView === 'portal' ? 'Dashboard View' : `${currentView} View`}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Live Syncing Active
                </span>
              </div>

              {currentView === 'portal' ? (
                // Overridden to Dashboard when in simulator mode so both don't duplicate!
                <Dashboard 
                  members={members} 
                  checkIns={checkIns} 
                  onNavigate={setCurrentView} 
                  onAddMember={handleAddMember}
                  onDeleteMember={handleDeleteMember}
                  onUpdateMember={handleUpdateMember}
                  plans={plans}
                  onUpdatePlans={handleUpdatePlans}
                  currency={currency}
                  onUpdateCurrency={setCurrency}
                />
              ) : (
                <>
                  {currentView === 'dashboard' && (
                    <Dashboard 
                      members={members} 
                      checkIns={checkIns} 
                      onNavigate={setCurrentView} 
                      onAddMember={handleAddMember}
                      onDeleteMember={handleDeleteMember}
                      onUpdateMember={handleUpdateMember}
                      plans={plans}
                      onUpdatePlans={handleUpdatePlans}
                      currency={currency}
                      onUpdateCurrency={setCurrency}
                    />
                  )}

                  {currentView === 'members' && (
                    <MembersList 
                      members={members} 
                      onAddMember={handleAddMember} 
                      onUpdateMember={handleUpdateMember} 
                      onDeleteMember={handleDeleteMember} 
                      plans={plans}
                      currency={currency}
                      onTriggerInvoice={setActiveInvoiceMember}
                    />
                  )}

                  {currentView === 'station' && (
                    <CheckInStation 
                      members={members} 
                      onCheckIn={handleProcessCheckIn} 
                      checkIns={checkIns} 
                    />
                  )}

                  {currentView === 'reminders' && (
                    <ExpiryReminders 
                      members={members}
                      onUpdateMember={handleUpdateMember}
                      welcomeMessages={welcomeMessages}
                      onDeleteMessage={dbDeleteWelcomeMessage}
                      onUpdateMessageStatus={(id, status) => dbUpdateWelcomeMessage(id, { status })}
                    />
                  )}

                  {currentView === 'admin' && (
                    <AdminPanel 
                      currentUser={currentUser}
                      members={members}
                      checkIns={checkIns}
                      welcomeMessages={welcomeMessages}
                      securityConfig={securityConfig}
                      onUpdateSecurityConfig={dbUpdateSecurityConfig}
                      onResetMemberStats={handleResetMemberStats}
                      onClearCheckIns={handleClearCheckIns}
                      onClearWelcomeMessages={handleClearWelcomeMessages}
                      onFactoryReset={handleFactoryResetDirect}
                      feedbacks={feedbacks}
                      onUpdateFeedbackStatus={dbUpdateFeedbackStatus}
                      onDeleteFeedback={dbDeleteFeedback}
                      onClearFeedbacks={dbClearFeedbacks}
                    />
                  )}

                  {currentView === 'feedbacks' && (
                    <FeedbackManager
                      feedbacks={feedbacks}
                      onUpdateFeedbackStatus={dbUpdateFeedbackStatus}
                      onDeleteFeedback={dbDeleteFeedback}
                      onClearFeedbacks={dbClearFeedbacks}
                      securityConfig={securityConfig}
                      currentUser={currentUser}
                    />
                  )}
                </>
              )}
            </div>

            {/* Right Hand: Simulated Smartphone check-In terminal */}
            <div className="lg:col-span-4 sticky top-24" id="simulated-member-viewport">
              <div className="border border-slate-200 bg-slate-100/50 px-4 py-2.5 rounded-2xl text-center mb-4">
                <span className="text-[10px] font-mono font-bold text-sky-850 bg-sky-100/70 px-2.5 py-0.5 rounded-full border border-sky-250 uppercase tracking-wider">
                  MEMBER CHECK-IN TERM (QR PORTAL)
                </span>
              </div>
              <CheckInPortal 
                members={members} 
                onCheckIn={handleProcessCheckIn} 
                onSubmitFeedback={handleAddFeedback}
              />
            </div>

          </div>
        ) : (
          /* Normal Single Column Workspace Layout */
          <div className="space-y-6" id="classic-layout">
            
            {currentView === 'dashboard' && (
              <Dashboard 
                members={members} 
                checkIns={checkIns} 
                onNavigate={setCurrentView} 
                onAddMember={handleAddMember}
                onDeleteMember={handleDeleteMember}
                onUpdateMember={handleUpdateMember}
                plans={plans}
                onUpdatePlans={handleUpdatePlans}
                currency={currency}
                onUpdateCurrency={setCurrency}
              />
            )}

            {currentView === 'members' && (
              <MembersList 
                members={members} 
                onAddMember={handleAddMember} 
                onUpdateMember={handleUpdateMember} 
                onDeleteMember={handleDeleteMember} 
                plans={plans}
                currency={currency}
                onTriggerInvoice={setActiveInvoiceMember}
              />
            )}

            {currentView === 'station' && (
              <CheckInStation 
                members={members} 
                onCheckIn={handleProcessCheckIn} 
                checkIns={checkIns} 
              />
            )}

            {currentView === 'portal' && (
              <div className="py-6 max-w-md mx-auto space-y-4">
                <MemberPortal 
                  members={members} 
                  onCheckIn={handleProcessCheckIn} 
                  onSubmitFeedback={handleAddFeedback}
                />
                
                <div className="text-center">
                  <button
                    onClick={() => {
                      setCurrentView('dashboard');
                      setIsSimulatorEnabled(true);
                    }}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-650 transition-colors"
                  >
                    ← Back to Central Gym Console (Enable Split-Screen)
                  </button>
                </div>
              </div>
            )}

            {currentView === 'reminders' && (
              <ExpiryReminders 
                members={members} 
                onUpdateMember={handleUpdateMember} 
                welcomeMessages={welcomeMessages}
                onDeleteMessage={dbDeleteWelcomeMessage}
                onUpdateMessageStatus={(id, status) => dbUpdateWelcomeMessage(id, { status })}
              />
            )}

            {currentView === 'admin' && (
              <AdminPanel 
                currentUser={currentUser}
                members={members}
                checkIns={checkIns}
                welcomeMessages={welcomeMessages}
                securityConfig={securityConfig}
                onUpdateSecurityConfig={dbUpdateSecurityConfig}
                onResetMemberStats={handleResetMemberStats}
                onClearCheckIns={handleClearCheckIns}
                onClearWelcomeMessages={handleClearWelcomeMessages}
                onFactoryReset={handleFactoryResetDirect}
                feedbacks={feedbacks}
                onUpdateFeedbackStatus={dbUpdateFeedbackStatus}
                onDeleteFeedback={dbDeleteFeedback}
                onClearFeedbacks={dbClearFeedbacks}
              />
            )}

            {currentView === 'feedbacks' && (
              <FeedbackManager
                feedbacks={feedbacks}
                onUpdateFeedbackStatus={dbUpdateFeedbackStatus}
                onDeleteFeedback={dbDeleteFeedback}
                onClearFeedbacks={dbClearFeedbacks}
                securityConfig={securityConfig}
                currentUser={currentUser}
              />
            )}

          </div>
        )}

      </main>

       {/* 3. FOOTER CONTROL BAR */}
      <footer className="bg-white border-t border-slate-200/90 py-6 select-none" id="gym-footer">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          
          <div className="flex items-center gap-2 text-slate-400 text-center md:text-left">
            <Server className="w-4 h-4 text-slate-300" />
            <span>Interactive Database Connected to Google Cloud Firestore</span>
            <span>•</span>
            <span className="font-mono text-[11px]">System Date: {CURRENT_DATE_ANCHOR}</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleResetDatabase}
              className="text-rose-500 hover:text-rose-700 font-semibold transition-colors cursor-pointer"
              id="btn-factory-reset"
            >
              Reset Database & Re-Seed
            </button>
            <span className="text-slate-300">|</span>
            <span className="text-slate-400 font-medium">Apex Fitness Cloud Admin Console v1.0.0</span>
          </div>

        </div>
      </footer>

      {activeInvoiceMember && (
        <InvoiceModal
          member={activeInvoiceMember}
          plans={plans}
          currency={currency}
          isNewRegistration={isInvoiceNewRegistration}
          onClose={() => {
            setActiveInvoiceMember(null);
            setIsInvoiceNewRegistration(false);
          }}
        />
      )}
    </div>
  );
}
