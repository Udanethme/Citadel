/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Flame, 
  User, 
  Coins, 
  LogOut, 
  Sparkles, 
  BookOpen, 
  Swords, 
  Calculator, 
  Shield, 
  BrainCircuit,
  GraduationCap,
  ChevronRight
} from 'lucide-react';

import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { UserProfile } from './types';

// Importing Custom Sub-Components
import AuthPage from './components/AuthPage';
import ForgeTimer from './components/ForgeTimer';
import DuelSection from './components/DuelSection';
import ZScoreDashboard from './components/ZScoreDashboard';
import GuildChallenges from './components/GuildChallenges';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  // Active studied subject context (enforces fullscreen distraction-free shield)
  const [activeStudySubject, setActiveStudySubject] = useState<string | null>(null);

  // Active Screen / Tab router
  const [activeTab, setActiveTab] = useState<"forge" | "colosseum" | "advisor" | "guilds">("forge");

  // Track Firebase Auth state change
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);

      if (!user) {
        setUserProfile(null);
        setProfileLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Listen to Firestore profile document in real-time
  useEffect(() => {
    if (!currentUser) return;

    setProfileLoading(true);
    const userDocRef = doc(db, 'users', currentUser.uid);

    const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserProfile(docSnap.data() as UserProfile);
      } else {
        setUserProfile(null);
      }
      setProfileLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
      setProfileLoading(false);
    });

    return () => unsubscribeProfile();
  }, [currentUser]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
    }
  };

  if (authLoading) {
    return (
      <div id="authenticating-overlay" className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans text-slate-100">
        <BrainCircuit className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
        <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Activating Citadel Channels...</p>
      </div>
    );
  }

  // Not logged in -> Render Solarpunk Academic authorization gateway
  if (!currentUser) {
    return <AuthPage />;
  }

  if (profileLoading && !userProfile) {
    return (
      <div id="credentials-loading" className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans text-slate-100">
        <Trophy className="w-12 h-12 text-amber-400 animate-bounce mb-4" />
        <h2 className="font-display font-bold text-lg">Z-Score Citadel</h2>
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mt-1">Loading Student Credentials...</p>
      </div>
    );
  }

  if (!userProfile) {
    // Missing profile document — needs stream selection
    return <StreamSetup currentUser={currentUser} onSignOut={handleSignOut} />;
  }

  // Determine RPG XP metrics for layout leveling bar
  const currentLevelXpBasis = Math.pow((userProfile.level - 1) * 5, 2);
  const nextLevelXpBasis = Math.pow(userProfile.level * 5, 2);
  const xpRequiredForNextLevel = nextLevelXpBasis - currentLevelXpBasis;
  const xpAccumulatedInLevel = Math.max(0, userProfile.xp - currentLevelXpBasis);
  const levelProgressPercentage = Math.min(100, Math.round((xpAccumulatedInLevel / xpRequiredForNextLevel) * 100));

  // Dynamic estimated Z-score derived from total XP to bridge gameplay metrics
  const estimatedZScore = (0.75 + Math.min(2.15, (userProfile.xp || 0) / 1000)).toFixed(4);

  return (
    <div id="zscore-citadel-root" className="min-h-screen bg-midnight text-slate-200 font-sans flex flex-col md:flex-row relative">
      
      {/* Background Solarpunk Energy Streamers & Radial Glows */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(0,240,255,0.05),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0d1117_1px,transparent_1px),linear-gradient(to_bottom,#0d1117_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 pointer-events-none" />

      {/* Left Sidebar: Character & Stats Pillar (Desktop Only) */}
      <aside className="hidden md:flex w-24 bg-dark-panel border-r border-slate-800 flex-col items-center py-8 justify-between shrink-0 relative z-30">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-full border-2 border-cyan-500/50 p-1 bg-gradient-to-b from-cyan-950/45 to-transparent relative group">
            <div className="w-full h-full rounded-full bg-[#0d1117] flex items-center justify-center text-[10px] font-bold text-cyan-400 font-mono shadow-glow-cyan">
              LVL {userProfile.level}
            </div>
          </div>
          
          <nav className="flex flex-col gap-8 mt-6">
            <button
              id="sidebar-tab-forge"
              onClick={() => setActiveTab("forge")}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                activeTab === "forge" 
                  ? "text-[#00F0FF] bg-[#00F0FF]/10 border-cyan-500/30" 
                  : "text-slate-600 border-transparent hover:text-slate-400"
              }`}
              title="Focus Forge"
            >
              <BookOpen className="w-6 h-6" />
            </button>

            <button
              id="sidebar-tab-colosseum"
              onClick={() => setActiveTab("colosseum")}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                activeTab === "colosseum" 
                  ? "text-red-400 bg-red-950/10 border-red-500/30" 
                  : "text-slate-600 border-transparent hover:text-slate-400"
              }`}
              title="Colosseum Duels"
            >
              <Swords className="w-6 h-6" />
            </button>

            <button
              id="sidebar-tab-advisor"
              onClick={() => setActiveTab("advisor")}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                activeTab === "advisor" 
                  ? "text-amber-400 bg-amber-950/10 border-amber-500/30" 
                  : "text-slate-600 border-transparent hover:text-slate-400"
              }`}
              title="Z-Score Estimator"
            >
              <Calculator className="w-6 h-6" />
            </button>

            <button
              id="sidebar-tab-guilds"
              onClick={() => setActiveTab("guilds")}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                activeTab === "guilds" 
                  ? "text-emerald-400 bg-emerald-950/10 border-emerald-500/30" 
                  : "text-slate-600 border-transparent hover:text-slate-400"
              }`}
              title="Syndicate Guilds"
            >
              <Shield className="w-6 h-6" />
            </button>
          </nav>
        </div>

        <div className="flex flex-col items-center gap-1.5 text-center px-2">
          <div className="text-[9px] text-[#00F0FF] font-bold uppercase tracking-widest font-mono">AETHERIUM</div>
          <div id="sidebar-aetherium-val" className="text-amber-400 font-mono text-xs font-bold">{userProfile.aetherium} Δ</div>
        </div>
      </aside>

      {/* Main Workspace Frame container */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        
        {/* Top Dashboard Header Block */}
        <header className="h-auto md:h-24 border-b border-slate-800 bg-dark-panel/80 backdrop-blur-md flex flex-col md:flex-row items-center justify-between px-6 py-4 md:py-0 md:px-10 gap-4">
          <div className="flex flex-col text-center md:text-left">
            <h1 className="text-xl md:text-2xl font-bold tracking-tighter text-white font-display flex items-center justify-center md:justify-start gap-2">
              Z-SCORE CITADEL 
              <span className="text-accent-neon text-xs font-mono font-normal tracking-widest bg-cyan-950/50 border border-cyan-800/30 px-2 py-0.5 rounded ml-1">V4.2.0</span>
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
              {userProfile.stream} Stream • Active Scholar
            </p>
          </div>

          <div className="flex flex-wrap md:flex-nowrap items-center justify-center gap-6 md:gap-10">
            <div className="flex flex-col items-center md:items-end">
              <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest font-mono">Live Estimated Z-Score</span>
              <span id="estimated-rank-display" className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent-neon to-blue-500 font-mono tracking-tight">
                {estimatedZScore}
              </span>
            </div>

            <div className="hidden lg:block h-10 w-px bg-slate-800"></div>

            <div className="flex items-center gap-3 bg-midnight/60 px-4 py-2 rounded-xl border border-slate-850">
              <div className="text-right">
                <div className="text-xs text-slate-200 font-bold font-mono">{userProfile.username}</div>
                <div className="text-[9px] text-green-500 uppercase font-mono tracking-widest font-bold">
                  {userProfile.dailyStreak} Day Streak
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-[#0d1117] border border-slate-700 flex items-center justify-center font-mono text-xs font-bold text-amber-500">
                {userProfile.level}
              </div>
            </div>

            <button
              id="header-sign-out"
              onClick={handleSignOut}
              className="p-1 px-3 bg-[#0d1117] text-[9px] border border-slate-800 text-slate-400 hover:text-rose-400 rounded-lg uppercase tracking-wider transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Mobile Navigation Interface */}
        <nav className="md:hidden px-4 mt-4">
          <div className="grid grid-cols-4 bg-[#080B10] border border-slate-800 p-1 rounded-xl">
            <button
              id="mobile-tab-forge"
              onClick={() => setActiveTab("forge")}
              className={`py-2 px-1 rounded-lg font-mono text-[9px] uppercase tracking-wider flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                activeTab === "forge" ? "bg-[#0d1117] text-amber-400 font-bold" : "text-slate-500"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Forge
            </button>
            
            <button
              id="mobile-tab-colosseum"
              onClick={() => setActiveTab("colosseum")}
              className={`py-2 px-1 rounded-lg font-mono text-[9px] uppercase tracking-wider flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                activeTab === "colosseum" ? "bg-[#0d1117] text-red-500 font-bold" : "text-slate-500"
              }`}
            >
              <Swords className="w-4 h-4" />
              Duels
            </button>

            <button
              id="mobile-tab-advisor"
              onClick={() => setActiveTab("advisor")}
              className={`py-2 px-1 rounded-lg font-mono text-[9px] uppercase tracking-wider flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                activeTab === "advisor" ? "bg-[#0d1117] text-cyan-400 font-bold" : "text-slate-500"
              }`}
            >
              <Calculator className="w-4 h-4" />
              Tracker
            </button>

            <button
              id="mobile-tab-guilds"
              onClick={() => setActiveTab("guilds")}
              className={`py-2 px-1 rounded-lg font-mono text-[9px] uppercase tracking-wider flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                activeTab === "guilds" ? "bg-[#0d1117] text-emerald-400 font-bold" : "text-slate-500"
              }`}
            >
              <Shield className="w-4 h-4" />
              Guilds
            </button>
          </div>
        </nav>

        {/* Workspace Display Portal */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.99, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.99, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === "forge" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Forge Timer Centerpiece */}
                  <div className="lg:col-span-2">
                    <ForgeTimer 
                      userProfile={userProfile} 
                      onProfileUpdate={(profile) => setUserProfile(profile)}
                      onStudyingStateChange={(isStudying) => {
                        // Set subject context if working pomodoro
                        setActiveStudySubject(isStudying ? "active" : null);
                      }}
                    />
                  </div>

                  {/* Focus Spell Ledger side panel */}
                  <div>
                    <div id="stat-ledger-sidebar" className="bg-[#0D1117] rounded-xl border border-slate-800 p-6 shadow-2xl">
                      <div className="mb-4">
                        <span className="text-[9px] font-mono text-[#00F0FF] uppercase tracking-widest block">HISTORIC INDEX</span>
                        <h3 className="font-display font-medium text-white flex items-center gap-2 mt-0.5">
                          <GraduationCap className="w-5 h-5 text-cyan-400" />
                          Academic Focus Logs
                        </h3>
                      </div>
                      
                      <div className="space-y-3.5 text-xs font-mono">
                        <div className="p-3 bg-[#161B22] border border-slate-800 rounded-lg flex items-center justify-between">
                          <span className="text-slate-400 uppercase">Cumulative Focus</span>
                          <span id="ledger-total-minutes" className="text-white font-bold">{userProfile.totalStudyMinutes} Minutes</span>
                        </div>

                        <div className="p-3 bg-[#161B22] border border-slate-800 rounded-lg flex items-center justify-between">
                          <span className="text-slate-400 uppercase">Physics Shards</span>
                          <span className="text-amber-400 font-bold">{userProfile.physicsXp} XP</span>
                        </div>

                        <div className="p-3 bg-[#161B22] border border-slate-800 rounded-lg flex items-center justify-between">
                          <span className="text-slate-400 uppercase">Chemistry Shards</span>
                          <span className="text-yellow-500 font-bold">{userProfile.chemistryXp} XP</span>
                        </div>

                        {userProfile.stream === "Biological Science" ? (
                          <div className="p-3 bg-[#161B22] border border-slate-800 rounded-lg flex items-center justify-between">
                            <span className="text-slate-400 uppercase">Biology Shards</span>
                            <span className="text-emerald-400 font-bold">{userProfile.biologyXp} XP</span>
                          </div>
                        ) : (
                          <div className="p-3 bg-[#161B22] border border-slate-800 rounded-lg flex items-center justify-between">
                            <span className="text-slate-400 uppercase">Combined Maths Shards</span>
                            <span className="text-cyan-400 font-bold">{userProfile.mathsXp} XP</span>
                          </div>
                        )}

                        {/* Level progress info bar inside sidebar */}
                        <div className="p-3 bg-[#161B22]/60 border border-slate-800 rounded-lg">
                          <div className="flex justify-between text-slate-400 text-[10px] mb-1">
                            <span className="uppercase">Level Up Progress</span>
                            <span>{userProfile.xp} XP</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#05070A] rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-cyan-400 to-amber-400" 
                              style={{ width: `${levelProgressPercentage}%` }}
                            />
                          </div>
                        </div>

                        <div className="p-4 border border-dashed border-cyan-900/30 rounded-xl text-center bg-cyan-950/15 text-[10px] text-cyan-400/80 leading-relaxed mt-4">
                          Every 25 minutes of active focus on target subjects converts to +125 XP and boosts your national estimated Z-score.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "colosseum" && (
                <div className="space-y-6">
                  <DuelSection 
                    userProfile={userProfile} 
                    activeStudySubject={activeStudySubject}
                    onProfileUpdate={(profile) => setUserProfile(profile)}
                  />
                </div>
              )}

              {activeTab === "advisor" && (
                <ZScoreDashboard userProfile={userProfile} />
              )}

              {activeTab === "guilds" && (
                <GuildChallenges 
                  userProfile={userProfile} 
                  activeStudySubject={activeStudySubject}
                  onProfileUpdate={(profile) => setUserProfile(profile)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom Ticker / Anti-Cheat Status bar */}
        <footer className="h-auto py-2 md:py-0 md:h-10 bg-accent-neon/5 border-t border-cyan-900/30 flex flex-col md:flex-row items-center px-6 md:px-10 justify-between gap-2 text-[10px] text-slate-400 font-mono">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="font-bold text-slate-300 uppercase tracking-widest text-[9px]">Vigilance Protocol Active</span>
            </div>
            <div className="hidden md:block h-4 w-px bg-slate-800"></div>
            <span className="text-[9px] text-slate-500">SESSION COVENANT-SECURE</span>
          </div>
          <div className="text-[9px] text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <span className="text-accent-neon">●</span> Scholar Focus: {userProfile.totalStudyMinutes} mins accumulated overall
          </div>
        </footer>

      </div>

      {/* Screen blocker overlay during active study to ensure utter concentration.
          Hides other views, keeping the ticking timer circular frame immersion, as requested. */}
      {activeStudySubject && (
        <div id="immersive-concentration-shield" className="fixed inset-0 bg-midnight/98 backdrop-blur-3xl z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl">
            <div className="text-center mb-6">
              <span className="text-[10px] font-mono text-amber-500 tracking-widest uppercase animate-pulse block">COVENANT CONCENTRATION ENGAGED</span>
              <h2 className="text-lg font-display text-slate-300 mt-1">Distraction-Free Scholarly Forge</h2>
            </div>
            
            <ForgeTimer 
              userProfile={userProfile} 
              onProfileUpdate={(profile) => setUserProfile(profile)}
              onStudyingStateChange={(isStudying) => {
                setActiveStudySubject(isStudying ? "active" : null);
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
}

// Sub-component for onboarding an active user who lacks a Firestore Profile
function StreamSetup({ currentUser, onSignOut }: { currentUser: any, onSignOut: () => void }) {
  const [selectedStream, setSelectedStream] = useState<"Biological Science" | "Physical Science/Maths" | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submitStreamPreference = async () => {
    if (!selectedStream) {
      setError("You must select your A/L Science stream path to enter.");
      return;
    }
    setLoading(true);
    setError("");

    const defaultProfile: UserProfile = {
      uid: currentUser.uid,
      username: currentUser.displayName || `Candidate-${Math.floor(1000 + Math.random() * 9000)}`,
      email: currentUser.email || 'candidate@citadel.lk',
      stream: selectedStream,
      xp: 150, // Starting XP bonus
      aetherium: 100, // Solarpunk currency
      level: 1,
      dailyStreak: 1,
      totalStudyMinutes: 0,
      physicsXp: 0,
      chemistryXp: 0,
      mathsXp: 0,
      biologyXp: 0,
      joinedGuildId: "",
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'users', currentUser.uid), defaultProfile);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
      setError("Failed to generate student profile: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div id="auth-page-container" className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(14,116,144,0.15),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(202,138,4,0.08),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10 text-center"
      >
        <span className="p-2 inline-block bg-amber-950/50 border border-amber-500/30 rounded-lg text-amber-400 text-xs font-mono mb-6">
          ACADEMIC LINEAGE REQUIRED
        </span>
        <h2 className="text-xl font-bold font-display text-slate-200">Finalize Candidate Alignment</h2>
        <p className="text-sm text-slate-400 mt-2 mb-6">
          Choose your active G.C.E. A/L stream to instantiate your Citadel dashboard.
        </p>

        <div className="space-y-4">
          <button
            onClick={() => setSelectedStream("Biological Science")}
            className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
              selectedStream === "Biological Science"
                ? "bg-cyan-950/60 border-cyan-500 text-slate-100 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                : "bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
            }`}
          >
            <div>
              <h3 className="font-semibold text-slate-200">Biological Science Stream</h3>
              <p className="text-xs text-slate-400 mt-1">Physics, Chemistry, Biology</p>
            </div>
            <GraduationCap className={`w-5 h-5 ${selectedStream === "Biological Science" ? "text-cyan-400" : ""}`} />
          </button>

          <button
            onClick={() => setSelectedStream("Physical Science/Maths")}
            className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
              selectedStream === "Physical Science/Maths"
                ? "bg-amber-950/40 border-amber-500 text-slate-100 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                : "bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
            }`}
          >
            <div>
              <h3 className="font-semibold text-slate-200">Physical Science / Maths</h3>
              <p className="text-xs text-slate-400 mt-1">Physics, Chemistry, Comb. Maths</p>
            </div>
            <BookOpen className={`w-5 h-5 ${selectedStream === "Physical Science/Maths" ? "text-amber-400" : ""}`} />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-950/50 border border-red-500/30 rounded-lg text-red-400 text-xs text-left">
            {error}
          </div>
        )}

        <button
          onClick={submitStreamPreference}
          disabled={loading}
          className="w-full mt-6 py-3 bg-gradient-to-r from-cyan-600 to-amber-600 hover:from-cyan-500 hover:to-amber-500 text-slate-100 rounded-xl font-medium tracking-wide shadow-lg shadow-cyan-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? "Forging Profile..." : "Enter the Citadel"}
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={onSignOut}
          className="mt-6 px-4 py-2 bg-transparent text-slate-400 hover:text-rose-400 text-xs uppercase tracking-widest font-mono cursor-pointer"
        >
          Abort Authentication
        </button>
      </motion.div>
    </div>
  );
}
