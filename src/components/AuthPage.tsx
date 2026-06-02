/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInAnonymously
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { BookOpen, Trophy, Sparkles, LogIn, ChevronRight, GraduationCap } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile } from '../types';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Stream Selection State (triggered during novel creation/first login)
  const [showStreamSelect, setShowStreamSelect] = useState(false);
  const [selectedStream, setSelectedStream] = useState<"Biological Science" | "Physical Science/Maths" | "">("");
  const [tempUid, setTempUid] = useState('');
  const [tempUsername, setTempUsername] = useState('');
  const [tempEmail, setTempEmail] = useState('');

  // Handle first-time user profile registration in Firestore
  const createStudentProfile = async (uid: string, studentName: string, studentEmail: string, streamChoice: "Biological Science" | "Physical Science/Maths") => {
    const defaultProfile: UserProfile = {
      uid,
      username: studentName || `Candidate-${Math.floor(1000 + Math.random() * 9000)}`,
      email: studentEmail || 'candidate@citadel.lk',
      stream: streamChoice,
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
      await setDoc(doc(db, 'users', uid), defaultProfile);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    }
  };

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        if (!username.trim()) {
          setError('Please provide a Cadet/Student name');
          setLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Stage preference selection
        setTempUid(userCredential.user.uid);
        setTempUsername(username);
        setTempEmail(email);
        setShowStreamSelect(true);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Instant Demo login to facilitate quick preview testing without requirements
  const handleInstantDemo = async () => {
    setError('');
    setLoading(true);
    try {
      const userCredential = await signInAnonymously(auth);
      const uid = userCredential.user.uid;
      
      // Check if user document already exists
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (!userDoc.exists()) {
        const nicknames = ['Kasun', 'Tharindu', 'Sanduni', 'Senuri', 'Nimal', 'Amara', 'Malith', 'Priyankara'];
        const randomName = `${nicknames[Math.floor(Math.random() * nicknames.length)]}_AL_${Math.floor(2026 + Math.random() * 3)}`;
        
        setTempUid(uid);
        setTempUsername(randomName);
        setTempEmail('demo.student@zscorecitadel.lk');
        setShowStreamSelect(true);
      }
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const userCredential = await signInWithPopup(auth, provider);
      const uid = userCredential.user.uid;
      
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (!userDoc.exists()) {
        setTempUid(uid);
        setTempUsername(userCredential.user.displayName || 'AL Candidate');
        setTempEmail(userCredential.user.email || '');
        setShowStreamSelect(true);
      }
    } catch (err: any) {
      setError(err.message || 'Google Auth failed');
    } finally {
      setLoading(false);
    }
  };

  const submitStreamPreference = async () => {
    if (!selectedStream) {
      setError("You must select your A/L Science stream path to enter.");
      return;
    }
    setLoading(true);
    try {
      await createStudentProfile(tempUid, tempUsername, tempEmail, selectedStream);
    } catch (err: any) {
      setError("Failed to create profile: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-page-container" className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Solarpunk Energy Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(14,116,144,0.15),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(202,138,4,0.08),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10"
        id="auth-card"
      >
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-cyan-950/50 border border-cyan-500/30 rounded-xl mb-4 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Trophy className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-100 uppercase">
            Z-SCORE <span className="text-cyan-400">CITADEL</span>
          </h1>
          <p className="text-xs text-slate-400 tracking-widest uppercase font-mono mt-1">
            G.C.E. A/L Gamified Focus RPG
          </p>
        </div>

        {/* Dynamic step: choosing stream path upon first login */}
        {showStreamSelect ? (
          <div id="stream-selector-container">
            <div className="mb-6 text-center">
              <span className="p-2 inline-block bg-amber-950/50 border border-amber-500/30 rounded-lg text-amber-400 text-xs font-mono mb-2">
                ACADEMIC LINEAGE REQUIRED
              </span>
              <h2 className="text-xl font-bold font-display text-slate-200">Choose your G.C.E. A/L Stream</h2>
              <p className="text-sm text-slate-400 mt-2">
                This configures your active curriculum, dashboard tracker, and duel subjects.
              </p>
            </div>

            <div className="space-y-4">
              <button
                id="select-bio-stream"
                type="button"
                onClick={() => setSelectedStream("Biological Science")}
                className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
                  selectedStream === "Biological Science"
                    ? "bg-cyan-950/60 border-cyan-500 text-slate-100 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                    : "bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <div>
                  <h3 className="font-semibold text-slate-200">Biological Science Stream</h3>
                  <p className="text-xs text-slate-400 mt-1">Subjects: Physics, Chemistry, Biology</p>
                </div>
                <GraduationCap className={`w-5 h-5 ${selectedStream === "Biological Science" ? "text-cyan-400" : ""}`} />
              </button>

              <button
                id="select-maths-stream"
                type="button"
                onClick={() => setSelectedStream("Physical Science/Maths")}
                className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
                  selectedStream === "Physical Science/Maths"
                    ? "bg-amber-950/40 border-amber-500 text-slate-100 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                    : "bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <div>
                  <h3 className="font-semibold text-slate-200">Physical Science / Maths String</h3>
                  <p className="text-xs text-slate-400 mt-1">Subjects: Physics, Chemistry, Combined Mathematics</p>
                </div>
                <BookOpen className={`w-5 h-5 ${selectedStream === "Physical Science/Maths" ? "text-amber-400" : ""}`} />
              </button>
            </div>

            {error && (
              <div id="stream-error" className="mt-4 p-3 bg-red-950/50 border border-red-500/30 rounded-lg text-red-400 text-xs">
                {error}
              </div>
            )}

            <button
              id="submit-stream-choice"
              onClick={submitStreamPreference}
              disabled={loading}
              className="w-full mt-6 py-3 bg-gradient-to-r from-cyan-600 to-amber-600 hover:from-cyan-500 hover:to-amber-500 text-slate-100 rounded-xl font-medium tracking-wide shadow-lg shadow-cyan-950/50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? "Forging Profile..." : "Enter the Citadel"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div id="login-form-container">
            <form onSubmit={handleAuthAction} className="space-y-4">
              {isRegistering && (
                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Student Nickname</label>
                  <input
                    id="username-input"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. Kasun_AL"
                    className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 text-sm font-mono"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@citadel.lk"
                  className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Citadel Secret Password</label>
                <input
                  id="password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 text-sm"
                  required
                />
              </div>

              {error && (
                <div id="auth-error-display" className="p-3 bg-red-950/50 border border-red-500/30 rounded-lg text-red-400 text-xs">
                  {error}
                </div>
              )}

              <button
                id="submit-auth-button"
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-slate-100 rounded-xl font-medium tracking-wide shadow-lg shadow-cyan-950/50 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                {loading ? "Accessing Citadel..." : isRegistering ? "Sign Up Cadet" : "Sign In Cadet"}
              </button>
            </form>

            <div className="relative my-6 text-center">
              <span className="px-3 bg-slate-900 text-xs text-slate-500 uppercase tracking-widest relative z-10 font-mono">OR</span>
              <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-slate-800" />
            </div>

            {/* Instant Demo Auth - Key for fast UI testing */}
            <button
              id="instant-demo-auth"
              type="button"
              onClick={handleInstantDemo}
              disabled={loading}
              className="w-full py-3 bg-amber-950/30 border border-amber-500/30 hover:bg-amber-950/50 hover:border-amber-500/50 text-amber-300 rounded-xl font-medium text-sm tracking-wide transition-all flex items-center justify-center gap-2 mb-3 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              Instant Study Cadet Gate (Demo Mode)
            </button>

            <button
              id="google-auth"
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-3 bg-slate-950/50 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl font-medium text-sm tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" width="24" height="24">
                <path fill="#EA4335" d="M12 5.04c1.64 0 3.12.56 4.28 1.67l3.2-3.2C17.51 1.71 14.96 1 12 1 7.35 1 3.4 3.65 1.5 7.5l3.86 3C6.27 7.55 8.9 5.04 12 5.04z"/>
                <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.46h6.44c-.28 1.44-1.09 2.66-2.31 3.48l3.6 2.79c2.1-1.94 3.76-4.8 3.76-8.37z"/>
                <path fill="#FBBC05" d="M5.36 14.5c-.24-.72-.38-1.49-.38-2.3s.14-1.58.38-2.3L1.5 6.9c-.93 1.86-1.5 4-1.5 6.1s.57 4.24 1.5 6.1l3.86-3z"/>
                <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.6-2.79c-1.1.74-2.5 1.18-4.36 1.18-3.1 0-5.73-2.51-6.67-5.46l-3.86 3c1.9 3.85 5.85 6.55 10.53 6.55z"/>
              </svg>
              Sign In with Google
            </button>

            <div className="mt-6 text-center text-xs">
              <button
                id="toggle-auth-mode"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-slate-400 hover:text-cyan-400 underline transition-colors cursor-pointer"
              >
                {isRegistering ? "Already have an account? Sign In" : "New candidate? Challenge the Citadel (Sign Up)"}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
