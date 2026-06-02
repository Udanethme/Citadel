/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  collection, 
  setDoc, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  getDocs, 
  updateDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Swords, Send, Trophy, Users, ShieldAlert, Timer, Check, X, Skull, Loader2 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, Duel } from '../types';

interface DuelSectionProps {
  userProfile: UserProfile;
  activeStudySubject: string | null;
  onProfileUpdate: (profile: UserProfile) => void;
}

export default function DuelSection({ userProfile, activeStudySubject, onProfileUpdate }: DuelSectionProps) {
  const [targetUserId, setTargetUserId] = useState('');
  const [xpBet, setXpBet] = useState(25);
  const [citadelStudents, setCitadelStudents] = useState<UserProfile[]>([]);
  const [activeDuels, setActiveDuels] = useState<Duel[]>([]);
  const [incomingChallenge, setIncomingChallenge] = useState<Duel | null>(null);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // Fetch available students inside the citadel for easy 1-click challenging
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const list: UserProfile[] = [];
        querySnapshot.forEach((d) => {
          const profile = d.data() as UserProfile;
          if (profile.uid !== userProfile.uid) {
            list.push(profile);
          }
        });
        setCitadelStudents(list);
      } catch (err) {
        console.error('Failed to query users', err);
      }
    };
    fetchStudents();
  }, [userProfile.uid]);

  // Handle incoming/outgoing duel listeners
  useEffect(() => {
    // 1. Listen to all duels involving current student
    const duelsRef = collection(db, 'duels');
    const challengerQuery = query(duelsRef, where('challengerId', '==', userProfile.uid));
    const challengeeQuery = query(duelsRef, where('challengeeId', '==', userProfile.uid));

    const unsubscribeChallenger = onSnapshot(challengerQuery, (snapshot) => {
      const challengerList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Duel));
      setActiveDuels(prev => {
        // filter out old challenger duels
        const filtered = prev.filter(d => d.challengerId !== userProfile.uid);
        return [...filtered, ...challengerList];
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'duels(challenger)');
    });

    const unsubscribeChallengee = onSnapshot(challengeeQuery, (snapshot) => {
      const challengeeList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Duel));
      
      // Determine if there are "pending" challenges directed at me
      const pendingIncoming = challengeeList.find(d => d.status === 'pending');
      if (pendingIncoming) {
        setIncomingChallenge(pendingIncoming);
      } else {
        setIncomingChallenge(null);
      }

      setActiveDuels(prev => {
        const filtered = prev.filter(d => d.challengeeId !== userProfile.uid);
        return [...filtered, ...challengeeList];
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'duels(challengee)');
    });

    return () => {
      unsubscribeChallenger();
      unsubscribeChallengee();
    };
  }, [userProfile.uid]);

  // Feed study minutes to active in-progress duels!
  // If the user is on work mode studying, they gain minutes
  useEffect(() => {
    if (activeStudySubject) {
      // Find all in_progress duels that are active state
      const interval = setInterval(async () => {
        const inProgress = activeDuels.filter(d => d.status === 'in_progress');
        for (const duel of inProgress) {
          try {
            const duelDocRef = doc(db, 'duels', duel.id);
            if (duel.challengerId === userProfile.uid) {
              await updateDoc(duelDocRef, {
                challengerStudyMinutesActual: (duel.challengerStudyMinutesActual || 0) + 1,
                challengerActive: true
              });
            } else if (duel.challengeeId === userProfile.uid) {
              await updateDoc(duelDocRef, {
                challengeeStudyMinutesActual: (duel.challengeeStudyMinutesActual || 0) + 1,
                challengeeActive: true
              });
            }
          } catch (err) {
            console.error("Error writing telemetry minutes to duel doc", err);
          }
        }
      }, 60000); // Feed every 1 minute of actual study focus!

      return () => clearInterval(interval);
    } else {
      // Set studying state to inactive inside db when client is resting
      const setInactive = async () => {
        const inProgress = activeDuels.filter(d => d.status === 'in_progress');
        for (const duel of inProgress) {
          try {
            const duelDocRef = doc(db, 'duels', duel.id);
            if (duel.challengerId === userProfile.uid) {
              await updateDoc(duelDocRef, { challengerActive: false });
            } else if (duel.challengeeId === userProfile.uid) {
              await updateDoc(duelDocRef, { challengeeActive: false });
            }
          } catch (e) {
            console.error(e);
          }
        }
      };
      setInactive();
    }
  }, [activeStudySubject, activeDuels, userProfile.uid]);

  // Triggering the challenge initiation document write
  const sendDuelChallenge = async (candidateId: string, candidateName: string) => {
    setError('');
    setSuccess('');

    if (xpBet > userProfile.xp) {
      setError(`Cannot bet ${xpBet} XP. Your physical reservoir has only ${userProfile.xp} XP.`);
      return;
    }

    const uniqueDuelId = `duel-${Date.now()}`;
    const newDuel: Omit<Duel, 'id'> = {
      challengerId: userProfile.uid,
      challengerUsername: userProfile.username,
      challengeeId: candidateId,
      challengeeUsername: candidateName,
      xpBet,
      status: 'pending',
      challengerStudyMinutesActual: 0,
      challengeeStudyMinutesActual: 0,
      challengerActive: false,
      challengeeActive: false,
      createdAt: new Date().toISOString(),
      endTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // Quick testing endTime duration (5 minutes)
      winnerId: null,
      loserId: null
    };

    try {
      await setDoc(doc(db, 'duels', uniqueDuelId), newDuel);
      setSuccess(`Focus Duel deployed against student: ${candidateName}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `duels/${uniqueDuelId}`);
    }
  };

  const handleCreateManualDuel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId.trim()) return;

    // Is target student active in Citadel?
    const found = citadelStudents.find(s => s.uid === targetUserId.trim() || s.username === targetUserId.trim());
    if (found) {
      sendDuelChallenge(found.uid, found.username);
    } else {
      // Creating simple anonymous target profile if user type custom id for validation
      sendDuelChallenge(targetUserId.trim(), `Studious Cadet (${targetUserId.substring(0, 5)})`);
    }
    setTargetUserId('');
  };

  const handleAcceptChallenge = async (duel: Duel) => {
    try {
      const duelRef = doc(db, 'duels', duel.id);
      await updateDoc(duelRef, {
        status: 'in_progress',
        // Duration: current time + 1 hour (3600 seconds)
        endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      });
      setIncomingChallenge(null);
      setSuccess(`PvP duel accepted! May aetherial focus be with you.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `duels/${duel.id}`);
    }
  };

  const handleDeclineChallenge = async (duel: Duel) => {
    try {
      const duelRef = doc(db, 'duels', duel.id);
      await updateDoc(duelRef, {
        status: 'declined'
      });
      setIncomingChallenge(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `duels/${duel.id}`);
    }
  };

  // Secure Server-Authoritative duel resolution call
  const resolveDuelChallenge = async (duel: Duel) => {
    setError('');
    setResolvingId(duel.id);

    try {
      // 1. Contact express server endpoint
      const response = await fetch('/api/resolve-duel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          challengerId: duel.challengerId,
          challengeeId: duel.challengeeId,
          challengerMinutes: duel.challengerStudyMinutesActual,
          challengeeMinutes: duel.challengeeStudyMinutesActual,
          xpBet: duel.xpBet
        })
      });

      if (!response.ok) {
        throw new Error("Resolution API route error");
      }

      const results = await response.json();
      
      // Compute XP offsets safely
      const challengerRef = doc(db, 'users', duel.challengerId);
      const challengeeRef = doc(db, 'users', duel.challengeeId);

      const challengerDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', duel.challengerId)));
      const challengeeDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', duel.challengeeId)));

      let cProfile: UserProfile | null = null;
      let eProfile: UserProfile | null = null;

      challengerDoc.forEach(d => { cProfile = d.data() as UserProfile; });
      challengeeDoc.forEach(d => { eProfile = d.data() as UserProfile; });

      // Build batch writes
      const batch = writeBatch(db);

      // Perform updates inside target document
      if (cProfile && eProfile) {
        const finalCProfileXp = Math.max(0, (cProfile as UserProfile).xp + results.challengerXpChange);
        const finalEProfileXp = Math.max(0, (eProfile as UserProfile).xp + results.challengeeXpChange);

        batch.update(challengerRef, { xp: finalCProfileXp });
        batch.update(challengeeRef, { xp: finalEProfileXp });

        // If I am one of them, refresh local user profile state inside parent
        if (duel.challengerId === userProfile.uid) {
          onProfileUpdate({ ...userProfile, xp: finalCProfileXp });
        } else if (duel.challengeeId === userProfile.uid) {
          onProfileUpdate({ ...userProfile, xp: finalEProfileXp });
        }
      }

      // 2. Set duel document as complete
      const duelRef = doc(db, 'duels', duel.id);
      batch.update(duelRef, {
        status: 'completed',
        winnerId: results.winnerId,
        loserId: results.loserId
      });

      await batch.commit();
      setSuccess(`Tournament settled! Winner: ${results.winnerId ? (results.winnerId === userProfile.uid ? "You" : "Opponent") : "Draw matching"}`);
    } catch (err: any) {
      setError("Resolution failure: " + err.message);
    } finally {
      setResolvingId(null);
    }
  };

  // Demo tool to quickly gain study minutes inside duel document (for rapid testing of outcome!)
  const quickFomentMinutes = async (duel: Duel, side: 'challenger' | 'challengee') => {
    try {
      const duelRef = doc(db, 'duels', duel.id);
      if (side === 'challenger') {
        await updateDoc(duelRef, {
          challengerStudyMinutesActual: (duel.challengerStudyMinutesActual || 0) + 5
        });
      } else {
        await updateDoc(duelRef, {
          challengeeStudyMinutesActual: (duel.challengeeStudyMinutesActual || 0) + 5
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div id="duel-section-panel" className="bg-deep-card shadow-glow-cyan border border-slate-800 rounded-xl p-6 relative overflow-hidden">
      
      {/* Dynamic top divider indicator */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-red-600/60" />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <span className="text-xs font-mono text-red-400 tracking-widest uppercase block">Colosseum of Wills</span>
          <h2 className="text-xl font-display font-medium text-slate-100 flex items-center gap-2 mt-0.5">
            <Swords className="w-5 h-5 text-red-500" />
            1v1 Real-Time focus Duels
          </h2>
        </div>
      </div>

      {error && (
        <div id="duel-error-display" className="mb-4 p-3.5 bg-red-950/40 border border-red-500/30 text-red-400 text-xs rounded-xl">
          {error}
        </div>
      )}

      {success && (
        <div id="duel-success-display" className="mb-4 p-3.5 bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 text-xs rounded-xl">
          {success}
        </div>
      )}

      {/* Manual targeting and Challenger input */}
      <form onSubmit={handleCreateManualDuel} className="mb-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">XP Wager Bet Size</label>
            <select
              id="xp-bet-selector"
              value={xpBet}
              onChange={(e) => setXpBet(Number(e.target.value))}
              className="w-full px-3 py-2 bg-midnight border border-slate-800 rounded-xl text-slate-250 text-xs font-mono focus:outline-none focus:border-red-500"
            >
              <option value="10">10 XP wager</option>
              <option value="25">25 XP wager</option>
              <option value="50">50 XP wager</option>
              <option value="100">100 XP wager</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">Custom Cadet UID / Name</label>
            <div className="flex gap-2">
              <input
                id="target-uid-field"
                type="text"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="Paste UID"
                className="flex-1 px-3 py-2 bg-midnight border border-slate-800 rounded-xl text-slate-200 text-xs placeholder-slate-700 font-mono focus:outline-none focus:border-red-500"
              />
              <button
                id="send-duel-request-btn"
                type="submit"
                className="px-3 py-2 bg-red-950/40 border border-red-500/30 text-red-450 rounded-xl hover:bg-red-900/30 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Roster of Active Students in Citadel for 1-Click PvP deployment */}
      <div className="mb-6">
        <label className="block text-[10px] uppercase font-mono text-slate-400 mb-2">Available Study Competitors</label>
        {citadelStudents.length === 0 ? (
          <p className="text-xs text-slate-600 font-mono">Exploring candidates list...</p>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
            {citadelStudents.map((student) => (
              <button
                id={`challenge-student-${student.username.replace(' ', '-')}`}
                key={student.uid}
                onClick={() => sendDuelChallenge(student.uid, student.username)}
                className="px-3 py-1.5 bg-midnight hover:bg-[#161B22] border border-slate-800 hover:border-red-500/50 rounded-xl text-xs font-mono text-slate-300 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Users className="w-3 h-3 text-slate-550" />
                {student.username} (Lvl {student.level})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active Tournament Logs and Resolutions */}
      <div>
        <label className="block text-[10px] uppercase font-mono text-slate-400 mb-3">Citadel Duel Ledger</label>
        {activeDuels.length === 0 ? (
          <div id="empty-duels" className="text-center p-4 border border-dashed border-slate-850 rounded-xl bg-midnight/30">
            <p className="text-xs text-slate-500">No battle challenges are registered in your area.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeDuels.map((duel) => {
              const secondsLeft = Math.max(0, (new Date(duel.endTime).getTime() - Date.now()) / 1000);
              const isPast = secondsLeft === 0;

              return (
                <div 
                  id={`duel-card-${duel.id}`}
                  key={duel.id}
                  className="p-4 bg-midnight/50 border border-slate-850 rounded-xl flex flex-col gap-3 relative hover:border-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono p-1 px-2.5 bg-red-950/30 border border-red-500/20 text-red-400 rounded uppercase">
                      WAGER: {duel.xpBet} XP
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wide">
                      {duel.status === 'in_progress' ? (
                        isPast ? "⚔️ TIME EXPIRED" : `⏳ ${Math.ceil(secondsLeft / 60)} mins remaining`
                      ) : (
                        `Status: ${duel.status.toUpperCase()}`
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-1.5 border-y border-slate-900/40">
                    {/* Challenger */}
                    <div className="text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-medium text-slate-300">{duel.challengerUsername}</span>
                        {duel.challengerActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        )}
                      </div>
                      <p className="text-sm font-mono text-amber-500 font-bold mt-1 shadow-inner inline-block px-1">
                        {duel.challengerStudyMinutesActual} min
                      </p>
                    </div>

                    {/* Challengee */}
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {duel.challengeeActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        )}
                        <span className="text-xs font-mono font-medium text-slate-300">{duel.challengeeUsername}</span>
                      </div>
                      <p className="text-sm font-mono text-amber-500 font-bold mt-1 shadow-inner inline-block px-1">
                        {duel.challengeeStudyMinutesActual} min
                      </p>
                    </div>
                  </div>

                  {/* Dev speed-up options for evaluation */}
                  {duel.status === 'in_progress' && (
                    <div className="flex justify-between items-center bg-midnight/80 p-2 rounded-lg gap-2 border border-slate-900">
                      <span className="text-[9px] font-mono text-slate-600 uppercase font-bold">Speed Acceleration:</span>
                      <div className="flex gap-1.5">
                        <button
                          id={`quick-increment-challenger-${duel.id}`}
                          onClick={() => quickFomentMinutes(duel, 'challenger')}
                          className="px-1.5 py-0.5 bg-midnight text-[9px] font-mono rounded border border-slate-800 text-slate-500 hover:text-slate-300 cursor-pointer"
                        >
                          +5 Challenger Min
                        </button>
                        <button
                          id={`quick-increment-challengee-${duel.id}`}
                          onClick={() => quickFomentMinutes(duel, 'challengee')}
                          className="px-1.5 py-0.5 bg-midnight text-[9px] font-mono rounded border border-slate-800 text-slate-500 hover:text-slate-300 cursor-pointer"
                        >
                          +5 Challengee Min
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Resolution Buttons */}
                  {duel.status === 'in_progress' && (
                    <button
                      id={`resolve-duel-btn-${duel.id}`}
                      onClick={() => resolveDuelChallenge(duel)}
                      disabled={resolvingId === duel.id}
                      className="w-full py-2 bg-gradient-to-r from-red-950/80 to-red-900/80 hover:from-red-900/50 hover:to-red-800/50 text-red-300 font-medium text-xs font-mono uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {resolvingId === duel.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Calculating Battle Scores...
                        </>
                      ) : (
                        <>
                          <Swords className="w-3.5 h-3.5 text-red-400 animate-pulse" /> Settle & Distribute XP
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Overlay Alert for Incoming Challenges */}
      <AnimatePresence>
        {incomingChallenge && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 bg-midnight/98 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 z-20"
            id="incoming-duel-modal"
          >
            <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-full mb-4 text-red-500 animate-pulse">
              <Swords className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-200 font-display">Duel Challenge Deciphered</h3>
            <p className="text-sm text-slate-400 max-w-sm mt-2">
              Student <strong className="text-red-400">{incomingChallenge.challengerUsername}</strong> challenges your core intelligence to a 1v1 Pomodoro PvP duel for <strong className="text-amber-400">{incomingChallenge.xpBet} XP</strong>.
            </p>
            <div className="flex gap-4 mt-6">
              <button
                id="accept-challenge-btn"
                onClick={() => handleAcceptChallenge(incomingChallenge)}
                className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 text-slate-950 hover:from-red-500 font-mono text-xs uppercase tracking-widest font-bold rounded-xl transition-all cursor-pointer"
              >
                Accept Battle
              </button>
              <button
                id="decline-challenge-btn"
                onClick={() => handleDeclineChallenge(incomingChallenge)}
                className="px-6 py-2 bg-midnight border border-slate-805 text-slate-400 hover:text-slate-200 font-mono text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer"
              >
                Decline
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
