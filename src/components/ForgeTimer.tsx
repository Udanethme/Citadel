/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, setDoc, collection } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, Trophy, Sparkles, Flame, ShieldAlert, Coffee, RotateCcw } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, SubjectName } from '../types';

interface ForgeTimerProps {
  userProfile: UserProfile;
  onProfileUpdate: (profile: UserProfile) => void;
  // Let parent know when student is actively focused so we can lock other views
  onStudyingStateChange: (isStudying: boolean) => void;
}

export default function ForgeTimer({ userProfile, onProfileUpdate, onStudyingStateChange }: ForgeTimerProps) {
  // Timer settings
  const [duration, setDuration] = useState(25 * 60); // In seconds
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<"work" | "break">("work");
  
  // Speed Acceleration Option (Critical for testing out-of-the-box!)
  const [isTestMode, setIsTestMode] = useState(false);

  // Focus Subject Selection
  const availableSubjects: SubjectName[] = userProfile.stream === "Biological Science"
    ? ["Physics", "Chemistry", "Biology"]
    : ["Physics", "Chemistry", "Combined Mathematics"];
    
  const [selectedSubject, setSelectedSubject] = useState<SubjectName>(availableSubjects[0]);

  // Anti-Cheat Broken Forge State
  const [forgeBroken, setForgeBroken] = useState(false);
  const [xpGainedMessage, setXpGainedMessage] = useState<string | null>(null);

  // Interval reference
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Handle Visibility Hook for Anti-Cheat
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isRunning && timerMode === "work") {
        // Anti-cheat triggered! Shatter the forge.
        shatterForge();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isRunning, timerMode]);

  // Handle timer ticker
  useEffect(() => {
    if (isRunning) {
      onStudyingStateChange(timerMode === "work");
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current!);
      onStudyingStateChange(false);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timerMode]);

  // Re-adjust timer default durations
  useEffect(() => {
    if (!isRunning) {
      let mins = 25;
      if (isTestMode) {
        mins = timerMode === "work" ? 0.2 : 0.1; // 12 seconds work, 6 seconds break for lightning-fast tests
      } else {
        mins = timerMode === "work" ? 25 : 5;
      }
      const secs = Math.ceil(mins * 60);
      setDuration(secs);
      setTimeLeft(secs);
    }
  }, [timerMode, isTestMode]);

  const shatterForge = () => {
    setIsRunning(false);
    setForgeBroken(true);
    setTimeLeft(duration);
    onStudyingStateChange(false);
  };

  const handleTimerComplete = async () => {
    setIsRunning(false);
    onStudyingStateChange(false);

    if (timerMode === "work") {
      // XP Calculations: XP = Minutes * 5
      // If in lightning test mode, simulate as a 25 minutes worth to show full XP mechanics, or compute actual
      const minutesSpent = isTestMode ? 25 : Math.round(duration / 60);
      const computedXp = minutesSpent * 5;
      const computedAetherium = Math.ceil(minutesSpent / 2) || 5;

      const newTotalMinutes = userProfile.totalStudyMinutes + minutesSpent;
      const newXp = userProfile.xp + computedXp;
      const newAetherium = userProfile.aetherium + computedAetherium;
      // Formula-based RPG Levels: Level = Floor(sqrt(XP)/10) + 1
      const newLevel = Math.floor(Math.sqrt(newXp) / 5) + 1;

      // Subject-specific XP progression
      let finalPhysicsXp = userProfile.physicsXp;
      let finalChemistryXp = userProfile.chemistryXp;
      let finalMathsXp = userProfile.mathsXp;
      let finalBiologyXp = userProfile.biologyXp;

      if (selectedSubject === "Physics") finalPhysicsXp += computedXp;
      if (selectedSubject === "Chemistry") finalChemistryXp += computedXp;
      if (selectedSubject === "Combined Mathematics") finalMathsXp += computedXp;
      if (selectedSubject === "Biology") finalBiologyXp += computedXp;

      const updatedProfile: UserProfile = {
        ...userProfile,
        xp: newXp,
        aetherium: newAetherium,
        level: newLevel,
        totalStudyMinutes: newTotalMinutes,
        physicsXp: finalPhysicsXp,
        chemistryXp: finalChemistryXp,
        mathsXp: finalMathsXp,
        biologyXp: finalBiologyXp
      };

      try {
        // 1. Save Study Log
        const logId = `log-${Date.now()}`;
        const newLog = {
          uid: userProfile.uid,
          subject: selectedSubject,
          minutes: minutesSpent,
          xpGained: computedXp,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', userProfile.uid, 'studyLogs', logId), newLog);

        // 2. Update user profile
        await setDoc(doc(db, 'users', userProfile.uid), updatedProfile);

        // Update Client
        onProfileUpdate(updatedProfile);
        setXpGainedMessage(`+${computedXp} XP & +${computedAetherium} Aetherium! Forged successfully inside the Citadel.`);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${userProfile.uid}`);
      }
    } else {
      // Break mode complete
      setXpGainedMessage("Break complete! Your brain is re-energized. Return to the Forge and study again.");
    }

    // Toggle Mode
    setTimerMode(timerMode === "work" ? "break" : "work");
  };

  const startTimer = () => {
    setForgeBroken(false);
    setXpGainedMessage(null);
    setIsRunning(true);
  };

  const stopTimer = () => {
    setIsRunning(false);
    setTimeLeft(duration);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div id="forge-timer-card" className="bg-deep-card shadow-glow-cyan border border-slate-800 rounded-xl p-6 relative overflow-hidden">
      
      {/* Solarpunk aesthetic gold accents on study */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] transition-all duration-500 ${isRunning ? 'bg-gradient-to-r from-amber-500 via-cyan-400 to-amber-500 animate-pulse' : 'bg-slate-800'}`} />

      {/* Header section with theme toggle options */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-xs font-mono text-cyan-400 tracking-widest uppercase block">THE RECALL FORGE</span>
          <h2 className="text-xl font-display font-medium text-slate-100 flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500 animate-pulse" /> 
            Focus Alignment
          </h2>
        </div>
        
        {/* Toggle Testing Mode for fast checking */}
        <div className="flex items-center gap-2 p-1.5 bg-midnight border border-slate-800 rounded-xl">
          <label className="text-[10px] uppercase font-mono text-amber-500 flex items-center gap-1 cursor-pointer">
            <input
              id="test-mode-toggle"
              type="checkbox"
              checked={isTestMode}
              onChange={(e) => setIsTestMode(e.target.checked)}
              disabled={isRunning}
              className="accent-amber-500 rounded text-slate-950"
            />
            Temporal Shift (Speed Test)
          </label>
        </div>
      </div>

      {/* Focus Immersion Alert and Status */}
      {isRunning && timerMode === "work" && (
        <div id="distraction-alert" className="mb-4 bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 p-3.5 rounded-xl flex items-center gap-3 text-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <div>
            <strong className="glow-text-cyan text-white uppercase tracking-wider text-[11px]">IMMERSION SHIELD SYSTEM ACTIVE</strong>
            <p className="text-slate-400 mt-0.5">Switching tabs or minimizing study screen will collapse your Forge and shatter XP.</p>
          </div>
        </div>
      )}

      {/* Subjects Selector during setup */}
      {!isRunning && (
        <div className="mb-6">
          <label className="block text-xs font-mono text-slate-400 uppercase mb-2">Configure Target Subject Guild</label>
          <div className="grid grid-cols-3 gap-2">
            {availableSubjects.map((sub) => (
              <button
                id={`subject-select-${sub.replace(' ', '-')}`}
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`py-2 px-3 text-xs rounded-xl font-mono border transition-all ${
                  selectedSubject === sub 
                    ? "bg-amber-950/45 border-amber-500 text-amber-300 font-medium"
                    : "bg-midnight border-slate-850 text-slate-400 hover:text-slate-200"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Circle Clock Visualizer */}
      <div className="flex flex-col items-center justify-center py-6">
        <div id="forge-timer-radial-container" className="relative w-56 h-56 flex items-center justify-center">
          {/* Solarpunk Obsidian Circular Panel */}
          <div className="absolute inset-0 rounded-full border border-slate-800 bg-midnight shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]" />
          
          {/* Animated Halo ring */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="112"
              cy="112"
              r="98"
              stroke="#070B11"
              strokeWidth="6"
              fill="transparent"
            />
            {duration > 0 && (
              <motion.circle
                cx="112"
                cy="112"
                r="98"
                stroke={timerMode === "work" ? "#f59e0b" : "#00F0FF"}
                strokeWidth="6"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 98}
                strokeDashoffset={2 * Math.PI * 98 * (1 - timeLeft / duration)}
                transition={{ ease: "linear" }}
              />
            )}
          </svg>

          {/* Temporal metrics inside clock */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
              {timerMode === "work" ? "FOCUS ENERGY" : "RESTORATION"}
            </span>
            <span id="timer-formatted-display" className={`font-mono text-4xl font-bold tracking-tight mt-1 ${timerMode === "work" ? "text-amber-400 glow-text-amber" : "text-[#00F0FF] glow-text-cyan"}`}>
              {formatTime(timeLeft)}
            </span>
            {isRunning && (
              <span className="text-[10px] font-mono text-amber-500 animate-pulse mt-1.5 flex items-center gap-1 uppercase">
                <Flame className="w-3 h-3 text-amber-500 animate-bounce" /> FORGING
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Control Actions */}
      <div className="flex items-center justify-center gap-4">
        {!isRunning ? (
          <button
            id="forge-start-timer"
            onClick={startTimer}
            className="px-8 py-3 rounded-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 font-medium text-xs tracking-widest uppercase text-slate-950 font-display transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.3)] cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            Forge Active Focus
          </button>
        ) : (
          <button
            id="forge-abort-timer"
            onClick={stopTimer}
            className="px-8 py-3 rounded-full bg-[#161B22] border border-slate-850 hover:bg-slate-800 font-mono text-[10px] uppercase tracking-widest text-slate-200 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Square className="w-4 h-4" />
            Interrupt Forge
          </button>
        )}
      </div>

      {/* Dynamic Broken Forge Panel overlay */}
      <AnimatePresence>
        {forgeBroken && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 bg-[#05070A]/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 z-20"
            id="forge-broken-panel"
          >
            <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-full mb-4 text-red-500 animate-bounce">
              <ShieldAlert className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-red-400 font-display">Aetherial Deficit: Forge Broken</h3>
            <p className="text-sm text-slate-400 max-w-sm mt-2">
              Focus collapsed immediately because your device visibility was broken. The elite academic lineage forbids switching context during active recall. Forfeited all study minutes & XP.
            </p>
            <button
              id="repair-forge-button"
              onClick={() => setForgeBroken(false)}
              className="mt-6 px-6 py-2 bg-[#161B22] border border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-mono uppercase tracking-widest transition-all cursor-pointer"
            >
              Reconstruct Forge
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Popup gain celebration */}
      <AnimatePresence>
        {xpGainedMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute inset-0 bg-[#05070A]/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 z-20"
            id="forge-success-panel"
          >
            <div className="p-4 bg-cyan-950/40 border border-cyan-500/30 rounded-full mb-4 text-cyan-400">
              <Trophy className="w-10 h-10 text-amber-400 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-slate-200 font-display">Spell Formulation Complete</h3>
            <p className="text-sm text-slate-400 max-w-sm mt-1.5 font-mono">
              {xpGainedMessage}
            </p>
            <button
              id="acknowledge-gain-button"
              onClick={() => setXpGainedMessage(null)}
              className="mt-6 px-6 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-slate-100 rounded-xl text-xs font-mono uppercase tracking-widest transition-all cursor-pointer"
            >
              Examine Spell Ledger
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
